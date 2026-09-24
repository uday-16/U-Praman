const configured = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const location = typeof window === 'undefined' ? null : window.location;
const local = location && ['localhost', '127.0.0.1'].includes(location.hostname);
export const API_BASE = configured ? (/\/api$/.test(configured) ? configured + '/v1' : configured) : (local && location.port !== '8000' ? 'http://127.0.0.1:8000/api/v1' : '/api/v1');
