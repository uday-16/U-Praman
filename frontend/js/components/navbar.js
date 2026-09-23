import { Storage } from '../utils/storage.js';

export function renderPublicNavbar(activePath = '/') {
  const isLoggedIn = Storage.isLoggedIn();
  const user = isLoggedIn ? Storage.getUser() : null;
  const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
  const isStandardsActive = activePath.includes('explore-standards') || currentHash === '#explore-standards';
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
              <option value="en">Select Language</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="mr">మరాఠీ (Marathi)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="kn">కన్నడ (Kannada)</option>
            </select>
            <div id="google_translate_element" style="display:none;"></div>
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
          <a href="/#explore-standards" class="nav-link ${isStandardsActive ? 'active' : ''}">Standards</a>
          <a href="/pages/how-it-works.html" class="nav-link ${activePath.includes('/how-it-works') ? 'active' : ''}">How It Works</a>
          <a href="/pages/about.html" class="nav-link ${activePath.includes('/about') ? 'active' : ''}">About</a>
        </nav>

        <!-- Right Side Controls & CTAs -->
        <div class="navbar-actions">
          <a href="/pages/login.html" class="navbar-cta" style="white-space: nowrap;">
            Login
          </a>
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

  // Navigation Links Active Underline and Hash Handler
  const navLinks = document.querySelectorAll('.navbar-links .nav-link');
  const homeLink = Array.from(navLinks).find(l => {
    const h = l.getAttribute('href');
    return h === '/' || h === '/index.html' || h === '';
  });
  const standardsLink = Array.from(navLinks).find(l => {
    const h = l.getAttribute('href');
    return h && h.includes('explore-standards');
  });

  function updateActiveNavOnHash() {
    const currentHash = window.location.hash;
    const isStandardsHash = currentHash === '#explore-standards';
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';

    if (homeLink && standardsLink && isHomePage) {
      if (isStandardsHash) {
        standardsLink.classList.add('active');
        homeLink.classList.remove('active');
      } else if (!currentHash || currentHash === '#') {
        homeLink.classList.add('active');
        standardsLink.classList.remove('active');
      }
    }
  }

  updateActiveNavOnHash();
  window.addEventListener('hashchange', updateActiveNavOnHash);

  function scrollToExploreStandards() {
    const el = document.getElementById('explore-standards');
    if (el) {
      const navEl = document.getElementById('navbar-root');
      const navHeight = navEl ? navEl.offsetHeight : 108;
      const targetY = el.getBoundingClientRect().top + window.pageYOffset - (navHeight + 20);
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  }

  // Handle hash on initial load if directly navigated
  if (window.location.hash === '#explore-standards') {
    setTimeout(scrollToExploreStandards, 150);
  }

  if (standardsLink) {
    standardsLink.addEventListener('click', (e) => {
      const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';
      if (isHomePage) {
        e.preventDefault();
        scrollToExploreStandards();
        history.pushState(null, '', '/#explore-standards');
        updateActiveNavOnHash();
      }
    });
  }

  // Also handle Hero Section "Explore Standards" button
  document.querySelectorAll('a[href*="explore-standards"], .btn-hero-secondary, #hero-btn-explore').forEach(btn => {
    if (btn !== standardsLink) {
      btn.addEventListener('click', (e) => {
        const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';
        if (isHomePage) {
          e.preventDefault();
          scrollToExploreStandards();
          history.pushState(null, '', '/#explore-standards');
          updateActiveNavOnHash();
        }
      });
    }
  });

  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';
      if (isHomePage && window.location.hash) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.pushState(null, '', '/');
        updateActiveNavOnHash();
      }
    });
  }

  if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '') {
    const exploreSection = document.getElementById('explore-standards');
    if (exploreSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (standardsLink && homeLink) {
              standardsLink.classList.add('active');
              homeLink.classList.remove('active');
            }
          } else if (window.scrollY < (exploreSection.offsetTop - 300)) {
            if (standardsLink && homeLink && window.location.hash !== '#explore-standards') {
              homeLink.classList.add('active');
              standardsLink.classList.remove('active');
            }
          }
        });
      }, { rootMargin: '-20% 0px -50% 0px', threshold: 0.1 });
      observer.observe(exploreSection);
    }
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

  // Language selector dictionary translation
  const langSelect = document.getElementById('gov-lang-select');
  const translations = {
    en: {
      analyzeBtn: 'Analyze Requirement →',
      exploreBtn: 'Explore Standards',
      heroTitle: 'Find the Right <span class="hero-highlight">Indian Standard</span> for Every Procurement Requirement.'
    },
    hi: {
      analyzeBtn: 'आवश्यकता का विश्लेषण करें →',
      exploreBtn: 'मानक खोजें',
      heroTitle: 'प्रत्येक खरीद आवश्यकता के लिए सही <span class="hero-highlight">भारतीय मानक</span> खोजें।'
    },
    bn: {
      analyzeBtn: 'প্রয়োজনীয়তা বিশ্লেষণ করুন →',
      exploreBtn: 'মানকসমূহ খুঁজুন',
      heroTitle: 'প্রতিটি ক্রয়ের জন্য সঠিক <span class="hero-highlight">ভারতীয় মানক</span> খুঁজুন।'
    },
    ta: {
      analyzeBtn: 'தேவையை ஆராயுங்கள் →',
      exploreBtn: 'தரநிலைகளை ஆராயுங்கள்',
      heroTitle: 'ஒவ்வொரு கொள்முதல் தேவைக்கும் சரியான <span class="hero-highlight">இந்திய தரநிலையை</span> கண்டறியவும்.'
    },
    te: {
      analyzeBtn: 'అవసరాన్ని విశ్లేషించండి →',
      exploreBtn: 'ప్రమాణాలను అన్వేషించండి',
      heroTitle: 'ప్రతి కొనుగోలు అవసరానికి సరైన <span class="hero-highlight">భారతీయ ప్రమాణాన్ని</span> కనుగొనండి.'
    },
    mr: {
      analyzeBtn: 'गरजेचे विश्लेषण करा →',
      exploreBtn: 'मानके शोधा',
      heroTitle: 'प्रत्येक खरेदी गरजेसाठी योग्य <span class="hero-highlight">भारतीय मानक</span> शोधा.'
    },
    pa: {
      analyzeBtn: 'ਲੋੜ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ →',
      exploreBtn: 'ਮਿਆਰਾਂ ਦੀ ਖੋਜ ਕਰੋ',
      heroTitle: 'ਹਰ ਖਰੀਦ ਦੀ ਲੋੜ ਲਈ ਸਹੀ <span class="hero-highlight">ਭਾਰਤੀ ਮਿਆਰ</span> ਲੱਭੋ।'
    }
  };

  function applyTranslation(lang) {
    const dict = translations[lang] || translations.en;
    const s1Title = document.querySelector('#hero-slide-1 .hero-title');
    if (s1Title) s1Title.innerHTML = dict.heroTitle;
    document.querySelectorAll('#hero-slide-1 .btn-hero-primary').forEach(el => { el.innerText = dict.analyzeBtn; });
    document.querySelectorAll('#hero-slide-1 .btn-hero-secondary').forEach(el => { el.innerText = dict.exploreBtn; });
  }

  if (langSelect) {
    const savedLang = localStorage.getItem('praman_lang') || localStorage.getItem('standardsai_lang') || 'en';
    langSelect.value = savedLang;
    applyTranslation(savedLang);

    langSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      localStorage.setItem('praman_lang', selected);
      localStorage.setItem('standardsai_lang', selected);

      // Set Google Translate cookie
      const cookieVal = `/en/${selected}`;
      document.cookie = `googtrans=${cookieVal}; path=/;`;
      if (window.location.hostname) {
        document.cookie = `googtrans=${cookieVal}; domain=${window.location.hostname}; path=/;`;
      }

      applyTranslation(selected);

      // Sync sidebar select if present
      const sideSel = document.getElementById('gov-sidebar-lang-select');
      if (sideSel) sideSel.value = selected;

      // Programmatically trigger Google Translate combo change
      const googCombo = document.querySelector('.goog-te-combo');
      if (googCombo) {
        googCombo.value = selected;
        googCombo.dispatchEvent(new Event('change'));
      } else {
        window.location.reload();
      }
    });
  }
}

