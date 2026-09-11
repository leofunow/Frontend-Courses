// Слайды урока. S — заметки ментора, F — полный экран, O — обзор всех слайдов, Esc — назад к тексту урока.
// PDF: добавить к адресу ?print-pdf и напечатать в Chrome «Сохранить как PDF».
(function () {
  // шаги схем (data-step) превращаем во фрагменты: появляются по щелчку
  document.querySelectorAll('.slide-steps [data-step]').forEach(function (el) {
    el.classList.add('fragment');
    el.setAttribute('data-fragment-index', el.getAttribute('data-step'));
  });
  if (/print-pdf/.test(location.search)) document.documentElement.classList.add('print-pdf');
  // ?preview — режим превью в сценарии: без кнопок, все шаги схем видны сразу
  var preview = /preview/.test(location.search);
  if (preview) document.documentElement.classList.add('slides-preview');
  // Esc: закрыть обзор слайдов, а если он не открыт — вернуться к тексту урока.
  // В полноэкранном режиме первый Esc забирает браузер: он выходит из полного экрана
  var back = document.querySelector('.back');
  var onEsc = function () {
    if (Reveal.isOverview()) Reveal.toggleOverview(false);
    else if (back) location.href = back.href;
  };
  Reveal.initialize({
    controls: !preview,
    progress: !preview,
    keyboard: preview ? false : { 27: onEsc },
    // на узком экране reveal сам включает режим прокрутки, и переход по номеру слайда в нём не работает.
    // Превью в сценарии узкое — там этот режим выключен
    scrollActivationWidth: preview ? null : 435,
    fragments: !preview,
    hash: true,
    width: 1280,
    height: 720,
    margin: 0.06,
    center: false,
    slideNumber: preview ? false : 'c/t',
    transition: 'fade',
    transitionSpeed: 'fast',
    plugins: [RevealNotes],
  });

  // Синхронизация со сценарием: вкладка scripts/<урок>.html сама переключается на текущий слайд.
  // BroadcastChannel работает на localhost, событие storage — ещё и при открытии файлов напрямую.
  if (preview) return;
  var lesson = location.pathname.split('/').pop().replace(/\.html$/, '');
  var channel = 'BroadcastChannel' in window ? new BroadcastChannel('course-slides') : null;
  var send = function () {
    var msg = { lesson: lesson, i: Reveal.getIndices().h, t: Date.now() };
    if (channel) channel.postMessage(msg);
    try { localStorage.setItem('course-slides', JSON.stringify(msg)); } catch (e) { /* хранилище недоступно */ }
  };
  Reveal.on('ready', send);
  Reveal.on('slidechanged', send);
})();
