from email.mime import text
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
import json
import os
import requests
import pdfplumber
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from collections import defaultdict
from pymongo import MongoClient
import pytesseract
from datetime import datetime
from pdf2image import convert_from_path
import hashlib
from store import save_rfp
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

# ============================
# LOAD ENVIRONMENT VARIABLES
# ============================

load_dotenv()

# ============================
# CONFIG
# ============================

SITE_URL = "https://eytechathon.lovable.app"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCT_CATALOG_PATH = os.path.join(BASE_DIR, "data", "product_catalog.json")

# Ollama Configuration
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "mistral:7b-instruct"  # Fast 7B model for RTX 3050
OLLAMA_TIMEOUT = 60  # seconds

# Performance: In-memory cache for LLM responses (keyed by prompt hash)
_llm_cache = {}

# ============================
# OLLAMA LLM INTEGRATION
# ============================

def local_llm_call(prompt: str, model: str = OLLAMA_MODEL, max_tokens: int = 512) -> str:
    """
    Calls local Ollama LLM via HTTP API.
    
    PERFORMANCE OPTIMIZATIONS:
    - Uses in-memory cache (keyed by prompt hash) to avoid redundant calls
    - Temperature=0 for deterministic output
    - stream=false for simpler response handling
    - Limited max_tokens for faster inference on RTX 3050
    - Graceful fallback on connection errors
    
    Args:
        prompt: The user prompt
        model: Ollama model name (default: mistral:7b-instruct)
        max_tokens: Max tokens to generate (lower = faster)
    
    Returns:
        Generated text response or error message
    """
    # Cache lookup: hash the prompt for deterministic caching
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    if prompt_hash in _llm_cache:
        return _llm_cache[prompt_hash]
    
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0,      # Deterministic output
                    "num_predict": max_tokens,
                    "top_p": 0.9,
                    "top_k": 40
                }
            },
            timeout=OLLAMA_TIMEOUT
        )
        response.raise_for_status()
        result = response.json()["response"]
        
        # Cache successful response
        _llm_cache[prompt_hash] = result
        return result
        
    except requests.exceptions.ConnectionError:
        error_msg = f"ERROR: Cannot connect to Ollama at {OLLAMA_BASE_URL}. Ensure Ollama is running with: ollama serve"
        print(f"[LLM Error] {error_msg}")
        return json.dumps({"error": error_msg})
    
    except requests.exceptions.Timeout:
        error_msg = f"ERROR: Ollama request timed out after {OLLAMA_TIMEOUT}s"
        print(f"[LLM Error] {error_msg}")
        return json.dumps({"error": error_msg})
    
    except Exception as e:
        error_msg = f"ERROR: Ollama call failed: {str(e)}"
        print(f"[LLM Error] {error_msg}")
        return json.dumps({"error": error_msg})


def check_ollama_availability() -> bool:
    """
    Verify Ollama server is running and model is available.
    
    Returns:
        True if Ollama is ready, False otherwise
    """
    try:
        # Check server status
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        response.raise_for_status()
        
        # Check if model is available
        models = response.json().get("models", [])
        model_names = [m["name"] for m in models]
        
        if OLLAMA_MODEL not in model_names:
            print(f"[WARNING] Model '{OLLAMA_MODEL}' not found. Available models: {model_names}")
            print(f"[INFO] To download the model, run: ollama pull {OLLAMA_MODEL}")
            return False
        
        print(f"[OK] Ollama server ready at {OLLAMA_BASE_URL}")
        print(f"[OK] Model '{OLLAMA_MODEL}' is available")
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to Ollama at {OLLAMA_BASE_URL}")
        print("[INFO] Start Ollama with: ollama serve")
        return False
    except Exception as e:
        print(f"[ERROR] Ollama availability check failed: {e}")
        return False
    
# =========================
# FRONTEND FORMATTER-SALES AGENT
# =========================
def format_sales_for_frontend(raw: dict, index: int) -> dict:
    days_remaining = 15  # temp hardcoded

    return {
        # 🔑 keep ID stable
        "rfp_id": raw.get("rfp_id", f"#102{index + 3}"),

        # 🔑 MUST MATCH frontend keys
        "rfp_title": raw.get("rfp_title", "Untitled RFP"),
        "buyer": raw.get("buyer", ""),

        "submission_deadline": raw.get("submission_deadline", ""),
        "estimated_project_value": raw.get("estimated_project_value", ""),

        "priority": (
            "Critical" if days_remaining <= 3
            else "High" if days_remaining <= 10
            else "Medium"
        ),

        "status": "Extracted",

        # optional (safe to keep)
        "days_remaining": days_remaining,
        "scope_items": raw.get("scope_items", 0),
        "tender_source": raw.get("tender_source", "")
    }

