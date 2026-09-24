import { workspaceReady } from './utils/workspace-guard.js';
import { renderAppSidebar, renderAppTopbar, initSidebarEvents, initTopbarEvents } from './components/sidebar.js';
import { setupFileUpload } from './components/file-upload.js';
import { showToast } from './components/toast.js';
import { api } from './utils/api.js';
workspaceReady.then(allowed => {
  if (!allowed) return;
  document.getElementById('sidebar-root').innerHTML = renderAppSidebar('analyze');
  document.getElementById('topbar-root').innerHTML = renderAppTopbar('Workspace / Analyze requirement');
  initSidebarEvents(); initTopbarEvents();
  const uploader = setupFileUpload('dropzone', 'file-input', 'file-card-wrapper');
  let mode = 'describe';
  for (const tab of ['describe', 'spec', 'upload']) {
    document.getElementById(`tab-${tab}`).addEventListener('click', () => {
      mode = tab;
      for (const other of ['describe', 'spec', 'upload']) {
        document.getElementById(`section-${other}`).style.display = tab === other ? 'block' : 'none';
        document.getElementById(`tab-${other}`).className = `btn btn-${tab === other ? 'primary' : 'secondary'} btn-sm`;
      }
    });
  }
  const button = document.getElementById('start-analysis-btn');
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    let body, path;
    if (mode === 'upload') {
      const file = uploader.getFile();
      if (!file) { showToast('Select a tender document first.', 'warning'); return; }
      body = new FormData(); body.append('file', file); path = '/analysis/upload';
    } else {
      const text = document.getElementById(mode === 'describe' ? 'desc-prompt' : 'req-text-input').value.trim();
      if (text.length < 10) { showToast('Describe your requirements in at least 10 characters.', 'warning'); return; }
      body = { text, product_name: mode === 'spec' ? document.getElementById('req-title-input').value.trim() : null };
      path = '/analysis/extract';
    }
    button.disabled = true; button.textContent = 'Extracting requirements…';
    try {
      const result = await api(path, { method: 'POST', body });
      window.location.assign('/pages/review.html?extraction_id=' + encodeURIComponent(result.id));
    } catch (error) { showToast(error.message || 'Could not reach the analysis service.', 'error'); }
    finally { button.disabled = false; button.textContent = 'Extract and review requirements →'; }
  });
});
