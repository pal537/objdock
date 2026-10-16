/* ObjDock SPA — vanilla JS, no frameworks. */
'use strict';

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

const state = {
  user: null,
  accounts: [],
  accountId: null,
  bucket: '',
  prefix: '',
  view: localStorage.getItem('objdock_view') || 'grid',
  thumbSize: localStorage.getItem('objdock_thumb') || 'medium',
  sort: localStorage.getItem('objdock_sort') || 'time-desc',
  selectMode: false,
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  move: '<path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/>',
  settings: {},
  statsCache: {},
};


/* ---------- SVG icon set (linear, 24x24, stroke=currentColor) ---------- */
const _P = {
  anchor: '<circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="22"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>',
  text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  folderOpen: '<path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.8 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  folderPlus: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6M9 13h6"/>',
  bucket: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  box: '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.29 7 12 12l8.71-5M12 22V12"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><line x1="21" y1="12" x2="9" y2="12"/>',
  drive: '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><line x1="12" y1="15" x2="12" y2="3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  layers: '<path d="m12 2 8.5 4.5L12 11 3.5 6.5 12 2z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 17 8.5 4.5 8.5-4.5"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
};
function ic(n, size) {
  const s = size || 18;
  return `<svg class="ic-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_P[n] || _P.file}</svg>`;
}

/* ---------- tiny helpers ---------- */
function fmtSize(b) {
  if (b == null) return '-';
  if (b < 1024) return b + ' B';
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1, v = b;
  do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
  return v.toFixed(1) + ' ' + u[i];
}
function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleString('zh-CN', { hour12: false });
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => t.hidden = true, ms || 2600);
}
async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || ('请求失败(' + r.status + ')'));
  return d;
}
const apiGet = (u) => api('GET', u);
const apiPost = (u, b) => api('POST', u, b);
const apiPut = (u, b) => api('PUT', u, b);
const apiDelete = (u) => api('DELETE', u);
const apiDel = (u) => api('DELETE', u);

/* ---------- modal helpers ---------- */
let confirmCb = null, promptCb = null;
function askConfirm(title, msg, okText, cb) {
  $('#confirmTitle').textContent = title;
  $('#confirmMsg').textContent = msg;
  $('#confirmOk').textContent = okText || t('common.confirm');
  confirmCb = cb;
  $('#confirmModal').hidden = false;
}
$('#confirmCancel').onclick = () => { $('#confirmModal').hidden = true; confirmCb = null; };
$('#confirmOk').onclick = () => { $('#confirmModal').hidden = true; if (confirmCb) confirmCb(); confirmCb = null; };
function askPrompt(title, msg, def, cb) {
  $('#promptTitle').textContent = title;
  $('#promptMsg').textContent = msg || '';
  $('#promptInput').value = def || '';
  promptCb = cb;
  $('#promptModal').hidden = false;
  setTimeout(() => $('#promptInput').focus(), 50);
}
function askForm(title, fields, onOk) {
  const modal = $('#promptModal');
  modal.querySelector('h3').textContent = title;
  const body = $('#promptBody');
  body.innerHTML = fields.map((f, i) => `
    <label class="fld"><span>${esc(f.label)}</span>
      <input class="input" id="af-${i}" type="${f.type || 'text'}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}">
    </label>`).join('') + `
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn" id="afCancel">取消</button>
      <button class="btn btn-primary" id="afOk">确认</button>
    </div>`;
  $('#promptModal').hidden = false;
  $('#afCancel').onclick = () => { $('#promptModal').hidden = true; };
  $('#afOk').onclick = () => {
    const vals = {};
    fields.forEach((f, i) => { vals[f.key] = $('#af-' + i).value; });
    $('#promptModal').hidden = true;
    onOk(vals);
  };
}
$('#promptCancel').onclick = () => { $('#promptModal').hidden = true; promptCb = null; };
$('#promptOk').onclick = () => {
  $('#promptModal').hidden = true;
  const v = $('#promptInput').value;
  if (promptCb) promptCb(v);
  promptCb = null;
};
$('#promptInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#promptOk').click(); });

/* ---------- auth view ---------- */
function renderAuth(mode) {
  mode = mode || 'login';
  $('#app').innerHTML = `
  <div class="auth-wrap"><div class="auth-card">
    <div class="logo">${ic('anchor', 30)}</div>
    <h1>ObjDock</h1>
    <div class="sub">${t('brand.tagline')}</div>
    <div class="auth-tabs">
      <button id="tabLogin" class="${mode === 'login' ? 'active' : ''}">登录</button>
      <button id="tabReg" class="${mode === 'register' ? 'active' : ''}">注册</button>
    </div>
    <div id="authForm"></div>
  </div></div>`;
  $('#tabLogin').onclick = () => renderAuth('login');
  $('#tabReg').onclick = () => renderAuth('register');
  renderAuthForm(mode);
}
function renderAuthForm(mode) {
  const isLogin = mode === 'login';
  $('#authForm').innerHTML = `
    ${isLogin ? '' : '<div id="firstAdminHint" hidden style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:12px">' + t('auth.firstAdmin') + '</div>'}
    <label class="fld"><span>用户名</span><input class="input" id="aUser" autocomplete="username"></label>
    <label class="fld"><span>密码${isLogin ? '' : '（至少 8 位，字母+数字）'}</span><input class="input" id="aPass" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}"></label>
    ${isLogin ? '' : '<label class="fld"><span>确认密码</span><input class="input" id="aPass2" type="password" autocomplete="new-password"></label>'}
    ${isLogin ? '' : `<label class="fld"><span>语言 / Language</span><select class="input" id="aLang">
      <option value="en" selected>English</option>
      <option value="zh-CN">简体中文</option>
      <option value="ja">日本語</option>
      <option value="ko">한국어</option>
      <option value="es">Español</option>
    </select></label>`}
    ${isLogin ? '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;margin:4px 0 12px;font-size:14px"><input type="checkbox" id="aRemember" checked style="width:16px;height:16px"> ' + t('auth.remember') + '</label>' : ''}
    <button class="btn btn-primary" id="aGo" style="width:100%;padding:11px">${isLogin ? t('auth.login') : t('auth.register')}</button>
    <div id="aErr" class="muted" style="color:#ef4444;margin-top:10px;text-align:center"></div>`;
  if (!isLogin) {
    apiGet('/api/setup-status').then(d => {
      if (d.needsSetup) $('#firstAdminHint').hidden = false;
    }).catch(() => {});
  }
  const go = async () => {
    const u = $('#aUser').value.trim(), p = $('#aPass').value;
    if (!u || !p) { $('#aErr').textContent = t('auth.inputUserPass'); return; }
    try {
      if (isLogin) {
        const remember = $('#aRemember').checked;
        await apiPost('/api/login', { username: u, password: p, remember });
      } else {
        const p2 = $('#aPass2').value;
        if (p !== p2) { $('#aErr').textContent = t('auth.passMismatch'); return; }
        if (p.length < 8) { $('#aErr').textContent = t('auth.pwdMin'); return; }
        const lang = ($('#aLang') && $('#aLang').value) || 'en';
        await apiPost('/api/register', { username: u, password: p, language: lang });
        setLang(lang);
      }
      await boot();
    } catch (e) { $('#aErr').textContent = e.message; }
  };
  $('#aGo').onclick = go;
  $('#authForm').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

/* ---------- app shell ---------- */
function iconFor(kind, name) {
  const m = { image: ic('image'), video: ic('video'), audio: ic('audio'), pdf: ic('pdf'), text: ic('text'), archive: ic('archive'), office: ic('sheet'), file: ic('file'), folder: ic('folder') };
  return m[kind] || m.file;
}
function renderShell() {
  const u = state.user;
  $('#app').innerHTML = `
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo-ic">${ic('anchor')}</div>
        <div><div class="t">ObjDock</div><div class="s">${t('brand.subtitle')}</div></div>
      </div>
      <div class="nav-item active" data-nav="dash">${ic('dash')}<span>${t('nav.dashboard')}</span></div>
      <div class="nav-item" data-nav="files">${ic('folder')}<span>${t('nav.files')}</span></div>
      <div class="nav-sec">${t('nav.folders')}</div>
      <div id="sideFolders"></div>
      <div class="nav-sec" style="display:flex;align-items:center;justify-content:space-between">
        <span>${t('nav.uploadLinks')}</span><span id="ulCount" style="font-size:11px;opacity:.6"></span>
      </div>
      <div id="sideUlLinks"></div>
      <div class="side-foot">
        <div class="storage-switch" id="switcher">
          <div class="avatar" id="swAvatar">${ic('bucket')}</div>
          <div><div class="sname" id="swName">选择账户</div><div class="ssub" id="swSub">点击切换</div></div>
        </div>
        <div class="nav-item" data-nav="settings">${ic('settings')}<span>${t('nav.settings')}</span></div>
        <div class="acct-card" id="acctCard">
          <div class="avatar">${esc(u.username[0].toUpperCase())}</div>
          <div style="flex:1"><div class="sname">${esc(u.username)}</div></div>
          <button id="themeBtn" title="${t('theme.toggle')}" style="background:none;border:none;cursor:pointer;padding:6px;display:flex;align-items:center"></button>
        </div>
      </div>
    </aside>
    <main class="main" id="main"></main>
  </div>
  <div class="dropdown" id="dropdown" hidden></div>`;
  $$('.nav-item[data-nav]').forEach(el => el.onclick = () => nav(el.dataset.nav));
  $('#switcher').onclick = (e) => { e.stopPropagation(); toggleSwitcher(); };
  const tb = $('#themeBtn');
  const moonSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  window.updateThemeBtn = () => {
    const btn = $('#themeBtn');
    if (btn) { btn.innerHTML = document.documentElement.dataset.theme === 'dark' ? sunSvg : moonSvg; btn.style.color = 'inherit'; }
  };
  if (tb) {
    window.updateThemeBtn();
    tb.onclick = (e) => { e.stopPropagation(); toggleTheme(); window.updateThemeBtn(); };
  }
  $('#acctCard').onclick = (e) => { e.stopPropagation(); toggleAcctMenu(); };
  document.addEventListener('click', () => { $('#dropdown').hidden = true; });
  updateSwitcherLabel();
}
// 深色模式
function initTheme() {
  const t = localStorage.getItem('objdock-theme') || 'light';
  document.documentElement.dataset.theme = t;
}
function toggleTheme() {
  const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = cur;
  localStorage.setItem('objdock-theme', cur);
}
function nav(which) {
  setTimeout(initDragUpload, 100);
  $$('.nav-item[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === which));
  $('#dropdown').hidden = true;
  if (which === 'dash') renderDash();
  else if (which === 'files') renderFiles();
  else if (which === 'settings') renderSettings();
}

/* ---------- account/bucket switcher ---------- */
function updateSwitcherLabel() {
  const a = state.accounts.find(x => x.id === state.accountId);
  $('#swName').textContent = a ? a.name : '选择账户';
  $('#swSub').textContent = a ? (state.bucket || '选择存储桶') : '点击切换';
  const av = $('#swAvatar');
  if (av) av.innerHTML = a ? providerLogo(a.provider, 20) : ic('bucket');
}
function toggleSwitcher() {
  const dd = $('#dropdown');
  if (!dd.hidden) { dd.hidden = true; return; }
  const r = $('#switcher').getBoundingClientRect();
  dd.style.left = r.left + 'px';
  dd.style.top = ''; dd.style.bottom = '';
  dd.style.visibility = 'hidden'; dd.hidden = false;
  let html = '<div class="dsec">账户</div>';
  if (!state.accounts.length) html += '<div class="di" onclick="nav(\'settings\')">' + t('account.goAdd') + '</div>';
  state.accounts.forEach(a => {
    html += `<div class="di ${a.id === state.accountId ? 'sel' : ''}" data-acct="${a.id}">${providerLogo(a.provider, 16)} ${esc(a.name)}</div>`;
  });
  html += '<div class="dsec">' + t('nav.folders') + '</div><div id="ddBuckets"><div class="di muted">' + t('account.selectFirst') + '</div></div>';
  dd.innerHTML = html;
  // 向上弹出：先显示测量高度，再定位到切换器上方
  const h = dd.offsetHeight;
  let top = r.top - h - 8;
  if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - h - 8); // 空间不足则向下
  dd.style.top = Math.max(8, top) + 'px';
  dd.style.visibility = '';
  $$('[data-acct]', dd).forEach(el => el.onclick = async (e) => {
    e.stopPropagation();
    await selectAccount(parseInt(el.dataset.acct, 10));
    toggleSwitcherRefreshBuckets();
    await loadSideFolders();
    await loadSideUlLinks();
    if (state.view === 'dash') renderDash();
    else if (state.view === 'files') loadFiles();
  });
  if (state.accountId) toggleSwitcherRefreshBuckets();
}
async function toggleSwitcherRefreshBuckets() {
  const box = $('#ddBuckets');
  if (!box) return;
  box.innerHTML = '<div class="di muted">' + t('common.loading') + '</div>';
  try {
    const d = await apiGet(`/api/accounts/${state.accountId}/buckets`);
    const cur = state.accounts.find(x => x.id === state.accountId);
    let names = d.buckets.map(b => b.name);
    if (cur && cur.bucket && !names.includes(cur.bucket)) names.unshift(cur.bucket);
    box.innerHTML = names.map(n =>
      `<div class="di ${n === state.bucket ? 'sel' : ''}" data-bucket="${esc(n)}">${ic('box', 15)} ${esc(n)}</div>`).join('')
      || '<div class="di muted">' + t('account.noBucket') + '</div>';
    $$('[data-bucket]', box).forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      state.bucket = el.dataset.bucket; state.prefix = '';
      $('#dropdown').hidden = true;
      updateSwitcherLabel(); loadSideFolders();
      const active = $('.nav-item.active');
      nav(active ? active.dataset.nav : 'dash');
    });
  } catch (e) { box.innerHTML = `<div class="di muted">加载失败：${esc(e.message)}</div>`; }
}
async function selectAccount(id) {
  state.accountId = id; state.bucket = ''; state.prefix = '';
  try { localStorage.setItem('objdock-account', String(id)); } catch (e) {}
  const a = state.accounts.find(x => x.id === id);
  if (a && a.bucket) state.bucket = a.bucket;
  else {
    try {
      const d = await apiGet(`/api/accounts/${id}/buckets`);
      if (d.buckets.length === 1) state.bucket = d.buckets[0].name;
    } catch (e) { /* ignore */ }
  }
  updateSwitcherLabel();
}
function toggleAcctMenu() {
  const dd = $('#dropdown');
  if (!dd.hidden) { dd.hidden = true; return; }
  const r = $('#acctCard').getBoundingClientRect();
  dd.style.left = r.left + 'px'; dd.style.top = (r.top - 130) + 'px';
  dd.innerHTML = `
    <div class="di" id="mProfile">${ic('user')}${t('account.editProfile')}</div>
    <div class="di" id="mLogout">${ic('logout')}退出登录</div>`;
  dd.hidden = false;
  $('#mProfile').onclick = (e) => { e.stopPropagation(); dd.hidden = true; renderProfile(); };
  $('#mLogout').onclick = async (e) => { e.stopPropagation(); await apiPost('/api/logout'); location.reload(); };
}

