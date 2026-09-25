# Analysis workflow audit

The application is a Vite multi-page HTML/JavaScript frontend and FastAPI backend (the root README's React description is stale). Existing authentication is session-based and owner checks already protect persisted analyses and reports.

- Existing retrieval entry point: `vector_engine.rank_standards_for_requirement`, using `corpus.Corpus.search`. Ingestion preserves physical pages, chunks and source identifiers. Cached sentence-transformer embeddings supplement BM25 when available; the engine reports its actual retrieval mode.
- Existing extraction: `document_reader.read_document` and `ai_extractor.extract_requirements_from_input`, with Gemini extraction and an explicit source-text fallback. PDF, DOCX and TXT work; images and legacy DOC need handling.
- Existing analysis APIs: extract/upload/confirm and persistent background jobs. Upload extraction happens before a job exists. Several job stages currently do not perform the work their labels claim.
- Existing results: `analysis-flow.js` handles review, results and standard detail routes. Results expose a raw explanation, escaped HTML in lists, and fabricated supported traceability rows. Domain selection is a fixed list and does not persist.
- Existing reports: disk-backed snapshots, ReportLab PDF endpoints and a separate inline report-page renderer. Preview and PDF both invent verification claims and truncate evidence. Direct PDF navigation omits bearer authentication. Report preview also inserts an officer name as a signature.
- Existing assistant: general-purpose chat with optional web research. Analysis needs a context-restricted entry point using the same Gemini/evidence service.
- Existing history: browser storage only, with a result URL parameter that does not match the result loader. Dashboard has a sample entry when empty.
- Existing input animation advances on timers, independent of backend work.

Implementation preserves the existing routes, authentication, corpus/index and retrieval algorithm. New result fields are backward-compatible. Historical records lacking verified mappings are shown as requiring review rather than upgraded to supported. Reports use a durable snapshot of the completed analysis.

Pre-existing local changes in auth.py, gemini_service.py, pdf_service.py, test_login_sessions.py and pyrightconfig.json must be retained.
