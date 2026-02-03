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
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


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
OLLAMA_TIMEOUT = 120  # seconds - increased for PDF processing

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
    deadline = raw.get("submission_deadline", "")
    
    # Hardcoded days_remaining
    days_remaining = 15

    # Use estimated_project_value directly
    est_val_cr = raw.get("estimated_project_value", "")

    return {
        "rfp_id": f"#102{index + 3}",  # demo-friendly ID
        "title": raw.get("rfp_title", "Untitled RFP"),
        "buyer": raw.get("buyer"),
        "source": "GeM" if "gem" in raw.get("tender_source", "").lower() else "E-Tender",
        "deadline": deadline,
        "days_remaining": days_remaining,
        "scope_items": raw.get("scope_items", 0),
        "estimated_value_cr": est_val_cr,
        "priority": (
            "Critical" if days_remaining is not None and days_remaining <= 3
            else "High" if days_remaining is not None and days_remaining <= 10
            else "Medium"
        ),
        "status": "Extracted"
    }

# ============================
# LANGGRAPH STATE
# ============================

class RFPState(TypedDict, total=False):
    sales_output: List[Dict[str, Any]]
    pdf_paths: List[str]  # PDF file paths
    master_output: Dict[str, Any]  # Master agent coordination data
    technical_output: Dict[str, Any]
    pricing_input: Dict[str, Any]  # Input for pricing agent
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
                
                # Check for error responses
                if response.startswith('{"error"'):
                    continue  # Try next chunk
                
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

            results.append(format_sales_for_frontend(fields, i))
            print("[Sales Agent] Extracted:", fields)

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
# MASTER AGENT (Sales → Technical)
# ============================

from datetime import datetime