/* ---------- dashboard ---------- */
const DONUT_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#64748b', '#ec4899', '#14b8a6'];
async function renderDash() {
  const main = $('#main');
  if (!state.accountId || !state.bucket) {
    main.innerHTML = `<div class="card"><h3>${ic('dash')}${t('nav.dashboard')}</h3>
      <div class="empty"><div class="big">${ic('bucket', 56)}</div>
      ${state.accounts.length ? t('empty.noAccount') : t('empty.addFirst')}
      </div></div>`;
    return;
  }
  // 桶快速切换条：所有账户的所有桶
  let bucketBar = '';
  if (state.accounts.length) {
    const chips = [];
    state.accounts.forEach(a => {
      const buckets = (a.bucket || '').split(',').map(b => b.trim()).filter(Boolean);
      if (!buckets.length) buckets.push('');
      buckets.forEach(b => {
        const active = (a.id === state.accountId && b === state.bucket) ? ' active' : '';
        const logo = providerLogo(a.provider, 16);
        chips.push(`<button class="bucket-chip${active}" data-acct="${a.id}" data-bucket="${esc(b)}">
          <span class="bc-acct">${logo}<span style="margin-left:5px">${esc(a.name)}</span></span><span class="bc-bucket">${esc(b || '默认桶')}</span>
        </button>`);
      });
    });
    if (chips.length > 1) bucketBar = `<div class="bucket-bar">${chips.join('')}</div>`;
  }
  main.innerHTML = `<div class="topbar"><h2>${ic('dash')}${t('nav.dashboard')}</h2><div class="spacer"></div>
    <button class="btn btn-sm" id="dashRefresh">↻ 重新统计</button></div>
    ${bucketBar}
    <div id="dashBody"><div class="empty">${t('dash.statistics')}</div></div>`;
  // 绑定切换
  $$('.bucket-chip', main).forEach(btn => btn.onclick = async () => {
    const aid = parseInt(btn.dataset.acct, 10);
    const bkt = btn.dataset.bucket;
    if (aid === state.accountId && bkt === state.bucket) return;
    await selectAccount(aid);
    if (bkt) state.bucket = bkt;
    updateSwitcherLabel();
    await loadSideFolders();
    await loadSideUlLinks();
    renderDash();
  });
  $('#dashRefresh').onclick = () => { delete state.statsCache[state.accountId + '/' + state.bucket]; renderDash(); };
  await refreshAccounts();
  // 配额卡片独立显示，不依赖统计接口成败
  const acct = state.accounts.find(x => x.id === state.accountId) || {};
  const quota = acct.quotaBytes || 0;
  if (quota > 0) {
    const qb = `<div class="card" id="quotaCard"><h3>${ic('drive')}${t('dash.quota')}</h3>
      <p class="desc">配额 ${fmtSize(quota)} · 正在统计使用量…</p></div>`;
    $('#dashBody').innerHTML = qb;
  }
  await loadDash(quota);
}
async function loadDash(quota) {
  quota = quota || 0;
  const key = state.accountId + '/' + state.bucket;
  let d = state.statsCache[key];
  if (!d) {
    try { d = await apiGet(`/api/accounts/${state.accountId}/stats?bucket=${encodeURIComponent(state.bucket)}`); }
    catch (e) {
      // 统计失败时仍显示配额卡片（如果已设置）
      const acct = state.accounts.find(x => x.id === state.accountId) || {};
      const q = acct.quotaBytes || quota;
      if (q > 0) {
        $('#dashBody').innerHTML = `<div class="card"><h3>${ic('drive')}${t('dash.quota')}</h3>
          <p class="desc">配额 ${fmtSize(q)} · 使用量统计失败（${esc(e.message)}）</p></div>`;
      } else {
        $('#dashBody').innerHTML = `<div class="empty">统计失败：${esc(e.message)}</div>`;
      }
      return;
    }
    state.statsCache[key] = d;
  }
  const maxF = Math.max(...d.byFolder.map(x => x.value), 1);
  const typeTotal = d.byType.reduce((s, x) => s + x.value, 0) || 1;
  // donut segments
  let acc = 0;
  const segs = d.byType.map((t, i) => {
    const frac = t.value / typeTotal, a0 = acc * 2 * Math.PI, a1 = (acc + frac) * 2 * Math.PI;
    acc += frac;
    const r = 54, cx = 70, cy = 70;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `<path d="M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${cx},${cy} Z" fill="${DONUT_COLORS[i % 8]}"/>`;
  }).join('');
  // 活跃度：近 30 天柱状图
  const act = d.activity || {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let bars = '', maxAct = 1, totalAct = 0;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - i);
    const k = dt.toISOString().slice(0, 10);
    const c = act[k] || 0;
    days.push({ k, c, label: (dt.getMonth() + 1) + '/' + dt.getDate() });
    if (c > maxAct) maxAct = c;
    totalAct += c;
  }
  bars = days.map(x => {
    const h = Math.max(4, (x.c / maxAct * 100));
    const bg = x.c === 0 ? '#eef2f7' : x.c === maxAct && maxAct > 1 ? '#2563eb' : '#93c5fd';
    return `<div class="ab" style="height:${h.toFixed(0)}%;background:${bg}"><span class="tip">${x.k} · ${x.c} 个文件变动</span></div>`;
  }).join('');
  // trend line
  const trend = d.trend || [];
  let trendSvg = '<div class="muted">暂无历史数据（每天访问仪表盘一次，攒够 2 天数据后生成趋势）</div>';
  const validTrend = trend.filter(p => p.day && typeof p.totalSize === 'number');
  if (validTrend.length >= 2) {
    const max = Math.max(...validTrend.map(p => p.totalSize), 1);
    const W = 600, H = 110, pts = validTrend.map((p, i) =>
      `${(i / (validTrend.length - 1) * W).toFixed(1)},${(H - 8 - (p.totalSize / max) * (H - 20)).toFixed(1)}`).join(' ');
    trendSvg = `<svg class="trend" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:110px;display:block">
      <polyline points="${pts}" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>
      <div class="muted">${esc(validTrend[0].day)} → ${esc(validTrend[validTrend.length - 1].day)}，${fmtSize(validTrend[0].totalSize)} → ${fmtSize(validTrend[validTrend.length - 1].totalSize)}</div>`;
  }
  const acct = state.accounts.find(x => x.id === state.accountId) || {};
  quota = acct.quotaBytes || quota || 0;
  let quotaHtml = '';
  if (quota > 0) {
    const pct = Math.min(100, (d.totalSize / quota * 100));
    const left = Math.max(0, quota - d.totalSize);
    const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6';
    quotaHtml = `<div class="card"><h3>${ic('drive')}${t('dash.quota')}</h3>
      <p class="desc">已用 ${fmtSize(d.totalSize)} / 总计 ${fmtSize(quota)}（${pct.toFixed(1)}%），剩余 ${fmtSize(left)}</p>
      <div style="height:12px;background:#f1f5f9;border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:${barColor};border-radius:6px;transition:width .5s ease"></div>
      </div></div>`;
  }
  $('#dashBody').innerHTML = quotaHtml + `
    <div class="stat-grid">
      <div class="stat"><div class="ic" style="background:#dbeafe;color:#2563eb">${ic('drive')}</div><div><div class="v">${fmtSize(d.totalSize)}</div><div class="l">${t('dash.totalStorage')}</div><div class="s">${d.truncated ? '约 ' : ''}${d.fileCount} 个文件${d.truncated ? '（仅扫描前 ' + d.scanned + ' 个）' : ''}</div></div></div>
      <div class="stat"><div class="ic" style="background:#ede9fe;color:#7c3aed">${ic('file')}</div><div><div class="v">${d.fileCount}</div><div class="l">${t('dash.files')}</div><div class="s">文件夹 ${d.byFolder.length} 个</div></div></div>
      <div class="stat"><div class="ic" style="background:#fef3c7;color:#d97706">${ic('layers')}</div><div><div class="v">${fmtSize(d.avgSize)}</div><div class="l">${t('dash.avgSize')}</div><div class="s">最大 ${fmtSize(d.largest.size)}</div></div></div>
      <div class="stat"><div class="ic" style="background:#dcfce7;color:#059669">${ic('clock')}</div><div><div class="v">${d.weekCount}</div><div class="l">${t('dash.recent7')}</div><div class="s">最活跃 ${Object.keys(act).sort().pop() || '-'}</div></div></div>
    </div>
    <div class="panels">
      <div class="panel"><h4>${t('dash.byFolder')}</h4>
        ${d.byFolder.map(f => `<div class="bar-row"><span class="bn" title="${esc(f.name)}">${esc(f.name)}</span>
          <span class="bt"><span class="bf" style="display:block;width:${(f.value / maxF * 100).toFixed(1)}%"></span></span>
          <span class="bv">${fmtSize(f.value)}</span></div>`).join('') || '<div class="muted">无数据</div>'}
      </div>
      <div class="panel"><h4>${t('dash.byType')}</h4><div class="donut-wrap">
        <svg width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="54" fill="#f1f5f9"/>${segs}
          <text x="70" y="66" text-anchor="middle" font-size="13" font-weight="700">${fmtSize(d.totalSize)}</text>
          <text x="70" y="84" text-anchor="middle" font-size="11" fill="#8a94a6">总计</text></svg>
        <div class="legend">${d.byType.map((t, i) =>
          `<div class="lr"><span class="dot" style="background:${DONUT_COLORS[i % 8]}"></span>${esc(t.name)}
           <span class="muted">${fmtSize(t.value)} ${(t.value / typeTotal * 100).toFixed(0)}%</span></div>`).join('')}
        </div></div>
      </div>
    </div>
    <div class="card"><h3>${ic('trend')}${t('dash.trend')}</h3><p class="desc">${t('dash.trendDesc')}</p>${trendSvg}</div>
    <div class="card"><h3>${ic('calendar')}${t('dash.activity')}</h3>
      <p class="desc">每天有文件新增或修改的天数统计，共 ${totalAct} 次变动</p>
      <div class="activity-chart">${bars}</div>
      <div class="activity-legend"><span>${days[0].label}</span><span>${days[29].label}</span></div></div>
    ${quota > 0 ? '' : `<div class="card"><h3>${ic('drive')}存储空间说明</h3>
      <p class="desc" style="margin-bottom:0">S3 兼容协议（R2 / OSS / COS / MinIO）不提供查询总配额的接口，因此无法自动显示「总空间 / 剩余空间」。
      可在设置 → 编辑账户中手动填写空间配额，仪表盘即会显示使用率。</p></div>`}`;
}

