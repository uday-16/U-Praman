/**
 * PRAMAN Main Entry Point
 * Bootstraps all core modular JS modules:
 * accessibility, storage, navigation, slider, search, state-selector, standards, analyzer, chatbot, and portal-wide translation.
 */

import { initAccessibility } from './accessibility.js';
import { initNavigation } from './navigation.js';
import { initHeroSlider } from './slider.js';
import { initSearch } from './search.js';
import { initStateSelector } from './state-selector.js';
import { initStandardsExplorer } from './standards.js';
import { initAnalyzer } from './analyzer.js';
import { initChatbot } from './components/chatbot.js';
import { initGoogleTranslate } from './utils/translator.js';
import { initAuthNavigation } from './utils/auth-navigation.js';

import { workspaceReady } from './utils/workspace-guard.js';

const canInitializePage = initAuthNavigation();

function initializePage() {
  if (!canInitializePage) return;
  initGoogleTranslate();
  initAccessibility();
  initNavigation();
  initHeroSlider();
  initSearch();
  initStateSelector();
  initStandardsExplorer();
  initAnalyzer();
  if (!/\/(results|report-view|review|analyze)\.html$/.test(window.location.pathname)) initChatbot();

}

workspaceReady.then(allowed => {
  if (!allowed) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage, { once: true });
  } else {
    initializePage();
  }
});