def master_agent_node(state: RFPState) -> RFPState:
    print("\n[Master Agent] Started")

    sales_rfqs = state.get("sales_output", [])
    pdf_paths = state.get("pdf_paths", [])

    if not sales_rfqs:
        print("[Master Agent] No RFPs received from Sales Agent")
        state["master_output"] = None
        return state

    # ----------------------------
    # Step 1: Select Highest Priority RFP (earliest deadline)
    # ----------------------------
    def parse_deadline(rfp):
        try:
            return datetime.strptime(rfp.get("submission_deadline"), "%Y-%m-%d")
        except Exception:
            return datetime.max

    # ----------------------------
    # Human-in-the-loop override
    # ----------------------------
    ranked_rfqs = sorted(
        sales_rfqs,
        key=parse_deadline
    )
    # Default: highest priority
    selected_index = 0

    # Check if human override exists
    human_override = state.get("human_override")
    if human_override and isinstance(human_override, dict):
        override_index = human_override.get("selected_rfp_index")

        if isinstance(override_index, int) and 0 <= override_index < len(ranked_rfqs):
            selected_index = override_index
            print(
                f"[Master Agent] Human override detected. "
                f"Selecting RFP at rank {selected_index} instead of highest priority."
            )

    # Final selected RFP
    prioritized_rfp = ranked_rfqs[selected_index]

    print(
        f"[Master Agent] Selected RFP for analysis: "
        f"{prioritized_rfp.get('rfp_id')} (rank={selected_index})"
    )

    # Get corresponding PDF path (priority selector already matched them)
    selected_pdf = pdf_paths[0] if pdf_paths else None

    # ----------------------------
    # Step 2: Build Technical Agent Contextual Summary
    # ----------------------------
    technical_summary = {
        "rfp_context": {
            "rfp_id": prioritized_rfp.get("rfp_id"),
            "title": prioritized_rfp.get("title"),
            "buyer": prioritized_rfp.get("buyer"),
            "source": prioritized_rfp.get("tender_source"),
            "deadline": prioritized_rfp.get("submission_deadline"),
            "priority": prioritized_rfp.get("priority"),
            "estimated_value": prioritized_rfp.get("estimated_project_value")
        },
        "scope_context": {
            "material_type": "Electrical Cables",
            "expected_item_categories": [
                "XLPE Power Cables",
                "Control Cables",
                "Instrumentation Cables",
                "HT Cables",
                "Fire Survival Cables",
                "Flexible Cables"
            ],
            "scope_size": prioritized_rfp.get("scope_items")
        },
        "technical_instructions": {
            "extract_items": True,
            "extract_required_specs": True,
            "spec_priority": [
                "voltage",
                "conductor_material",
                "core_configuration",
                "size_sqmm",
                "insulation_type",
                "standards"
            ]
        },
        "sku_matching_rules": {
            "top_n": 3,
            "min_match_threshold": 70,
            "green_threshold": 90,
            "warning_threshold": 75
        },
        "pdf_path": selected_pdf
    }

    # ----------------------------
    # Step 3: Attach outputs to state
    # ----------------------------
    state["master_output"] = {
        # Raw selected RFP (used internally)
        "selected_rfp": prioritized_rfp,

        # 🔹 Display-ready summaries (for frontend pages)
        "summaries": {
            "technical": {
                "rfp_id": technical_summary["rfp_context"]["rfp_id"],
                "title": technical_summary["rfp_context"]["title"],
                "buyer": technical_summary["rfp_context"]["buyer"],
                "deadline": technical_summary["rfp_context"]["deadline"],
                "priority": technical_summary["rfp_context"]["priority"],
                "estimated_value": technical_summary["rfp_context"]["estimated_value"],
                "material_type": technical_summary["scope_context"]["material_type"],
                "expected_categories": technical_summary["scope_context"]["expected_item_categories"],
                "scope_size": technical_summary["scope_context"]["scope_size"],
                "instructions": technical_summary["technical_instructions"],
                "sku_rules": technical_summary["sku_matching_rules"]
            },
            "pricing": {
                "status": "Pending"
            }
        },

        # 🔹 Raw summaries (used by agents, not UI)
        "technical_summary": technical_summary,
        "pricing_summary": {
    "rfp_context": {
        "rfp_id": prioritized_rfp.get("rfp_id"),
        "title": prioritized_rfp.get("title"),
        "buyer": prioritized_rfp.get("buyer"),
        "priority": prioritized_rfp.get("priority")
    },

    "material_scope": {
        "material_type": "Electrical Cables",
        "expected_categories": technical_summary["scope_context"]["expected_item_categories"]
    },

    "testing_requirements": {
        "include_routine_tests": True,
        "include_type_tests": True,
        "include_acceptance_tests": True,
        "standards": [
            "IS 7098",
            "IEC 60502",
            "IEC 60331",
            "IEC 61034"
        ]
    },

    "pricing_rules": {
        "currency": "INR",
        "material_price_source": "product_catalog",
        "testing_price_source": "test_data",
        "risk_threshold_percent": 70
    },

    "status": "Ready for pricing agent"
}

    }

    # =============================
    # SAVE TO STORE
    # =============================
    from store import save_rfp
    
    rfp_data = {
        "rfp_id": prioritized_rfp.get("rfp_id"),
        "title": prioritized_rfp.get("title"),
        "buyer": prioritized_rfp.get("buyer"),
        "priority": prioritized_rfp.get("priority"),
        "deadline": prioritized_rfp.get("deadline"),
        "estimated_value": prioritized_rfp.get("estimated_value"),
        "technical_summary": technical_summary,
        "pricing_summary": state["master_output"]["pricing_summary"]
    }
    
    save_rfp(rfp_data)
    print(f"[Master Agent] RFP {prioritized_rfp.get('rfp_id')} saved to store")
    
    print("[Master Agent] Technical summary prepared and dispatched")
    # =============================
    # DEBUG: PRINT SUMMARIES
    # =============================
    # ✅PRINT EXPLAINABLE TECHNICAL SUMMARY
    print("\n========== TECHNICAL SUMMARY (JSON) ==========")
    print(json.dumps(
        state["master_output"]["technical_summary"],
        indent=2
    ))
    print("======================================\n")

    # ✅PRINT EXPLAINABLE PRICING SUMMARY
    print("\n========== PRICING SUMMARY ==========")
    print(json.dumps(
        state["master_output"]["pricing_summary"],
        indent=2
    ))
    print("======================================\n")


    return state

# ============================
# TECHNICAL AGENT (MASTER → TECHNICAL)
# ============================

# 🔐 MongoDB Atlas Connection
MONGO_URI = "mongodb+srv://admin:Soham1234@cluster0.yqd0rj2.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["agentic_rfp"]
sku_collection = db["product_catalog"]

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def embed_text(text: str) -> np.ndarray:
    return embedding_model.encode(text, normalize_embeddings=True)

