/* ============================================================
   HealthBridge AI — Emergency Section
   Renders region-specific emergency numbers with click-to-call.
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('countrySelect');
    const grid = document.getElementById('emergGrid');

    /* Detect locale -> default country */
    const lang = (navigator.language || 'en-IN').toUpperCase();
    if (lang.includes('US')) select.value = 'US';
    else if (lang.includes('GB')) select.value = 'UK';
    else if (lang.includes('AU')) select.value = 'AU';
    else if (lang.includes('CA')) select.value = 'CA';
    else if (lang.includes('IN')) select.value = 'IN';

    const render = () => {
      const list = window.EMERGENCY_NUMBERS[select.value] || [];
      grid.innerHTML = list.map(item => `
        <div class="emerg-card">
          <i data-lucide="${item.icon}"></i>
          <h3 style="color:#fff;margin:0">${item.label}</h3>
          <span class="num">${item.num}</span>
          <a class="call" href="tel:${item.num.replace(/[^0-9+]/g,'')}"><i data-lucide="phone-call"></i> Call Now</a>
        </div>
      `).join('');
      window.HBA_refreshIcons();
    };
    select.addEventListener('change', render);
    render();
  });
})();
