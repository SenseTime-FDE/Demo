/* ============================================================
   HYChat · 中海油 现场语音 Agent 对话原型引擎
   （源自 peihu_proto 的 PeihuChat，仅改名 + 保持同构）
   用法：
     HYChat.mount(document.getElementById('phone-slot'), {
       contact: { name:'S-Agent 现场助手', corp:'@中海油·渤海', sub:'企业微信 · 商汤 AI 底座' },
       agent:   { name:'现场助手', avatar:'汕' },
       user:    { name:'张国栋', avatar:'张' },
       scenarios: [ { id, title, chip, intro, steps:[step,...] }, ... ]
     })
   step 结构（按 from 分流）：
     { from:'agent'|'user',
       voice:'转写文字', dur:8,          // 语音消息（自动出 ASR 转写条）
       text:'纯文本消息',                 // 文本气泡，支持 <b> 等内联标签
       html:'<div class="c-card">…',     // 卡片消息（企微应用卡片）
       sys:'系统提示文字',                // 居中灰字系统提示
       delay: 800, think: 750             // 可选，覆盖默认节奏
     }
   ============================================================ */
(function () {
  'use strict';

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function phoneSkeleton(contact) {
    var wrap = el('div', 'phone');
    wrap.innerHTML =
      '<div class="notch"></div>' +
      '<div class="screen">' +
      '  <div class="statusbar"><span>9:24</span><span class="right">中海油·内网 ▮▮▮</span></div>' +
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
    var waves = '<span class="waves"><i></i><i></i><i></i><i></i><i></i></span>';
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
    var self = this;
    var bar = el('div', 'scene-bar');
    this.cfg.scenarios.forEach(function (s) {
      var b = el('button', 'scene-btn', s.title);
      b.onclick = function () { self.play(s.id); };
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
    var me = who === 'user';
    var row = el('div', 'wx-row' + (me ? ' me' : ''));
    var av = this.cfg[me ? 'user' : 'agent'] || {};
    var avatarText = me ? (av.avatar || '我') : (av.avatar || 'S');
    row.appendChild(el('div', 'wx-avatar ' + (me ? 'user' : 'agent'), avatarText));
    var body = el('div', 'wx-body');
    if (!me && name !== false) body.appendChild(el('div', 'wx-name', (this.cfg.agent && this.cfg.agent.name) || this.cfg.contact.name));
    body.appendChild(inner);
    row.appendChild(body);
    this.chatEl.appendChild(row);
    this.scroll();
    return { row: row, body: body };
  };

  Chat.prototype.renderStep = async function (step, token) {
    var me = step.from === 'user';
    if (step.sys) {
      this.chatEl.appendChild(el('div', 'wx-sys', step.sys));
      this.scroll();
      await sleep(step.delay || 650);
      return;
    }
    if (me && step.voice != null) {
      this.holdbar.classList.add('rec');
      this.holdbar.textContent = '松开 发送';
      await sleep(Math.min(1400, 300 + (step.dur || 5) * 60));
      if (token !== this.playToken) return;
      this.holdbar.classList.remove('rec');
      this.holdbar.textContent = '按住 说话';
    }
    if (step.voice != null) {
      var vb = el('div', 'wx-bubble wx-voice playing', voiceBubbleHTML(step.dur || 6, me));
      var r = this.addRow(step.from, vb);
      await sleep(900);
      if (token !== this.playToken) return;
      vb.classList.remove('playing');
      var tr = el('div', 'wx-transcript', '<span class="t-label">语音转文字 · ASR</span>' + step.voice);
      r.body.appendChild(tr);
      this.scroll();
      await sleep(step.delay || 700);
      return;
    }
    if (!me) {
      var typing = el('div', 'wx-bubble wx-typing', '<i></i><i></i><i></i>');
      var t = this.addRow('agent', typing, false);
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
      var holder = el('div');
      holder.innerHTML = step.html;
      this.addRow(step.from, holder.firstElementChild || holder);
      await sleep(step.delay || 950);
    }
  };

  Chat.prototype.play = async function (id) {
    var self = this;
    var sc = this.cfg.scenarios.find(function (s) { return s.id === id; });
    if (!sc) return;
    var token = ++this.playToken;
    this.sceneBar.querySelectorAll('.scene-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.id === id);
    });
    this.chatEl.innerHTML = '';
    this.chipsEl.innerHTML = '';
    this.chatEl.appendChild(el('div', 'wx-time', '<span>今天 9:24</span>'));
    if (sc.intro) this.chatEl.appendChild(el('div', 'wx-sys', sc.intro));

    this.cfg.scenarios.forEach(function (s) {
      if (s.id === id) return;
      var c = el('button', 'wx-chip', '🎙 ' + (s.chip || s.title));
      c.onclick = function () { self.play(s.id); };
      self.chipsEl.appendChild(c);
    });

    for (var i = 0; i < sc.steps.length; i++) {
      if (token !== this.playToken) return;
      await this.renderStep(sc.steps[i], token);
    }
    if (token !== this.playToken) return;
    var replay = el('button', 'wx-chip', '↻ 重播本场景');
    replay.onclick = function () { self.play(id); };
    this.chipsEl.insertBefore(replay, this.chipsEl.firstChild);
  };

  window.HYChat = {
    mount: function (rootEl, cfg) { return new Chat(rootEl, cfg); }
  };
})();