# ============================
# LANGGRAPH STATE
# ============================

class RFPState(TypedDict, total=False):
    sales_output: List[Dict[str, Any]]
    pdf_paths: List[str]  # PDF file paths
    technical_output: Dict[str, Any]
    pricing_output: Dict[str, Any]
    final_output: Dict[str, Any]

# ============================
# SALES AGENT (OCR + LOCAL OLLAMA)
# ============================

def sales_agent_node(state: RFPState) -> RFPState:
    print("\n[Sales Agent] Started")
    results = []
    pdf_paths = []  # Track downloaded PDF paths

    # ---------- Text Extraction ----------

    def extract_text_pdfplumber(path):
        pages = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n".join(pages)

    def extract_text_ocr(path):
        text = []
        images = convert_from_path(path, dpi=300)
        for img in images:
            text.append(pytesseract.image_to_string(img))
        return "\n".join(text)

    def extract_text(path):
        text = extract_text_pdfplumber(path)
        if len(text.strip()) < 300:   # OCR fallback threshold
            print("[Sales Agent] Low text detected, running OCR")
            text = extract_text_ocr(path)
        return text

    # ---------- LLM Extraction ----------

    def extract_fields_llm(text: str) -> dict:
        """
        Chunked + Field-aware LLM extraction using LOCAL Ollama.
        
        PERFORMANCE OPTIMIZATIONS:
        - Parallel field extraction using ThreadPoolExecutor
        - Early termination when field found
        - Smaller chunks (3000 chars) for faster inference
        - Concise prompts optimized for 7B models
        - Max 256 tokens per call (speed vs accuracy tradeoff)
        """
        
        # ----------------------------
        # Config
        # ----------------------------
        MAX_CHARS_PER_CHUNK = 3000   # Smaller chunks = faster inference
        MAX_TOKENS = 256              # Limit output for speed

        FIELDS = {
            "rfp_id": "The official RFP / Tender / Bid reference number or ID.",
            "rfp_title": "The title or name of the RFP / tender / project.",
            "buyer": "The organization or authority issuing the RFP.",
            "submission_deadline": "The final date or date-time for bid submission in DD-MM-YYYY format.",
            "scope_category": (
                "Classify the RFP into ONE of these categories ONLY:\n"
                "- Consulting / Services\n"
                "- Works / Materials\n"
                "- Goods Supply\n"
                "- IT / Software\n"
                "- Other"
            ),
            "estimated_project_value": (
                "The estimated project value, tender value, or budget "
                "(include currency if mentioned, e.g., '₹5.2 Cr', 'Rs. 3 Cr')."
            ),
            "scope_items": "The number of items or line items in the RFP scope (return as a number, or 0 if not found)."
        }

        # ----------------------------
        # Chunking
        # ----------------------------
        chunks = [
            text[i:i + MAX_CHARS_PER_CHUNK]
            for i in range(0, len(text), MAX_CHARS_PER_CHUNK)
        ]

        results = {field: "Not Found" for field in FIELDS}

        # ----------------------------
        # PARALLEL Field Extraction
        # ----------------------------
        def extract_single_field(field: str, instruction: str) -> tuple:
            """Extract one field across all chunks (stops early when found)"""
            for chunk in chunks:
                # Optimized prompt for 7B models: concise, direct, JSON-only
                prompt = f"""Extract ONLY this field from the RFP text below.

Field: {field}
Description: {instruction}

Rules:
- Return ONLY valid JSON
- No explanations or markdown
- If not found, return "Not Found"

RFP Text:
{chunk}

JSON Output:
{{"{field}": ""}}"""

                response = local_llm_call(prompt, max_tokens=MAX_TOKENS)
                
                try:
                    extracted = json.loads(response).get(field, "Not Found")
                except Exception:
                    # Fallback: try to find JSON in response
                    try:
                        start = response.find("{")
                        end = response.rfind("}") + 1
                        if start != -1 and end > start:
                            extracted = json.loads(response[start:end]).get(field, "Not Found")
                        else:
                            extracted = "Not Found"
                    except Exception:
                        extracted = "Not Found"

                # Early termination: stop once found
                if extracted and extracted != "Not Found":
                    return (field, extracted)
            
            return (field, "Not Found")

        # CONCURRENT EXECUTION: Process all fields in parallel
        with ThreadPoolExecutor(max_workers=3) as executor:  # Limit workers for RTX 3050
            futures = {
                executor.submit(extract_single_field, field, desc): field
                for field, desc in FIELDS.items()
            }
            
            for future in as_completed(futures):
                field, value = future.result()
                results[field] = value

        return results


    # ---------- Scraping ----------

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto(SITE_URL, timeout=60000, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)

        buttons = page.locator("a:has-text('Download')")
        count = buttons.count()

        print(f"[Sales Agent] Found {count} RFP PDFs")

        for i in range(count):
            print(f"[Sales Agent] Processing RFP {i + 1}")
            file_path = f"rfp_{i + 1}.pdf"

            with page.expect_download() as d:
                buttons.nth(i).click()
            d.value.save_as(file_path)
            
            pdf_paths.append(file_path)  # Save path for technical agent

            text = extract_text(file_path)

            fields = extract_fields_llm(text)
            fields["tender_source"] = SITE_URL

            formatted = format_sales_for_frontend(fields, i)
            save_rfp(formatted)
            
            results.append(formatted)
            print("[Sales Agent] Extracted & Saved:", formatted)

        browser.close()

    state["sales_output"] = results
    state["pdf_paths"] = pdf_paths  # Share PDF paths with technical agent
    return state

