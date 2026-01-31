from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import uuid
from typing import Dict

import rfp_graph_ollama
from store import get_all_rfps, get_rfp, delete_all_rfps

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
# LIST RFPS
# -------------------------
@app.get("/rfps")
def list_rfps():
    return get_all_rfps()

# -------------------------
# RFP DETAILS
# -------------------------
from urllib.parse import unquote

@app.get("/rfps/{rfp_id:path}")
def rfp_details(rfp_id: str):
    decoded_id = unquote(rfp_id)
    rfp = get_rfp(decoded_id)
    if not rfp:
        return {"error": "RFP not found"}
    return rfp




# -------------------------
# CLEAR RFPS
# -------------------------
@app.delete("/rfps")
def clear_rfps():
    delete_all_rfps()
    return {"status": "cleared"}