/* ---------- file browser ---------- */
let selKeys = new Set();
async function renderFiles() {
  const main = $('#main');
  if (!state.accountId || !state.bucket) {
    main.innerHTML = `<div class="card"><h3>${ic('folder')}全部文件</h3>
      <div class="empty"><div class="big">${ic('bucket', 56)}</div>${t('empty.noAccount')}</div></div>`;
    return;
  }
  selKeys = new Set();
  main.innerHTML = `
    <div class="topbar"><h2>${ic('folder')}${t('nav.files')}</h2><div class="spacer"></div>
      <input class="input input-sm" id="searchInput" placeholder="${t('file.search')}" style="width:180px">
      <select class="input input-sm" id="sortSel" title="排序">
        <option value="time-desc">${t('sort.timeDesc')}</option>
        <option value="time-asc">${t('sort.timeAsc')}</option>
        <option value="size-desc">${t('sort.sizeDesc')}</option>
        <option value="size-asc">${t('sort.sizeAsc')}</option>
        <option value="name-asc">${t('sort.nameAsc')}</option>
        <option value="name-desc">${t('sort.nameDesc')}</option>
      </select>
      <div class="view-toggle" id="sizeSeg">
        <button data-sz="small" class="${state.thumbSize === 'small' ? 'active' : ''}">${t('size.small')}</button>
        <button data-sz="medium" class="${state.thumbSize === 'medium' ? 'active' : ''}">${t('size.medium')}</button>
        <button data-sz="large" class="${state.thumbSize === 'large' ? 'active' : ''}">${t('size.large')}</button>
      </div>
      <div class="view-toggle">
        <button id="vGrid" class="${state.view === 'grid' ? 'active' : ''}">${ic('grid', 15)}${t('view.grid')}</button>
        <button id="vList" class="${state.view === 'list' ? 'active' : ''}">${ic('list', 15)}${t('view.list')}</button>
      </div>
      <button class="btn btn-sm" id="btnSelect">${ic('check', 15)}${t('common.select')}</button>
      <button class="btn btn-sm" id="btnUpload">${ic('upload', 15)}${t('common.upload')}</button>
      <button class="btn btn-sm" id="btnUpLink" title="生成公开上传链接，别人无需登录可上传文件到此目录">${t('nav.uploadLinks')}</button>
      <button class="btn btn-sm" id="btnMkdir">${ic('folderPlus', 15)}${t('file.newFolderBtn')}</button>
      <button class="btn btn-sm" id="btnRefresh">↻</button>
    </div>
    <div class="crumbs" id="crumbs"></div>
    <div class="toolbar" id="selBar" hidden>
      <span id="selCount"></span>
      <button class="btn btn-sm" id="btnSelAll">${t('file.selectAll')}</button>
      <button class="btn btn-sm" id="btnDlSel">${ic('download', 15)}${t('file.downloadSelected')}</button>
      <button class="btn btn-sm" id="btnShareSel">${ic('share', 15)}${t('file.shareSelected')}</button>
      <button class="btn btn-sm" id="btnDelSel">${ic('trash', 15)}${t('file.deleteSelected')}</button>
      <button class="btn btn-sm" id="btnClearSel">${t('file.exitSelect')}</button>
    </div>
    <div id="fileBody"><div class="empty">${t('common.loading')}</div></div>`;
  $('#vGrid').onclick = () => setView('grid');
  $('#vList').onclick = () => setView('list');
  $('#btnUpload').onclick = () => $('#filePicker').click();
  $('#btnMkdir').onclick = () => {
    $('#promptInput').placeholder = '例如：我的照片';
    askPrompt(t('file.newFolder'), '在当前目录下创建一个新文件夹', '', async (v) => {
    v = v.trim().replace(/\//g, '');
    if (!v) return;
    try {
      await apiPost(`/api/accounts/${state.accountId}/mkdir`, { bucket: state.bucket, path: state.prefix + v });
      toast('已创建'); loadFiles();
    } catch (e) { toast('创建失败：' + e.message); }
    });
  };
  $('#btnRefresh').onclick = () => loadFiles();
  $('#btnUpLink').onclick = () => openUploadLinkModal();
  let searchTimer = null;
  $('#searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (!q) { loadFiles(); return; }
    searchTimer = setTimeout(() => doSearch(q), 500);
  });
  $('#searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.target.value = ''; loadFiles(); }
  });
  $('#btnShareSel').onclick = () => {
    const keys = [...selKeys].filter(k => !k.endsWith('/'));
    if (!keys.length) { toast('请选择要分享的文件'); return; }
    openShareMulti(keys);
  };
  $('#btnDlSel').onclick = async () => {
    const keys = [...selKeys].filter(k => !k.endsWith('/'));
    if (!keys.length) { toast('所选没有可下载的文件'); return; }
    if (keys.length === 1) { await downloadFile(keys[0], keys[0].split('/').pop()); return; }
    // 多文件：浏览器端打包 zip
    const modal = $('#uploadModal'), list = $('#uploadList');
    list.innerHTML = '';
    modal.querySelector('h3').textContent = t('file.batchDownload');
    $('#uploadModal').hidden = false;
    const row = document.createElement('div');
    row.style.cssText = 'padding:12px 0';
    row.innerHTML = `<div style="margin-bottom:8px">正在打包 ${keys.length} 个文件…</div>
      <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
        <div class="ufill" style="height:100%;width:0;background:#3b82f6;transition:width .2s"></div></div>
      <div class="ust" style="font-size:12px;color:#64748b;margin-top:6px"></div>`;
    list.appendChild(row);
    const fill = row.querySelector('.ufill'), st = row.querySelector('.ust');
    try {
      const p = await apiPost(`/api/accounts/${state.accountId}/presign-batch`,
        { bucket: state.bucket, keys, op: 'download', expires: 600 });
      const urls = p.urls || {};
      const zip = new JSZip();
      let n = 0;
      for (const key of keys) {
        const url = urls[key];
        if (!url) continue;
        const name = key.split('/').pop();
        st.textContent = `下载中：${name} (${n + 1}/${keys.length})`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`下载 ${name} 失败：HTTP ${resp.status}`);
        zip.file(name, await resp.blob());
        n++;
        fill.style.width = Math.round(n / keys.length * 100) + '%';
      }
      st.textContent = '正在生成 zip…';
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `objdock-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
      $('#uploadModal').hidden = true;
      modal.querySelector('h3').textContent = '上传文件';
      toast(`已打包下载 ${n} 个文件`);
    } catch (e) {
      st.textContent = '失败：' + e.message;
      st.style.color = '#dc2626';
    }
  };
  $('#btnDelSel').onclick = deleteSelected;
  $('#btnClearSel').onclick = () => {
    state.selectMode = false; selKeys.clear();
    const g = $('.fgrid');
    if (g) {
      g.classList.remove('selecting');
      $$('.fitem.sel', g).forEach(el => el.classList.remove('sel'));
      $$('.fitem .check', g).forEach(cb => cb.checked = false);
      $('#btnSelect').classList.remove('active');
      $('#btnSelAll').textContent = t('file.selectAll');
      updateSelBar();
    } else { loadFiles(); }
  };
  $('#btnSelAll').onclick = () => {
    const boxes = $$('#fileBody [data-check]');
    const all = boxes.map(cb => cb.dataset.check);
    const every = all.length > 0 && all.every(k => selKeys.has(k));
    boxes.forEach(cb => {
      const k = cb.dataset.check;
      every ? selKeys.delete(k) : selKeys.add(k);
      cb.checked = !every;
      const card = cb.closest('.fitem'); if (card) card.classList.toggle('sel', !every);
    });
    $('#btnSelAll').textContent = every ? t('file.selectAll') : '全不选';
    updateSelBar();
  };
  $('#sortSel').value = state.sort;
  $('#sortSel').onchange = (e) => { state.sort = e.target.value; localStorage.setItem('objdock_sort', state.sort); loadFiles(); };
  $$('#sizeSeg button').forEach(b => b.onclick = () => {
    state.thumbSize = b.dataset.sz; localStorage.setItem('objdock_thumb', state.thumbSize);
    $$('#sizeSeg button').forEach(x => x.classList.toggle('active', x === b));
    const g = $('.fgrid'); if (g) g.className = 'fgrid sz-' + state.thumbSize[0];
  });
  const bs = $('#btnSelect');
  bs.classList.toggle('active', state.selectMode);
  bs.onclick = () => {
    state.selectMode = !state.selectMode;
    selKeys.clear();
    const g = $('.fgrid');
    if (g) {
      // 缩略图视图：CSS 切换，不重建 DOM，图片不重载
      g.classList.toggle('selecting', state.selectMode);
      $$('.fitem.sel', g).forEach(el => el.classList.remove('sel'));
      $$('.fitem .check', g).forEach(cb => cb.checked = false);
    } else {
      // 列表视图：轻量重渲染（无图片，无重载成本）
      loadFiles(); return;
    }
    bs.classList.toggle('active', state.selectMode);
    updateSelBar();
  };
  await loadFiles();
}
function setView(v) {
  state.view = v; localStorage.setItem('objdock_view', v);
  $('#vGrid').classList.toggle('active', v === 'grid');
  $('#vList').classList.toggle('active', v === 'list');
  loadFiles();
}
function crumbsHtml() {
  const parts = state.prefix.split('/').filter(Boolean);
  let h = `<span class="c" data-p="">${ic('box', 15)}${esc(state.bucket)}</span>`;
  let acc = '';
  parts.forEach(p => {
    acc += p + '/';
    h += `<span class="sep">›</span><span class="c" data-p="${esc(acc)}">${esc(p)}</span>`;
  });
  return h;
}
async function loadFiles() {
  const body = $('#fileBody');
  $('#crumbs').innerHTML = crumbsHtml();
  $$('#crumbs .c').forEach(el => el.onclick = () => { state.prefix = el.dataset.p; loadFiles(); });
  try {
    const d = await apiGet(`/api/accounts/${state.accountId}/objects?bucket=${encodeURIComponent(state.bucket)}&prefix=${encodeURIComponent(state.prefix)}`);
    renderFileList(d);
    loadSideFolders(); // 侧边栏固定显示根目录，不跟随当前路径
  } catch (e) { body.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`; }
}
function sortFiles(files) {
  const arr = files.slice();
  const by = {
    'name-asc': (a, b) => a.name.localeCompare(b.name, 'zh-CN'),
    'name-desc': (a, b) => b.name.localeCompare(a.name, 'zh-CN'),
    'size-desc': (a, b) => (b.size || 0) - (a.size || 0),
    'size-asc': (a, b) => (a.size || 0) - (b.size || 0),
    'time-desc': (a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0),
    'time-asc': (a, b) => new Date(a.lastModified || 0) - new Date(b.lastModified || 0),
  }[state.sort] || (() => 0);
  arr.sort(by);
  return arr;
}
function renderFileList(d) {
  const body = $('#fileBody');
  updateSelBar();
  if (!d.folders.length && !d.files.length) {
    body.innerHTML = `<div class="empty"><div class="big">${ic('folderOpen', 56)}</div>空文件夹，把文件拖进来上传吧</div>`;
    return;
  }
  if (state.view === 'grid') {
    const sz = { small: 's', medium: 'm', large: 'l' }[state.thumbSize] || 'm';
    let h = `<div class="fgrid sz-${sz}${state.selectMode ? ' selecting' : ''}">`;
    const folders = d.folders.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    folders.forEach(f => {
      h += `<div class="fitem folder-card" data-folder="${esc(f.prefix)}">
        <div class="fic folder-ic">${ic('folder')}</div>
        <div class="fsub"><div class="fn">${esc(f.name)}</div><div class="fs">${t('file.folderLabel')}</div></div></div>`;
    });
    sortFiles(d.files).forEach(f => {
      const sel = selKeys.has(f.key) ? ' sel' : '';
      const check = `<input type="checkbox" class="check" ${selKeys.has(f.key) ? 'checked' : ''} data-check="${esc(f.key)}">`;
      h += `<div class="fitem${sel}" data-key="${esc(f.key)}" data-kind="${f.kind}" data-name="${esc(f.name)}">
        ${check}
        <div class="fic" data-thumb="${esc(f.key)}|${f.kind}">${iconFor(f.kind)}</div>
        <div class="fsub"><div class="fn" title="${esc(f.name)}">${esc(f.name)}</div><div class="fs">${fmtSize(f.size)} · ${fmtDate(f.lastModified).slice(0, 10)}</div></div></div>`;
    });
    body.innerHTML = h + '</div>';
    // 文件夹单击进入
    $$('.fitem[data-folder]', body).forEach(el => el.onclick = () => { state.prefix = el.dataset.folder; loadFiles(); });
    $$('.fitem[data-key]', body).forEach(el => {
      el.onclick = (e) => {
        if (state.selectMode) {
          const k = el.dataset.key;
          selKeys.has(k) ? selKeys.delete(k) : selKeys.add(k);
          el.classList.toggle('sel', selKeys.has(k));
          const cb = $('[data-check]', el); if (cb) cb.checked = selKeys.has(k);
          updateSelBar(); return;
        }
        openPreview(el.dataset.key, el.dataset.name, el.dataset.kind);
      };
      // 复选框：自己处理选中，不冒泡到卡片
      const cb = $('[data-check]', el);
      if (cb) cb.onclick = (e) => {
        e.stopPropagation();
        const k = el.dataset.key;
        selKeys.has(k) ? selKeys.delete(k) : selKeys.add(k);
        cb.checked = selKeys.has(k);
        el.classList.toggle('sel', selKeys.has(k));
        updateSelBar();
      };
    });
    // 图片缩略图：懒加载 + 批量签名，一次请求搞定可见区域
    const thumbEls = $$('[data-thumb]', body).filter(el => el.dataset.thumb.split('|')[1] === 'image');
    if (thumbEls.length) {
      const urlCache = new Map(); // key -> url, 避免重复签名
      const loadThumbs = async (els) => {
        const need = els.filter(el => !urlCache.has(el.dataset.thumb.split('|')[0]) && !el.dataset.done);
        if (!need.length) return;
        need.forEach(el => el.dataset.done = '1');
        const keys = need.map(el => el.dataset.thumb.split('|')[0]);
        try {
          const r = await apiPost(`/api/accounts/${state.accountId}/presign-batch`,
            { bucket: state.bucket, keys, op: 'preview', expires: 600 });
          for (const [k, url] of Object.entries(r.urls || {})) urlCache.set(k, url);
        } catch (e) { /* keep icons */ }
        need.forEach(el => {
          const url = urlCache.get(el.dataset.thumb.split('|')[0]);
          if (url) el.innerHTML = `<img src="${esc(url)}" loading="lazy" decoding="async">`;
        });
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
          const vis = entries.filter(e => e.isIntersecting).map(e => e.target);
          if (vis.length) { vis.forEach(el => io.unobserve(el)); loadThumbs(vis); }
        }, { rootMargin: '300px' });
        thumbEls.forEach(el => io.observe(el));
      } else {
        loadThumbs(thumbEls);
      }
    }
  } else {
    const checkCol = state.selectMode ? '<th class="check-cell"></th>' : '';
    let h = `<div class="ftable-wrap"><table class="ftable"><thead><tr>${checkCol}<th>名称</th><th style="width:110px">大小</th><th style="width:170px">修改时间</th><th style="width:170px;text-align:right">操作</th></tr></thead><tbody>`;
    d.folders.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).forEach(f => {
      h += `<tr>${state.selectMode ? '<td class="check-cell"></td>' : ''}
        <td><div class="fname clickable" data-folder="${esc(f.prefix)}"><div class="fic-sm folder">${ic('folder')}</div>
          <span class="nm">${esc(f.name)}</span></div></td>
        <td class="fsize muted">—</td><td class="ftime">—</td><td></td></tr>`;
    });
    sortFiles(d.files).forEach(f => {
      h += `<tr>${state.selectMode ? `<td class="check-cell"><input type="checkbox" data-check="${esc(f.key)}" ${selKeys.has(f.key) ? 'checked' : ''}></td>` : ''}
        <td><div class="fname"><div class="fic-sm" data-lthumb="${esc(f.key)}|${f.kind}">${iconFor(f.kind)}</div>
          <span class="nm clickable" data-key="${esc(f.key)}" data-kind="${f.kind}" data-name="${esc(f.name)}">${esc(f.name)}</span></div></td>
        <td class="fsize">${fmtSize(f.size)}</td><td class="ftime">${fmtDate(f.lastModified)}</td>
        <td><div class="row-actions">
          <button class="icon-btn" data-act="preview" title="预览">${ic('eye')}</button>
          <button class="icon-btn" data-act="download" title="${t('act.download')}">${ic('download')}</button>
          <button class="icon-btn" data-act="share" title="${t('act.share')}">${ic('link')}</button>
          <button class="icon-btn" data-act="rename" title="${t('act.rename')}">${ic('pencil')}</button>
          <button class="icon-btn danger" data-act="delete" title="${t('act.delete')}">${ic('trash')}</button>
        </div></td></tr>`;
    });
    body.innerHTML = h + '</tbody></table></div>';
    // 列表视图小缩略图：批量签名懒加载
    const lthumbs = $$('[data-lthumb]', body).filter(el => el.dataset.lthumb.split('|')[1] === 'image');
    if (lthumbs.length) {
      const keys = [...new Set(lthumbs.map(el => el.dataset.lthumb.split('|')[0]))];
      apiPost(`/api/accounts/${state.accountId}/presign-batch`, { bucket: state.bucket, keys, op: 'preview', expires: 600 })
        .then(r => {
          const urls = r.urls || {};
          lthumbs.forEach(el => {
            const u = urls[el.dataset.lthumb.split('|')[0]];
            if (u) el.innerHTML = `<img src="${esc(u)}" loading="lazy" alt="">`;
          });
        }).catch(() => {});
    }
    $$('[data-folder]', body).forEach(el => el.onclick = () => { state.prefix = el.dataset.folder; loadFiles(); });
    $$('[data-key]', body).forEach(el => el.onclick = () => openPreview(el.dataset.key, el.dataset.name, el.dataset.kind));
    $$('[data-check]', body).forEach(el => el.onchange = () => {
      el.checked ? selKeys.add(el.dataset.check) : selKeys.delete(el.dataset.check);
      updateSelBar();
    });
    $$('[data-act]', body).forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      const tr = el.closest('tr');
      const nm = $('[data-key]', tr);
      fileAction(el.dataset.act, nm.dataset.key, nm.dataset.name, nm.dataset.kind);
    });
  }
}
function updateSelBar() {
  const bar = $('#selBar');
  if (!bar) return;
  bar.hidden = !state.selectMode;
  const total = state.view === 'grid'
    ? $$('.fitem[data-key]', $('#fileBody')).length
    : $$('#fileBody [data-check]').length;
  $('#selCount').textContent = `已选 ${selKeys.size} / ${total} 个`;
}
function deleteSelected() {
  if (!selKeys.size) return;
  askConfirm('删除文件', `确定删除选中的 ${selKeys.size} 个文件吗？此操作不可恢复。`, t('common.delete'), async () => {
    try {
      await apiPost(`/api/accounts/${state.accountId}/delete`, { bucket: state.bucket, keys: [...selKeys] });
      toast(`已删除 ${selKeys.size} 个`); selKeys.clear(); loadFiles();
    } catch (e) { toast('删除失败：' + e.message); }
  });
}
function renameObject(key, name) {
  askPrompt(t('common.rename'), '新文件名', name, async (v) => {
    v = v.trim();
    if (!v || v === name) return;
    const dst = state.prefix + v;
    try {
      await apiPost(`/api/accounts/${state.accountId}/rename`, { bucket: state.bucket, src: key, dst });
      toast('重命名成功'); loadFiles();
    } catch (e) { toast('重命名失败：' + e.message); }
  });
}
function enterFolder(key) {
  state.prefix = key.endsWith('/') ? key : key + '/';
  loadFiles();
}
async function downloadFolder(prefix, name) {
  try {
    toast(`正在列出「${name}」下的文件…`);
    const d = await apiGet(`/api/accounts/${state.accountId}/list-all?bucket=${encodeURIComponent(state.bucket)}&prefix=${encodeURIComponent(prefix)}`);
    const keys = d.keys || [];
    if (!keys.length) { toast(t('file.folderEmpty')); return; }
    if (keys.length > 5000) { toast(`文件太多（${keys.length} 个），最多打包 5000 个`); return; }
    // 复用打包逻辑
    const modal = $('#uploadModal'), list = $('#uploadList');
    list.innerHTML = '';
    modal.querySelector('h3').textContent = t('file.batchDownload');
    $('#uploadModal').hidden = false;
    const row = document.createElement('div');
    row.style.cssText = 'padding:12px 0';
    row.innerHTML = `<div style="margin-bottom:8px">正在打包 ${keys.length} 个文件…</div>
      <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
        <div class="ufill" style="height:100%;width:0;background:#3b82f6;transition:width .2s"></div></div>
      <div class="ust" style="font-size:12px;color:#64748b;margin-top:6px"></div>`;
    list.appendChild(row);
    const fill = row.querySelector('.ufill'), st = row.querySelector('.ust');
    const p = await apiPost(`/api/accounts/${state.accountId}/presign-batch`,
      { bucket: state.bucket, keys, op: 'download', expires: 600 });
    const urls = p.urls || {};
    const zip = new JSZip();
    let n = 0;
    for (const key of keys) {
      const url = urls[key];
      if (!url) continue;
      const rel = key.slice(prefix.length) || key.split('/').pop();
      st.textContent = `下载中：${rel} (${n + 1}/${keys.length})`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`下载 ${rel} 失败`);
      zip.file(rel, await resp.blob());
      n++;
      fill.style.width = Math.round(n / keys.length * 100) + '%';
    }
    st.textContent = '正在生成 zip…';
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\/$/, '')}-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
    $('#uploadModal').hidden = true;
    modal.querySelector('h3').textContent = '上传文件';
    toast(`已打包下载 ${n} 个文件`);
  } catch (e) { toast('打包失败：' + e.message); }
}
async function editText(key, name) {
  try {
    toast('正在加载…');
    const d = await apiGet(`/api/accounts/${state.accountId}/text?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}`);
    const modal = $('#uploadModal'), list = $('#uploadList');
    list.innerHTML = '';
    modal.querySelector('h3').textContent = '编辑 ' + name;
    const ta = document.createElement('textarea');
    ta.value = d.content;
    ta.style.cssText = 'width:100%;height:400px;font-family:monospace;font-size:13px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;resize:vertical';
    list.appendChild(ta);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:12px;display:flex;gap:8px;justify-content:flex-end';
    btnRow.innerHTML = '<button class="btn" id="edCancel">' + t('common.cancel') + '</button><button class="btn btn-primary" id="edSave">' + t('common.save') + '</button>';
    list.appendChild(btnRow);
    $('#uploadModal').hidden = false;
    $('#edCancel').onclick = () => { $('#uploadModal').hidden = true; modal.querySelector('h3').textContent = '上传文件'; };
    $('#edSave').onclick = async () => {
      try {
        await apiPut(`/api/accounts/${state.accountId}/text`, { bucket: state.bucket, key, content: ta.value });
        toast(t('msg.saved'));
        $('#uploadModal').hidden = true;
        modal.querySelector('h3').textContent = '上传文件';
        loadFiles();
      } catch (e) { toast(t('msg.saveFail') + e.message); }
    };
  } catch (e) { toast('加载失败：' + e.message); }
}
function copyObject(srcKey, name, isMove) {
  // 先拿桶列表
  apiGet(`/api/accounts/${state.accountId}/buckets`).then(d => {
    const buckets = (d.buckets || [state.bucket]).map(b => typeof b === 'string' ? b : (b.name || b.bucket || ''));
    const bOpts = buckets.map(b => `<option value="${esc(b)}" ${b === state.bucket ? 'selected' : ''}>${esc(b)}</option>`).join('');
    const modal = $('#uploadModal'), list = $('#uploadList');
    list.innerHTML = '';
    modal.querySelector('h3').textContent = isMove ? '移动到' : '复制到';
    list.innerHTML = `
      <label class="fld"><span>目标桶</span><select class="input" id="cpBucket">${bOpts}</select></label>
      <label class="fld"><span>目标路径（含文件名）</span><input class="input" id="cpPath" value="${esc(state.prefix + name)}"></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn" id="cpCancel">取消</button>
        <button class="btn btn-primary" id="cpGo">${isMove ? t('common.move') : t('common.copy')}</button>
      </div>`;
    $('#uploadModal').hidden = false;
    $('#cpCancel').onclick = () => { $('#uploadModal').hidden = true; modal.querySelector('h3').textContent = '上传文件'; };
    $('#cpGo').onclick = async () => {
      const dstBucket = $('#cpBucket').value;
      const dstKey = $('#cpPath').value.trim().replace(/^\/+/, '');
      if (!dstKey) { toast('请输入目标路径'); return; }
      try {
        toast(`正在${isMove ? t('common.move') : t('common.copy')}…`);
        $('#uploadModal').hidden = true; modal.querySelector('h3').textContent = '上传文件';
        await apiPost(`/api/accounts/${state.accountId}/copy`, {
          srcBucket: state.bucket, srcKey, dstBucket, dstKey, move: isMove,
        });
        toast(isMove ? '移动成功' : '复制成功');
        loadFiles();
      } catch (e) { toast('失败：' + e.message); }
    };
  }).catch(e => toast('获取桶列表失败：' + e.message));
}
function deleteSingle(key, name, isFolder) {
  askConfirm(t('common.delete'), `确定删除「${name}」吗？${isFolder ? '文件夹内的文件也会被删除，' : ''}此操作不可恢复。`, t('common.delete'), async () => {
    try {
      await apiPost(`/api/accounts/${state.accountId}/delete`, { bucket: state.bucket, keys: [key] });
      toast(t('msg.deleted')); loadFiles();
    } catch (e) { toast('删除失败：' + e.message); }
  });
}
function fileAction(act, key, name, kind) {
  if (act === 'preview') openPreview(key, name, kind);
  else if (act === 'download') downloadFile(key, name);
  else if (act === 'share') openShare(key, name);
  else if (act === 'rename') askPrompt(t('common.rename'), '新文件名', name, async (v) => {
    v = v.trim();
    if (!v || v === name) return;
    const dst = state.prefix + v;
    try {
      await apiPost(`/api/accounts/${state.accountId}/rename`, { bucket: state.bucket, src: key, dst });
      toast('已重命名'); loadFiles();
    } catch (e) { toast('重命名失败：' + e.message); }
  });
  else if (act === 'delete') askConfirm('删除文件', `确定删除 ${name} 吗？此操作不可恢复。`, t('common.delete'), async () => {
    try {
      await apiPost(`/api/accounts/${state.accountId}/delete`, { bucket: state.bucket, keys: [key] });
      toast(t('msg.deleted')); loadFiles();
    } catch (e) { toast('删除失败：' + e.message); }
  });
}
async function downloadFile(key, name) {
  try {
    const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}&op=download`);
    const a = document.createElement('a');
    a.href = p.url; a.download = name; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { toast('下载失败：' + e.message); }
}

/* ---------- preview ---------- */
let previewKey = '', previewName = '';
async function openPreview(key, name, kind) {
  previewKey = key; previewName = name;
  $('#previewTitle').textContent = name;
  $('#previewBody').innerHTML = '<div class="muted">' + t('common.loading') + '</div>';
  $('#previewModal').hidden = false;
  try {
    const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}&op=preview&expires=3600`);
    const url = p.url, body = $('#previewBody');
    if (kind === 'image') body.innerHTML = `<img src="${esc(url)}" style="max-width:100%;max-height:70vh;object-fit:contain;cursor:zoom-in" onclick="window.open('${esc(url)}','_blank')" title="点击查看大图">`;
    else if (kind === 'video') body.innerHTML = `<video src="${esc(url)}" controls style="max-width:100%;max-height:70vh"></video>`;
    else if (kind === 'audio') body.innerHTML = `<audio src="${esc(url)}" controls style="width:90%"></audio>`;
    else if (kind === 'pdf') body.innerHTML = `<iframe src="${esc(url)}" style="width:100%;height:60vh;border:none"></iframe>`;
    else if (kind === 'text') {
      const t = await (await fetch(url)).text();
      body.innerHTML = `<pre>${esc(t.slice(0, 200000))}</pre>`;
    }
    else body.innerHTML = `<div class="empty"><div class="big">${iconFor(kind)}</div>该格式不支持在线预览，请下载查看</div>`;
  } catch (e) { $('#previewBody').innerHTML = `<div class="empty">预览失败：${esc(e.message)}</div>`; }
}
$('#previewClose').onclick = () => { $('#previewModal').hidden = true; $('#previewBody').innerHTML = ''; };
$('#previewDownload').onclick = () => downloadFile(previewKey, previewName);

