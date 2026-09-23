# StandardsAI — SIH26108 Partitioned Architecture

**AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications.**

This project is cleanly partitioned into two standalone, production-ready directories:

```
SIH26108/
├── frontend/                   # Partitioned React 19 + TypeScript Frontend
│   ├── src/                    # Components, pages, layouts, services, context
│   ├── public/                 # Assets & static files
│   ├── package.json            # Node dependencies & Vite scripts
│   ├── vite.config.ts          # Vite configuration
│   └── README.md               # Frontend documentation
│
└── backend/                    # Partitioned FastAPI Python Backend
    ├── app/                    # Main app, config, schemas, services & routers
    ├── requirements.txt        # Python dependencies
    ├── test_backend.py         # Automated REST endpoint test suite
    └── README.md               # Backend documentation
```

---

## 1. Quick Start Guide

### Running the Backend (FastAPI Python)
```bash
cd backend
pip install -r requirements.txt
python scripts/ingest_standards.py
python -m uvicorn app.main:app --reload --port 8000
```
- API Endpoint Base: `http://localhost:8000/api/v1`
- Swagger Interactive Docs: `http://localhost:8000/docs`
- Run Endpoint Test Suite: `python test_backend.py`

### Running the Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Local URL: `http://localhost:5173`
- Pre-configured to connect to `http://localhost:8000/api/v1` with automatic mock fallback for offline hackathon demonstrations.

---

## 2. Key Modules & Features

### Core Procurement Workflow
`Requirement → Extraction → AI Understanding → Semantic Search → Recommendation → Related Standards → Version/Amendment → Certification → Evidence → Specification Check → Report`

- **Tender Upload & Text Analysis**: Drag-and-drop PDF/DOCX tender parsing or natural language input.
- **Human-in-the-Loop AI Extraction Review**: Allows procurement officers to review and edit extracted parameters before running semantic matching.
- **Semantic Vector Ranking Engine**: Matches and scores Indian Standards (IS 2925, IS 2062, IS 15652, IS 302, etc.) into match levels (`Very High`, `High`, `Medium`, `Needs Review`) with expandable **"Why recommended?"** match breakdowns.
- **Interactive Relationship Graph**: Network visualization of main standards and related testing, safety, normative reference, and installation standards.
- **Version & Amendment Timeline**: Tracks historical revisions and highlights "Latest Available" publications.
- **Specification Completeness Checker**: Evaluates procurement specification coverage (%) and suggests improvement items.
- **Procurement Standards Report**: Previews and downloads structured reports.

---

## 3. Demo Credentials

- **Email:** `procurement.officer@gov.in`
- **Password:** `demo123`
- **Role:** Procurement Officer

---

**SIH26108 Prototype** — For demonstration purposes only. Not an official BIS or Government of India website.
