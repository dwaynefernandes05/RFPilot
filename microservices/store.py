from typing import List, Dict, Any
from pymongo import MongoClient

try:
    client = MongoClient(
        "mongodb://localhost:27017",
        serverSelectionTimeoutMS=3000
    )
    client.server_info()

    db = client["agentic_rfp"]
    rfp_collection = db["rfps"]
    USE_MONGO = True
    print("[STORE] MongoDB connected")

except Exception:
    USE_MONGO = False
    _rfp_store: Dict[str, Dict[str, Any]] = {}
    print("[STORE] Using in-memory store")


def save_rfp(rfp: Dict[str, Any]) -> None:
    rfp_id = rfp.get("rfp_id")
    if not rfp_id:
        return

    if USE_MONGO:
        rfp_collection.update_one(
            {"rfp_id": rfp_id},
            {"$set": rfp},
            upsert=True
        )
    else:
        _rfp_store[rfp_id] = rfp


def get_all_rfps() -> List[Dict[str, Any]]:
    if USE_MONGO:
        return list(rfp_collection.find({}, {"_id": 0}))
    return list(_rfp_store.values())


def get_rfp(rfp_id: str):
    if USE_MONGO:
        return rfp_collection.find_one(
            {"rfp_id": rfp_id},
            {"_id": 0}
        )
    return _rfp_store.get(rfp_id)   # ✅ THIS WAS MISSING


def delete_all_rfps():
    if USE_MONGO:
        rfp_collection.delete_many({})
    else:
        _rfp_store.clear()
