/**
 * PRAMAN Standards Explorer & Comparison Controller
 * Controls standards catalog filtering, search query matching,
 * category selection, and comparison matrix selection.
 */
import { sampleStandards } from './data/standards.js';

export function initStandardsExplorer() {
  const container = document.getElementById('standards-explorer-grid');
  if (!container) return;

  const searchInput = document.getElementById('standards-search-input');
  const categoryFilter = document.getElementById('standards-category-select');
  const statusFilter = document.getElementById('standards-status-select');

  function renderExplorer() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const cat = categoryFilter ? categoryFilter.value : 'all';
    const stat = statusFilter ? statusFilter.value : 'all';

    const filtered = (sampleStandards || []).filter(item => {
      const desc = item.description || item.scope || '';
      const matchCat = cat === 'all' || item.category === cat;
      const matchStat = stat === 'all' || item.status.toLowerCase() === stat.toLowerCase();
      const matchQ = !q || item.id.toLowerCase().includes(q) || item.title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      return matchCat && matchStat && matchQ;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">No Indian Standards match your criteria.</div>
          <p style="font-size: 0.9rem; color: var(--text-secondary);">Try adjusting search keywords or resetting filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const desc = item.description || item.scope || '';
      const ver = item.version || item.year || '2022';
      return `
        <div class="card standard-explorer-card" style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <span class="badge badge-primary" style="font-weight: 800; font-size: 0.85rem;">${item.code || item.id}</span>
              <span class="badge ${item.status === 'Current' ? 'badge-success' : 'badge-neutral'}" style="font-weight: 700;">${item.status}</span>
            </div>

            <h4 style="font-size: 1.1rem; font-weight: 900; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.35;">${item.title}</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">${desc}</p>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-bottom: 1rem;">
              <span>Category: <strong style="color: var(--text-primary);">${item.category}</strong></span>
              <span>Version: <strong style="color: var(--text-primary);">${ver}</strong></span>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <a href="/pages/standard-details.html?id=${item.id}" class="btn btn-primary btn-sm" style="flex: 1; font-weight: 800; text-align: center;">View Standard</a>
              <a href="/pages/compare.html?ids=${item.id}" class="btn btn-secondary btn-sm" style="font-weight: 700;">Compare</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  if (searchInput) searchInput.addEventListener('input', renderExplorer);
  if (categoryFilter) categoryFilter.addEventListener('change', renderExplorer);
  if (statusFilter) statusFilter.addEventListener('change', renderExplorer);

  renderExplorer();
}
