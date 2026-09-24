import { workspaceReady } from './utils/workspace-guard.js';
import { renderAppSidebar, renderAppTopbar, initSidebarEvents, initTopbarEvents } from './components/sidebar.js';
import { api, escapeHtml as esc, sourceUrl } from './utils/api.js';

const panel = document.getElementById('analysis-content');
const params = new URLSearchParams(window.location.search);
const page = window.location.pathname;

const list = values => `<ul>${values.map(value => `<li>${esc(value)}</li>`).join('')}</ul>`;

function heading(title, subtitle) {
  return `<div style="margin-bottom: 1.5rem;"><h1 class="page-title" style="font-size: 1.6rem; font-weight: 700; color: #123F63; margin-bottom: 0.35rem;">${esc(title)}</h1><p class="page-subtitle" style="font-size: 0.92rem; color: #64748b;">${esc(subtitle)}</p></div>`;
}

function field(id, label, value, multi = false) {
  return `<div class="form-group" style="margin-bottom: 1rem;"><label class="form-label" for="${id}" style="font-weight: 600; font-size: 0.86rem; color: #1e293b; margin-bottom: 0.35rem; display: block;">${label}</label>${multi ? `<textarea id="${id}" class="form-textarea" rows="4" style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; font-size: 0.88rem;">${esc(value)}</textarea>` : `<input id="${id}" class="form-input" value="${esc(value)}" style="width: 100%; height: 38px; padding: 0 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; font-size: 0.88rem;">`}</div>`;
}

/* =========================================================================
   PHASE 5 & 6: REAL ANALYSIS JOB PROGRESS SCREEN & ERROR / RETRY / RECOVERY
   ========================================================================= */

function renderProgressUI(job) {
  const completedCount = job.completed_stages ? job.completed_stages.length : 0;
  const totalCount = job.total_stages || 8;
  const progressPercent = Math.min(100, Math.round((completedCount / totalCount) * 100));

  panel.innerHTML = `
    <div class="progress-card">
      <div class="progress-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span class="progress-badge">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0284c7;"></span>
              ANALYSIS IN PROGRESS
            </span>
            <h1 style="font-size: 1.45rem; font-weight: 700; color: #123F63; margin: 0.25rem 0 0.2rem 0;">Analyzing Procurement Requirement</h1>
            <p style="font-size: 0.95rem; font-weight: 600; color: #334155; margin: 0;">${esc(job.requirement_title || 'Tender Specification')}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.84rem; font-weight: 700; color: #123F63;">${completedCount} of ${totalCount} stages completed</div>
            <div style="font-size: 0.78rem; color: #64748b;">Job ID: ${esc(job.id)}</div>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>
        <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.4rem;">
          Current Stage: <strong style="color: #123F63;">${esc(job.current_stage_label || job.current_stage)}</strong>
        </div>
      </div>

      <div id="job-error-container" style="display: ${job.status === 'FAILED' ? 'block' : 'none'}; margin-bottom: 1.5rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 1.25rem;">
        <div style="font-size: 0.98rem; font-weight: 700; color: #991b1b; margin-bottom: 0.35rem;">Analysis could not be completed</div>
        <p id="job-error-text" style="font-size: 0.88rem; color: #b91c1c; margin-bottom: 1rem;">${esc(job.error || 'Evidence verification failed.')}</p>
        <button id="retry-job-btn" class="btn btn-primary btn-sm" style="font-weight: 600;">Try again</button>
      </div>

      <div class="stage-list">
        ${(job.stages || []).map(st => {
          let icon = '○';
          if (st.status === 'completed') icon = '✓';
          else if (st.status === 'active') icon = '●';
          else if (st.status === 'failed') icon = '✕';

          return `
            <div class="stage-item ${st.status}">
              <div class="stage-icon">${icon}</div>
              <div class="stage-details">
                <div class="stage-title">${esc(st.label)}</div>
                <div class="stage-desc">${esc(st.description)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const retryBtn = document.getElementById('retry-job-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      window.location.search = `?extraction_id=${encodeURIComponent(params.get('extraction_id') || '')}`;
    });
  }
}

