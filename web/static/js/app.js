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
  settings: {},
  statsCache: {},
};

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
    <div class="logo">⚓</div>
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
  const m = { image: '🖼️', video: '🎬', audio: '🎵', pdf: '📄', text: '📝', archive: '🗜️', office: '📊', file: '📄', folder: '📁' };
  return m[kind] || m.file;
}
function renderShell() {
  const u = state.user;
  $('#app').innerHTML = `
  <div class="layout">
    <aside class="sidebar">
      <div class="side-switch" id="switcher">
        <div class="avatar" id="swAvatar">🪣</div>
        <div><div class="sname" id="swName">选择账户</div><div class="ssub" id="swSub">点击切换</div></div>
      </div>
      <div class="nav-item active" data-nav="dash">📊 仪表盘</div>
      <div class="nav-item" data-nav="files">📁 全部文件</div>
      <div class="nav-sec">文件夹</div>
      <div id="sideFolders"></div>
      <div class="side-foot">
        <div class="nav-item" data-nav="settings">⚙️ 设置</div>
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
  dd.style.left = r.left + 'px'; dd.style.top = (r.bottom + 6) + 'px';
  let html = '<div class="dsec">账户</div>';
  if (!state.accounts.length) html += '<div class="di" onclick="nav(\'settings\')">＋ 去设置里添加账户</div>';
  state.accounts.forEach(a => {
    html += `<div class="di ${a.id === state.accountId ? 'sel' : ''}" data-acct="${a.id}">🪣 ${esc(a.name)}</div>`;
  });
  html += '<div class="dsec">存储桶</div><div id="ddBuckets"><div class="di muted">先选择账户…</div></div>';
  dd.innerHTML = html;
  dd.hidden = false;
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
      `<div class="di ${n === state.bucket ? 'sel' : ''}" data-bucket="${esc(n)}">📦 ${esc(n)}</div>`).join('')
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
    <div class="di" id="mProfile">👤 修改登录信息</div>
    <div class="di" id="mLogout">🚪 退出登录</div>`;
  dd.hidden = false;
  $('#mProfile').onclick = (e) => { e.stopPropagation(); dd.hidden = true; renderProfile(); };
  $('#mLogout').onclick = async (e) => { e.stopPropagation(); await apiPost('/api/logout'); location.reload(); };
}

