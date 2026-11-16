/* ========================================================================
   WOW THAILAND: opening intro, "Golden hour over the river"
   1. A gold horizon draws across a navy night sky (0 – 1.3 s).
   2. Gold-leaf flakes fly in and assemble a golden temple, tier by tier,
      with its reflection in the river below (0.4 – 2 s).
   3. WOW THAILAND appears in the site's Cinzel lettering; destinations drift
      along the horizon and gold dust rises (1.2 – 5 s).
   4. A band of golden light sweeps across and the site appears.
   A click or tap anywhere, Skip, Enter, Space or Escape enter at once.
   Only transform / opacity animate, so it stays smooth while React loads.
   ======================================================================== */
(function () {
  'use strict';

  var intro = document.getElementById('wow-intro');
  if (!intro) return;

  // ---- Settings ---------------------------------------------------------
  var PLAY_ONCE_PER_TAB = false;   // false = plays every time the home page is opened
  var AUTO_MS = 5200;              // full intro, from the first frame of animation
  var REDUCED_MS = 1800;           // calm version for "reduce motion" users
  var FONT_WAIT_MS = 1400;         // longest wait for the Cinzel font
  var MAX_WAIT_MS = 9000;          // never wait longer than this for the site
  var HOLD_MS = 0;                 // a click enters straight away
  var EXIT_MS = 1050;              // golden sweep + fade (matches the CSS)
  var DESTINATIONS = ['Bangkok', 'Phuket', 'Krabi', 'Pattaya', 'Chiang Mai', 'Koh Samui', 'Hua Hin'];
  var SEEN_KEY = 'wow_intro_seen';

  // The home page is "/" or "/hotels" without specific search params
  function isHomePage() {
    var path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/home' || path === '/index.html') return true;
    if (path === '/hotels') {
      var params = new URLSearchParams(window.location.search);
      return !params.get('hotel') && !params.get('id');
    }
    return false;
  }

  var root = document.documentElement;

  // Lets heavy page features (the chatbot avatar) wait until the intro leaves
  function announceReveal() {
    if (window.__wowIntroShowing !== true) return;
    window.__wowIntroShowing = false;
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        try { window.dispatchEvent(new Event('wow:intro-revealing')); } catch (e) { /* very old browser */ }
      }, 0);
    });
  }

  function removeIntro() {
    window.removeEventListener('keydown', onKey);
    root.classList.remove('wow-intro-lock');
    announceReveal();
    if (intro.parentNode) intro.parentNode.removeChild(intro);
  }

  if (!isHomePage()) {
    removeIntro();
    return;
  }

  if (PLAY_ONCE_PER_TAB) {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) { removeIntro(); return; }
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch (e) { /* storage blocked: proceed */ }
  }

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  var small = window.innerWidth < 640;

  root.classList.add('wow-intro-lock');
  intro.hidden = false;
  window.__wowIntroShowing = true;
  var openedAt = performance.now();
  window.requestAnimationFrame(function () { intro.classList.add('is-ready'); });

  var scene = intro.querySelector('.wow-intro__scene');
  var templeBox = intro.querySelector('.wow-intro__temple');
  var reflectionBox = intro.querySelector('.wow-intro__reflection');
  var glowEl = intro.querySelector('.wow-intro__glow');
  var ribbon = intro.querySelector('.wow-intro__ribbon');
  var flakesBox = intro.querySelector('.wow-intro__flakes');
  var dustBox = intro.querySelector('.wow-intro__dust');
  var starsBox = intro.querySelector('.wow-intro__stars');
  var caption = intro.querySelector('.wow-intro__caption');
  var skipBtn = intro.querySelector('.wow-intro__skip');

  function rand(min, max) { return min + Math.random() * (max - min); }

  // ---- The golden temple ------------------------------------------------
  // 240 × 300 box, standing on the horizon at y = 300. Each tier rises in turn.
  function poly(points, extra) {
    return '<polygon points="' + points + '" fill="url(#wt-gold)"' + (extra || '') + '/>' +
      '<polygon points="' + points + '" fill="url(#wt-side)"/>';
  }
  function band(x1, x2, y) {
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#8a560e" stroke-opacity="0.6" stroke-width="1"/>';
  }
  function arch(x, base, w, h) {
    var r = w / 2;
    return '<path d="M' + (x - r) + ' ' + base + ' v' + (-(h - r)) + ' q0 ' + (-r) + ' ' + r + ' ' + (-r) +
      ' q' + r + ' 0 ' + r + ' ' + r + ' v' + (h - r) + 'z" fill="#0b132b" fill-opacity="0.85"/>';
  }
  function tier(delay, content) {
    return '<g class="tier" style="--d:' + delay + 's">' + content + '</g>';
  }

  // Light catching the top edge of a tier
  function lit(x1, x2, y) {
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#fff6d5" stroke-opacity="0.7" stroke-width="0.8"/>';
  }

  // A slender Wat Arun-style prang: stacked tiers narrowing into a tall spire,
  // flanked by two smaller prangs on the platform
  function templeTiers() {
    return (
      tier(0.45,
        '<rect x="18" y="288" width="204" height="12" rx="1.5" fill="url(#wt-gold)"/>' +
        '<rect x="32" y="278" width="176" height="10" rx="1" fill="url(#wt-gold)"/>' +
        lit(32, 208, 278.5) + band(18, 222, 294)) +
      tier(0.6,
        poly('42,278 62,278 60,250 44,250') + poly('44,250 60,250 57,226 47,226') + poly('47,226 57,226 52,184') +
        poly('178,278 198,278 196,250 180,250') + poly('180,250 196,250 193,226 183,226') + poly('183,226 193,226 188,184') +
        lit(44, 60, 250.5) + lit(180, 196, 250.5) + band(43, 61, 264) + band(179, 197, 264) +
        arch(52, 276, 6, 11) + arch(188, 276, 6, 11)) +
      tier(0.72,
        poly('66,278 174,278 167,252 73,252') + lit(73, 167, 252.5) + band(69, 171, 266) +
        arch(86, 277, 7, 12) + arch(102, 277, 7, 12) + arch(138, 277, 7, 12) + arch(154, 277, 7, 12) +
        arch(120, 278, 12, 21)) +
      tier(0.84,
        poly('77,252 163,252 157,228 83,228') + lit(83, 157, 228.5) + band(80, 160, 240) +
        arch(104, 250, 6, 11) + arch(120, 250, 7, 13) + arch(136, 250, 6, 11)) +
      tier(0.95,
        poly('87,228 153,228 148,206 92,206') + lit(92, 148, 206.5) + band(90, 150, 217) + arch(120, 226, 6, 11)) +
      tier(1.05, poly('95,206 145,206 141,186 99,186') + lit(99, 141, 186.5) + band(97, 143, 196)) +
      tier(1.15, poly('101,186 139,186 135,164 105,164') + lit(105, 135, 164.5) + band(103, 137, 175)) +
      tier(1.25, poly('106,164 134,164 131,142 109,142') + lit(109, 131, 142.5) + band(108, 132, 153)) +
      tier(1.35, poly('110,142 130,142 128,122 112,122') + lit(112, 128, 122.5) + band(111, 129, 132)) +
      tier(1.45,
        poly('113,122 127,122 120,56') +
        band(115, 125, 110) + band(116, 124, 98) + band(117, 123, 86) + band(118, 122, 74)) +
      tier(1.58,
        '<line x1="120" y1="58" x2="120" y2="28" stroke="url(#wt-gold)" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="120" cy="26" r="2.4" fill="#fff0b3"/>')
    );
  }

  function templeSvg() {
    return '<svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="wt-gold" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#fff0b3"/><stop offset="0.35" stop-color="#f5c518"/>' +
          '<stop offset="0.72" stop-color="#e5a826"/><stop offset="1" stop-color="#a86a12"/></linearGradient>' +
        '<linearGradient id="wt-side" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#3b2205" stop-opacity="0.35"/><stop offset="0.38" stop-color="#3b2205" stop-opacity="0"/>' +
          '<stop offset="0.62" stop-color="#3b2205" stop-opacity="0"/><stop offset="1" stop-color="#3b2205" stop-opacity="0.4"/></linearGradient>' +
        '<radialGradient id="wt-halo" cx="50%" cy="50%" r="50%">' +
          '<stop offset="0" stop-color="#ffe9a3" stop-opacity="0.34"/><stop offset="0.35" stop-color="#ffd76a" stop-opacity="0.12"/>' +
          '<stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="wt-sheen" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.75"/>' +
          '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<clipPath id="wt-shape"><polygon points="18,300 222,300 222,288 208,278 174,278 167,252 163,252 157,228 153,228 148,206 145,206 141,186 139,186 135,164 134,164 131,142 130,142 128,122 127,122 120,56 113,122 112,122 110,142 109,142 106,164 105,164 101,186 99,186 95,206 92,206 87,228 83,228 77,252 73,252 66,278 32,278 18,288"/></clipPath>' +
      '</defs>' +
      '<ellipse class="halo" cx="120" cy="70" rx="118" ry="104" fill="url(#wt-halo)"/>' +
      templeTiers() +
      '<g clip-path="url(#wt-shape)"><rect class="sheen" x="-40" y="0" width="70" height="300" fill="url(#wt-sheen)" transform="skewX(-18)"/></g>' +
      '</svg>';
  }

  if (templeBox) templeBox.innerHTML = templeSvg();
  if (reflectionBox) {
    // Same tiers, flipped by CSS; uses the gradients defined in the temple above
    reflectionBox.innerHTML = '<svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      templeTiers() + '</svg>';
  }

  // ---- Destinations drifting along the horizon (two copies = seamless loop) ----
  if (ribbon) {
    var row = DESTINATIONS.map(function (d) { return '<span>' + d + '</span><b>✦</b>'; }).join('');
    ribbon.innerHTML = '<div class="wow-intro__ribbon-track">' + row + row + '</div>';
  }

  // ---- Stars and rising gold dust ---------------------------------------
  if (!reduced && starsBox) {
    var starFrag = document.createDocumentFragment();
    for (var s = 0; s < (small ? 36 : 70); s++) {
      var star = document.createElement('span');
      star.className = 'wow-intro__star';
      var size = rand(1, 2.4).toFixed(1) + 'px';
      star.style.cssText = 'left:' + rand(2, 98).toFixed(1) + '%;top:' + rand(4, 96).toFixed(1) + '%;width:' + size +
        ';height:' + size + ';--dur:' + rand(2, 5).toFixed(1) + 's;--delay:' + (-rand(0, 5)).toFixed(1) +
        's;--max:' + rand(0.3, 0.9).toFixed(2);
      starFrag.appendChild(star);
    }
    starsBox.appendChild(starFrag);
  }

  if (!reduced && dustBox) {
    var dustFrag = document.createDocumentFragment();
    for (var m = 0; m < (small ? 12 : 22); m++) {
      var mote = document.createElement('span');
      mote.className = 'wow-intro__mote';
      var ms = rand(1, 2.4).toFixed(1) + 'px';
      mote.style.cssText = 'left:' + rand(28, 72).toFixed(1) + '%;width:' + ms + ';height:' + ms +
        ';--dx:' + rand(-50, 50).toFixed(0) + 'px;--dur:' + rand(3.8, 6.5).toFixed(1) + 's;--delay:' + rand(1.8, 4.2).toFixed(2) + 's';
      dustFrag.appendChild(mote);
    }
    dustBox.appendChild(dustFrag);
  }

  // ---- Gold-leaf flakes fly in and become the temple -----------------------
  function launchFlakes() {
    if (!flakesBox || !scene || typeof flakesBox.animate !== 'function') return;
    var h = scene.clientHeight || 300;
    var w = h * 0.8;
    var count = small ? 16 : 30;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('span');
      el.className = 'wow-intro__flake';
      var fw = rand(3, 7) * h / 360;
      var fh = rand(2, 5) * h / 360;
      el.style.width = fw.toFixed(1) + 'px';
      el.style.height = fh.toFixed(1) + 'px';
      el.style.clipPath = Math.random() < 0.5
        ? 'polygon(0 30%, 60% 0, 100% 70%, 30% 100%)'
        : 'polygon(10% 0, 100% 20%, 80% 100%, 0 70%)';
      flakesBox.appendChild(el);

      // Land somewhere on the temple: narrower towards the top
      var ty = rand(-0.45, 0.42) * h;
      var spread = (0.5 - (0.45 - ty / h) * 0.55) * w;
      var tx = rand(-0.5, 0.5) * Math.max(spread, w * 0.08);
      var a = rand(0, Math.PI * 2);
      var r = rand(0.9, 1.7) * h;
      var sx = Math.cos(a) * r * 1.4;
      var sy = Math.sin(a) * r * 0.8;
      var rot = rand(-540, 540);
      var anim = el.animate([
        { transform: 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) rotate(' + rot.toFixed(0) + 'deg) scale(1)', opacity: 0 },
        { offset: 0.18, opacity: 1 },
        { offset: 0.82, transform: 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(0deg) scale(0.7)', opacity: 0.95 },
        { transform: 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(0deg) scale(0.2)', opacity: 0 }
      ], {
        duration: rand(1300, 1900),
        delay: rand(0, 650),
        easing: 'cubic-bezier(0.3, 0.6, 0.2, 1)',
        fill: 'both'
      });
      anim.onfinish = (function (node) { return function () { if (node.parentNode) node.parentNode.removeChild(node); }; })(el);
    }
  }

  // ---- Soft chime when the visitor chooses to enter -----------------------
  var audioCtx = null;
  function playChime() {
    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (audioCtx.state !== 'running') return;
      var now = audioCtx.currentTime;
      [528, 660, 792, 1056].forEach(function (freq, index) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.05);
        gain.gain.setValueAtTime(0.001, now + index * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.035 / (index + 1), now + index * 0.05 + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.05 + 1.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + index * 0.05);
        osc.stop(now + index * 0.05 + 1.6);
      });
    } catch (err) { /* sound is optional */ }
  }

  // ---- Gentle pointer parallax --------------------------------------------
  var pendingPointer = null;
  var pointerFrame = 0;
  function applyPointer() {
    pointerFrame = 0;
    var e = pendingPointer;
    if (!e) return;
    var mx = (e.clientX / window.innerWidth) * 2 - 1;
    var my = (e.clientY / window.innerHeight) * 2 - 1;
    // Layers move by different amounts for a gentle sense of depth
    if (starsBox) starsBox.style.transform = 'translate3d(' + (mx * 14).toFixed(1) + 'px,' + (my * 9).toFixed(1) + 'px,0)';
    if (glowEl) glowEl.style.translate = (mx * 10).toFixed(1) + 'px ' + (my * 4).toFixed(1) + 'px';
    if (templeBox) templeBox.style.transform = 'translate3d(' + (mx * -6).toFixed(1) + 'px,' + (my * -3).toFixed(1) + 'px,0)';
    if (reflectionBox) reflectionBox.style.translate = (mx * -6).toFixed(1) + 'px 0';
  }
  if (!reduced) {
    intro.addEventListener('pointermove', function (e) {
      pendingPointer = e;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointer);
    });
  }

  // ---- Leaving the intro --------------------------------------------------
  var exiting = false;
  var entering = false;
  var revealTimer = 0;

  function siteIsReady() {
    var rootEl = document.getElementById('root');
    return (rootEl && rootEl.children && rootEl.children.length > 0) ||
      !!document.querySelector('#root header') ||
      !!document.querySelector('#root nav');
  }

  // Remove the intro once it has fully faded (not part-way through)
  function removeAfterFade() {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      removeIntro();
    }
    intro.addEventListener('transitionend', function (e) {
      if (e.target === intro && e.propertyName === 'opacity') finish();
    });
    window.setTimeout(finish, EXIT_MS + 300); // safety net
  }

  function reveal() {
    if (exiting) return;
    exiting = true;
    window.clearTimeout(revealTimer);
    window.removeEventListener('keydown', onKey);
    // Scroll bar comes back while the intro still covers the page (no sideways jump later)
    root.classList.remove('wow-intro-lock');
    intro.classList.add('is-exiting');
    announceReveal();
    removeAfterFade();
  }

  function revealWhenSiteReady() {
    if (exiting) return;
    if (siteIsReady() || performance.now() - openedAt > MAX_WAIT_MS) {
      reveal();
    } else {
      window.setTimeout(revealWhenSiteReady, 50);
    }
  }

  // Visitor chose to enter (hold finished, Skip, or a key)
  function enter() {
    if (exiting || entering) return;
    entering = true;
    intro.classList.add('is-entering');
    if (!siteIsReady() && caption) caption.textContent = 'Opening WOW THAILAND…';
    revealWhenSiteReady();
    // Sound starts after this frame is painted, so it never delays the visuals
    window.requestAnimationFrame(function () { window.setTimeout(playChime, 0); });
  }

  // A click or tap anywhere on the intro enters the site
  function startHold(e) {
    if (exiting || entering || intro.classList.contains('is-holding')) return;
    if (e && e.target && e.target.closest && e.target.closest('.wow-intro__skip')) return;
    intro.classList.add('is-holding');
    window.setTimeout(enter, reduced ? 0 : HOLD_MS);
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enter();
    }
  }

  intro.addEventListener('pointerdown', startHold);
  if (skipBtn) {
    skipBtn.addEventListener('click', function (e) { e.stopPropagation(); enter(); });
  }
  window.addEventListener('keydown', onKey);

  // ---- Timeline (starts once the display font is ready) --------------------
  var started = false;
  function start() {
    if (started || exiting || entering) return;
    started = true;
    var total = reduced ? REDUCED_MS : AUTO_MS;
    intro.style.setProperty('--total', total + 'ms'); // bottom progress line
    intro.classList.add('is-playing');
    if (!reduced) launchFlakes();
    revealTimer = window.setTimeout(revealWhenSiteReady, total);
  }

  try {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('800 1em Cinzel').then(start, start);
    } else {
      start();
    }
  } catch (e) {
    start();
  }
  window.setTimeout(start, FONT_WAIT_MS);
})();
