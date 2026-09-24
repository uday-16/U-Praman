# Chatbot implementation and project review

The active frontend is the HTML/JavaScript multi-page Vite application in `frontend/`, bootstrapped by `js/main.js`; the README's React description is outdated. FastAPI routes live under `backend/app/routers`. Authentication, procurement analysis, the standards catalog, and report generation are separate services. `datab/` contains 32 standards PDFs. `backend/chroma_db/` is a pre-existing vector index. `backend/data/` contains application storage, not standards PDFs.

## Configuration audit

- `backend/.env` contains a configured Google Gemini `GEMINI_API_KEY`. Its value is never returned to the browser or recorded here.
- The configured key successfully listed models and generated a response during verification.
- `GEMINI_MODEL` defaults to `gemini-3.6-flash`, which the provider recommended after rejecting an older model with HTTP 404. It can be overridden in the backend environment.
- SMTP email credentials are configured; SMS provider/key fields are empty.
- The frontend's existing `VITE_API_BASE_URL` ends in `/api`; the widget now handles both `/api` and `/api/v1`.

## Standards chat

Source directory precedence is `STANDARDS_DATA_DIR` (absolute or backend-relative), then `backend/datad` if that directory exists, then the existing root `datab`. An explicitly configured empty/missing directory never falls back to unrelated data. No files have been moved or duplicated.

The chatbot extracts whole PDF pages, caches them in memory, and invalidates the cache when source paths, sizes, or timestamps change. The first question can take around 30 seconds to extract this corpus; subsequent searches reuse the cache. No separate ingestion step, model download, Chroma database, or simulated embeddings are required for chat.

Search uses term relevance with BM25 ranking, minimum term overlap, IS-number/part filtering, and the newest base edition present locally unless a publication year is requested. Source filenames and one-based PDF page numbers accompany the results. It does not determine whether a locally stored edition is the latest BIS publication.

Gemini selects exact passages from the retrieved pages. The backend validates source indices and checks each quote against its source text after whitespace normalization. Unavailable evidence results in an explicit not-found answer. Provider failures or invalid quotes show a clearly labelled retrieval-only response with expandable source text, never generated technical claims.

The widget uses asynchronous requests, a 60-second request timeout, duplicate-send protection, error recovery retaining the failed question, escaped user/source text, animated loading dots, reduced-motion support, and narrow-screen sizing. Conversations stay on the page while opening/closing the widget. Each question is searched independently; include its IS number for an unambiguous follow-up.

## Limitations and scope

PDF text extraction is not OCR. Image-only or unreadable pages cannot supply answers. Damaged tables should be checked in the original PDF; the prompt prohibits inferring values from them. Conservative lexical retrieval can miss paraphrases or non-English queries. Only chat was disconnected from simulated vector results; the separate procurement recommendation pipeline still contains legacy mock fallbacks and needs its own review before treating those recommendations as verified.

## Validation

```powershell
.venv/Scripts/python.exe -m unittest discover -s backend/tests -p test_chat.py
node --test frontend/tests/*.test.mjs
npm --prefix frontend run build
```

Backend regressions cover standard metadata, edition/scope filtering, unrelated questions, missing evidence, fabricated quotes, provider timeout, request validation, greetings, and retrieval failures. Browser checks cover the real API connection, loading state, source citations, and chat interaction.
