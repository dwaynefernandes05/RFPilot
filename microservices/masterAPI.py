from fastapi import FastAPI, HTTPException
from typing import Dict, Any
import json

# import the compiled LangGraph
from wonky_SBERT_works import rfp_graph

app = FastAPI(
    title="Agentic RFP Backend",
    version="1.0.0"
)

@app.post("/master/run")
def run_master_agent() -> Dict[str, Any]:
    """
    Runs the pipeline up to the Master Agent
    Returns JSON technical & pricing summaries
    """

    # Run full graph (Sales → Priority → Master → Technical → Pricing)
    # We will only RETURN master_output
    final_state = rfp_graph.invoke({})

    master_output = final_state.get("master_output")

    if not master_output:
        raise HTTPException(
            status_code=500,
            detail="Master Agent failed to produce output"
        )

    return {
        "selected_rfp": master_output.get("selected_rfp"),
        "technical_summary": master_output.get("technical_summary"),
        "pricing_summary": master_output.get("pricing_summary")
    }
