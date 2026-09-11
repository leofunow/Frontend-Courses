// Сборка сайта курса: src/**/*.md → docs/**/*.html
// Запуск: npm run build. Результат открывается двойным кликом по docs/index.html.
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import { createHighlighter } from 'shiki';
import { createDiagramRenderer, icon } from './diagram.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const FINAL = path.join(ROOT, 'docs');
// Сборка идёт во временную папку и в конце атомарно подменяет docs/:
// сайт никогда не бывает собран наполовину, даже если параллельно работает npm start.
const OUT = path.join(ROOT, `.docs-build-${process.pid}`);
const ASSETS = path.join(ROOT, 'assets');
const NM = path.join(ROOT, 'node_modules');

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many; };

const warnings = [];
const warn = (msg) => warnings.push(msg);

// ---------- данные ----------
const syllabus = yaml.load(read(path.join(SRC, 'syllabus.yml')));
const glossaryRaw = yaml.load(read(path.join(SRC, 'glossary.yml'))) || {};
const glossary = Object.fromEntries(Object.entries(glossaryRaw).map(([k, v]) => [k.toLowerCase(), { term: k, ...v }]));

// Уроки: номер считается по порядку в программе, папка — src/lessons/NN-id
const lessons = [];
const lessonDirs = fs.existsSync(path.join(SRC, 'lessons')) ? fs.readdirSync(path.join(SRC, 'lessons')) : [];
for (const mod of syllabus.modules) {
  for (const l of mod.lessons) {
    const n = lessons.length + 1;
    const slug = `${String(n).padStart(2, '0')}-${l.id}`;
    const found = lessonDirs.find((d) => d.replace(/^\d+-/, '') === l.id);
    if (found && found !== slug) warn(`src/lessons/${found}: урок теперь под номером ${n}, переименуйте папку в ${slug}`);
    const dir = path.join(SRC, 'lessons', found || slug);
    lessons.push({ ...l, slug, n, module: mod, dir, ready: fs.existsSync(path.join(dir, 'lesson.md')), hasSlides: fs.existsSync(path.join(dir, 'slides.md')) });
  }
}
for (const d of lessonDirs) if (!lessons.some((l) => l.dir.endsWith(`${path.sep}${d}`))) warn(`src/lessons/${d}: такого урока нет в syllabus.yml`);

// {{n:id}} — номер урока по его id, {{count}} — число уроков со словом («31 урок»). Работает в Markdown и YAML-блоках.
const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));
function resolveRefs(text, file) {
  return text
    .replace(/\{\{count\}\}/g, `${lessons.length} ${plural(lessons.length, 'урок', 'урока', 'уроков')}`)
    .replace(/\{\{n:([a-z0-9-]+)\}\}/g, (m, id) => {
      if (!lessonById[id]) { warn(`${file}: нет урока с id «${id}» (${m})`); return m; }
      return String(lessonById[id].n);
    });
}
const readSrc = (p) => resolveRefs(read(p), path.relative(ROOT, p));
syllabus.tagline = resolveRefs(syllabus.tagline, 'syllabus.yml');
const modN = (m) => syllabus.modules.indexOf(m);
const projects = syllabus.modules.filter((m) => m.project).map((m) => ({
  ...m.project,
  module: m,
  afterLesson: lessons.filter((l) => l.module === m).at(-1).n,
  ready: fs.existsSync(path.join(SRC, 'projects', `${m.project.id}.md`)),
}));

