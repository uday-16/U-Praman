import { Storage } from '../utils/storage.js';
import { bindLanguageSelects } from '../utils/translator.js';

export function renderAppSidebar(activePage = 'dashboard') {
  const isCollapsed = localStorage.getItem('praman_sidebar_collapsed') === 'true';

  const workspaceLinks = [
    { id: 'dashboard', label: 'Dashboard', url: '/pages/dashboard.html', icon: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>' },
    { id: 'analyze', label: 'Analyze requirement', url: '/pages/analyze.html', icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
    { id: 'standards', label: 'Standards', url: '/pages/standards.html', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    { id: 'reports', label: 'Reports', url: '/pages/reports.html', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' }
  ];

  const myWorkLinks = [
    { id: 'history', label: 'History', url: '/pages/history.html', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
    { id: 'saved', label: 'Saved', url: '/pages/saved.html', icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' }
  ];

  const supportLinks = [
    { id: 'help', label: 'Help', url: '/pages/help.html', icon: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' }
  ];

  return `
    <aside class="app-sidebar ${isCollapsed ? 'collapsed' : ''}" id="app-sidebar">
      <div class="sidebar-header">
        <a href="/pages/dashboard.html" class="sidebar-brand" title="PRAMAN प्रमाण">
          <img src="/assets/brand/praman-logo.svg" alt="PRAMAN" class="sidebar-logo-full" height="38" />
          <img src="/assets/brand/praman-mark.svg" alt="PRAMAN Mark" class="sidebar-logo-mark" height="36" />
        </a>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-group-label">WORKSPACE</div>
        ${workspaceLinks.map(l => `
          <a href="${l.url}" class="sidebar-item ${activePage === l.id ? 'active' : ''}" data-tooltip="${l.label}">
            <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${l.icon}</svg>
            <span class="sidebar-label">${l.label}</span>
          </a>
        `).join('')}

        <div class="sidebar-group-label" style="margin-top: 1.25rem;">MY WORK</div>
        ${myWorkLinks.map(l => `
          <a href="${l.url}" class="sidebar-item ${activePage === l.id ? 'active' : ''}" data-tooltip="${l.label}">
            <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${l.icon}</svg>
            <span class="sidebar-label">${l.label}</span>
          </a>
        `).join('')}

        <div class="sidebar-group-label" style="margin-top: 1.25rem;">SUPPORT</div>
        ${supportLinks.map(l => `
          <a href="${l.url}" class="sidebar-item ${activePage === l.id ? 'active' : ''}" data-tooltip="${l.label}">
            <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${l.icon}</svg>
            <span class="sidebar-label">${l.label}</span>
          </a>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <a href="/pages/settings.html" class="sidebar-item ${activePage === 'settings' ? 'active' : ''}" data-tooltip="Settings">
          <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span class="sidebar-label">Settings</span>
        </a>
        <a href="/pages/profile.html" class="sidebar-item ${activePage === 'profile' ? 'active' : ''}" data-tooltip="Profile">
          <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="sidebar-label">Profile</span>
        </a>

        <!-- Collapse Toggle Button -->
        <button class="sidebar-collapse-toggle" id="sidebar-toggle-btn" aria-label="Toggle Sidebar">
          <svg class="toggle-icon-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          <svg class="toggle-icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          <span class="sidebar-label" style="font-size:0.8rem; font-weight:600;">Collapse Sidebar</span>
        </button>
      </div>
    </aside>
  `;
}

export function renderAppTopbar(pageTitle = 'Procurement Workspace', user = Storage.getUser()) {
  return `
    <header class="app-topbar">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <button class="mobile-sidebar-btn" id="mobile-sidebar-toggle" aria-label="Open navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span class="topbar-page-title">${pageTitle}</span>
      </div>

      <div class="topbar-actions">
        <!-- Multilingual Select Language Dropdown -->
        <div class="topbar-language" title="Select Language">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-secondary);"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          <select id="gov-sidebar-lang-select" class="gov-lang-dropdown" aria-label="Select Language">
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="mr">मराठी (Marathi)</option>
            <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="ml">മലയാളം (Malayalam)</option>
            <option value="or">ଓଡ଼ିଆ (Odia)</option>
            <option value="ur">اردو (Urdu)</option>
            <option value="as">অসমীয়া (Assamese)</option>
          </select>
        </div>

        <div class="topbar-search">
          <svg class="topbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search Indian Standards..." id="topbar-search-input" />
        </div>

        <button class="topbar-icon-btn" id="notif-btn" aria-label="Notifications" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notification-badge"></span>
        </button>

        <a href="/pages/profile.html" class="user-profile-btn">
          <div class="avatar-circle">U</div>
          <div class="user-info">
            <span class="user-name">Uday Kiran</span>
            <span class="user-role">Administrator</span>
          </div>
        </a>
      </div>
    </header>
  `;
}

// Setup Sidebar Toggle & Collapsible State Handler
export function initSidebarEvents() {
  const sidebar = document.getElementById('app-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('praman_sidebar_collapsed', isCollapsed);
    });
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  bindLanguageSelects();
}

export function initTopbarEvents() {
  const topbarSearch = document.getElementById('topbar-search-input');
  if (topbarSearch) {
    topbarSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        window.location.href = `/pages/standards.html?search=${encodeURIComponent(e.target.value.trim())}`;
      }
    });
  }
}
