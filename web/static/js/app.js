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
const apiDel = (u) => api('DELETE', u);

/* ---------- modal helpers ---------- */
let confirmCb = null, promptCb = null;
function askConfirm(title, msg, okText, cb) {
  $('#confirmTitle').textContent = title;
  $('#confirmMsg').textContent = msg;
  $('#confirmOk').textContent = okText || '确认';
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
    <div class="sub">对象存储的码头 · 自托管，密钥不出你的服务器</div>
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
    ${isLogin ? '' : '<label class="fld"><span>昵称</span><input class="input" id="aName" placeholder="怎么称呼你"></label>'}
    <label class="fld"><span>用户名</span><input class="input" id="aUser" autocomplete="username"></label>
    <label class="fld"><span>密码${isLogin ? '' : '（至少 6 位）'}</span><input class="input" id="aPass" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}"></label>
    <button class="btn btn-primary" id="aGo" style="width:100%;padding:11px">${isLogin ? '登录' : '注册'}</button>
    <div id="aErr" class="muted" style="color:#ef4444;margin-top:10px;text-align:center"></div>`;
  const go = async () => {
    const u = $('#aUser').value.trim(), p = $('#aPass').value;
    if (!u || !p) { $('#aErr').textContent = '请输入用户名和密码'; return; }
    try {
      if (isLogin) await apiPost('/api/login', { username: u, password: p });
      else await apiPost('/api/register', { username: u, password: p, displayName: $('#aName').value.trim() });
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
        <div><div class="t">ObjDock</div><div class="s">对象存储管理</div></div>
      </div>
      <div class="nav-item active" data-nav="dash">${ic('dash')}<span>仪表盘</span></div>
      <div class="nav-item" data-nav="files">${ic('folder')}<span>全部文件</span></div>
      <div class="nav-sec">文件夹</div>
      <div id="sideFolders"></div>
      <div class="side-foot">
        <div class="storage-switch" id="switcher">
          <div class="avatar" id="swAvatar">${ic('bucket')}</div>
          <div><div class="sname" id="swName">选择账户</div><div class="ssub" id="swSub">点击切换</div></div>
        </div>
        <div class="nav-item" data-nav="settings">${ic('settings')}<span>设置</span></div>
        <div class="acct-card" id="acctCard">
          <div class="avatar">${esc((u.displayName || u.username)[0].toUpperCase())}</div>
          <div><div class="sname">${esc(u.displayName || u.username)}</div><div class="ssub">${esc(u.username)}</div></div>
        </div>
      </div>
    </aside>
    <main class="main" id="main"></main>
  </div>
  <div class="dropdown" id="dropdown" hidden></div>`;
  $$('.nav-item[data-nav]').forEach(el => el.onclick = () => nav(el.dataset.nav));
  $('#switcher').onclick = (e) => { e.stopPropagation(); toggleSwitcher(); };
  $('#acctCard').onclick = (e) => { e.stopPropagation(); toggleAcctMenu(); };
  document.addEventListener('click', () => { $('#dropdown').hidden = true; });
  updateSwitcherLabel();
}
function nav(which) {
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
}
function toggleSwitcher() {
  const dd = $('#dropdown');
  if (!dd.hidden) { dd.hidden = true; return; }
  const r = $('#switcher').getBoundingClientRect();
  dd.style.left = r.left + 'px';
  dd.style.top = ''; dd.style.bottom = '';
  dd.style.visibility = 'hidden'; dd.hidden = false;
  let html = '<div class="dsec">账户</div>';
  if (!state.accounts.length) html += '<div class="di" onclick="nav(\'settings\')">＋ 去设置里添加账户</div>';
  state.accounts.forEach(a => {
    html += `<div class="di ${a.id === state.accountId ? 'sel' : ''}" data-acct="${a.id}">${ic('bucket', 16)} ${esc(a.name)}</div>`;
  });
  html += '<div class="dsec">存储桶</div><div id="ddBuckets"><div class="di muted">先选择账户…</div></div>';
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
  });
  if (state.accountId) toggleSwitcherRefreshBuckets();
}
async function toggleSwitcherRefreshBuckets() {
  const box = $('#ddBuckets');
  if (!box) return;
  box.innerHTML = '<div class="di muted">加载中…</div>';
  try {
    const d = await apiGet(`/api/accounts/${state.accountId}/buckets`);
    const cur = state.accounts.find(x => x.id === state.accountId);
    let names = d.buckets.map(b => b.name);
    if (cur && cur.bucket && !names.includes(cur.bucket)) names.unshift(cur.bucket);
    box.innerHTML = names.map(n =>
      `<div class="di ${n === state.bucket ? 'sel' : ''}" data-bucket="${esc(n)}">${ic('box', 15)} ${esc(n)}</div>`).join('')
      || '<div class="di muted">没有存储桶</div>';
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
    <div class="di" id="mProfile">${ic('user')}修改登录信息</div>
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
    main.innerHTML = `<div class="card"><h3>${ic('dash')}仪表盘</h3>
      <div class="empty"><div class="big">${ic('bucket', 56)}</div>
      ${state.accounts.length ? '请先在左下角选择账户和存储桶' : '还没有绑定任何账户，去 <a href="javascript:nav(\'settings\')">设置</a> 添加第一个吧'}
      </div></div>`;
    return;
  }
  main.innerHTML = `<div class="topbar"><h2>${ic('dash')}仪表盘</h2><div class="spacer"></div>
    <button class="btn btn-sm" id="dashRefresh">↻ 重新统计</button></div>
    <div id="dashBody"><div class="empty">统计中…</div></div>`;
  $('#dashRefresh').onclick = () => { delete state.statsCache[state.accountId + '/' + state.bucket]; renderDash(); };
  await refreshAccounts();
  // 配额卡片独立显示，不依赖统计接口成败
  const acct = state.accounts.find(x => x.id === state.accountId) || {};
  const quota = acct.quotaBytes || 0;
  if (quota > 0) {
    const qb = `<div class="card" id="quotaCard"><h3>${ic('drive')}空间使用</h3>
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
        $('#dashBody').innerHTML = `<div class="card"><h3>${ic('drive')}空间使用</h3>
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
  let trendSvg = '<div class="muted">暂无历史数据（每天统计一次后生成趋势）</div>';
  if (trend.length >= 2) {
    const max = Math.max(...trend.map(p => p.totalSize), 1);
    const W = 600, H = 110, pts = trend.map((p, i) =>
      `${(i / (trend.length - 1) * W).toFixed(1)},${(H - 8 - (p.totalSize / max) * (H - 20)).toFixed(1)}`).join(' ');
    trendSvg = `<svg class="trend" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>
      <div class="muted">${esc(trend[0].day)} → ${esc(trend[trend.length - 1].day)}，${fmtSize(trend[0].totalSize)} → ${fmtSize(trend[trend.length - 1].totalSize)}</div>`;
  }
  const acct = state.accounts.find(x => x.id === state.accountId) || {};
  quota = acct.quotaBytes || quota || 0;
  let quotaHtml = '';
  if (quota > 0) {
    const pct = Math.min(100, (d.totalSize / quota * 100));
    const left = Math.max(0, quota - d.totalSize);
    const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6';
    quotaHtml = `<div class="card"><h3>${ic('drive')}空间使用</h3>
      <p class="desc">已用 ${fmtSize(d.totalSize)} / 总计 ${fmtSize(quota)}（${pct.toFixed(1)}%），剩余 ${fmtSize(left)}</p>
      <div style="height:12px;background:#f1f5f9;border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:${barColor};border-radius:6px;transition:width .5s ease"></div>
      </div></div>`;
  }
  $('#dashBody').innerHTML = quotaHtml + `
    <div class="stat-grid">
      <div class="stat"><div class="ic" style="background:#dbeafe;color:#2563eb">${ic('drive')}</div><div><div class="v">${fmtSize(d.totalSize)}</div><div class="l">总存储量</div><div class="s">${d.truncated ? '约 ' : ''}${d.fileCount} 个文件${d.truncated ? '（仅扫描前 ' + d.scanned + ' 个）' : ''}</div></div></div>
      <div class="stat"><div class="ic" style="background:#ede9fe;color:#7c3aed">${ic('file')}</div><div><div class="v">${d.fileCount}</div><div class="l">文件</div><div class="s">文件夹 ${d.byFolder.length} 个</div></div></div>
      <div class="stat"><div class="ic" style="background:#fef3c7;color:#d97706">${ic('layers')}</div><div><div class="v">${fmtSize(d.avgSize)}</div><div class="l">平均文件大小</div><div class="s">最大 ${fmtSize(d.largest.size)}</div></div></div>
      <div class="stat"><div class="ic" style="background:#dcfce7;color:#059669">${ic('clock')}</div><div><div class="v">${d.weekCount}</div><div class="l">最近 7 天修改</div><div class="s">最活跃 ${Object.keys(act).sort().pop() || '-'}</div></div></div>
    </div>
    <div class="panels">
      <div class="panel"><h4>按文件夹统计存储</h4>
        ${d.byFolder.map(f => `<div class="bar-row"><span class="bn" title="${esc(f.name)}">${esc(f.name)}</span>
          <span class="bt"><span class="bf" style="display:block;width:${(f.value / maxF * 100).toFixed(1)}%"></span></span>
          <span class="bv">${fmtSize(f.value)}</span></div>`).join('') || '<div class="muted">无数据</div>'}
      </div>
      <div class="panel"><h4>按类型统计存储</h4><div class="donut-wrap">
        <svg width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="54" fill="#f1f5f9"/>${segs}
          <text x="70" y="66" text-anchor="middle" font-size="13" font-weight="700">${fmtSize(d.totalSize)}</text>
          <text x="70" y="84" text-anchor="middle" font-size="11" fill="#8a94a6">总计</text></svg>
        <div class="legend">${d.byType.map((t, i) =>
          `<div class="lr"><span class="dot" style="background:${DONUT_COLORS[i % 8]}"></span>${esc(t.name)}
           <span class="muted">${fmtSize(t.value)} ${(t.value / typeTotal * 100).toFixed(0)}%</span></div>`).join('')}
        </div></div>
      </div>
    </div>
    <div class="card"><h3>${ic('trend')}存储增长趋势</h3><p class="desc">每天统计一次，记录总用量变化</p>${trendSvg}</div>
    <div class="card"><h3>${ic('calendar')}文件活跃度（近 30 天）</h3>
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
      <div class="empty"><div class="big">${ic('bucket', 56)}</div>请先在左下角选择账户和存储桶</div></div>`;
    return;
  }
  selKeys = new Set();
  main.innerHTML = `
    <div class="topbar"><h2>${ic('folder')}全部文件</h2><div class="spacer"></div>
      <select class="input input-sm" id="sortSel" title="排序">
        <option value="time-desc">时间 ↓ 新到旧</option>
        <option value="time-asc">时间 ↑ 旧到新</option>
        <option value="size-desc">大小 ↓ 大到小</option>
        <option value="size-asc">大小 ↑ 小到大</option>
        <option value="name-asc">名称 A-Z</option>
        <option value="name-desc">名称 Z-A</option>
      </select>
      <div class="view-toggle" id="sizeSeg">
        <button data-sz="small" class="${state.thumbSize === 'small' ? 'active' : ''}">小</button>
        <button data-sz="medium" class="${state.thumbSize === 'medium' ? 'active' : ''}">中</button>
        <button data-sz="large" class="${state.thumbSize === 'large' ? 'active' : ''}">大</button>
      </div>
      <div class="view-toggle">
        <button id="vGrid" class="${state.view === 'grid' ? 'active' : ''}">${ic('grid', 15)}缩略图</button>
        <button id="vList" class="${state.view === 'list' ? 'active' : ''}">${ic('list', 15)}列表</button>
      </div>
      <button class="btn btn-sm" id="btnSelect">${ic('check', 15)}选择</button>
      <button class="btn btn-sm" id="btnUpload">${ic('upload', 15)}上传</button>
      <button class="btn btn-sm" id="btnMkdir">${ic('folderPlus', 15)}新建文件夹</button>
      <button class="btn btn-sm" id="btnRefresh">↻</button>
    </div>
    <div class="crumbs" id="crumbs"></div>
    <div class="toolbar" id="selBar" hidden>
      <span id="selCount"></span>
      <button class="btn btn-sm" id="btnSelAll">全选</button>
      <button class="btn btn-sm" id="btnDelSel">${ic('trash', 15)}删除所选</button>
      <button class="btn btn-sm" id="btnClearSel">退出选择</button>
    </div>
    <div id="fileBody"><div class="empty">加载中…</div></div>`;
  $('#vGrid').onclick = () => setView('grid');
  $('#vList').onclick = () => setView('list');
  $('#btnUpload').onclick = () => $('#filePicker').click();
  $('#btnMkdir').onclick = () => {
    $('#promptInput').placeholder = '例如：我的照片';
    askPrompt('新建文件夹', '在当前目录下创建一个新文件夹', '', async (v) => {
    v = v.trim().replace(/\//g, '');
    if (!v) return;
    try {
      await apiPost(`/api/accounts/${state.accountId}/mkdir`, { bucket: state.bucket, path: state.prefix + v });
      toast('已创建'); loadFiles();
    } catch (e) { toast('创建失败：' + e.message); }
    });
  };
  $('#btnRefresh').onclick = () => loadFiles();
  $('#btnDelSel').onclick = deleteSelected;
  $('#btnClearSel').onclick = () => {
    state.selectMode = false; selKeys.clear();
    const g = $('.fgrid');
    if (g) {
      g.classList.remove('selecting');
      $$('.fitem.sel', g).forEach(el => el.classList.remove('sel'));
      $$('.fitem .check', g).forEach(cb => cb.checked = false);
      $('#btnSelect').classList.remove('active');
      $('#btnSelAll').textContent = '全选';
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
    $('#btnSelAll').textContent = every ? '全选' : '全不选';
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
    loadSideFolders(d);
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
        <div class="fmeta"><div class="fn">${esc(f.name)}</div><div class="fs">文件夹</div></div></div>`;
    });
    sortFiles(d.files).forEach(f => {
      const sel = selKeys.has(f.key) ? ' sel' : '';
      const check = `<input type="checkbox" class="check" ${selKeys.has(f.key) ? 'checked' : ''} data-check="${esc(f.key)}">`;
      h += `<div class="fitem${sel}" data-key="${esc(f.key)}" data-kind="${f.kind}" data-name="${esc(f.name)}">
        ${check}
        <div class="fic" data-thumb="${esc(f.key)}|${f.kind}">${iconFor(f.kind)}</div>
        <div class="fmeta"><div class="fn" title="${esc(f.name)}">${esc(f.name)}</div><div class="fs">${fmtSize(f.size)} · ${fmtDate(f.lastModified).slice(0, 10)}</div></div></div>`;
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
          <button class="icon-btn" data-act="download" title="下载">${ic('download')}</button>
          <button class="icon-btn" data-act="share" title="分享">${ic('link')}</button>
          <button class="icon-btn" data-act="rename" title="重命名">${ic('pencil')}</button>
          <button class="icon-btn danger" data-act="delete" title="删除">${ic('trash')}</button>
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
  askConfirm('删除文件', `确定删除选中的 ${selKeys.size} 个文件吗？此操作不可恢复。`, '删除', async () => {
    try {
      await apiPost(`/api/accounts/${state.accountId}/delete`, { bucket: state.bucket, keys: [...selKeys] });
      toast(`已删除 ${selKeys.size} 个`); selKeys.clear(); loadFiles();
    } catch (e) { toast('删除失败：' + e.message); }
  });
}
function fileAction(act, key, name, kind) {
  if (act === 'preview') openPreview(key, name, kind);
  else if (act === 'download') downloadFile(key, name);
  else if (act === 'share') openShare(key, name);
  else if (act === 'rename') askPrompt('重命名', '新文件名', name, async (v) => {
    v = v.trim();
    if (!v || v === name) return;
    const dst = state.prefix + v;
    try {
      await apiPost(`/api/accounts/${state.accountId}/rename`, { bucket: state.bucket, src: key, dst });
      toast('已重命名'); loadFiles();
    } catch (e) { toast('重命名失败：' + e.message); }
  });
  else if (act === 'delete') askConfirm('删除文件', `确定删除 ${name} 吗？此操作不可恢复。`, '删除', async () => {
    try {
      await apiPost(`/api/accounts/${state.accountId}/delete`, { bucket: state.bucket, keys: [key] });
      toast('已删除'); loadFiles();
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
  $('#previewBody').innerHTML = '<div class="muted">加载中…</div>';
  $('#previewModal').hidden = false;
  try {
    const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}&op=preview&expires=3600`);
    const url = p.url, body = $('#previewBody');
    if (kind === 'image') body.innerHTML = `<img src="${esc(url)}">`;
    else if (kind === 'video') body.innerHTML = `<video src="${esc(url)}" controls></video>`;
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
function openShare(key, name) {
  shareKey = key; shareName = name;
  $('#shareResult').hidden = true;
  $('#shareModal').hidden = false;
}
$('#shareCancel').onclick = () => $('#shareModal').hidden = true;
$('#shareGen').onclick = async () => {
  const exp = $('#shareExpiry').value;
  try {
    const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(shareKey)}&op=share&expires=${exp}`);
    $('#shareUrl').value = p.url;
    $('#shareResult').hidden = false;
  } catch (e) { toast('生成失败：' + e.message); }
};
$('#shareCopy').onclick = () => { $('#shareUrl').select(); document.execCommand('copy'); toast('已复制'); };

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
        xhr.onerror = () => reject(new Error('网络错误（检查存储桶 CORS 配置）'));
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
      r.st.title = err.message;
      failed++;
    }
  }
  const sum = document.createElement('div');
  sum.style.cssText = 'padding:12px 0 0;font-weight:600';
  sum.textContent = failed ? `完成：${done} 成功，${failed} 失败（悬停"失败"看原因）` : `全部上传成功（${done} 个文件）`;
  list.appendChild(sum);
  delete state.statsCache[state.accountId + '/' + state.bucket];
  if ($('.nav-item.active')?.dataset.nav === 'files') loadFiles();
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
const PROVIDERS = [
  { id: 'r2', name: 'Cloudflare R2', icon: ic('cloud'), hint: '填写 Account ID，地址自动生成' },
  { id: 's3', name: 'Amazon S3', icon: ic('server'), hint: '全球/区域 endpoint 自动处理' },
  { id: 'oss', name: '阿里云 OSS', icon: ic('bucket'), hint: '选择地域，地址自动生成' },
  { id: 'cos', name: '腾讯云 COS', icon: ic('layers'), hint: '选择地域，地址自动生成' },
  { id: 'qiniu', name: '七牛云', icon: ic('zap'), hint: 'S3 兼容接口' },
  { id: 'minio', name: 'MinIO / 自建', icon: ic('monitor'), hint: '填写你的网关地址' },
];
function renderSettings() {
  const main = $('#main');
  main.innerHTML = `
    <div class="topbar"><h2>${ic('settings')}设置</h2></div>
    <div class="card"><h3>${ic('bucket')}存储账户</h3><p class="desc">绑定多个对象存储账户，左下角一键切换</p>
      <div id="acctList"></div>
      <button class="btn btn-primary" id="btnAddAcct" style="margin-top:12px">＋ 添加账户</button>
    </div>
    <div class="card" id="regCard" hidden><h3>${ic('lock')}注册设置</h3><p class="desc">关闭后将无法注册新用户（仅管理员可见）</p>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer">
        <input type="checkbox" id="regToggle" style="width:18px;height:18px"> 允许新用户注册
      </label>
    </div>`;
  $('#btnAddAcct').onclick = () => openWizard();
  loadAcctList();
  if (state.user.admin) {
    $('#regCard').hidden = false;
    apiGet('/api/settings').then(d => { $('#regToggle').checked = !!d.registrationEnabled; }).catch(() => {});
    $('#regToggle').onchange = async (e) => {
      try { await apiPut('/api/settings', { registrationEnabled: e.target.checked }); toast('已保存'); }
      catch (err) { toast('保存失败：' + err.message); e.target.checked = !e.target.checked; }
    };
  }
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
        <button class="btn btn-sm" data-edit="${a.id}">编辑</button>
        <button class="btn btn-sm" data-test="${a.id}">测试</button>
        <button class="btn btn-sm" data-del="${a.id}" style="color:#ef4444">删除</button>
      </div>`).join('');
    $$('[data-edit]', box).forEach(b => b.onclick = () => openWizard(parseInt(b.dataset.edit, 10)));
    $$('[data-test]', box).forEach(b => b.onclick = () => testAccount(parseInt(b.dataset.test, 10)));
    $$('[data-del]', box).forEach(b => b.onclick = () => {
      const a = state.accounts.find(x => x.id === parseInt(b.dataset.del, 10));
      askConfirm('删除账户', `确定删除账户「${a.name}」吗？只删除本地配置，不影响云端数据。`, '删除', async () => {
        try {
          await apiDel(`/api/accounts/${a.id}`);
          if (state.accountId === a.id) { state.accountId = null; state.bucket = ''; }
          toast('已删除'); loadAcctList();
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
    body += `<h3 style="margin-top:0">选择服务商</h3><div class="prov-grid">` +
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
      <div id="wizErr" style="color:#ef4444;font-size:13px;min-height:20px"></div>
      <div class="modal-actions">
        ${wiz.existing ? '' : '<button class="btn" id="wizBack">上一步</button>'}
        <button class="btn" id="wizTest">测试连接</button>
        <button class="btn btn-primary" id="wizSave">${wiz.existing ? '保存' : '添加'}</button></div>`;
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
      <label class="fld"><span>昵称</span><input class="input" id="pName" value="${esc(u.displayName || '')}"></label>
      <h4 style="margin:18px 0 8px">修改密码（不改请留空）</h4>
      <label class="fld"><span>当前密码</span><input class="input" id="pCur" type="password"></label>
      <label class="fld"><span>新密码（至少 6 位）</span><input class="input" id="pNew" type="password"></label>
      <div id="pErr" style="color:#ef4444;font-size:13px;min-height:20px"></div>
      <button class="btn btn-primary" id="pSave">保存</button>
    </div>`;
  $('#pSave').onclick = async () => {
    try {
      const d = await apiPut('/api/me', {
        displayName: $('#pName').value.trim(),
        currentPassword: $('#pCur').value,
        newPassword: $('#pNew').value,
      });
      if (d.relogin) { toast('密码已修改，请重新登录'); setTimeout(() => location.reload(), 1200); return; }
      toast('已保存'); state.user.displayName = $('#pName').value.trim() || state.user.username;
      renderShell(); await afterLogin();
    } catch (e) { $('#pErr').textContent = e.message; }
  };
}

/* ---------- boot ---------- */
async function boot() {
  try {
    const me = await apiGet('/api/me');
    state.user = me;
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
    await selectAccount(state.accounts[0].id);
  }
  await loadSideFolders();
  nav('dash');
}
document.addEventListener('DOMContentLoaded', boot);