// ---------- markdown ----------
const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: ['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'bash', 'http', 'yaml', 'md'],
});
const LANG_LABEL = { html: 'HTML', css: 'CSS', js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX', json: 'JSON', bash: 'Терминал', http: 'HTTP', yaml: 'YAML', md: 'Markdown', text: 'Текст' };
const highlight = (code, lang) => highlighter.codeToHtml(code, { lang: highlighter.getLoadedLanguages().includes(lang) ? lang : 'text', theme: 'github-light' });

function termPlugin(md) {
  md.inline.ruler.before('link', 'term', (state, silent) => {
    const { src, pos } = state;
    if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
    const end = src.indexOf(']]', pos + 2);
    if (end < 0) return false;
    if (!silent) {
      const [key, label] = src.slice(pos + 2, end).split('|').map((s) => s.trim());
      state.push('term', '', 0).meta = { key, label: label || key };
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.term = (tokens, idx, _o, env) => {
    const { key, label } = tokens[idx].meta;
    const g = glossary[key.toLowerCase()];
    if (!g) { warn(`${env.file}: нет термина «${key}» в glossary.yml`); return esc(label); }
    env.terms?.add(key.toLowerCase());
    return `<span class="term" role="button" tabindex="0" data-term="${esc(key.toLowerCase())}">${esc(label)}</span>`;
  };
}

const md = new MarkdownIt({ html: true, typographer: true, quotes: '«»„“' });
md.use(termPlugin);
md.use(anchor, { slugify, level: [2, 3], tabIndex: false });
md.renderer.rules.fence = (tokens, idx) => {
  const t = tokens[idx];
  const [lang = 'text', ...rest] = t.info.trim().split(/\s+/);
  const title = (rest.join(' ').match(/title="([^"]+)"/) || [])[1];
  return `<figure class="code" data-lang="${esc(lang)}"><figcaption><span>${esc(title || LANG_LABEL[lang] || lang)}</span></figcaption>${highlight(t.content.replace(/\n$/, ''), lang)}</figure>\n`;
};
// относительные картинки (img/x.webp) ведут в папку ассетов текущего урока
const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, opts, env, self) => {
  const src = tokens[idx].attrGet('src') || '';
  if (!/^(https?:|data:|\/)/.test(src)) tokens[idx].attrSet('src', (env.assetBase || '') + src);
  tokens[idx].attrSet('loading', 'lazy');
  return defaultImage(tokens, idx, opts, env, self);
};
const defaultLinkOpen = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const href = tokens[idx].attrGet('href') || '';
  if (/^https?:/.test(href)) { tokens[idx].attrSet('target', '_blank'); tokens[idx].attrSet('rel', 'noopener'); }
  return defaultLinkOpen(tokens, idx, opts, env, self);
};

// ---------- блоки :::name ----------
// Блок: строка ":::имя аргументы", содержимое, строка ":::". Блоки могут вкладываться.
// Однострочные блоки (:::use имя) закрывать не нужно.
const SINGLE_LINE = new Set(['use', 'answer']);
function extractBlocks(src) {
  const lines = src.split('\n');
  const out = [];
  const blocks = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) inFence = !inFence;
    const open = !inFence && line.match(/^:::([a-z]+)\s*(.*)$/);
    if (!open) { out.push(line); continue; }
    if (SINGLE_LINE.has(open[1])) { // однострочные блоки без закрывающего :::
      blocks.push({ type: open[1], args: open[2].trim(), body: '' });
      out.push('', `@@BLOCK${blocks.length - 1}@@`, '');
      continue;
    }
    let depth = 1, j = i + 1, fence = false;
    const inner = [];
    for (; j < lines.length; j++) {
      if (/^\s*```/.test(lines[j])) fence = !fence;
      if (!fence && /^:::([a-z]+)/.test(lines[j]) && !SINGLE_LINE.has(lines[j].match(/^:::([a-z]+)/)[1])) depth++;
      else if (!fence && /^:::\s*$/.test(lines[j]) && --depth === 0) break;
      inner.push(lines[j]);
    }
    if (depth !== 0) throw new Error(`Не закрыт блок :::${open[1]} (строка ${i + 1})`);
    blocks.push({ type: open[1], args: open[2].trim(), body: inner.join('\n') });
    out.push('', `@@BLOCK${blocks.length - 1}@@`, '');
    i = j;
  }
  return { text: out.join('\n'), blocks };
}

function parseArgs(args) {
  const opts = {};
  const title = args.replace(/(\w+)=("[^"]*"|\S+)/g, (_, k, v) => { opts[k] = v.replace(/^"|"$/g, ''); return ''; }).trim();
  return { title, opts };
}

const ALERT = {
  tip: ['tip', 'light-bulb', 'Совет'],
  note: ['note', 'info', 'Заметка'],
  important: ['important', 'report', 'Важно'],
  mistake: ['caution', 'stop', 'Частая ошибка'],
  mac: ['note', 'device-desktop', 'Особенность macOS'],
};

let quizCounter = 0;
const diagramRegistry = new Map();
const BLOCKS = {
  ...Object.fromEntries(Object.entries(ALERT).map(([name, [cls, ic, def]]) => [name, (b, ctx) =>
    `<div class="markdown-alert markdown-alert-${cls}"><p class="markdown-alert-title">${icon(ic, 'mr-2')}${md.renderInline(b.args || def, ctx.env)}</p>${render(b.body, ctx)}</div>`])),

  details: (b, ctx) => `<details class="details"><summary>${esc(b.args || 'Подробнее')}</summary><div class="details-body">${render(b.body, ctx)}</div></details>`,

  // :::shot img/file.webp width=600 — скриншот с подписью; по щелчку открывается в полном размере
  shot: (b, ctx) => {
    const { title: file, opts } = parseArgs(b.args);
    if (!fs.existsSync(path.join(ctx.dir, file))) warn(`${ctx.file}: нет файла ${file}`);
    const src = (ctx.env.assetBase || '') + file;
    const cap = b.body.trim();
    const alt = esc(cap.replace(/[*_`\[\]]/g, ''));
    // в слайдах картинка — просто картинка: щелчок по ней не должен уводить со слайда
    const img = `<img src="${esc(src)}" alt="${alt}" loading="lazy">`;
    const body = ctx.id.endsWith('-slides') ? img : `<a href="${esc(src)}" target="_blank" title="Открыть в полном размере">${img}</a>`;
    return `<figure class="shot"${opts.width ? ` style="--shot-w:${Number(opts.width)}px"` : ''}>${body}${cap ? `<figcaption>${md.renderInline(cap, ctx.env)}</figcaption>` : ''}</figure>`;
  },

  // :::terminal title="…" caption="…" — окно Терминала macOS.
  // Строки вида «mary@MacBook-Air ~ % команда # комментарий» раскрашиваются как приглашение и команда.
  // «! текст» — строка ошибки (красная). «[1]» в конце строки — номер-метка, который объясняется в тексте.
  terminal: (b, ctx) => {
    const { opts } = parseArgs(b.args);
    const title = opts.title || 'mary — -zsh — 80×24';
    const lines = b.body.replace(/\n$/, '').split('\n').map((raw) => {
      let line = raw, mark = '';
      const m = line.match(/\s+\[(\d+)\]\s*$/);
      if (m) { mark = `<span class="term-mark">${m[1]}</span>`; line = line.slice(0, m.index); }
      const p = line.match(/^(\S+@[\w.-]+)\s+(\S+)\s+%(?:\s(.*))?$/);
      if (p) {
        const [, who, dir, rest = ''] = p;
        const [, cmd, comment] = rest.match(/^(.*?)(\s+#\s.*)?$/);
        const cursor = rest === '' ? '<span class="term-cursor"></span>' : '';
        return `<span class="term-line"><span class="term-who">${esc(who)}</span> <span class="term-dir">${esc(dir)}</span> <span class="term-pct">%</span> <span class="term-cmd">${esc(cmd || '')}</span>${comment ? `<span class="term-comment">${esc(comment)}</span>` : ''}${cursor}${mark}</span>`;
      }
      if (line.startsWith('! ')) return `<span class="term-line term-err">${esc(line.slice(2))}${mark}</span>`;
      return `<span class="term-line">${esc(line) || ' '}${mark}</span>`;
    }).join('');
    const cap = opts.caption ? `<figcaption>${md.renderInline(opts.caption, ctx.env)}</figcaption>` : '';
    return `<figure class="terminal"><div class="term-window"><div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="term-title">${esc(title)}</span></div><pre class="term-body">${lines}</pre></div>${cap}</figure>`;
  },

  cols: (b, ctx) => `<div class="cols">${b.body.split(/^\+\+\+\s*$/m).map((c) => `<div class="col">${render(c, ctx)}</div>`).join('')}</div>`,

  // :::use имя — вставить схему, объявленную в тексте урока как :::diagram id=имя (для слайдов)
  use: (b, ctx) => {
    const body = diagramRegistry.get(`${ctx.lesson}/${b.args}`);
    if (!body) { warn(`${ctx.file}: нет схемы id=${b.args} в тексте урока`); return ''; }
    return BLOCKS.diagram({ args: '', body }, ctx);
  },

  diagram: (b, ctx) => {
    const { opts } = parseArgs(b.args);
    if (opts.id) diagramRegistry.set(`${ctx.lesson}/${opts.id}`, b.body);
    let spec;
    try { spec = yaml.load(b.body); } catch (e) { warn(`${ctx.file}: ошибка YAML в схеме: ${e.reason} (строка ${e.mark?.line + 1} схемы). Текст с двоеточием или запятой возьмите в кавычки`); return ''; }
    const renderDg = createDiagramRenderer({ inline: (s) => md.renderInline(s, ctx.env), onError: (m) => warn(`${ctx.file}: схема: ${m}`) });
    const dg = renderDg(spec);
    const cap = spec.caption ? `<figcaption class="dg-caption">${md.renderInline(spec.caption, ctx.env)}</figcaption>` : '';
    if (!spec.steps) return `<figure class="diagram">${dg}${cap}</figure>`;
    const caps = spec.steps.map((s, i) => `<li data-i="${i + 1}">${md.renderInline(String(s), ctx.env)}</li>`).join('');
    return `<figure class="diagram steps" data-total="${spec.steps.length}">${dg}
<div class="step-panel"><ol class="step-captions">${caps}</ol>
<div class="step-nav"><button type="button" class="btn btn-sm" data-dir="-1">${icon('arrow-left')}<span>Назад</span></button><span class="step-count" aria-live="polite"></span><button type="button" class="btn btn-sm btn-primary" data-dir="1"><span>Дальше</span>${icon('arrow-right')}</button></div></div>${cap}</figure>`;
  },

  sandbox: (b) => {
    const { title, opts } = parseArgs(b.args);
    const files = [...b.body.matchAll(/```(\w+)[^\n]*\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], code: m[2].replace(/\n$/, '') }));
    const tabs = files.map((f, i) => `<button type="button" role="tab" class="sb-tab" aria-selected="${i === 0}" data-lang="${f.lang}">${LANG_LABEL[f.lang] || f.lang}</button>`).join('');
    const eds = files.map((f, i) => `<textarea class="sb-code" data-lang="${f.lang}" spellcheck="false" autocapitalize="off" aria-label="${LANG_LABEL[f.lang] || f.lang}"${i ? ' hidden' : ''}>${esc(f.code)}</textarea>`).join('');
    const consoleOn = files.some((f) => f.lang === 'js');
    return `<div class="Box sandbox" style="--sb-h:${Number(opts.height) || 260}px">
<div class="Box-header sb-head"><span class="sb-title">${icon('code', 'mr-2')}${esc(title || 'Песочница')}</span><div class="sb-tabs" role="tablist">${tabs}</div><button type="button" class="btn btn-sm sb-reset">${icon('undo')}<span>Сбросить</span></button></div>
<div class="sb-body"><div class="sb-editors">${eds}</div><div class="sb-out"><div class="sb-out-label">Результат</div><iframe sandbox="allow-scripts" title="Результат"></iframe>${consoleOn ? '<div class="sb-console" aria-label="Консоль"><div class="sb-out-label">Консоль</div><div class="sb-lines"></div></div>' : ''}</div></div>
</div>`;
  },

  quiz: (b, ctx) => {
    let qs;
    try { qs = yaml.load(b.body) || []; } catch (e) { warn(`${ctx.file}: ошибка YAML в квизе: ${e.reason} (строка ${e.mark?.line + 1} квиза). Текст с двоеточием возьмите в кавычки`); return ''; }
    const id = `${ctx.id}-${quizCounter++}`;
    const items = qs.map((q, qi) => {
      if (q.answer == null || !q.options?.[q.answer]) warn(`${ctx.file}: у вопроса ${qi + 1} нет правильного ответа`);
      const opts = q.options.map((o, oi) => `<button type="button" class="opt" data-i="${oi}"><span class="opt-mark" aria-hidden="true"></span><span>${md.renderInline(String(o), ctx.env)}</span></button>`).join('');
      return `<li class="Box-row q" data-answer="${q.answer}"><div class="q-text"><span class="q-n">${qi + 1}.</span> ${md.renderInline(String(q.q), ctx.env)}</div><div class="opts">${opts}</div><div class="why" hidden>${md.renderInline(String(q.why || ''), ctx.env)}</div></li>`;
    }).join('');
    return `<div class="Box quiz" data-quiz="${esc(id)}"><div class="Box-header">${icon('checklist', 'mr-2')}Квиз: ${qs.length} ${plural(qs.length, 'вопрос', 'вопроса', 'вопросов')}</div><ol class="quiz-list">${items}</ol><div class="Box-footer quiz-foot"><span class="quiz-score" aria-live="polite"></span><button type="button" class="btn btn-sm quiz-reset">${icon('sync')}<span>Пройти заново</span></button></div></div>`;
  },

  // :::answer text Вопрос                      — поле для ответа текстом
  // :::answer image Что прикрепить               — картинки: выбрать файл, вставить ⌘V, перетащить
  // :::answer table Название cols="А|Б" rows="x|y" — таблица; rows — подписи строк или число пустых строк
  // Ответы хранятся в браузере ученика (IndexedDB), отчёт собирается кнопкой в конце заданий
  answer: (b, ctx) => {
    const { title, opts } = parseArgs(b.args);
    const [type, ...rest] = title.split(/\s+/);
    const label = rest.join(' ');
    if (!['text', 'image', 'table'].includes(type)) { warn(`${ctx.file}: :::answer — тип ${type}, нужен text, image или table`); return ''; }
    if (!ctx.taskN) warn(`${ctx.file}: :::answer вне :::task`);
    ctx.answerN = (ctx.answerN || 0) + 1;
    const key = `${ctx.taskN}-${ctx.answerN}`;
    const id = `ans-${key}`;
    const head = `<div class="answer-head"><label class="answer-label" for="${id}">${md.renderInline(label, ctx.env)}</label><span class="answer-state" aria-live="polite"></span></div>`;
    if (type === 'text') {
      return `<div class="answer" data-answer="${key}" data-type="text" data-label="${esc(label)}">${head}<textarea id="${id}" class="answer-text" rows="${Number(opts.rows) || 3}" placeholder="${esc(opts.placeholder || 'Ваш ответ')}"></textarea></div>`;
    }
    if (type === 'image') {
      return `<div class="answer" data-answer="${key}" data-type="image" data-label="${esc(label)}">${head}<div class="answer-drop" tabindex="0" aria-describedby="${id}-hint"><input id="${id}" type="file" accept="image/*" multiple class="answer-file" hidden><div class="answer-thumbs"></div><p class="answer-hint" id="${id}-hint">${icon('image')}<span>Перетащите картинку сюда, вставьте из буфера <kbd>⌘</kbd>+<kbd>V</kbd> или <button type="button" class="answer-pick">выберите файл</button></span></p></div></div>`;
    }
    const cols = (opts.cols || 'Столбец 1|Столбец 2').split('|').map((c) => c.trim());
    const rowLabels = opts.rows && !/^\d+$/.test(opts.rows) ? opts.rows.split('|').map((r) => r.trim()) : null;
    const rowCount = rowLabels ? rowLabels.length : Number(opts.rows) || 3;
    return `<div class="answer" data-answer="${key}" data-type="table" data-label="${esc(label)}" data-cols="${esc(JSON.stringify(cols))}" data-rows="${esc(JSON.stringify(rowLabels || []))}" data-row-count="${rowCount}">${head}<div class="answer-table-wrap"><table class="answer-table" id="${id}"></table></div>${rowLabels ? '' : `<button type="button" class="btn btn-sm answer-add-row">${icon('plus')}<span>Добавить строку</span></button>`}</div>`;
  },

  task: (b, ctx) => {
    const { title, opts } = parseArgs(b.args);
    ctx.taskN = (ctx.taskN || 0) + 1;
    ctx.answerN = 0;
    const lv = Number(opts.level) || 1;
    const level = `<span class="Label Label--${['', 'success', 'attention', 'danger'][lv]}">${['', 'Лёгкое', 'Среднее', 'Сложное'][lv]}</span>`;
    const time = opts.time ? `<span class="task-time">${icon('clock')}${esc(opts.time)}</span>` : '';
    const n = ctx.taskN;
    return `<section class="Box task" id="task-${n}" data-task="${n}" data-title="${esc(title)}" data-level="${['', 'лёгкое', 'среднее', 'сложное'][lv]}"${opts.time ? ` data-time="${esc(opts.time)}"` : ''}><div class="Box-header task-head"><div><div class="task-n">Задание ${n}</div><h3 class="task-title">${md.renderInline(title, ctx.env)}</h3></div><div class="task-meta">${level}${time}</div></div><div class="Box-body">${render(b.body, ctx)}</div></section>`;
  },
};

function render(src, ctx) {
  const { text, blocks } = extractBlocks(src);
  let html = md.render(text, ctx.env);
  html = html.replace(/<p>@@BLOCK(\d+)@@<\/p>\n?/g, (_, n) => {
    const b = blocks[n];
    if (!BLOCKS[b.type]) { warn(`${ctx.file}: неизвестный блок :::${b.type}`); return ''; }
    return BLOCKS[b.type](b, ctx);
  });
  // чек-листы в стиле GitHub: "- [ ] пункт"
  html = html.replace(/<li>\[ \]\s?/g, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" aria-label="Отметить пункт"> ');
  html = html.replace(/<ul>\n(?=<li class="task-list-item">)/g, '<ul class="contains-task-list">\n');
  return html;
}

function parseFrontmatter(src, file = '') {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: src };
  try {
    return { fm: yaml.load(m[1]) || {}, body: src.slice(m[0].length) };
  } catch (e) {
    warn(`${file}: ошибка YAML в шапке урока, строка ${e.mark?.line + 1}: ${e.reason}. Текст с двоеточием возьмите в кавычки`);
    return { fm: {}, body: src.slice(m[0].length) };
  }
}

function collectHeadings(tokens) {
  const hs = [];
  tokens.forEach((t, i) => {
    if (t.type === 'heading_open' && (t.tag === 'h2' || t.tag === 'h3')) {
      hs.push({ level: Number(t.tag[1]), slug: t.attrGet('id'), title: tokens[i + 1].content.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a).replace(/`/g, '') });
    }
  });
  return hs;
}