/* ---------- share ---------- */
let shareKey = '', shareName = '';
let shareKeys = [];
function openShareMulti(keys) {
  shareKeys = keys;
  shareKey = keys[0];
  shareName = keys.length > 1 ? `${keys[0].split('/').pop()} 等 ${keys.length} 个文件` : keys[0].split('/').pop();
  $('#shareResult').hidden = true;
  const acct = state.accounts.find(a => a.id === state.accountId);
  $('#sharePublicWrap').hidden = true; // 多文件不支持公开直链
  $('#shareModal').hidden = false;
}
function openShare(key, name) {
  shareKeys = [key];
  shareKey = key; shareName = name;
  $('#shareResult').hidden = true;
  const acct = state.accounts.find(a => a.id === state.accountId);
  const pd = (acct && acct.publicDomain || '').trim();
  if (pd) {
    $('#sharePublicUrl').value = 'https://' + pd.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/' + key.split('/').map(encodeURIComponent).join('/');
    $('#sharePublicWrap').hidden = false;
  } else {
    $('#sharePublicWrap').hidden = true;
  }
  $('#shareModal').hidden = false;
}
$('#sharePublicCopy').onclick = () => { $('#sharePublicUrl').select(); document.execCommand('copy'); toast(t('msg.copied')); };
$('#shareCancel').onclick = () => $('#shareModal').hidden = true;
$('#shareGen').onclick = async () => {
  const exp = parseInt($('#shareExpiry').value, 10);
  const pwd = $('#sharePwd').value;
  const maxViews = parseInt($('#shareMaxViews').value, 10);
  if (pwd && pwd.length < 4) { toast('分享密码至少 4 位'); return; }
  try {
    const p = await apiPost(`/api/accounts/${state.accountId}/share`,
      { bucket: state.bucket, keys: shareKeys, expires: exp, password: pwd, maxViews });
    $('#shareUrl').value = p.url;
    $('#shareResult').hidden = false;
    $('#sharePwd').value = '';
  } catch (e) { toast('生成失败：' + e.message); }
};
$('#shareCopy').onclick = () => { $('#shareUrl').select(); document.execCommand('copy'); toast(t('msg.copied')); };

