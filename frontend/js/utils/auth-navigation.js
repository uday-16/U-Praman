import { Storage } from './storage.js';

const protectedPages = new Set([
  '/pages/dashboard.html',
  '/pages/analyze.html',
  '/pages/standards.html',
  '/pages/standard-details.html',
  '/pages/compare.html',
  '/pages/review.html',
  '/pages/results.html',
  '/pages/reports.html',
  '/pages/report-view.html',
  '/pages/history.html',
  '/pages/saved.html',
  '/pages/profile.html',
  '/pages/settings.html',
  '/pages/admin.html'
]);

// Only accept local workspace destinations, never arbitrary redirect URLs.
export function getProtectedDestination(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !protectedPages.has(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function getLoginDestination() {
  return getProtectedDestination(new URLSearchParams(window.location.search).get('redirect'));
}

export function getPostLoginDestination() {
  return getLoginDestination() || (Storage.isAdmin() ? '/pages/admin.html' : '/pages/dashboard.html');
}

export function loginUrl(destination) {
  return '/pages/login.html?redirect=' + encodeURIComponent(destination);
}

export function initAuthNavigation() {
  const destination = getProtectedDestination(window.location.href);
  if (destination && !Storage.isLoggedIn()) {
    window.location.replace(loginUrl(destination));
    return false;
  }

  // Delegation also covers cards and Compare links rendered after page load.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = getProtectedDestination(link.href);
    if (!target || Storage.isLoggedIn()) return;
    event.preventDefault();
    window.location.assign(loginUrl(target));
  }, true);
  return true;
}
