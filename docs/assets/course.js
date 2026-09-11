// Интерактив сайта курса. Классический скрипт: работает и через file://
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- хранилище ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('fe:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('fe:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- мобильное меню ----------
  var menuBtn = $('.menu-btn'), sidebar = $('#sidebar');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = sidebar.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuBtn) {
        sidebar.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
  var cur = $('.sidebar [aria-current="page"]');
  if (cur) cur.scrollIntoView({ block: 'center' });

  // ---------- прогресс ----------
  function paintProgress() {
    var done = store.get('done', []);
    $$('[data-lesson]').forEach(function (el) { el.classList.toggle('is-done', done.indexOf(el.dataset.lesson) >= 0); });
    var all = $$('.home-link[data-lesson]');
    var cnt = $('[data-progress]');
    if (cnt) cnt.textContent = 'Пройдено ' + done.length + ' из ' + all.length;
    var bar = $('[data-progress-bar]');
    if (bar) bar.style.width = (all.length ? Math.round(done.length / all.length * 100) : 0) + '%';
    var cont = $('[data-continue]');
    if (cont && done.length) {
      var next = all.filter(function (a) { return done.indexOf(a.dataset.lesson) < 0; })[0];
      if (next) { cont.href = next.getAttribute('href'); cont.textContent = 'Продолжить: урок ' + next.querySelector('.home-n').textContent; }
    }
    $$('.done-btn').forEach(function (b) {
      var d = done.indexOf(b.dataset.done) >= 0;
      b.classList.toggle('is-done', d);
      b.classList.toggle('btn-primary', !d);
      b.querySelector('span').textContent = d ? 'Урок пройден' : 'Отметить урок пройденным';
    });
  }
  $$('.done-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = store.get('done', []), i = done.indexOf(b.dataset.done);
      if (i >= 0) done.splice(i, 1); else done.push(b.dataset.done);
      store.set('done', done); paintProgress();
    });
  });
  paintProgress();

  // ---------- оглавление: подсветка текущего раздела ----------
  var tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var targets = tocLinks.map(function (a) { return document.getElementById(decodeURIComponent(a.hash.slice(1))); }).filter(Boolean);
    var io = new IntersectionObserver(function () {
      var top = targets.filter(function (t) { return t.getBoundingClientRect().top < 140; }).pop() || targets[0];
      tocLinks.forEach(function (a) { a.classList.toggle('active', decodeURIComponent(a.hash.slice(1)) === top.id); });
    }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    targets.forEach(function (t) { io.observe(t); });
  }

  // ---------- копирование кода ----------
  $$('figure.code').forEach(function (fig) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = 'Копировать';
    btn.addEventListener('click', function () {
      var text = fig.querySelector('pre').innerText;
      var ok = function () { btn.textContent = 'Скопировано'; setTimeout(function () { btn.textContent = 'Копировать'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); ok(); }
    });
    fig.querySelector('figcaption').appendChild(btn);
  });

  // ---------- глоссарий ----------
  var pop = null;
  function hidePop() { if (pop) { pop.remove(); pop = null; } }
  function showPop(el) {
    hidePop();
    var g = (window.GLOSSARY || {})[el.dataset.term]; if (!g) return;
    pop = document.createElement('div');
    pop.className = 'term-pop'; pop.setAttribute('role', 'tooltip');
    pop.innerHTML = '<b>' + g.t + (g.en ? ' <span class="en">' + g.en + '</span>' : '') + '</b>' + g.d;
    document.body.appendChild(pop);
    var r = el.getBoundingClientRect();
    var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 12);
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = (window.scrollY + r.bottom + 8) + 'px';
  }
  $$('.term').forEach(function (el) {
    el.addEventListener('mouseenter', function () { showPop(el); });
    el.addEventListener('mouseleave', hidePop);
    el.addEventListener('focus', function () { showPop(el); });
    el.addEventListener('blur', hidePop);
    el.addEventListener('click', function (e) { e.stopPropagation(); pop ? hidePop() : showPop(el); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pop ? hidePop() : showPop(el); } });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePop(); });

  // ---------- пошаговые схемы ----------
  $$('figure.steps').forEach(function (fig) {
    var total = Number(fig.dataset.total), step = 1;
    var caps = $$('.step-captions li', fig), els = $$('[data-step]', fig);
    var prev = $('[data-dir="-1"]', fig), next = $('[data-dir="1"]', fig), count = $('.step-count', fig), nextLabel = $('span', next);
    fig.classList.add('js-ready');
    function paint() {
      els.forEach(function (el) {
        var s = Number(el.dataset.step);
        el.classList.toggle('shown', s <= step);
        el.classList.toggle('now', s === step);
      });
      caps.forEach(function (li, i) { li.classList.toggle('now', i + 1 === step); });
      count.textContent = 'Шаг ' + step + ' из ' + total;
      prev.disabled = step === 1;
      nextLabel.textContent = step === total ? 'Сначала' : 'Дальше';
    }
    prev.addEventListener('click', function () { if (step > 1) { step--; paint(); } });
    next.addEventListener('click', function () { step = step === total ? 1 : step + 1; paint(); });
    paint();
  });

  // ---------- схемы: подстройка под ширину ----------
  // Если блокам в ряду тесно (уже MIN_NODE), сначала подписи рядов уходят наверх,
  // и только если и этого мало — ряд становится колонкой.
  var MIN_NODE = 120;
  function isNarrow(flow) {
    return Array.prototype.some.call(flow.children, function (c) {
      return !c.classList.contains('dg-arrow') && c.getBoundingClientRect().width < MIN_NODE;
    });
  }
  function layoutDiagram(dg) {
    var flows = $$('.dg-flow', dg);
    dg.classList.remove('stacked');
    flows.forEach(function (f) { f.classList.remove('vertical'); });
    if ($('.dg-row', dg) && flows.some(isNarrow)) dg.classList.add('stacked');
    flows.forEach(function (f) { f.classList.toggle('vertical', isNarrow(f)); });
  }
  var diagrams = $$('.dg');
  diagrams.forEach(layoutDiagram);
  if ('ResizeObserver' in window) {
    var lastW = new WeakMap();
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        var w = Math.round(e.contentRect.width);
        if (lastW.get(e.target) === w) return;
        lastW.set(e.target, w);
        layoutDiagram(e.target);
      });
    });
    diagrams.forEach(function (d) { ro.observe(d); });
  }

  // ---------- сценарий к слайдам: текущий раздел ↔ слайд справа ----------
  var cards = $$('.script-card');
  if (cards.length) {
    var frameEl = $('.script-preview iframe'), currentLabel = $('[data-current]');
    var base = frameEl ? frameEl.getAttribute('src').split('#')[0] : '';
    var current = -1;
    var setCurrent = function (i) {
      if (i === current || i < 0 || i >= cards.length) return;
      current = i;
      cards.forEach(function (c, k) { c.classList.toggle('is-current', k === i); });
      if (frameEl) frameEl.src = base + '#/' + cards[i].dataset.slide;
      if (currentLabel) currentLabel.textContent = i + 1;
    };
    // при прокрутке текущим становится раздел, дошедший до верха экрана;
    // после перехода клавишей или щелчком прокрутка какое-то время не меняет выбор
    var lockUntil = 0;
    var go = function (i) { setCurrent(i); lockUntil = Date.now() + 900; cards[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    var pick = function () {
      if (Date.now() < lockUntil) return;
      var line = 56 + 80, best = 0;
      cards.forEach(function (c, k) { if (c.getBoundingClientRect().top < line) best = k; });
      setCurrent(best);
    };
    window.addEventListener('scroll', function () { window.requestAnimationFrame(pick); }, { passive: true });
    cards.forEach(function (c, k) {
      $('.script-card-head', c).addEventListener('click', function (e) { if (!e.target.closest('a')) go(k); });
    });
    document.addEventListener('keydown', function (e) {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey) return;
      var d = e.key === 'ArrowDown' || e.key === 'j' ? 1 : e.key === 'ArrowUp' || e.key === 'k' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      go(Math.max(0, Math.min(cards.length - 1, current + d)));
    });
    var start = /^#slide-(\d+)$/.exec(location.hash);
    setCurrent(start ? Number(start[1]) - 1 : 0);

    // слайды в соседней вкладке сообщают номер — переходим к нужному разделу
    var lesson = location.pathname.split('/').pop().replace(/\.html$/, '');
    var lastT = 0;
    var follow = function (msg) {
      if (!msg || msg.lesson !== lesson || msg.t <= lastT) return;
      lastT = msg.t;
      if (msg.i !== current) go(Math.min(msg.i, cards.length - 1));
    };
    var read = function (raw) { try { return JSON.parse(raw); } catch (e) { return null; } };
    if ('BroadcastChannel' in window) new BroadcastChannel('course-slides').onmessage = function (e) { follow(e.data); };
    window.addEventListener('storage', function (e) { if (e.key === 'course-slides') follow(read(e.newValue)); });
    // в фоновой вкладке прокрутка не срабатывает — докручиваем, когда вкладку открыли
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && current >= 0) { lockUntil = Date.now() + 900; cards[current].scrollIntoView({ block: 'start' }); }
    });
    // слайды уже открыты — сразу встаём на их текущий слайд (если их листали в последние 3 часа)
    if (!start) {
      var saved = null;
      try { saved = read(localStorage.getItem('course-slides')); } catch (e) { /* хранилище недоступно */ }
      if (saved && Date.now() - saved.t < 3 * 3600e3) follow(saved);
    }
  }

  // ---------- песочницы ----------
  var CONSOLE_HOOK = '<script>(function(){function s(t,a){try{parent.postMessage({sb:"console",t:t,a:[].map.call(a,function(x){if(x instanceof Error)return String(x);if(typeof x==="object"&&x!==null){try{return JSON.stringify(x)}catch(e){return String(x)}}return String(x)})},"*")}catch(e){}}' +
    '["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);o.apply(console,arguments)}});' +
    'window.addEventListener("error",function(e){s("error",[e.message+(e.lineno?" (строка "+e.lineno+")":"")])});})();<\/script>';
  var sbId = 0;
  $$('.sandbox').forEach(function (sb) {
    var id = 'sb' + (sbId++);
    var codes = $$('.sb-code', sb), tabs = $$('.sb-tab', sb), frame = $('iframe', sb), out = $('.sb-lines', sb);
    var initial = codes.map(function (c) { return c.value; });
    frame.name = id;
    function get(lang) { var c = codes.filter(function (x) { return x.dataset.lang === lang; })[0]; return c ? c.value : ''; }
    function run() {
      if (out) out.innerHTML = '';
      var html = get('html'), css = get('css'), js = get('js');
      frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><base target="_blank">' + CONSOLE_HOOK +
        '<style>body{font:16px/1.5 -apple-system,"Segoe UI",sans-serif;margin:12px;color:#1f2328}' + css + '</style></head><body>' + html +
        (js ? '<script>' + js.replace(/<\/script>/g, '<\\/script>') + '<\/script>' : '') + '</body></html>';
    }
    var timer;
    codes.forEach(function (c) {
      c.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 350); });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          var s = c.selectionStart; c.setRangeText('  ', s, c.selectionEnd, 'end');
          c.dispatchEvent(new Event('input'));
        }
      });
    });
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.setAttribute('aria-selected', x === t); });
        codes.forEach(function (c) { c.hidden = c.dataset.lang !== t.dataset.lang; });
      });
    });
    $('.sb-reset', sb).addEventListener('click', function () { codes.forEach(function (c, i) { c.value = initial[i]; }); run(); });
    window.addEventListener('message', function (e) {
      if (!out || !e.data || e.data.sb !== 'console' || e.source !== frame.contentWindow) return;
      var line = document.createElement('div');
      line.className = e.data.t === 'error' ? 'err' : e.data.t === 'warn' ? 'warn' : '';
      line.textContent = e.data.a.join(' ');
      out.appendChild(line); out.scrollTop = out.scrollHeight;
    });
    run();
  });

  // ---------- квизы ----------
  $$('.quiz').forEach(function (quiz) {
    var key = 'quiz:' + quiz.dataset.quiz;
    var qs = $$('.q', quiz), score = $('.quiz-score', quiz);
    var saved = store.get(key, {});
    function answer(q, qi, i, save) {
      var right = Number(q.dataset.answer);
      $$('.opt', q).forEach(function (o, oi) {
        o.disabled = true;
        if (oi === right) o.classList.add('right');
        else if (oi === i) o.classList.add('wrong');
      });
      $('.why', q).hidden = false;
      if (save) { saved[qi] = i; store.set(key, saved); }
      paint();
    }
    function paint() {
      var n = Object.keys(saved).length, ok = 0;
      qs.forEach(function (q, qi) { if (saved[qi] === Number(q.dataset.answer)) ok++; });
      score.textContent = n < qs.length ? 'Отвечено ' + n + ' из ' + qs.length : 'Результат: ' + ok + ' из ' + qs.length + (ok === qs.length ? '. Отлично!' : '. Перечитайте разделы, где ошиблись.');
    }
    qs.forEach(function (q, qi) {
      $$('.opt', q).forEach(function (o, oi) { o.addEventListener('click', function () { answer(q, qi, oi, true); }); });
      if (saved[qi] != null) answer(q, qi, saved[qi], false);
    });
    $('.quiz-reset', quiz).addEventListener('click', function () {
      saved = {}; store.set(key, saved);
      qs.forEach(function (q) { $$('.opt', q).forEach(function (o) { o.disabled = false; o.classList.remove('right', 'wrong'); }); $('.why', q).hidden = true; });
      paint();
    });
    paint();
  });

  // ---------- картинки урока: щелчок — увеличить поверх страницы, ⌘+щелчок — как обычная ссылка ----------
  var zoomDialog = null;
  document.addEventListener('click', function (e) {
    var link = e.target.closest('figure.shot > a');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (!zoomDialog) {
      zoomDialog = document.createElement('dialog');
      zoomDialog.className = 'img-zoom';
      zoomDialog.innerHTML = '<img alt="">';
      zoomDialog.addEventListener('click', function () { zoomDialog.close(); });
      document.body.appendChild(zoomDialog);
    }
    var img = $('img', zoomDialog), src = $('img', link);
    img.src = link.getAttribute('href'); img.alt = src ? src.alt : '';
    zoomDialog.showModal();
  });

  // ---------- чек-листы ----------
  var page = ($('[data-lesson-page]') || {}).dataset;
  var checksKey = 'checks:' + (page ? page.lessonPage : location.pathname.split('/').pop());
  var checks = store.get(checksKey, {});
  $$('.task-list-item-checkbox').forEach(function (cb, i) {
    cb.checked = !!checks[i];
    cb.closest('li').classList.toggle('checked', cb.checked);
    cb.addEventListener('change', function () {
      checks[i] = cb.checked; store.set(checksKey, checks);
      cb.closest('li').classList.toggle('checked', cb.checked);
    });
  });

  // ---------- поиск ----------
  var search = $('.search-overlay'), input = search && $('input', search), results = search && $('.search-results', search);
  var index = window.SEARCH_INDEX || [], rel = window.REL || '';
  function openSearch() { search.hidden = false; input.value = ''; results.innerHTML = ''; input.focus(); }
  function closeSearch() { search.hidden = true; }
  $$('[data-search]').forEach(function (b) { b.addEventListener('click', openSearch); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape' && search && !search.hidden) closeSearch();
  });
  if (search) {
    search.addEventListener('click', function (e) { if (e.target === search) closeSearch(); });
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.innerHTML = ''; return; }
      var found = [];
      index.forEach(function (p) {
        if (p.t.toLowerCase().indexOf(q) >= 0) found.push({ t: p.t, u: p.u, s: '' });
        p.h.forEach(function (h) { if (h[0].toLowerCase().indexOf(q) >= 0) found.push({ t: h[0], u: p.u + '#' + h[1], s: p.t }); });
        var at = p.x.toLowerCase().indexOf(q);
        if (at >= 0 && !found.some(function (f) { return f.u.indexOf(p.u) === 0; })) found.push({ t: p.t, u: p.u, s: '…' + p.x.slice(Math.max(0, at - 40), at + 60) + '…' });
      });
      results.innerHTML = found.slice(0, 12).map(function (f) {
        return '<li><a href="' + rel + f.u + '">' + f.t.replace(/</g, '&lt;') + (f.s ? '<small>' + f.s.replace(/</g, '&lt;') + '</small>' : '') + '</a></li>';
      }).join('') || '<li class="empty">Ничего не нашлось. Попробуйте другое слово.</li>';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var a = $('a', results); if (a) location.href = a.href; }
    });
  }
})();
