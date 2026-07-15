/* ============================================================
   PeihuChat · 微信语音 Agent 对话原型引擎
   用法：
     PeihuChat.mount(document.getElementById('phone-slot'), {
       contact: { name: 'S-Agent · 护工助理', corp: '@某某陪护', sub: '商汤 AI 技术底座 · 企业微信' },
       user:    { name: '王秀兰', avatar: '王' },
       scenarios: [ { id, title, steps: [step, ...] }, ... ]
     })
   step 结构（按 from 分流）：
     { from:'agent'|'user',
       voice:'转写文字', dur:8,          // 语音消息（自动出转写条）
       text:'纯文本消息',                 // 文本气泡，支持 <b> 等内联标签
       html:'<div class="c-card">…',     // 卡片消息（企微应用卡片）
       sys:'系统提示文字',                // 居中灰字系统提示
       delay: 800                         // 可选，覆盖默认节奏
     }
   ============================================================ */
(function () {
  'use strict';

  function el(tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function phoneSkeleton(contact) {
    const wrap = el('div', 'phone');
    wrap.innerHTML =
      '<div class="notch"></div>' +
      '<div class="screen">' +
      '  <div class="statusbar"><span>9:41</span><span class="right">●●●●● 5G ▮▮▮</span></div>' +
      '  <div class="wx-header">' +
      '    <div class="back">‹</div>' +
      '    <div class="title"><b>' + contact.name +
      (contact.corp ? ' <span class="corp">' + contact.corp + '</span>' : '') +
      '</b><span>' + (contact.sub || '') + '</span></div>' +
      '    <div class="more">···</div>' +
      '  </div>' +
      '  <div class="wx-chat"></div>' +
      '  <div class="wx-footer">' +
      '    <div class="wx-chips"></div>' +
      '    <div class="wx-inputbar">' +
      '      <div class="mic">🎙</div>' +
      '      <div class="holdbar">按住 说话</div>' +
      '      <div class="plus">＋</div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    return wrap;
  }

  function voiceBubbleHTML(dur, me) {
    const waves = '<span class="waves"><i></i><i></i><i></i><i></i><i></i></span>';
    return me
      ? '<span class="dur">' + dur + '″</span>' + waves
      : waves + '<span class="dur">' + dur + '″</span>';
  }

  function Chat(root, cfg) {
    this.root = root;
    this.cfg = cfg;
    this.playToken = 0;
    root.appendChild((this.phone = phoneSkeleton(cfg.contact)));
    this.chatEl = this.phone.querySelector('.wx-chat');
    this.chipsEl = this.phone.querySelector('.wx-chips');
    this.holdbar = this.phone.querySelector('.holdbar');
    this.buildSceneBar();
    if (cfg.scenarios && cfg.scenarios.length) this.play(cfg.scenarios[0].id);
  }

  Chat.prototype.buildSceneBar = function () {
    const bar = el('div', 'scene-bar');
    this.cfg.scenarios.forEach((s) => {
      const b = el('button', 'scene-btn', s.title);
      b.onclick = () => this.play(s.id);
      b.dataset.id = s.id;
      bar.appendChild(b);
    });
    this.root.insertBefore(bar, this.phone);
    this.sceneBar = bar;
  };

  Chat.prototype.scroll = function () {
    this.chatEl.scrollTop = this.chatEl.scrollHeight + 400;
  };

  Chat.prototype.addRow = function (who, inner, name) {
    const me = who === 'user';
    const row = el('div', 'wx-row' + (me ? ' me' : ''));
    const av = this.cfg[me ? 'user' : 'agent'] || {};
    const avatarText = me ? (av.avatar || '我') : (av.avatar || 'S');
    row.appendChild(el('div', 'wx-avatar ' + (me ? 'user' : 'agent'), avatarText));
    const body = el('div', 'wx-body');
    if (!me && name !== false) body.appendChild(el('div', 'wx-name', (this.cfg.agent && this.cfg.agent.name) || this.cfg.contact.name));
    body.appendChild(inner);
    row.appendChild(body);
    this.chatEl.appendChild(row);
    this.scroll();
    return { row, body };
  };

  Chat.prototype.renderStep = async function (step, token) {
    const me = step.from === 'user';
    if (step.sys) {
      this.chatEl.appendChild(el('div', 'wx-sys', step.sys));
      this.scroll();
      await sleep(step.delay || 650);
      return;
    }
    if (me && step.voice != null) {
      // 模拟按住说话
      this.holdbar.classList.add('rec');
      this.holdbar.textContent = '松开 发送';
      await sleep(Math.min(1400, 300 + (step.dur || 5) * 60));
      if (token !== this.playToken) return;
      this.holdbar.classList.remove('rec');
      this.holdbar.textContent = '按住 说话';
    }
    if (step.voice != null) {
      const vb = el('div', 'wx-bubble wx-voice playing', voiceBubbleHTML(step.dur || 6, me));
      const { body } = this.addRow(step.from, vb);
      await sleep(900);
      if (token !== this.playToken) return;
      vb.classList.remove('playing');
      const tr = el('div', 'wx-transcript', '<span class="t-label">语音转文字 · ASR</span>' + step.voice);
      body.appendChild(tr);
      this.scroll();
      await sleep(step.delay || 700);
      return;
    }
    if (!me) {
      const typing = el('div', 'wx-bubble wx-typing', '<i></i><i></i><i></i>');
      const t = this.addRow('agent', typing, false);
      await sleep(step.think || 750);
      if (token !== this.playToken) { t.row.remove(); return; }
      t.row.remove();
    }
    if (step.text != null) {
      this.addRow(step.from, el('div', 'wx-bubble', step.text));
      await sleep(step.delay || 780);
      return;
    }
    if (step.html != null) {
      const holder = el('div');
      holder.innerHTML = step.html;
      this.addRow(step.from, holder.firstElementChild || holder);
      await sleep(step.delay || 950);
    }
  };

  Chat.prototype.play = async function (id) {
    const sc = this.cfg.scenarios.find((s) => s.id === id);
    if (!sc) return;
    const token = ++this.playToken;
    this.sceneBar.querySelectorAll('.scene-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.id === id));
    this.chatEl.innerHTML = '';
    this.chipsEl.innerHTML = '';
    this.chatEl.appendChild(el('div', 'wx-time', '<span>今天 9:41</span>'));
    if (sc.intro) this.chatEl.appendChild(el('div', 'wx-sys', sc.intro));

    // 底部快捷话术：展示该角色还能说什么（点击即切场景）
    this.cfg.scenarios.forEach((s) => {
      if (s.id === id) return;
      const c = el('button', 'wx-chip', '🎙 ' + (s.chip || s.title));
      c.onclick = () => this.play(s.id);
      this.chipsEl.appendChild(c);
    });

    for (const step of sc.steps) {
      if (token !== this.playToken) return;
      await this.renderStep(step, token);
    }
    if (token !== this.playToken) return;
    const replay = el('button', 'wx-chip', '↻ 重播本场景');
    replay.onclick = () => this.play(id);
    this.chipsEl.insertBefore(replay, this.chipsEl.firstChild);
  };

  window.PeihuChat = {
    mount: function (rootEl, cfg) { return new Chat(rootEl, cfg); }
  };
})();
