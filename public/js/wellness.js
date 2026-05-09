/* ============================================================
   HealthBridge AI — Wellness Tracker
   Persists daily water, sleep, mood, habits & streak to
   localStorage. Updates animated rings and dashboard stats.
   ============================================================ */

(function () {
  'use strict';

  const KEY = 'healthbridge.wellness.v1';
  const RING_CIRC = 326; // 2*pi*r where r=52

  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  document.addEventListener('DOMContentLoaded', () => {
    const state = load();
    const today = todayKey();
    if (!state[today]) state[today] = { water: 0, sleep: 7, mood: 0, habits: {} };
    save(state);

    const day = state[today];

    /* ---------- Water ---------- */
    const waterCount = document.getElementById('waterCount');
    const waterRing = document.getElementById('waterRingFg');
    const setWater = (n) => {
      day.water = Math.max(0, Math.min(12, n));
      waterCount.textContent = day.water;
      waterRing.style.strokeDashoffset = RING_CIRC * (1 - Math.min(day.water, 8) / 8);
      document.getElementById('statWater').textContent = day.water;
      save(state); updateWellnessStat();
    };
    document.getElementById('waterPlus').addEventListener('click', () => setWater(day.water + 1));
    document.getElementById('waterMinus').addEventListener('click', () => setWater(day.water - 1));
    setWater(day.water);

    /* ---------- Sleep ---------- */
    const sleepRange = document.getElementById('sleepRange');
    const sleepHours = document.getElementById('sleepHours');
    const sleepRing = document.getElementById('sleepRingFg');
    const setSleep = (h) => {
      day.sleep = h;
      sleepHours.textContent = h;
      sleepRing.style.strokeDashoffset = RING_CIRC * (1 - Math.min(h, 9) / 9);
      save(state); updateWellnessStat();
    };
    sleepRange.value = day.sleep;
    sleepRange.addEventListener('input', e => setSleep(parseInt(e.target.value, 10)));
    setSleep(day.sleep);

    /* ---------- Mood ---------- */
    const moodLabel = document.getElementById('moodLabel');
    const labels = { 1: 'Tough day — take it easy 💙', 2: 'A bit low — small wins matter', 3: 'Neutral — keep moving', 4: 'Good day! 🙂', 5: 'Great mood! Keep it up ✨' };
    const moodBtns = document.querySelectorAll('#moodRow button');
    function setMood(m) {
      day.mood = m;
      moodBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.m,10) === m));
      moodLabel.textContent = labels[m] || 'Tap to log your mood';
      document.getElementById('statMood').textContent = m;
      save(state); updateWellnessStat();
    }
    moodBtns.forEach(b => b.addEventListener('click', () => setMood(parseInt(b.dataset.m, 10))));
    if (day.mood) setMood(day.mood);

    /* ---------- Habits ---------- */
    const checks = document.querySelectorAll('#habitList input[type="checkbox"]');
    checks.forEach(c => {
      c.checked = !!day.habits[c.dataset.h];
      c.addEventListener('change', () => {
        day.habits[c.dataset.h] = c.checked;
        save(state); updateWellnessStat();
      });
    });

    /* ---------- Streak (consecutive days with any logged data) ---------- */
    function computeStreak() {
      let streak = 0;
      const d = new Date();
      while (true) {
        const k = d.toISOString().slice(0, 10);
        const v = state[k];
        const active = v && (v.water > 0 || v.mood > 0 || Object.values(v.habits || {}).some(Boolean));
        if (!active) break;
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return streak;
    }
    document.getElementById('streakCount').textContent = computeStreak();

    /* ---------- Wellness % ---------- */
    function updateWellnessStat() {
      const waterPct = Math.min(day.water / 8, 1) * 30;
      const sleepPct = Math.min(day.sleep / 8, 1) * 30;
      const moodPct = (day.mood / 5) * 20;
      const habitDone = Object.values(day.habits).filter(Boolean).length;
      const habitPct = (habitDone / 5) * 20;
      const total = Math.round(waterPct + sleepPct + moodPct + habitPct);
      document.getElementById('statWellness').textContent = total;
    }
    updateWellnessStat();
  });
})();
