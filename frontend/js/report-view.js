import {workspaceReady} from './utils/workspace-guard.js';
import {renderAppSidebar,renderAppTopbar,initSidebarEvents,initTopbarEvents} from './components/sidebar.js';
import {api,API_BASE,escapeHtml as esc} from './utils/api.js';
import {Storage} from './utils/storage.js';
import {traceRows,traceTable,requirementFacts,relatedGroups,versionTable,list,dateLabel} from './analysis-results.js';

workspaceReady.then(async allowed=>{
  if(!allowed)return;
  document.getElementById('sidebar-root').innerHTML=renderAppSidebar('reports');
  document.getElementById('topbar-root').innerHTML=renderAppTopbar('Workspace / Procurement report');
  initSidebarEvents();initTopbarEvents();
  const panel=document.getElementById('analysis-content');
  const params=new URLSearchParams(location.search);
  try {
    const analysisId=params.get('analysis_id'), reportId=params.get('id');
    if(!analysisId&&!reportId)throw new Error('Open a completed analysis and select Generate Report.');
    panel.innerHTML='<div class="progress-card" role="status"><span class="eyebrow">REPORT PREPARATION</span><h1>Preparing Procurement Standards Review Report</h1><p>Collecting the saved analysis, recommendations, evidence and review findings…</p></div>';
    const report=analysisId ? await api('/reports',{method:'POST',body:{analysis_id:analysisId}}) : await api('/reports/'+encodeURIComponent(reportId));
    history.replaceState({},'', '?id='+encodeURIComponent(report.id));
    const a=report.analysis,ext=a.extracted,rows=traceRows(a),recs=a.recommendations;
    const evidence=recs.flatMap(r=>r.evidence.map(e=>({...e,is_number:r.is_number})));
    panel.innerHTML=`<div class="report-toolbar"><div><span class="completion-label">✓ Report ready</span><h1>Procurement Standards Review Report</h1></div><div class="report-controls"><a class="btn btn-secondary" href="/pages/results.html?analysis_id=${encodeURIComponent(a.id)}">Back to analysis</a><button id="download-report" class="btn btn-primary">Download PDF</button><button id="print-report" class="btn btn-secondary">Print Report</button></div><p id="report-status" role="status">Prepared from the completed analysis. Review before sign-off.</p></div>
    <article class="report-document">
      <header class="report-letterhead"><img src="/assets/brand/praman-logo.svg" alt="PRAMAN" width="180"><span>PROCUREMENT STANDARDS<br>DECISION SUPPORT</span></header>
      <div class="report-title"><p>PROCUREMENT REVIEW</p><h1>Procurement Standards<br>Review Report</h1><p>${esc(ext.product_name)}</p></div>
      <dl class="report-meta"><div><dt>Report ID</dt><dd>${esc(report.id)}</dd></div><div><dt>Generated</dt><dd>${esc(report.created_at)}</dd></div><div><dt>Analysis ID</dt><dd>${esc(a.id)}</dd></div><div><dt>Procurement officer</dt><dd>${esc(report.officer_name)}</dd></div><div><dt>Source</dt><dd>${esc(a.source_name || ext.source_name)}</dd></div><div><dt>Analyzed</dt><dd>${esc(dateLabel(a.analyzed_at || ext.extracted_at))}</dd></div></dl>
      <section><h2>1. Analysis summary</h2><p>${ext.key_requirements.length} requirements · ${recs.length} candidate standards · ${recs.filter(r=>r.evidence.length).length} recommendations with source evidence · ${rows.filter(r=>r.status!=='Supported').length} requirements to review.</p><p>${esc(a.summary_notice)}</p></section>
      <section><h2>2. Extracted procurement requirements</h2>${requirementFacts(ext)}<p><b>Category:</b> ${esc(a.category || ext.category || 'Not detected')}</p>${list(ext.key_requirements)}</section>
      <section><h2>3. Recommended Indian Standards</h2>${recs.length?recs.map(r=>`<div class="report-recommendation"><h3>${esc(r.is_number)} · ${esc(r.title)}</h3><p><b>Relevance:</b> ${esc(r.relevance.replaceAll('-',' '))} · ${esc(r.status)}</p>${list(r.reasons)}</div>`).join(''):'<p>No sufficiently relevant standard was identified in the available knowledge base.</p>'}</section>
      <section><h2>4. Requirement → Standard Traceability</h2>${rows.length?traceTable(rows):'<p>No mapped requirements.</p>'}</section>
      <section><h2>5. Related standards</h2>${relatedGroups(a.related_standards)}</section>
      <section><h2>6. Version &amp; amendment review</h2>${versionTable(a.version_findings || [])}</section>
      <section><h2>7. Specification gaps &amp; review flags</h2><h3>Specification gaps</h3>${list(a.gaps?.length?a.gaps:a.completeness.recommendations_to_improve)}<h3>Review flags</h3>${list(a.review_flags || [])}${a.applicability?.length?'<h3>Referenced standard applicability</h3>'+list(a.applicability.map(f=>f.referenced_standard+': '+f.overall)):''}</section>
      <section><h2>8. Source evidence</h2><p>Full retrieved passages are reproduced below. Page references refer to source documents, not this report.</p>${evidence.length?evidence.map((e,i)=>`<div class="report-evidence"><h3>Evidence ${i+1} · ${esc(e.is_number)}</h3><p class="evidence-reference">${esc(e.source)} · page ${Number(e.page)} · ${esc(e.citation_id)}</p><p class="report-excerpt">${esc(e.text)}</p></div>`).join(''):'<p>No source passages were retrieved.</p>'}</section>
      <section class="report-signoff"><h2>9. Review and sign-off</h2><div><p>Prepared for: <b>${esc(report.officer_name)}</b></p><p>Reviewed by: __________________________</p><p>Signature: ____________________________</p><p>Date: _________________________________</p></div><p class="report-disclaimer">PRAMAN provides decision support. This report does not certify compliance or establish current legal validity. Verify standards, amendments and applicability against authoritative BIS records before final procurement approval.</p></section>
      <footer class="report-end">PRAMAN · ${esc(report.id)} · End of report</footer>
    </article>`;
    document.getElementById('print-report').onclick=()=>window.print();
    document.getElementById('download-report').onclick=async event=>{
      const button=event.currentTarget,status=document.getElementById('report-status');button.disabled=true;button.textContent='Preparing PDF…';
      try{
        const response=await fetch(API_BASE+'/reports/'+encodeURIComponent(report.id)+'/download',{headers:{Authorization:'Bearer '+Storage.getToken()}});
        if(!response.ok)throw new Error(response.status===401?'Your session expired. Sign in again to download the report.':'The PDF could not be generated. Please try again.');
        const blob=await response.blob();if(!blob.type.includes('pdf'))throw new Error('The server did not return a PDF. Please try again.');
        const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='PRAMAN_'+report.id+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='PDF downloaded.';
      }catch(error){status.textContent=error.message;}finally{button.disabled=false;button.textContent='Download PDF';}
    };
  }catch(error){panel.innerHTML=`<div class="card"><h1>Report unavailable</h1><p role="alert">${esc(error.message)}</p><a class="btn btn-primary" href="/pages/history.html">Open analysis history</a></div>`;}
});
