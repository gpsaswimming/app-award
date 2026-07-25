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

  // US states for the applicant address select. Value is the 2-letter code
  // (mirrors the API's US_STATES); the label shows the full name.
  var US_STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
    ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
    ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
    ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
    ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
    ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
    ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
    ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
    ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
    ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
    ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
    ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
    ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
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

  // Populate any US-state selects (applicant address).
  document.querySelectorAll('select[data-states]').forEach(function (sel) {
    var frag = document.createDocumentFragment();
    var ph = document.createElement('option');
    ph.value = ''; ph.textContent = 'Select a state…'; ph.disabled = true; ph.selected = true;
    frag.appendChild(ph);
    US_STATES.forEach(function (pair) {
      var o = document.createElement('option');
      o.value = pair[0]; o.textContent = pair[1];
      frag.appendChild(o);
    });
    sel.appendChild(frag);
  });

  // Live-format telephone inputs as the user types: (XXX) XXX-XXXX.
  function formatPhone(v) {
    var d = (v || '').replace(/\D/g, '').slice(0, 10);
    if (d.length < 4) return d ? '(' + d : '';
    if (d.length < 7) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }
  document.querySelectorAll('input[type="tel"]').forEach(function (el) {
    el.addEventListener('input', function () { el.value = formatPhone(el.value); });
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

  var turnstileRendered = false;
  function renderTurnstile() {
    if (turnstileRendered || !window.turnstile || typeof window.turnstile.render !== 'function') return;
    if (!CFG.turnstileSiteKey) {
      console.warn('Turnstile site key is not configured; the widget will not render.');
      return;
    }
    turnstileRendered = true;
    window.turnstile.render('#turnstile', {
      sitekey: CFG.turnstileSiteKey,
      callback: function (tok) { turnstileToken = tok; },
      'error-callback': function () { turnstileToken = ''; },
      'expired-callback': function () { turnstileToken = ''; }
    });
  }

  // Load the Turnstile API from here rather than a static <head> tag. A
  // parser-inserted api.js is served so early (often from cache, before <body>
  // exists) that it fails to bootstrap its challenge iframe and the widget
  // never mounts — observed on this site, while a JS-injected load at DOM-ready
  // works reliably. Define the onload callback FIRST, then inject the script, so
  // the API always finds `onTurnstileLoad` and renders once initialised.
  window.onTurnstileLoad = renderTurnstile;
  var tsScript = document.createElement('script');
  tsScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
  tsScript.async = true;
  document.head.appendChild(tsScript);

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
