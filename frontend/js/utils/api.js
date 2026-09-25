import { loginUrl } from './auth-navigation.js';
import { Storage } from './storage.js';
import { API_BASE } from './api-config.js';
export { API_BASE };
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function sourceUrl(evidence) {
  return `${API_BASE}/standards/source/${encodeURIComponent(evidence.source)}#page=${Number(evidence.page) || 1}`;
}
export async function api(path, { method = 'GET', body, timeout = 120000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const multipart = body instanceof FormData;
    const response = await fetch(API_BASE + path, { method, signal: controller.signal,
      headers: { ...(multipart ? {} : { 'Content-Type': 'application/json' }), ...(Storage.getToken() ? { Authorization: `Bearer ${Storage.getToken()}` } : {}) },
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        Storage.setToken(null); Storage.setUser(null);
        window.location.assign(loginUrl(window.location.pathname + window.location.search));
      }
      throw new Error(typeof data.detail === 'string' ? data.detail : response.status === 503 ? 'The service is temporarily unavailable. Please try again.' : 'Unable to complete this request. Please check your input and try again.');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