const newCtx = (file, id, dir, lesson = id, assetBase = '') => ({ env: { file, terms: new Set(), headings: [], assetBase }, file, id, dir, lesson });
function renderPage(src, ctx) {
  ctx.env.headings = collectHeadings(md.parse(extractBlocks(src).text, { ...ctx.env, terms: new Set() }));
  return render(src, ctx);
}
const glossaryFor = (terms) => Object.fromEntries([...terms].map((k) => [k, { t: glossary[k].term, en: glossary[k].en || '', d: md.renderInline(glossary[k].def) }]));

// ---------- шаблоны ----------
const lessonUrl = (l) => `lessons/${l.slug}.html`;
const slidesUrl = (l) => `slides/${l.slug}.html`;
const projectUrl = (p) => `projects/${p.id}.html`;
const modTitle = (m) => `Модуль ${modN(m)}. ${m.title}`;

function sidebar(rel, current) {
  const mods = syllabus.modules.map((m) => {
    const items = lessons.filter((l) => l.module === m).map((l) =>
      `<li><a href="${rel}${lessonUrl(l)}" data-lesson="${l.slug}"${current === l.slug ? ' aria-current="page"' : ''} class="nav-item${l.ready ? '' : ' planned'}"><span class="nav-n">${l.n}</span><span class="nav-done" aria-hidden="true">${icon('check-circle-fill')}</span><span class="nav-t">${esc(l.title)}</span></a></li>`);
    if (m.project) {
      const p = projects.find((x) => x.id === m.project.id);
      items.push(`<li><a href="${rel}${projectUrl(p)}"${current === p.id ? ' aria-current="page"' : ''} class="nav-item project${p.ready ? '' : ' planned'}"><span class="nav-n">${icon('project')}</span><span class="nav-t">${esc(p.title)}</span></a></li>`);
    }
    return `<li class="nav-group"><h2 class="nav-group-title">${esc(modTitle(m))}</h2><ul>${items.join('')}</ul></li>`;
  }).join('');
  const top = [['home', 'index.html', 'home', 'Карта курса'], ['how-to-learn', 'pages/how-to-learn.html', 'info', 'Как устроен курс'], ['glossary', 'glossary.html', 'book', 'Глоссарий']]
    .map(([id, href, ic, t]) => `<li><a class="nav-item" href="${rel}${href}"${current === id ? ' aria-current="page"' : ''}><span class="nav-n">${icon(ic)}</span><span class="nav-t">${t}</span></a></li>`).join('');
  return `<nav class="sidebar" id="sidebar" aria-label="Уроки курса"><ul class="nav-list">${top}${mods}</ul></nav>`;
}

