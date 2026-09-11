// Схемы из YAML → HTML. Никаких координат: блоки — это HTML-элементы,
// которые растягиваются под текст и переносят строки. Текст не может «выехать» за рамку.
//
// Типы схем:
//   flow      — ряд блоков со стрелками (на узком экране становится колонкой)
//   rows      — несколько flow друг под другом, у каждого подпись слева
//   sequence  — диаграмма последовательности: участники-колонки и сообщения между ними
//   tree      — дерево папок и файлов: { name, note, mark, dir, items }
//
// Элементы flow:
//   узел:     { title, text, code, badge, kind, icon, step }
//   стрелка:  { arrow: right | left | both | pair, label, back, step }
//   группа:   { group: заголовок, text, kind, cols, items: [узлы], badge, step }
// kind: plain | front | back | db | accent | muted

import octicons from '@primer/octicons';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const KIND_ICON = { front: 'browser', back: 'server', db: 'database' };
const KINDS = new Set(['plain', 'front', 'back', 'db', 'accent', 'muted']);

export function icon(name, cls = '') {
  const o = octicons[name];
  if (!o) throw new Error(`Нет иконки octicons «${name}»`);
  return o.toSVG({ width: 16, height: 16, class: `octicon ${cls}`.trim() });
}

// Разрешённые поля. Лишнее поле почти всегда значит опечатку или запятую
// без кавычек в YAML: {text: готовит, гостю не видна} → поле «гостю не видна».
const FIELDS = {
  node: ['title', 'text', 'code', 'badge', 'kind', 'icon', 'step', 'id'],
  arrow: ['arrow', 'label', 'back', 'step'],
  group: ['group', 'text', 'kind', 'cols', 'items', 'badge', 'icon', 'step'],
  row: ['label', 'sub', 'items', 'note', 'step'],
  spec: ['type', 'caption', 'steps', 'items', 'rows', 'actors', 'messages'],
  msg: ['from', 'to', 'label', 'code', 'kind', 'dashed', 'both', 'step'],
  note: ['note', 'at', 'code', 'kind', 'step'],
  treeItem: ['name', 'note', 'mark', 'dir', 'items', 'step'],
};

