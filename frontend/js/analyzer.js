/**
 * PRAMAN Requirement Analyzer
 * Handles tender document upload, specification parameter extraction,
 * 5-step stepper workflow, and local storage state persistence.
 */
import { PRAMANStorage } from './storage.js';

export function initAnalyzer() {
  const form = document.getElementById('analyzer-form');
  if (!form) return;

  const tabPaste = document.getElementById('tab-paste');
  const tabUpload = document.getElementById('tab-upload');
  const tabManual = document.getElementById('tab-manual');

  const inputAreaPaste = document.getElementById('input-area-paste');
  const inputAreaUpload = document.getElementById('input-area-upload');
  const inputAreaManual = document.getElementById('input-area-manual');

  // Tab switching
  if (tabPaste && tabUpload && tabManual) {
    tabPaste.addEventListener('click', () => switchInputTab(tabPaste, inputAreaPaste));
    tabUpload.addEventListener('click', () => switchInputTab(tabUpload, inputAreaUpload));
    tabManual.addEventListener('click', () => switchInputTab(tabManual, inputAreaManual));
  }

  function switchInputTab(activeTab, activeArea) {
    [tabPaste, tabUpload, tabManual].forEach(t => t.classList.remove('active'));
    [inputAreaPaste, inputAreaUpload, inputAreaManual].forEach(a => a.style.display = 'none');

    activeTab.classList.add('active');
    if (activeArea) activeArea.style.display = 'block';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('req-title-input');
    const textInput = document.getElementById('req-text-input');
    const catSelect = document.getElementById('req-category-select');

    const title = titleInput ? titleInput.value : 'Procurement Requirement';
    const text = textInput ? textInput.value : 'Industrial Electrical Switchgear 415V 50kA short circuit rating.';
    const category = catSelect ? catSelect.value : 'Electrical';

    // Simulated parameter extraction
    const parameters = [
      { name: 'Product Class', value: 'Switchgear / Electrical Equipment' },
      { name: 'Operating Voltage', value: '415V AC Low Voltage' },
      { name: 'Short Circuit Rating', value: '50kA for 1 second' },
      { name: 'Application', value: 'Industrial Power Plant Distribution' }
    ];

    const saved = PRAMANStorage.saveRequirement({
      title,
      text,
      category,
      state: PRAMANStorage.getSelectedState(),
      parameters,
      matchedStandards: ['PRAMAN-001', 'PRAMAN-002', 'PRAMAN-003']
    });

    // Redirect to side-by-side review page or results page
    window.location.href = `/pages/review.html?id=${saved.id}`;
  });
}
