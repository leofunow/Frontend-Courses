// Проверка ссылок в docs/: внутренние файлы и якоря существуют. Адреса слайдов reveal (#/5) — не якоря, их не проверяем.
// npm run check:links -- --external  — дополнительно проверить внешние ссылки (нужен интернет).
import fs from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(import.meta.dirname, '..', 'docs');
const external = process.argv.includes('--external');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);

const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...fs.readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(file);
};

const problems = [];
const externals = new Map();
// Сайты, которые отвечают роботам 403, хотя в браузере открываются. Их проверяем глазами
const BOT_BLOCKED = ['metanit.com'];
for (const file of walk(DOCS)) {
  const rel = path.relative(DOCS, file);
  const html = fs.readFileSync(file, 'utf8').replace(/<textarea[\s\S]*?<\/textarea>/g, '').replace(/<pre[\s\S]*?<\/pre>/g, '');
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    const url = raw.replace(/&amp;/g, '&');
    if (/^(mailto:|data:|javascript:)/.test(url)) continue;
    if (/^https?:/.test(url)) { if (!externals.has(url)) externals.set(url, rel); continue; }
    const [pq, hash] = url.split('#');
    const p = pq.split('?')[0];
    const target = p ? path.resolve(path.dirname(file), decodeURIComponent(p)) : file;
    if (!fs.existsSync(target)) { problems.push(`${rel}: нет файла ${url}`); continue; }
    if (fs.statSync(target).isDirectory()) { problems.push(`${rel}: ссылка на папку ${url} не откроется через file:// — укажите index.html`); continue; }
    if (hash && !hash.startsWith('/') && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) problems.push(`${rel}: нет якоря #${decodeURIComponent(hash)} в ${path.relative(DOCS, target)}`);
    if (attr === 'src' && /^\//.test(url)) problems.push(`${rel}: абсолютный путь ${url} не работает через file://`);
  }
}

if (external) {
  const list = [...externals];
  await Promise.all(list.map(async ([url, from]) => {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 link-check' } });
      if (res.status === 403 && BOT_BLOCKED.includes(new URL(url).hostname)) return;
      if (res.status >= 400) problems.push(`${from}: ${url} → ${res.status}`);
    } catch (e) { problems.push(`${from}: ${url} → ${e.cause?.code || e.message}`); }
  }));
}

if (problems.length) {
  console.log(`Проблемы со ссылками (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Ссылки в порядке. Внешних ссылок: ${externals.size}${external ? ', все отвечают' : ' (не проверялись, запустите с --external)'}`);