# ============================
# SELET Highest Priority RFP
# ============================

def select_highest_priority_rfp(state: RFPState) -> RFPState:
    print("\n[Flow] Selecting highest-priority RFP")

    rfps = state.get("sales_output", [])
    pdfs = state.get("pdf_paths", [])

    if not rfps:
        print("[Flow] No RFPs found")
        return state

    # Priority order: Critical > High > Medium
    priority_rank = {"Critical": 0, "High": 1, "Medium": 2}

    rfps_with_index = list(enumerate(rfps))
    rfps_with_index.sort(
        key=lambda x: priority_rank.get(x[1].get("priority", "Medium"), 3)
    )

    idx, selected_rfp = rfps_with_index[0]
    selected_pdf = pdfs[idx] if idx < len(pdfs) else None

    print(f"[Flow] Selected RFP: {selected_rfp.get('rfp_id')} ({selected_rfp.get('priority')})")

    # 🔑 overwrite state with ONLY selected RFP
    state["sales_output"] = [selected_rfp]
    state["pdf_paths"] = [selected_pdf] if selected_pdf else []

    return state

# ============================
# TECHNICAL AGENT
# ============================

# 🔐 MongoDB Atlas Connection (replace with teammate's URI)
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["agentic_rfp"]
sku_collection = db["product_catalog"]


def technical_agent_node(state: RFPState) -> RFPState:
    print("\n[Technical Agent] Started (ITEM-AWARE MODE)")

    # ----------------------------
    # Load Product Catalog
    # ----------------------------
    catalog = list(
        sku_collection.find(
            {},
            {"_id": 0, "sku_code": 1, "description": 1, "category": 1, "specifications": 1}
        )
    )
    print(f"[Technical Agent] Loaded {len(catalog)} SKUs")

    technical_results = []

    # ----------------------------
    # FULL TEXT EXTRACTION (pdfplumber + OCR)
    # ----------------------------
    def extract_full_text(pdf_path: str) -> str:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"

        if len(text.strip()) < 300:
            print("[Technical Agent] Low text detected, OCR fallback")
            images = convert_from_path(pdf_path, dpi=300)
            for img in images:
                text += pytesseract.image_to_string(img)

        return text

    # ----------------------------
    # ITEM EXTRACTION (ONE LLM CALL / RFP)
    # ----------------------------
    def extract_items_llm(text: str) -> list:
        prompt = f"""
You are extracting technical line items from an RFP.

Task:
- Identify EACH distinct technical ITEM
- Each item must include:
  - item_name
  - required_technical_specs (human-readable string)

Rules:
- DO NOT infer or hallucinate
- DO NOT merge different items
- Output ONLY valid JSON
- No explanations

JSON FORMAT:
[
  {{
    "item_name": "...",
    "required_technical_specs": "..."
  }}
]

RFP TEXT:
{text}

JSON:
"""
        response = local_llm_call(prompt, max_tokens=512)

        try:
            start = response.find("[")
            end = response.rfind("]") + 1
            return json.loads(response[start:end])
        except Exception:
            print("[Technical Agent] Item extraction failed")
            return []

    # ----------------------------
    # PRICE STUB (TEMP)
    # ----------------------------
    def price_stub(sku_code: str) -> int:
        if "AL240" in sku_code:
            return 1250
        if "AL185" in sku_code:
            return 980
        if "CU" in sku_code:
            return 2100
        return 1500

    # ----------------------------
    # MAIN LOOP (NO INDEX ALIGNMENT)
    # ----------------------------
    for rfp in state.get("sales_output", []):
        rfp_id = rfp.get("rfp_id", "Unknown")
        pdf_path = rfp.get("pdf_path")

        if not pdf_path or not os.path.exists(pdf_path):
            print(f"[Technical Agent] Missing PDF for {rfp_id}")
            continue

        print(f"[Technical Agent] Processing {rfp_id}")

        full_text = extract_full_text(pdf_path)
        items = extract_items_llm(full_text)

        rfp_items_output = []

        for item in items:
            item_name = item.get("item_name", "Unknown Item")
            item_specs_text = item.get("required_technical_specs", "")

            # Convert human specs → dict using EXISTING LLM logic
            raw_specs = extract_specs_llm_fast(item_specs_text)
            rfp_specs = canonicalize_rfp_specs(raw_specs)

            sku_scores = []

            for product in catalog:
                match = compute_weighted_match(
                    rfp_specs,
                    product.get("specifications", {})
                )

                if match is None:
                    continue

                sku_scores.append({
                    "sku_code": product["sku_code"],
                    "spec_match_percent": match,
                    "price_per_unit": price_stub(product["sku_code"])
                })

            if not sku_scores:
                continue

            sku_scores.sort(key=lambda x: x["spec_match_percent"], reverse=True)

            best = sku_scores[0]
            alternatives = sku_scores[1:4]

            # Status logic (UI aligned)
            if best["spec_match_percent"] >= 90:
                status = "Matched"
            elif best["spec_match_percent"] >= 75:
                status = "Warning"
            else:
                status = "Not Matched"

            rfp_items_output.append({
                "item_name": item_name,
                "required_technical_specs": item_specs_text,
                "best_match_sku": best["sku_code"],
                "spec_match_percent": best["spec_match_percent"],
                "status": status,
                "alternative_skus": alternatives
            })

        technical_results.append({
            "rfp_id": rfp_id,
            "items": rfp_items_output
        })

    state["technical_output"] = technical_results
    print("[Technical Agent] Item-level processing complete")
    return state



