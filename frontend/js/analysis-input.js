import { workspaceReady } from './utils/workspace-guard.js';
import { renderAppSidebar, renderAppTopbar, initSidebarEvents, initTopbarEvents } from './components/sidebar.js';
import { setupFileUpload } from './components/file-upload.js';
import { api } from './utils/api.js';

export function validRequirement(text) {
  const words = text.trim().match(/\p{L}+/gu) || [];
  return text.trim().length >= 10 && new Set(words.map(w => w.toLowerCase())).size >= 2 && !/\b(?:asdf\w*|qwerty\w*|lorem ipsum)\b/i.test(text);
}

workspaceReady.then(allowed => {
  if (!allowed) return;
  document.getElementById('sidebar-root').innerHTML = renderAppSidebar('analyze');
  document.getElementById('topbar-root').innerHTML = renderAppTopbar('Workspace / Analyze requirement');
  initSidebarEvents();
  initTopbarEvents();

  const uploader = setupFileUpload('dropzone', 'file-input', 'file-card-wrapper');
  const button = document.getElementById('start-analysis-btn');
  const status = document.getElementById('input-status');
  const modes = ['describe', 'spec', 'upload'];
  let mode = 'describe';
  let busy = false;
  const inputForMode = {
    describe: document.getElementById('desc-prompt'),
    spec: document.getElementById('spec-text-input')
  };
  const titleForMode = {
    describe: document.getElementById('describe-title-input'),
    spec: document.getElementById('spec-title-input')
  };
  const countForMode = {
    describe: document.getElementById('describe-count'),
    spec: document.getElementById('spec-count')
  };

  function readyForMode() {
    return mode === 'upload' ? Boolean(uploader.getFile()) : validRequirement(inputForMode[mode].value);
  }

  function update() {
    const ready = readyForMode();
    button.disabled = busy || !ready;
    Object.entries(inputForMode).forEach(([name, input]) => {
      if (countForMode[name]) countForMode[name].textContent = `${input.value.length.toLocaleString()} / 100,000`;
    });
    status.textContent = busy
      ? 'Creating your analysis job…'
      : ready
        ? 'Ready to analyze. Your results will be saved to History.'
        : 'Enter a procurement requirement, paste a specification, or upload a document to continue.';
  }

  function selectMode(nextMode) {
    mode = nextMode;
    modes.forEach(name => {
      document.getElementById('tab-' + name).setAttribute('aria-selected', String(name === mode));
      document.getElementById('section-' + name).hidden = name !== mode;
    });
    update();
  }

  modes.forEach((name, index) => {
    const tab = document.getElementById('tab-' + name);
    tab.addEventListener('click', () => selectMode(name));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = modes[(index + step + modes.length) % modes.length];
      selectMode(next);
      document.getElementById('tab-' + next).focus();
    });
  });

  Object.values(inputForMode).forEach(input => input.addEventListener('input', update));
  document.getElementById('file-input').addEventListener('file-selection', update);
  document.querySelectorAll('[data-example]').forEach(example => {
    example.addEventListener('click', () => {
      inputForMode.describe.value = example.dataset.example || '';
      inputForMode.describe.focus();
      update();
    });
  });

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    busy = true;
    button.disabled = true;
    button.textContent = mode === 'upload' ? 'Uploading document…' : 'Starting analysis…';
    update();
    try {
      let body;
      let path = '/analysis/jobs';
      if (mode === 'upload') {
        body = new FormData();
        body.append('file', uploader.getFile());
        path += '/upload';
      } else {
        body = {
          text: inputForMode[mode].value.trim(),
          product_name: titleForMode[mode].value.trim() || null
        };
      }
      const job = await api(path, { method: 'POST', body });
      sessionStorage.setItem('praman_active_job', job.id);
      window.location.assign('/pages/review.html?job_id=' + encodeURIComponent(job.id));
    } catch (error) {
      busy = false;
      button.innerHTML = '<span>Analyze Requirement</span><span aria-hidden="true">→</span>';
      status.textContent = error.message;
      button.disabled = !readyForMode();
    }
  });

  update();
});
