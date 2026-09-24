import { API_BASE } from './api-config.js';
async function callAuthApi(endpoint, body, method = 'POST', token = '') {
  const options = { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}/auth${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

const KEYS = {
  AUTH_USER: 'praman_user',
  AUTH_TOKEN: 'praman_token',
  REGISTERED_USERS: 'praman_registered_users',
  SAVED_STANDARDS: 'praman_saved',
  ANALYSES_HISTORY: 'praman_analyses',
  REPORTS: 'praman_reports',
  SETTINGS: 'praman_settings',
  SIDEBAR_COLLAPSED: 'praman_sidebar_collapsed',
  REMEMBERED_IDENTIFIER: 'praman_remembered_id'
};

export const Storage = {
  getUser() {
    const data = localStorage.getItem(KEYS.AUTH_USER);
    try { return data ? JSON.parse(data) : null; } catch { return null; }
  },
  setUser(user) {
    if (user) {
      localStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.AUTH_USER);
    }
  },
  getToken() {
    return localStorage.getItem(KEYS.AUTH_TOKEN) || '';
  },
  setToken(token) {
    if (token) {
      localStorage.setItem(KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(KEYS.AUTH_TOKEN);
    }
  },
  isLoggedIn() {
    const user = this.getUser();
    return !!(user && user.id && this.getToken());
  },
  isAdmin() {
    const user = this.getUser();
    if (!user) return false;
    const r = (user.role || '').toLowerCase();
    return r === 'admin' || r === 'administrator' || user.email === 'admin@praman.gov.in';
  },
  getRememberedIdentifier() {
    return localStorage.getItem(KEYS.REMEMBERED_IDENTIFIER) || '';
  },
  setRememberedIdentifier(identifier) {
    if (identifier) {
      localStorage.setItem(KEYS.REMEMBERED_IDENTIFIER, identifier.trim());
    } else {
      localStorage.removeItem(KEYS.REMEMBERED_IDENTIFIER);
    }
  },

  async sendOtp({ identifier, otpType }) {
    try {
      const { ok, data } = await callAuthApi('/send-otp', { identifier, otp_type: otpType });
      if (!ok) {
        return { success: false, error: data.detail || 'Failed to send OTP.' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Backend send-otp connection error:', err);
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check backend connection.'
      };
    }
  },

  async sendEmailOtp(email) {
    try {
      const { ok, data } = await callAuthApi('/request-email-otp', { email });
      if (!ok) {
        return { success: false, error: data.detail || 'Failed to send email verification code.' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Backend sendEmailOtp error:', err);
      return { success: false, error: 'Unable to connect to backend server at http://localhost:8000.' };
    }
  },

  async verifyOtp({ identifier, otpType, otpCode }) {
    try {
      const { ok, data } = await callAuthApi('/verify-otp', { identifier, otp_type: otpType || 'email', otp_code: otpCode });
      if (!ok) {
        return { success: false, error: data.detail || 'Invalid or expired OTP code.' };
      }
      return { success: true, message: data.message, isVerified: true };
    } catch (err) {
      console.error('Backend verify-otp connection error:', err);
      return { success: false, error: 'Unable to verify OTP. Connection error.' };
    }
  },

  async verifyEmailOtp(email, otpCode) {
    try {
      const { ok, data } = await callAuthApi('/verify-email-otp', { email, otp_code: otpCode });
      if (!ok) {
        return { success: false, error: data.detail || 'Invalid or expired email OTP code.' };
      }
      return { success: true, message: data.message, isVerified: true };
    } catch (err) {
      console.error('Backend verifyEmailOtp error:', err);
      return { success: false, error: 'Unable to verify email OTP. Connection error.' };
    }
  },

  async resendEmailOtp(email) {
    try {
      const { ok, data } = await callAuthApi('/resend-email-otp', { email });
      if (!ok) {
        return { success: false, error: data.detail || 'Failed to resend email OTP.' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: 'Failed to resend email OTP. Server unreachable.' };
    }
  },

  async registerUser({ fullName, email, department, role, password, emailOtp, mobileNumber }) {
    try {
      const { ok, data } = await callAuthApi('/register', {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        department: department.trim(),
        role: role || 'Procurement Officer',
        password: password,
        email_otp: emailOtp,
        mobile_number: (mobileNumber || '').trim()
      });
      if (!ok) {
        return { success: false, error: data.detail || 'Account registration failed.' };
      }
      if (data.user && data.access_token) {
        return { success: true, user: data.user, token: data.access_token };
      }
      return { success: false, error: 'Unexpected response from server.' };
    } catch (err) {
      console.error('Backend registration error:', err);
      return { success: false, error: 'Unable to connect to authentication server. Please ensure backend is running at http://localhost:8000.' };
    }
  },

  async loginUser({ fullName, email, role, password }) {
    const identifier = (fullName || email || '').trim();
    try {
      const { ok, data } = await callAuthApi('/login', {
        full_name: identifier,
        email: identifier,
        role: role || 'Procurement Officer',
        password: password
      });
      if (!ok) {
        return { success: false, error: data.detail || 'Invalid login credentials.' };
      }
      if (data.user && data.access_token) {
        this.setUser(data.user);
        this.setToken(data.access_token);
        return { success: true, user: data.user, token: data.access_token };
      }
      return { success: false, error: 'Login failed. Please verify credentials.' };
    } catch (err) {
      console.error('Backend login error:', err);
      return { success: false, error: 'Unable to connect to authentication server. Please check your backend connection at http://localhost:8000.' };
    }
  },

  async googleAuth({ email, name, role, picture, credential }) {
    try {
      const { ok, data } = await callAuthApi('/google', {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: role || 'Procurement Officer',
        picture: picture,
        credential: credential
      });
      if (!ok) {
        return { success: false, error: data.detail || 'Google sign in failed.' };
      }
      if (data.user && data.access_token) {
        this.setUser(data.user);
        this.setToken(data.access_token);
        return { success: true, user: data.user, token: data.access_token };
      }
      return { success: false, error: 'Google authentication error.' };
    } catch (err) {
      console.error('Backend Google auth error:', err);
      return { success: false, error: 'Unable to authenticate. Please try signing in again.' };
    }
  },

  async updateProfile(profileData) {
    try {
      const token = this.getToken();
      const { ok, data } = await callAuthApi('/profile', profileData, 'PUT', token);
      if (!ok) {
        return { success: false, error: data.detail || 'Failed to update officer profile in database.' };
      }
      if (data && data.id) {
        this.setUser(data);
        return { success: true, user: data };
      }
      return { success: false, error: 'Failed to update profile.' };
    } catch (err) {
      console.error('Backend update profile error:', err);
      return { success: false, error: 'Unable to connect to server to update profile.' };
    }
  },

  async getRegisteredUsers() {
    try {
      const { ok, data } = await callAuthApi('/users', null, 'GET', this.getToken());
      if (ok && Array.isArray(data)) {
        localStorage.setItem(KEYS.REGISTERED_USERS, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('Could not fetch remote user list:', err);
    }
    const cached = localStorage.getItem(KEYS.REGISTERED_USERS);
    return cached ? JSON.parse(cached) : [];
  },

  async toggleUserStatus(userId) {
    try {
      const { ok, data } = await callAuthApi(`/toggle-status/${encodeURIComponent(userId)}`, null, 'POST', this.getToken());
      if (ok) {
        return { success: true, status: data.status };
      }
    } catch (err) {
      console.warn('toggleUserStatus remote error:', err);
    }
    return { success: false };
  },

  async validateSession() {
    if (!this.isLoggedIn()) return false;
    try {
      const { ok, data } = await callAuthApi('/me', null, 'GET', this.getToken());
      if (ok && data.id) {
        this.setUser(data);
        return true;
      }
    } catch (error) {
      console.warn('Session validation failed:', error);
    }
    this.setUser(null);
    this.setToken(null);
    return false;
  },

  logout() {
    const token = this.getToken();
    if (token) callAuthApi('/logout', null, 'POST', token).catch(() => {});
    localStorage.removeItem(KEYS.AUTH_USER);
    localStorage.removeItem(KEYS.AUTH_TOKEN);
  },

  getSavedStandards() {
    const data = localStorage.getItem(KEYS.SAVED_STANDARDS) || localStorage.getItem('praman_saved_standards');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  },

  toggleSaveStandard(id) {
    const saved = this.getSavedStandards();
    const index = saved.indexOf(id);
    if (index > -1) {
      saved.splice(index, 1);
    } else {
      saved.push(id);
    }
    localStorage.setItem(KEYS.SAVED_STANDARDS, JSON.stringify(saved));
    localStorage.setItem('praman_saved_standards', JSON.stringify(saved));
    return saved.includes(id);
  },

  isStandardSaved(id) {
    return this.getSavedStandards().includes(id);
  },

  getAnalyses() {
    const data = localStorage.getItem(KEYS.ANALYSES_HISTORY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const pramanReqs = localStorage.getItem('praman_requirements');
    if (pramanReqs) {
      try {
        const reqs = JSON.parse(pramanReqs);
        if (Array.isArray(reqs) && reqs.length > 0) {
          return reqs.map(r => ({
            id: r.id || ('REQ-' + Date.now().toString().slice(-6)),
            product: r.title || 'Procurement Requirement',
            requirement: r.text || '',
            category: r.category || 'General Procurement',
            status: 'Ready',
            standardsCount: (r.matchedStandards && r.matchedStandards.length) || (r.standardsCount || 0),
            date: r.date || 'Today',
            updated: r.date || 'Today',
            extracted: {
              product: r.title,
              application: r.category,
              keyRequirements: r.parameters || []
            }
          }));
        }
      } catch (e) {}
    }
    return [];
  },

  addAnalysis(analysis) {
    const list = this.getAnalyses();
    list.unshift(analysis);
    localStorage.setItem(KEYS.ANALYSES_HISTORY, JSON.stringify(list));
  },

  getReports() {
    const data = localStorage.getItem(KEYS.REPORTS);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  },

  isSidebarCollapsed() {
    return localStorage.getItem(KEYS.SIDEBAR_COLLAPSED) === 'true';
  },

  setSidebarCollapsed(collapsed) {
    localStorage.setItem(KEYS.SIDEBAR_COLLAPSED, collapsed ? 'true' : 'false');
  }
};