/* ---------- upload (centered modal, multi-file) ---------- */
$('#uploadClose').onclick = () => { $('#uploadModal').hidden = true; };
$('#filePicker').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  e.target.value = '';
  if (!files.length || !state.accountId) return;
  const list = $('#uploadList');
  list.innerHTML = '';
  $('#uploadModal').hidden = false;
  let done = 0, failed = 0;
  const rows = files.map(f => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9';
    row.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span>
      <span class="ust" style="font-size:12px;color:#64748b;white-space:nowrap">等待…</span>
      <div class="ubar" style="width:120px;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
        <div class="ufill" style="height:100%;width:0;background:#3b82f6;border-radius:3px;transition:width .2s"></div>
      </div>`;
    list.appendChild(row);
    return { f, st: row.querySelector('.ust'), fill: row.querySelector('.ufill') };
  });
  for (const r of rows) {
    const key = state.prefix + r.f.name;
    try {
      r.st.textContent = '获取地址…';
      const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}&op=upload&expires=3600`);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', p.url);
        xhr.setRequestHeader('Content-Type', r.f.type || 'application/octet-stream');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pc = Math.round(ev.loaded / ev.total * 100);
            r.fill.style.width = pc + '%';
            r.st.textContent = pc + '%';
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('HTTP ' + xhr.status));
        xhr.onerror = () => reject(new Error('CORS_FAIL'));
        xhr.send(r.f);
      });
      r.fill.style.width = '100%';
      r.fill.style.background = '#22c55e';
      r.st.textContent = '成功';
      r.st.style.color = '#16a34a';
      done++;
    } catch (err) {
      r.fill.style.background = '#ef4444';
      r.st.textContent = '失败';
      r.st.style.color = '#dc2626';
      if (err.message === 'CORS_FAIL') {
        r.st.title = '浏览器直传被拦截：去存储桶设置里配置 CORS，允许来源为本网站域名，允许方法 GET/PUT/HEAD，允许标头 *';
      } else {
        r.st.title = err.message;
      }
      failed++;
    }
  }
  const sum = document.createElement('div');
  sum.style.cssText = 'padding:12px 0 0;font-weight:600';
  sum.textContent = failed ? `完成：${done} 成功，${failed} 失败（悬停"失败"看原因；如为 CORS 问题请去桶设置配 CORS）` : `全部上传成功（${done} 个文件）`;
  list.appendChild(sum);
  delete state.statsCache[state.accountId + '/' + state.bucket];
  if ($('.nav-item.active')?.dataset.nav === 'files') loadFiles();
});

/* ---------- context menu (right-click) ---------- */
function showCtxMenu(x, y, items) {
  const m = $('#ctxMenu');
  m.innerHTML = items.map((it, i) =>
    `<div class="ctx-it" data-i="${i}" style="padding:9px 14px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:9px;${it.danger ? 'color:#dc2626' : ''}">${it.icon || ''}${esc(it.label)}</div>`
  ).join('');
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  m.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
  m.querySelectorAll('.ctx-it').forEach(el => {
    el.onmouseenter = () => el.style.background = '#f1f5f9';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = () => { hideCtxMenu(); items[+el.dataset.i].fn(); };
  });
}
function hideCtxMenu() { $('#ctxMenu').hidden = true; }
document.addEventListener('click', hideCtxMenu);
document.addEventListener('contextmenu', (e) => {
  const item = e.target.closest('.fitem, .frow');
  if (!item || !state.accountId) return;
  e.preventDefault();
  const key = item.dataset.key, name = item.dataset.name || key.split('/').pop();
  const isFolder = (item.dataset.kind === 'folder') || key.endsWith('/');
  const items = [];
  if (!isFolder) {
    items.push({ label: t('common.download'), icon: ic('download', 15), fn: () => downloadFile(key, name) });
    items.push({ label: '分享链接', icon: ic('share', 15), fn: () => openShare(key, name) });
    if (/\.(txt|md|json|js|css|html|xml|yml|yaml|ini|conf|cfg|log|sh|py|go|rs|ts|jsx|tsx)$/i.test(name)) {
      items.push({ label: '编辑文本', icon: ic('edit', 15), fn: () => editText(key, name) });
    }
    items.push({ label: '复制到…', icon: ic('copy', 15), fn: () => copyObject(key, name, false) });
    items.push({ label: '移动到…', icon: ic('move', 15), fn: () => copyObject(key, name, true) });
    items.push({ label: t('common.rename'), icon: ic('edit', 15), fn: () => renameObject(key, name) });
  } else {
    items.push({ label: '进入', icon: ic('folder', 15), fn: () => enterFolder(key) });
    items.push({ label: '打包下载 (zip)', icon: ic('download', 15), fn: () => downloadFolder(key, name) });
  }
  items.push({ label: t('common.delete'), icon: ic('trash', 15), danger: true, fn: () => deleteSingle(key, name, isFolder) });
  showCtxMenu(e.clientX, e.clientY, items);
});

/* ---------- sidebar folders ---------- */
async function loadSideFolders(topData) {
  const box = $('#sideFolders');
  if (!box || !state.accountId || !state.bucket) { if (box) box.innerHTML = ''; return; }
  try {
    const d = topData || await apiGet(`/api/accounts/${state.accountId}/objects?bucket=${encodeURIComponent(state.bucket)}&prefix=`);
    box.innerHTML = d.folders.map(f =>
      `<div class="folder-item" data-p="${esc(f.prefix)}">${ic('folder', 15)} ${esc(f.name)}</div>`).join('')
      || '<div class="muted" style="padding:4px 12px;font-size:12px">无文件夹</div>';
    $$('.folder-item', box).forEach(el => el.onclick = () => {
      state.prefix = el.dataset.p;
      nav('files');
    });
  } catch (e) { /* ignore */ }
}

/* ---------- settings ---------- */
/* ---------- 厂商 LOGO ---------- */
function providerLogo(id, size) {
  size = size || 20;
  var s = size;
  var logos = {
    r2: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="#F38020" d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18.3 10H18a4 4 0 0 1 0 8H7z"/></svg>',
    s3: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="#FF9900" d="M12 4a8 8 0 0 1 7.5 5.2l-2 1A6 6 0 0 0 12 6a6 6 0 0 0-5.5 3.6l-2-1A8 8 0 0 1 12 4z"/><path fill="#FF9900" d="M12 13c-2.5 0-4.8 1-6.3 2.8l1.5 1.3A7.5 7.5 0 0 1 12 15a7.5 7.5 0 0 1 4.8 1.7l1.5-1.3C16.8 14 14.5 13 12 13z"/></svg>',
    oss: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="#FF6A00" d="M12 3C8.5 3 5.5 5.8 5.5 9.3c0 1.3.4 2.6 1.2 3.6C5.6 13.6 5 14.9 5 16.3h14c0-1.4-.6-2.7-1.7-3.4.8-1 1.2-2.3 1.2-3.6C18.5 5.8 15.5 3 12 3z"/><circle fill="#fff" cx="12" cy="10" r="2.5"/></svg>',
    cos: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="#0052D9" d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><path fill="#fff" d="M12 7l4.5 2.5v5L12 17l-4.5-2.5v-5L12 7z"/></svg>',
    qiniu: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><rect fill="#00AAE7" x="3" y="3" width="18" height="18" rx="4"/><path fill="#fff" d="M8 8h8v1.8H8zM8 11h8v1.8H8zM8 14h5v1.8H8z"/></svg>',
    b2: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="#E6272D" d="M12.6 2.2c.9 3.9-4.8 5.9-4.8 11a4.8 4.8 0 0 0 9.6 0c0-2.4-1.3-4-2.6-5.1-.2 1.7-1.2 2.5-2.2 3 .6-3-.3-6.3-1.4-8.9h1.4z"/></svg>',
    minio: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="#C72E49" d="M4 4h16v16H4z"/><path fill="#fff" d="M7 14l3-3 2.5 2.5L16 10v6H7v-2z"/></svg>'
  };
  return logos[id] || '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><rect fill="#94a3b8" x="4" y="4" width="16" height="16" rx="4"/></svg>';
}

