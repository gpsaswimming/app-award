(function () {
  'use strict';

  var CFG = window.AWARD_CONFIG || {};
  var deadlines = CFG.deadlines || {};

  // Display list for the "Pool represented" select (mirrors the API's canonical
  // team list; deploy-time configurable — see docs/DESIGN.md §10).
  var TEAMS = [
    'Beaconsdale', 'Colony', 'Coventry', 'Elizabeth Lake', 'Glendale',
    'Hidenwood', 'James River', 'Kiln Creek', 'Marlbank', 'Poquoson',
    'Riverdale', 'Running Man', 'Village Green', 'Warwick Yacht', 'Wendwood',
    'Willow Oaks', 'Windy Point', 'Wythe'
  ];

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Toast via the shared GPSA stylesheet (#toast-container / .toast-*).
  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 5000;
    var container = document.getElementById('toast-container');
    if (!container) { window.alert(message); return; }
    var icons = { success: '✓', error: '⚠', warning: '⚠', info: 'ℹ' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
      '<span class="toast-icon" aria-hidden="true">' + (icons[type] || icons.info) + '</span>' +
      '<span class="toast-message">' + escapeHtml(message) + '</span>' +
      '<button class="toast-close" aria-label="Dismiss">×</button>';
    container.appendChild(toast);
    var remove = function () { toast.classList.add('toast-exit'); setTimeout(function () { toast.remove(); }, 300); };
    toast.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, duration);
  }

  function parseDeadline(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  function deadlineLabel(d) {
    return d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'America/New_York'
    });
  }

  // Fill deadline placeholders (landing + form pages).
  document.querySelectorAll('[data-deadline]').forEach(function (el) {
    var d = parseDeadline(deadlines[el.getAttribute('data-deadline')]);
    el.textContent = d ? 'due ' + deadlineLabel(d) : 'deadline TBA';
  });

  // Populate any team selects.
  document.querySelectorAll('select[data-teams]').forEach(function (sel) {
    var frag = document.createDocumentFragment();
    var ph = document.createElement('option');
    ph.value = ''; ph.textContent = 'Select a pool…'; ph.disabled = true; ph.selected = true;
    frag.appendChild(ph);
    TEAMS.forEach(function (name) {
      var o = document.createElement('option');
      o.value = name; o.textContent = name;
      frag.appendChild(o);
    });
    sel.appendChild(frag);
  });

  var form = document.getElementById('award-form');
  if (!form) return; // landing / confirmation pages: nothing more to do

  var award = form.getAttribute('data-award');
  var essay = document.getElementById('essay');
  var counter = document.getElementById('wordcount');
  var submitBtn = document.getElementById('submit');
  var min = parseInt(essay.getAttribute('data-min'), 10);
  var max = parseInt(essay.getAttribute('data-max'), 10);
  var turnstileToken = '';

  function countWords(s) {
    s = (s || '').trim();
    return s ? s.split(/\s+/).length : 0;
  }
  function updateCount() {
    var n = countWords(essay.value);
    counter.textContent = n + ' word' + (n === 1 ? '' : 's');
    var ok = n >= min && n <= max;
    counter.className = 'wordcount ' + (n === 0 ? '' : ok ? 'ok' : 'bad');
    return ok;
  }
  essay.addEventListener('input', updateCount);
  updateCount();

  // If the deadline has passed, lock the form (the server enforces this too).
  var dl = parseDeadline(deadlines[award]);
  if (dl && new Date() > dl) {
    var notice = document.getElementById('closed-notice');
    if (notice) notice.hidden = false;
    Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
    return;
  }

  // Render the Turnstile widget once its async script is ready.
  function renderTurnstile() {
    if (!window.turnstile || !CFG.turnstileSiteKey) return;
    window.turnstile.render('#turnstile', {
      sitekey: CFG.turnstileSiteKey,
      callback: function (tok) { turnstileToken = tok; },
      'error-callback': function () { turnstileToken = ''; },
      'expired-callback': function () { turnstileToken = ''; }
    });
  }
  var tries = 0;
  var poll = setInterval(function () {
    if (window.turnstile || tries++ > 50) { clearInterval(poll); renderTurnstile(); }
  }, 100);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!updateCount()) {
      showToast('Your essay must be ' + min + '–' + max + ' words.', 'error');
      return;
    }
    if (CFG.turnstileSiteKey && !turnstileToken) {
      showToast('Please complete the bot check.', 'error');
      return;
    }

    var payload = { award: award, 'cf-turnstile-response': turnstileToken };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'radio' && !el.checked) return;
      payload[el.name] = el.value;
    });

    var original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    }).then(function (r) {
      if (r.ok && r.data && r.data.ok) {
        window.location.href = '/submitted?id=' + encodeURIComponent(r.data.id);
        return;
      }
      showToast((r.data && r.data.error) || 'Something went wrong. Please try again.', 'error', 7000);
      if (window.turnstile) { try { window.turnstile.reset(); } catch (err) {} }
      turnstileToken = '';
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }).catch(function () {
      showToast('Network error. Please try again.', 'error', 7000);
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    });
  });
})();
