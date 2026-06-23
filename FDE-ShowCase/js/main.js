/* ============================================================
   FDE Demo Hub · 主逻辑
   读取 data.js 的数据，渲染页面并绑定所有交互。
   一般情况下无需修改此文件。
   ============================================================ */
(function () {
  "use strict";

  const { CATEGORIES, STATS, PROJECTS } = window.FDE_DATA;

  /* ---------- 小工具 ---------- */
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const arrowIcon =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>';

  /* 兜底封面：当外部站点禁止 iframe 内嵌、或预览未加载时显示的渐变图形 */
  function mockSVG(hue) {
    const h2 = (hue + 40) % 360;
    return `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">
      <defs><linearGradient id="g${hue}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue},70%,55%)" stop-opacity="0.85"/>
        <stop offset="1" stop-color="hsl(${h2},70%,50%)" stop-opacity="0.65"/></linearGradient></defs>
      <rect width="400" height="250" fill="url(#g${hue})" opacity="0.16"/>
      <g stroke="hsl(${hue},80%,70%)" stroke-width="2" fill="none" opacity="0.8">
        <path d="M30 180 L90 130 L150 155 L210 90 L270 120 L330 60 L370 95"/></g>
      <g fill="hsl(${hue},80%,65%)" opacity="0.9">
        <circle cx="90" cy="130" r="4"/><circle cx="210" cy="90" r="4"/><circle cx="330" cy="60" r="4"/></g>
      <g fill="hsl(${h2},75%,60%)" opacity="0.5">
        <rect x="40" y="200" width="22" height="30" rx="3"/><rect x="74" y="185" width="22" height="45" rx="3"/>
        <rect x="108" y="205" width="22" height="25" rx="3"/><rect x="142" y="170" width="22" height="60" rx="3"/></g>
    </svg>`;
  }

  /* ---------- 渲染：统计数字 ---------- */
  function renderStats() {
    $("#stats").innerHTML = STATS.map((s) => {
      const num = s.text
        ? `<div class="num">${esc(s.text)}</div>`
        : `<div class="num" data-count="${s.count}" data-suffix="${esc(s.suffix || "")}">0</div>`;
      return `<div class="stat">${num}<div class="lbl">${esc(s.label)}</div></div>`;
    }).join("");
  }

  /* ---------- 渲染：分类筛选 ---------- */
  function renderFilters() {
    $("#filters").innerHTML = CATEGORIES.map(
      (c, i) =>
        `<div class="chip${i === 0 ? " active" : ""}" data-f="${esc(c.key)}">${esc(c.label)}</div>`
    ).join("");
  }

  /* ---------- 渲染：作品卡片 ---------- */
  function renderCard(p) {
    const tags = (p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
    const live = p.live ? '<div class="live"><i></i>Live</div>' : "";
    const hasUrl = p.url && p.url !== "#";
    const preview = hasUrl
      ? `<iframe class="preview" src="${esc(p.url)}" loading="lazy" scrolling="no" sandbox="allow-scripts allow-same-origin" tabindex="-1" title="${esc(p.title)} preview"></iframe>`
      : "";
    return `<a class="card reveal" href="${hasUrl ? esc(p.url) : "#"}" data-cat="${esc(p.cat)}" ${hasUrl ? 'target="_blank" rel="noopener"' : ""}>
      <div class="thumb"><div class="fallback">${mockSVG(p.hue || 210)}</div>${preview}<div class="scan"></div>
        <div class="badge">${esc(p.badge)}</div>${live}<div class="arrow">${arrowIcon}</div></div>
      <div class="body"><h3>${esc(p.title)}</h3><div class="desc">${esc(p.desc)}</div><div class="meta">${tags}</div></div>
    </a>`;
  }

  function renderGrid() {
    $("#grid").innerHTML = PROJECTS.map(renderCard).join("");
  }

  /* ---------- 预览自适应缩放：iframe 始终填满缩略图 ---------- */
  function fitPreviews() {
    document.querySelectorAll(".thumb").forEach((t) => {
      const f = t.querySelector(".preview");
      if (!f) return;
      f.style.transform = "scale(" + t.clientWidth / 1280 + ")";
    });
  }

  /* ---------- 交互绑定 ---------- */
  function bindInteractions() {
    // 预览加载完成淡入
    document.querySelectorAll("iframe.preview").forEach((f) => {
      f.addEventListener("load", () => {
        f.classList.add("loaded");
        fitPreviews();
      });
    });

    // 分类筛选
    $("#filters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const f = chip.dataset.f;
      document.querySelectorAll("#grid .card").forEach((card) => {
        card.style.display = f === "all" || card.dataset.cat === f ? "" : "none";
      });
    });

    // 卡片 3D 倾斜
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-6px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });

    // 滚动渐入
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // 数字滚动
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          const target = +el.dataset.count;
          const suf = el.dataset.suffix || "";
          let cur = 0;
          const step = Math.max(1, Math.round(target / 40));
          const t = setInterval(() => {
            cur += step;
            if (cur >= target) {
              cur = target;
              clearInterval(t);
            }
            el.textContent = cur + suf;
          }, 26);
          countIO.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll(".num[data-count]").forEach((el) => countIO.observe(el));

    // 顶部滚动进度条
    const prog = $("#progress");
    addEventListener(
      "scroll",
      () => {
        const h = document.documentElement;
        prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + "%";
      },
      { passive: true }
    );

    // 鼠标跟随光晕
    const spot = $("#spotlight");
    addEventListener(
      "mousemove",
      (e) => {
        spot.style.left = e.clientX + "px";
        spot.style.top = e.clientY + "px";
      },
      { passive: true }
    );

    // 窗口缩放时重新适配预览
    addEventListener("resize", fitPreviews, { passive: true });
  }

  /* ---------- 启动 ---------- */
  function init() {
    renderStats();
    renderFilters();
    renderGrid();
    fitPreviews();
    bindInteractions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