def pricing_agent_node(state: RFPState) -> RFPState:
    print("\n[Pricing Agent] Placeholder executed")
    state["pricing_output"] = {"status": "Not implemented"}
    return state

def master_agent_node(state: RFPState) -> RFPState:
    print("\n[Master Agent] Consolidating outputs")
    state["final_output"] = {
        "sales": state.get("sales_output", []),
        "technical": state.get("technical_output", {}),
        "pricing": state.get("pricing_output", {}),
        "status": "Ready"
    }
    return state

# ============================
# LANGGRAPH BUILD
# ============================

graph = StateGraph(RFPState)

graph.add_node("sales_agent", sales_agent_node)
graph.add_node("priority_selector", select_highest_priority_rfp)
graph.add_node("technical_agent", technical_agent_node)
graph.add_node("pricing_agent", pricing_agent_node)
graph.add_node("master_agent", master_agent_node)

graph.set_entry_point("sales_agent")

# 1️⃣ Sales → Priority Filter
graph.add_edge("sales_agent", "priority_selector")

# 2️⃣ Priority → Master (summary / routing)
graph.add_edge("priority_selector", "master_agent")

# 3️⃣ Master → Technical
graph.add_edge("master_agent", "technical_agent")

# 4️⃣ Master → Technical
graph.add_edge("master_agent", "pricing_agent")

# 5️⃣ Master → Pricing
graph.add_edge("technical_agent", "master_agent")

# 6️⃣ Pricing → Master (final consolidation)
graph.add_edge("pricing_agent", "master_agent")

graph.add_edge("master_agent", END)


rfp_graph = graph.compile()

# ============================
# RUN
# ============================

if __name__ == "__main__":
    print("="*60)
    print("RFP PROCESSING SYSTEM - LOCAL OLLAMA MODE")
    print("="*60)
    
    # Pre-flight check: Verify Ollama is ready
    if not check_ollama_availability():
        print("\n[CRITICAL] Ollama is not available. Exiting.")
        print("\nSetup Instructions:")
        print("1. Install Ollama from https://ollama.ai")
        print("2. Start Ollama: ollama serve")
        print(f"3. Download model: ollama pull {OLLAMA_MODEL}")
        exit(1)
    
    print(f"\n[INFO] Using local model: {OLLAMA_MODEL}")
    print(f"[INFO] Cache enabled: {len(_llm_cache)} cached responses")
    print(f"[INFO] Concurrent execution: Enabled (ThreadPoolExecutor)")
    print("\n" + "="*60 + "\n")
    
    final_state = rfp_graph.invoke({})
    
    print("\n" + "="*60)
    print("=== FINAL LANGGRAPH STATE ===")
    print("="*60)
    print(json.dumps(final_state, indent=2, default=str))
