from pathlib import Path

path = Path('frontend/js/analysis-results.js')
text = path.read_text(encoding='utf-8')
text = text.replace("import {Storage} from './utils/storage.js';", "import {Storage} from './utils/storage.js';\nimport {briefFacts, briefActions, sourceReferences} from './report-summary.js';")
start = text.index('export async function renderResults(panel, id)')
end = text.index("  panel.querySelectorAll('[data-save]')", start)
text = text[:start] + '''export function renderResultsMarkup(result) {
  const id=result.id, ext=result.extracted, recs=result.recommendations || [], rows=traceRows(result), brief=result.brief;
  return `
    <header class="analysis-heading concise-heading"><span class="eyebrow">PROCUREMENT REVIEW</span><h1>Procurement Standards Analysis</h1><p class="requirement-title">${esc(ext.product_name)}</p><p class="muted">${esc(result.source_name || ext.source_name)} · ${esc(dateLabel(result.analyzed_at || ext.extracted_at))}</p></header>
    <div class="result-actions"><a class="btn btn-primary" href="/pages/report-view.html?analysis_id=${encodeURIComponent(id)}">Generate Report</a><button class="btn btn-secondary" id="ask-praman">Ask PRAMAN</button><a class="btn btn-secondary" href="/pages/analyze.html">New Analysis</a></div>
    <section class="card"><div class="section-heading"><h2>Requirement summary</h2><a href="/pages/review.html?extraction_id=${encodeURIComponent(ext.id)}">Edit requirements</a></div>${Object.keys(brief.facts).length ? briefFacts(brief.facts) : '<p>Review the product details in the original input.</p>'}</section>
    <section class="recommendations-section"><div class="section-heading"><h2>Recommended standards</h2><span class="muted">${recs.length} candidate${recs.length===1?'':'s'}</span></div>
    ${recs.length ? recs.map((rec,index)=>`<article class="standard-card concise-standard"><h3>${esc(rec.is_number)}</h3><p class="standard-title">${esc(rec.title)}</p><p class="helper">Source: ${esc(sourceReferences(rec))}</p><footer><div><button class="btn btn-secondary btn-sm" data-evidence="${index}">View evidence</button><a class="btn btn-secondary btn-sm" href="/pages/standard-details.html?id=${encodeURIComponent(rec.id)}">Standard details</a><button class="btn btn-secondary btn-sm" data-save="${esc(rec.id)}">${Storage.isStandardSaved(rec.id)?'Saved':'Save'}</button></div></footer></article>`).join('') : '<div class="card"><p>No suitable standard was found in the available documents.</p></div>'}</section>
    <section class="card approval-actions"><h2>Before approval</h2>${briefActions(brief.actions)}<p class="decision-notice">${esc(brief.notice)}</p></section>
    <details class="card supporting-details"><summary class="section-summary">Supporting details <span>Requirements, sources and analysis record</span></summary>
      <details class="secondary-details"><summary>Full requirements and original input</summary>${requirementFacts(ext)}${list(ext.key_requirements)}<pre class="source-text input-preview">${esc(ext.source_text)}</pre>${ext.warning ? `<p class="helper">${esc(ext.warning)}</p>`:''}<form id="category-form" class="category-row"><label for="detected-category">Category</label><input id="detected-category" class="form-input" maxlength="160" value="${esc(result.category || ext.category)}"><button class="btn btn-secondary btn-sm" type="submit">Save category</button><span id="category-status" role="status"></span></form></details>
      <details class="secondary-details"><summary>Requirement-to-source checks</summary>${rows.length?traceTable(rows):'<p>No explicit requirements were extracted.</p>'}</details>
      <details class="secondary-details"><summary>Versions and related standards</summary>${versionTable(result.version_findings || [])}${relatedGroups(result.related_standards || [])}${result.applicability?.length?list(result.applicability.map(a=>a.referenced_standard+': '+a.overall)):''}</details>
      <details class="secondary-details"><summary>All review findings</summary>${list(result.gaps || [])}${list(result.review_flags || [])}</details>
      <p class="helper">Analysis ${esc(id)}</p><button class="btn btn-secondary btn-sm" id="export-analysis">Export full analysis JSON</button>
    </details>`;
}

export async function renderResults(panel, id) {
  const result = await api('/analysis/' + encodeURIComponent(id));
  const recs=result.recommendations || [];
  panel.innerHTML = renderResultsMarkup(result);
''' + text[end:]
path.write_text(text, encoding='utf-8')


path = Path('frontend/js/report-view.js')
text = path.read_text(encoding='utf-8')
text = text.replace("import {traceRows,traceTable,requirementFacts,relatedGroups,versionTable,list,dateLabel} from './analysis-results.js';", "import {reportDocument} from './report-summary.js';")
start = text.index('    const a=report.analysis')
end = text.index("    document.getElementById('print-report')", start)
text = text[:start] + '''    const a=report.analysis;
    panel.innerHTML=`<div class="report-toolbar"><h1>Procurement Standards Report</h1><div class="report-controls"><a class="btn btn-secondary" href="/pages/results.html?analysis_id=${encodeURIComponent(a.id)}">Back to analysis</a><button id="download-report" class="btn btn-primary">Download PDF</button><button id="print-report" class="btn btn-secondary">Print</button></div><p id="report-status" role="status">A concise summary for procurement review.</p></div>${reportDocument(report)}`;
''' + text[end:]
path.write_text(text, encoding='utf-8')