function layout({ title, rel, current, body, toc = '', terms = [] }) {
  return `<!doctype html>
<html lang="ru" data-color-mode="light" data-light-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(syllabus.title)}</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='3' fill='%231f2328'/><path d='M6 5 3.5 8 6 11M10 5l2.5 3L10 11' stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
<link rel="stylesheet" href="${rel}assets/vendor/primer-primitives.css">
<link rel="stylesheet" href="${rel}assets/vendor/github-markdown-light.css">
<link rel="stylesheet" href="${rel}assets/course.css">
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
<header class="header">
<button type="button" class="btn btn-icon menu-btn" aria-controls="sidebar" aria-expanded="false" aria-label="Меню">${icon('three-bars')}</button>
<a class="header-brand" href="${rel}index.html">${icon('mortar-board')}<span>${esc(syllabus.title)}</span></a>
<button type="button" class="search-open" data-search>${icon('search')}<span>Поиск по курсу</span><kbd>/</kbd></button>
</header>
<div class="shell${toc ? ' has-toc' : ''}">
${sidebar(rel, current)}
<main id="main" class="main">${body}</main>
${toc ? `<aside class="toc" aria-label="В этом уроке"><h2 class="toc-title">В этом уроке</h2>${toc}</aside>` : ''}
</div>
<div class="search-overlay" hidden role="dialog" aria-modal="true" aria-label="Поиск по курсу"><div class="search-box">
<div class="search-input">${icon('search')}<input type="search" placeholder="Например: flexbox, fetch, props" aria-label="Что найти"></div>
<ol class="search-results"></ol></div></div>
<script>window.GLOSSARY=${JSON.stringify(glossaryFor(terms))};window.REL=${JSON.stringify(rel)};</script>
<script src="${rel}assets/search-index.js"></script>
<script src="${rel}assets/course.js"></script>
<script src="${rel}assets/workbook.js"></script>
</body>
</html>`;
}

const tocHtml = (env) => {
  const hs = env.headings.filter((h) => h.level === 2);
  return hs.length ? `<ul>${hs.map((h) => `<li><a href="#${h.slug}">${esc(h.title)}</a></li>`).join('')}</ul>` : '';
};

