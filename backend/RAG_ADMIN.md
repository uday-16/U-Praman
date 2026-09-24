# RAG and administration

The portal now uses the local source documents for requirement analysis, the chatbot, the workspace catalog and the administrator library. It does not synthesize missing standards, clauses, compliance results or mandatory certification claims.

## Run

From the repository root in PowerShell:

```powershell
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
.venv/Scripts/python.exe backend/scripts/ingest_standards.py --download-model
$env:PYTHONPATH = 'backend'
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
npm run dev --prefix frontend
```

Restart an already-running backend after updating the source. Configure `VITE_API_BASE_URL` consistently for authentication, administration, analysis and chat. The default local API is `http://127.0.0.1:8000/api/v1`.

## Documents and retrieval

`STANDARDS_DATA_DIR` overrides the document directory. Otherwise the backend prefers `backend/datab` and falls back to the existing root `datab` folder. The current collection contains 32 PDF files. Physical PDF pages are retained in citations; image-only pages use local OCR. Empty pages are reported for review and may simply be blank.

Text extraction and normalized semantic embeddings are cached under `backend/data/rag`; the sentence-transformer model is under `backend/data/models`. Cache fingerprints include document contents, model name and extraction schema. Runtime retrieval never downloads a model: explicitly use the ingestion command above to provision it. If unavailable, genuine BM25 text retrieval remains available and is labelled accordingly. Random vectors have been removed.

Search uses hybrid semantic and lexical ranking. Results prefer the latest base edition present in the local collection unless an older edition is requested. Separate amendments are linked to the base edition identified in their header. Their publication year is not treated as a replacement edition. Cross-references are documented mentions, not a claim of normative applicability.

Retrieval relevance scores do not establish product conformity. Latest local edition does not mean latest valid BIS edition. QCO, CRS, hallmarking, certification mandates and supersession need current authoritative verification. OCR and extracted table layouts should be checked against the linked PDF, particularly for numeric limits.

The Gemini model is configurable with `GEMINI_MODEL`. Calls have bounded timeouts and one retry for transient provider errors. Missing evidence does not trigger an ungrounded answer. If generation is unavailable, the portal shows retrieved excerpts and an explicit notice. Extraction failures preserve the actual user input for manual review. The observed provider occasionally returned HTTP 503 during verification.

## Administrator access

Use `/pages/admin-login.html` with administrator credentials, then open `/pages/admin.html`. The public login rejects administrator accounts. Admin entry points are not linked from public navigation. URL separation is organizational; server authentication and authorization enforce access. All `/api/v1/admin` routes and the legacy user-management routes require a valid server-side session and an administrator role. Changing the browser's stored role does not grant access.

Public signup creates verified procurement officer accounts only and never overwrites existing accounts. `/pages/admin-signup.html` creates administrators only after verifying a fresh email OTP for the new account and the credentials of an active existing administrator. No approving administrator session token is issued. Admin creation is audited. The console can create officer accounts, list/search/filter accounts, update them and permanently delete accounts while retaining historical analyses and audit records. Deletion revokes sessions and prevents self-deletion or removal of the last active administrator. An existing administrator can promote a verified officer from **Users & access**. Administrators can edit names/departments, deactivate/reactivate accounts and revoke sessions. Role and status changes revoke existing sessions. Self-demotion/deactivation and removal of the last active administrator are blocked.

New installations do not create an administrator with a hardcoded password. To provision the first administrator, set `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters in the backend environment, start the backend once, then remove the bootstrap values. Existing accounts are retained.

**Security & services** supports password changes, LLM connectivity checks and SMTP connection checks. Password changes require the current password and revoke other sessions. Forgot-password recovery requires a fresh email OTP and revokes all existing sessions. Email delivery needs the existing SMTP environment settings. Google sign-in accepts only a verified Google ID token for `GOOGLE_CLIENT_ID`; it is disabled when that client ID is absent.

Login attempts are limited to 10 per identifier/client-address pair in 15 minutes. Seven-day opaque sessions are hashed in storage, checked on every protected API call and revoked on logout. The local fallback datastore uses interprocess locks and atomic file replacement. Use HTTPS when hosting the portal beyond localhost.

## Administration operations

- Overview metrics come from real accounts, source documents and persisted analyses.
- Users and activity views support filtering and pagination.
- Standards upload validates the file before adding it. Duplicate names are rejected. Use filenames containing the IS number, part and year.
- Archive moves a document into `backend/data/standards-archive`; restore reverses that operation. New searches omit archived sources. Historical links to archived files are unavailable until restoration.
- Upload, archive, restore and reindex run through a single background index job. The job list reports completion and failures. Refresh it to see progress. If the server is interrupted, starting a new job marks abandoned jobs as failed.
- The audit ledger records administrative changes without passwords, API keys or session tokens.
- Requirement records persist under `backend/data/analyses` and are scoped to the submitting account. Admin activity exposes summary metadata, not another user's full tender text.

Administration/audit/throttle state is stored in `backend/data/administration.sqlite3`. Preserve this file, the user/session datastore, the analyses directory and document archives when backing up the portal. Run the local-file deployment on one host; a multi-host deployment needs shared durable storage and a distributed job queue.

## Verification

```powershell
.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
node --test frontend/tests/*.test.mjs
npm run build --prefix frontend
```

Tests cover authentication, admin access denial, privilege escalation prevention, session revocation, password recovery/rotation, owner isolation, document validation, edition filtering, source citations, cache invalidation, no-evidence behavior and archive/restore jobs. Account mutations in the test suite use isolated fixtures, not real users. Live checks also exercised retrieval against the actual standards collection and the configured Gemini provider.

## Dedicated administrator workspace

`/pages/admin.html?section=overview` is the administrator dashboard. Its sidebar keeps all management sections on this page: `users`, `standards`, `activity`, `audit`, and `security`. Browser back/forward and reload preserve the selected section. The page uses `/api/v1/admin/me` for session validation; administrative logout, service checks and source downloads also use protected admin endpoints.

`GET /api/v1/admin/dashboard` summarizes persisted accounts and analysis metadata, with officer counts, department coverage, seven-day UTC activity, recent officers, analyses, audit events and indexing jobs. It never initializes the retrieval index. The dashboard refreshes every 30 seconds only while visible and idle. No synthetic accounts are inserted by the dashboard.

Officer creation and editing support phone, designation/cadre, officer/GeM ID and jurisdiction/state. `GET /api/v1/admin/users/{id}` returns these fields, registration/login dates, active session count and recent analysis summaries. Password hashes and tokens are never returned. Profile dialogs remain in the admin workspace.

Standards listings read an already-loaded index snapshot and show pending index status when one is unavailable. Rebuild runs through the existing background job queue; opening the dashboard or standards list does not start OCR or embedding-model loading. Job status refreshes while the standards section is visible. After an indexing operation completes, use Refresh data to reload document metadata.
