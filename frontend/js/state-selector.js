/**
 * PRAMAN State & Union Territory Selector
 * Manages 28 States & 8 Union Territories intelligence coverage across India.
 * Handles state selection dropdown, map interactions, state chip updates, and statistics.
 */
import { PRAMANStorage } from './storage.js';

export const STATES_AND_UTS = {
  states: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ],
  unionTerritories: [
    'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ]
};

export function initStateSelector() {
  const container = document.getElementById('state-selector-container');
  if (!container) return;

  renderStateSelectorDOM(container);

  // Listen for navbar state changes
  window.addEventListener('pramanStateChanged', (e) => {
    updateStateDisplay(e.detail.state);
  });
}

function renderStateSelectorDOM(container) {
  const selected = PRAMANStorage.getSelectedState();

  const allStates = STATES_AND_UTS.states;
  const allUTs = STATES_AND_UTS.unionTerritories;

  container.innerHTML = `
    <div class="state-selector-card card" style="background: white; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
        <div>
          <span class="badge badge-primary mb-1" style="font-weight: 700;">NATIONAL COVERAGE</span>
          <h3 style="font-size: 1.5rem; font-weight: 900; color: var(--primary-blue);">India’s Standards. For Every State.</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.25rem;">
            PRAMAN supports procurement intelligence across India with unified access to standards, guidance and evidence.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <label for="state-dropdown-select" style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary);">Select State / UT:</label>
          <select id="state-dropdown-select" style="padding: 0.5rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-weight: 700; color: var(--primary-blue); background: var(--bg-main);">
            <option value="All India" ${selected === 'All India' ? 'selected' : ''}>📍 All India (28 States &amp; 8 UTs)</option>
            <optgroup label="28 States">
              ${allStates.map(s => `<option value="${s}" ${selected === s ? 'selected' : ''}>${s}</option>`).join('')}
            </optgroup>
            <optgroup label="8 Union Territories">
              ${allUTs.map(ut => `<option value="${ut}" ${selected === ut ? 'selected' : ''}>${ut}</option>`).join('')}
            </optgroup>
          </select>
        </div>
      </div>

      <!-- State Stats Overview Card -->
      <div id="state-info-panel" style="background: var(--bg-main); padding: 1.5rem; border-radius: var(--radius-md); border-left: 4px solid var(--primary-blue); margin-bottom: 1.5rem;">
        <!-- Dynamically rendered statistics -->
      </div>

      <!-- State Quick Select Chips -->
      <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.75rem;">Featured Procurement Regions:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;" id="state-chips-wrapper">
        ${['All India', 'Delhi', 'Maharashtra', 'Tamil Nadu', 'Karnataka', 'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Telangana'].map(st => `
          <button class="state-chip ${selected === st ? 'active' : ''}" data-state="${st}" style="padding: 0.4rem 0.875rem; border-radius: var(--radius-full); border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 700; cursor: pointer; background: ${selected === st ? 'var(--primary-blue)' : 'white'}; color: ${selected === st ? 'white' : 'var(--text-primary)'};">
            ${st === 'All India' ? '📍 All India' : st}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Select event listener
  const dropdown = container.querySelector('#state-dropdown-select');
  if (dropdown) {
    dropdown.addEventListener('change', (e) => {
      const val = e.target.value;
      PRAMANStorage.setSelectedState(val);
      updateStateDisplay(val);
    });
  }

  // Chip buttons listener
  const chips = container.querySelectorAll('.state-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const stateName = chip.dataset.state;
      PRAMANStorage.setSelectedState(stateName);
      if (dropdown) dropdown.value = stateName;
      updateStateDisplay(stateName);
    });
  });

  // Render initial display
  updateStateDisplay(selected);
}

function updateStateDisplay(stateName) {
  const panel = document.getElementById('state-info-panel');
  if (!panel) return;

  const isAll = stateName === 'All India';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="font-size: 1.25rem; font-weight: 900; color: var(--primary-blue);">${isAll ? 'All India National Coverage' : stateName + ' Procurement Region'}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
          ${isAll ? 'Unified digital decision support for 28 States and 8 Union Territories.' : 'State-specific procurement guidelines and Indian Standards compliance.'}
        </div>
      </div>
      <span class="badge badge-success" style="font-size: 0.85rem; font-weight: 800;">
        ${isAll ? '28 States & 8 Union Territories' : 'Active Region'}
      </span>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 1.25rem; font-size: 0.85rem;">
      <div style="background: white; padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary-blue);">
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">APPLICABLE STANDARDS</div>
        <div style="font-size: 1.25rem; font-weight: 900; color: var(--primary-blue);">${isAll ? '24,500+' : '18,200+'}</div>
      </div>

      <div style="background: white; padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--indian-green);">
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">COVERED CATEGORIES</div>
        <div style="font-size: 1.25rem; font-weight: 900; color: var(--indian-green);">${isAll ? '16 Major Sectors' : '14 Key Sectors'}</div>
      </div>

      <div style="background: white; padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--saffron-accent);">
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">COMPLIANCE MANDATES</div>
        <div style="font-size: 1.25rem; font-weight: 900; color: var(--saffron-accent);">${isAll ? 'QCO & BIS Certified' : 'State QCO Aligned'}</div>
      </div>

      <div style="background: white; padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--secondary-blue);">
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">PROCUREMENT WORKFLOW</div>
        <div style="font-size: 1.25rem; font-weight: 900; color: var(--primary-blue);">1 Unified Platform</div>
      </div>
    </div>
  `;

  // Update chip active classes
  const chips = document.querySelectorAll('.state-chip');
  chips.forEach(chip => {
    const isCur = chip.dataset.state === stateName;
    chip.style.background = isCur ? 'var(--primary-blue)' : 'white';
    chip.style.color = isCur ? 'white' : 'var(--text-primary)';
  });
}