// ---------- страницы ----------
const searchIndex = [];
const plain = (html) => html.replace(/<figure class="code"[\s\S]*?<\/figure>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

function pager(prev, next) {
  const a = (x, cls, label) => x ? `<a class="pager-link ${cls}" href="${x.href}"><span class="pager-dir">${cls === 'prev' ? icon('arrow-left') : ''}<span>${label}</span>${cls === 'next' ? icon('arrow-right') : ''}</span><span class="pager-t">${esc(x.title)}</span></a>` : '<span></span>';
  return `<nav class="pager" aria-label="Соседние уроки">${a(prev, 'prev', 'Назад')}${a(next, 'next', 'Дальше')}</nav>`;
}

function buildLesson(l) {
  const rel = '../';
  const prevL = lessons[l.n - 2];
  const nextL = lessons[l.n];
  const project = projects.find((p) => p.afterLesson === l.n);
  const prev = prevL && { href: `${prevL.slug}.html`, title: `Урок ${prevL.n}. ${prevL.title}` };
  const next = project ? { href: `../${projectUrl(project)}`, title: `Проект. ${project.title}` } : nextL && { href: `${nextL.slug}.html`, title: `Урок ${nextL.n}. ${nextL.title}` };
  const crumbs = `<nav class="crumbs" aria-label="Путь"><a href="../index.html#${l.module.id}">${esc(modTitle(l.module))}</a><span aria-hidden="true">/</span><span>Урок ${l.n} из ${lessons.length}</span></nav>`;

  if (!l.ready) {
    const body = `<article class="page">${crumbs}<h1 class="page-title">${esc(l.title)}</h1><p class="lead">${esc(l.subtitle)}</p>
<div class="markdown-body"><div class="markdown-alert markdown-alert-note"><p class="markdown-alert-title">${icon('info', 'mr-2')}Урок готовится</p><p>Что в нём будет:</p><ul>${l.topics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>${pager(prev, next)}</article>`;
    write(path.join(OUT, lessonUrl(l)), layout({ title: l.title, rel, current: l.slug, body }));
    return;
  }

  const file = path.join(l.dir, 'lesson.md');
  if (fs.existsSync(path.join(l.dir, 'img'))) fs.cpSync(path.join(l.dir, 'img'), path.join(OUT, 'lessons', l.slug, 'img'), { recursive: true });
  const { fm, body: src } = parseFrontmatter(readSrc(file), path.relative(ROOT, file));
  const ctx = newCtx(path.relative(ROOT, file), l.slug, l.dir, l.slug, `${l.slug}/`);
  const content = renderPage(src, ctx);
  if (fm.readMore) ctx.env.headings.push({ level: 2, slug: 'читать-дальше', title: 'Читать дальше' });

  const meta = [
    fm.duration && `<span class="meta-item">${icon('clock')}${esc(fm.duration)}</span>`,
    l.hasSlides && `<a class="btn btn-sm" href="../${slidesUrl(l)}" target="_blank">${icon('device-desktop')}<span>Слайды к уроку</span></a>`,
    fs.existsSync(path.join(l.dir, 'script.md')) && `<a class="btn btn-sm" href="../scripts/${l.slug}.html">${icon('note')}<span>Сценарий к слайдам</span></a>`,
  ].filter(Boolean).join('');
  const box = (title, ic, items) => `<section class="Box intro-box"><h2 class="Box-header">${icon(ic, 'mr-2')}${title}</h2><ul class="Box-body">${items.map((g) => `<li>${md.renderInline(g, ctx.env)}</li>`).join('')}</ul></section>`;
  const intro = fm.goals || fm.summary ? `<div class="intro-boxes">${fm.goals ? box('После урока вы сможете', 'goal', fm.goals) : ''}${fm.summary ? box('Урок за минуту', 'zap', fm.summary) : ''}</div>` : '';
  const more = fm.readMore ? `<h2 id="читать-дальше">Читать дальше</h2><ul>${fm.readMore.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>${r.note ? ` — ${esc(r.note)}` : ''}</li>`).join('')}</ul>` : '';

  const body = `<article class="page" data-lesson-page="${l.slug}">
${crumbs}
<h1 class="page-title">${esc(l.title)}</h1>
<p class="lead">${esc(l.subtitle)}</p>
<div class="page-meta">${meta}</div>
${intro}
<div class="markdown-body">${content}${ctx.taskN ? reportBox(l) : ''}${more}</div>
<div class="done-bar"><div><b>Дочитали урок?</b><span>Отметка сохранится в этом браузере и появится на карте курса.</span></div><button type="button" class="btn btn-primary done-btn" data-done="${l.slug}">${icon('check')}<span>Отметить урок пройденным</span></button></div>
${pager(prev, next)}
</article>`;
  write(path.join(OUT, lessonUrl(l)), layout({ title: `${l.n}. ${l.title}`, rel, current: l.slug, body, toc: tocHtml(ctx.env), terms: [...ctx.env.terms] }));
  searchIndex.push({ t: `${l.n}. ${l.title}`, u: lessonUrl(l), h: ctx.env.headings.map((h) => [h.title, h.slug]), x: plain(content).slice(0, 4000) });
  const script = parseScript(l);
  if (l.hasSlides) buildSlides(l, script, fm);
  if (script) buildScript(l, script);
  else if (l.hasSlides) warn(`${path.relative(ROOT, l.dir)}: нет script.md — сценария к слайдам`);
}

// Сценарий к слайдам: script.md, один раздел «## Заголовок (N мин)» на каждый слайд, включая титульный.
// Из него же берутся заметки ментора в слайдах (клавиша S).
function parseScript(l) {
  const file = path.join(l.dir, 'script.md');
  if (!fs.existsSync(file)) return null;
  const [intro, ...parts] = readSrc(file).split(/^## /m);
  const sections = parts.map((p) => {
    const [head, ...rest] = p.split('\n');
    const m = head.trim().match(/^(.*?)\s*\((\d+)\s*мин\)\s*$/);
    return { title: m ? m[1] : head.trim(), minutes: m ? Number(m[2]) : 0, body: rest.join('\n').trim() };
  });
  sections.forEach((x) => { if (!x.minutes) warn(`${path.relative(ROOT, file)}: у раздела «${x.title}» нет длительности «(N мин)»`); });
  return { file, intro: intro.trim(), sections };
}

// fm.slides в lesson.md — оформление презентации:
//   theme: showcase          — крупная типографика и цветные макеты (урок-витрина)
//   cover: img/файл.webp     — фото на титульном слайде
//   coverCredit: 'Фото: …'  — подпись к фото (автор и лицензия)
function buildSlides(l, script, fm = {}) {
  const file = path.join(l.dir, 'slides.md');
  const ctx = newCtx(path.relative(ROOT, file), `${l.slug}-slides`, l.dir, l.slug, `../lessons/${l.slug}/`);
  const parts = readSrc(file).split(/^---\s*$/m).map((s) => s.trim()).filter(Boolean);
  if (script && script.sections.length !== parts.length + 1) {
    warn(`${path.relative(ROOT, script.file)}: разделов ${script.sections.length}, а слайдов ${parts.length + 1} (с титульным). Должно совпадать`);
  }
  const notesFor = (i, fallback) => {
    const sec = script?.sections[i];
    if (sec) return `<aside class="notes"><p><b>${esc(sec.title)}</b>${sec.minutes ? ` — ${sec.minutes} мин` : ''}</p>${render(sec.body, ctx)}</aside>`;
    return fallback ? `<aside class="notes">${md.render(fallback)}</aside>` : '';
  };
  const PART_BG = ['#ddf4ff', '#dafbe1', '#fbefff', '#fff8c5'];
  let part = 0;
  const slides = parts.map((s, i) => {
    const [content, notes] = s.split(/^Note:\s*$/m);
    const cls = (content.match(/^<!--\s*class:\s*([\w -]+)\s*-->/) || [])[1];
    let html = render(content.replace(/^<!--[\s\S]*?-->\n?/, ''), ctx);
    // в слайдах у пошаговой схемы нет кнопок: шаги — это фрагменты reveal (см. slides.js)
    html = html.replace(/<div class="step-panel">[\s\S]*?<\/div><\/div>/g, '').replace(/class="diagram steps"/g, 'class="diagram slide-steps"');
    // разделитель части: фон на весь экран, цвета по кругу (светлые оттенки Primer)
    const isPart = /\bpart\b/.test(cls || '');
    const bg = isPart ? ` data-background-color="${PART_BG[part % PART_BG.length]}"` : '';
    // «Часть N» пишем в разметку: reveal скрывает неактивные слайды, и CSS-счётчик на них не работает
    if (isPart) html = `<p class="part-n">Часть ${++part}</p>` + html;
    return `<section${cls ? ` class="${cls}"` : ''}${bg}><div class="slide-body">${html}</div>${notesFor(i + 1, notes)}</section>`;
  });
  const deck = fm.slides || {};
  const cover = deck.cover ? `<figure class="cover"><img src="../lessons/${l.slug}/${esc(deck.cover)}" alt="">${deck.coverCredit ? `<figcaption>${md.renderInline(deck.coverCredit, ctx.env)}</figcaption>` : ''}</figure>` : '';
  const html = `<!doctype html>
