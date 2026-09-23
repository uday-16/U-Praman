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
const SELECTORS = '#gov-lang-select, #gov-sidebar-lang-select, #lang-select, .gov-lang-dropdown';
const supported = new Set(SUPPORTED_LANGUAGES.map(language => language.code));
let initialized = false;
let widgetCreated = false;
let queued = false;
let appliedCombo = null;
let appliedLanguage = null;

export function getSavedLanguage() {
  for (const key of STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (supported.has(value)) return value;
  }
  return 'en';
}

export function setGoogTransCookie(lang) {
  const target = supported.has(lang) ? lang : 'en';
  const host = window.location.hostname;
  // Clear old path/domain variants before writing one root-scoped preference.
  const paths = new Set(['/', '/pages', '/pages/']);
  for (const path of paths) {
    const expiry = '; Max-Age=0; path=' + path;
    document.cookie = 'googtrans=' + expiry;
    if (host && host !== 'localhost' && !/^[\d.]+$/.test(host)) {
      document.cookie = 'googtrans=' + expiry + '; domain=' + host;
    }
  }
  document.cookie = 'googtrans=/en/' + target + '; path=/; SameSite=Lax';
}

export function triggerGoogleTranslate(lang = getSavedLanguage()) {
  const target = supported.has(lang) ? lang : 'en';
  const combo = document.querySelector('.goog-te-combo');
  if (!combo || !Array.from(combo.options).some(option => option.value === target)) return false;
  if (appliedCombo !== combo || appliedLanguage !== target || combo.value !== target) {
    combo.value = target;
    // Set state before dispatch: Google's DOM mutations must not retrigger it.
    appliedCombo = combo;
    appliedLanguage = target;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}

export function syncAllLanguageSelects(selectedLang = getSavedLanguage()) {
  document.querySelectorAll(SELECTORS).forEach(select => {
    select.classList.add('notranslate');
    select.setAttribute('translate', 'no');
    if (Array.from(select.options).some(option => option.value === selectedLang)) {
      select.value = selectedLang;
    }
  });
}

export function changeLanguage(lang) {
  const target = supported.has(lang) ? lang : 'en';
  STORAGE_KEYS.forEach(key => localStorage.setItem(key, target));
  setGoogTransCookie(target);
  syncAllLanguageSelects(target);
  triggerGoogleTranslate(target);
  window.dispatchEvent(new CustomEvent('praman_language_changed', { detail: { lang: target } }));
}

export function bindLanguageSelects() {
  syncAllLanguageSelects();
  document.querySelectorAll(SELECTORS).forEach(select => {
    if (select.dataset.translatorBound) return;
    select.dataset.translatorBound = 'true';
    select.addEventListener('change', event => changeLanguage(event.target.value));
  });
}

function initializeWidget() {
  if (widgetCreated || !window.google?.translate?.TranslateElement) return;
  widgetCreated = true;
  new window.google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: SUPPORTED_LANGUAGES.map(language => language.code).join(','),
    autoDisplay: false,
    // The standard layout creates the .goog-te-combo used for in-place switching.
    layout: window.google.translate.TranslateElement.InlineLayout.VERTICAL
  }, 'google_translate_element');
  triggerGoogleTranslate();
}

export function initGoogleTranslate() {
  if (initialized) return;
  initialized = true;
  const saved = getSavedLanguage();
  STORAGE_KEYS.forEach(key => localStorage.setItem(key, saved));
  setGoogTransCookie(saved);

  // Keep the translation widget outside replaceable navbar/sidebar markup.
  let element = document.getElementById('google_translate_element');
  if (!element) {
    element = document.createElement('div');
    element.id = 'google_translate_element';
  }
  element.style.display = 'none';
  document.body.appendChild(element);
  bindLanguageSelects();

  // Wait for actual readiness, including options populated after the script loads.
  // Always read the latest preference so rapid selections cannot apply stale state.
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      bindLanguageSelects();
      triggerGoogleTranslate();
    });
  }).observe(document.body, { childList: true, subtree: true });

  window.googleTranslateElementInit = initializeWidget;
  if (window.google?.translate?.TranslateElement) {
    initializeWidget();
  } else if (!document.querySelector('script[src*="translate_a/element.js"]')) {
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.addEventListener('error', () => {
      script.remove();
      initialized = false;
      window.dispatchEvent(new CustomEvent('praman_translation_error', {
        detail: { message: 'Translation could not load. Your language preference is saved.' }
      }));
    });
    document.head.appendChild(script);
  }

  window.addEventListener('storage', event => {
    if (STORAGE_KEYS.includes(event.key)) {
      const language = getSavedLanguage();
      setGoogTransCookie(language);
      syncAllLanguageSelects(language);
      triggerGoogleTranslate(language);
    }
  });
}
