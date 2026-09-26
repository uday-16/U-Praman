import {api, escapeHtml as esc, sourceUrl} from './utils/api.js';
import {Storage} from './utils/storage.js';
import {briefFacts, recommendationSections} from './report-summary.js';

export const shortText = (text, limit=280) => { const value = String(text || '').replace(/\s+/g,' ').trim(); return value.length > limit ? value.slice(0,limit).replace(/\s+\S*$/, '') + '…' : value; };
export const dateLabel = value => value ? new Date(value).toLocaleString(undefined, {dateStyle:'medium',timeStyle:'short'}) : 'Not recorded';
export const list = values => values.length ? `<ul class="finding-list">${values.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>` : '<p class="muted">Not recorded in this analysis.</p>';
export const badge = status => `<span class="status-label ${status === 'Supported' ? 'supported' : status === 'Not Found' ? 'unavailable' : 'review'}">${esc(status)}</span>`;
export function traceRows(result) {
  return result.traceability?.length ? result.traceability : (result.extracted.key_requirements || []).map(requirement=>({requirement,status:'Review Required',note:'This historical analysis has no verified requirement-to-source mapping.'}));
}
export function traceTable(rows) {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Requirement traceability"><table class="trace-table"><thead><tr><th>Requirement</th><th>Standard</th><th>Evidence</th><th>Status</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.requirement)}</td><td>${esc(row.is_number || 'Not mapped')}</td><td>${row.source ? `${esc(row.source)} · p. ${Number(row.page)}<small>${esc(shortText(row.excerpt,160))}</small>` : esc(row.note || 'No mapped source passage')}</td><td>${badge(row.status)}</td></tr>`).join('')}</tbody></table></div>`;
}
export function requirementFacts(ext) {
  const facts = [['Product',ext.product_name],['Intended use',ext.application],['Purpose',ext.purpose],['Quantity',ext.quantity],...Object.entries(ext.technical_parameters || {}),['Safety',ext.safety_parameters?.join('; ')]];
  return `<dl class="requirement-facts">${facts.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value || 'Not specified')}</dd></div>`).join('')}</dl>`;
}
export function relatedGroups(items) {
  const groups = [['normative-reference','Normative references'],['testing','Test methods'],['safety','Safety standards'],['installation','Installation standards'],['related','Supporting / referenced standards']];
  return items.length ? groups.filter(([key])=>items.some(i=>i.relationship===key)).map(([key,label])=>`<div class="related-group"><h3>${label}</h3>${items.filter(i=>i.relationship===key).map(i=>`<p><a href="/pages/standard-details.html?id=${encodeURIComponent(i.id)}">${esc(i.is_number)}</a> · ${esc(i.title)}<small>${esc(i.description)}</small></p>`).join('')}</div>`).join('') : '<p class="muted">No explicit relationships were identified in the available source records.</p>';
}
export function versionTable(items) {
  return items.length ? `<div class="table-scroll"><table class="trace-table"><thead><tr><th>Indexed version</th><th>Earlier local editions</th><th>Amendment files</th><th>Verification</th></tr></thead><tbody>${items.map(v=>`<tr><td><b>${esc(v.indexed_version)}</b><small>${esc(v.source)}</small></td><td>${esc(v.previous_versions.join('; ') || 'Not found in available records')}</td><td>${esc(v.amendments.join('; ') || 'Not found in available records')}</td><td>${esc(v.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Not verified in the available knowledge base. Open the standard record to review indexed editions.</p>';
}

function openDrawer(title, html) {
  const prior = document.activeElement;
  const dialog = document.createElement('dialog'); dialog.className = 'analysis-drawer';
  dialog.innerHTML = `<header><div><span class="eyebrow">PRAMAN · ANALYSIS CONTEXT</span><h2>${esc(title)}</h2></div><button class="btn btn-secondary btn-sm" aria-label="Close panel">Close ×</button></header><div class="drawer-content">${html}</div>`;
  document.body.append(dialog);
  dialog.querySelector('header button').onclick = ()=>dialog.close();
  dialog.addEventListener('click', event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{dialog.remove(); prior?.focus();});
  dialog.showModal(); return dialog;
}

export function renderResultsMarkup(result) {
  const id=result.id, ext=result.extracted, recs=result.recommendations || [], rows=traceRows(result), brief=result.brief;
  return `
    <header class="analysis-heading concise-heading"><span class="eyebrow">PROCUREMENT STANDARDS ANALYSIS</span><h1>Procurement Standards Analysis</h1><p class="requirement-title">${esc(ext.product_name)}</p><p class="muted">${esc(result.source_name || ext.source_name)} · ${esc(dateLabel(result.analyzed_at || ext.extracted_at))}</p></header>
    <div class="result-actions"><a class="btn btn-primary" href="/pages/report-view.html?analysis_id=${encodeURIComponent(id)}">📄 Generate Report</a><button class="btn btn-secondary" id="ask-praman">💬 Ask PRAMAN</button><a class="btn btn-secondary" href="/pages/analyze.html">➕ New Analysis</a></div>
    <details class="secondary-details"><summary>Tender Specification Summary</summary>${briefFacts(brief.facts)}<a href="/pages/review.html?extraction_id=${encodeURIComponent(ext.id)}">Edit requirements</a></details>
    <div class="recommendation-grid">${recommendationSections(brief, true, index=>{const rec=recs[index]; return rec ? `<div class="result-actions"><a class="btn btn-secondary btn-sm" href="/pages/standard-details.html?id=${encodeURIComponent(rec.id)}">Standard details</a><button class="btn btn-secondary btn-sm" data-save="${esc(rec.id)}">${Storage.isStandardSaved(rec.id)?'Saved':'Save'}</button></div>` : '';}, { id })}</div>
    <p class="decision-notice">${esc(brief.notice)}</p>
    <details class="card supporting-details"><summary class="section-summary">Supporting details <span>Full requirements, raw inputs and audit data</span></summary>
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
  panel.querySelectorAll('[data-save]').forEach(button=>button.onclick=()=>{button.textContent=Storage.toggleSaveStandard(button.dataset.save)?'Saved':'Save';});
  panel.querySelectorAll('[data-evidence]').forEach(button=>button.onclick=()=>{
    const rec=recs[Number(button.dataset.evidence)];
    openDrawer('Evidence · '+rec.is_number, `<p class="helper">Passages retrieved from indexed documents. Page numbers refer to physical document pages.</p>${rec.evidence.map((ev,i)=>`<article class="evidence-item"><h3>Source ${i+1} · ${esc(ev.source)}</h3><dl class="evidence-meta"><div><dt>Page</dt><dd>${Number(ev.page)}</dd></div><div><dt>Section / chunk</dt><dd>${esc(ev.section || ev.citation_id)}</dd></div></dl><blockquote>${esc(shortText(ev.text,360))}</blockquote><a href="${esc(sourceUrl(ev))}" target="_blank" rel="noopener">Open source ↗</a><details><summary>View full evidence</summary><p class="source-text">${esc(ev.text)}</p><small>${esc(ev.citation_id)}</small></details></article>`).join('') || '<p>No source evidence is available.</p>'}`);
  });
  panel.querySelector('#category-form').onsubmit=async event=>{
    event.preventDefault(); const button=event.currentTarget.querySelector('button'), status=panel.querySelector('#category-status'); button.disabled=true;
    try {await api('/analysis/'+encodeURIComponent(id)+'/category',{method:'PATCH',body:{category:panel.querySelector('#detected-category').value.trim()}});status.textContent='Category saved.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  };
  panel.querySelector('#ask-praman').onclick=()=>{
    const dialog=openDrawer('Ask PRAMAN', `<p>Ask about the requirement, recommendations and evidence in this analysis.</p><form id="context-question"><label for="analysis-question">Your question</label><textarea id="analysis-question" class="form-textarea" rows="3" maxlength="2000" required placeholder="Which evidence supports this recommendation?"></textarea><button class="btn btn-primary" type="submit">Ask PRAMAN</button></form><div class="context-answer" role="status"></div>`);
    dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=dialog.querySelector('form button'),answer=dialog.querySelector('.context-answer');button.disabled=true;answer.textContent='Checking the sources in this analysis…';try{const data=await api('/analysis/'+encodeURIComponent(id)+'/ask',{method:'POST',body:{question:dialog.querySelector('textarea').value}});answer.textContent=data.answer;}catch(error){answer.textContent=error.message;}finally{button.disabled=false;}};
  };
  panel.querySelector('#export-analysis').onclick=async()=>{const current=await api('/analysis/'+encodeURIComponent(id));const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='PRAMAN_'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
