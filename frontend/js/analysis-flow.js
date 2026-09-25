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
  const progressPercent = Math.min(100, Math.max(0, Number.isFinite(job.progress_percent) ? job.progress_percent : Math.round((completedCount / totalCount) * 100)));
  const sourceLabel = job.filename
    ? `Document · ${job.filename}`
    : job.input_type === 'review'
      ? 'Reviewed extracted requirement'
      : 'Entered requirement';
  const statusLabel = job.status === 'FAILED' ? 'Analysis interrupted' : job.status === 'QUEUED' ? 'Preparing analysis' : 'Analysis in progress';

  panel.innerHTML = `
    <div class="progress-card">
      <div class="progress-header">
        <div class="progress-heading">
          <div>
            <span class="progress-badge ${job.status === 'FAILED' ? 'is-failed' : ''}" role="status" aria-live="polite">
              <span class="progress-badge-dot" aria-hidden="true"></span>${esc(statusLabel)}
            </span>
            <h1>Analyzing procurement requirement</h1>
            <p class="progress-subtitle">${esc(job.requirement_title || 'Tender specification')}</p>
          </div>
          <div class="progress-count">
            <strong>${completedCount} <span>/ ${totalCount}</span></strong>
            <small>stages completed</small>
          </div>
        </div>

        <div class="progress-meter" role="progressbar" aria-label="Analysis progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}">
          <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${progressPercent}%;"></div></div>
          <span>${progressPercent}%</span>
        </div>
        <div class="current-stage" aria-live="polite">
          <span class="current-stage-kicker">Current stage</span>
          <strong>${esc(job.current_stage_label || job.current_stage)}</strong>
        </div>
      </div>

      <div class="progress-body">
        <aside class="analysis-context" aria-label="Analysis input">
          <span class="context-kicker">Input being analyzed</span>
          <h2>${esc(job.requirement_title || 'Tender specification')}</h2>
          <dl>
            <div><dt>Source</dt><dd>${esc(sourceLabel)}</dd></div>
            <div><dt>Knowledge base</dt><dd>BIS standards index</dd></div>
            <div><dt>Job ID</dt><dd>${esc(job.id)}</dd></div>
          </dl>
          <p class="context-note">PRAMAN is checking each stage against the available source records. This view updates as the job progresses.</p>
        </aside>

        <div class="progress-stages">
          <div class="stage-heading"><h2>Processing stages</h2><span>Live status</span></div>
          <div class="stage-list">
            ${(job.stages || []).map((st, index) => {
              const icon = st.status === 'completed' ? '✓' : st.status === 'active' ? '●' : st.status === 'failed' ? '×' : String(index + 1).padStart(2, '0');
              const state = {completed:'Complete', active:'Processing', pending:'Waiting', failed:'Failed'}[st.status] || 'Waiting';
              return `<div class="stage-item ${st.status}">
                <div class="stage-icon" aria-hidden="true">${icon}</div>
                <div class="stage-details"><div class="stage-title">${esc(st.label)} <small class="stage-state">${state}</small></div><div class="stage-desc">${esc(st.description)}</div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div id="job-error-container" class="job-error" style="display: ${job.status === 'FAILED' ? 'block' : 'none'};">
        <div class="job-error-title">Analysis could not be completed</div>
        <p id="job-error-text">${esc(job.error || 'The analysis could not be completed at this stage.')}</p>
        <button id="retry-job-btn" class="btn btn-primary btn-sm">Try again</button>
      </div>

      <p class="progress-footnote">Job created ${esc(job.created_at ? new Date(job.created_at).toLocaleString() : 'recently')} · You can leave this page and return from History.</p>
    </div>
  `;

  const retryBtn = document.getElementById('retry-job-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      sessionStorage.removeItem('praman_active_job');
      window.location.assign('/pages/analyze.html');
    });
  }
}

async function pollJob(jobId, extractionId) {
  let consecutiveErrors = 0;
  // Keep the progress view responsive without adding artificial waiting between real job updates.
  const pollInterval = 350;

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
        sessionStorage.removeItem('praman_active_job');
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
  const existingJobId = params.get('job_id') || (!params.get('extraction_id') && sessionStorage.getItem('praman_active_job'));
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
        ${field('category', 'Detected category (editable)', data.category || '')}
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
      category: val('category'),
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

async function results() {
  const id = params.get('analysis_id') || params.get('id');
  if (!id) throw new Error('Start a new analysis to see recommendations for your requirement.');
  const {renderResults} = await import('./analysis-results.js');
  await renderResults(panel, id);
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
