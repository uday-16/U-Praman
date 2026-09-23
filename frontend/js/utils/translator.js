/**
 * PRAMAN Translation & Localization Engine
 * Powered by Google Translate API
 * Provides persistent, seamless, dynamic in-page translation across the entire portal
 * without requiring full page reloads or losing language state during navigation.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' }
];

const STORAGE_KEYS = ['praman_lang', 'standardsai_lang'];

export function getSavedLanguage() {
  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return 'en';
}

export function setGoogTransCookie(lang) {
  const targetCode = (!lang || lang === 'en') ? '/en/en' : `/en/${lang}`;
  
  // Set root path cookie
  document.cookie = `googtrans=${targetCode}; path=/;`;
  
  // Set hostname specific cookie
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    document.cookie = `googtrans=${targetCode}; domain=${host}; path=/;`;
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('.')) {
      document.cookie = `googtrans=${targetCode}; domain=.${host}; path=/;`;
    }
  }
}

export function triggerGoogleTranslate(lang) {
  const target = lang || 'en';
  setGoogTransCookie(target);

  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    if (combo.value !== target) {
      combo.value = target;
      combo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }
  return false;
}

let comboPollTimer = null;
function pollAndApplyLanguage(targetLang) {
  if (comboPollTimer) clearInterval(comboPollTimer);
  let attempts = 0;
  const maxAttempts = 50; // 50 * 100ms = 5s

  comboPollTimer = setInterval(() => {
    attempts++;
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      clearInterval(comboPollTimer);
      comboPollTimer = null;
      if (combo.value !== targetLang) {
        combo.value = targetLang;
        combo.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (attempts >= maxAttempts) {
      clearInterval(comboPollTimer);
      comboPollTimer = null;
    }
  }, 100);
}

export function syncAllLanguageSelects(selectedLang) {
  const lang = selectedLang || getSavedLanguage();
  const selectors = document.querySelectorAll('#gov-lang-select, #gov-sidebar-lang-select, #lang-select, .gov-lang-dropdown');
  
  selectors.forEach(sel => {
    if (sel && sel.value !== lang) {
      // If the option exists, select it
      const option = Array.from(sel.options).find(opt => opt.value === lang);
      if (option) {
        sel.value = lang;
      }
    }
  });
}

export function changeLanguage(lang) {
  const target = lang || 'en';
  
  STORAGE_KEYS.forEach(k => localStorage.setItem(k, target));
  setGoogTransCookie(target);
  syncAllLanguageSelects(target);

  const applied = triggerGoogleTranslate(target);
  if (!applied) {
    pollAndApplyLanguage(target);
  }

  // Notify any active UI components
  window.dispatchEvent(new CustomEvent('praman_language_changed', { detail: { lang: target } }));
}

export function bindLanguageSelects() {
  const selectors = document.querySelectorAll('#gov-lang-select, #gov-sidebar-lang-select, #lang-select, .gov-lang-dropdown');
  const currentLang = getSavedLanguage();

  selectors.forEach(sel => {
    if (!sel.dataset.translatorBound) {
      sel.dataset.translatorBound = 'true';
      sel.value = currentLang;
      sel.addEventListener('change', (e) => {
        changeLanguage(e.target.value);
      });
    }
  });
}

export function initGoogleTranslate() {
  const savedLang = getSavedLanguage();
  setGoogTransCookie(savedLang);

  // Ensure hidden container exists
  let elem = document.getElementById('google_translate_element');
  if (!elem) {
    elem = document.createElement('div');
    elem.id = 'google_translate_element';
    elem.style.display = 'none';
    document.body.appendChild(elem);
  }

  // Define global Google Translate element init callback
  window.googleTranslateElementInit = function() {
    if (window.google && window.google.translate) {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: SUPPORTED_LANGUAGES.map(l => l.code).join(','),
        autoDisplay: false,
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');

      const activeLang = getSavedLanguage();
      pollAndApplyLanguage(activeLang);
    }
  };

  // Inject Google Translate script if not present
  if (!document.querySelector('script[src*="translate_a/element.js"]')) {
    const script = document.createElement('script');
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  } else if (window.google && window.google.translate) {
    pollAndApplyLanguage(savedLang);
  }

  bindLanguageSelects();
  syncAllLanguageSelects(savedLang);

  // Monitor DOM for any dynamically added topbars or sidebars
  const observer = new MutationObserver(() => {
    bindLanguageSelects();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
