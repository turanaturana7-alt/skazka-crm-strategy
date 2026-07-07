// ===== Theme switcher (light / dark / system) =====
(function themeInit() {
  var root = document.documentElement;
  var stored = localStorage.getItem('skazka-theme') || 'system';
  applyTheme(stored);

  function applyTheme(mode) {
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    document.querySelectorAll('.theme-switch button').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    localStorage.setItem('skazka-theme', mode);
  }

  window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.theme-switch button').forEach(function (btn) {
      btn.addEventListener('click', function () { applyTheme(btn.dataset.mode); });
    });
  });
})();

// ===== Scroll-spy for sidebar nav + reveal-on-scroll for slides =====
window.addEventListener('DOMContentLoaded', function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var sections = links
    .map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); })
    .filter(Boolean);

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = links.find(function (l) { return l.getAttribute('href') === '#' + entry.target.id; });
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        document.querySelectorAll('.slide').forEach(function (s) { s.classList.remove('active'); });
        entry.target.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach(function (s) { spy.observe(s); });

  var reveal = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.slide').forEach(function (s) {
    if (reduceMotion) { s.classList.add('in-view'); }
    else { reveal.observe(s); }
  });
});

// ===== Scroll progress rail =====
window.addEventListener('DOMContentLoaded', function () {
  var fill = document.getElementById('progress-fill');
  if (!fill) return;
  function update() {
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    var pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
    fill.style.width = pct + '%';
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
});

// ===== Animated counters (page-load / scroll-triggered reveal) =====
window.addEventListener('DOMContentLoaded', function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var metrics = Array.prototype.slice.call(document.querySelectorAll('.metric'));

  function animateCounter(el) {
    var text = el.textContent.trim();
    var m = text.match(/^(\d{1,3}(?:[  ]\d{3})*(?:[.,]\d+)?)([\s\S]*)$/);
    if (!m || reduceMotion) return;
    var raw = m[1];
    var suffix = m[2];
    var numStr = raw.replace(/[  ]/g, '').replace(',', '.');
    var target = parseFloat(numStr);
    if (isNaN(target)) return;
    var decimals = (numStr.split('.')[1] || '').length;
    var duration = 900;
    var start = performance.now();
    el.classList.add('counting');

    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      var formatted = decimals
        ? val.toFixed(decimals).replace('.', ',')
        : Math.round(val).toLocaleString('ru-RU');
      el.textContent = formatted + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = raw + suffix;
    }
    requestAnimationFrame(tick);
  }

  if (reduceMotion || !metrics.length) return;

  var counterObserver = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  metrics.forEach(function (el) { counterObserver.observe(el); });
});

// ===== Revenue model calculator =====
window.addEventListener('DOMContentLoaded', function () {
  var baseEl = document.getElementById('rm-base');
  var crEl = document.getElementById('rm-cr');
  var touchesEl = document.getElementById('rm-touches');
  var checkEl = document.getElementById('rm-check');
  if (!baseEl) return;

  var ticketsPerPurchase = 3;
  var upsellMultiplier = 1.15;

  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }

  function compute() {
    var base = +baseEl.value;
    var cr = +crEl.value / 100;
    var touches = +touchesEl.value;
    var check = +checkEl.value;

    var convertedShare = 1 - Math.pow(1 - cr, touches);
    var buyers = base * convertedShare;
    var tickets = buyers * ticketsPerPurchase;
    var revenue = tickets * check * upsellMultiplier;

    document.getElementById('rm-base-out').textContent = fmt(base);
    document.getElementById('rm-cr-out').textContent = (+crEl.value).toFixed(1) + '%';
    document.getElementById('rm-touches-out').textContent = touches;
    document.getElementById('rm-check-out').textContent = fmt(check) + ' ₽';

    document.getElementById('rm-buyers').textContent = fmt(buyers);
    document.getElementById('rm-tickets').textContent = fmt(tickets);
    document.getElementById('rm-revenue').textContent = fmt(revenue / 1e6 * 10) / 10 + ' млн ₽';
    document.getElementById('rm-revenue').textContent = (revenue / 1e6).toFixed(1) + ' млн ₽';

    drawChart(tickets, revenue);
  }

  function drawChart(tickets, revenue) {
    var svg = document.getElementById('rm-chart');
    if (!svg) return;
    var maxRevenue = 40e6;
    var h = Math.max(6, Math.min(220, (revenue / maxRevenue) * 220));
    var barTickets = document.getElementById('bar-tickets');
    var barRevenue = document.getElementById('bar-revenue');
    var maxTickets = 12000;
    var ht = Math.max(6, Math.min(220, (tickets / maxTickets) * 220));
    if (barTickets) { barTickets.setAttribute('height', ht); barTickets.setAttribute('y', 240 - ht); }
    if (barRevenue) { barRevenue.setAttribute('height', h); barRevenue.setAttribute('y', 240 - h); }
    var lblT = document.getElementById('bar-tickets-label');
    var lblR = document.getElementById('bar-revenue-label');
    if (lblT) lblT.setAttribute('y', 240 - ht - 8);
    if (lblR) lblR.setAttribute('y', 240 - h - 8);
  }

  [baseEl, crEl, touchesEl, checkEl].forEach(function (el) {
    el.addEventListener('input', compute);
  });
  compute();
});
