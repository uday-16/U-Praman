import {workspaceReady} from './utils/workspace-guard.js';
import {renderAppSidebar,renderAppTopbar,initSidebarEvents,initTopbarEvents} from './components/sidebar.js';
import {api,API_BASE,escapeHtml as esc} from './utils/api.js';
import {Storage} from './utils/storage.js';
import {reportDocument} from './report-summary.js';

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
    const a=report.analysis;
    panel.innerHTML=`<div class="report-toolbar"><h1>Procurement Standards Report</h1><div class="report-controls"><a class="btn btn-secondary" href="/pages/results.html?analysis_id=${encodeURIComponent(a.id)}">Back to analysis</a><button id="download-report" class="btn btn-primary">Download PDF</button><button id="print-report" class="btn btn-secondary">Print</button></div><p id="report-status" role="status">A concise summary for procurement review.</p></div>${reportDocument(report)}`;
    const handleDownload = async (btn) => {
      const status = document.getElementById('report-status');
      if (btn) { btn.disabled = true; btn.textContent = 'Preparing PDF…'; }
      try {
        const response = await fetch(API_BASE + '/reports/' + encodeURIComponent(report.id) + '/download', {
          headers: { Authorization: 'Bearer ' + Storage.getToken() }
        });
        if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Sign in again to download the report.' : 'The PDF could not be generated. Please try again.');
        const blob = await response.blob();
        if (!blob.type.includes('pdf')) throw new Error('The server did not return a PDF. Please try again.');
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'PRAMAN_' + report.id + '.pdf'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        if (status) status.textContent = 'PDF downloaded successfully.';
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Download PDF'; }
      }
    };

    document.getElementById('print-report').onclick = () => window.print();
    document.getElementById('download-report').onclick = (e) => handleDownload(e.currentTarget);
    const innerDownloadBtn = document.getElementById('download-report-btn');
    if (innerDownloadBtn) {
      innerDownloadBtn.onclick = (e) => handleDownload(e.currentTarget);
    }
  }catch(error){panel.innerHTML=`<div class="card"><h1>Report unavailable</h1><p role="alert">${esc(error.message)}</p><a class="btn btn-primary" href="/pages/history.html">Open analysis history</a></div>`;}
});
