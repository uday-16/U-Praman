/**
 * PRAMAN Standards Explorer & Catalog Controller
 * Controls standards catalog filtering, search query matching,
 * category selection, URL parameter synchronization, and comparison matrix selection.
 */
import { sampleStandards, mockStandards } from './data/standards.js';
import { Storage } from './utils/storage.js';
import { showToast } from './components/toast.js';

export function initStandardsExplorer() {
  const container = document.getElementById('standards-explorer-grid');
  if (!container) return;

  const searchInput = document.getElementById('standards-search-input');
  const categoryFilter = document.getElementById('standards-category-select');
  const statusFilter = document.getElementById('standards-status-select');
  const countEl = document.getElementById('standards-count') || document.getElementById('results-count');
  const emptyState = document.getElementById('standards-empty-state');
  const resetBtn = document.getElementById('standards-reset-btn');
  const categoryPills = document.querySelectorAll('.category-pill');

  // Combine and deduplicate data
  const standardsData = (sampleStandards && sampleStandards.length > 0) ? sampleStandards : (mockStandards || []);

  // Initialize filters from URL query parameters if present
  const params = new URLSearchParams(window.location.search);
  const paramCategory = params.get('category');
  const paramSearch = params.get('search') || params.get('q');
  const paramStatus = params.get('status');

  if (paramCategory && categoryFilter) {
    // Find matching option (case-insensitive or partial match)
    const options = Array.from(categoryFilter.options);
    const matched = options.find(opt => 
      opt.value.toLowerCase() === paramCategory.toLowerCase() ||
      opt.text.toLowerCase() === paramCategory.toLowerCase() ||
      paramCategory.toLowerCase().includes(opt.value.toLowerCase())
    );
    if (matched) {
      categoryFilter.value = matched.value;
    }
  }

  if (paramSearch && searchInput) {
    searchInput.value = paramSearch;
  }

  if (paramStatus && statusFilter) {
    statusFilter.value = paramStatus;
  }

  function updateActiveCategoryPill(activeCat) {
    if (!categoryPills || categoryPills.length === 0) return;
    categoryPills.forEach(pill => {
      const cat = pill.getAttribute('data-category');
      if (cat === activeCat || (activeCat === 'all' && cat === 'All')) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function renderExplorer() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const cat = categoryFilter ? categoryFilter.value : 'all';
    const stat = statusFilter ? statusFilter.value : 'all';

    updateActiveCategoryPill(cat);

    const filtered = standardsData.filter(item => {
      const desc = item.description || item.scope || '';
      const code = item.code || item.isNumber || item.id || '';
      const title = item.title || '';
      const itemCat = item.category || '';
      const itemStatus = item.status || 'Active';

      // Category match
      let matchCat = cat === 'all' || cat === 'All';
      if (!matchCat) {
        matchCat = itemCat.toLowerCase().includes(cat.toLowerCase()) || 
                   cat.toLowerCase().includes(itemCat.toLowerCase());
      }

      // Status match
      let matchStat = stat === 'all' || stat === 'All';
      if (!matchStat) {
        matchStat = itemStatus.toLowerCase() === stat.toLowerCase() ||
                    (stat.toLowerCase() === 'current' && itemStatus.toLowerCase() === 'active') ||
                    (stat.toLowerCase() === 'active' && itemStatus.toLowerCase() === 'current');
      }

      // Query match
      const matchQ = !q || 
        code.toLowerCase().includes(q) || 
        title.toLowerCase().includes(q) || 
        desc.toLowerCase().includes(q) ||
        itemCat.toLowerCase().includes(q);

      return matchCat && matchStat && matchQ;
    });

    if (countEl) {
      const catText = (cat !== 'all' && cat !== 'All') ? ` in "${cat}"` : '';
      const qText = q ? ` matching "${q}"` : '';
      countEl.textContent = `Showing ${filtered.length} Indian Standard${filtered.length === 1 ? '' : 's'}${catText}${qText}`;
    }

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'block';
      } else {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 3.5rem 2rem; text-align: center; background: white; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-xs);">
            <div style="width: 52px; height: 52px; margin: 0 auto 1rem auto; background: #F1F5F9; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">No Indian Standards match your criteria</h3>
            <p style="font-size: 0.9rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.5rem auto;">Try adjusting search keywords, clearing filters, or browsing by specific sectors.</p>
            <button id="inline-reset-btn" class="btn btn-secondary btn-sm" style="font-weight: 700;">Reset all filters</button>
          </div>
        `;
        const inlineReset = document.getElementById('inline-reset-btn');
        if (inlineReset) inlineReset.addEventListener('click', resetFilters);
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = filtered.map(item => {
      const desc = item.description || item.scope || 'Official Indian Standard specification and compliance benchmarks.';
      const ver = item.version || item.year || (item.reviewedYear ? `Reaffirmed ${item.reviewedYear}` : '2024');
      const code = item.code || item.isNumber || item.id;
      const status = item.status || 'Active';
      const isSaved = Storage.isStandardSaved ? Storage.isStandardSaved(item.id) : false;
      const statusClass = (status === 'Active' || status === 'Current') ? 'badge-success' : 
                          (status === 'Amended' ? 'badge-warning' : 'badge-neutral');

      return `
        <div class="card standard-explorer-card" style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 1.75rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-xs); transition: transform 0.2s ease, box-shadow 0.2s ease;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 0.5rem;">
              <span style="background: #F8FAFC; color: #082B4C; border: 1px solid #DCE3EB; font-weight: 800; font-size: 0.8rem; padding: 0.3rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.4rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                ${code}
              </span>
              <span class="badge ${statusClass}" style="font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.65rem;">${status}</span>
            </div>

            <h3 style="font-size: 1.125rem; font-weight: 800; color: #082B4C; margin-bottom: 0.6rem; line-height: 1.4;">${item.title}</h3>
            <p style="font-size: 0.875rem; color: #64748B; line-height: 1.6; margin-bottom: 1.25rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${desc}</p>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #64748B; border-top: 1px solid #EDF2F7; padding-top: 0.85rem; margin-bottom: 1.15rem;">
              <span>Category: <strong style="color: #082B4C;">${item.category}</strong></span>
              <span>Year: <strong style="color: #082B4C;">${ver}</strong></span>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <a href="/pages/standard-details.html?id=${item.id}" class="btn btn-primary btn-sm" style="flex: 1; font-weight: 700; text-align: center; border-radius: 6px; padding: 0.5rem 0.85rem;">View Standard</a>
              <a href="/pages/compare.html?ids=${item.id}" class="btn btn-secondary btn-sm" style="font-weight: 700; border-radius: 6px; padding: 0.5rem 0.75rem;">Compare</a>
              <button class="btn btn-secondary btn-sm standard-save-btn" data-id="${item.id}" title="${isSaved ? 'Remove from saved' : 'Save standard'}" style="font-weight: 700; border-radius: 6px; padding: 0.5rem 0.65rem; min-width: 38px;">
                ${isSaved ? '★' : '☆'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function resetFilters() {
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (history.replaceState) {
      history.replaceState(null, '', window.location.pathname);
    }
    renderExplorer();
  }

  if (searchInput) searchInput.addEventListener('input', renderExplorer);
  if (categoryFilter) categoryFilter.addEventListener('change', renderExplorer);
  if (statusFilter) statusFilter.addEventListener('change', renderExplorer);
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  // Category pill clicks
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-category');
      if (categoryFilter) {
        categoryFilter.value = cat;
        renderExplorer();
      }
    });
  });

  // Handle Save standard toggle delegation
  container.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('.standard-save-btn');
    if (saveBtn) {
      const id = saveBtn.getAttribute('data-id');
      if (Storage.toggleSaveStandard) {
        const saved = Storage.toggleSaveStandard(id);
        saveBtn.innerText = saved ? '★' : '☆';
        saveBtn.title = saved ? 'Remove from saved' : 'Save standard';
        showToast(saved ? 'Standard saved to your workspace' : 'Standard removed from saved', saved ? 'success' : 'info');
      }
    }
  });

  renderExplorer();
}
