/* ============================================================
   HealthBridge AI — Floating AI Chatbot
   Intent-matching engine over CHAT_INTENTS with typing
   animation and timestamps. No external API required.
   To plug in OpenAI/Gemini, replace `simulate()` with a fetch
   call to your backend (see comment below).
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('chatToggle');
    const win = document.getElementById('chatWindow');
    const close = document.getElementById('chatClose');
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');

    function time() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    function add(role, text) {
      const div = document.createElement('div');
      div.className = `bubble ${role}`;
      div.innerHTML = `${escapeHtml(text)}<span class="time">${time()}</span>`;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }
    function typing(on) {
      let t = document.getElementById('typingBubble');
      if (on) {
        if (t) return;
        t = document.createElement('div');
        t.id = 'typingBubble';
        t.className = 'bubble bot';
        t.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
        body.appendChild(t);
        body.scrollTop = body.scrollHeight;
      } else if (t) t.remove();
    }

    /* Initial greeting */
    add('bot', "Hi! I'm your HealthBridge assistant. How are you feeling today?");

    toggle.addEventListener('click', () => {
      win.classList.toggle('open');
      win.setAttribute('aria-hidden', String(!win.classList.contains('open')));
      if (win.classList.contains('open')) input.focus();
    });
    close.addEventListener('click', () => win.classList.remove('open'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      add('user', text);
      input.value = '';
      typing(true);
      simulate(text).then(reply => {
        typing(false);
        add('bot', reply);
      });
    });

    /* ---------- Intent simulation ----------
       Replace this function with a real API call to add an LLM:
       async function simulate(t) {
         const r = await fetch('/api/chat', { method:'POST', body: JSON.stringify({ msg: t }) });
         const d = await r.json(); return d.reply;
       }
    */
    function simulate(text) {
      return new Promise(resolve => {
        const t = text.toLowerCase();
        let match = window.CHAT_INTENTS.find(i => i.keys.some(k => t.includes(k)));
        const reply = match ? match.reply : window.CHAT_DEFAULT;
        setTimeout(() => resolve(reply), 700 + Math.random() * 500);
      });
    }

    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  });
})();
