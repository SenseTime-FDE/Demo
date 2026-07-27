/* ============================================================================
   Hub · 前端共享运行时（登录/鉴权 · 中台外壳导航 · API · UI 组件）
   页面用法：
     <script src="assets/app.js"></script>
     Hub.boot({ page:'index' }).then(({data, me, perms}) => { ... render ... })
     Hub.boot({ page:'media', scenario:'media' }).then(...)   // 场景页
   ============================================================================ */
(function () {
  'use strict';
  const TOKEN_KEY = "hub_token";
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- API ----
  async function api(path, opts = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    let json = {}; try { json = await res.json(); } catch (e) {}
    if (res.status === 401 && path !== "/api/login") { localStorage.removeItem(TOKEN_KEY); location.href = "login.html"; throw new Error("未登录"); }
    if (!res.ok) throw Object.assign(new Error(json.error || ("HTTP " + res.status)), { code: res.status });
    return json;
  }

  const Hub = {
    el, esc, $, api,
    data: null, me: null, perms: null, ver: 0, stats: null, users: null,

    // ---- 启动：鉴权 + 拉数据 + 渲染外壳 + 页面门禁（v2 业务×租户）----
    async boot({ page, scenario, business } = {}) {
      if (!localStorage.getItem(TOKEN_KEY)) { location.href = "portal.html"; return new Promise(() => {}); }
      let boot;
      try { boot = await api("/api/bootstrap"); }
      catch (e) { location.href = "portal.html"; return new Promise(() => {}); }
      this.data = boot.data; this.me = boot.me; this.perms = boot.me.perms; this.ver = boot.ver; this.stats = boot.stats; this.users = boot.users || null;
      // 业务 / 租户上下文
      const bizId = business || scenario || this.me.businessId || null;
      this.curBusiness = bizId; this.curTenant = this.me.tenantId || null;
      const home = (this.me.home || "operator") + ".html";
      if (boot.me.mustChange) setTimeout(() => this.toast("首次登录建议修改初始密码"), 800);
      // 门禁：页面/业务不在权限内 → 回本角色首页
      if (page && !this.perms.pages.includes(page)) { this.toast("无权访问该页面", true); setTimeout(() => location.href = home, 800); return new Promise(() => {}); }
      if (bizId && !this.canScene(bizId)) { this.toast("无权访问该业务", true); setTimeout(() => location.href = home, 800); return new Promise(() => {}); }
      if (bizId) document.body.setAttribute("data-scenario", bizId);
      this.renderShell(page, bizId);
      return { data: this.data, me: this.me, perms: this.perms };
    },

    // 业务归属（business.id === scenario.id）
    canScene(id) { const s = this.me.scenarios || []; return s.includes("*") || s.includes(id); },
    visibleScenarios() { return (this.data.scenarios || []).filter((s) => this.perms.viewAll || this.canScene(s.id)); },
    scenario(id) { return (this.data.scenarios || []).find((s) => s.id === id); },
    agentsOf(sc) { return (this.data.agents || []).filter((a) => a.scenario === sc); },
    kbsOf(sc) { return (this.data.kbs || []).filter((k) => k.scenario === sc); },
    sopsOf(sc) { return (this.data.sops || []).filter((k) => k.scenario === sc); },
    // ---- v2 多租户取数 ----
    businesses() { return this.data.businesses || []; },
    visibleBusinesses() { return this.businesses().filter((b) => this.perms.viewAll || this.canScene(b.id)); },
    business(id) { return this.businesses().find((b) => b.id === id); },
    tenant(id) { return (this.data.tenants || []).find((t) => t.id === id); },
    tenantsOf(bizId) { return (this.data.tenants || []).filter((t) => t.businessId === bizId); },
    agentsOfTenant(tid) { return (this.data.agents || []).filter((a) => a.tenantId === tid); },

    // ---- 外壳（侧边导航 + 顶栏）· 按角色 scope 组织（v2）----
    renderShell(page, bizId) {
      const P = this.perms, me = this.me, scope = me.scope || "platform";
      const biz = bizId ? this.business(bizId) : null;
      const item = (href, ic, label, active, accent) =>
        `<a class="nav-item${active ? " active" : ""}" href="${href}"${accent ? ` style="--accent:${accent}"` : ""}><span class="ic">${ic}</span>${esc(label)}</a>`;
      const gated = (id, ic, label) => P.pages.includes(id) ? item(id + ".html", ic, label, page === id) : "";
      const sceneGroup = () => !bizId ? "" : `<div class="nav-group"><div class="gh">一线使用场景</div>${[
        item(`${bizId}_agent.html`, "🎙", "Agent 语音原型", page === bizId + "_agent"),
        item(`${bizId}_miniapp.html`, "📱", "业务小程序", page === bizId + "_miniapp"),
        item(`${bizId}_board.html`, "📊", "数据看板", page === bizId + "_board"),
      ].join("")}</div>`;

      const groups = [];
      if (scope === "platform") {
        groups.push(`<div class="nav-group"><div class="gh">平台运营</div>${[
          gated("operator", "▦", "运营总览"), gated("models", "🧠", "模型接入"),
          gated("trace", "🎙", "语音留痕"), gated("integration", "🔗", "外部平台对接"),
          gated("settings", "⚙", "账号与权限"),
        ].join("")}</div>`);
        groups.push(`<div class="nav-group"><div class="gh">业务后台（下钻）</div>${this.businesses().map((b) =>
          item(`business.html?biz=${b.id}`, b.icon, b.name, page === "business" && bizId === b.id, b.accent)).join("")}</div>`);
      } else if (scope === "business") {
        groups.push(`<div class="nav-group"><div class="gh">${esc(biz ? biz.name : "业务后台")}</div>${[
          gated("business", "▦", "业务后台"), gated("models", "🧠", "模型接入"),
          gated("trace", "🎙", "语音留痕"), gated("assistant", "💬", "AI 助理"),
        ].join("")}</div>`);
        groups.push(sceneGroup());
      } else if (scope === "tenant") {
        groups.push(`<div class="nav-group"><div class="gh">${esc(biz ? biz.name + " · 租户" : "租户后台")}</div>${[
          gated("tenant", "▦", "租户首页"), gated("assistant", "💬", "AI 助理"), gated("trace", "🎙", "语音留痕"),
        ].join("")}</div>`);
        groups.push(sceneGroup());
      } else { // frontline
        groups.push(`<div class="nav-group"><div class="gh">我的 AI</div>${[
          gated("assistant", "💬", "个人 AI 助理"),
          bizId ? item(`${bizId}_miniapp.html`, "📱", "业务小程序", page === bizId + "_miniapp") : "",
        ].join("")}</div>`);
      }

      const brandTitle = biz ? "灵犀 · " + biz.name : "商汤灵犀";
      const homeHref = (me.home || "operator") + ".html";
      const sidebar = el("aside", "sidebar");
      sidebar.innerHTML =
        `<a class="brand" href="${homeHref}"><img src="assets/st_logo_white.png" alt="商汤"><div><div class="bt">${esc(brandTitle)}</div><div class="bs">SenseAgent · 灵犀</div></div></a>` +
        groups.join("") +
        `<div class="spacer"></div>` +
        `<div class="nav-item" id="nav-logout"><span class="ic">⎋</span>退出登录</div>`;

      const topbar = el("div", "topbar");
      const tnt = this.curTenant ? this.tenant(this.curTenant) : null;
      topbar.innerHTML =
        `<h1>${biz ? biz.icon + " " + esc(biz.name) : "商汤灵犀 · 运营总览"}</h1>` +
        `<span class="crumb">${tnt ? esc(tnt.name) : (biz ? esc(biz.tagline) : "多租户 SaaS · 大模型生态渠道部")}</span>` +
        `<div class="sp"></div>` +
        `<div class="who"><span class="pill acc">${esc(P.label)}</span><span>${esc(me.name)}</span><div class="avatar">${esc((me.name || "U").slice(-2))}</div></div>` +
        `<img src="assets/st_logo_white.png" class="topbar-logo" alt="商汤科技" title="商汤科技 · 大模型生态渠道部">`;

      const appExist = $(".app");
      if (appExist) return;
      const main = el("main", "main");
      const body = document.body;
      const view = $("#view") || (() => { const v = el("div"); v.id = "view"; while (body.firstChild) v.appendChild(body.firstChild); return v; })();
      main.appendChild(topbar); main.appendChild(view);
      const app = el("div", "app"); app.appendChild(sidebar); app.appendChild(main);
      body.appendChild(app);
      $("#nav-logout").onclick = () => { localStorage.removeItem(TOKEN_KEY); location.href = "portal.html"; };
    },

    // 场景内子导航（工作台 / Agent / 小程序 / 看板）
    sceneSubnav(scenario, active) {
      const items = [
        { k: "", label: "工作台", ic: "🗂" },
        { k: "_agent", label: "Agent 原型", ic: "🎙" },
        { k: "_miniapp", label: "小程序", ic: "📱" },
        { k: "_board", label: "数据看板", ic: "📊" },
      ];
      return `<div class="tabs" style="margin-bottom:18px">` + items.map((i) =>
        `<a class="tab${active === i.k ? " active" : ""}" href="${scenario}${i.k}.html">${i.ic} ${i.label}</a>`).join("") + `</div>`;
    },

    // ---- 写操作 ----
    async change(kind, payload) {
      try { const r = await api("/api/change", { method: "POST", body: { kind, payload } }); this.ver = r.ver; return r; }
      catch (e) { this.toast(e.message || "操作失败", true); throw e; }
    },
    async logTrace(t) { try { return await api("/api/trace", { method: "POST", body: t }); } catch (e) { return null; } },
    async traces(params = {}) { const qs = new URLSearchParams(params).toString(); return api("/api/traces" + (qs ? "?" + qs : "")); },
    // ---- 模型接入 ----
    async models() { return api("/api/models"); },                       // { config, modelConfig }
    async llmHealth() { return api("/api/llm/health"); },
    async llmChat(body) { return api("/api/llm/chat", { method: "POST", body }); }, // { model, messages, temperature?, max_tokens?, trace?, scenario?, agentId?, agentName?, intent? }
    async voxoneInvoke(body) { return api("/api/external/invoke", { method: "POST", body }); }, // 声渡拟真人语音网关（若该业务已接入）
    // 统一 AI 应答：先走该业务「真实声渡端点」(voxone)，失败/未接入则回退灵犀大模型；两条路都写留痕
    async aiReply({ text, history = [], scenario, model, system, intent, agentId, agentName }) {
      const biz = scenario && this.business(scenario);
      const voxOn = biz && biz.voxone && biz.voxone.status === "已接入" && !this._voxDown;
      if (voxOn) {
        try {
          const r = await this.voxoneInvoke({ source: "voxone", scenario, mode: "chat", text, history });
          const reply = r.reply || r.content || r.text || (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content);
          if (!reply) this._voxDown = true;
          if (reply) {
            this.logTrace({ scenario, agentId, agentName: agentName || ("声渡·" + scenario), channel: "voice", intent: intent || "声渡语音", duration: Math.round((r.ms || 0) / 1000) || 1, result: "声渡拟真人应答",
              transcript: [...history.filter(m => m.role !== "system").map(m => ({ who: m.role === "user" ? "user" : "agent", text: m.content })), { who: "user", text }, { who: "agent", text: reply }] });
            return { reply, via: "声渡 VoxOne（真实端点）", voice: true };
          }
        } catch (e) { this._voxDown = true; /* 声渡端点不可用/令牌失效 → 本会话内回退灵犀模型 */ }
      }
      const messages = [system ? { role: "system", content: system } : null, ...history, { role: "user", content: text }].filter(Boolean);
      const r = await this.llmChat({ model, messages, trace: true, scenario, intent: intent || "AI对话", agentId, agentName });
      return { reply: r.content, via: "灵犀 " + (r.model || model || ""), ms: r.ms, usage: r.usage, voice: false };
    },
    async refresh() { const b = await api("/api/bootstrap"); this.data = b.data; this.ver = b.ver; this.stats = b.stats; this.users = b.users || this.users; return this.data; },

    // ---- UI 组件 ----
    toast(msg, err) { let t = $("#hub-toast"); if (!t) { t = el("div", "toast"); t.id = "hub-toast"; document.body.appendChild(t); } t.className = "toast" + (err ? " err" : ""); t.textContent = msg; requestAnimationFrame(() => t.classList.add("show")); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove("show"), 2600); },
    modal(title, bodyHtml, onMount) {
      let m = $("#hub-mask"); if (!m) { m = el("div", "mask"); m.id = "hub-mask"; document.body.appendChild(m); }
      m.innerHTML = `<div class="modal"><span class="modal-x">×</span><h3>${esc(title)}</h3><div class="modal-body">${bodyHtml}</div></div>`;
      m.classList.add("show");
      const close = () => m.classList.remove("show");
      m.querySelector(".modal-x").onclick = close;
      m.onclick = (e) => { if (e.target === m) close(); };
      if (onMount) onMount(m.querySelector(".modal-body"), close);
      return { close, root: m.querySelector(".modal-body") };
    },
    confirm(msg, onYes) { this.modal("确认", `<p class="t2" style="margin-bottom:18px">${esc(msg)}</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" id="cf-no">取消</button><button class="btn btn-primary" id="cf-yes">确定</button></div>`, (b, close) => { b.querySelector("#cf-no").onclick = close; b.querySelector("#cf-yes").onclick = () => { close(); onYes && onYes(); }; }); },

    kpi(k) { return `<div class="kpi"><div class="k">${esc(k.k)}</div><div class="v">${esc(k.v)}${k.u ? `<small>${esc(k.u)}</small>` : ""}</div><div class="d ${/(\+|↑)/.test(k.d || "") ? "up" : /(\-|↓)/.test(k.d || "") ? "" : ""}">${esc(k.d || "")}</div></div>`; },
    kpis(arr) { return `<div class="grid g5">${arr.map((k) => this.kpi(k)).join("")}</div>`; },
    bars(rows, max) { const m = max || Math.max(...rows.map((r) => +r.v || 0), 1); return `<div class="bars">${rows.map((r) => `<div class="bar-row"><span class="nowrap">${esc(r.n)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.round((+r.v / m) * 100)}%"></span></span><span class="bv">${esc(r.v)}</span></div>`).join("")}</div>`; },
    cols(vals) { const m = Math.max(...vals, 1); return `<div class="cols">${vals.map((v) => `<div class="col" data-v="${v}" style="height:${Math.round((v / m) * 100)}%"></div>`).join("")}</div>`; },
    donut(parts, centerLabel) {
      const cols = ["var(--accent)", "#60A5FA", "#34D399", "#FBBF24", "#a78bfa", "#f472b6"];
      const total = parts.reduce((s, p) => s + p.v, 0) || 1; let acc = 0;
      const seg = parts.map((p, i) => { const a0 = acc / total * 360; acc += p.v; const a1 = acc / total * 360; return `${cols[i % cols.length]} ${a0}deg ${a1}deg`; }).join(",");
      const legend = parts.map((p, i) => `<div class="li"><span class="sw" style="background:${cols[i % cols.length]}"></span>${esc(p.n)} <span class="tr" style="margin-left:auto">${p.v}</span></div>`).join("");
      return `<div class="flex ac gap12 wrapf"><div class="donut" style="background:conic-gradient(${seg})"><div class="hole"><b>${esc(centerLabel || total)}</b><span>合计</span></div></div><div class="legend">${legend}</div></div>`;
    },
    statusPill(s) {
      const map = { "on": ["ok", "启用"], "off": ["", "停用"], "已发": ["ok", "已发"], "待审": ["warn", "待审"], "草稿": ["", "草稿"], "在护": ["ok", "在护"], "营业": ["ok", "营业"], "已完成": ["ok", "已完成"], "进行中": ["info", "进行中"], "已推送": ["info", "已推送"], "处置中": ["warn", "处置中"], "已闭环": ["ok", "已闭环"], "已转化": ["ok", "已转化"], "待回访": ["warn", "待回访"], "已登记": ["info", "已登记"], "整改中": ["warn", "整改中"], "合格": ["ok", "合格"], "待整改": ["warn", "待整改"] };
      const m = map[s] || ["", s]; return `<span class="pill ${m[0]}">${esc(m[1])}</span>`;
    },
    levelTag(lv) { return `<span class="lv lv-${esc(lv)}">${esc(lv)}</span>`; },
  };

  window.Hub = Hub;
})();
