import { mockStandards } from '../data/standards.js';

export function initGlobalSearchModal() {
  // Create search modal markup if not already present
  if (document.getElementById('global-search-modal')) return;

  const modalHtml = `
    <div class="search-modal-backdrop" id="global-search-modal">
      <div class="search-modal-container">
        <div class="search-modal-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="modal-search-input" placeholder="Search standards, topics, categories... (e.g., helmet, electrical, safety)" />
          <span class="search-kbd-hint">ESC</span>
        </div>

        <div class="search-modal-body">
          <!-- Default categories & popular searches -->
          <div id="search-modal-default">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">POPULAR CATEGORIES</div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
              <button class="search-chip-btn" data-query="Personal Protective Equipment">Personal Protective Equipment</button>
              <button class="search-chip-btn" data-query="Electrical Equipment">Electrical Equipment</button>
              <button class="search-chip-btn" data-query="Civil Infrastructure">Civil Infrastructure</option>
              <button class="search-chip-btn" data-query="Testing Standards">Testing Standards</button>
            </div>

            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">FEATURED STANDARDS</div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;" id="search-featured-list">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Dynamic search results list -->
          <div id="search-modal-results" style="display: none;">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;" id="modal-results-count">SEARCH RESULTS</div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;" id="modal-results-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('global-search-modal');
  const input = document.getElementById('modal-search-input');
  const defaultSec = document.getElementById('search-modal-default');
  const resultsSec = document.getElementById('search-modal-results');
  const resultsList = document.getElementById('modal-results-list');
  const featuredList = document.getElementById('search-featured-list');

  // Populate featured list
  featuredList.innerHTML = mockStandards.slice(0, 3).map(s => `
    <a href="/pages/standard-details.html?id=${s.id}" class="search-result-item">
      <div>
        <div style="font-weight: 800; color: var(--primary-blue); font-size: 0.95rem;">${s.isNumber}</div>
        <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${s.title}</div>
      </div>
      <span class="badge badge-success">${s.status}</span>
    </a>
  `).join('');

  // Toggle modal visibility
  window.openGlobalSearchModal = function() {
    modal.classList.add('active');
    setTimeout(() => input.focus(), 50);
  };

  window.closeGlobalSearchModal = function() {
    modal.classList.remove('active');
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeGlobalSearchModal();
  });

  // Filter functionality inside modal
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) {
      defaultSec.style.display = 'block';
      resultsSec.style.display = 'none';
      return;
    }

    const matches = mockStandards.filter(s =>
      s.isNumber.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.scope.toLowerCase().includes(q)
    );

    defaultSec.style.display = 'none';
    resultsSec.style.display = 'block';
    document.getElementById('modal-results-count').innerText = `FOUND ${matches.length} MATCHING STANDARD${matches.length === 1 ? '' : 'S'}`;

    if (matches.length === 0) {
      resultsList.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No standards found matching "${input.value}"</div>`;
    } else {
      resultsList.innerHTML = matches.map(s => `
        <a href="/pages/standard-details.html?id=${s.id}" class="search-result-item">
          <div>
            <div style="font-weight: 800; color: var(--primary-blue); font-size: 0.95rem;">${s.isNumber}</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${s.title}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.category}</div>
          </div>
          <span class="badge badge-primary">${s.year}</span>
        </a>
      `).join('');
    }
  });

  // Click handler for category chips
  document.querySelectorAll('.search-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.query;
      input.dispatchEvent(new Event('input'));
    });
  });

  // Keyboard events: Ctrl+K / Cmd+K or ESC
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlobalSearchModal();
    }
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeGlobalSearchModal();
    }
  });
}