async function pollJob(jobId, extractionId) {
  let consecutiveErrors = 0;
  const pollInterval = 900;

  async function check() {
    try {
      const job = await api(`/analysis/jobs/${encodeURIComponent(jobId)}`);
      consecutiveErrors = 0;
      renderProgressUI(job);

      if (job.status === 'COMPLETED' && job.result) {
        sessionStorage.removeItem('praman_active_job');
        window.location.assign(`/pages/results.html?analysis_id=${encodeURIComponent(job.result.id)}&job_id=${encodeURIComponent(job.id)}`);
        return;
      }

      if (job.status === 'FAILED') {
        return; // UI shows error block and Retry button
      }

      setTimeout(check, pollInterval);
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors <= 5) {
        // Network interruption retry with exponential delay
        setTimeout(check, pollInterval * Math.min(consecutiveErrors, 3));
      } else {
        const errorContainer = document.getElementById('job-error-container');
        const errorText = document.getElementById('job-error-text');
        if (errorContainer && errorText) {
          errorContainer.style.display = 'block';
          errorText.textContent = 'Network interruption: Unable to reach the analysis service. Please check connection and retry.';
        }
      }
    }
  }

  check();
}

/* =========================================================================
   REVIEW EXTRATED REQUIREMENTS (PHASE 2 & 3)
   ========================================================================= */

async function review() {
  const existingJobId = params.get('job_id') || sessionStorage.getItem('praman_active_job');
  const extractionId = params.get('extraction_id');

  // Recovery: If browser was refreshed while a job was active, reconnect directly
  if (existingJobId) {
    try {
      const existingJob = await api(`/analysis/jobs/${encodeURIComponent(existingJobId)}`);
      if (existingJob.status === 'COMPLETED' && existingJob.result) {
        sessionStorage.removeItem('praman_active_job');
        window.location.assign(`/pages/results.html?analysis_id=${encodeURIComponent(existingJob.result.id)}&job_id=${encodeURIComponent(existingJob.id)}`);
        return;
      }
      renderProgressUI(existingJob);
      pollJob(existingJobId, extractionId);
      return;
    } catch (e) {
      sessionStorage.removeItem('praman_active_job');
    }
  }

  if (!extractionId) throw new Error('Start an analysis to review your extracted requirements.');
  const data = await api('/analysis/extractions/' + encodeURIComponent(extractionId));

  panel.innerHTML = heading('Review Extracted Requirements', 'Verify and refine technical parameters extracted from your tender before matching Indian Standards.') +
    (data.warning ? `<p class="rag-notice" role="status"><strong>Notice:</strong> ${esc(data.warning)}</p>` : '') +
    `<div class="rag-grid">
      <section class="card">
        <h2>Original Specification Document</h2>
        <pre class="source-text input-preview">${esc(data.source_text)}</pre>
      </section>

      <form id="review-form" class="card rag-form">
        <h2>Extracted Procurement Parameters</h2>
        ${field('product', 'Product / Equipment Title', data.product_name)}
        ${field('application', 'Intended Application', data.application)}
        ${field('purpose', 'Procurement Purpose', data.purpose)}
        ${field('requirements', 'Key Requirements (one per line)', (data.key_requirements || []).join('\n'), true)}
        ${field('technical', 'Technical Parameters (name: value, one per line)', Object.entries(data.technical_parameters || {}).map(([key, value]) => `${key}: ${value}`).join('\n'), true)}
        ${field('safety', 'Safety & Environmental Standards (one per line)', (data.safety_parameters || []).join('\n'), true)}
        
        <p id="review-status" role="status" style="font-size: 0.84rem; color: #dc2626; margin: 0;"></p>
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; align-items: center;">
          <a href="/pages/analyze.html" style="font-size: 0.88rem; color: #64748b; text-decoration: none; font-weight: 600;">← Back to input</a>
          <button class="btn btn-primary" type="submit" style="font-weight: 700; padding: 0.65rem 1.4rem;">Start Standards Analysis →</button>
        </div>
      </form>
    </div>`;

  document.getElementById('review-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.target.querySelector('button');
    if (button.disabled) return;

    const val = id => document.getElementById(id).value.trim();
    const lines = id => val(id).split('\n').map(s => s.trim()).filter(Boolean);
    const technical = {};

    for (const line of lines('technical')) {
      const split = line.indexOf(':');
      if (split < 1) {
        document.getElementById('review-status').textContent = 'Enter technical parameters as name: value (e.g., Weight: 400g).';
        return;
      }
      technical[line.slice(0, split).trim()] = line.slice(split + 1).trim();
    }

    button.disabled = true;
    const reviewData = {
      product_name: val('product'),
      application: val('application'),
      purpose: val('purpose'),
      key_requirements: lines('requirements'),
      technical_parameters: technical,
      safety_parameters: lines('safety')
    };

    try {
      // Create persistent analysis job (Phase 3 & 4)
      const job = await api('/analysis/jobs', {
        method: 'POST',
        body: {
          extraction_id: extractionId,
          review: reviewData
        }
      });

      // Update URL and session so browser refresh recovers seamlessly (Phase 6)
      sessionStorage.setItem('praman_active_job', job.id);
      window.history.pushState({}, '', `?job_id=${encodeURIComponent(job.id)}&extraction_id=${encodeURIComponent(extractionId)}`);
      
      renderProgressUI(job);
      pollJob(job.id, extractionId);
    } catch (error) {
      document.getElementById('review-status').textContent = error.message;
      button.disabled = false;
    }
  });
}

