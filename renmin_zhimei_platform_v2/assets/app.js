/* ============================================================
   人民日报社 · 智媒平台 2.0 原型 — 核心逻辑
   认证 / 权限 / 导航 / 主题皮肤 / 水印 / 通知 / 数字员工对话引擎
   依赖：data.js（window.ZMD）
   ============================================================ */
window.ZM = (function () {
  'use strict';
  const D = window.ZMD;
  const $ = (s, r) => (r || document).querySelector(s);

  function el(tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ================= 主题皮肤 ================= */
  const THEMES = ['red', 'light', 'blue'];
  function applyTheme(t) {
    if (!THEMES.includes(t)) t = 'red';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('zm_theme', t); } catch (e) {}
    document.querySelectorAll('.theme-dot').forEach((d) => d.classList.toggle('on', d.dataset.t === t));
  }
  function initTheme() {
    let t = 'red';
    try { t = localStorage.getItem('zm_theme') || 'red'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', THEMES.includes(t) ? t : 'red');
  }
  initTheme(); // 立即执行避免闪烁

  /* ================= 认证与权限 ================= */
  function login(uid) {
    if (!D.USERS[uid]) return;
    try { localStorage.setItem('zm_user', uid); } catch (e) {}
    location.href = 'index.html';
  }
  function logout() {
    try { localStorage.removeItem('zm_user'); } catch (e) {}
    location.href = 'login.html';
  }
  function current() {
    let uid = null;
    try { uid = localStorage.getItem('zm_user'); } catch (e) {}
    return uid && D.USERS[uid] ? D.USERS[uid] : null;
  }
  function can(pageKey, uid) {
    const nav = D.NAV.find((n) => n.key === pageKey);
    return nav ? nav.perm.includes(uid) : true;
  }
  // 页面守卫：未登录 → 登录页；无权限 → 403 越权拦截
  function guard(pageKey) {
    const u = current();
    if (!u) { location.href = 'login.html'; return null; }
    if (pageKey && !can(pageKey, u.id)) { renderForbidden(pageKey, u); return u; }
    return u;
  }
  function renderForbidden(pageKey, u) {
    const nav = D.NAV.find((n) => n.key === pageKey);
    document.addEventListener('DOMContentLoaded', () => {
      const ov = el('div', 'overlay open');
      ov.innerHTML =
        '<div class="modal tc" style="max-width:440px">' +
        '  <div style="font-size:44px;margin-bottom:10px">🔒</div>' +
        '  <h3>越权访问已拦截</h3>' +
        '  <div class="m-body">当前账号 <b>' + u.name + '（' + u.role + '）</b> 未开通「' + (nav ? nav.label : pageKey) + '」模块权限。<br>访问行为已记录至平台审计日志。</div>' +
        '  <div class="m-actions" style="justify-content:center">' +
        '    <button class="btn ghost" onclick="location.href=\'index.html\'">返回工作台</button>' +
        '    <button class="btn primary" id="zm-apply-perm">申请开通权限</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(ov);
      setTimeout(() => { const m = $('.main') || $('.page'); if (m) m.style.filter = 'blur(6px)'; }, 0);
      $('#zm-apply-perm', ov).onclick = () => {
        ov.querySelector('.modal').innerHTML =
          '<div class="tc"><div style="font-size:44px;margin-bottom:10px">📨</div><h3>申请已提交</h3>' +
          '<div class="m-body">权限申请已提交至平台管理员（张涛），审批结果将通过消息中心与移动端通知您。</div>' +
          '<div class="m-actions" style="justify-content:center"><button class="btn primary" onclick="location.href=\'index.html\'">返回工作台</button></div></div>';
      };
    });
  }

  /* ================= 顶部导航 + 左侧模块栏 ================= */
  function renderNav(activeKey) {
    const u = current();
    if (!u) return;
    const nav = el('header', 'topnav');
    nav.innerHTML =
      '<a class="masthead" href="index.html">' +
      '  <span class="seal">人民<br>日报</span>' +
      '  <span><span class="mh-name">智媒平台</span><span class="mh-sub">RMRB · 2.0</span></span>' +
      '</a>' +
      '<div class="gsearch"><input id="zm-gs" type="text" placeholder="搜索稿件 / 素材 / 智能体 / 知识库…"><span class="gs-hint">⌘K</span></div>' +
      '<div class="nav-right">' +
      '  <div class="theme-switch" title="皮肤切换（需求书：透红/淡色/科技蓝）">' +
      '    <div class="theme-dot t-red" data-t="red" title="透红色（默认）"></div>' +
      '    <div class="theme-dot t-light" data-t="light" title="轻量化淡色"></div>' +
      '    <div class="theme-dot t-blue" data-t="blue" title="科技感蓝色"></div>' +
      '  </div>' +
      '  <button class="bell" id="zm-bell">🔔<span class="badge" id="zm-bell-n"></span>' +
      '    <div class="bell-drop" id="zm-bell-drop"></div></button>' +
      '  <div class="userchip" id="zm-userchip">' +
      '    <div class="avatar">' + u.avatar + '</div>' +
      '    <div><span class="u-name">' + u.name + '</span><span class="u-role">' + u.role + ' · ' + u.dept + '</span></div>' +
      '    <div class="user-drop" id="zm-user-drop"></div>' +
      '  </div>' +
      '</div>';
    document.body.prepend(nav);

    // 左侧模块栏（无权限模块灰显加锁，点击触发越权拦截提示）
    const shell = el('div', 'shell');
    const side = el('aside', 'sidebar');
    let html = '';
    D.NAV_GROUPS.forEach((g) => {
      const items = D.NAV.filter((n) => n.grp === g);
      if (!items.length) return;
      html += '<div class="sb-grp">' + g + '</div>';
      items.forEach((n) => {
        const ok = n.perm.includes(u.id);
        html += '<a class="sb-item' + (n.key === activeKey ? ' on' : '') + (ok ? '' : ' locked') + '" ' +
          (ok ? 'href="' + n.path + '"' : 'href="#" data-locked="' + n.label + '"') +
          ' title="' + n.src + '"><span class="sb-ic">' + n.ic + '</span>' + n.label + '</a>';
      });
    });
    html += '<div class="sb-foot"><b>当前身份</b>' + u.name + ' · ' + u.role + '<br>可见模块 ' +
      D.NAV.filter((n) => n.perm.includes(u.id)).length + '/' + D.NAV.length + ' 个</div>';
    side.innerHTML = html;
    const main = el('div', 'main');
    // 把页面主体搬进 main
    Array.from(document.body.children).forEach((c) => {
      if (c !== nav && !c.classList.contains('watermark') && !c.classList.contains('overlay') &&
          !c.classList.contains('assist-fab') && !c.classList.contains('assist-panel')) main.appendChild(c);
    });
    shell.appendChild(side); shell.appendChild(main);
    document.body.appendChild(shell);
    side.querySelectorAll('a[data-locked]').forEach((a) => {
      a.onclick = (e) => { e.preventDefault(); toast('「' + a.dataset.locked + '」未对 ' + u.role + ' 开放，可在用户菜单申请权限', 'warn'); };
    });

    // 全局搜索：⌘K 聚焦，回车跨三库检索
    const gs = $('#zm-gs', nav);
    if (gs) {
      gs.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && gs.value.trim()) { toast('已在全媒体生产库 / 专题知识库 / 智能体货架中检索「' + gs.value.trim() + '」', 'ok'); gs.value = ''; gs.blur(); }
        if (e.key === 'Escape') gs.blur();
      });
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); gs.focus(); }
      });
    }

    // 主题切换
    const bindThemeDots = () => {
      nav.querySelectorAll('.theme-dot').forEach((d) => { d.onclick = (e) => { e.stopPropagation(); applyTheme(d.dataset.t); }; });
      applyTheme(document.documentElement.getAttribute('data-theme'));
    };
    bindThemeDots();

    // 通知
    const notifs = D.NOTIFS.filter((n) => !n.to.length || n.to.includes(u.id));
    $('#zm-bell-n').textContent = notifs.length;
    const drop = $('#zm-bell-drop');
    drop.innerHTML = '<div class="bd-head">消息中心 <span>全部已读</span></div>' + notifs.map((n) => {
      const cls = n.cls === 'red' ? 'background:var(--danger-l)' : n.cls === 'gold' ? 'background:rgba(194,161,75,.15)' : n.cls === 'warn' ? 'background:var(--warn-l)' : 'background:var(--accent-l2)';
      return '<div class="notif"><div class="n-ic" style="' + cls + '">' + n.ic + '</div>' +
        '<div class="grow"><b>' + n.title + '</b><span>' + n.body + '</span><span class="n-time">今日 ' + n.time + '</span></div></div>';
    }).join('');
    $('#zm-bell').onclick = (e) => { e.stopPropagation(); drop.classList.toggle('open'); $('#zm-user-drop').classList.remove('open'); };
    drop.onclick = (e) => e.stopPropagation();
    drop.querySelectorAll('.notif').forEach((n) => { n.onclick = () => { toast('已打开消息详情（原型演示）', 'ok'); drop.classList.remove('open'); }; });
    $('.bd-head span', drop).onclick = () => { $('#zm-bell-n').textContent = '0'; drop.classList.remove('open'); toast('全部消息已标记为已读', 'ok'); };

    // 用户菜单
    const udrop = $('#zm-user-drop');
    udrop.innerHTML =
      '<div class="ud-meta">' + u.title + '<br>工号 ' + u.empNo + ' · 统一身份认证</div>' +
      '<div class="ud-sep"></div>' +
      '<div class="ud-item" id="zm-switch">🔁 切换演示账号</div>' +
      '<div class="ud-item" onclick="location.href=\'mobile.html\'">📱 移动端视图</div>' +
      '<div class="ud-item flex-between" style="gap:8px"><span>🎨 界面皮肤</span>' +
      '  <span class="theme-switch" style="padding:3px 6px">' +
      '    <span class="theme-dot t-red" data-t="red"></span>' +
      '    <span class="theme-dot t-light" data-t="light"></span>' +
      '    <span class="theme-dot t-blue" data-t="blue"></span></span></div>' +
      '<div class="ud-sep"></div>' +
      '<div class="ud-item" id="zm-logout">🚪 退出登录</div>';
    bindThemeDots(); // 用户菜单里的皮肤切换（窄屏时顶栏色点隐藏，靠这里）
    udrop.onclick = (e) => e.stopPropagation();
    $('#zm-userchip').onclick = (e) => { e.stopPropagation(); udrop.classList.toggle('open'); drop.classList.remove('open'); };
    $('#zm-logout').onclick = (e) => { e.stopPropagation(); logout(); };
    $('#zm-switch').onclick = (e) => { e.stopPropagation(); location.href = 'login.html?switch=1'; };
    document.addEventListener('click', () => { drop.classList.remove('open'); udrop.classList.remove('open'); });
  }

  /* ================= 轻提示 ================= */
  let toastBox = null;
  function toast(msg, kind) {
    if (!toastBox) {
      toastBox = el('div');
      toastBox.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:28px;z-index:900;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
      document.body.appendChild(toastBox);
    }
    const c = kind === 'warn' ? 'var(--warn)' : kind === 'err' ? 'var(--danger)' : kind === 'ok' ? 'var(--ok)' : 'var(--accent)';
    const t = el('div', null, msg);
    t.style.cssText = 'background:var(--card);border:1px solid var(--line);border-left:3px solid ' + c +
      ';color:var(--text);font-size:13px;padding:10px 18px;border-radius:11px;box-shadow:var(--shadow);opacity:0;transform:translateY(8px);transition:all .2s;max-width:520px';
    toastBox.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'none'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2800);
  }

  /* ================= 通用模态 ================= */
  function modal(html, opts) {
    opts = opts || {};
    const ov = el('div', 'overlay open');
    ov.innerHTML = '<div class="modal' + (opts.wide ? ' wide' : '') + '">' + html + '</div>';
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => ov.remove(); });
    return ov;
  }

  /* ================= 安全水印 ================= */
  function watermark() {
    const u = current();
    if (!u) return;
    const wm = el('div', 'watermark');
    const txt = '人民日报社智媒平台 ' + u.name + ' ' + u.empNo;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) {
      const s = el('span', null, txt);
      s.style.left = (x * 22 - 4) + '%';
      s.style.top = (y * 14 - 3) + '%';
      wm.appendChild(s);
    }
    document.body.appendChild(wm);
  }

  /* ================= 页脚署名 ================= */
  function renderFoot() {
    const f = el('footer', 'foot');
    const blue = document.documentElement.getAttribute('data-theme') === 'blue';
    f.innerHTML =
      '<span>人民日报社 · 智媒平台二期（高保真交互原型）</span><span class="f-sep"></span>' +
      '<span>页面数据均为目标态示意口径</span>' +
      '<span class="f-right flex" style="gap:8px"><span>AI 技术底座</span>' +
      '<img src="assets/' + (blue ? 'st_logo_white.png' : 'st_logo.png') + '" alt="SenseTime"></span>';
    ($('.main') || document.body).appendChild(f);
  }

  /* ================= 数字员工对话引擎 ================= */
  function Chat(root, cfg) {
    this.root = root; this.cfg = cfg; this.token = 0;
    root.classList.add('zm-chat');
    root.innerHTML =
      '<div class="zc-head">' +
      '  <div class="zc-avatar">' + cfg.persona.icon + '</div>' +
      '  <div><b>' + cfg.persona.name + '</b><span class="zc-sub">' + cfg.persona.sub + '</span></div>' +
      '  <div class="zc-live"><i></i>在线</div>' +
      '</div>' +
      '<div class="zc-scenes"></div>' +
      '<div class="zc-body"></div>' +
      '<div class="zc-input"><input type="text" placeholder="向数字员工布置任务，或点击上方场景演示…">' +
      '<button class="btn primary sm">发送</button></div>';
    this.body = $('.zc-body', root);
    this.scenes = $('.zc-scenes', root);
    this.input = $('input', root);
    const send = $('.zc-input button', root);
    send.onclick = () => this.freeSend();
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.freeSend(); });
    (cfg.scenarios || []).forEach((s, i) => {
      const b = el('button', i === 0 ? 'on' : '', s.title);
      b.onclick = () => this.play(s.id);
      b.dataset.id = s.id;
      this.scenes.appendChild(b);
    });
    if (cfg.scenarios && cfg.scenarios.length) this.play(cfg.scenarios[0].id, true);
  }
  Chat.prototype.clear = function () { this.body.innerHTML = ''; };
  Chat.prototype.scroll = function () { this.body.scrollTop = this.body.scrollHeight; };
  Chat.prototype.msg = function (from, html) {
    const u = current() || { avatar: '我' };
    const m = el('div', 'zc-msg ' + from);
    m.innerHTML = '<div class="m-avatar">' + (from === 'ai' ? this.cfg.persona.icon : u.avatar) + '</div><div class="m-bubble">' + html + '</div>';
    this.body.appendChild(m); this.scroll();
  };
  Chat.prototype.tool = function (t) {
    const d = el('div', 'zc-tool');
    d.innerHTML = '<div class="t-ic">' + t.ic + '</div><div><b>' + t.name + '</b> · ' + t.detail + '</div><span class="t-status run">执行中…</span>';
    this.body.appendChild(d); this.scroll();
    setTimeout(() => { const s = $('.t-status', d); if (s) { s.textContent = '✓ 完成'; s.classList.remove('run'); } }, 900);
  };
  Chat.prototype.card = function (c) {
    const d = el('div', 'zc-card');
    d.innerHTML =
      '<div class="c-eyebrow">' + (c.eyebrow || '结果') + '</div>' +
      '<b class="c-title">' + c.title + '</b>' +
      '<p>' + c.body + '</p>' +
      (c.meta ? '<div class="c-meta">' + c.meta.map((m) => '<span class="tag accent">' + m + '</span>').join('') + '</div>' : '') +
      (c.aigc ? '<div class="c-meta"><span class="aigc-mark">✦ AI 辅助生成 · 需人工审定</span></div>' : '');
    this.body.appendChild(d); this.scroll();
  };
  Chat.prototype.think = async function (tok, ms) {
    const t = el('div', 'zc-think', '<i></i><i></i><i></i>');
    this.body.appendChild(t); this.scroll();
    await sleep(ms || 1000);
    t.remove();
    return this.token === tok;
  };
  Chat.prototype.play = async function (id, first) {
    const sc = this.cfg.scenarios.find((s) => s.id === id);
    if (!sc) return;
    const tok = ++this.token;
    this.scenes.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    this.clear();
    if (first) await sleep(300);
    for (const st of sc.steps) {
      if (this.token !== tok) return;
      if (st.from === 'user') { await sleep(st.delay || 500); if (this.token !== tok) return; this.msg('user', st.text); continue; }
      if (st.think) { if (!(await this.think(tok, st.think))) return; continue; }
      if (st.tool) { await sleep(st.delay || 600); if (this.token !== tok) return; this.tool(st.tool); continue; }
      if (st.card) { await sleep(st.delay || 800); if (this.token !== tok) return; this.card(st.card); continue; }
      if (st.text) { await sleep(st.delay || 700); if (this.token !== tok) return; this.msg('ai', st.text); }
    }
  };
  Chat.prototype.freeSend = async function () {
    const v = this.input.value.trim();
    if (!v) return;
    this.input.value = '';
    const tok = ++this.token;
    this.msg('user', v);
    if (!(await this.think(tok, 900))) return;
    this.msg('ai', '收到，任务「<b>' + v + '</b>」已登记。我会调用相应智能体与知识库处理，完成后通过消息中心和移动端同步结果。<br><span class="tiny">（原型演示：请点击上方场景按钮查看完整业务流程）</span>');
  };
  function mountChat(elOrId, cfg) {
    const root = typeof elOrId === 'string' ? $(elOrId) : elOrId;
    if (!root) return null;
    return new Chat(root, cfg);
  }

  /* ================= 全站浮动数字员工 ================= */
  function assistant() {
    const u = current();
    if (!u) return;
    const persona = D.PERSONAS[u.id];
    const fab = el('button', 'assist-fab', persona.icon + '<span class="fab-dot"></span>');
    fab.title = persona.name;
    const panel = el('div', 'assist-panel');
    const host = el('div'); host.style.height = '100%';
    panel.appendChild(host);
    document.body.appendChild(panel);
    document.body.appendChild(fab);
    let chat = null;
    fab.onclick = () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open') && !chat) {
        chat = mountChat(host, { persona, scenarios: D.SCENARIOS[u.id] || [] });
      }
    };
  }

  /* ================= 页面初始化快捷方式 ================= */
  // ZM.boot('haogao') → 守卫 + 导航 + 水印 + 浮动助手 + 页脚
  function boot(pageKey, opts) {
    opts = opts || {};
    const u = guard(pageKey);
    if (!u) return null;
    document.addEventListener('DOMContentLoaded', () => {
      renderNav(pageKey);
      watermark();
      if (!opts.noAssist) assistant();
      if (!opts.noFoot) renderFoot();
    });
    return u;
  }

  return { login, logout, current, can, guard, boot, renderNav, watermark, assistant, renderFoot,
           applyTheme, mountChat, toast, modal, el, sleep, $, USERS: D.USERS };
})();
