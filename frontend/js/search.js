/**
 * PRAMAN Global Search & Shortcut Manager
 * Manages the Ctrl+K modal dialog, category search, and live filter triggers.
 */
import { sampleStandards } from './data/standards.js';

export function initSearch() {
  // Global Shortcut Ctrl+K listener
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlobalSearchModal();
    }
  });

  // Attach search modal trigger globally
  window.openGlobalSearchModal = openGlobalSearchModal;
  window.closeGlobalSearchModal = closeGlobalSearchModal;
}

export function openGlobalSearchModal() {
  let modal = document.getElementById('global-search-modal');
  if (!modal) {
    createSearchModalDOM();
    modal = document.getElementById('global-search-modal');
  }
  modal.style.display = 'flex';
  modal.classList.add('active');
  const input = modal.querySelector('#global-search-input');
  if (input) {
    input.value = '';
    input.focus();
    renderSearchResults('');
  }
}

export function closeGlobalSearchModal() {
  const modal = document.getElementById('global-search-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
}

function createSearchModalDOM() {
  const modalHTML = `
    <div id="global-search-modal" class="search-modal-backdrop" onclick="if(event.target === this) closeGlobalSearchModal()">
      <div class="search-modal-card">
        <div class="search-modal-header">
          <div class="search-modal-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="global-search-input" placeholder="Search Indian Standards, categories, or keywords (e.g., IS 2062, Switchgear, Steel)..." autocomplete="off" />
          </div>
          <button class="modal-close-btn" onclick="closeGlobalSearchModal()" title="Close search (Esc)">✕</button>
        </div>

        <div class="search-modal-filters">
          <button class="search-chip active" data-category="all">All Items</button>
          <button class="search-chip" data-category="Electrical">Electrical</button>
          <button class="search-chip" data-category="Construction">Construction</button>
          <button class="search-chip" data-category="Mechanical">Mechanical</button>
          <button class="search-chip" data-category="IT">IT &amp; Telecom</button>
        </div>

        <div id="search-results-list" class="search-modal-results">
          <!-- Results populated dynamically -->
        </div>

        <div class="search-modal-footer">
          <span>Press <kbd>Esc</kbd> to close</span>
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>Enter</kbd> to select</span>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const input = document.getElementById('global-search-input');
  if (input) {
    input.addEventListener('input', (e) => renderSearchResults(e.target.value));
  }

  // Category chip listeners
  const chips = document.querySelectorAll('.search-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const inputVal = document.getElementById('global-search-input').value;
      renderSearchResults(inputVal, chip.dataset.category);
    });
  });

  // ESC to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGlobalSearchModal();
  });
}

function renderSearchResults(query = '', categoryFilter = 'all') {
  const container = document.getElementById('search-results-list');
  if (!container) return;

  const q = query.toLowerCase().trim();
  const filtered = (sampleStandards || []).filter(item => {
    const desc = item.description || item.scope || '';
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesText = !q || item.id.toLowerCase().includes(q) || item.title.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    return matchesCat && matchesText;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No Indian Standards found matching "<strong>${query}</strong>"
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const desc = item.description || item.scope || '';
    return `
      <a href="/pages/standard-details.html?id=${item.id}" class="search-result-item" onclick="closeGlobalSearchModal()">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
          <div style="font-weight: 800; color: var(--primary-blue); font-size: 0.95rem;">${item.code || item.id}</div>
          <span class="badge badge-primary" style="font-size: 0.75rem;">${item.category}</span>
        </div>
        <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem;">${item.title}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${desc.slice(0, 110)}...</div>
      </a>
    `;
  }).join('');
}
