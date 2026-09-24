import { workspaceReady } from './utils/workspace-guard.js';
import { renderAppSidebar, renderAppTopbar, initSidebarEvents, initTopbarEvents } from './components/sidebar.js';
import { setupFileUpload } from './components/file-upload.js';
import { showToast } from './components/toast.js';
import { api } from './utils/api.js';

workspaceReady.then(allowed => {
  if (!allowed) return;

  document.getElementById('sidebar-root').innerHTML = renderAppSidebar('analyze');
  document.getElementById('topbar-root').innerHTML = renderAppTopbar('Workspace / Analyze requirement');
  initSidebarEvents();
  initTopbarEvents();

  const uploader = setupFileUpload('dropzone', 'file-input', 'file-card-wrapper');

  const tabDescribe = document.getElementById('tab-describe');
  const tabSpec = document.getElementById('tab-spec');
  const tabUpload = document.getElementById('tab-upload');

  const secDescribe = document.getElementById('section-describe');
  const secSpec = document.getElementById('section-spec');
  const secUpload = document.getElementById('section-upload');

  let currentMode = 'describe';

  function setActiveTab(activeBtn, activeSec, mode) {
    [tabDescribe, tabSpec, tabUpload].forEach(b => { if (b) b.className = 'btn btn-secondary btn-sm'; });
    [secDescribe, secSpec, secUpload].forEach(s => { if (s) s.style.display = 'none'; });
    if (activeBtn) activeBtn.className = 'btn btn-primary btn-sm';
    if (activeSec) activeSec.style.display = 'block';
    currentMode = mode;
    clearFieldErrors();
  }

  if (tabDescribe) tabDescribe.addEventListener('click', () => setActiveTab(tabDescribe, secDescribe, 'describe'));
  if (tabSpec) tabSpec.addEventListener('click', () => setActiveTab(tabSpec, secSpec, 'spec'));
  if (tabUpload) tabUpload.addEventListener('click', () => setActiveTab(tabUpload, secUpload, 'upload'));

  const catSelect = document.getElementById('req-category-select');
  const customCatInput = document.getElementById('req-custom-category-input');
  if (catSelect && customCatInput) {
    catSelect.addEventListener('change', () => {
      if (catSelect.value === 'Other / Custom') {
        customCatInput.style.display = 'block';
        customCatInput.focus();
      } else {
        customCatInput.style.display = 'none';
      }
    });
  }

  function markFieldError(el) {
    if (!el) return;
    el.style.borderColor = '#DC2626';
    el.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.15)';
    el.focus();
    const onInput = () => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
      el.removeEventListener('input', onInput);
      el.removeEventListener('change', onInput);
    };
    el.addEventListener('input', onInput);
    el.addEventListener('change', onInput);
  }

  function clearFieldErrors() {
    ['desc-prompt', 'req-title-input', 'req-text-input', 'dropzone'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }
    });
  }

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  async function runStepAnimation() {
    const modal = document.getElementById('loading-modal');
    if (!modal) return;
    modal.classList.add('active');

    const ls1 = document.getElementById('ls-1');
    const ls2 = document.getElementById('ls-2');
    const ls3 = document.getElementById('ls-3');
    const ls4 = document.getElementById('ls-4');
    const ls5 = document.getElementById('ls-5');

    if (ls1) { ls1.innerHTML = '● Understanding requirement'; ls1.style.color = 'var(--primary-blue, #123F63)'; ls1.style.fontWeight = '700'; }
    if (ls2) { ls2.innerHTML = '○ Identifying technical parameters'; ls2.style.color = 'var(--text-muted, #94A3B8)'; ls2.style.fontWeight = '600'; }
    if (ls3) { ls3.innerHTML = '○ Searching standards'; ls3.style.color = 'var(--text-muted, #94A3B8)'; ls3.style.fontWeight = '600'; }
    if (ls4) { ls4.innerHTML = '○ Checking relationships'; ls4.style.color = 'var(--text-muted, #94A3B8)'; ls4.style.fontWeight = '600'; }
    if (ls5) { ls5.innerHTML = '○ Preparing recommendations'; ls5.style.color = 'var(--text-muted, #94A3B8)'; ls5.style.fontWeight = '600'; }

    // Step 1 -> Step 2
    await sleep(400);
    if (ls1) { ls1.innerHTML = '✓ Understanding requirement'; ls1.style.color = 'var(--indian-green, #138808)'; }
    if (ls2) { ls2.innerHTML = '● Identifying technical parameters'; ls2.style.color = 'var(--primary-blue, #123F63)'; ls2.style.fontWeight = '700'; }

    // Step 2 -> Step 3
    await sleep(500);
    if (ls2) { ls2.innerHTML = '✓ Identifying technical parameters'; ls2.style.color = 'var(--indian-green, #138808)'; }
    if (ls3) { ls3.innerHTML = '● Searching standards'; ls3.style.color = 'var(--primary-blue, #123F63)'; ls3.style.fontWeight = '700'; }

    // Step 3 -> Step 4
    await sleep(500);
    if (ls3) { ls3.innerHTML = '✓ Searching standards'; ls3.style.color = 'var(--indian-green, #138808)'; }
    if (ls4) { ls4.innerHTML = '● Checking relationships'; ls4.style.color = 'var(--primary-blue, #123F63)'; ls4.style.fontWeight = '700'; }

    // Step 4 -> Step 5
    await sleep(500);
    if (ls4) { ls4.innerHTML = '✓ Checking relationships'; ls4.style.color = 'var(--indian-green, #138808)'; }
    if (ls5) { ls5.innerHTML = '● Preparing recommendations'; ls5.style.color = 'var(--primary-blue, #123F63)'; ls5.style.fontWeight = '700'; }

    // Step 5 Complete
    await sleep(400);
    if (ls5) { ls5.innerHTML = '✓ Preparing recommendations'; ls5.style.color = 'var(--indian-green, #138808)'; }
    await sleep(300);
  }

  const button = document.getElementById('start-analysis-btn');
  if (!button) return;

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    clearFieldErrors();

    let body, path;

    if (currentMode === 'describe') {
      const descEl = document.getElementById('desc-prompt');
      const text = descEl ? descEl.value.trim() : '';
      if (text.length < 5) {
        showToast('Please describe the procurement requirement or product (at least 5 characters).', 'warning');
        markFieldError(descEl);
        return;
      }
      body = { text, product_name: null };
      path = '/analysis/extract';
    } else if (currentMode === 'spec') {
      const titleEl = document.getElementById('req-title-input');
      const textEl = document.getElementById('req-text-input');
      const title = titleEl ? titleEl.value.trim() : '';
      const text = textEl ? textEl.value.trim() : '';

      if (!title && !text) {
        showToast('Please enter the tender title and technical specifications before analyzing.', 'warning');
        markFieldError(titleEl);
        markFieldError(textEl);
        return;
      }
      if (!title) {
        showToast('Please enter the specification or tender title.', 'warning');
        markFieldError(titleEl);
        return;
      }
      if (text.length < 5) {
        showToast('Please enter technical specification details (at least 5 characters).', 'warning');
        markFieldError(textEl);
        return;
      }
      body = { text, product_name: title };
      path = '/analysis/extract';
    } else if (currentMode === 'upload') {
      const file = uploader.getFile();
      if (!file) {
        showToast('Please select or upload a tender specification document (PDF, DOCX, TXT) first.', 'warning');
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
          dropzone.style.borderColor = '#DC2626';
          dropzone.style.backgroundColor = '#FEF2F2';
          setTimeout(() => {
            dropzone.style.borderColor = 'var(--navy)';
            dropzone.style.backgroundColor = 'var(--paper)';
          }, 3000);
        }
        return;
      }
      body = new FormData();
      body.append('file', file);
      path = '/analysis/upload';
    }

    button.disabled = true;
    button.textContent = 'Extracting requirements…';

    try {
      // Run step animation concurrently with the backend extraction API request
      const [result] = await Promise.all([
        api(path, { method: 'POST', body }),
        runStepAnimation()
      ]);

      window.location.assign('/pages/review.html?extraction_id=' + encodeURIComponent(result.id));
    } catch (error) {
      const modal = document.getElementById('loading-modal');
      if (modal) modal.classList.remove('active');
      button.disabled = false;
      button.textContent = 'Extract and review requirements →';
      showToast(error.message || 'Could not reach the analysis service.', 'error');
    }
  });
});
