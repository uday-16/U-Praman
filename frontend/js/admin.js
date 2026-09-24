import { workspaceReady } from './utils/admin-guard.js';
import { Storage } from './utils/storage.js';
import { api, escapeHtml as esc, API_BASE } from './utils/api.js';
import { dashboardMarkup } from './admin-dashboard.js';

const profileFields = ['mobile_number','cadre','gem_officer_id','jurisdiction_state'];
const panel = document.getElementById('admin-panel');
const message = document.getElementById('admin-message');
let activeTab = 'overview', offset = 0, query = '', role = '', status = '', users = [], summary;
let requestVersion = 0, timer, dashboardData, detailVersion = 0;
const sectionInfo = {overview:['Dashboard','A clear view of your procurement standards workspace.'],users:['Procurement officers','Manage profiles, account access and officer details.'],standards:['Standards library','Maintain the evidence behind every procurement decision.'],activity:['Analysis activity','Follow procurement requirements across your organization.'],audit:['Audit trail','Review who changed what, and when.'],security:['Security & services','Manage your credentials and check connected services.']};
const date = value => value ? new Date(value).toLocaleString() : '—';
const badge = value => `<span class="admin-status ${['active','completed','indexed','available'].includes(value) ? 'good' : 'warn'}">${esc(value)}</span>`;
const table = (headers, rows) => rows.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<div class="card admin-empty">No records match these filters.</div>';
const pagination = data => `<div class="admin-pagination"><span class="admin-muted">${data.total ? data.offset + 1 : 0}–${Math.min(data.offset + data.items.length, data.total)} of ${data.total}</span><div class="admin-actions"><button class="btn btn-secondary btn-sm" data-page="previous" ${offset === 0 ? 'disabled' : ''}>Previous</button><button class="btn btn-secondary btn-sm" data-page="next" ${offset + data.limit >= data.total ? 'disabled' : ''}>Next</button></div></div>`;
const search = label => `<label class="search-filter">${label}<input id="admin-search" type="search" class="form-input" value="${esc(query)}" placeholder="Search records…"></label>`;
function notify(text) { message.textContent = text; }
async function metrics() {
  const data = await api('/admin/dashboard', {timeout:20000});
  dashboardData = data;
  document.getElementById('admin-updated').textContent = 'Updated ' + new Date(data.generated_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  document.getElementById('admin-metrics').innerHTML = [['Procurement officers', data.officers, data.active_officers + ' active accounts'], ['Source documents', data.documents, 'Standards in the library'], ['Requirement analyses', data.analyses, 'Across all officers'], ['Departments', data.department_count, 'Represented in the directory']].map(([label,value,hint]) => '<div class="admin-metric"><span>'+label+'</span><strong>'+value+'</strong><span>'+hint+'</span></div>').join('');
}
function jobRows(jobs) {
  return table(['Operation', 'Status', 'Started', 'Result'], jobs.map(job => `<tr><td>${esc(job.kind)}<small>${esc(job.id)}</small></td><td>${badge(job.status)}</td><td>${esc(date(job.at))}</td><td>${esc(job.message)}</td></tr>`));
}
async function overview() {
  if (!dashboardData) await metrics();
  return dashboardMarkup(dashboardData);
}
async function userPanel() {
  const params = new URLSearchParams({ q: query, role, status, offset, limit: 20 });
  const data = await api('/admin/users?' + params);
  if (activeTab === 'users' && params.toString() === new URLSearchParams({q:query,role,status,offset,limit:20}).toString()) users = data.items;
  return `<div class="admin-heading"><div><h2>Officer & administrator directory</h2><p class="admin-muted">Manage officer accounts and administrator access.</p></div><div class="admin-actions"><button class="btn btn-primary" data-action="create-user">Create officer account</button><a class="btn btn-secondary" href="/pages/admin-signup.html">Register administrator</a></div></div><div class="admin-filters">${search('Name, email or department')}<label>Role<select id="admin-role" class="form-select"><option value="">All roles</option>${['Procurement Officer','Administrator'].map(r => `<option ${role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label>Status<select id="admin-status" class="form-select"><option value="">All statuses</option><option value="active" ${status === 'active' ? 'selected' : ''}>Active</option><option value="deactivated" ${status === 'deactivated' ? 'selected' : ''}>Deactivated</option></select></label></div>
  ${table(['Account','Department','Role','Status','Last login','Actions'],data.items.map(user => `<tr><td><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small><small>${esc(user.gem_officer_id || user.id)}</small><small>${user.email_verified ? '· Email verified' : '· Email unverified'}</small></td><td>${esc(user.department || '—')}<small>${esc(user.cadre || 'Designation not provided')}</small><small>${esc(user.jurisdiction_state || '')}</small></td><td>${esc(user.role)}</td><td>${badge(user.status)}</td><td>${esc(date(user.last_login_at))}</td><td><div class="admin-actions"><button class="btn btn-secondary btn-sm" data-view="${esc(user.id)}">Profile</button><button class="btn btn-secondary btn-sm" data-edit="${esc(user.id)}">Edit</button><button class="btn btn-secondary btn-sm" data-revoke="${esc(user.id)}">Sign out sessions</button><button class="btn btn-secondary btn-sm" data-delete="${esc(user.id)}" ${user.id === Storage.getUser()?.id ? 'disabled' : ''}>Delete</button></div></td></tr>`))}${pagination(data)}`;
}
async function standardsPanel() {
  const [data,jobs] = await Promise.all([api('/admin/standards'),api('/admin/jobs')]);
  const filtered = data.items.filter(item => (item.filename + ' ' + item.title + ' ' + item.is_number).toLowerCase().includes(query.toLowerCase()));
  const report = data.report;
  return `<div class="admin-grid"><section class="card"><h2>Upload a standard</h2><form id="standard-upload" class="admin-form"><label for="admin-file">PDF, DOCX or TXT · up to 20 MB</label><input type="file" id="admin-file" accept=".pdf,.docx,.txt" required><p class="admin-muted">Include the IS number, part and publication year in the filename, for example is.2925.1984.pdf or IS1489_Part1_2015.pdf. Existing files are never overwritten.</p><button class="btn btn-primary" type="submit">Upload & index document</button></form></section><section class="card"><h2>Retrieval index</h2><div class="admin-service"><span>Indexed documents / passages</span><strong>${report.documents} / ${report.chunks}</strong></div><div class="admin-service"><span>Retrieval mode</span><strong>${esc(report.retrieval_mode)}</strong></div><div class="admin-service"><span>OCR pages processed</span><strong>${report.ocr_pages || 0}</strong></div><p class="admin-muted">${report.errors.length} extraction errors. ${report.pages_needing_ocr.length} files have pages without readable text (these may be blank).</p><button class="btn btn-secondary" data-action="rebuild">Rebuild index</button><details><summary>Ingestion details</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:.75rem">${esc(JSON.stringify({ errors:report.errors, pages_without_text:report.pages_needing_ocr },null,2))}</pre></details></section></div>
  <div class="admin-filters">${search('Search source documents')}</div>
  ${table(['Document','Edition / amendment','Pages','Status','Actions'], filtered.map(item => `<tr><td><strong>${esc(item.filename)}</strong><small>${esc(item.title)}</small></td><td>${esc(item.is_number || '—')}</td><td>${item.pages || '—'}<small>${item.ocr_pages} OCR</small></td><td>${badge(item.status)}</td><td><div class="admin-actions">${item.status !== 'archived' ? `<button class="btn btn-secondary btn-sm" data-source="${esc(item.filename)}">Download source ↓</button><button class="btn btn-secondary btn-sm" data-archive="${esc(item.filename)}">Archive</button>` : `<button class="btn btn-secondary btn-sm" data-restore="${esc(item.filename)}">Restore</button>`}</div></td></tr>`))}
  <section class="card" style="margin-top:1.5rem"><h2>Index operations</h2><div id="admin-job-results">${jobRows(jobs)}</div></section>`;
}
async function activityPanel() {
  const data = await api('/admin/analyses?' + new URLSearchParams({q:query,offset,limit:20}));
  return `<div class="admin-filters">${search('Product, officer name or account ID')}</div>${table(['Product / analysis','Account','Created','Status','Recommendations','Generation'],data.items.map(item => `<tr><td><strong>${esc(item.product)}</strong><small>${esc(item.id)}</small></td><td>${esc(item.officer_name || item.owner)}<small>${esc(item.owner)}</small></td><td>${esc(date(item.created_at))}</td><td>${badge(item.status)}</td><td>${item.recommendations}</td><td>${esc(item.generation_mode)}</td></tr>`))}${pagination(data)}`;
}
async function auditPanel() {
  const data = await api('/admin/audit?' + new URLSearchParams({offset,limit:20}));
  return `<p class="admin-muted" style="margin-bottom:1rem">Administrative changes are recorded with the responsible account and timestamp. Passwords, API keys and session tokens are excluded.</p>${table(['Time','Administrator','Action','Target','Details'],data.items.map(item => `<tr><td>${esc(date(item.at))}</td><td>${esc(item.actor)}</td><td>${esc(item.action)}</td><td>${esc(item.target)}</td><td>${esc(item.details)}</td></tr>`))}${pagination(data)}`;
}
async function securityPanel() {
  summary = await api('/admin/overview', {timeout:20000});
  return `<div class="admin-grid"><section class="card"><h2>Services</h2><div class="admin-service"><span>Storage</span><strong>${esc(summary.database)}</strong></div><div class="admin-service"><span>Language model</span><strong>${esc(summary.llm_model)}</strong></div><div class="admin-service"><span>LLM credentials</span>${badge(summary.llm_configured ? 'configured' : 'not configured')}</div><div class="admin-service"><span>Embeddings</span><strong>${esc(summary.embedding_model)}</strong></div><p class="admin-muted">Configuration is read from the backend environment. Credentials are never sent to the browser.</p><div class="admin-actions"><button class="btn btn-secondary" data-action="test-llm">Test LLM connection</button><button class="btn btn-secondary" data-action="test-email">Test email service</button></div><p id="service-result" role="status"></p></section>
  <section class="card"><h2>Change your password</h2><form id="password-form" class="admin-form"><label for="current-password">Current password</label><input id="current-password" class="form-input" type="password" autocomplete="current-password" required><label for="new-password">New password</label><input id="new-password" class="form-input" type="password" autocomplete="new-password" minlength="12" required><label for="confirm-password">Confirm new password</label><input id="confirm-password" class="form-input" type="password" autocomplete="new-password" minlength="12" required><p class="admin-muted">Use at least 12 characters. This signs out other sessions and renews your current session.</p><button class="btn btn-primary">Update password</button><p id="password-status" role="status"></p></form></section></div>`;
}
const renderers = { overview, users:userPanel, standards:standardsPanel, activity:activityPanel, audit:auditPanel, security:securityPanel };
async function render({background=false} = {}) {
  const version = ++requestVersion;
  const state = JSON.stringify([activeTab,query,role,status,offset]);
  panel.setAttribute('aria-busy','true');
  if (!background && !panel.querySelector('#admin-search:focus')) panel.innerHTML = '<div class="admin-skeleton">Loading ' + sectionInfo[activeTab][0].toLowerCase() + '…</div>';
  try {
    const html = await renderers[activeTab]();
    if (version !== requestVersion || state !== JSON.stringify([activeTab,query,role,status,offset])) return;
    panel.innerHTML = html; bindPanel();
  } catch(error) { if (version === requestVersion) { panel.innerHTML = '<div class="card"><h2>Could not load data</h2><button class="btn btn-secondary" data-action="refresh">Try again</button></div>'; notify(error.message); } }
  finally { if (version === requestVersion) panel.removeAttribute('aria-busy'); }
}
function selectTab(tab, push = true) {
  if (!renderers[tab]) tab = 'overview';
  clearTimeout(timer);
  activeTab = tab; offset = 0; query = ''; role = ''; status = ''; notify('');
  if (push) history.pushState({}, '', '/pages/admin.html?section=' + tab);
  document.getElementById('admin-title').textContent = sectionInfo[tab][0];
  document.getElementById('admin-breadcrumb').textContent = sectionInfo[tab][0];
  document.getElementById('admin-subtitle').textContent = sectionInfo[tab][1];
  document.getElementById('admin-metrics').hidden = tab !== 'overview';
  document.querySelectorAll('#admin-tabs [data-tab]').forEach(link => { link.classList.toggle('active',link.dataset.tab === tab); if (link.dataset.tab === tab) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  return render();
}
window.addEventListener('popstate', () => selectTab(new URLSearchParams(location.search).get('section'), false));
function bindPanel() {
  const searchInput = document.getElementById('admin-search');
  searchInput?.addEventListener('input', () => { query = searchInput.value; offset = 0; clearTimeout(timer); timer = setTimeout(async () => { const cursor = searchInput.selectionStart; await render(); const input = document.getElementById('admin-search'); input?.focus(); if (input?.type !== 'search') input?.setSelectionRange(cursor,cursor); },300); });
  for (const id of ['admin-role','admin-status']) document.getElementById(id)?.addEventListener('change',event => { if (id === 'admin-role') role = event.target.value; else status = event.target.value; offset = 0; render(); });
  document.getElementById('standard-upload')?.addEventListener('submit', async event => {
    event.preventDefault(); const button = event.target.querySelector('button');
    const file = document.getElementById('admin-file').files[0]; if (!file) return;
    if (file.size > 20*1024*1024) { notify('Select a document no larger than 20 MB.'); return; }
    const body = new FormData(); body.append('file',file); button.disabled = true;
    try { const job = await api('/admin/standards/upload',{method:'POST',body}); notify(`Upload queued (${job.id}). Refresh the index operations list to check completion.`); await render(); } catch(error) { notify(error.message); button.disabled = false; }
  });
  document.getElementById('password-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const button = event.target.querySelector('button'); const result = document.getElementById('password-status');
    const password = document.getElementById('new-password').value;
    if (password !== document.getElementById('confirm-password').value) { result.textContent = 'The new passwords do not match.'; return; }
    button.disabled = true;
    try { const data = await api('/admin/password',{method:'POST',body:{current_password:document.getElementById('current-password').value,new_password:password}}); Storage.setToken(data.access_token); event.target.reset(); result.textContent = 'Password updated. Other sessions have been signed out.'; } catch(error) { result.textContent = error.message; } finally { button.disabled = false; }
  });
}
panel.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.view) { showOfficer(button.dataset.view); return; }
  if (button.dataset.source) { downloadSource(button); return; }
  if (button.dataset.goto) { selectTab(button.dataset.goto); return; }
  if (button.dataset.page) { offset = Math.max(0,offset + (button.dataset.page === 'next' ? 20 : -20)); render(); return; }
  if (button.dataset.action === 'create-user') { document.getElementById('user-create-form').reset(); document.getElementById('user-create-error').textContent = ''; document.getElementById('user-create-dialog').showModal(); return; }
  if (button.dataset.edit) {
    const user = users.find(u => u.id === button.dataset.edit); if (!user) return;
    for (const [key,value] of Object.entries({id:user.id,name:user.name,department:user.department,role:user.role,status:user.status,...Object.fromEntries(profileFields.map(k=>[k,user[k] || '']))})) document.getElementById('edit-user-'+key).value = value;
    document.getElementById('user-edit-error').textContent = ''; document.getElementById('user-dialog').showModal(); return;
  }
  if (button.dataset.action === 'refresh') { try { await metrics(); await render(); } catch(error) { notify(error.message); } return; }
  let endpoint;
  if (button.dataset.delete) { if (!confirm('Permanently delete this account? Active sessions will be revoked. Historical analyses and audit records are retained. This cannot be undone.')) return; endpoint = '/admin/users/' + encodeURIComponent(button.dataset.delete); }
  if (button.dataset.revoke) { if (!confirm('Sign this account out of all active sessions?')) return; endpoint = `/admin/users/${encodeURIComponent(button.dataset.revoke)}/revoke-sessions`; }
  if (button.dataset.archive) { if (!confirm('Archive this source document and remove it from new searches? You can restore it later.')) return; endpoint = `/admin/standards/${encodeURIComponent(button.dataset.archive)}/archive`; }
  if (button.dataset.restore) endpoint = `/admin/standards/${encodeURIComponent(button.dataset.restore)}/restore`;
  if (button.dataset.action === 'rebuild') endpoint = '/admin/index/rebuild';
  if (button.dataset.action === 'test-llm') endpoint = '/admin/health/llm';
  if (button.dataset.action === 'test-email') endpoint = '/admin/health/email';
  if (!endpoint) return;
  button.disabled = true;
  try {
    const data = await api(endpoint,{method:button.dataset.delete ? 'DELETE' : endpoint.endsWith('/email') ? 'GET' : 'POST'});
    if (endpoint.includes('/health/')) document.getElementById('service-result').textContent = `${data.status}: ${data.message}`;
    else { notify(data.id ? 'Operation queued. Refresh to see indexing progress.' : button.dataset.delete ? 'Account deleted.' : 'Sessions signed out.'); await metrics(); await render(); }
  } catch(error) { notify(error.message); } finally { button.disabled = false; }
});
document.querySelector('[data-close-dialog]').addEventListener('click',() => document.getElementById('user-dialog').close());
document.getElementById('user-edit-form').addEventListener('submit',async event => {
  event.preventDefault(); const button = event.target.querySelector('[type=submit]'); button.disabled = true;
  const value = key => document.getElementById('edit-user-'+key).value;
  try { await api('/admin/users/'+encodeURIComponent(value('id')),{method:'PATCH',body:{name:value('name'),department:value('department'),role:value('role'),status:value('status'),...Object.fromEntries(profileFields.map(k=>[k,value(k)]))}}); document.getElementById('user-dialog').close(); notify('Account updated.'); await metrics(); await render(); }
  catch(error) { document.getElementById('user-edit-error').textContent = error.message; } finally { button.disabled = false; }
});
workspaceReady.then(async allowed => {
  if (!allowed) return;
  const me = Storage.getUser();
  document.getElementById('admin-name').textContent = me.name;
  document.getElementById('admin-avatar').textContent = me.name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('');
  document.getElementById('admin-signout').addEventListener('click', async () => { try { await api('/admin/logout',{method:'POST'}); } finally { Storage.setToken(null); Storage.setUser(null); window.location.assign('/pages/admin-login.html'); } });
  document.getElementById('admin-tabs').addEventListener('click',event => { const tab=event.target.closest('[data-tab]'); if(tab) { event.preventDefault(); selectTab(tab.dataset.tab); } });
  document.getElementById('admin-refresh').addEventListener('click',async () => { try { await metrics(); await render(); notify('Data refreshed.'); } catch(error) { notify(error.message); } });
  try { await metrics(); await selectTab(new URLSearchParams(location.search).get('section'), false); } catch(error) { panel.innerHTML = '<div class="card"><h2>Unable to connect</h2><p>Check the server connection and refresh to try again.</p></div>'; notify(error.message); document.getElementById('admin-updated').textContent = 'Connection unavailable'; }
});

document.querySelector('[data-close-create]').addEventListener('click', () => document.getElementById('user-create-dialog').close());
document.getElementById('user-create-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.target.querySelector('[type=submit]'); button.disabled = true;
  const value = key => document.getElementById('create-user-' + key).value;
  try {
    await api('/admin/users', {method:'POST', body:{name:value('name'),email:value('email'),department:value('department'),password:value('password'),...Object.fromEntries(profileFields.map(k=>[k,value(k)]))}});
    event.target.reset(); document.getElementById('user-create-dialog').close(); notify('Officer account created. Share the credentials with the account owner securely.');
    await metrics(); await render();
  } catch (error) { document.getElementById('user-create-error').textContent = error.message; }
  finally { button.disabled = false; }
});

async function showOfficer(id) {
  const version = ++detailVersion;
  const dialog = document.getElementById('officer-detail');
  const content = document.getElementById('officer-detail-content');
  content.innerHTML = '<div class="admin-skeleton">Loading officer profile…</div>';
  dialog.showModal();
  try {
    const user = await api('/admin/users/' + encodeURIComponent(id), {timeout:15000});
    if (version !== detailVersion || !dialog.open) return;
    const details = [['Work email',user.email],['Phone',user.mobile_number],['Department',user.department],['Designation / cadre',user.cadre],['Officer / GeM ID',user.gem_officer_id],['Jurisdiction',user.jurisdiction_state],['Role',user.role],['Account status',user.status],['Email verification',user.email_verified?'Verified':'Awaiting verification'],['Registered',date(user.created_at)],['Last login',date(user.last_login_at)]];
    content.innerHTML = `<div class="admin-profile-heading"><span class="admin-avatar">${esc(user.name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join(''))}</span><div><h3>${esc(user.name)}</h3><p class="admin-muted">${esc(user.id)}</p></div></div><div class="admin-profile-stats"><div><strong>${user.analyses}</strong><span>Requirement analyses</span></div><div><strong>${user.active_sessions}</strong><span>Active sessions</span></div></div><dl class="admin-profile-details">${details.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value || 'Not provided')}</dd></div>`).join('')}</dl><h3>Recent requirement analyses</h3>${table(['Requirement','Created','Status'],user.recent_analyses.map(r=>`<tr><td>${esc(r.product)}</td><td>${esc(date(r.created_at))}</td><td>${badge(r.status)}</td></tr>`))}`;
  } catch(error) { if (version === detailVersion) content.textContent = error.message; }
}
document.getElementById('close-officer-detail').addEventListener('click', () => { detailVersion++; document.getElementById('officer-detail').close(); });
async function downloadSource(button) {
  button.disabled = true;
  try {
    const response = await fetch(API_BASE + '/admin/standards/' + encodeURIComponent(button.dataset.source) + '/source', {headers:{Authorization:'Bearer '+Storage.getToken()}, signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error('Could not download the source document. Check your session and try again.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = button.dataset.source; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  } catch(error) { notify(error.message); }
  finally { button.disabled = false; }
}

let refreshing = false;
setInterval(async () => {
  if (document.hidden || refreshing || document.querySelector('dialog[open]') || panel.hasAttribute('aria-busy')) return;
  if (activeTab !== 'overview' && activeTab !== 'standards') return;
  refreshing = true;
  try {
    if (activeTab === 'overview') { await metrics(); if (activeTab === 'overview' && !panel.contains(document.activeElement)) await render({background:true}); }
    else { const jobs = await api('/admin/jobs', {timeout:10000}); const target = document.getElementById('admin-job-results'); if (target) target.innerHTML = jobRows(jobs); }
  } catch { document.getElementById('admin-updated').textContent = 'Refresh unavailable · retry'; }
  finally { refreshing = false; }
}, 30000);
