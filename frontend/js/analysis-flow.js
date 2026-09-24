import { workspaceReady } from './utils/workspace-guard.js';
import { renderAppSidebar, renderAppTopbar, initSidebarEvents, initTopbarEvents } from './components/sidebar.js';
import { api, escapeHtml as esc, sourceUrl } from './utils/api.js';
const panel = document.getElementById('analysis-content');
const params = new URLSearchParams(window.location.search);
const page = window.location.pathname;
const list = values => `<ul>${values.map(value => `<li>${esc(value)}</li>`).join('')}</ul>`;
const source = (item, index) => `<details class="source-evidence"><summary>[${index + 1}] ${esc(item.source)} · PDF page ${item.page}</summary><p class="source-text">${esc(item.text)}</p><a href="${esc(sourceUrl(item))}" target="_blank" rel="noopener">Open source page ↗</a></details>`;
function heading(title, subtitle) { return `<h1 class="page-title">${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p>`; }
function field(id, label, value, multi = false) { return `<label class="form-label" for="${id}">${label}</label>${multi ? `<textarea id="${id}" class="form-textarea" rows="6">${esc(value)}</textarea>` : `<input id="${id}" class="form-input" value="${esc(value)}">`}`; }

async function review() {
  const id = params.get('extraction_id');
  if (!id) throw new Error('Start an analysis to review your extracted requirements.');
  const data = await api('/analysis/extractions/' + encodeURIComponent(id));
  panel.innerHTML = heading('Review extracted requirements', 'Check the extracted fields against your original input. Edit them before searching.') +
    (data.warning ? `<p class="rag-notice" role="status">${esc(data.warning)}</p>` : '') +
    `<div class="rag-grid"><section class="card"><h2>Original input</h2><pre class="source-text input-preview">${esc(data.source_text)}</pre></section>
    <form id="review-form" class="card rag-form">${field('product', 'Product', data.product_name)}${field('application', 'Application', data.application)}${field('purpose', 'Purpose', data.purpose)}
    ${field('requirements', 'Requirements (one per line)', data.key_requirements.join('\n'), true)}
    ${field('technical', 'Technical parameters (name: value, one per line)', Object.entries(data.technical_parameters).map(([key, value]) => `${key}: ${value}`).join('\n'), true)}
    ${field('safety', 'Safety requirements (one per line)', data.safety_parameters.join('\n'), true)}
    <p id="review-status" role="status"></p><button class="btn btn-primary" type="submit">Find relevant standards →</button><a href="/pages/analyze.html">Back to input</a></form></div>`;
  document.getElementById('review-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.target.querySelector('button');
    if (button.disabled) return;
    const val = id => document.getElementById(id).value.trim();
    const lines = id => val(id).split('\n').map(s => s.trim()).filter(Boolean);
    const technical = {};
    for (const line of lines('technical')) {
      const split = line.indexOf(':');
      if (split < 1) { document.getElementById('review-status').textContent = 'Enter technical parameters as name: value.'; return; }
      technical[line.slice(0, split).trim()] = line.slice(split + 1).trim();
    }
    button.disabled = true;
    const status = document.getElementById('review-status'); status.textContent = 'Searching source passages and preparing the evidence-based explanation…';
    try {
      const result = await api('/analysis/confirm?extraction_id=' + encodeURIComponent(id), { method: 'POST', body: {
        product_name: val('product'), application: val('application'), purpose: val('purpose'), key_requirements: lines('requirements'), technical_parameters: technical, safety_parameters: lines('safety') } });
      window.location.assign('/pages/results.html?analysis_id=' + encodeURIComponent(result.id));
    } catch (error) { status.textContent = error.message; button.disabled = false; }
  });
}