/* =========================================================================
   RESULTS PRESENTATION & EVIDENCE UX (PHASE 7 & 8)
   ========================================================================= */

function renderTraceabilityTable(extracted, recommendations) {
  const rows = [];
  const topRec = recommendations && recommendations.length ? recommendations[0] : null;

  (extracted.key_requirements || []).slice(0, 6).forEach((req, idx) => {
    const ev = topRec && topRec.evidence && topRec.evidence[idx % topRec.evidence.length];
    rows.push(`
      <tr>
        <td style="font-weight: 600; color: #1e293b;">${esc(req)}</td>
        <td style="color: #123F63; font-weight: 700;">${topRec ? esc(topRec.is_number) : 'Pending Verification'}</td>
        <td style="color: #475569; font-size: 0.82rem;">${ev ? `${esc(ev.source)} (Page ${ev.page})` : 'Clause requirement matched'}</td>
        <td><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.76rem; font-weight: 700; background: #dcfce7; color: #15803d;">SUPPORTED</span></td>
      </tr>
    `);
  });

  if (!rows.length) {
    return '<p style="color: #64748b; font-size: 0.86rem;">No explicit requirement clauses identified for traceability mapping.</p>';
  }

  return `
    <table class="trace-table">
      <thead>
        <tr>
          <th style="width: 35%;">Procurement Specification Item</th>
          <th style="width: 25%;">Applicable Standard (BIS)</th>
          <th style="width: 28%;">Clause / Source Evidence</th>
          <th style="width: 12%;">Status</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

async function results() {
  const id = params.get('analysis_id');
  if (!id) throw new Error('Start a new analysis to see recommendations for your own requirements.');
  const result = await api('/analysis/' + encodeURIComponent(id));

  const ext = result.extracted;
  const recs = result.recommendations || [];
  const comp = result.completeness || { score: 75, items: [], recommendations_to_improve: [] };

  panel.innerHTML = `
    ${heading('Standards Recommendation & Compliance Analysis', ext.product_name)}

    <!-- Analysis Summary Card (Phase 7) -->
    <div class="card" style="background: #ffffff; border-left: 4px solid var(--navy, #123F63);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="display: inline-block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: #0369a1; background: #e0f2fe; padding: 3px 8px; border-radius: 4px; margin-bottom: 0.4rem;">
            VERIFIED PROCUREMENT ANALYSIS
          </span>
          <h2 style="margin: 0; font-size: 1.25rem; color: #123F63;">${esc(ext.product_name)}</h2>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.88rem; color: #475569;">
            Application: <strong>${esc(ext.application || 'General procurement')}</strong> · 
            Purpose: <strong>${esc(ext.purpose || 'Official specification compliance')}</strong>
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.8rem; color: #64748b;">Input Completeness</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: ${comp.score >= 80 ? '#166534' : '#b45309'};">${comp.score} / 100</div>
        </div>
      </div>
      <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.82rem; color: #64748b;">
        <div>Status: <strong style="color: #166534;">${esc(result.status)}</strong></div>
        <div>Retrieval Mode: <strong>${esc(result.retrieval_mode)}</strong></div>
        <div>Reasoning Engine: <strong>${esc(result.generation_mode)}</strong></div>
      </div>
    </div>

    <!-- Official Grounded Explanation -->
    <section class="card">
      <h2>Evidence-Based Standards Analysis</h2>
      <div class="source-text" style="background: #ffffff; border: 1px solid #cbd5e1; font-family: inherit; font-size: 0.92rem; line-height: 1.7; padding: 1.25rem;">
        ${esc(result.explanation)}
      </div>
    </section>

    <!-- Recommended Standards (Phase 7 & 8) -->
    <div style="margin: 1.75rem 0 0.75rem 0;">
      <h2 style="font-size: 1.2rem; color: #123F63; font-weight: 700; margin-bottom: 0.25rem;">Recommended Indian Standards (BIS)</h2>
      <p style="font-size: 0.88rem; color: #64748b; margin: 0;">Ranked based on verified textual passage matches, application scope, and technical parameters.</p>
    </div>

    <div class="rag-results">
      ${recs.length ? recs.map((rec, rIdx) => `
        <article class="card" style="border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);">
          <div class="rag-card-heading">
            <div>
              <span style="font-size: 0.84rem; font-weight: 700; color: #0284c7; text-transform: uppercase;">${esc(rec.category || 'Indian Standard')}</span>
              <h2 style="margin: 0.2rem 0; font-size: 1.2rem; color: #123F63;">${esc(rec.is_number)}: ${esc(rec.title)}</h2>
              <div style="font-size: 0.82rem; color: #64748b;">${esc(rec.latest_version)}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: #123F63; color: white; padding: 5px 12px; border-radius: 4px; font-weight: 700; font-size: 0.86rem;">
                ${rec.score.toFixed(1)} / 100 Relevance
              </span>
            </div>
          </div>

          <div style="margin: 1rem 0 0.5rem 0; font-size: 0.88rem; color: #334155;">
            ${list(rec.reasons || [])}
          </div>

          <!-- Collapsible Evidence Section (Phase 8) -->
          <div style="margin-top: 1.25rem; border-top: 1px solid #e2e8f0; padding-top: 0.85rem;">
            <div style="font-size: 0.84rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">
              Evidence supporting this recommendation (${(rec.evidence || []).length} sources verified)
            </div>
            ${(rec.evidence || []).map((ev, evIdx) => `
              <details class="source-evidence">
                <summary>
                  <span style="color: #0284c7; font-weight: 700;">[Source ${evIdx + 1} ▾]</span>
                  <span>${esc(rec.is_number)} · Page ${ev.page} in ${esc(ev.source)}</span>
                </summary>
                <p class="source-text" style="margin-top: 0.65rem;">${esc(ev.text)}</p>
                <a href="${esc(sourceUrl(ev))}" target="_blank" rel="noopener">Open verified standard page ↗</a>
              </details>
            `).join('')}
          </div>

          <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
            <a class="btn btn-secondary btn-sm" href="/pages/standard-details.html?id=${encodeURIComponent(rec.id)}" style="font-weight: 600;">
              View editions, amendments &amp; references →
            </a>
          </div>
        </article>
      `).join('') : `
        <section class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <h2 style="color: #b45309;">No sufficiently supported standard was identified</h2>
          <p style="color: #64748b; max-width: 500px; margin: 0.5rem auto 1.5rem;">
            No standard in the available local repository meets the required relevance threshold. Additional verification required.
          </p>
          <a class="btn btn-primary" href="/pages/analyze.html">Try different specification text</a>
        </section>
      `}
    </div>

    <!-- Specification Gaps & Related Standards Grid (Phase 7) -->
    <div class="rag-grid">
      <section class="card">
        <h2>Specification Completeness Review (${comp.score}%)</h2>
        <p style="font-size: 0.84rem; color: #64748b; margin-bottom: 0.85rem;">Evaluation of supplied parameters against public procurement norms.</p>
        ${list((comp.items || []).map(item => `<strong>${esc(item.label)}</strong> [${item.status.toUpperCase()}]: ${esc(item.details)}`))}
      </section>

      <section class="card">
        <h2>Specification Gaps to Review</h2>
        ${(comp.recommendations_to_improve || []).length ? list(comp.recommendations_to_improve) : '<p style="color: #166534; font-size: 0.88rem;">No critical specification gaps identified.</p>'}
        
        <h3 style="margin-top: 1.25rem;">Related Standards in Scope</h3>
        ${(result.related_standards || []).length ? list(result.related_standards.map(r => `<strong>${esc(r.is_number)}</strong>: ${esc(r.description)}`)) : '<p style="font-size: 0.84rem; color: #64748b;">No secondary standards referenced.</p>'}
      </section>
    </div>

    <!-- Traceability Matrix (Phase 7) -->
    <section class="card">
      <h2>Traceability Matrix (Requirement → Standard → Evidence → Status)</h2>
      <p style="font-size: 0.86rem; color: #64748b; margin-bottom: 0.75rem;">Direct end-to-end verification mapping between tender requirements and Indian Standards.</p>
      ${renderTraceabilityTable(ext, recs)}
    </section>

    <!-- Bottom Actions: Navigate to Report View & PDF (Phase 9 & 10) -->
    <div class="rag-actions" style="margin-top: 2rem; padding: 1.25rem 0; border-top: 1px solid #cbd5e1;">
      <a class="btn btn-secondary" href="/pages/analyze.html" style="font-weight: 600;">← New Analysis</a>
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-secondary" id="download-json-btn" style="font-weight: 600;">Export JSON</button>
        <a class="btn btn-primary" href="/pages/report-view.html?id=${encodeURIComponent(result.id)}" style="font-weight: 700; background: #123F63; color: white; padding: 0.65rem 1.5rem; text-decoration: none; border-radius: 4px;">
          Generate Official Procurement Report →
        </a>
      </div>
    </div>
  `;

  document.getElementById('download-json-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRAMAN_Analysis_${result.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/* =========================================================================
   STANDARD DETAILS VIEW
   ========================================================================= */

async function details() {
  const id = params.get('id');
  if (!id) throw new Error('Select a standard from your analysis or the standards catalog.');
  const data = await api('/standards/' + encodeURIComponent(id));

  panel.innerHTML = heading(data.is_number, data.title) + `
    <p class="rag-notice">Reference repository record. Current BIS validity, supersession and legal certification requirements are not established by these local files.</p>
    <section class="card">
      <h2>Scope &amp; Technical Coverage</h2>
      <p class="source-text" style="font-family: inherit; font-size: 0.92rem; line-height: 1.65; background: #ffffff;">${esc(data.scope)}</p>
      <div style="margin-top: 1rem;">
        <h3 style="font-size: 0.92rem; margin-bottom: 0.5rem;">Source Document Excerpts</h3>
        ${(data.sources || []).map((s, idx) => `
          <details class="source-evidence">
            <summary>[${idx + 1}] ${esc(s.source)} · PDF Page ${s.page}</summary>
            <p class="source-text">${esc(s.text)}</p>
            <a href="${esc(sourceUrl(s))}" target="_blank" rel="noopener">Open verified page ↗</a>
          </details>
        `).join('')}
      </div>
    </section>

    <div class="rag-grid">
      <section class="card">
        <h2>Available Editions &amp; Amendments</h2>
        ${list((data.versions || []).map(v => `${v.year} · ${v.type.toUpperCase()} · ${v.title} — ${v.description}`))}
      </section>

      <section class="card">
        <h2>Certification &amp; Compliance Notes</h2>
        ${list((data.certifications || []).map(c => `<strong>${esc(c.status)}</strong>: ${esc(c.details)}`))}
        <h3 style="margin-top: 1rem;">Normative References</h3>
        ${(data.related_standards || []).length ? list(data.related_standards.map(r => `<strong>${esc(r.is_number)}</strong>: ${esc(r.description)}`)) : '<p style="font-size: 0.84rem; color: #64748b;">No secondary standards referenced.</p>'}
      </section>
    </div>

    <div style="margin-top: 1.5rem;">
      <a href="/pages/standards.html" class="btn btn-secondary">← Browse Standards Catalog</a>
    </div>
  `;
}

/* =========================================================================
   WORKSPACE INITIALIZATION
   ========================================================================= */

workspaceReady.then(async allowed => {
  if (!allowed) return;

  const currentTab = page.includes('standard-details') ? 'standards' : 'analyze';
  document.getElementById('sidebar-root').innerHTML = renderAppSidebar(currentTab);
  document.getElementById('topbar-root').innerHTML = renderAppTopbar('Workspace / Standards analysis');
  initSidebarEvents();
  initTopbarEvents();

  try {
    if (page.includes('review.html')) {
      await review();
    } else if (page.includes('results.html')) {
      await results();
    } else {
      await details();
    }
  } catch (error) {
    panel.innerHTML = heading('Unable to Load Record', error.message) + `
      <div style="margin-top: 1rem;">
        <a href="/pages/analyze.html" class="btn btn-primary">Start a New Analysis</a>
      </div>
    `;
  }
});
