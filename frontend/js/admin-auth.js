import { API_BASE } from './utils/api-config.js';
import { Storage } from './utils/storage.js';

const form = document.getElementById('admin-auth-form');
const message = document.getElementById('auth-message');
const signup = document.body.dataset.adminAuth === 'signup';
const value = id => document.getElementById(id).value;
async function request(path, body) {
  const response = await fetch(API_BASE + path, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Please check your details and try again.');
  return data;
}
document.getElementById('show-password')?.addEventListener('change', event => {
  document.getElementById('password').type = event.target.checked ? 'text' : 'password';
});
document.getElementById('send-code')?.addEventListener('click', async event => {
  const email = document.getElementById('email');
  if (!email.reportValidity()) return;
  const button = event.target; button.disabled = true; message.textContent = 'Sending verification code…';
  try { const data = await request('/auth/request-email-otp', {email: email.value.trim()}); message.textContent = data.message; }
  catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (signup && value('password') !== value('confirm-password')) { message.textContent = 'Your new passwords do not match.'; return; }
  const button = form.querySelector('[type=submit]'); button.disabled = true;
  message.textContent = signup ? 'Verifying authorization and creating your account…' : 'Verifying administrator credentials…';
  try {
    if (signup) {
      const data = await request('/auth/admin/register', {full_name: value('full-name').trim(), department: value('department').trim(), email: value('email').trim(), password: value('password'), email_otp: value('email-otp'), approving_email: value('approving-email').trim(), approving_password: value('approving-password')});
      form.reset(); message.textContent = data.message;
      window.location.assign('/pages/admin-login.html?registered=1');
    } else {
      const data = await request('/auth/admin/login', {email: value('email').trim(), password: value('password')});
      if (!data.access_token || data.user?.role !== 'Administrator') throw new Error('Administrator access is required.');
      Storage.setUser(data.user); Storage.setToken(data.access_token);
      window.location.assign('/pages/admin.html');
    }
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; if (signup) document.getElementById('approving-password').value = ''; }
});
if (!signup && new URLSearchParams(window.location.search).has('registered')) message.textContent = 'Account created. Log in with your new administrator credentials.';