async function results() {
  const id = params.get('analysis_id');
  if (!id) throw new Error('Start a new analysis to see recommendations for your own requirements.');
  const result = await api('/analysis/' + encodeURIComponent(id));
  let citationIndex = 0;
  panel.innerHTML = heading('Recommended standards', result.extracted.product_name) +
    `<p class="rag-notice">${esc(result.summary_notice)}</p><p class="rag-meta">Retrieval: ${esc(result.retrieval_mode)} · Answer: ${esc(result.generation_mode)}</p>
    <section class="card"><h2>Evidence-based explanation</h2><p class="source-text">${esc(result.explanation)}</p></section>
    <div class="rag-results">${result.recommendations.length ? result.recommendations.map(rec => `<article class="card"><div class="rag-card-heading"><div><p class="rag-meta">${esc(rec.is_number)}</p><h2>${esc(rec.title)}</h2></div><span class="badge">${rec.score.toFixed(1)} / 100 relevance</span></div>
    <p>${esc(rec.latest_version)}</p>${list(rec.reasons)}${rec.evidence.map(item => source(item, citationIndex++)).join('')}
    <a class="btn btn-secondary btn-sm" href="/pages/standard-details.html?id=${encodeURIComponent(rec.id)}">View editions, amendments and references →</a></article>`).join('') : '<section class="card"><h2>No supported match</h2><p>Try a more specific product description or IS number. The local collection may not cover this requirement.</p></section>'}</div>
    <div class="rag-grid"><section class="card"><h2>Input completeness: ${result.completeness.score}%</h2><p>This measures supplied fields, not compliance.</p>${list(result.completeness.items.map(item => `${item.label}: ${item.details}`))}</section>
    <section class="card"><h2>Specification gaps to review</h2>${list(result.completeness.recommendations_to_improve)}<h3>Related standards found in source text</h3>${result.related_standards.length ? list(result.related_standards.map(item => `${item.is_number}: ${item.description}`)) : '<p>No explicit local cross-references identified.</p>'}</section></div>
    <div class="rag-actions"><a class="btn btn-secondary" href="/pages/analyze.html">New analysis</a><button class="btn btn-primary" id="download-analysis">Download evidence report</button></div>`;
  document.getElementById('download-analysis').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.id + '.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

async function details() {
  const id = params.get('id');
  if (!id) throw new Error('Select a standard from your analysis or the standards catalog.');
  const data = await api('/standards/' + encodeURIComponent(id));
  panel.innerHTML = heading(data.is_number, data.title) + `<p class="rag-notice">Local documents only. Current BIS validity, supersession and legal certification requirements are not established by these files.</p>
  <section class="card"><h2>Scope and source evidence</h2><p class="source-text">${esc(data.scope)}</p>${data.sources.map(source).join('')}</section>
  <div class="rag-grid"><section class="card"><h2>Available editions and amendments</h2>${list(data.versions.map(item => `${item.year} · ${item.type} · ${item.title} — ${item.description}`))}</section>
  <section class="card"><h2>Certification review</h2>${list(data.certifications.map(item => `${item.status}: ${item.details}`))}<h3>Document references</h3>${data.related_standards.length ? list(data.related_standards.map(item => `${item.is_number}: ${item.description}`)) : '<p>No explicit local cross-references identified.</p>'}</section></div><a href="/pages/standards.html" class="btn btn-secondary">Browse standards</a>`;
}

workspaceReady.then(async allowed => {
  if (!allowed) return;
  document.getElementById('sidebar-root').innerHTML = renderAppSidebar(page.includes('standard-details') ? 'standards' : 'analyze');
  document.getElementById('topbar-root').innerHTML = renderAppTopbar('Workspace / Standards analysis');
  initSidebarEvents(); initTopbarEvents();
  try { if (page.includes('review.html')) await review(); else if (page.includes('results.html')) await results(); else await details(); }
  catch (error) { panel.innerHTML = heading('Unable to load this record', error.message) + '<a href="/pages/analyze.html" class="btn btn-primary">Start an analysis</a>'; }
});