/* ---------- dashboard ---------- */
const DONUT_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#64748b', '#ec4899', '#14b8a6'];
async function renderDash() {
  const main = $('#main');
  if (!state.accountId || !state.bucket) {
    main.innerHTML = `<div class="card"><h3>📊 仪表盘</h3>
      <div class="empty"><div class="big">🪣</div>
      ${state.accounts.length ? '请先在左上角选择账户和存储桶' : '还没有绑定任何账户，去 <a href="javascript:nav(\'settings\')">设置</a> 添加第一个吧'}
      </div></div>`;
    return;
  }
  main.innerHTML = `<div class="topbar"><h2>📊 仪表盘</h2><div class="spacer"></div>
    <button class="btn btn-sm" id="dashRefresh">↻ 重新统计</button></div>
    <div id="dashBody"><div class="empty">统计中…</div></div>`;
  $('#dashRefresh').onclick = () => { delete state.statsCache[state.accountId + '/' + state.bucket]; renderDash(); };
  await loadDash();
}
async function loadDash() {
  const key = state.accountId + '/' + state.bucket;
  let d = state.statsCache[key];
  if (!d) {
    try { d = await apiGet(`/api/accounts/${state.accountId}/stats?bucket=${encodeURIComponent(state.bucket)}`); }
    catch (e) { $('#dashBody').innerHTML = `<div class="empty">统计失败：${esc(e.message)}</div>`; return; }
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
  // heatmap: last 53 weeks
  const act = d.activity || {};
  let hm = '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - 7 * 53 - today.getDay());
  for (let w = 0; w < 53; w++) {
    for (let i = 0; i < 7; i++) {
      const dt = new Date(start); dt.setDate(dt.getDate() + w * 7 + i);
      if (dt > today) { hm += '<div class="hd" style="background:transparent"></div>'; continue; }
      const k = dt.toISOString().slice(0, 10);
      const c = act[k] || 0;
      const lv = c >= 8 ? 'lv4' : c >= 4 ? 'lv3' : c >= 2 ? 'lv2' : c >= 1 ? 'lv1' : '';
      hm += `<div class="hd ${lv}" title="${k}：${c} 个文件"></div>`;
    }
  }
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
  $('#dashBody').innerHTML = `
    <div class="stat-grid">
      <div class="stat"><div class="ic" style="background:#dbeafe">💾</div><div><div class="v">${fmtSize(d.totalSize)}</div><div class="l">总存储量</div><div class="s">${d.truncated ? '约 ' : ''}${d.fileCount} 个文件${d.truncated ? '（仅扫描前 ' + d.scanned + ' 个）' : ''}</div></div></div>
      <div class="stat"><div class="ic" style="background:#ede9fe">📁</div><div><div class="v">${d.fileCount}</div><div class="l">文件</div><div class="s">文件夹 ${d.byFolder.length} 个</div></div></div>
      <div class="stat"><div class="ic" style="background:#fef3c7">📏</div><div><div class="v">${fmtSize(d.avgSize)}</div><div class="l">平均文件大小</div><div class="s">最大 ${fmtSize(d.largest.size)}</div></div></div>
      <div class="stat"><div class="ic" style="background:#dcfce7">🕐</div><div><div class="v">${d.weekCount}</div><div class="l">最近 7 天修改</div><div class="s">最活跃 ${Object.keys(act).sort().pop() || '-'}</div></div></div>
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
    <div class="card"><h3>📈 存储增长趋势</h3><p class="desc">每天统计一次，记录总用量变化</p>${trendSvg}</div>
    <div class="card"><h3>🗓️ 文件活跃度（近一年）</h3><div class="heat">${hm}</div></div>`;
}

/* ---------- file browser ---------- */
let selKeys = new Set();
async function renderFiles() {
  const main = $('#main');
  if (!state.accountId || !state.bucket) {
    main.innerHTML = `<div class="card"><h3>📁 全部文件</h3>
      <div class="empty"><div class="big">🪣</div>请先在左上角选择账户和存储桶</div></div>`;
    return;
  }
  selKeys = new Set();
  main.innerHTML = `
    <div class="topbar"><h2>📁 全部文件</h2><div class="spacer"></div>
      <div class="view-toggle">
        <button id="vGrid" class="${state.view === 'grid' ? 'active' : ''}">🔲 缩略图</button>
        <button id="vList" class="${state.view === 'list' ? 'active' : ''}">📋 列表</button>
      </div>
      <button class="btn btn-sm" id="btnUpload">⬆️ 上传</button>
      <button class="btn btn-sm" id="btnMkdir">📁 新建文件夹</button>
      <button class="btn btn-sm" id="btnRefresh">↻</button>
    </div>
    <div class="crumbs" id="crumbs"></div>
    <div class="toolbar" id="selBar" hidden>
      <span id="selCount"></span>
      <button class="btn btn-sm" id="btnDelSel">🗑️ 删除所选</button>
      <button class="btn btn-sm" id="btnClearSel">取消选择</button>
    </div>
    <div id="fileBody"><div class="empty">加载中…</div></div>`;
  $('#vGrid').onclick = () => setView('grid');
  $('#vList').onclick = () => setView('list');
  $('#btnUpload').onclick = () => $('#filePicker').click();
  $('#btnMkdir').onclick = () => askPrompt('新建文件夹', '在当前目录下创建', '', async (v) => {
    v = v.trim().replace(/\//g, '');
    if (!v) return;
    try {
      await apiPost(`/api/accounts/${state.accountId}/mkdir`, { bucket: state.bucket, path: state.prefix + v });
      toast('已创建'); loadFiles();
    } catch (e) { toast('创建失败：' + e.message); }
  });
  $('#btnRefresh').onclick = () => loadFiles();
  $('#btnDelSel').onclick = deleteSelected;
  $('#btnClearSel').onclick = () => { selKeys.clear(); loadFiles(); };
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
  let h = `<span class="c" data-p="">📦 ${esc(state.bucket)}</span>`;
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
function renderFileList(d) {
  const body = $('#fileBody');
  updateSelBar();
  if (!d.folders.length && !d.files.length) {
    body.innerHTML = `<div class="empty"><div class="big">📂</div>空文件夹，把文件拖进来上传吧</div>`;
    return;
  }
  if (state.view === 'grid') {
    let h = '<div class="fgrid">';
    d.folders.forEach(f => {
      h += `<div class="fitem" data-folder="${esc(f.prefix)}"><div class="fic">📁</div><div class="fn">${esc(f.name)}</div></div>`;
    });
    d.files.forEach(f => {
      const sel = selKeys.has(f.key) ? ' sel' : '';
      h += `<div class="fitem${sel}" data-key="${esc(f.key)}" data-kind="${f.kind}" data-name="${esc(f.name)}">
        <input type="checkbox" class="check" ${selKeys.has(f.key) ? 'checked' : ''} data-check="${esc(f.key)}">
        <div class="fic" data-thumb="${esc(f.key)}|${f.kind}">${iconFor(f.kind)}</div>
        <div class="fn">${esc(f.name)}</div><div class="fs">${fmtSize(f.size)}</div></div>`;
    });
    body.innerHTML = h + '</div>';
    $$('.fitem[data-folder]', body).forEach(el => el.ondblclick = () => { state.prefix = el.dataset.folder; loadFiles(); });
    $$('.fitem[data-key]', body).forEach(el => {
      el.onclick = (e) => {
        if (e.target.dataset.check !== undefined) {
          const k = e.target.dataset.check;
          e.target.checked ? selKeys.add(k) : selKeys.delete(k);
          el.classList.toggle('sel', e.target.checked);
          updateSelBar(); return;
        }
        openPreview(el.dataset.key, el.dataset.name, el.dataset.kind);
      };
    });
    // 图片缩略图
    $$('[data-thumb]', body).forEach(async (el) => {
      const [key, kind] = el.dataset.thumb.split('|');
      if (kind !== 'image') return;
      try {
        const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}&op=preview&expires=600`);
        el.innerHTML = `<img src="${esc(p.url)}" loading="lazy">`;
      } catch (e) { /* keep icon */ }
    });
  } else {
    let h = `<table class="ftable"><thead><tr><th style="width:34px"></th><th>名称</th><th>大小</th><th>修改时间</th><th style="width:190px">操作</th></tr></thead><tbody>`;
    d.folders.forEach(f => {
      h += `<tr><td></td><td><span class="rname" data-folder="${esc(f.prefix)}">📁 ${esc(f.name)}</span></td>
        <td class="muted">—</td><td class="muted">—</td><td></td></tr>`;
    });
    d.files.forEach(f => {
      h += `<tr><td><input type="checkbox" data-check="${esc(f.key)}" ${selKeys.has(f.key) ? 'checked' : ''}></td>
        <td><span class="rname" data-key="${esc(f.key)}" data-kind="${f.kind}" data-name="${esc(f.name)}">${iconFor(f.kind)} ${esc(f.name)}</span></td>
        <td>${fmtSize(f.size)}</td><td class="muted">${fmtDate(f.lastModified)}</td>
        <td><div class="row-actions">
          <button class="icon-btn" data-act="preview" title="预览">👁️</button>
          <button class="icon-btn" data-act="download" title="下载">⬇️</button>
          <button class="icon-btn" data-act="share" title="分享">🔗</button>
          <button class="icon-btn" data-act="rename" title="重命名">✏️</button>
          <button class="icon-btn" data-act="delete" title="删除">🗑️</button>
        </div></td></tr>`;
    });
    body.innerHTML = h + '</tbody></table>';
    $$('[data-folder]', body).forEach(el => el.ondblclick = () => { state.prefix = el.dataset.folder; loadFiles(); });
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
  bar.hidden = selKeys.size === 0;
  $('#selCount').textContent = `已选 ${selKeys.size} 个`;
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

/* ---------- upload ---------- */
$('#filePicker').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  e.target.value = '';
  if (!files.length || !state.accountId) return;
  for (const f of files) {
    const key = state.prefix + f.name;
    try {
      toast(`上传中：${f.name}…`);
      const p = await apiGet(`/api/accounts/${state.accountId}/presign?bucket=${encodeURIComponent(state.bucket)}&key=${encodeURIComponent(key)}&op=upload&expires=3600`);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', p.url);
        xhr.setRequestHeader('Content-Type', f.type || 'application/octet-stream');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) toast(`上传中：${f.name} ${Math.round(ev.loaded / ev.total * 100)}%`, 900);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('HTTP ' + xhr.status));
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.send(f);
      });
      toast(`上传完成：${f.name}`);
    } catch (err) { toast(`上传失败 ${f.name}：${err.message}`); }
  }
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
      `<div class="folder-item" data-p="${esc(f.prefix)}">📁 ${esc(f.name)}</div>`).join('')
      || '<div class="muted" style="padding:4px 12px;font-size:12px">无文件夹</div>';
    $$('.folder-item', box).forEach(el => el.onclick = () => {
      state.prefix = el.dataset.p;
      nav('files');
    });
  } catch (e) { /* ignore */ }
}

/* ---------- settings ---------- */
const PROVIDERS = [
  { id: 'r2', name: 'Cloudflare R2', icon: '☁️', hint: '填写 Account ID，地址自动生成' },
  { id: 's3', name: 'Amazon S3', icon: '🟧', hint: '全球/区域 endpoint 自动处理' },
  { id: 'oss', name: '阿里云 OSS', icon: '🟦', hint: '选择地域，地址自动生成' },
  { id: 'cos', name: '腾讯云 COS', icon: '🟩', hint: '选择地域，地址自动生成' },
  { id: 'qiniu', name: '七牛云', icon: '🐧', hint: 'S3 兼容接口' },
  { id: 'minio', name: 'MinIO / 自建', icon: '🖥️', hint: '填写你的网关地址' },
];
function renderSettings() {
  const main = $('#main');
  main.innerHTML = `
    <div class="topbar"><h2>⚙️ 设置</h2></div>
    <div class="card"><h3>🪣 存储账户</h3><p class="desc">绑定多个对象存储账户，左上角一键切换</p>
      <div id="acctList"></div>
      <button class="btn btn-primary" id="btnAddAcct" style="margin-top:12px">＋ 添加账户</button>
    </div>
    <div class="card" id="regCard" hidden><h3>🔐 注册设置</h3><p class="desc">关闭后将无法注册新用户（仅管理员可见）</p>
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
async function loadAcctList() {
  const box = $('#acctList');
  try {
    const d = await apiGet('/api/accounts');
    state.accounts = d.accounts;
    updateSwitcherLabel();
    if (!d.accounts.length) { box.innerHTML = '<div class="empty" style="padding:20px">还没有账户，点击下方按钮添加</div>'; return; }
    box.innerHTML = d.accounts.map(a => `
      <div class="acct-row" style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px">
        <span style="font-size:22px">${(PROVIDERS.find(p => p.id === a.provider) || {}).icon || '🪣'}</span>
        <div style="flex:1"><div style="font-weight:600">${esc(a.name)}</div>
          <div class="muted">${esc(a.provider)} · ${esc(a.endpoint)}${a.bucket ? ' · 📦 ' + esc(a.bucket) : ''}</div></div>
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
function openWizard(editId) {
  const existing = editId ? state.accounts.find(a => a.id === editId) : null;
  wiz = { step: 1, provider: existing ? existing.provider : 'r2', editId: editId || null, existing };
  renderWizard();
  $('#previewModal').hidden = true; // reuse backdrop? no — use dedicated
  $('#wizModal').hidden = false;
}
function renderWizard() {
  let modal = $('#wizModal');
  if (!modal) {
    const div = document.createElement('div');
    div.className = 'modal-backdrop'; div.id = 'wizModal';
    div.innerHTML = `<div class="modal" style="width:520px"><div id="wizBody"></div></div>`;
    document.body.appendChild(div);
    modal = div;
  }
  const steps = ['选择服务商', '填写密钥', '完成'];
  let body = `<div class="wiz-steps">${steps.map((s, i) =>
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
    body += `<h3 style="margin-top:0">${p.icon} ${p.name}</h3><p class="muted">${p.hint}</p>`;
    body += `<label class="fld"><span>起个名字（比如"我的 R2"）</span>
      <input class="input" id="wName" value="${esc(ex.name || '')}" placeholder="我的 R2"></label>`;
    if (wiz.provider === 'r2') body += `<label class="fld"><span>Account ID</span>
      <input class="input" id="wAccountId" placeholder="Cloudflare 面板右下角的 Account ID"></label>`;
    if (wiz.provider === 'oss' || wiz.provider === 'cos' || wiz.provider === 'qiniu')
      body += `<label class="fld"><span>地域</span><select class="input" id="wRegion">${regionOptions(wiz.provider, ex.region)}</select></label>`;
    if (wiz.provider === 'minio' || wiz.provider === 'custom')
      body += `<label class="fld"><span>网关地址</span>
      <input class="input" id="wEndpoint" value="${esc(ex.endpoint || '')}" placeholder="https://minio.example.com"></label>`;
    body += `<label class="fld"><span>Access Key（访问密钥 ID）</span>
      <input class="input" id="wAK" value="${esc(ex.accessKey || '')}" autocomplete="off"></label>
      <label class="fld"><span>Secret Key（访问密钥${wiz.existing ? '，留空则不修改' : ''}）</span>
      <input class="input" id="wSK" type="password" autocomplete="new-password"></label>
      <label class="fld"><span>默认存储桶（可选，不填则每次手动选）</span>
      <input class="input" id="wBucket" value="${esc(ex.bucket || '')}" placeholder="my-bucket"></label>
      <div id="wizErr" style="color:#ef4444;font-size:13px;min-height:20px"></div>
      <div class="modal-actions">
        <button class="btn" id="wizBack">上一步</button>
        <button class="btn" id="wizTest">测试连接</button>
        <button class="btn btn-primary" id="wizSave">${wiz.existing ? '保存' : '添加'}</button></div>`;
  } else {
    body += `<div class="empty"><div class="big">🎉</div><h3>添加成功！</h3>
      <p class="muted">去左上角切换到新账户，开始管理你的对象存储吧</p></div>
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
function bindWizard() {
  const cancel = $('#wizCancel'); if (cancel) cancel.onclick = () => $('#wizModal').hidden = true;
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
  };
}
async function wizardSave(testOnly) {
  const errBox = $('#wizErr');
  const payload = wizardPayload();
  if (!payload.name) { errBox.textContent = '请起个名字'; return; }
  if (!payload.accessKey) { errBox.textContent = '请填写 Access Key'; return; }
  if (!payload.secretKey && !wiz.existing) { errBox.textContent = '请填写 Secret Key'; return; }
  errBox.textContent = testOnly ? '测试连接中…' : '保存中…';
  try {
    let id = wiz.editId;
    if (wiz.editId) {
      await apiPut(`/api/accounts/${wiz.editId}`, payload);
    } else {
      const d = await apiPost('/api/accounts', payload);
      id = d.account.id; wiz.newId = id;
    }
    // 测试连接
    const t = await apiPost(`/api/accounts/${id}/test`, {});
    if (testOnly) {
      errBox.style.color = '#10b981';
      errBox.textContent = t.listable ? `✓ 连接成功，找到 ${t.buckets.length} 个存储桶` : '✓ 连接成功（已用指定桶验证）';
      errBox.style.color = '';
      if (wiz.editId) id = null; // 测试模式不跳转
      return;
    }
    wiz.step = 3;
    renderWizard();
  } catch (e) {
    errBox.style.color = '#ef4444';
    errBox.textContent = '失败：' + e.message;
    setTimeout(() => errBox.style.color = '', 100);
  }
}

/* ---------- profile ---------- */
function renderProfile() {
  const u = state.user;
  const main = $('#main');
  $$('.nav-item[data-nav]').forEach(el => el.classList.remove('active'));
  main.innerHTML = `
    <div class="topbar"><h2>👤 修改登录信息</h2></div>
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
