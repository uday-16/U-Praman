import { Storage } from './storage.js';
import { getProtectedDestination, loginUrl } from './auth-navigation.js';

async function guardWorkspace() {
  const destination = getProtectedDestination(window.location.href);
  if (!destination) return true;
  if (!await Storage.validateSession()) {
    window.location.replace(loginUrl(destination));
    return false;
  }
  if (window.location.pathname === '/pages/admin.html' && !Storage.isAdmin()) {
    window.location.replace('/pages/dashboard.html');
    return false;
  }
  document.documentElement.setAttribute('data-workspace-authenticated', 'true');
  return true;
}

export const workspaceReady = guardWorkspace();

// A restored page or a logout in another tab must not reopen an unlocked workspace.
window.addEventListener('pageshow', event => {
  if (event.persisted && getProtectedDestination(window.location.href)) {
    document.documentElement.removeAttribute('data-workspace-authenticated');
    guardWorkspace();
  }
});
window.addEventListener('storage', event => {
  if (['praman_user', 'praman_token'].includes(event.key) && !Storage.isLoggedIn() && getProtectedDestination(window.location.href)) {
    document.documentElement.removeAttribute('data-workspace-authenticated');
    window.location.replace(loginUrl(getProtectedDestination(window.location.href)));
  }
});
