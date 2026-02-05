# 🧠 Agentic AI System for Automated RFP → SKU Matching

An end-to-end **Agentic AI pipeline** that automatically discovers RFPs, prioritizes them, extracts technical requirements, semantically matches them to OEM product SKUs, estimates pricing & testing costs, and prepares structured outputs for proposal teams.

Built for **enterprise procurement**, **PSU tenders**, and **large-scale technical bidding workflows**.

---

## 🚀 Problem Statement

Responding to RFPs is:
- Manual and time-consuming
- Highly dependent on scarce technical experts
- Error-prone due to inconsistent RFP formats
- Slow in identifying the *right-to-win* tenders

There is no intelligent system that:
- Continuously discovers RFPs
- Prioritizes them by urgency
- Matches technical specs to OEM SKUs
- Produces explainable, auditable outputs

---

## 🎯 Solution Overview

This project implements a **multi-agent AI system** where each agent handles a specific responsibility in the RFP lifecycle.

### Core Capabilities
- Automated RFP discovery from tender portals
- Priority-based RFP selection
- Explainable technical summaries
- Semantic SKU matching using SBERT (MiniLM)
- Spec-match percentage calculation
- Pricing & testing cost estimation
- Human-in-the-loop override support

---

## 🧩 Agent Architecture

### 1️⃣ Sales Agent
**Responsibility**
- Scrapes tender portals / dummy websites
- Extracts key RFP metadata

**Outputs**
- RFP ID
- Title
- Buyer
- Deadline
- Estimated value
- Priority (based on deadline)

➡️ Sends **highest-priority RFP summary** to Master Agent

---

### 2️⃣ Master Agent (Orchestrator)
**Responsibility**
- Selects highest-priority RFP
- Supports human override (choose next priority)
- Generates structured summaries for downstream agents

**Outputs**
- Technical Summary
- Pricing Summary
- Explainable AI summary (human-readable)

---

### 3️⃣ Technical Agent
**Responsibility**
- Extracts material line items from RFP PDFs
- Matches RFP requirements to OEM SKUs
- Computes **Spec Match %** using semantic similarity

**How it works**
- Uses **SBERT (all-MiniLM-L6-v2)** embeddings
- Compares RFP specs vs SKU specs using cosine similarity
- Ranks and selects **Top 3 OEM SKUs** per item

**Outputs**
- Best-match SKU
- Top-3 alternatives
- Spec Match %
- Match status (Matched / Warning / Not Matched)

---

### 4️⃣ Pricing Agent
**Responsibility**
- Assigns material prices from product catalog
- Assigns testing & acceptance costs from testing matrix
- Consolidates total material + service costs

**Outputs**
- Line-item pricing
- Testing & certification costs
- Final consolidated price table

---

## 🛠️ Tech Stack

### Backend
- **Python**
- **LangGraph** – agent orchestration
- **FastAPI** – backend APIs
- **MongoDB Atlas** – product & pricing repositories

### AI / ML
- **SBERT (Sentence-Transformers MiniLM)** – semantic matching
- **Local LLM (Ollama / Mistral)** – item extraction & summaries
- **Tesseract OCR** – scanned PDF fallback

### Document Processing
- **pdfplumber** – text extraction from digital PDFs
- **pdf2image + OCR** – scanned PDFs

---

## 📦 Databases

### Product Catalog (MongoDB)
Stores OEM SKUs with dynamic specifications.

Example fields:
```json
{
  "sku_code": "CBL-HT-005",
  "product_name": "HT Aluminum Cable",
  "unit_price_inr": 2400,
  "material": "Aluminum",
  "voltage": "11kV",
  "insulation": "PVC"
}
```
---

## Testing & Services Repository (MongoDB)

Stores test names and service costs.

Example fields:
```json
{
  "test_name": "High Voltage Withstand Test",
  "applicable_to": ["HT Cables"],
  "price_inr": 15000
}
```

---

## ⚙️ How Spec Match % is Calculated

- Convert RFP item specs → embedding

- Convert SKU specs → embedding

- Compute cosine similarity

- Convert similarity to percentage

```
Spec Match % = cosine_similarity × 100
```

This avoids:

- Regex failures
- Format dependency
- Keyword brittleness

--- 

## 🧪 Key Features

✅ Works with any RFP format
✅ Handles scanned PDFs
✅ Explainable AI outputs
✅ Human-in-the-loop override
✅ Modular agent design
✅ Enterprise-ready architecture

--- 

## 🔮 Future Enhancements

- Weighted spec importance

- Historical win-rate learning

- Vendor negotiation intelligence

- Auto-generated proposal PDFs

- Multi-language RFP support

---

## 👥 Team & Use Case

Built as part of an EY Techathon Competition focusing on real-world procurement and automating workflows.

---

## 🙌 Final Note

This system demonstrates how Agentic AI + Semantic Intelligence can radically transform procurement and RFP response workflows — reducing effort from days to minutes.
