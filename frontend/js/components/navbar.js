import { Storage } from '../utils/storage.js';
import { bindLanguageSelects } from '../utils/translator.js';

export function renderPublicNavbar(activePath = '/') {
  const isLoggedIn = Storage.isLoggedIn();
  const user = isLoggedIn ? Storage.getUser() : null;
  const isStandardsActive = activePath.includes('/standards') || activePath.includes('standards.html');
  const isHomeActive = !isStandardsActive && (activePath === '/' || activePath === '/index.html' || activePath === '');

  return `
    <!-- Visually Hidden Skip to Main Content Link -->
    <a href="#main-content" class="skip-to-content">Skip to main content</a>

    <!-- Top Governance Utility Bar -->
    <div class="top-governance-bar">
      <div class="container top-gov-container">
        <div class="top-gov-left">
          <span style="font-weight: 800; color: #FFFFFF; letter-spacing: 0.02em;">Standards for a Stronger India</span>
          <span style="display: inline-block; width: 16px; height: 3px; background: linear-gradient(90deg, #FF9933, #FFFFFF, #138808); border-radius: 1px; vertical-align: middle; margin: 0 0.4rem;"></span>
          <span style="font-weight: 500; color: rgba(255,255,255,0.75);" class="gov-motto">Transparent • Efficient • Inclusive</span>
        </div>

        <div class="top-gov-right">
          <!-- Accessibility Icon & Font Controls -->
          <div class="accessibility-controls" aria-label="Accessibility Font Size Controls">
            <span title="Accessibility Options" style="font-size: 0.8rem; margin-right: 0.2rem; color: rgba(255,255,255,0.85); display: inline-flex; align-items: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            </span>
            <button id="btn-font-dec" class="acc-btn" title="Decrease font size">A-</button>
            <button id="btn-font-reset" class="acc-btn active" title="Reset font size">A</button>
            <button id="btn-font-inc" class="acc-btn" title="Increase font size">A+</button>
          </div>

          <!-- Multilingual Select Language Dropdown -->
          <div class="gov-lang-picker" title="Select Language">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: rgba(255,255,255,0.85);"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <select id="gov-lang-select" class="gov-lang-dropdown" aria-label="Select Language">
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

          <!-- Prominent India Flag Accent -->
          <div style="display: inline-flex; align-items: center; gap: 0.4rem;" title="Government of India / भारत सरकार">
            <img src="/assets/images/india-flag.svg" alt="Flag of India / भारतीय ध्वज" width="36" height="24" style="width: 36px; height: 24px; border-radius: 3px; object-fit: cover; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 1px 4px rgba(0,0,0,0.3); display: block;" />
          </div>
        </div>
      </div>
      <!-- Subtle Tricolor Underline Line Accent -->
      <div class="tricolor-accent-line"></div>
    </div>

    <!-- Main Public Header -->
    <header class="public-navbar">
      <div class="container navbar-container">
        <!-- PRAMAN Brand Identity Logo -->
        <a href="/" class="brand-logo" title="PRAMAN — Indian Standards Decision Support">
          <img src="/assets/brand/praman-logo.svg" alt="PRAMAN / प्रमाण — Indian Standards Decision Support" height="40" class="brand-img" />
        </a>

        <!-- Center Navigation Links (Clean Direct Links) -->
        <nav class="navbar-links" aria-label="Main Navigation">
          <a href="/" class="nav-link ${isHomeActive ? 'active' : ''}">Home</a>
          <a href="/pages/standards.html" class="nav-link ${isStandardsActive ? 'active' : ''}">Standards</a>
          <a href="/pages/how-it-works.html" class="nav-link ${activePath.includes('/how-it-works') ? 'active' : ''}">How It Works</a>
          <a href="/pages/about.html" class="nav-link ${activePath.includes('/about') ? 'active' : ''}">About</a>
        </nav>

        <!-- Right Side Controls & CTAs -->
        <div class="navbar-actions">
          ${isLoggedIn ? `
            <a href="/pages/dashboard.html" class="navbar-cta" style="white-space: nowrap; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.25); font-size: 0.75rem; font-weight: 800;">${(user?.name || 'O').trim().charAt(0).toUpperCase()}</span>
              <span>Officer Workspace &rarr;</span>
            </a>
          ` : `
            <a href="/pages/login.html" class="navbar-cta" style="white-space: nowrap;">
              Login
            </a>
          `}
        </div>
      </div>
    </header>
  `;
}

export function initNavbarEvents() {
  // Logout handler
  const logoutBtn = document.getElementById('nav-btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Storage.logout();
      window.location.href = '/pages/login.html';
    });
  }

  // Sticky Scroll Class Handler
  const publicNavbar = document.querySelector('.public-navbar');
  if (publicNavbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 15) {
        publicNavbar.classList.add('navbar-scrolled');
      } else {
        publicNavbar.classList.remove('navbar-scrolled');
      }
    });
  }

  // Font Size Accessibility Controls
  const btnDec = document.getElementById('btn-font-dec');
  const btnReset = document.getElementById('btn-font-reset');
  const btnInc = document.getElementById('btn-font-inc');

  if (btnDec && btnReset && btnInc) {
    btnDec.addEventListener('click', () => {
      document.documentElement.style.fontSize = '92%';
      setActiveAccBtn(btnDec);
    });
    btnReset.addEventListener('click', () => {
      document.documentElement.style.fontSize = '100%';
      setActiveAccBtn(btnReset);
    });
    btnInc.addEventListener('click', () => {
      document.documentElement.style.fontSize = '108%';
      setActiveAccBtn(btnInc);
    });
  }

  function setActiveAccBtn(activeBtn) {
    if (btnDec && btnReset && btnInc) {
      [btnDec, btnReset, btnInc].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }
  }

  // High Contrast Toggle
  const contrastBtn = document.getElementById('btn-high-contrast');
  if (contrastBtn) {
    contrastBtn.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
    });
  }

  bindLanguageSelects();
}
