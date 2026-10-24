/* =========================================================
   JUST FOR YOU — script
   EDIT HERE: timing + music volume
   ========================================================= */
(function () {
  'use strict';

  var CONFIG = {
    musicVolume: 0.7,        // 0 to 1
    musicFadeInMs: 2500,     // gentle fade-in when music starts
    twistPhotoDelayMs: 3200, // pause after "You." before the photo fades in
    twistPauseMs: 1600       // pause after tapping "Tap to find out"
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  var intro = $('intro'), story = $('story'), openBtn = $('openBtn');
  var music = $('music'), audio = $('bgm'), playBtn = $('playBtn'), muteBtn = $('muteBtn');
  var revealBtn = $('revealBtn'), after = $('after'), wait = $('wait');
  var opened = false, timers = [];

  /* ---------- 1. opening text, revealed line by line ---------- */
  var lines = Array.prototype.slice.call(intro.querySelectorAll('[data-t]'));
  function showLine(el) { el.classList.add('show'); }
  lines.forEach(function (el) {
    var t = reduce ? 0 : parseFloat(el.getAttribute('data-t')) * 1000;
    timers.push(setTimeout(function () { showLine(el); }, t));
  });
  // Tap anywhere on the opening screen (not the button) to skip the wait
  intro.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    timers.forEach(clearTimeout);
    lines.forEach(showLine);
  });

  /* ---------- 2. scroll reveals ---------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  }
  function watch(root) {
    var els = root.querySelectorAll('[data-r]');
    Array.prototype.forEach.call(els, function (el) {
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  /* ---------- 3. very light parallax on photo cards ---------- */
  var par = [], ticking = false;
  function parallax() {
    var vh = window.innerHeight;
    par.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-par'));
      el.style.setProperty('--py', off.toFixed(1) + 'px');
    });
    ticking = false;
  }
  if (!reduce) {
    par = Array.prototype.slice.call(document.querySelectorAll('[data-par]'));
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
  }

  /* ---------- 4. music ---------- */
  var audioOK = true;
  audio.addEventListener('error', function () { audioOK = false; music.hidden = true; });

  function startMusic() {
    if (!audioOK) return;
    audio.preload = 'auto';
    audio.volume = reduce ? CONFIG.musicVolume : 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () { music.classList.add('paused'); });
    if (!reduce) {
      var t0 = performance.now();
      (function fade(now) {
        var k = Math.min(1, (now - t0) / CONFIG.musicFadeInMs);
        audio.volume = CONFIG.musicVolume * k;
        if (k < 1) requestAnimationFrame(fade);
      })(t0);
    }
  }
  playBtn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().then(function () { music.classList.remove('paused'); }).catch(function () {});
    } else { audio.pause(); music.classList.add('paused'); }
    playBtn.setAttribute('aria-label', audio.paused ? 'Resume music' : 'Pause music');
  });
  muteBtn.addEventListener('click', function () {
    audio.muted = !audio.muted;
    music.classList.toggle('muted', audio.muted);
    muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute music' : 'Mute music');
  });
  // Pause when the tab/app is hidden, resume only if it was playing
  var wasPlaying = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { wasPlaying = !audio.paused; audio.pause(); }
    else if (wasPlaying) { audio.play().catch(function () {}); }
  });

  /* ---------- 5. "Open this →" ---------- */
  openBtn.addEventListener('click', function () {
    if (opened) return;
    opened = true;
    timers.forEach(clearTimeout);
    openBtn.classList.add('pressed');
    startMusic();                       // first user tap = allowed to play audio
    music.hidden = !audioOK;
    setTimeout(function () {
      story.classList.add('live');
      story.removeAttribute('aria-hidden');
      intro.classList.add('gone');
      window.scrollTo(0, 0);
      watch(story);
      setTimeout(function () { intro.style.display = 'none'; }, reduce ? 0 : 1300);
    }, reduce ? 0 : 450);
  });

  /* ---------- 6. "Tap to find out →" — the reveal ---------- */
  revealBtn.addEventListener('click', function () {
    if (!after.hidden) return;
    revealBtn.classList.add('pressed');
    wait.classList.add('hush');         // everything goes quiet for a moment
    setTimeout(function () {
      after.hidden = false;
      var you = $('youWord'), photo = $('youPhoto');
      document.getElementById('twist').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { you.classList.add('in'); }, reduce ? 0 : 900);
      // After a pause, the photo fades in beneath "You."
      setTimeout(function () {
        photo.classList.add('shown');
        requestAnimationFrame(function () { requestAnimationFrame(function () { photo.classList.add('in'); }); });
      }, reduce ? 0 : 900 + CONFIG.twistPhotoDelayMs);
      watch(after);
      par = par.concat(Array.prototype.slice.call(after.querySelectorAll('[data-par]')));
    }, reduce ? 0 : CONFIG.twistPauseMs);
  });
})();
