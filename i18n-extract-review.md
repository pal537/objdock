# ObjDock i18n 字符串提取审查

共 **238** 条唯一中文字符串，已分配翻译键。

| # | 翻译键 | 行号 | 出现次数 | 中文原文 |
|---|--------|------|----------|----------|
| 1 | `err.request_failed` | 103 | 1 | `请求失败(` |
| 2 | `btn.confirm` | 117 | 1 | `确认` |
| 3 | `modal.ask_confirm_actions` | 138 | 1 | `<br>    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><br>      <button class="btn" id="afC…` |
| 4 | `auth.page` | 164 | 1 | `<br>  <div class="auth-wrap"><div class="auth-card"><br>    <div class="logo">${ic('anchor', 30)}</div><br>    <h1>ObjDo…` |
| 5 | `auth.form` | 181 | 1 | `<br>    ${isLogin ? '' : '<div id="firstAdminHint" hidden style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4e…` |
| 6 | `auth.enter_username_password` | 196 | 1 | `请输入用户名和密码` |
| 7 | `auth.password_mismatch` | 203 | 1 | `两次输入的密码不一致` |
| 8 | `auth.password_min_8` | 204,1420 | 2 | `密码至少 8 位` |
| 9 | `layout.sidebar` | 221 | 1 | `<br>  <div class="layout"><br>    <aside class="sidebar"><br>      <div class="brand"><br>        <div class="logo-ic">$…` |
| 10 | `switcher.select_account` | 291 | 1 | `选择账户` |
| 11 | `switcher.select_bucket` | 292 | 1 | `选择存储桶` |
| 12 | `switcher.click_to_switch` | 292 | 1 | `点击切换` |
| 13 | `switcher.section_account` | 303 | 1 | `<div class="dsec">账户</div>` |
| 14 | `switcher.add_account` | 304 | 1 | `<div class="di" onclick="nav(\'settings\')">＋ 去设置里添加账户</div>` |
| 15 | `switcher.section_bucket` | 308 | 1 | `<div class="dsec">存储桶</div><div id="ddBuckets"><div class="di muted">先选择账户…</div></div>` |
| 16 | `common.loading` | 330 | 1 | `<div class="di muted">加载中…</div>` |
| 17 | `switcher.no_buckets` | 338 | 1 | `<div class="di muted">没有存储桶</div>` |
| 18 | `switcher.load_failed` | 347 | 1 | `<div class="di muted">加载失败：${esc(e.message)}</div>` |
| 19 | `switcher.user_menu` | 367 | 1 | `<br>    <div class="di" id="mProfile">${ic('user')}修改登录信息</div><br>    <div class="di" id="mLogout">${ic('logout')}退出登录<…` |
| 20 | `dash.empty` | 380 | 1 | `<div class="card"><h3>${ic('dash')}仪表盘</h3><br>      <div class="empty"><div class="big">${ic('bucket', 56)}</div><br>  …` |
| 21 | `dash.bucket_chip` | 396 | 1 | `<button class="bucket-chip${active}" data-acct="${a.id}" data-bucket="${esc(b)}"><br>          <span class="bc-acct">${l…` |
| 22 | `dash.topbar` | 403 | 1 | `<div class="topbar"><h2>${ic('dash')}仪表盘</h2><div class="spacer"></div><br>    <button class="btn btn-sm" id="dashRefres…` |
| 23 | `dash.quota_counting` | 425 | 1 | `<div class="card" id="quotaCard"><h3>${ic('drive')}空间使用</h3><br>      <p class="desc">配额 ${fmtSize(quota)} · 正在统计使用量…</p…` |
| 24 | `dash.quota_failed` | 442 | 1 | `<div class="card"><h3>${ic('drive')}空间使用</h3><br>          <p class="desc">配额 ${fmtSize(q)} · 使用量统计失败（${esc(e.message)}）…` |
| 25 | `dash.stats_failed` | 445 | 1 | `<div class="empty">统计失败：${esc(e.message)}</div>` |
| 26 | `dash.activity_tip` | 480 | 1 | `<div class="ab" style="height:${h.toFixed(0)}%;background:${bg}"><span class="tip">${x.k} · ${x.c} 个文件变动</span></div>` |
| 27 | `dash.no_history` | 484 | 1 | `<div class="muted">暂无历史数据（每天访问仪表盘一次，攒够 2 天数据后生成趋势）</div>` |
| 28 | `dash.quota_detail` | 501 | 1 | `<div class="card"><h3>${ic('drive')}空间使用</h3><br>      <p class="desc">已用 ${fmtSize(d.totalSize)} / 总计 ${fmtSize(quota)}…` |
| 29 | `dash.stat_grid` | 507 | 1 | `<br>    <div class="stat-grid"><br>      <div class="stat"><div class="ic" style="background:#dbeafe;color:#2563eb">${ic…` |
| 30 | `dash.by_type` | 518 | 1 | `).join('') \|\| '<div class="muted">无数据</div>'}<br>      </div><br>      <div class="panel"><h4>按类型统计存储</h4><div class="…` |
| 31 | `dash.trend_activity` | 526 | 1 | `).join('')}<br>        </div></div><br>      </div><br>    </div><br>    <div class="card"><h3>${ic('trend')}存储增长趋势</h3>…` |
| 32 | `files.empty_no_account` | 545 | 1 | `<div class="card"><h3>${ic('folder')}全部文件</h3><br>      <div class="empty"><div class="big">${ic('bucket', 56)}</div>请先在…` |
| 33 | `files.topbar` | 550 | 1 | `<br>    <div class="topbar"><h2>${ic('folder')}全部文件</h2><div class="spacer"></div><br>      <input class="input input-sm…` |
| 34 | `files.new_folder_placeholder` | 590 | 1 | `例如：我的照片` |
| 35 | `files.new_folder` | 591 | 1 | `新建文件夹` |
| 36 | `files.new_folder_desc` | 591 | 1 | `在当前目录下创建一个新文件夹` |
| 37 | `files.created` | 596 | 1 | `已创建` |
| 38 | `files.create_failed` | 597,1563 | 2 | `创建失败：` |
| 39 | `files.select_to_share` | 614 | 1 | `请选择要分享的文件` |
| 40 | `files.no_downloadable` | 619 | 1 | `所选没有可下载的文件` |
| 41 | `files.zip_download` | 624,929 | 2 | `打包下载` |
| 42 | `files.zipping_progress` | 628,933 | 2 | `<div style="margin-bottom:8px">正在打包 ${keys.length} 个文件…</div><br>      <div style="height:8px;background:#e2e8f0;border-…` |
| 43 | `files.downloading` | 644 | 1 | `下载中：${name} (${n + 1}/${keys.length})` |
| 44 | `files.download_failed_http` | 646 | 1 | `下载 ${name} 失败：HTTP ${resp.status}` |
| 45 | `files.generating_zip` | 651,955 | 2 | `正在生成 zip…` |
| 46 | `btn.upload_file` | 659,963,983,989 | 7 | `上传文件` |
| 47 | `files.zip_downloaded` | 660,964 | 2 | `已打包下载 ${n} 个文件` |
| 48 | `common.failed_prefix` | 662,1024,1956,1998 | 4 | `失败：` |
| 49 | `files.select_all` | 675,689 | 2 | `全选` |
| 50 | `files.deselect_all` | 689 | 1 | `全不选` |
| 51 | `common.load_failed_msg` | 743,1757 | 2 | `<div class="empty">加载失败：${esc(e.message)}</div>` |
| 52 | `files.empty_folder` | 762 | 1 | `<div class="empty"><div class="big">${ic('folderOpen', 56)}</div>空文件夹，把文件拖进来上传吧</div>` |
| 53 | `files.folder_card` | 770 | 1 | `<div class="fitem folder-card" data-folder="${esc(f.prefix)}"><br>        <div class="fic folder-ic">${ic('folder')}</di…` |
| 54 | `files.table_head` | 838 | 1 | `<div class="ftable-wrap"><table class="ftable"><thead><tr>${checkCol}<th>名称</th><th style="width:110px">大小</th><th style…` |
| 55 | `files.table_row` | 846 | 1 | ` : ''}<br>        <td><div class="fname"><div class="fic-sm" data-lthumb="${esc(f.key)}\|${f.kind}">${iconFor(f.kind)}</…` |
| 56 | `files.selected_count` | 893 | 1 | `已选 ${selKeys.size} / ${total} 个` |
| 57 | `files.delete_files` | 897,1049 | 2 | `删除文件` |
| 58 | `files.confirm_delete_selected` | 897 | 1 | `确定删除选中的 ${selKeys.size} 个文件吗？此操作不可恢复。` |
| 59 | `btn.delete` | 897,1029,1029,1049 | 9 | `删除` |
| 60 | `files.deleted_count` | 900 | 1 | `已删除 ${selKeys.size} 个` |
| 61 | `files.delete_failed` | 901,1033,1053,1415 | 7 | `删除失败：` |
| 62 | `btn.rename` | 905,1040,1231 | 3 | `重命名` |
| 63 | `files.new_filename` | 905,1040 | 2 | `新文件名` |
| 64 | `files.rename_success` | 911 | 1 | `重命名成功` |
| 65 | `files.rename_failed` | 912,1047 | 2 | `重命名失败：` |
| 66 | `files.listing` | 921 | 1 | `正在列出「${name}」下的文件…` |
| 67 | `files.folder_empty` | 924 | 1 | `文件夹是空的` |
| 68 | `files.too_many_for_zip` | 925 | 1 | `文件太多（${keys.length} 个），最多打包 5000 个` |
| 69 | `files.downloading_rel` | 948 | 1 | `下载中：${rel} (${n + 1}/${keys.length})` |
| 70 | `files.download_rel_failed` | 950 | 1 | `下载 ${rel} 失败` |
| 71 | `files.zip_failed` | 965 | 1 | `打包失败：` |
| 72 | `common.loading_ellipsis` | 969 | 1 | `正在加载…` |
| 73 | `files.edit_prefix` | 973 | 1 | `编辑 ` |
| 74 | `files.editor_actions` | 980 | 1 | `<button class="btn" id="edCancel">取消</button><button class="btn btn-primary" id="edSave">保存</button>` |
| 75 | `common.saved` | 987,1337,1341,2023 | 4 | `已保存` |
| 76 | `common.save_failed` | 991,1338,1342 | 3 | `保存失败：` |
| 77 | `common.load_failed_prefix` | 993 | 1 | `加载失败：` |
| 78 | `files.move_to` | 1002 | 1 | `移动到` |
| 79 | `files.copy_to` | 1002 | 1 | `复制到` |
| 80 | `files.copy_dialog` | 1003 | 1 | `<br>      <label class="fld"><span>目标桶</span><select class="input" id="cpBucket">${bOpts}</select></label><br>      <lab…` |
| 81 | `files.enter_target_path` | 1015 | 1 | `请输入目标路径` |
| 82 | `files.moving_copying` | 1017 | 1 | `正在${isMove ? '移动' : '复制'}…` |
| 83 | `files.move_success` | 1022 | 1 | `移动成功` |
| 84 | `files.copy_success` | 1022 | 1 | `复制成功` |
| 85 | `files.get_buckets_failed` | 1026 | 1 | `获取桶列表失败：` |
| 86 | `files.confirm_delete` | 1029 | 1 | `确定删除「${name}」吗？${isFolder ? '文件夹内的文件也会被删除，' : ''}此操作不可恢复。` |
| 87 | `common.deleted` | 1032,1052,1414,1701 | 6 | `已删除` |
| 88 | `files.renamed` | 1046 | 1 | `已重命名` |
| 89 | `files.confirm_delete_name` | 1049 | 1 | `确定删除 ${name} 吗？此操作不可恢复。` |
| 90 | `files.download_failed` | 1062,1693 | 2 | `下载失败：` |
| 91 | `common.loading_div` | 1070 | 1 | `<div class="muted">加载中…</div>` |
| 92 | `files.preview_img` | 1075 | 1 | `<img src="${esc(url)}" style="max-width:100%;max-height:70vh;object-fit:contain;cursor:zoom-in" onclick="window.open('${…` |
| 93 | `files.no_preview` | 1083 | 1 | `<div class="empty"><div class="big">${iconFor(kind)}</div>该格式不支持在线预览，请下载查看</div>` |
| 94 | `files.preview_failed` | 1084 | 1 | `<div class="empty">预览失败：${esc(e.message)}</div>` |
| 95 | `files.share_files_count` | 1095 | 1 | `${keys[0].split('/').pop()} 等 ${keys.length} 个文件` |
| 96 | `common.copied` | 1115,1130,1383,1531 | 6 | `已复制` |
| 97 | `share.password_min_4` | 1121 | 1 | `分享密码至少 4 位` |
| 98 | `share.generate_failed` | 1128 | 1 | `生成失败：` |
| 99 | `share.row` | 1145 | 1 | `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span><br>      <span clas…` |
| 100 | `share.getting_url` | 1156 | 1 | `获取地址…` |
| 101 | `common.success` | 1175 | 1 | `成功` |
| 102 | `common.failed` | 1180 | 1 | `失败` |
| 103 | `upload.cors_blocked` | 1183 | 1 | `浏览器直传被拦截：去存储桶设置里配置 CORS，允许来源为本网站域名，允许方法 GET/PUT/HEAD，允许标头 *` |
| 104 | `upload.complete` | 1192 | 1 | `完成：${done} 成功，${failed} 失败（悬停"失败"看原因；如为 CORS 问题请去桶设置配 CORS）` |
| 105 | `upload.all_success` | 1192 | 1 | `全部上传成功（${done} 个文件）` |
| 106 | `btn.download` | 1224 | 1 | `下载` |
| 107 | `btn.share_link` | 1225 | 1 | `分享链接` |
| 108 | `btn.edit_text` | 1227 | 1 | `编辑文本` |
| 109 | `btn.copy_to` | 1229 | 1 | `复制到…` |
| 110 | `btn.move_to` | 1230 | 1 | `移动到…` |
| 111 | `btn.enter` | 1233 | 1 | `进入` |
| 112 | `btn.zip_download` | 1234 | 1 | `打包下载 (zip)` |
| 113 | `files.no_folders` | 1248 | 1 | `<div class="muted" style="padding:4px 12px;font-size:12px">无文件夹</div>` |
| 114 | `provider.r2_hint` | 1274 | 1 | `填写 Account ID，地址自动生成` |
| 115 | `provider.s3_hint` | 1275 | 1 | `全球/区域 endpoint 自动处理` |
| 116 | `provider.oss_name` | 1276 | 1 | `阿里云 OSS` |
| 117 | `provider.region_hint` | 1276,1277 | 2 | `选择地域，地址自动生成` |
| 118 | `provider.cos_name` | 1277 | 1 | `腾讯云 COS` |
| 119 | `provider.qiniu_name` | 1278 | 1 | `七牛云` |
| 120 | `provider.s3_compat` | 1278,1279 | 2 | `S3 兼容接口` |
| 121 | `provider.minio_name` | 1280 | 1 | `MinIO / 自建` |
| 122 | `provider.minio_hint` | 1280 | 1 | `填写你的网关地址` |
| 123 | `nav.accounts` | 1286 | 1 | `存储账户` |
| 124 | `nav.share` | 1287 | 1 | `分享管理` |
| 125 | `nav.upload_link` | 1288 | 1 | `上传链接` |
| 126 | `nav.site_settings` | 1289 | 1 | `站点设置` |
| 127 | `nav.user_mgmt` | 1290 | 1 | `用户管理` |
| 128 | `nav.appearance` | 1291 | 1 | `外观` |
| 129 | `settings.topbar` | 1298 | 1 | `<br>    <div class="topbar"><h2>${ic('settings')}设置</h2></div><br>    <div style="display:flex;gap:8px;margin-bottom:16p…` |
| 130 | `settings.account_card` | 1310 | 1 | `<div class="card"><h3>${ic('bucket')}存储账户</h3><p class="desc">绑定多个对象存储账户，左下角一键切换</p><br>      <div id="acctList"></div><…` |
| 131 | `settings.share_card` | 1316 | 1 | `<div class="card"><h3>${ic('share')}分享管理</h3><p class="desc">经本站转发的私密分享链接，可撤销</p><div id="shareList"><div class="muted">…` |
| 132 | `settings.upload_link_card` | 1319 | 1 | `<div class="card"><h3>上传链接管理</h3><p class="desc">别人可通过链接上传文件到你的桶，可撤销</p><div id="uploadLinkList"><div class="muted">加载中……` |
| 133 | `settings.site_card` | 1322 | 1 | `<div class="card"><h3>${ic('settings')}站点设置</h3><p class="desc">分享链接用的公开地址（仅管理员可见）</p><br>      <label class="fld"><span…` |
| 134 | `settings.user_card` | 1345 | 1 | `<div class="card"><h3>${ic('users')}用户管理</h3><p class="desc">共 <b id="userTotal">0</b> 个用户（仅管理员可见，不显示密码）</p><div id="use…` |
| 135 | `settings.appearance_card` | 1348 | 1 | `<div class="card"><h3>${ic('settings')}外观</h3><br>      <label style="display:flex;gap:8px;align-items:center;cursor:poi…` |
| 136 | `share.no_shares` | 1367 | 1 | `<div class="muted">暂无分享</div>` |
| 137 | `share.expired` | 1370,1575 | 2 | `<span style="color:#dc2626">已过期</span>` |
| 138 | `share.valid_until` | 1370,1575 | 2 | `<span style="color:#16a34a">有效期至 ${esc(exp)}</span>` |
| 139 | `share.password_label` | 1372,1577 | 2 | `🔒密码` |
| 140 | `share.view_count` | 1373 | 1 | `${sh.viewCount}/${sh.maxViews}次` |
| 141 | `share.row_detail` | 1375 | 1 | `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9"><br>        <span st…` |
| 142 | `share.revoke` | 1386 | 1 | `撤销分享` |
| 143 | `share.confirm_revoke` | 1386 | 1 | `确定撤销这个分享链接吗？` |
| 144 | `btn.revoke` | 1386,1592 | 2 | `撤销` |
| 145 | `share.revoked` | 1387,1593 | 2 | `已撤销` |
| 146 | `share.revoke_failed` | 1388,1594 | 2 | `撤销失败：` |
| 147 | `common.load_failed_div` | 1391,1425,1597 | 3 | `<div class="muted">加载失败</div>` |
| 148 | `users.no_users` | 1399 | 1 | `<div class="muted">暂无用户</div>` |
| 149 | `users.admin_badge` | 1402 | 1 | `<span style="background:#dbeafe;color:#1d4ed8;font-size:11px;padding:2px 8px;border-radius:10px">管理员</span>` |
| 150 | `users.row` | 1404 | 1 | `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9"><br>        <span st…` |
| 151 | `users.delete_user` | 1413 | 1 | `删除用户` |
| 152 | `users.confirm_delete` | 1413 | 1 | `确定删除用户「${b.dataset.uname}」吗？其所有账户、分享、文件记录都会被删除，不可恢复。` |
| 153 | `users.reset_password` | 1419 | 1 | `重置密码` |
| 154 | `users.reset_password_prompt` | 1419 | 1 | `为「${b.dataset.uname}」设置新密码（至少 8 位，字母+数字）` |
| 155 | `users.password_reset` | 1421 | 1 | `密码已重置` |
| 156 | `users.reset_failed` | 1422 | 1 | `重置失败：` |
| 157 | `common.toast` | 1437 | 1 | `<div style="background:#fff;padding:20px 36px;border-radius:14px;font-size:18px;color:#3b82f6;box-shadow:0 8px 30px rgba…` |
| 158 | `search.searching` | 1460 | 1 | `<div class="empty">搜索中…</div>` |
| 159 | `search.no_results` | 1465 | 1 | `<div class="empty">没有找到包含 “${esc(q)}” 的文件（扫描了 ${d.scanned} 个）</div>` |
| 160 | `search.found_results` | 1469 | 1 | `<div class="muted" style="padding:8px 4px">找到 ${results.length} 个结果${d.truncated ? '（只显示前 100 个）' : ''}，扫描了 ${d.scanned}…` |
| 161 | `search.failed` | 1482 | 1 | `<div class="empty">搜索失败：${esc(e.message)}</div>` |
| 162 | `upload_link.create` | 1488 | 1 | `创建上传链接` |
| 163 | `upload_link.form` | 1489 | 1 | `<br>    <label class="fld"><span>链接名称 *</span><br>      <input class="input" id="ulName" placeholder="如：小王上传资料" maxlengt…` |
| 164 | `upload_link.enter_name` | 1539 | 1 | `请填写链接名称` |
| 165 | `upload_link.created` | 1549 | 1 | `<br>        <div style="text-align:center;padding:20px 0"><br>          <div style="font-size:16px;font-weight:600;margi…` |
| 166 | `upload_link.no_links` | 1572 | 1 | `<div class="muted">暂无上传链接</div>` |
| 167 | `upload_link.use_count` | 1578 | 1 | `${ul.useCount}/${ul.maxUses}次` |
| 168 | `common.unnamed` | 1580,1613 | 2 | `未命名` |
| 169 | `upload_link.row` | 1581 | 1 | `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9"><br>        <span st…` |
| 170 | `upload_link.revoke` | 1592 | 1 | `撤销上传链接` |
| 171 | `upload_link.confirm_revoke` | 1592 | 1 | `确定撤销这个上传链接吗？` |
| 172 | `common.counter_ge` | 1607 | 1 | `个` |
| 173 | `common.none` | 1609 | 1 | `<div style="font-size:12px;color:var(--muted);padding:4px 12px">暂无</div>` |
| 174 | `upload_link.nav_item` | 1615 | 1 | `<br>      <div class="nav-item" data-ul="${i}" style="font-size:13px" title="${esc(nm)}${exp ? '（有效期至 ' + exp + '）' : ''…` |
| 175 | `btn.copy_link` | 1626 | 1 | `复制链接` |
| 176 | `upload_link.view` | 1637 | 1 | `<div class="topbar"><h2>${ic('link')} ${esc(ul.name \|\| '未命名')}</h2></div><br>    <div style="margin-bottom:12px;font-s…` |
| 177 | `upload_link.empty_card` | 1646 | 1 | `<div class="card" style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">暂无上传文件</div>` |
| 178 | `upload_link.file_item` | 1655 | 1 | `<div class="fitem"><br>        <div class="fic" data-ulthumb="${esc(k)}" data-isimg="${isImg ? '1' : '0'}" style="height…` |
| 179 | `upload_link.loading_card` | 1681 | 1 | `<div class="card" style="grid-column:1/-1;text-align:center;color:#dc2626;padding:30px">加载失败：${esc(e.message)}</div>` |
| 180 | `upload_link.confirm_delete_file` | 1698 | 1 | `删除 ${k.split('/').pop()}？` |
| 181 | `upload_link.delete` | 1713 | 1 | `删除上传链接` |
| 182 | `upload_link.confirm_delete` | 1713 | 1 | `确定删除「${ul.name}」吗？` |
| 183 | `settings.no_accounts` | 1735 | 1 | `<div class="empty" style="padding:20px">还没有账户，点击下方按钮添加</div>` |
| 184 | `settings.account_row` | 1736 | 1 | `<br>      <div class="acct-row" style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line…` |
| 185 | `settings.delete_account` | 1749 | 1 | `删除账户` |
| 186 | `settings.confirm_delete_account` | 1749 | 1 | `确定删除账户「${a.name}」吗？只删除本地配置，不影响云端数据。` |
| 187 | `wizard.testing` | 1760,1941 | 2 | `测试连接中…` |
| 188 | `wizard.connect_success_buckets` | 1763 | 1 | `连接成功，找到 ${d.buckets.length} 个存储桶` |
| 189 | `wizard.connect_success_no_list` | 1763 | 1 | `连接成功（密钥无权列出全部桶，已用指定桶验证）` |
| 190 | `wizard.connect_failed` | 1764 | 1 | `连接失败：` |
| 191 | `wizard.modal` | 1782 | 1 | `<div class="modal" style="width:520px;position:relative"><button class="modal-x" id="wizX" title="关闭">\u00d7</button><di…` |
| 192 | `wizard.steps` | 1787 | 1 | `<div class="wiz-steps">${['选择服务商', '填写密钥', '完成'].map((s, i) =><br>    ` |
| 193 | `wizard.step1` | 1790 | 1 | `<h3 style="margin-top:0">选择服务商</h3><div class="prov-grid">` |
| 194 | `wizard.actions` | 1793 | 1 | `</div><div class="modal-actions"><br>        <button class="btn" id="wizCancel">取消</button><br>        <button class="bt…` |
| 195 | `wizard.step2` | 1806 | 1 | `<h3 style="margin-top:0">${isEdit ? '编辑账户' : p.icon + ' ' + p.name}</h3>${isEdit ? '' : ` |
| 196 | `wizard.field_name` | 1807 | 1 | `<label class="fld"><span>起个名字（比如"我的 R2"）</span><br>      <input class="input" id="wName" value="${esc(ex.name \|\| '')}"…` |
| 197 | `wizard.field_account_id` | 1809 | 1 | `<label class="fld"><span>Account ID（账户ID）</span><br>      <input class="input" id="wAccountId" value="${esc(acctId)}" pl…` |
| 198 | `wizard.field_region` | 1812 | 1 | `<label class="fld"><span>地域</span><select class="input" id="wRegion">${regionOptions(wiz.provider, ex.region)}</select><…` |
| 199 | `wizard.field_endpoint` | 1814 | 1 | `<label class="fld"><span>S3 Endpoint</span><br>      <input class="input" id="wEndpoint" value="${esc(ex.endpoint \|\| '…` |
| 200 | `wizard.field_gateway` | 1819 | 1 | `<label class="fld"><span>网关地址</span><br>      <input class="input" id="wEndpoint" value="${esc(ex.endpoint \|\| '')}" pl…` |
| 201 | `wizard.field_keys` | 1821 | 1 | `<label class="fld"><span>Access Key（访问密钥 ID）</span><br>      <input class="input" id="wAK" value="${esc(ex.accessKey \|\…` |
| 202 | `wizard.success` | 1848 | 1 | `<div class="empty"><div class="big">${ic('checkCircle', 56)}</div><h3>添加成功！</h3><br>      <p class="muted">${names ? ` |
| 203 | `wizard.success_hint` | 1849 | 1 | ` : ''}去左下角切换到新账户，开始管理你的对象存储吧</p></div><br>      <div class="modal-actions"><button class="btn btn-primary" id="wizDone">…` |
| 204 | `region.hangzhou` | 1858 | 1 | `华东1（杭州）` |
| 205 | `region.shanghai` | 1858 | 1 | `华东2（上海）` |
| 206 | `region.beijing` | 1858 | 1 | `华北2（北京）` |
| 207 | `region.shenzhen` | 1858 | 1 | `华南1（深圳）` |
| 208 | `region.hongkong` | 1858,1859 | 2 | `香港` |
| 209 | `region.guangzhou` | 1859 | 1 | `广州` |
| 210 | `region.shanghai2` | 1859 | 1 | `上海` |
| 211 | `region.beijing2` | 1859 | 1 | `北京` |
| 212 | `region.singapore` | 1859 | 1 | `新加坡` |
| 213 | `region.huadong` | 1860 | 1 | `华东` |
| 214 | `region.huabei` | 1860 | 1 | `华北` |
| 215 | `region.huanan` | 1860 | 1 | `华南` |
| 216 | `region.b2_us_west_phoenix` | 1861 | 1 | `美西 (凤凰城)` |
| 217 | `region.b2_us_west_1` | 1861 | 1 | `美西1 (凤凰城)` |
| 218 | `region.b2_us_west_2` | 1861 | 1 | `美西2 (凤凰城)` |
| 219 | `region.b2_us_west_4` | 1861 | 1 | `美西4 (凤凰城)` |
| 220 | `region.b2_us_east` | 1861 | 1 | `美东 (雷斯顿)` |
| 221 | `region.b2_eu_central` | 1861 | 1 | `欧洲 (阿姆斯特丹)` |
| 222 | `region.b2_ca` | 1861 | 1 | `加拿大 (多伦多)` |
| 223 | `region.b2_ap` | 1884 | 1 | `<h3>Backblaze B2 配置说明</h3><br>    <div style="font-size:14px;line-height:1.7"><br>    <p><b>1. 创建 Application Key</b><br…` |
| 224 | `wizard.b2_help` | 1937 | 1 | `请起个名字` |
| 225 | `wizard.enter_name` | 1938 | 1 | `请填写 Access Key` |
| 226 | `wizard.enter_ak` | 1939 | 1 | `请填写储存桶名称` |
| 227 | `wizard.enter_bucket` | 1940 | 1 | `请填写 Secret Key` |
| 228 | `wizard.enter_sk` | 1941 | 1 | `保存中…` |
| 229 | `common.saving` | 1947 | 1 | `${ic('x', 13)} ${esc(r.bucket)}（${esc(r.error \|\| '失败')}）` |
| 230 | `wizard.bucket_verify` | 1960 | 1 | `${ic('check', 14)} 连接成功：` |
| 231 | `wizard.connect_ok` | 1969 | 1 | `已保存，但连接测试失败：` |
| 232 | `wizard.saved_test_failed` | 1970 | 1 | `已保存，连接正常` |
| 233 | `wizard.saved_ok` | 1971 | 1 | `已保存，连接测试失败：` |
| 234 | `wizard.saved_test_failed2` | 1987 | 1 | `${b}（${(t.results \|\| []).map(r => r.error).filter(Boolean).join(',') \|\| '验证失败'}）` |
| 235 | `wizard.all_failed` | 1991 | 1 | `全部添加失败：` |
| 236 | `wizard.partial_success` | 1992 | 1 | `已添加 ${created.join('、')}；失败：${failed.join('；')}` |
| 237 | `settings.profile_page` | 2006 | 1 | `<br>    <div class="topbar"><h2>${ic('user')}修改登录信息</h2></div><br>    <div class="card" style="max-width:480px"><br>    …` |
| 238 | `auth.password_changed` | 2022 | 1 | `密码已修改，请重新登录` |
