# StandardsAI FastAPI Backend — SIH26108

AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications.

## Features
- **Tender & Requirement NLP Extraction**: Extracts product, application context, technical parameters, and safety requirements.
- **Semantic Vector Ranking Engine**: Ranks Indian Standards (BIS database) with match confidence levels (`Very High`, `High`, `Medium`, `Needs Review`) and breakdown details.
- **Standards Knowledge Base**: High-fidelity records of Indian Standards (IS 2925, IS 2062, IS 15652, IS 302, etc.) with scopes, clauses, version histories, and certifications.
- **Standards Relationship Graph**: Generates relationship nodes & edges for testing, safety, normative references, and installation standards.
- **Specification Completeness Checker**: Evaluates procurement specification coverage and returns actionable recommendations.
- **Procurement Standards Report Generator**: Compiles downloadable structured reports with human review notices.

## Setup & Running

1. **Install dependencies**:
   ```bash
   python -m pip install -r backend/requirements.txt
   ```

2. **Ingest Standards Data (Build RAG Database)**:
   ```bash
   python backend/scripts/ingest_standards.py
   ```

3. **Run the server**:
   ```bash
   python -m uvicorn app.main:app --app-dir backend --reload --port 8000
   ```

4. **Interactive API Documentation**:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

Run these commands from the repository root, using the same Python environment
for installation and startup. After pulling dependency changes, rerun the install
command. PDF reports require `reportlab`, which is included in `requirements.txt`;
a missing package prevents the API from starting and makes login unavailable.

If MongoDB is unavailable, the backend automatically uses its local JSON datastore.
The fallback notice alone is not a startup failure; check for a subsequent traceback
and confirm that `http://localhost:8000/health` responds.

## API Endpoints Overview

- `POST /api/v1/auth/login` - Officer login authentication
- `POST /api/v1/analysis/extract` - Extract requirements from text input
- `POST /api/v1/analysis/upload` - Upload tender document (PDF/DOCX)
- `POST /api/v1/analysis/confirm` - Confirm/edit extracted parameters & run semantic search
- `GET /api/v1/analysis/{id}` - Fetch analysis recommendations & completeness score
- `GET /api/v1/standards` - Search & filter Indian Standards knowledge base
- `GET /api/v1/standards/{id}` - Detailed standard view
- `GET /api/v1/standards/{id}/graph` - Relationship graph (nodes & edges)
- `GET /api/v1/standards/{id}/versions` - Version & amendment timeline
- `POST /api/v1/reports` - Generate procurement standards report
- `GET /api/v1/reports/{id}/download` - Download JSON/PDF report package
