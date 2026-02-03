from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import uuid
from typing import Dict

import rfp_graph_ollama
from store import get_all_rfps, get_rfp, delete_all_rfps, get_sales_output, get_master_output as get_master_from_store

app = FastAPI(title="Agentic RFP Backend")

# -------------------------
# CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# TASK STATUS STORE
# -------------------------
task_status: Dict[str, str] = {}

# -------------------------
# BACKGROUND RUNNER
# -------------------------
def run_sales_agent_bg(task_id: str):
    try:
        task_status[task_id] = "running"
        delete_all_rfps()  # clean slate

        rfp_graph_ollama.rfp_graph.invoke({})

        task_status[task_id] = "completed"
        print("[Backend] Sales Agent completed")

    except Exception as e:
        task_status[task_id] = "failed"
        print("[Backend] Sales Agent failed:", e)

# -------------------------
# RUN SALES AGENT
# -------------------------
@app.post("/run")
def run_sales_agent():
    task_id = str(uuid.uuid4())
    task_status[task_id] = "queued"

    thread = threading.Thread(
        target=run_sales_agent_bg,
        args=(task_id,),
        daemon=True
    )
    thread.start()

    return {
        "task_id": task_id,
        "status": "started"
    }

# -------------------------
# CHECK RUN STATUS  🔑
# -------------------------
@app.get("/run/status/{task_id}")
def run_status(task_id: str):
    return {
        "task_id": task_id,
        "status": task_status.get(task_id, "unknown")
    }

# -------------------------
# LIST RFPS (Sales Agent Output)
# -------------------------
@app.get("/rfps")
def list_rfps():
    """
    Returns all RFPs extracted by the sales agent from website scraping
    """
    sales_output = get_sales_output()
    
    # Always return an array, even if empty
    if not sales_output or not isinstance(sales_output, list):
        return []
    
    return sales_output

# -------------------------
# RFP DETAILS (From Sales Output)
# -------------------------
from urllib.parse import unquote

# In main.py
@app.get("/rfps/{rfp_id:path}")
def rfp_details(rfp_id: str):
    sales_output = get_sales_output()
    if not sales_output:
        return {"error": "No RFPs available."}
    
    # Decodes incoming ID (handles %23, %2F, etc.)
    decoded_id = unquote(rfp_id)
    
    for rfp in sales_output:
        # Check against the formatted ID AND the original tender ID
        if (str(rfp.get("rfp_id")) == decoded_id or 
            str(rfp.get("original_rfp_id")) == decoded_id):
            return rfp
    
    return {"error": f"RFP with ID {decoded_id} not found in sales output"}



# -------------------------
# GET MASTER AGENT OUTPUT
# -------------------------
@app.get("/master/output")
def get_master_output():
    """
    Returns the master agent output (technical and pricing summaries) for the selected RFP
    """
    master_output = get_master_from_store()
    
    if not master_output:
        return {"error": "No master agent output available. Please run the sales agent first."}
    
    return master_output

# -------------------------
# CLEAR RFPS
# -------------------------
@app.delete("/rfps")
def clear_rfps():
    delete_all_rfps()
    return {"status": "cleared"}