def technical_agent_node(state: RFPState) -> RFPState:
    print("\n[Technical Agent] Started (MASTER-DRIVEN ITEM MODE)")

    # ----------------------------
    # Validate Master Agent Input
    # ----------------------------
    master_output = state.get("master_output") or {}
    if not isinstance(master_output, dict):
        master_output = {}
    technical_summary = master_output.get("technical_summary")

    if not technical_summary:
        print("[Technical Agent] ❌ No technical summary from Master Agent")
        state["technical_output"] = []
        return state

    rfp_id = technical_summary["rfp_context"]["rfp_id"]
    pdf_path = technical_summary.get("pdf_path")

    if not pdf_path or not os.path.exists(pdf_path):
        print(f"[Technical Agent] ❌ PDF missing for RFP {rfp_id}")
        state["technical_output"] = []
        return state

    print(f"[Technical Agent] Processing RFP: {rfp_id}")

    # ----------------------------
    # Load Product Catalog
    # ----------------------------
    catalog = list(
        sku_collection.find(
            {},
            {
                "_id": 0,
                "sku_code": 1,
                "description": 1,
                "category": 1,
                "specifications": 1
            }
        )
    )

    print(f"[Technical Agent] Loaded {len(catalog)} SKUs from MongoDB")

    # ----------------------------
    # 🔒 CLEAN + RESOLVE SKU IDs (PUT THIS HERE)
    # ----------------------------
    clean_catalog = []

    for sku in catalog:
        sku_id = (
            sku.get("sku_code") or
            sku.get("sku_id") or
            sku.get("sku") or
            sku.get("id")
        )

        if not sku_id:
            print("[Technical Agent] ⚠️ SKU without identifier skipped")
            continue

        sku["resolved_sku_code"] = sku_id
        clean_catalog.append(sku)

    catalog = clean_catalog

    print(f"[Technical Agent] {len(catalog)} valid SKUs after cleanup")

    for sku in catalog:
        desc = sku.get("description") or ""
        specs = " ; ".join(
            f"{k}: {v}" for k, v in sku.get("specifications", {}).items()
        )

        # Fallback so embedding text is NEVER empty
        if not desc and not specs:
            desc = sku["resolved_sku_code"]

        sku["embedding_text"] = f"{desc} | {specs}"
        sku["embedding_vector"] = embed_text(sku["embedding_text"])

    # ----------------------------
    # Always attempt item extraction for material RFPs
    # ----------------------------
    print("[Technical Agent] Attempting item extraction regardless of Sales scope signal")
    
    # ----------------------------
    # FULL TEXT EXTRACTION (PDF + OCR)
    # ----------------------------
    def extract_full_text(pdf_path: str) -> str:
        text = ""
        
        KEYWORDS = [
            "technical specification",
            "scope of supply",
            "cable specification",
            "electrical",
            "xlpe",
            "power cable",
            "control cable",
            "instrumentation"
        ]

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if not t:
                    continue
                t_lower = t.lower()
                if any(k in t_lower for k in KEYWORDS):
                    text += t + "\n"
                elif "schedule" in t_lower or "bill of quantity" in t_lower:
                    text += t + "\n"

        # OCR fallback
        if len(text.strip()) < 300:
            print("[Technical Agent] Low text detected → OCR fallback")
            images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=5)
            for img in images:
                text += pytesseract.image_to_string(img)

        return text

    # ----------------------------
    # ITEM EXTRACTION (LLM – SINGLE CALL)
    # ----------------------------
    def extract_items_llm(text: str) -> list:
        prompt = f"""
You are extracting ELECTRICAL POWER & CONTROL CABLE material line items ONLY.

STRICT RULES:
- Extract ONLY industrial electrical cables (XLPE, HT, LT, Control, Instrumentation, Fire Survival, Flexible power cables)
- DO NOT extract RF, coaxial, signal, communication, antenna, or connector assemblies
- If an item is RF / coaxial, IGNORE it completely

Return ONLY a JSON ARRAY.

Rules:
- Each object MUST represent ONE physical material item
- DO NOT return agreements, sections, titles, eligibility, or commercial text
- DO NOT wrap in markdown
- DO NOT add explanations
- If no material items exist, return []

FORMAT:
[
  {{
    "item_name": "XLPE Power Cable 11kV",
    "required_technical_specs": "Voltage: 11kV, Conductor: Aluminium, Insulation: XLPE, Standard: IS 7098"
  }}
]

DOCUMENT TEXT:
{text}

JSON ARRAY ONLY:
"""

        response = local_llm_call(prompt, max_tokens=700)

        try:
            start = response.find("[")
            end = response.rfind("]") + 1
            if start == -1 or end <= start:
                return []
            return json.loads(response[start:end])
        except Exception as e:
            print(f"[Technical Agent] ❌ Item extraction failed: {e}")
            print(f"[Technical Agent] Response was: {response[:200]}...")
            return []
        
    # ----------------------------
    # PRICE STUB (TEMP)
    # ----------------------------
    def price_stub(sku_code) -> int:
        if not sku_code:
            return 0  # or None, or -1, or "TBD"

        sku_code = str(sku_code).upper()

        if "AL240" in sku_code:
            return 1250
        if "AL185" in sku_code:
            return 980
        if "CU" in sku_code:
            return 2100

        return 1500

    # ----------------------------
    # MAIN TECHNICAL PROCESSING
    # ----------------------------
    full_text = extract_full_text(pdf_path)
    items = extract_items_llm(full_text)

    # 🔥 FALLBACK: If LLM fails, generate items from Master context
    if not items:
        print("[Technical Agent] ⚠️ No items extracted via LLM. Using category fallback.")
        expected_categories = technical_summary["scope_context"].get(
            "expected_item_categories", []
        )

        items = [
            {
                "item_name": category,
                "required_technical_specs": "Refer RFP technical specifications"
            }
            for category in expected_categories
        ]


    rfp_items_output = []

    # ----------------------------
    # Category Relevance Filter
    # ----------------------------
    def category_relevant(item_text: str, sku_category: str | None) -> bool:
        if not sku_category:
            return False

        item_text = item_text.lower()
        sku_category = sku_category.lower()

        # RF / coaxial indicators → reject power/control cables
        if any(k in item_text for k in ["mhz", "ghz", "impedance", "vswr", "rf", "pim"]):
            return any(k in sku_category for k in ["rf", "coax", "signal", "flex"])

        # Power cable indicators
        if any(k in item_text for k in ["kv", "xlpe", "ht", "lt", "sqmm"]):
            return any(k in sku_category for k in ["power", "xlpe", "ht", "lt"])

        return True

    # --- SBERT semantic matching ---

    for item in items:
        item_name = item.get("item_name", "Unknown Item")
        item_specs_text = item.get("required_technical_specs", "")

        item_text = f"{item_name} {item_specs_text}".lower()

        # ----------------------------
        # DOMAIN REJECTION (RF / COAX)
        # ----------------------------
        if any(k in item_text for k in ["mhz", "ghz", "vswr", "pim", "impedance", "rf", "n male"]):
            rfp_items_output.append({
                "item_name": item_name,
                "required_technical_specs": item_specs_text,
                "best_match_sku": None,
                "spec_match_percent": 0,
                "status": "Out of Domain",
                "top_3_skus": []
            })
            continue
        
        combined_text = f"{item_name}. {item_specs_text}"
        rfp_embedding = embed_text(combined_text)

        sku_scores = []

        item_text = f"{item_name} {item_specs_text}"

        for product in catalog:
            if not category_relevant(item_text, product.get("category")):
                continue

            similarity = cosine_similarity(
                [rfp_embedding],
                [product["embedding_vector"]]
            )[0][0]  
            normalized_score = max(0.0, similarity)   # clamp negatives
            spec_match_percent = round(normalized_score * 100, 2)

            sku_id = product["resolved_sku_code"]

            sku_scores.append({
                "sku_code": sku_id,
                "spec_match_percent": spec_match_percent,
                "price_per_unit": price_stub(sku_id),
                "sku_description": product.get("description"),
                "sku_category": product.get("category")
            })

        if not sku_scores:
            continue

        sku_scores.sort(key=lambda x: x["spec_match_percent"], reverse=True)
        top_3 = sku_scores[:3]
        best = top_3[0]

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
        "top_3_skus": top_3
    })

    # ----------------------------
    # OUTPUT → MASTER & PRICING
    # ----------------------------
    state["technical_output"] = {
        "rfp_id": rfp_id,
        "items": rfp_items_output
    }

    print("[Technical Agent] ✅ Item-level SKU matching complete")
    return state

def pricing_agent_node(state: RFPState) -> RFPState:
    print("\n[Pricing Agent] Placeholder executed")
    state["pricing_output"] = {"status": "Not implemented"}
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

# 3️⃣ Master → Technical (sequential flow)
graph.add_edge("master_agent", "technical_agent")

# 4️⃣ Technical → Pricing (sequential flow)
graph.add_edge("technical_agent", "pricing_agent")

# 5️⃣ Pricing → END
graph.add_edge("pricing_agent", END)


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
