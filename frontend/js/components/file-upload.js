import { showToast } from './toast.js';

export function setupFileUpload(dropzoneId, fileInputId, targetContainerId) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(fileInputId);
  const container = document.getElementById(targetContainerId);

  if (!dropzone || !fileInput || !container) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary-blue)';
    dropzone.style.backgroundColor = 'var(--primary-blue-light)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.backgroundColor = 'transparent';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.backgroundColor = 'transparent';
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    container.innerHTML = `
      <div class="card" style="margin-top: 1rem; border-left: 4px solid var(--indian-green); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 0.875rem;">
          <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--indian-green-light); color: var(--indian-green); display: flex; align-items: center; justify-content: center; font-weight: 700;">PDF</div>
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">${file.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${(file.size / (1024 * 1024)).toFixed(2)} MB • Uploaded & Parsed</div>
          </div>
        </div>
        <button type="button" id="remove-file-btn" class="btn btn-secondary btn-sm" style="color: var(--error);">Remove File</button>
      </div>
    `;

    showToast(`File "${file.name}" uploaded successfully`, 'success');

    document.getElementById('remove-file-btn').addEventListener('click', () => {
      container.innerHTML = '';
      fileInput.value = '';
      showToast('File removed', 'info');
    });
  }
}
