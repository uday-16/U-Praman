import { api } from './api.js';
import { Storage } from './storage.js';

async function guard() {
  try {
    const user = await api('/admin/me', {timeout:15000});
    if (user.role !== 'Administrator') throw new Error('Administrator access required.');
    Storage.setUser(user);
    document.documentElement.setAttribute('data-workspace-authenticated', 'true');
    return true;
  } catch {
    window.location.replace('/pages/admin-login.html');
    return false;
  }
}
export const workspaceReady = guard();
window.addEventListener('pageshow', event => {
  if (event.persisted) { document.documentElement.removeAttribute('data-workspace-authenticated'); guard(); }
});
window.addEventListener('storage', event => {
  if (['praman_user','praman_token'].includes(event.key)) {
    document.documentElement.removeAttribute('data-workspace-authenticated'); guard();
  }
});