<html lang="ru" data-color-mode="light" data-light-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Слайды: ${l.n}. ${esc(l.title)}</title>
<link rel="stylesheet" href="../assets/vendor/reveal/reset.css">
<link rel="stylesheet" href="../assets/vendor/reveal/reveal.css">
<link rel="stylesheet" href="../assets/vendor/primer-primitives.css">
<link rel="stylesheet" href="../assets/vendor/github-markdown-light.css">
<link rel="stylesheet" href="../assets/course.css">
<link rel="stylesheet" href="../assets/slides.css">
</head>
<body class="slides-page${deck.theme ? ` deck-${esc(deck.theme)}` : ''}">
<div class="reveal"><div class="slides">
<section class="title-slide${deck.cover ? ' has-cover' : ''}" data-n="${String(l.n).padStart(2, '0')}"><div class="slide-body"><p class="kicker">${esc(modTitle(l.module))}. Урок ${l.n}</p><h1>${esc(l.title)}</h1><p class="sub">${esc(l.subtitle)}</p><p class="course">${icon('mortar-board')}${esc(syllabus.title)}</p></div>${cover}${notesFor(0)}</section>
${slides.join('\n')}
</div></div>
<a class="back" href="../${lessonUrl(l)}" title="Вернуться к тексту урока (Esc)">${icon('arrow-left')}Текст урока <kbd>Esc</kbd></a>
<script src="../assets/vendor/reveal/reveal.js"></script>
<script src="../assets/vendor/reveal/plugin/notes.js"></script>
<script src="../assets/slides.js"></script>
</body>
</html>`;
  write(path.join(OUT, slidesUrl(l)), html);
}

// Просмотрщик сценария: слева разделы сценария, справа живой слайд, который следует за текущим разделом
// Отчёт по заданиям: ответы из полей :::answer и отметки чек-листов собираются в ZIP (course.js → report)
function reportBox(l) {
  // file — имя архива без .zip, heading — что в заголовке README; по умолчанию — урок
  const nn = String(l.n).padStart(2, '0');
  return `<section class="Box report-box" data-report="${l.slug}" data-lesson-n="${l.n}" data-lesson-title="${esc(l.title)}" data-report-file="${esc(l.file || `lesson-${nn}-report`)}" data-report-heading="${esc(l.heading || `урок ${l.n} «${l.title}»`)}">
<div class="Box-header">${icon('package', 'mr-2')}Отчёт для ментора</div>
<div class="Box-body">
<p>Ответы из полей выше сохраняются в этом браузере сами — можно закрыть страницу и вернуться. Когда закончите, сформируйте отчёт и отправьте архив ментору.</p>
<p class="report-where">${icon('info')}<span>Ответы хранятся отдельно для каждого способа открыть курс: файлом, через <code>npm start</code> или по ссылке на GitHub Pages. Открывайте курс всегда одинаково.</span></p>
<label class="report-name-label" for="report-name">Ваше имя в отчёте</label>
<input id="report-name" class="report-name" type="text" autocomplete="name" placeholder="Мария">
<div class="report-summary" aria-live="polite"></div>
</div>
<div class="Box-footer report-foot"><button type="button" class="btn btn-primary report-make">${icon('download')}<span>Сформировать отчёт</span></button><button type="button" class="btn report-clear">${icon('trash')}<span>Очистить ответы урока</span></button></div>
</section>`;
}

// Для каждого слайда — где он лежит в исходниках и какой раздел текста урока с ним связан.
// Нужно для промпта с правками из сценария: сразу видно, какие строки и файлы менять
function slideSources(l, script) {
  const rel = (f) => path.relative(path.resolve(ROOT, '..'), f);
  const slidesFile = path.join(l.dir, 'slides.md');
  const lessonFile = path.join(l.dir, 'lesson.md');
  const scriptLines = readSrc(script.file).split('\n');
  const scriptAt = []; scriptLines.forEach((line, i) => { if (/^## /.test(line)) scriptAt.push(i + 1); });
  // разделы текста урока: заголовок, строка, какие схемы и картинки внутри
  const sections = []; let cur = null;
  if (fs.existsSync(lessonFile)) {
    readSrc(lessonFile).split('\n').forEach((line, i) => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = { title: h[1].trim(), line: i + 1, ids: new Set() }; sections.push(cur); return; }
      if (!cur) return;
      const d = line.match(/^:::diagram\s+id=(\S+)/); if (d) cur.ids.add(`use:${d[1]}`);
      for (const m of line.matchAll(/img\/[\w.-]+/g)) cur.ids.add(m[0]);
    });
  }
  const words = (t) => new Set(t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter((w) => w.length > 2));
  const similar = (a, b) => { const A = words(a), B = words(b); const both = [...A].filter((w) => B.has(w)).length; return both / Math.max(1, Math.min(A.size, B.size)); };
  const out = [{ slideLine: 1, scriptLine: scriptAt[0], title: l.title, related: null }];
  if (!fs.existsSync(slidesFile)) return out;
  const lines = readSrc(slidesFile).split('\n');
  let start = 0;
  const flush = (end) => {
    const chunk = lines.slice(start, end).join('\n');
    if (!chunk.trim()) return;
    const title = (chunk.match(/^## (.+)/m) || [])[1] || chunk.replace(/<!--.*?-->/g, '').trim().split('\n')[0];
    const refs = [...chunk.matchAll(/^:::use\s+(\S+)/gm)].map((m) => `use:${m[1]}`).concat([...chunk.matchAll(/img\/[\w.-]+/g)].map((m) => m[0]));
    let sec = sections.find((x) => refs.some((r) => x.ids.has(r)));
    if (!sec) { const best = sections.map((x) => [similar(title, x.title), x]).sort((a, b) => b[0] - a[0])[0]; if (best && best[0] >= 0.5) sec = best[1]; }
    const firstLine = start + 1 + lines.slice(start, end).findIndex((x) => x.trim());
    out.push({ slideLine: firstLine, scriptLine: scriptAt[out.length], title, related: sec ? { title: sec.title, line: sec.line } : null });
  };
  lines.forEach((line, i) => { if (/^---\s*$/.test(line)) { flush(i); start = i + 1; } });
  flush(lines.length);
  return out.map((x) => ({ ...x, files: { slides: rel(slidesFile), script: rel(script.file), lesson: rel(lessonFile) } }));
}

function buildScript(l, script) {
  const ctx = newCtx(path.relative(ROOT, script.file), `${l.slug}-script`, l.dir, l.slug, `../lessons/${l.slug}/`);
  const total = script.sections.reduce((a, x) => a + x.minutes, 0);
  const src = l.hasSlides ? slideSources(l, script) : [];
  let clock = 0;
  const cards = script.sections.map((x, i) => {
    const s = src[i] || {};
    const srcAttr = ` data-src="${esc(JSON.stringify({ slideLine: s.slideLine, scriptLine: s.scriptLine, related: s.related }))}"`;
    const from = clock; clock += x.minutes;
    const link = l.hasSlides ? `<a class="btn btn-sm" href="../${slidesUrl(l)}#/${i}" target="_blank" title="Открыть слайд ${i + 1}">${icon('link-external')}</a>` : '';
    return `<section class="Box script-card" id="slide-${i + 1}" data-slide="${i}" data-title="${esc(x.title)}"${srcAttr}>
