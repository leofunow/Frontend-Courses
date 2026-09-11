// Рабочая тетрадь: ответы на задания, отчёт для ментора, комментарии к слайдам.
// Классический скрипт без зависимостей: работает и через file://.
//
// Где хранится:
//   ответы (текст, таблицы, картинки) — IndexedDB «frontend-course», хранилище «answers».
//     Ключ — «урок/задание-поле», например «01-intro/2-1». Картинки лежат как Blob.
//   комментарии к слайдам — localStorage, ключ «fe:review:урок».
// IndexedDB и localStorage переживают перезапуск браузера. Браузер может удалить их, только если
// кончится место на диске, поэтому при первой записи просим navigator.storage.persist().
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- IndexedDB ----------
  var dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB недоступна')); return; }
      var req = indexedDB.open('frontend-course', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('answers'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('answers', mode), st = t.objectStore('answers');
        var out = fn(st);
        t.oncomplete = function () { resolve(out && 'result' in out ? out.result : out); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }
  var persistAsked = false;
  var db = {
    get: function (k) { return tx('readonly', function (st) { return st.get(k); }); },
    set: function (k, v) {
      if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(function () {}); }
      return tx('readwrite', function (st) { st.put(v, k); });
    },
    del: function (k) { return tx('readwrite', function (st) { st.delete(k); }); },
    // все пары ключ-значение с префиксом
    list: function (prefix) {
      return openDb().then(function (d) {
        return new Promise(function (resolve, reject) {
          var out = [], range = IDBKeyRange.bound(prefix, prefix + '￿');
          var req = d.transaction('answers', 'readonly').objectStore('answers').openCursor(range);
          req.onsuccess = function () { var c = req.result; if (c) { out.push([c.key, c.value]); c.continue(); } else resolve(out); };
          req.onerror = function () { reject(req.error); };
        });
      });
    },
    clear: function (prefix) {
      return db.list(prefix).then(function (items) { return tx('readwrite', function (st) { items.forEach(function (kv) { st.delete(kv[0]); }); }); });
    }
  };

  // ---------- ZIP без сжатия (метод «store») ----------
  // Формат: локальный заголовок + данные для каждого файла, затем центральный каталог и его конец.
  // Имена помечены как UTF-8 (флаг 0x0800), но отчёт всё равно использует латиницу — см. buildReport.
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) { var c = 0xFFFFFFFF; for (var i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function toBytes(data) {
    if (typeof data === 'string') return Promise.resolve(new TextEncoder().encode(data));
    return data.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  // files: [{ name: 'папка/файл.md', data: строка или Blob }] → Promise<Blob>
  function makeZip(files) {
    return Promise.all(files.map(function (f) { return toBytes(f.data); })).then(function (datas) {
      var parts = [], central = [], offset = 0;
      var now = new Date();
      var time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
      var date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
      files.forEach(function (f, i) {
        var name = new TextEncoder().encode(f.name), data = datas[i], crc = crc32(data);
        var local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
        local.setUint16(8, 0, true); local.setUint16(10, time, true); local.setUint16(12, date, true);
        local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
        local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
        parts.push(local.buffer, name, data);
        var cen = new DataView(new ArrayBuffer(46));
        cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
        cen.setUint16(10, 0, true); cen.setUint16(12, time, true); cen.setUint16(14, date, true);
        cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
        cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
        central.push(cen.buffer, name);
        offset += 30 + name.length + data.length;
      });
      var cenSize = central.reduce(function (a, p) { return a + (p.byteLength || p.length); }, 0);
      var end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
      end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
      return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
    });
  }

  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
  }
  function debounce(fn, ms) { var t; return function () { var args = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, args); }, ms); }; }

  // Скриншоты бывают по 5 МБ. Уменьшаем до 1920px по длинной стороне и сохраняем в WebP (или PNG, если браузер не умеет WebP)
  function shrinkImage(file) {
    if (!window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (resolve) { c.toBlob(function (b) { resolve(b || file); }, 'image/webp', 0.85); });
    }).catch(function () { return file; });
  }
  var ext = function (type) { return ({ 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' })[type] || 'png'; };

  // ---------- поля ответов ----------
  var page = $('[data-lesson-page]');
  var lesson = page && page.dataset.lessonPage;
  var answers = $$('.answer');
  var viewer = null;

  function setState(field, text) {
    var s = $('.answer-state', field);
    if (!s) return;
    s.textContent = text;
    clearTimeout(s._t);
    if (text === 'Сохранено') s._t = setTimeout(function () { s.textContent = ''; }, 1500);
  }
  function keyOf(field) { return lesson + '/' + field.dataset.answer; }

  function openViewer(blob, alt) {
    if (!viewer) {
      viewer = document.createElement('dialog');
      viewer.className = 'answer-viewer';
      viewer.innerHTML = '<form method="dialog"><button class="btn btn-sm" aria-label="Закрыть">Закрыть</button></form><img alt="">';
      viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.close(); });
      viewer.addEventListener('close', function () { URL.revokeObjectURL($('img', viewer).src); });
      document.body.appendChild(viewer);
    }
    var img = $('img', viewer);
    img.src = URL.createObjectURL(blob); img.alt = alt || '';
    viewer.showModal();
  }

  function initText(field) {
    var ta = $('textarea', field), key = keyOf(field);
    db.get(key).then(function (v) { if (typeof v === 'string') ta.value = v; });
    var save = debounce(function () { db.set(key, ta.value).then(function () { setState(field, 'Сохранено'); }); }, 400);
    ta.addEventListener('input', function () { setState(field, 'Сохраняю…'); save(); });
  }

  function initTable(field) {
    var cols = JSON.parse(field.dataset.cols), labels = JSON.parse(field.dataset.rows), key = keyOf(field);
    var table = $('table', field), rows = [];
    var save = debounce(function () { db.set(key, rows).then(function () { setState(field, 'Сохранено'); }); }, 400);
    // строки с подписями задаёт условие задания — их нельзя удалять; свободные строки удаляются, но хотя бы одна остаётся
    var free = !labels.length;
    function paint() {
      var head = '<thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + (free ? '<th class="answer-row-actions" aria-label="Удалить строку"></th>' : '') + '</tr></thead>';
      var body = rows.map(function (r, ri) {
        return '<tr>' + cols.map(function (c, ci) {
          if (ci === 0 && labels.length) return '<th scope="row">' + esc(labels[ri]) + '</th>';
          return '<td><input type="text" data-r="' + ri + '" data-c="' + ci + '" value="' + esc(r[ci] || '') + '" aria-label="' + esc((labels[ri] || 'Строка ' + (ri + 1)) + ': ' + c) + '"></td>';
        }).join('') + (free ? '<td class="answer-row-actions"><button type="button" class="answer-del-row" data-r="' + ri + '" aria-label="Удалить строку ' + (ri + 1) + '"' + (rows.length < 2 ? ' disabled' : '') + '>×</button></td>' : '') + '</tr>';
      }).join('');
      table.innerHTML = head + '<tbody>' + body + '</tbody>';
    }
    function focusCell(r, c) { var i = $('input[data-r="' + r + '"][data-c="' + c + '"]', table); if (i) i.focus(); }
    db.get(key).then(function (v) {
      var n = Number(field.dataset.rowCount);
      rows = Array.isArray(v) ? v : [];
      while (rows.length < n) rows.push([]);
      rows.forEach(function (r, ri) { if (labels.length) r[0] = labels[ri]; });
      paint();
    });
    table.addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset.r) return;
      rows[+t.dataset.r][+t.dataset.c] = t.value; setState(field, 'Сохраняю…'); save();
    });
    table.addEventListener('click', function (e) {
      var b = e.target.closest('.answer-del-row'); if (!b || rows.length < 2) return;
      var r = +b.dataset.r;
      rows.splice(r, 1); paint(); save();
      var next = $('.answer-del-row[data-r="' + Math.min(r, rows.length - 1) + '"]', table); if (next) next.focus();
    });
    // Enter — на строку ниже; в последней свободной строке добавляет новую
    table.addEventListener('keydown', function (e) {
      var t = e.target; if (e.key !== 'Enter' || !t.dataset.r) return;
      e.preventDefault();
      var r = +t.dataset.r, c = +t.dataset.c;
      if (r === rows.length - 1 && free) { rows.push([]); paint(); save(); }
      focusCell(r + 1, c);
    });
    var add = $('.answer-add-row', field);
    if (add) add.addEventListener('click', function () { rows.push([]); paint(); save(); $('tbody tr:last-child input', table).focus(); });
  }

  function initImage(field) {
    var key = keyOf(field), input = $('input[type=file]', field), thumbs = $('.answer-thumbs', field), drop = $('.answer-drop', field);
    var images = [];
    function paint() {
      $$('img', thumbs).forEach(function (i) { URL.revokeObjectURL(i.src); });
      thumbs.innerHTML = '';
      images.forEach(function (im, i) {
        var fig = document.createElement('figure');
        fig.className = 'answer-thumb';
        var img = document.createElement('img');
        img.src = URL.createObjectURL(im.blob); img.alt = im.name;
        var open = document.createElement('button');
        open.type = 'button'; open.className = 'answer-open'; open.title = 'Открыть в полном размере'; open.appendChild(img);
        open.addEventListener('click', function () { openViewer(im.blob, im.name); });
        var del = document.createElement('button');
        del.type = 'button'; del.className = 'answer-del'; del.textContent = '×'; del.setAttribute('aria-label', 'Удалить ' + im.name);
        del.addEventListener('click', function () { images.splice(i, 1); save(); paint(); });
        var cap = document.createElement('figcaption'); cap.textContent = im.name;
        fig.appendChild(open); fig.appendChild(del); fig.appendChild(cap);
        thumbs.appendChild(fig);
      });
      drop.classList.toggle('has-images', images.length > 0);
    }
    function save() { setState(field, 'Сохраняю…'); return db.set(key, images).then(function () { setState(field, 'Сохранено'); }); }
    function add(files) {
      files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      setState(field, 'Сохраняю…');
      Promise.all(files.map(function (f) {
        return shrinkImage(f).then(function (b) { return { blob: b, name: (f.name && f.name !== 'image.png' ? f.name.replace(/\.\w+$/, '') : 'скриншот') + '.' + ext(b.type) }; });
      })).then(function (list) { images = images.concat(list); paint(); return save(); });
    }
    db.get(key).then(function (v) { images = Array.isArray(v) ? v : []; paint(); });
    input.addEventListener('change', function () { add(input.files); input.value = ''; });
    $('.answer-pick', field).addEventListener('click', function () { input.click(); });
    // с клавиатуры: фокус на области → Enter или пробел открывают выбор файла, ⌘V вставляет из буфера
    drop.addEventListener('keydown', function (e) { if (e.target === drop && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); input.click(); } });
    drop.addEventListener('paste', function (e) { var f = e.clipboardData && e.clipboardData.files; if (f && f.length) { e.preventDefault(); add(f); } });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('drag'); add(e.dataTransfer.files); });
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  var dbOk = true;
  if (answers.length) {
    openDb().then(function () {
      answers.forEach(function (f) { ({ text: initText, table: initTable, image: initImage })[f.dataset.type](f); });
    }).catch(function () {
      dbOk = false;
      answers.forEach(function (f) { setState(f, 'Браузер не даёт сохранять ответы. Откройте курс в Chrome или Safari.'); });
    });
  }

  // ---------- отчёт ----------
  // Текст задания в Markdown: абзацы, списки, код. Поля ответов и чек-листы идут отдельно
  function taskText(body) {
    var clone = body.cloneNode(true);
    $$('.answer, .contains-task-list, figure, .markdown-alert', clone).forEach(function (el) { el.remove(); });
    var out = [];
    Array.prototype.forEach.call(clone.children, function (el) {
      var tag = el.tagName;
      if (tag === 'OL') $$(':scope > li', el).forEach(function (li, i) { out.push((i + 1) + '. ' + inline(li)); });
      else if (tag === 'UL') $$(':scope > li', el).forEach(function (li) { out.push('- ' + inline(li)); });
      else if (tag === 'TABLE') out.push(mdTable($$('tr', el).map(function (tr) { return $$('th, td', tr).map(function (c) { return c.textContent.trim(); }); })));
      else if (el.textContent.trim()) out.push(inline(el));
      out.push('');
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function inline(el) {
    var c = el.cloneNode(true);
    $$('code', c).forEach(function (x) { x.textContent = '`' + x.textContent + '`'; });
    $$('kbd', c).forEach(function (x) { x.textContent = x.textContent.trim(); });
    $$('a[href^="http"]', c).forEach(function (x) { x.textContent = '[' + x.textContent + '](' + x.getAttribute('href') + ')'; });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function mdTable(rows) {
    if (!rows.length) return '';
    var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var line = function (r) { var cells = []; for (var i = 0; i < w; i++) cells.push(String(r[i] || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')); return '| ' + cells.join(' | ') + ' |'; };
    return [line(rows[0]), '|' + new Array(w + 1).join(' --- |')].concat(rows.slice(1).map(line)).join('\n');
  }
  function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  // Собрать отчёт: README.md со сводкой, по файлу на задание, картинки в img/
  function buildReport(box) {
    var slug = box.dataset.report, n = box.dataset.lessonN, title = box.dataset.lessonTitle;
    // имена внутри архива — латиницей: встроенный unzip в macOS и старые архиваторы Windows не понимают UTF-8 в именах
    var folder = box.dataset.reportFile || 'lesson-' + (n.length < 2 ? '0' + n : n) + '-report';
    var heading = box.dataset.reportHeading || 'урок ' + n + ' «' + title + '»';
    var name = ($('.report-name', box).value || '').trim();
    var tasks = $$('.task[data-task]');
    return db.list(slug + '/').then(function (items) {
      var saved = {}; items.forEach(function (kv) { saved[kv[0].slice(slug.length + 1)] = kv[1]; });
      var files = [], summary = [], filled = 0, total = 0;
      tasks.forEach(function (t) {
        var tn = t.dataset.task, fname = 'task-' + tn + '.md';
        var checks = $$('.task-list-item-checkbox', t);
        var done = checks.filter(function (c) { return c.checked; }).length;
        var md = ['# Задание ' + tn + '. ' + t.dataset.title, '', '*' + heading.charAt(0).toUpperCase() + heading.slice(1) + ', ' + t.dataset.level + (t.dataset.time ? ', ' + t.dataset.time : '') + '*', '', '## Условие', '', taskText($('.Box-body', t)), ''];
        if (checks.length) {
          md.push('## Чек-лист — ' + done + ' из ' + checks.length, '');
          checks.forEach(function (c) { md.push('- [' + (c.checked ? 'x' : ' ') + '] ' + inline(c.closest('li')).replace(/^Отметить пункт\s*/, '')); });
          md.push('');
        }
        var fields = $$('.answer', t);
        if (fields.length) md.push('## Ответы', '');
        fields.forEach(function (f) {
          var v = saved[f.dataset.answer], label = f.dataset.label;
          total++;
          md.push('### ' + label, '');
          if (f.dataset.type === 'text') { if (v && v.trim()) { filled++; md.push(v.trim()); } else md.push('_Нет ответа_'); }
          if (f.dataset.type === 'table') {
            // подписи строк есть всегда — считаем заполненными только ячейки, которые ввёл ученик
            var cols = JSON.parse(f.dataset.cols), labeled = JSON.parse(f.dataset.rows).length > 0;
            var own = function (r) { return r.some(function (x, i) { return x && !(labeled && i === 0); }); };
            var rows = (v || []).filter(labeled ? function () { return true; } : own);
            if ((v || []).some(own)) { filled++; md.push(mdTable([cols].concat(rows))); } else md.push('_Таблица не заполнена_');
          }
          if (f.dataset.type === 'image') {
            if (v && v.length) {
              filled++;
              v.forEach(function (im, i) {
                var file = 'img/task-' + tn + '-' + f.dataset.answer.split('-')[1] + '-' + (i + 1) + '.' + ext(im.blob.type);
                files.push({ name: folder + '/' + file, data: im.blob });
                md.push('![' + im.name + '](' + file + ')', '');
              });
            } else md.push('_Нет картинок_');
          }
          md.push('');
        });
        files.push({ name: folder + '/' + fname, data: md.join('\n').replace(/\n{3,}/g, '\n\n') });
        summary.push('| ' + tn + ' | [' + t.dataset.title + '](' + fname + ') | ' + (checks.length ? done + ' из ' + checks.length : '—') + ' |');
      });
      var quiz = $('.quiz'), quizLine = '';
      if (quiz) {
        var qs = $$('.q', quiz), answered = qs.filter(function (q) { return $('.opt.right', q) && $('.opt:disabled', q); });
        var right = answered.filter(function (q) { return !$('.opt.wrong', q); }).length;
        quizLine = answered.length ? 'Квиз: ' + right + ' из ' + qs.length + ' с первой попытки' + (answered.length < qs.length ? ' (отвечено ' + answered.length + ')' : '') : 'Квиз: не пройден';
      }
      var readme = ['# Отчёт: ' + heading, '', (name ? 'Ученик: ' + name + '  \n' : '') + 'Сформирован: ' + stamp() + '  ', quizLine, '', '| № | Задание | Чек-лист |', '|---|---|---|'].concat(summary, ['', 'Заполнено полей: ' + filled + ' из ' + total + '.', '']).join('\n');
      files.unshift({ name: folder + '/README.md', data: readme });
      return { files: files, zipName: folder + '.zip', filled: filled, total: total };
    });
  }

  $$('.report-box').forEach(function (box) {
    var nameInput = $('.report-name', box), summary = $('.report-summary', box), clear = $('.report-clear', box);
    try { nameInput.value = localStorage.getItem('fe:report-name') || ''; } catch (e) {}
    nameInput.addEventListener('input', function () { try { localStorage.setItem('fe:report-name', nameInput.value); } catch (e) {} });
    $('.report-make', box).addEventListener('click', function () {
      if (!dbOk) { summary.textContent = 'Браузер не даёт сохранять ответы, отчёт не собрать.'; return; }
      summary.textContent = 'Собираю…';
      buildReport(box).then(function (r) {
        return makeZip(r.files).then(function (blob) {
          download(blob, r.zipName);
          summary.textContent = 'Готово: ' + r.zipName + '. Заполнено полей: ' + r.filled + ' из ' + r.total + '. Отправьте архив ментору.';
        });
      }).catch(function (e) { summary.textContent = 'Не получилось собрать отчёт: ' + e.message; });
    });
    // очистка — в два нажатия, без системного окна подтверждения
    clear.addEventListener('click', function () {
      if (!clear.classList.contains('confirm')) {
        clear.classList.add('confirm'); $('span', clear).textContent = 'Точно удалить все ответы урока?';
        setTimeout(function () { clear.classList.remove('confirm'); $('span', clear).textContent = 'Очистить ответы урока'; }, 4000);
        return;
      }
      db.clear(box.dataset.report + '/').then(function () { location.reload(); });
    });
  });

  // ---------- комментарии к слайдам и промпт с правками ----------
  var reviewBox = $('.review-box');
  if (reviewBox) {
    var rkey = 'fe:review:' + reviewBox.dataset.review;
    var load = function () { try { return JSON.parse(localStorage.getItem(rkey)) || {}; } catch (e) { return {}; } };
    var review = load(); review.slides = review.slides || {};
    var persist = debounce(function () { try { localStorage.setItem(rkey, JSON.stringify(review)); } catch (e) {} paintSummary(); }, 300);
    var general = $('.review-general', reviewBox), rsummary = $('.review-summary', reviewBox);
    function paintSummary() {
      var n = Object.keys(review.slides).filter(function (k) { return review.slides[k].trim(); }).length;
      rsummary.textContent = n || (review.general || '').trim() ? 'Комментариев к слайдам: ' + n + ((review.general || '').trim() ? ', есть общий комментарий' : '') + '.' : 'Комментариев пока нет.';
      $$('.script-card').forEach(function (c) { c.classList.toggle('has-review', !!(review.slides[c.dataset.slide] || '').trim()); });
    }
    general.value = review.general || '';
    general.addEventListener('input', function () { review.general = general.value; persist(); });
    $$('.script-card').forEach(function (card) {
      var i = card.dataset.slide, btn = $('.review-toggle', card), ta = $('.review-text', card);
      ta.value = review.slides[i] || '';
      var show = function (on) { ta.hidden = !on; btn.setAttribute('aria-expanded', on); };
      show(!!ta.value.trim());
      btn.addEventListener('click', function () { show(ta.hidden); if (!ta.hidden) ta.focus(); });
      ta.addEventListener('input', function () { review.slides[i] = ta.value; persist(); });
      // стрелки в поле комментария — для текста, а не для переключения слайдов
      ta.addEventListener('keydown', function (e) { e.stopPropagation(); });
    });
    general.addEventListener('keydown', function (e) { e.stopPropagation(); });
    paintSummary();

    var buildPrompt = function () {
      var files = JSON.parse(reviewBox.dataset.files || '{}'), n = reviewBox.dataset.lessonN, title = reviewBox.dataset.lessonTitle;
      var lines = ['# Правки к уроку ' + n + ' «' + title + '»', '',
        'Исправь материалы урока курса «Фронтенд с нуля» по комментариям ментора ниже.', '',
        'Файлы урока:',
        '- текст урока: `' + files.lesson + '`',
        '- слайды: `' + files.slides + '` (слайды разделены строкой `---`, титульный слайд собирается сам)',
        '- сценарий к слайдам: `' + files.script + '` (раздел `##` на каждый слайд, считая титульный)',
        '- картинки: папка `img/` урока, скриншоты описаны в `screenshots.yml`',
        '',
        'Как править:',
        '- Комментарий к слайду касается слайда, его раздела в сценарии и, если речь о содержании, связанного раздела текста урока. Держи их согласованными.',
        '- Если слайд добавляется или удаляется, добавь или удали раздел сценария: число разделов = число слайдов + 1.',
        '- Правила оформления и объёма — `course/STYLE.md`. После правок запусти `npm run check` в папке `course/` и посмотри слайды глазами.',
        ''];
      var g = (review.general || '').trim();
      if (g) lines.push('## Общий комментарий к занятию', '', g, '');
      var any = false;
      $$('.script-card').forEach(function (card) {
        var text = (review.slides[card.dataset.slide] || '').trim();
        if (!text) return;
        any = true;
        var src = JSON.parse(card.dataset.src || '{}'), i = Number(card.dataset.slide);
        lines.push('## Слайд ' + (i + 1) + '. ' + card.dataset.title, '');
        var where = [];
        if (i === 0) where.push('титульный слайд: название и подзаголовок урока — в `course/src/syllabus.yml`, обложка — `slides:` во фронтматтере `' + files.lesson + '`');
        else if (src.slideLine) where.push('слайд: `' + files.slides + '`, строка ' + src.slideLine);
        if (src.scriptLine) where.push('сценарий: `' + files.script + '`, строка ' + src.scriptLine);
        if (src.related) where.push('связанный раздел текста урока: «' + src.related.title + '», `' + files.lesson + '`, строка ' + src.related.line);
        else if (i > 0) where.push('связанный раздел текста урока не найден автоматически — найди по смыслу в `' + files.lesson + '`');
        where.forEach(function (w) { lines.push('- ' + w); });
        lines.push('', 'Комментарий:', '', text.split('\n').map(function (l) { return '> ' + l; }).join('\n'), '');
      });
      if (!g && !any) return null;
      return lines.join('\n');
    };
    window.CourseReviewPrompt = buildPrompt;
    $('.review-download', reviewBox).addEventListener('click', function () {
      var text = buildPrompt();
      if (!text) { rsummary.textContent = 'Сначала напишите хотя бы один комментарий.'; return; }
      var n = reviewBox.dataset.lessonN;
      download(new Blob([text], { type: 'text/markdown;charset=utf-8' }), 'правки-урок-' + (n.length < 2 ? '0' + n : n) + '.md');
      rsummary.textContent = 'Промпт скачан. Передайте файл Claude Code в папке курса.';
    });
    var rclear = $('.review-clear', reviewBox);
    rclear.addEventListener('click', function () {
      if (!rclear.classList.contains('confirm')) {
        rclear.classList.add('confirm'); $('span', rclear).textContent = 'Точно удалить все комментарии?';
        setTimeout(function () { rclear.classList.remove('confirm'); $('span', rclear).textContent = 'Очистить комментарии'; }, 4000);
        return;
      }
      review = { slides: {} }; try { localStorage.removeItem(rkey); } catch (e) {}
      general.value = ''; $$('.review-text').forEach(function (t) { t.value = ''; t.hidden = true; });
      $$('.review-toggle').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      paintSummary();
    });
  }

  // для автотестов (build/test-ui.mjs)
  window.CourseWorkbook = { db: db, makeZip: makeZip, crc32: crc32, buildReport: buildReport };
})();
