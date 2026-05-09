/* ============================================================
   HealthBridge AI — App Bootstrap
   Navbar behavior, mobile menu, scroll reveal, footer year,
   contact form handling, animated counters.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Lucide icon init (re-runs as needed) ---------- */
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  window.HBA_refreshIcons = refreshIcons;

  document.addEventListener('DOMContentLoaded', () => {
    refreshIcons();

    /* ---------- Navbar scroll state ---------- */
    const navbar = document.getElementById('navbar');
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Mobile menu ---------- */
    const ham = document.getElementById('hamburger');
    const links = document.getElementById('navLinks');
    ham.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

    /* ---------- Footer year ---------- */
    document.getElementById('yr').textContent = new Date().getFullYear();

    /* ---------- Reveal-on-scroll ---------- */
    const reveals = document.querySelectorAll('.feature-card, .stat-card, .wellness-card, .firstaid, .emerg-card, .place-card, .med-card');
    reveals.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));

    /* ---------- Animated counters (stats) ---------- */
    document.querySelectorAll('.counter[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1400; let start = null;
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        el.textContent = Math.floor(p * target);
        if (p < 1) requestAnimationFrame(step);
      }
      const sio = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { requestAnimationFrame(step); sio.unobserve(el); }
        });
      });
      sio.observe(el);
    });

    /* ---------- "Start AI Assistant" / nav AI Assistant -> open chatbot ---------- */
    function openChat() {
      const win = document.getElementById('chatWindow');
      const tgl = document.getElementById('chatToggle');
      if (!win) return;
      win.classList.add('open');
      win.setAttribute('aria-hidden', 'false');
      tgl?.classList.add('hidden');
      const ci = document.getElementById('chatInput');
      setTimeout(() => ci?.focus(), 200);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    document.getElementById('startAssistantBtn')?.addEventListener('click', openChat);
    document.querySelectorAll('a[href="#assistant"]').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); openChat(); });
    });

    /* ---------- Contact form (front-end demo) ---------- */
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('formStatus');
      status.textContent = 'Sending…';
      setTimeout(() => {
        status.textContent = '✓ Thank you! We\'ll get back to you within 24 hours.';
        form.reset();
      }, 700);
    });
  });
})();