export function createDiagramRenderer({ inline, onError }) {
  const check = (type, x) => {
    for (const k of Object.keys(x || {})) {
      if (!FIELDS[type].includes(k)) onError(`лишнее поле «${k}» в ${JSON.stringify(x)}. Если в тексте есть запятая или двоеточие — возьмите его в кавычки`);
    }
  };
  const ic = (name, cls) => { try { return icon(name, cls); } catch (e) { onError(e.message); return ''; } };
  const t = (s) => {
    if (s == null) return '';
    const str = String(s);
    // атрибут="значение" вне обратных кавычек: типограф превратит кавычки в «ёлочки»
    if (/\w="[^"]*"/.test(str.replace(/`[^`]*`/g, ''))) onError(`код без обратных кавычек: ${str}. Оберните в \`…\``);
    return inline(str);
  };
  const stepAttr = (x) => (x.step != null ? ` data-step="${Number(x.step)}"` : '');
  const kindOf = (x) => {
    const k = x.kind || 'plain';
    if (!KINDS.has(k)) onError(`неизвестный kind «${k}»`);
    return k;
  };

  function node(n) {
    check('node', n);
    const kind = kindOf(n);
    const icn = n.icon === false ? '' : n.icon || KIND_ICON[kind];
    const badge = n.badge != null ? `<span class="dg-badge" title="Урок">${esc(n.badge)}</span>` : '';
    const head = n.title != null || badge
      ? `<div class="dg-title">${icn ? ic(icn, 'dg-icon') : ''}<span class="dg-name">${t(n.title)}</span>${badge}</div>`
      : '';
    const text = n.text != null ? `<div class="dg-text">${t(n.text)}</div>` : '';
    const code = n.code != null ? `<pre class="dg-code">${esc(String(n.code).replace(/\n$/, ''))}</pre>` : '';
    return `<div class="dg-node k-${kind}"${stepAttr(n)}>${head}${text}${code}</div>`;
  }

  function group(g) {
    check('group', g);
    const kind = kindOf(g);
    const icn = g.icon === false ? '' : g.icon || KIND_ICON[kind];
    const title = g.group ? `<div class="dg-group-title">${icn ? ic(icn, 'dg-icon') : ''}<span>${t(g.group)}</span></div>` : '';
    const text = g.text != null ? `<div class="dg-text">${t(g.text)}</div>` : '';
    const items = (g.items || []).map((x) => (x.items ? group(x) : node({ ...x, icon: x.icon ?? false }))).join('');
    return `<div class="dg-group k-${kind}" style="--cols:${Number(g.cols) || 1}"${stepAttr(g)}>${title}${text}<div class="dg-group-items">${items}</div></div>`;
  }

  function arrow(a) {
    check('arrow', a);
    const dir = a.arrow === true ? 'right' : a.arrow;
    if (!['right', 'left', 'both', 'pair'].includes(dir)) onError(`неизвестная стрелка «${a.arrow}»`);
    if (dir === 'pair') {
      return `<div class="dg-arrow pair"${stepAttr(a)}>
<div class="dg-link right"><span class="dg-label">${t(a.label)}</span><span class="dg-line"></span></div>
<div class="dg-link left"><span class="dg-line"></span><span class="dg-label">${t(a.back)}</span></div></div>`;
    }
    return `<div class="dg-arrow${a.label == null ? ' bare' : ''}"${stepAttr(a)}><div class="dg-link ${dir}">${a.label != null ? `<span class="dg-label">${t(a.label)}</span>` : ''}<span class="dg-line"></span></div></div>`;
  }

  function flowItems(items) {
    return (items || []).map((x) => (x.arrow ? arrow(x) : x.items ? group(x) : node(x))).join('');
  }

  function flow(spec) {
    return `<div class="dg-flow">${flowItems(spec.items)}</div>`;
  }

  function rows(spec) {
    return `<div class="dg-rows">${(spec.rows || []).map((r) => check('row', r) || `<div class="dg-row"${stepAttr(r)}>
<div class="dg-row-label"><b>${t(r.label)}</b>${r.sub ? `<span>${t(r.sub)}</span>` : ''}</div>
<div class="dg-row-body"><div class="dg-flow">${flowItems(r.items)}</div>${r.note ? `<div class="dg-note">${t(r.note)}</div>` : ''}</div>
</div>`).join('')}</div>`;
  }

  function sequence(spec) {
    const actors = spec.actors || [];
    const idx = Object.fromEntries(actors.map((a, i) => [a.id, i]));
    const msgs = spec.messages || [];
    const n = actors.length;
    const head = actors.map((a, i) => `<div class="dg-actor" style="grid-column:${i + 1};grid-row:1">${node(a)}</div>`).join('');
    const lifelines = actors.map((_, i) => `<div class="dg-lifeline" style="grid-column:${i + 1};grid-row:2 / span ${Math.max(msgs.length, 1)}"></div>`).join('');
    const body = msgs.map((m, r) => {
      const row = r + 2;
      check(m.note != null ? 'note' : 'msg', m);
      if (m.note != null) {
        const c = idx[m.at];
        if (c == null) onError(`sequence: нет участника «${m.at}»`);
        return `<div class="dg-seq-note k-${kindOf(m)}" style="grid-column:${c + 1};grid-row:${row}"${stepAttr(m)}>${t(m.note)}${m.code != null ? `<pre class="dg-code">${esc(m.code)}</pre>` : ''}</div>`;
      }
      const a = idx[m.from], b = idx[m.to];
      if (a == null || b == null) onError(`sequence: нет участника «${a == null ? m.from : m.to}»`);
      const lo = Math.min(a, b), hi = Math.max(a, b), span = hi - lo + 1;
      const dir = m.both ? 'both' : a < b ? 'right' : 'left';
      const label = m.code != null ? `<code>${esc(m.code)}</code>` : '';
      return `<div class="dg-msg k-${kindOf(m)}${m.dashed ? ' dashed' : ''}" style="grid-column:${lo + 1} / span ${span};grid-row:${row};--span:${span}"${stepAttr(m)}>
<div class="dg-link ${dir}"><span class="dg-label">${t(m.label)}${label ? ` ${label}` : ''}</span><span class="dg-line"></span></div></div>`;
    }).join('');
    return `<div class="dg-seq" style="--n:${n}">${head}${lifelines}${body}</div>`;
  }

  // дерево папок: папка — если есть items или dir: true; mark — подсветить строку
  function treeItems(items) {
    return `<ul>${(items || []).map((x) => {
      check('treeItem', x);
      const isDir = x.dir || Array.isArray(x.items);
      return `<li${stepAttr(x)}><span class="dg-tree-row${x.mark ? ' mark' : ''}">${ic(isDir ? 'file-directory-fill' : 'file', isDir ? 'dg-tree-dir' : 'dg-tree-file')}<span class="dg-tree-name">${esc(x.name)}${isDir ? '/' : ''}</span>${x.note != null ? `<span class="dg-tree-note">${t(x.note)}</span>` : ''}</span>${x.items ? treeItems(x.items) : ''}</li>`;
    }).join('')}</ul>`;
  }
  function tree(spec) {
    return `<div class="dg-tree">${treeItems(spec.items)}</div>`;
  }

  const TYPES = { flow, rows, sequence, tree };

  return function render(spec) {
    check('spec', spec);
    const fn = TYPES[spec.type];
    if (!fn) { onError(`неизвестный тип схемы «${spec.type}»`); return ''; }
    return `<div class="dg dg-${spec.type}-wrap">${fn(spec)}</div>`;
  };
}
