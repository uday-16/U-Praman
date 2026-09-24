import { showToast } from './toast.js';
export function setupFileUpload(dropzoneId, fileInputId, targetContainerId) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(fileInputId);
  const container = document.getElementById(targetContainerId);
  let selected = null;
  if (!dropzone || !input || !container) return { getFile: () => null };
  dropzone.addEventListener('click', event => {
    if (event.target !== input) { event.preventDefault(); input.click(); }
  });
  dropzone.addEventListener('dragover', event => event.preventDefault());
  dropzone.addEventListener('drop', event => { event.preventDefault(); select(event.dataTransfer.files[0]); });
  input.addEventListener('change', () => select(input.files[0]));
  function select(file) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name) || file.size > 20 * 1024 * 1024 || !file.size) {
      selected = null; input.value = ''; container.replaceChildren(); container.style.display = 'none';
      showToast('Select a nonempty PDF, DOCX or TXT file up to 20 MB.', 'error'); return;
    }
    selected = file;
    container.replaceChildren(); container.style.display = 'block';
    const name = document.createElement('p');
    name.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze`;
    const remove = document.createElement('button');
    remove.className = 'btn btn-secondary btn-sm'; remove.textContent = 'Remove file'; remove.type = 'button';
    remove.addEventListener('click', () => { selected = null; input.value = ''; container.replaceChildren(); container.style.display = 'none'; });
    container.append(name, remove);
  }
  return { getFile: () => selected };
}