<header class="Box-header script-card-head"><span class="Counter">${i + 1}</span><h2 class="script-card-title">${md.renderInline(x.title, ctx.env)}</h2><span class="script-time" title="С ${from}-й по ${clock}-ю минуту">${icon('clock')}${x.minutes} мин</span>${link}</header>
<div class="Box-body markdown-body">${render(x.body, ctx)}</div>
<div class="review"><button type="button" class="btn btn-sm review-toggle" aria-expanded="false">${icon('comment')}<span>Комментарий к слайду</span></button><textarea class="review-text" rows="3" placeholder="Что поправить на этом слайде или в связанном тексте урока" hidden aria-label="Комментарий к слайду ${i + 1}"></textarea></div></section>`;
  }).join('\n');
  const rel = '../';
  const body = `<article class="page page-wide" data-script="${l.slug}">
<nav class="crumbs" aria-label="Путь"><a href="../index.html#${l.module.id}">${esc(modTitle(l.module))}</a><span aria-hidden="true">/</span><a href="../${lessonUrl(l)}">Урок ${l.n}</a><span aria-hidden="true">/</span><span>Сценарий</span></nav>
<h1 class="page-title">Сценарий к слайдам</h1>
<p class="lead">${esc(l.title)}. Что на каждом слайде и что рассказать.</p>
<div class="page-meta"><span class="meta-item">${icon('clock')}${total} мин</span><span class="meta-item">${icon('versions')}${script.sections.length} ${plural(script.sections.length, 'слайд', 'слайда', 'слайдов')}</span>
${l.hasSlides ? `<a class="btn btn-sm btn-primary" href="../${slidesUrl(l)}" target="_blank">${icon('device-desktop')}<span>Открыть слайды</span></a>` : ''}
<a class="btn btn-sm" href="${l.slug}.md" download>${icon('download')}<span>Скачать .md</span></a>
<a class="btn btn-sm" href="../${lessonUrl(l)}">${icon('book')}<span>Текст урока</span></a>
<a class="btn btn-sm" href="#review">${icon('comment-discussion')}<span>Правки к занятию</span></a></div>
${script.intro ? `<div class="markdown-body script-intro"><div class="markdown-alert markdown-alert-note"><p class="markdown-alert-title">${icon('info', 'mr-2')}Перед занятием</p>${render(script.intro, ctx)}</div></div>` : ''}
<div class="script-view">
<div class="script-cards">${cards}
<section class="Box review-box" id="review" data-review="${l.slug}" data-lesson-n="${l.n}" data-lesson-title="${esc(l.title)}" data-files="${esc(JSON.stringify(src[0]?.files || {}))}">
<div class="Box-header">${icon('comment-discussion', 'mr-2')}Правки к занятию</div>
<div class="Box-body">
<label class="review-general-label" for="review-general">Общий комментарий к занятию</label>
<textarea id="review-general" class="review-general" rows="4" placeholder="Темп, порядок тем, чего не хватает, что лишнее"></textarea>
<p class="review-summary" aria-live="polite"></p>
</div>
<div class="Box-footer review-foot"><button type="button" class="btn btn-primary review-download">${icon('download')}<span>Скачать промпт на исправления</span></button><button type="button" class="btn review-clear">${icon('trash')}<span>Очистить комментарии</span></button></div>
</section>
</div>
${l.hasSlides ? `<aside class="script-preview" aria-label="Текущий слайд"><div class="script-preview-box"><iframe src="../${slidesUrl(l)}?preview#/0" title="Слайд" loading="lazy" tabindex="-1"></iframe></div><p class="script-preview-hint">Слайд <b data-current>1</b> из ${script.sections.length}. Клавиши <kbd>↑</kbd> <kbd>↓</kbd> или <kbd>J</kbd> <kbd>K</kbd> — соседний раздел. Откройте слайды в соседней вкладке или окне — сценарий будет листаться вместе с ними.</p></aside>` : ''}
</div>
</article>`;
  write(path.join(OUT, `scripts/${l.slug}.html`), layout({ title: `Сценарий: ${l.n}. ${l.title}`, rel, current: l.slug, body, terms: [...ctx.env.terms] }));
  write(path.join(OUT, `scripts/${l.slug}.md`), readSrc(script.file));
}

function buildSimplePage({ file, outRel, current, title }) {
  const { fm, body: src } = parseFrontmatter(readSrc(file), path.relative(ROOT, file));
  const ctx = newCtx(path.relative(ROOT, file), current, path.dirname(file));
  const content = renderPage(src, ctx);
  const rel = outRel.includes('/') ? '../' : '';
  const t = fm.title || title;
  const body = `<article class="page"><h1 class="page-title">${esc(t)}</h1>${fm.subtitle ? `<p class="lead">${esc(fm.subtitle)}</p>` : ''}<div class="markdown-body">${content}</div></article>`;
  write(path.join(OUT, outRel), layout({ title: t, rel, current, body, toc: tocHtml(ctx.env), terms: [...ctx.env.terms] }));
  searchIndex.push({ t, u: outRel, h: ctx.env.headings.map((h) => [h.title, h.slug]), x: plain(content).slice(0, 3000) });
}

function buildProject(p) {
  if (p.ready) return buildProjectPage(p);
  const body = `<article class="page"><nav class="crumbs" aria-label="Путь"><a href="../index.html#${p.module.id}">${esc(modTitle(p.module))}</a><span aria-hidden="true">/</span><span>Проект после урока ${p.afterLesson}</span></nav><h1 class="page-title">${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p><div class="markdown-body"><div class="markdown-alert markdown-alert-note"><p class="markdown-alert-title">${icon('info', 'mr-2')}Описание проекта готовится</p><p>Появится вместе с уроками модуля «${esc(p.module.title)}».</p></div></div></article>`;
  write(path.join(OUT, projectUrl(p)), layout({ title: p.title, rel: '../', current: p.id, body }));
}

// Страница проекта: src/projects/<id>.md, картинки — src/projects/img/<id>/, поля ответов и отчёт как в уроках
function buildProjectPage(p) {
  const dir = path.join(SRC, 'projects');
  const file = path.join(dir, `${p.id}.md`);
  const imgDir = path.join(dir, 'img', p.id);
  if (fs.existsSync(imgDir)) fs.cpSync(imgDir, path.join(OUT, 'projects', 'img', p.id), { recursive: true });
  const { fm, body: src } = parseFrontmatter(readSrc(file), path.relative(ROOT, file));
  const ctx = newCtx(path.relative(ROOT, file), p.id, dir, p.id, '');
  const content = renderPage(src, ctx);
  const n = syllabus.modules.filter((m) => m.project).indexOf(p.module) + 1;
  const box = (title, ic, items) => `<section class="Box intro-box"><h2 class="Box-header">${icon(ic, 'mr-2')}${title}</h2><ul class="Box-body">${items.map((g) => `<li>${md.renderInline(g, ctx.env)}</li>`).join('')}</ul></section>`;
  const intro = fm.goals || fm.summary ? `<div class="intro-boxes">${fm.goals ? box('Что получится', 'goal', fm.goals) : ''}${fm.summary ? box('Коротко', 'zap', fm.summary) : ''}</div>` : '';
  const meta = fm.duration ? `<div class="page-meta"><span class="meta-item">${icon('clock')}${esc(fm.duration)}</span></div>` : '';
  const report = ctx.taskN ? reportBox({ slug: p.id, n: `P${n}`, title: p.title, file: `project-${p.id}-report`, heading: `проект «${p.title}»` }) : '';
  const body = `<article class="page" data-lesson-page="${p.id}">
<nav class="crumbs" aria-label="Путь"><a href="../index.html#${p.module.id}">${esc(modTitle(p.module))}</a><span aria-hidden="true">/</span><span>Проект после урока ${p.afterLesson}</span></nav>
<h1 class="page-title">${esc(p.title)}</h1>
<p class="lead">${esc(p.summary)}</p>
${meta}
${intro}
<div class="markdown-body">${content}${report}</div>
</article>`;
  write(path.join(OUT, projectUrl(p)), layout({ title: p.title, rel: '../', current: p.id, body, toc: tocHtml(ctx.env), terms: [...ctx.env.terms] }));
  searchIndex.push({ t: `Проект: ${p.title}`, u: projectUrl(p), h: ctx.env.headings.map((h) => [h.title, h.slug]), x: plain(content).slice(0, 4000) });
}

function buildGlossary() {
  const env = { file: 'glossary.yml', terms: new Set() };
  const items = Object.entries(glossary).sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([k, g]) =>
    `<div class="Box-row gl-item" id="${esc(slugify(k))}"><dt>${esc(g.term)}${g.en ? ` <span class="gl-en">${esc(g.en)}</span>` : ''}</dt><dd>${md.renderInline(g.def, env)}</dd></div>`).join('');
  const body = `<article class="page"><h1 class="page-title">Глоссарий</h1><p class="lead">Все термины курса. В тексте уроков они подчёркнуты пунктиром — нажмите на слово, чтобы увидеть определение.</p><dl class="Box glossary">${items}</dl></article>`;
  write(path.join(OUT, 'glossary.html'), layout({ title: 'Глоссарий', rel: '', current: 'glossary', body }));
  searchIndex.push({ t: 'Глоссарий', u: 'glossary.html', h: Object.entries(glossary).map(([k, g]) => [g.term, slugify(k)]), x: '' });
}

function buildHome() {
  const ready = lessons.filter((l) => l.ready).length;
  const mods = syllabus.modules.map((m) => {
    const ls = lessons.filter((l) => l.module === m);
    const rows = ls.map((l) => `<li class="Box-row home-row"><a href="${lessonUrl(l)}" data-lesson="${l.slug}" class="home-link${l.ready ? '' : ' planned'}">
<span class="home-status" aria-hidden="true"><span class="home-n">${l.n}</span>${icon('check-circle-fill', 'home-check')}</span>
<span class="home-text"><span class="home-t">${esc(l.title)}</span><span class="home-sub">${esc(l.subtitle)}</span></span>
${l.ready ? '' : '<span class="Label">Скоро</span>'}</a></li>`);
    if (m.project) {
      const p = projects.find((x) => x.id === m.project.id);
      rows.push(`<li class="Box-row home-row is-project"><a href="${projectUrl(p)}" class="home-link${p.ready ? '' : ' planned'}"><span class="home-status" aria-hidden="true">${icon('project')}</span><span class="home-text"><span class="home-t">${esc(p.title)}</span><span class="home-sub">${esc(p.summary)}</span></span><span class="Label Label--done">Проект</span></a></li>`);
    }
    return `<section class="Box home-mod" id="${m.id}"><h2 class="Box-header home-mod-head"><span>${esc(modTitle(m))}</span><span class="Counter">${ls.length} ${plural(ls.length, 'урок', 'урока', 'уроков')}</span></h2><ul>${rows.join('')}</ul></section>`;
  }).join('');
  const body = `<article class="page home">
<h1 class="page-title">${esc(syllabus.title)}</h1>
<p class="lead">${esc(syllabus.tagline)}</p>
<div class="home-actions"><a class="btn btn-primary btn-lg" href="${lessonUrl(lessons[0])}" data-continue>Начать с урока 1</a><a class="btn btn-lg" href="pages/how-to-learn.html">Как устроен курс</a></div>
<div class="home-progress"><div class="progress-bar" aria-hidden="true"><span data-progress-bar></span></div><span data-progress>Пройдено 0 из ${lessons.length}</span><span class="muted">Опубликовано уроков: ${ready} из ${lessons.length}</span></div>
${mods}
</article>`;
  write(path.join(OUT, 'index.html'), layout({ title: 'Карта курса', rel: '', current: 'home', body }));
}

// ---------- сборка ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
process.on('exit', () => fs.rmSync(OUT, { recursive: true, force: true }));
write(path.join(OUT, '.nojekyll'), '');

for (const f of fs.readdirSync(ASSETS)) copy(path.join(ASSETS, f), path.join(OUT, 'assets', f));
for (const f of ['reset.css', 'reveal.css', 'reveal.js', 'plugin/notes.js']) copy(path.join(NM, 'reveal.js/dist', f), path.join(OUT, 'assets/vendor/reveal', f));
copy(path.join(NM, 'github-markdown-css/github-markdown-light.css'), path.join(OUT, 'assets/vendor/github-markdown-light.css'));
const PRIM = path.join(NM, '@primer/primitives/dist/css');
write(path.join(OUT, 'assets/vendor/primer-primitives.css'), [
  'base/size/size.css', 'base/typography/typography.css', 'functional/size/border.css', 'functional/size/radius.css',
  'functional/size/size.css', 'functional/typography/typography.css', 'functional/themes/light.css',
].map((f) => `/* @primer/primitives: ${f} */\n${read(path.join(PRIM, f))}`).join('\n'));

lessons.forEach(buildLesson);
projects.forEach(buildProject);
buildGlossary();
for (const f of fs.existsSync(path.join(SRC, 'pages')) ? fs.readdirSync(path.join(SRC, 'pages')) : []) {
  if (f.endsWith('.md')) buildSimplePage({ file: path.join(SRC, 'pages', f), outRel: `pages/${f.replace(/\.md$/, '')}.html`, current: f.replace(/\.md$/, ''), title: f });
}
buildHome();
write(path.join(OUT, 'assets/search-index.js'), `window.SEARCH_INDEX=${JSON.stringify(searchIndex)};\n`);

// подмена docs/ готовой сборкой
const OLD = `${FINAL}.old-${process.pid}`;
for (let attempt = 0; ; attempt++) {
  try {
    if (fs.existsSync(FINAL)) fs.renameSync(FINAL, OLD);
    fs.renameSync(OUT, FINAL);
    break;
  } catch (e) {
    // Windows может ненадолго держать папку занятой — пробуем ещё раз
    if (attempt >= 20) throw e;
    if (!fs.existsSync(FINAL) && fs.existsSync(OLD)) fs.renameSync(OLD, FINAL);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
}
fs.rmSync(OLD, { recursive: true, force: true });

console.log(`Готово уроков: ${lessons.filter((l) => l.ready).length} из ${lessons.length}, презентаций: ${lessons.filter((l) => l.hasSlides).length} → docs/index.html`);
if (warnings.length) {
  console.warn(`\nПредупреждения (${warnings.length}):\n- ${warnings.join('\n- ')}`);
  process.exitCode = 1;
}