const PROVIDERS = [
  { id: 'r2', name: 'Cloudflare R2', icon: providerLogo('r2', 22), hint: '填写 Account ID，地址自动生成' },
  { id: 's3', name: 'Amazon S3', icon: providerLogo('s3', 22), hint: '全球/区域 endpoint 自动处理' },
  { id: 'oss', name: '阿里云 OSS', icon: providerLogo('oss', 22), hint: '选择地域，地址自动生成' },
  { id: 'cos', name: '腾讯云 COS', icon: providerLogo('cos', 22), hint: '选择地域，地址自动生成' },
  { id: 'qiniu', name: '七牛云', icon: providerLogo('qiniu', 22), hint: 'S3 兼容接口' },
  { id: 'b2', name: 'Backblaze B2', icon: providerLogo('b2', 22), hint: 'S3 兼容接口' },
  { id: 'minio', name: 'MinIO / 自建', icon: providerLogo('minio', 22), hint: '填写你的网关地址' },
];
function renderSettings(tab) {
  tab = tab || 'account';
  const main = $('#main');
  const tabs = [
    { id: 'account', label: t('settings.accounts') },
    { id: 'share', label: t('settings.share') },
    { id: 'upload', label: t('settings.uploadTab') },
    { id: 'site', label: t('settings.site') },
    { id: 'user', label: t('settings.users') },
    { id: 'appearance', label: t('settings.appearance') },
  ];
  // 非管理员隐藏部分
  const visibleTabs = tabs.filter(t => {
    if (!state.user.admin && ['site', 'user'].includes(t.id)) return false;
    return true;
  });
  main.innerHTML = `
    <div class="topbar"><h2>${ic('settings')}${t('nav.settings')}</h2></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${visibleTabs.map(t => `<button class="btn btn-sm ${t.id === tab ? 'btn-primary' : ''}" data-stab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div id="setTabContent"></div>`;
  main.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => renderSettings(b.dataset.stab));
  renderSettingsTab(tab);
}
function renderSettingsTab(tab) {
  const c = $('#setTabContent');
  if (tab === 'account') {
    c.innerHTML = `<div class="card"><h3>${ic('bucket')}${t('settings.accounts')}</h3><p class="desc">${t('settings.accountDesc')}</p>
      <div id="acctList"></div>
      <button class="btn btn-primary" id="btnAddAcct" style="margin-top:12px">${t('account.add')}</button></div>`;
    $('#btnAddAcct').onclick = () => openWizard();
    loadAcctList();
  } else if (tab === 'share') {
    c.innerHTML = `<div class="card"><h3>${ic('share')}${t('settings.share')}</h3><p class="desc">${t('settings.shareDesc')}</p><div id="shareList"><div class="muted">${t('common.loading')}</div></div></div>`;
    loadShareList();
  } else if (tab === 'upload') {
    c.innerHTML = `<div class="card"><h3>${t('settings.uploadLinks')}</h3><p class="desc">${t('settings.uploadDesc')}</p><div id="uploadLinkList"><div class="muted">${t('common.loading')}</div></div></div>`;
    loadUploadLinkList();
  } else if (tab === 'site' && state.user.admin) {
    c.innerHTML = `<div class="card"><h3>${ic('settings')}${t('settings.site')}</h3><p class="desc">${t('settings.siteUrlDesc')}</p>
      <label class="fld"><span>${t('settings.siteUrl')}</span>
        <div style="display:flex;gap:8px">
          <input class="input" id="siteUrl" placeholder="${t('settings.sitePh')}" style="flex:1">
          <button class="btn btn-primary" id="siteSave" style="flex:none">${t('common.save')}</button>
        </div><div class="hint">${t('settings.siteHint')}</div></label></div>
      <div class="card"><h3>${ic('lock')}${t('settings.regTitle')}</h3><p class="desc">${t('settings.regDesc')}</p>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer">
        <input type="checkbox" id="regToggle" style="width:18px;height:18px"> ${t('settings.allowReg')}
      </label></div>`;
    apiGet('/api/settings').then(d => {
      $('#siteUrl').value = d.siteUrl || '';
      $('#regToggle').checked = !!d.registrationEnabled;
    }).catch(() => {});
    $('#siteSave').onclick = async () => {
      try { await apiPut('/api/settings', { siteUrl: $('#siteUrl').value.trim() }); toast(t('msg.saved')); }
      catch (e) { toast(t('msg.saveFail') + e.message); }
    };
    $('#regToggle').onchange = async (e) => {
      try { await apiPut('/api/settings', { registrationEnabled: e.target.checked }); toast(t('msg.saved')); }
      catch (err) { toast(t('msg.saveFail') + err.message); e.target.checked = !e.target.checked; }
    };
  } else if (tab === 'user' && state.user.admin) {
    c.innerHTML = `<div class="card"><h3>${ic('users')}${t('settings.users')}</h3><p class="desc">共 <b id="userTotal">0</b> 个用户（仅管理员可见，不显示密码）</p><div id="userList"><div class="muted">${t('common.loading')}</div></div></div>`;
    loadUserList();
  } else if (tab === 'appearance') {
    const langOpts = Object.keys(LANGS).map(k =>
      `<option value="${k}" ${getLang() === k ? 'selected' : ''}>${LANGS[k]}</option>`).join('');
    c.innerHTML = `<div class="card"><h3>${ic('settings')}${t('settings.appearance')}</h3>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;margin-bottom:12px">
        <input type="checkbox" id="themeToggle" style="width:18px;height:18px">${t('settings.darkMode')}
      </label>
      <label class="fld"><span>语言 / Language</span>
        <select class="input" id="langSelect" style="max-width:240px">${langOpts}</select>
      </label></div>`;
    $('#themeToggle').checked = document.documentElement.dataset.theme === 'dark';
    $('#themeToggle').onchange = (e) => {
      document.documentElement.dataset.theme = e.target.checked ? 'dark' : 'light';
      localStorage.setItem('objdock-theme', e.target.checked ? 'dark' : 'light');
      // 同步左下角按钮图标
      if (typeof updateThemeBtn === 'function') updateThemeBtn();
    };
    $('#langSelect').onchange = (e) => {
      setLang(e.target.value);
      location.reload();
    };
  }
}
// 旧 renderSettings 保留兼容
async function loadShareList() {
  const box = $('#shareList');
  try {
    const d = await apiGet('/api/shares');
    const arr = d.shares || [];
    if (!arr.length) { box.innerHTML = '<div class="muted">暂无分享</div>'; return; }
    box.innerHTML = arr.map(sh => {
      const exp = new Date(sh.expiresAt * 1000).toLocaleString('zh-CN', { hour12: false });
      let st = sh.expired ? '<span style="color:#dc2626">已过期</span>' : `<span style="color:#16a34a">有效期至 ${esc(exp)}</span>`;
      const tags = [];
      if (sh.hasPassword) tags.push('🔒密码');
      if (sh.maxViews > 0) tags.push(`${sh.viewCount}/${sh.maxViews}次`);
      const tagHtml = tags.length ? ` <span style="font-size:11px;background:#f1f5f9;padding:2px 8px;border-radius:10px">${tags.join(' ')}</span>` : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(sh.key)}">${esc(sh.name)}</span>
        <span style="font-size:12px;color:#64748b">${st}${tagHtml}</span>
        <button class="btn btn-sm" data-copy-share="${esc(sh.url)}">复制</button>
        <button class="btn btn-sm" data-del-share="${esc(sh.token)}" style="color:#dc2626">撤销</button>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-copy-share]').forEach(b => b.onclick = () => {
      navigator.clipboard.writeText(b.dataset.copyShare).then(() => toast(t('msg.copied')));
    });
    box.querySelectorAll('[data-del-share]').forEach(b => b.onclick = () => {
      askConfirm('撤销分享', '确定撤销这个分享链接吗？', '撤销', async () => {
        try { await apiDelete(`/api/shares/${b.dataset.delShare}`); toast(t('msg.revoked')); loadShareList(); }
        catch (e) { toast('撤销失败：' + e.message); }
      });
    });
  } catch (e) { box.innerHTML = '<div class="muted">加载失败</div>'; }
}
async function loadUserList() {
  const box = $('#userList');
  try {
    const d = await apiGet('/api/admin/users');
    $('#userTotal').textContent = d.total;
    const arr = d.users || [];
    if (!arr.length) { box.innerHTML = '<div class="muted">暂无用户</div>'; return; }
    box.innerHTML = arr.map(x => {
      const dt = new Date(x.createdAt).toLocaleDateString('zh-CN');
      const tag = x.admin ? '<span style="background:#dbeafe;color:#1d4ed8;font-size:11px;padding:2px 8px;border-radius:10px">管理员</span>' : '';
      const isSelf = x.username === state.user.username;
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9">
        <span style="flex:1">${esc(x.username)} ${tag}</span>
        <span style="font-size:12px;color:#64748b">${dt} 注册</span>
        ${isSelf ? '<span style="font-size:12px;color:#94a3b8">自己</span>' : `
          <button class="btn btn-sm" data-reset-user="${x.id}" data-uname="${esc(x.username)}">重置密码</button>
          <button class="btn btn-sm" data-del-user="${x.id}" data-uname="${esc(x.username)}" style="color:#dc2626">删除</button>`}
      </div>`;
    }).join('');
    box.querySelectorAll('[data-del-user]').forEach(b => b.onclick = () => {
      askConfirm('删除用户', `确定删除用户「${b.dataset.uname}」吗？其所有账户、分享、文件记录都会被删除，不可恢复。`, t('common.delete'), async () => {
        try { await apiDelete(`/api/admin/users/${b.dataset.delUser}`); toast(t('msg.deleted')); loadUserList(); }
        catch (e) { toast('删除失败：' + e.message); }
      });
    });
    box.querySelectorAll('[data-reset-user]').forEach(b => b.onclick = () => {
      askPrompt('重置密码', `为「${b.dataset.uname}」设置新密码（至少 8 位，字母+数字）`, '', async (v) => {
        if (!v || v.length < 8) { toast(t('auth.pwdMin')); return; }
        try { await apiPost(`/api/admin/users/${b.dataset.resetUser}/reset-password`, { password: v }); toast('密码已重置'); }
        catch (e) { toast('重置失败：' + e.message); }
      });
    });
  } catch (e) { box.innerHTML = '<div class="muted">加载失败</div>'; }
}
// 拖拽上传
function initDragUpload() {
  const zone = $('#main');
  if (!zone || zone.dataset.dragInit) return;
  zone.dataset.dragInit = '1';
  let overlay = null;
  const showOverlay = () => {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(59,130,246,.12);border:3px dashed #3b82f6;z-index:9999;display:flex;align-items:center;justify-content:center;pointer-events:none;margin:12px;border-radius:16px';
    overlay.innerHTML = '<div style="background:#fff;padding:20px 36px;border-radius:14px;font-size:18px;color:#3b82f6;box-shadow:0 8px 30px rgba(0,0,0,.15)">松开以上传文件</div>';
    document.body.appendChild(overlay);
  };
  const hideOverlay = () => { if (overlay) { overlay.remove(); overlay = null; } };
  let counter = 0;
  zone.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    if (!state.accountId || state.view !== 'files') return;
    e.preventDefault(); counter++; showOverlay();
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); });
  zone.addEventListener('dragleave', (e) => { counter--; if (counter <= 0) { counter = 0; hideOverlay(); } });
  zone.addEventListener('drop', (e) => {
    counter = 0; hideOverlay();
    if (!e.dataTransfer.types.includes('Files')) return;
    if (!state.accountId || state.view !== 'files') return;
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (files.length) uploadFiles(files);
  });
}
async function doSearch(q) {
  const body = $('#fileBody');
  body.innerHTML = '<div class="empty">搜索中…</div>';
  try {
    const d = await apiGet(`/api/accounts/${state.accountId}/search?bucket=${encodeURIComponent(state.bucket)}&q=${encodeURIComponent(q)}`);
    const results = d.results || [];
    if (!results.length) {
      body.innerHTML = `<div class="empty">没有找到包含 “${esc(q)}” 的文件（扫描了 ${d.scanned} 个）</div>`;
      return;
    }
    // 用列表模式显示搜索结果
    body.innerHTML = `<div class="muted" style="padding:8px 4px">找到 ${results.length} 个结果${d.truncated ? '（只显示前 100 个）' : ''}，扫描了 ${d.scanned} 个文件</div>` +
      results.map(r => `
      <div class="frow" data-key="${esc(r.key)}" data-name="${esc(r.name)}" data-kind="file">
        <span class="fname">${ic('file', 16)} ${esc(r.name)}</span>
        <span class="fmeta">${fmtSize(r.size)}</span>
        <span class="fpath muted" style="font-size:12px">${esc(r.key)}</span>
      </div>`).join('');
    // 搜索结果行点击预览
    body.querySelectorAll('.frow').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => openPreview(el.dataset.key, el.dataset.name, 'file');
    });
  } catch (e) {
    body.innerHTML = `<div class="empty">搜索失败：${esc(e.message)}</div>`;
  }
}
function openUploadLinkModal() {
  const modal = $('#uploadModal'), list = $('#uploadList');
  list.innerHTML = '';
  modal.querySelector('h3').textContent = t('upload.createLink');
  list.innerHTML = `
    <label class="fld"><span>${t('upload.linkName')}</span>
      <input class="input" id="ulName" placeholder="${t('upload.namePh')}" maxlength="50">
      <div class="hint">${t('upload.nameHint')}</div></label>
    <label class="fld"><span>${t('upload.toPath')}</span>
      <input class="input" id="ulPrefix" value="${esc(state.prefix || '')}" placeholder="默认为当前目录：${esc(state.prefix || '根目录')}">
      <div class="hint">${t('upload.pathHint')}</div></label>
    <label class="fld"><span>${t('upload.expiry')}</span>
      <select class="input" id="ulExpiry">
        <option value="3600">${t('upload.hour1')}</option>
        <option value="18000">${t('upload.hour5')}</option>
        <option value="43200">${t('upload.hour12')}</option>
        <option value="86400">${t('upload.day1')}</option>
        <option value="259200">${t('upload.day3')}</option>
        <option value="604800" selected>${t('upload.day7')}</option>
        <option value="1296000">${t('upload.day15')}</option>
        <option value="2592000">${t('upload.day30')}</option>
        <option value="7776000">${t('upload.day90')}</option>
        <option value="0">${t('upload.forever')}</option>
      </select></label>
    <div style="display:flex;gap:10px">
      <label class="fld" style="flex:1"><span>${t('upload.pwd')}</span>
        <input class="input" id="ulPwd" type="password" placeholder="${t('upload.noPwd')}"></label>
      <label class="fld" style="flex:1"><span>${t('upload.maxUses')}</span>
        <select class="input" id="ulMaxUses">
          <option value="0">${t('upload.unlimited')}</option>
          <option value="10">${t('upload.times10')}</option>
          <option value="50">${t('upload.times50')}</option>
          <option value="100">${t('upload.times100')}</option>
        </select></label>
    </div>
    <div id="ulResult" hidden>
      <label class="fld"><span>${t('upload.result')}</span>
        <input class="input" id="ulUrl" readonly onclick="this.select()" style="cursor:pointer"></label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn" id="ulCancel">取消</button>
      <button class="btn btn-primary" id="ulCreate">创建链接</button>
    </div>`;
  $('#uploadModal').hidden = false;
  const close = () => { $('#uploadModal').hidden = true; modal.querySelector('h3').textContent = '上传文件'; };
  $('#ulCancel').onclick = close;
  $('#ulUrl').onclick = (e) => { e.target.select(); document.execCommand('copy'); toast(t('msg.copied')); };
  // 去掉滚动条，完整显示
  list.style.maxHeight = 'none';
  list.style.overflow = 'visible';
  $('#ulCreate').onclick = async () => {
    const pwd = $('#ulPwd').value;
    try {
      const name = $('#ulName').value.trim();
      if (!name) { toast('请填写链接名称'); return; }
      const p = await apiPost(`/api/accounts/${state.accountId}/upload-link`, {
        bucket: state.bucket,
        prefix: $('#ulPrefix').value.trim(),
        name,
        expires: parseInt($('#ulExpiry').value, 10),
        password: pwd,
        maxUses: parseInt($('#ulMaxUses').value, 10),
      });
      // 只显示链接，隐藏表单
      list.innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:16px;font-weight:600;margin-bottom:16px;color:var(--text)">上传链接已创建</div>
          <label class="fld"><span>${t('upload.result')}</span>
            <input class="input" id="ulUrl2" readonly value="${esc(p.url)}" onclick="this.select();document.execCommand('copy');toast(t('msg.copied'))" style="cursor:pointer;text-align:center">
          </label>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
            <button class="btn" onclick="$('#uploadModal').hidden=true">关闭</button>
            <button class="btn btn-primary" onclick="openUploadLinkModal()">${t('upload.createAgain')}</button>
          </div>
        </div>`;
      try { await navigator.clipboard.writeText(p.url); } catch (e) {}
      loadUploadLinkList();
      loadSideUlLinks();
    } catch (e) { toast('创建失败：' + e.message); }
  };
}
async function loadUploadLinkList() {
  const box = $('#uploadLinkList');
  if (!box) return;
  try {
    const d = await apiGet('/api/upload-links');
    const arr = d.links || [];
    if (!arr.length) { box.innerHTML = '<div class="muted">暂无上传链接</div>'; return; }
    box.innerHTML = arr.map(ul => {
      const exp = new Date(ul.expiresAt * 1000).toLocaleString('zh-CN', { hour12: false });
      const st = ul.expired ? '<span style="color:#dc2626">已过期</span>' : `<span style="color:#16a34a">有效期至 ${esc(exp)}</span>`;
      const tags = [];
      if (ul.hasPassword) tags.push('🔒密码');
      if (ul.maxUses > 0) tags.push(`${ul.useCount}/${ul.maxUses}次`);
      const tagHtml = tags.length ? ` <span style="font-size:11px;background:#f1f5f9;padding:2px 8px;border-radius:10px">${tags.join(' ')}</span>` : '';
      const nm = ul.name || t('msg.unnamed');
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(nm)}">${esc(nm)} <span style="color:#94a3b8;font-size:12px">${esc(ul.bucket)}${ul.prefix ? ' / ' + esc(ul.prefix) : ''}</span></span>
        <span style="font-size:12px;color:#64748b">${st}${tagHtml}</span>
        <button class="btn btn-sm" data-copy-ul="${esc(ul.url)}">复制</button>
        <button class="btn btn-sm" data-del-ul="${esc(ul.token)}" style="color:#dc2626">撤销</button>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-copy-ul]').forEach(b => b.onclick = () => {
      navigator.clipboard.writeText(b.dataset.copyUl).then(() => toast(t('msg.copied')));
    });
    box.querySelectorAll('[data-del-ul]').forEach(b => b.onclick = () => {
      askConfirm('撤销上传链接', '确定撤销这个上传链接吗？', '撤销', async () => {
        try { await apiDelete(`/api/upload-links/${b.dataset.delUl}`); toast(t('msg.revoked')); loadUploadLinkList(); if (typeof loadSideUlLinks === 'function') loadSideUlLinks(); }
        catch (e) { toast('撤销失败：' + e.message); }
      });
    });
  } catch (e) { box.innerHTML = '<div class="muted">加载失败</div>'; }
}
let ulLinks = [];
async function loadSideUlLinks() {
  const box = $('#sideUlLinks');
  if (!box) return;
  try {
    const d = await apiGet('/api/upload-links');
    // 只显示当前桶的上传链接
    ulLinks = (d.links || []).filter(ul => !state.bucket || ul.bucket === state.bucket);
    $('#ulCount').textContent = ulLinks.length ? ulLinks.length + '个' : '';
    if (!ulLinks.length) {
      box.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:4px 12px">' + t('common.none') + '</div>';
      return;
    }
    box.innerHTML = ulLinks.map((ul, i) => {
      const nm = ul.name || t('msg.unnamed');
      const exp = ul.expiresAt ? new Date(ul.expiresAt * 1000).toLocaleDateString('zh-CN') : '';
      return `
      <div class="nav-item" data-ul="${i}" style="font-size:13px" title="${esc(nm)}${exp ? '（有效期至 ' + exp + '）' : ''}">
        ${ic('link', 15)}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nm)}</span>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-ul]').forEach(el => {
      el.onclick = () => openUlLinkView(parseInt(el.dataset.ul, 10));
      el.oncontextmenu = (e) => {
        e.preventDefault();
        const ul = ulLinks[parseInt(el.dataset.ul, 10)];
        showCtxMenu(e.clientX, e.clientY, [
          { label: '复制链接', icon: ic('copy', 15), fn: () => navigator.clipboard.writeText(ul.url).then(() => toast(t('msg.copied'))) },
          { label: t('common.delete'), icon: ic('trash', 15), danger: true, fn: () => delUlLink(ul) },
        ]);
      };
    });
  } catch (e) { /* ignore */ }
}
async function openUlLinkView(i) {
  const ul = ulLinks[i];
  if (!ul) return;
  const main = $('#main');
  main.innerHTML = `<div class="topbar"><h2>${ic('link')} ${esc(ul.name || t('msg.unnamed'))}</h2></div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">上传链接 · 共 <span id="ulFileCount">0</span> 个文件 · <button class="btn btn-sm" onclick="nav('files')">返回文件</button></div>
    <div id="ulFileGrid" class="fgrid sz-m"><div class="card" style="grid-column:1/-1;text-align:center;color:var(--muted);padding:30px">${t('common.loading')}</div></div>`;
  try {
    const d = await apiGet(`/api/upload-links/${ul.token}/files`);
    const keys = d.keys || [];
    $('#ulFileCount').textContent = keys.length;
    const grid = $('#ulFileGrid');
    if (!keys.length) {
      grid.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">暂无上传文件</div>';
      return;
    }
    // 保存到全局供下载用
    window._ulView = { ul, keys };
    grid.innerHTML = keys.map((k, idx) => {
      const name = k.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      const isImg = ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
      return `<div class="fitem">
        <div class="fic" data-ulthumb="${esc(k)}" data-isimg="${isImg ? '1' : '0'}" style="height:140px">${ic('file', 32)}</div>
        <div class="fsub" style="padding:10px 12px">
          <div class="fn" title="${esc(name)}" style="font-weight:600;font-size:14px;margin-bottom:4px">${esc(name)}</div>
          <div class="fs" style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(k)}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="ulFileDownload(${idx})">下载</button>
            <button class="btn btn-sm" style="color:#dc2626" onclick="ulFileDelete(${idx})">删除</button>
          </div>
        </div>
      </div>`;
    }).join('');
    // 加载缩略图（图片才加载）
    const imgEls = [...grid.querySelectorAll('[data-ulthumb]')].filter(el => el.dataset.isimg === '1');
    if (imgEls.length) {
      const keys = imgEls.map(el => el.dataset.ulthumb);
      apiPost(`/api/accounts/${ul.accountId}/presign-batch`, { bucket: ul.bucket, keys, op: 'preview', expires: 600 })
        .then(r => {
          imgEls.forEach(el => {
            const url = (r.urls || {})[el.dataset.ulthumb];
            if (url) el.innerHTML = `<img src="${esc(url)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
          });
        })
        .catch(() => {});
    }
  } catch (e) {
    $('#ulFileGrid').innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;color:#dc2626;padding:30px">加载失败：${esc(e.message)}</div>`;
  }
}
async function ulFileDownload(idx) {
  const { ul, keys } = window._ulView;
  const k = keys[idx];
  const name = k.split('/').pop();
  try {
    const d = await apiGet(`/api/accounts/${ul.accountId}/presign?bucket=${encodeURIComponent(ul.bucket)}&key=${encodeURIComponent(k)}&op=download&expires=600`);
    const a = document.createElement('a');
    a.href = d.url; a.download = name; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { toast('下载失败：' + e.message); }
}
async function ulFileDelete(idx) {
  const { ul, keys } = window._ulView;
  const k = keys[idx];
  if (!confirm(`删除 ${k.split('/').pop()}？`)) return;
  try {
    await apiPost(`/api/accounts/${ul.accountId}/delete`, { bucket: ul.bucket, keys: [k] });
    toast(t('msg.deleted'));
    // 从记录中删除
    keys.splice(idx, 1);
    openUlLinkView(ulLinks.indexOf(ul));
  } catch (e) { toast('删除失败：' + e.message); }
}





function delUlLink(ul) {
  askConfirm('删除上传链接', `确定删除「${ul.name}」吗？`, t('common.delete'), async () => {
    try {
      await apiDelete(`/api/upload-links/${ul.token}`);
      toast(t('msg.deleted'));
      loadSideUlLinks();
      loadUploadLinkList();
    } catch (e) { toast('删除失败：' + e.message); }
  });
}
async function refreshAccounts() {
  try {
    const d = await apiGet('/api/accounts');
    state.accounts = d.accounts || [];
    updateSwitcherLabel();
  } catch (e) { /* ignore */ }
}
async function loadAcctList() {
  const box = $('#acctList');
  try {
    const d = await apiGet('/api/accounts');
    state.accounts = d.accounts;
    updateSwitcherLabel();
    if (!d.accounts.length) { box.innerHTML = '<div class="empty" style="padding:20px">还没有账户，点击下方按钮添加</div>'; return; }
    box.innerHTML = d.accounts.map(a => `
      <div class="acct-row" style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px">
        <span class="prov-ic">${(PROVIDERS.find(p => p.id === a.provider) || {}).icon || ic('bucket')}</span>
        <div style="flex:1"><div style="font-weight:600">${esc(a.name)}</div>
          <div class="muted">${esc(a.provider)} · ${esc(a.endpoint)}${a.bucket ? ' · ' + ic('box', 13) + ' ' + esc(a.bucket) : ''}</div></div>
        <button class="btn btn-sm" data-edit="${a.id}">${t('common.edit')}</button>
        <button class="btn btn-sm" data-test="${a.id}">${t('common.test')}</button>
        <button class="btn btn-sm" data-del="${a.id}" style="color:#ef4444">删除</button>
      </div>`).join('');
    $$('[data-edit]', box).forEach(b => b.onclick = () => openWizard(parseInt(b.dataset.edit, 10)));
    $$('[data-test]', box).forEach(b => b.onclick = () => testAccount(parseInt(b.dataset.test, 10)));
    $$('[data-del]', box).forEach(b => b.onclick = () => {
      const a = state.accounts.find(x => x.id === parseInt(b.dataset.del, 10));
      askConfirm('删除账户', `确定删除账户「${a.name}」吗？只删除本地配置，不影响云端数据。`, t('common.delete'), async () => {
        try {
          await apiDel(`/api/accounts/${a.id}`);
          if (state.accountId === a.id) { state.accountId = null; state.bucket = ''; }
          toast(t('msg.deleted')); loadAcctList();
        } catch (e) { toast('删除失败：' + e.message); }
      });
    });
  } catch (e) { box.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`; }
}
async function testAccount(id) {
  toast('测试连接中…');
  try {
    const d = await apiPost(`/api/accounts/${id}/test`);
    toast(d.listable ? `连接成功，找到 ${d.buckets.length} 个存储桶` : '连接成功（密钥无权列出全部桶，已用指定桶验证）');
  } catch (e) { toast('连接失败：' + e.message, 4000); }
}

/* ---------- add-account wizard ---------- */
let wiz = {};
async function openWizard(editId) {
  if (editId) await refreshAccounts();
  const existing = editId ? state.accounts.find(a => a.id === editId) : null;
  wiz = { step: existing ? 2 : 1, provider: existing ? existing.provider : 'r2', editId: editId || null, existing };
  renderWizard();
  $('#previewModal').hidden = true; // reuse backdrop? no — use dedicated
  $('#wizModal').hidden = false;
}
function renderWizard() {
  let modal = $('#wizModal');
  if (!modal) {
    const div = document.createElement('div');
    div.className = 'modal-backdrop'; div.id = 'wizModal';
    div.innerHTML = `<div class="modal" style="width:520px;position:relative"><button class="modal-x" id="wizX" title="关闭">\u00d7</button><div id="wizBody"></div></div>`;
    document.body.appendChild(div);
    modal = div;
  }
  const isEdit = !!wiz.existing;
  let body = isEdit ? '' : `<div class="wiz-steps">${['选择服务商', '填写密钥', '完成'].map((s, i) =>
    `<div class="ws ${wiz.step === i + 1 ? 'active' : ''}">${s}</div>`).join('')}</div>`;
  if (wiz.step === 1) {
    body += `<h3 style="margin-top:0">${t('wizard.selectProvider')}</h3><div class="prov-grid">` +
      PROVIDERS.map(p => `<div class="prov-card ${wiz.provider === p.id ? 'sel' : ''}" data-prov="${p.id}">
        <div class="pi">${p.icon}</div><div class="pn">${p.name}</div></div>`).join('') +
      `</div><div class="modal-actions">
        <button class="btn" id="wizCancel">取消</button>
        <button class="btn btn-primary" id="wizNext">下一步</button></div>`;
  } else if (wiz.step === 2) {
    const p = PROVIDERS.find(x => x.id === wiz.provider);
    const ex = wiz.existing || {};
    const isEdit = !!wiz.existing;
    // R2 的 Account ID 从 endpoint 反解：https://<id>.r2.cloudflarestorage.com
    let acctId = '';
    if (wiz.provider === 'r2' && ex.endpoint) {
      const m = ex.endpoint.match(/https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/);
      if (m) acctId = m[1];
    }
    body += `<h3 style="margin-top:0">${isEdit ? '编辑账户' : p.icon + ' ' + p.name}</h3>${isEdit ? '' : `<p class="muted">${p.hint}</p>`}`;
    body += `<label class="fld"><span>起个名字（比如"我的 R2"）</span>
      <input class="input" id="wName" value="${esc(ex.name || '')}" placeholder="我的 R2"></label>`;
    if (wiz.provider === 'r2') body += `<label class="fld"><span>Account ID（账户ID）</span>
      <input class="input" id="wAccountId" value="${esc(acctId)}" placeholder="Cloudflare 面板右下角的 Account ID"></label>`;
    if (wiz.provider === 'oss' || wiz.provider === 'cos' || wiz.provider === 'qiniu')
      body += `<label class="fld"><span>地域</span><select class="input" id="wRegion">${regionOptions(wiz.provider, ex.region)}</select></label>`;
    if (wiz.provider === 'b2')
      body += `<label class="fld"><span>S3 Endpoint</span>
      <input class="input" id="wEndpoint" value="${esc(ex.endpoint || '')}" placeholder="s3.us-west-004.backblazeb2.com">
      <div class="hint">在 B2 控制台点进桶，复制 Endpoint 那一串填进来</div></label>
      <button class="btn btn-sm" id="b2HelpBtn" style="margin-bottom:12px">📖 配置说明（CORS 必看）</button>`;
    if (wiz.provider === 'minio' || wiz.provider === 'custom')
      body += `<label class="fld"><span>网关地址</span>
      <input class="input" id="wEndpoint" value="${esc(ex.endpoint || '')}" placeholder="https://minio.example.com"></label>`;
    body += `<label class="fld"><span>Access Key（访问密钥 ID）</span>
      <input class="input" id="wAK" value="${esc(ex.accessKey || '')}" autocomplete="off"></label>
      <label class="fld"><span>Secret Key（机密访问密钥）</span>
      <input class="input" id="wSK" type="password" autocomplete="new-password"
        placeholder="${wiz.existing ? '••••••••（已保存，留空不修改）' : ''}"></label>
      <label class="fld"><span>储存桶（必填，可填多个）</span>
      <input class="input" id="wBucket" value="${esc(ex.bucket || '')}" placeholder="pic, assets —— 多个用英文逗号分隔"></label>
      <label class="fld"><span>空间配额（可选）</span>
        <div style="display:flex;gap:8px">
          <input class="input" id="wQuota" type="number" min="0" step="any" placeholder="留空则不显示"
            value="${ex.quotaBytes ? (ex.quotaBytes >= 1099511627776 ? (ex.quotaBytes / 1099511627776).toFixed(2).replace(/\.?0+$/, '') : (ex.quotaBytes / 1073741824).toFixed(2).replace(/\.?0+$/, '')) : ''}" style="flex:1">
          <select class="input" id="wQuotaUnit" style="width:90px;flex:none">
            <option value="1073741824">GB</option>
            <option value="1099511627776" ${ex.quotaBytes >= 1099511627776 ? 'selected' : ''}>TB</option>
          </select>
        </div>
        <div class="hint">S3 协议查不到总空间，填了后仪表盘会显示使用率（仅用于展示）</div></label>
      <label class="fld"><span>自定义域名（可选）</span>
        <input class="input" id="wPubDomain" placeholder="如 pic.example.com（桶绑定的公开域名）" value="${esc(ex.publicDomain || '')}">
        <div class="hint">桶在服务商处绑定的公开域名，填了后分享时可直接给公开链接</div></label>
      <div id="wizErr" style="color:#ef4444;font-size:13px;min-height:20px"></div>
      <div class="modal-actions">
        ${wiz.existing ? '' : '<button class="btn" id="wizBack">上一步</button>'}
        <button class="btn" id="wizTest">测试连接</button>
        <button class="btn btn-primary" id="wizSave">${wiz.existing ? t('common.save') : '添加'}</button></div>`;
  } else {
    const names = (wiz.createdNames && wiz.createdNames.length ? wiz.createdNames : []).map(esc).join('、');
    body += `<div class="empty"><div class="big">${ic('checkCircle', 56)}</div><h3>添加成功！</h3>
      <p class="muted">${names ? `已添加：${names}<br>` : ''}去左下角切换到新账户，开始管理你的对象存储吧</p></div>
      <div class="modal-actions"><button class="btn btn-primary" id="wizDone">开始使用</button></div>`;
  }
  $('#wizBody').innerHTML = body;
  $('#wizModal').hidden = false;
  bindWizard();
}
function regionOptions(provider, sel) {
  const regions = {
    oss: [['oss-cn-hangzhou', '华东1（杭州）'], ['oss-cn-shanghai', '华东2（上海）'], ['oss-cn-beijing', '华北2（北京）'], ['oss-cn-shenzhen', '华南1（深圳）'], ['oss-cn-hongkong', '香港']],
    cos: [['ap-guangzhou', '广州'], ['ap-shanghai', '上海'], ['ap-beijing', '北京'], ['ap-hongkong', '香港'], ['ap-singapore', '新加坡']],
    qiniu: [['cn-east-1', '华东'], ['cn-north-1', '华北'], ['cn-south-1', '华南']],
    b2: [['us-west-000', '美西 (凤凰城)'], ['us-west-001', '美西1 (凤凰城)'], ['us-west-002', '美西2 (凤凰城)'], ['us-west-004', '美西4 (凤凰城)'], ['us-east-005', '美东 (雷斯顿)'], ['eu-central-003', '欧洲 (阿姆斯特丹)'], ['ca-east-006', '加拿大 (多伦多)']],
  }[provider] || [];
  return regions.map(([v, n]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${n}</option>`).join('');
}
function closeWizard() { $('#wizModal').hidden = true; }
function bindWizard() {
  const cancel = $('#wizCancel'); if (cancel) cancel.onclick = closeWizard;
  const x = $('#wizX'); if (x) x.onclick = closeWizard;
  const mb = $('#wizModal');
  if (mb && !mb._bound) {
    mb._bound = true;
    mb.addEventListener('mousedown', e => { if (e.target === mb) closeWizard(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#wizModal').hidden) closeWizard(); });
  }
  const next = $('#wizNext');
  if (next) next.onclick = () => { wiz.step = 2; renderWizard(); };
  $$('.prov-card').forEach(c => c.onclick = () => {
    wiz.provider = c.dataset.prov;
    $$('.prov-card').forEach(x => x.classList.toggle('sel', x === c));
  });
  const back = $('#wizBack'); if (back) back.onclick = () => { wiz.step = 1; renderWizard(); };
  const b2help = $('#b2HelpBtn');
  if (b2help) b2help.onclick = () => {
    showModal(`<h3>Backblaze B2 配置说明</h3>
    <div style="font-size:14px;line-height:1.7">
    <p><b>1. 创建 Application Key</b><br>
    B2 控制台 → Application Keys → Add a New Application Key<br>
    名字随便起，桶选你的桶，权限选 Read and Write。<br>
    创建后复制 <b>keyID</b>（填 Access Key）和 <b>applicationKey</b>（填 Secret Key）。<br>
    <span style="color:#ef4444">注意：applicationKey 只显示一次，关掉就看不到了！</span></p>
    <p><b>2. 复制 Endpoint</b><br>
    B2 控制台点进你的桶，复制 <b>Endpoint</b> 那一串（如 s3.us-west-004.backblazeb2.com），填到上面的 S3 Endpoint 输入框。</p>
    <p><b>3. 配置 CORS（否则上传会失败）</b><br>
    B2 网页版的 CORS 设置对 S3 接口不全，需要用命令行：<br>
    <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">pip install b2</code><br>
    <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">b2 account authorize</code>（输入 keyID 和 applicationKey）<br>
    然后执行：<br>
    <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;display:block;margin:6px 0;white-space:pre-wrap">b2 bucket update 你的桶名 allPrivate --cors-rules '[{"corsRuleName":"objdock","allowedOrigins":["https://你的ObjDock域名"],"allowedOperations":["s3_get","s3_put","s3_head","s3_post","s3_delete"],"allowedHeaders":["*"],"maxAgeSeconds":3600}]'</code>
    把 <b>你的桶名</b> 和 <b>你的ObjDock域名</b> 换成实际的。执行完等几分钟再生效。</p>
    <p><b>4. 回到这里点"测试连接"</b>，通了再点添加。</p>
    </div>`);
  };
  const test = $('#wizTest');
  if (test) test.onclick = () => wizardSave(true);
  const save = $('#wizSave');
  if (save) save.onclick = () => wizardSave(false);
  const done = $('#wizDone');
  if (done) done.onclick = async () => {
    $('#wizModal').hidden = true;
    await loadAcctList();
    if (wiz.newId) { await selectAccount(wiz.newId); loadSideFolders(); }
    nav('dash');
  };
}
function wizardPayload() {
  return {
    name: $('#wName').value.trim(),
    provider: wiz.provider,
    accountId: $('#wAccountId') ? $('#wAccountId').value.trim() : '',
    region: $('#wRegion') ? $('#wRegion').value : '',
    endpoint: $('#wEndpoint') ? $('#wEndpoint').value.trim() : '',
    accessKey: $('#wAK').value.trim(),
    secretKey: $('#wSK').value,
    bucket: $('#wBucket').value.trim(),
    publicDomain: (($('#wPubDomain') || {}).value || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
    quotaBytes: (() => {
      const v = parseFloat(($('#wQuota') || {}).value);
      const u = parseInt((($('#wQuotaUnit') || {}).value) || '1073741824', 10);
      return (!isNaN(v) && v > 0) ? Math.round(v * u) : 0;
    })(),
  };
}
async function wizardSave(testOnly) {
  const errBox = $('#wizErr');
  const payload = wizardPayload();
  const buckets = payload.bucket.split(',').map(b => b.trim()).filter(Boolean);
  if (!payload.name) { errBox.textContent = '请起个名字'; return; }
  if (!payload.accessKey) { errBox.textContent = '请填写 Access Key'; return; }
  if (!buckets.length) { errBox.textContent = '请填写储存桶名称'; const bf=$('#wBucket'); if(bf){bf.style.borderColor='#ef4444';bf.focus();} return; }
  if (!payload.secretKey && !wiz.existing) { errBox.textContent = '请填写 Secret Key'; return; }
  errBox.textContent = testOnly ? '测试连接中…' : '保存中…';
  errBox.style.color = '';
  const showResults = (t) => {
    // per-bucket results: ✓ pic  ✗ backup(不存在)
    const parts = (t.results || []).map(r =>
      r.ok ? `${ic('check', 13)} ${esc(r.bucket)}`
           : `${ic('x', 13)} ${esc(r.bucket)}（${esc(r.error || '失败')}）`);
    return parts.join('&nbsp;&nbsp;');
  };
  try {
    if (testOnly && !wiz.existing) {
      // 测试连接（不落库）
      const t = await apiPost('/api/accounts/test', payload);
      if (!t.ok) {
        errBox.style.color = '#ef4444';
        errBox.innerHTML = '失败：' + showResults(t);
        return;
      }
      errBox.style.color = '#10b981';
      errBox.innerHTML = `${ic('check', 14)} 连接成功：` + showResults(t);
      return;
    }
    // 添加/保存：先落库（编辑的测试仅做提示，不阻塞保存）
    if (wiz.editId) {
      await apiPut(`/api/accounts/${wiz.editId}`, payload);
      await refreshAccounts();
      try {
        const t = await apiPost(`/api/accounts/${wiz.editId}/test`, {});
        if (!t.ok) toast('已保存，但连接测试失败：' + (t.results || []).map(r => r.ok ? '' : `${r.bucket}：${r.error}`).filter(Boolean).join('；'));
        else toast('已保存，连接正常');
      } catch (e) { toast('已保存，连接测试失败：' + e.message); }
      $('#wizModal').hidden = true;
      if (typeof loadAcctList === 'function' && $('#acctList')) loadAcctList();
      return;
    } else {
      // 新建：每个桶一个账户
      const created = [], failed = [];
      for (const b of buckets) {
        const p = Object.assign({}, payload, {
          name: buckets.length > 1 ? `${payload.name} · ${b}` : payload.name,
          bucket: b,
        });
        try {
          const d = await apiPost('/api/accounts', p);
          const t = await apiPost(`/api/accounts/${d.account.id}/test`, {});
          if (t.ok) created.push(b);
          else { failed.push(`${b}（${(t.results || []).map(r => r.error).filter(Boolean).join(',') || '验证失败'}）`); await apiDel(`/api/accounts/${d.account.id}`); }
        } catch (e) { failed.push(`${b}（${e.message}）`); }
      }
      wiz.createdNames = created;
      if (!created.length) throw new Error('全部添加失败：' + failed.join('；'));
      if (failed.length) { errBox.style.color = '#d97706'; errBox.textContent = `已添加 ${created.join('、')}；失败：${failed.join('；')}`; await refreshAccounts(); return; }
    }
    wiz.step = 3;
    renderWizard();
  } catch (e) {
    errBox.style.color = '#ef4444';
    errBox.textContent = '失败：' + e.message;
  }
}
/* ---------- profile ---------- */
function renderProfile() {
  const u = state.user;
  const main = $('#main');
  $$('.nav-item[data-nav]').forEach(el => el.classList.remove('active'));
  main.innerHTML = `
    <div class="topbar"><h2>${ic('user')}修改登录信息</h2></div>
    <div class="card" style="max-width:480px">
      <label class="fld"><span>用户名（不可修改）</span><input class="input" value="${esc(u.username)}" disabled></label>
      <h4 style="margin:18px 0 8px">修改密码（不改请留空）</h4>
      <label class="fld"><span>当前密码</span><input class="input" id="pCur" type="password"></label>
      <label class="fld"><span>新密码（至少 8 位，字母+数字）</span><input class="input" id="pNew" type="password"></label>
      <div id="pErr" style="color:#ef4444;font-size:13px;min-height:20px"></div>
      <button class="btn btn-primary" id="pSave">${t('common.save')}</button>
    </div>`;
  $('#pSave').onclick = async () => {
    try {
      const d = await apiPut('/api/me', {
        currentPassword: $('#pCur').value,
        newPassword: $('#pNew').value,
      });
      if (d.relogin) { toast('密码已修改，请重新登录'); setTimeout(() => location.reload(), 1200); return; }
      toast(t('msg.saved'));
      renderShell(); await afterLogin();
    } catch (e) { $('#pErr').textContent = e.message; }
  };
}

/* ---------- boot ---------- */
async function boot() {
  initTheme();
  try {
    const me = await apiGet('/api/me');
    state.user = me;
    // 应用用户保存的语言偏好（如果本地没有手动设置过）
    try {
      const localLang = localStorage.getItem('objdock-lang');
      if (!localLang && me.language && LANGS[me.language]) {
        currentLang = me.language;
        document.documentElement.lang = me.language;
      }
    } catch (e) {}
    renderShell();
    await afterLogin();
  } catch (e) {
    renderAuth('login');
  }
}
async function afterLogin() {
  try {
    const d = await apiGet('/api/accounts');
    state.accounts = d.accounts;
  } catch (e) { state.accounts = []; }
  updateSwitcherLabel();
  if (state.accounts.length && !state.accountId) {
    let lastId = 0;
    try { lastId = parseInt(localStorage.getItem('objdock-account') || '0', 10); } catch (e) {}
    const found = state.accounts.find(x => x.id === lastId);
    await selectAccount(found ? found.id : state.accounts[0].id);
  }
  await loadSideFolders();
  loadSideUlLinks();
  nav('dash');
}
document.addEventListener('DOMContentLoaded', boot);
