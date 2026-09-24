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

export function renderAppTopbar(pageTitle = 'Procurement Workspace', user = null) {
  const activeUser = user || Storage.getUser() || { name: 'Officer', role: 'Procurement Officer' };
  const officerName = activeUser.name || activeUser.full_name || 'Officer';
  const officerRole = activeUser.role || 'Procurement Officer';
  const officerEmail = activeUser.email || 'officer@bis.gov.in';
  const initial = officerName.trim().charAt(0).toUpperCase() || 'O';

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

        <!-- Interactive Notifications -->
        <div class="topbar-notif-wrapper">
          <button class="topbar-icon-btn" id="notif-btn" aria-label="Notifications" title="Procurement Notifications" aria-expanded="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span class="notification-badge" id="notif-badge"></span>
          </button>
          
          <div class="notif-dropdown-panel" id="notif-dropdown" style="display: none;">
            <div class="notif-header">
              <div class="notif-title">
                <span>Notifications</span>
                <span class="notif-count-pill" id="notif-pill-count">3 new</span>
              </div>
              <button class="notif-mark-read-btn" id="notif-mark-all">Mark all as read</button>
            </div>
            <div class="notif-list" id="notif-items-list">
              <a href="/pages/standards.html?search=IS+2062" class="notif-item unread">
                <div class="notif-icon-col revision" title="BIS Revision">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <div class="notif-body">
                  <div class="notif-item-title">BIS Standard Revision Alert</div>
                  <div class="notif-item-desc">IS 2062:2011 structural steel standard amended with updated mechanical testing provisions.</div>
                  <div class="notif-item-time">15m ago • Gazette Notification</div>
                </div>
                <span class="notif-dot"></span>
              </a>
              <a href="/pages/standards.html?search=IS+2925" class="notif-item unread">
                <div class="notif-icon-col qco" title="Mandatory QCO">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="notif-body">
                  <div class="notif-item-title">Mandatory QCO Compliance Active</div>
                  <div class="notif-item-desc">Quality Control Order active: Mandatory ISI certification for Industrial Safety Helmets (IS 2925).</div>
                  <div class="notif-item-time">2h ago • DPIIT Directive</div>
                </div>
                <span class="notif-dot"></span>
              </a>
              <a href="/pages/reports.html" class="notif-item unread">
                <div class="notif-icon-col analysis" title="Analysis Completed">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div class="notif-body">
                  <div class="notif-item-title">Procurement Review Ready</div>
                  <div class="notif-item-desc">Analysis for Industrial Safety Helmet Procurement completed — 2 standards identified.</div>
                  <div class="notif-item-time">Yesterday • PRAMAN Engine</div>
                </div>
                <span class="notif-dot"></span>
              </a>
            </div>
            <div class="notif-footer">
              <a href="/pages/history.html" class="notif-view-all">View All Procurement History &rarr;</a>
            </div>
          </div>
        </div>

        <!-- Interactive User Profile Dropdown -->
        <div class="topbar-user-wrapper">
          <button class="user-profile-btn" id="user-profile-toggle" aria-haspopup="true" aria-expanded="false" title="Officer Account Menu">
            <div class="avatar-circle">${initial}</div>
            <div class="user-info">
              <span class="user-name">${officerName}</span>
              <span class="user-role">${officerRole}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #64748B; margin-left: 2px;"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          
          <div class="user-profile-dropdown" id="user-profile-dropdown" style="display: none;">
            <div class="profile-dropdown-header">
              <div class="avatar-circle-lg">${initial}</div>
              <div style="overflow: hidden;">
                <div class="profile-name">${officerName}</div>
                <div class="profile-email" title="${officerEmail}">${officerEmail}</div>
                <span class="profile-role-badge">${officerRole}</span>
              </div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/pages/profile.html" class="profile-menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Officer Profile</span>
            </a>
            <a href="/pages/settings.html" class="profile-menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Platform Settings</span>
            </a>
            <div class="profile-dropdown-divider"></div>
            <button class="profile-menu-item logout" id="topbar-logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
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

  // Notification Dropdown Toggle & Mark Read
  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const notifMarkAll = document.getElementById('notif-mark-all');
  const notifBadge = document.getElementById('notif-badge');
  const notifPillCount = document.getElementById('notif-pill-count');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = notifDropdown.style.display !== 'none';
      // Close other dropdowns
      const profileDropdown = document.getElementById('user-profile-dropdown');
      if (profileDropdown) profileDropdown.style.display = 'none';

      notifDropdown.style.display = isOpen ? 'none' : 'flex';
      notifBtn.setAttribute('aria-expanded', !isOpen);
    });
  }

  if (notifMarkAll) {
    notifMarkAll.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.notif-item.unread').forEach(item => {
        item.classList.remove('unread');
      });
      if (notifBadge) notifBadge.style.display = 'none';
      if (notifPillCount) notifPillCount.innerText = '0 new';
    });
  }

  // User Profile Dropdown Toggle
  const profileToggle = document.getElementById('user-profile-toggle');
  const profileDropdown = document.getElementById('user-profile-dropdown');
  const logoutBtn = document.getElementById('topbar-logout-btn');

  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = profileDropdown.style.display !== 'none';
      // Close notification dropdown
      if (notifDropdown) notifDropdown.style.display = 'none';

      profileDropdown.style.display = isOpen ? 'none' : 'block';
      profileToggle.setAttribute('aria-expanded', !isOpen);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Storage.logout();
      window.location.href = '/pages/login.html';
    });
  }

  // Global click outside to close dropdowns
  document.addEventListener('click', (e) => {
    if (notifDropdown && notifDropdown.style.display !== 'none') {
      if (!notifDropdown.contains(e.target) && e.target !== notifBtn && !notifBtn?.contains(e.target)) {
        notifDropdown.style.display = 'none';
        if (notifBtn) notifBtn.setAttribute('aria-expanded', 'false');
      }
    }
    if (profileDropdown && profileDropdown.style.display !== 'none') {
      if (!profileDropdown.contains(e.target) && e.target !== profileToggle && !profileToggle?.contains(e.target)) {
        profileDropdown.style.display = 'none';
        if (profileToggle) profileToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (notifDropdown) notifDropdown.style.display = 'none';
      if (profileDropdown) profileDropdown.style.display = 'none';
    }
  });
}
