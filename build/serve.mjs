// Локальный просмотр курса: npm start
// Собирает сайт, запускает сервер на http://localhost:3000 и пересобирает при изменении файлов.
// Открытые страницы обновляются сами. Порт можно сменить: $env:PORT=4000; npm start
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, exec } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const WATCH = ['src', 'assets', 'build'].map((d) => path.join(ROOT, d));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};
// Скрипт автообновления добавляется только при просмотре, в docs/ его нет.
// Страница раз в секунду спрашивает номер сборки коротким запросом. Постоянное соединение (EventSource)
// здесь не годится: Chrome держит не больше 6 соединений на адрес, и вкладки слайдов, сценария,
// превью и заметок занимали их все — следующие переходы зависали.
// Опрашивает только окно верхнего уровня: iframe обновятся вместе с ним.
const RELOAD = `<script>(function () {
  if (window.top !== window) return;
  var seen = null;
  setInterval(function () {
    fetch('/__version', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (v) {
      if (seen === null) seen = v; else if (v !== seen) location.reload();
    }).catch(function () {});
  }, 1000);
})();</script>`;

let version = String(Date.now());
let building = false;
let again = false;

function build() {
  if (building) { again = true; return; }
  building = true;
  const started = Date.now();
  const child = spawn(process.execPath, [path.join(ROOT, 'build', 'build.mjs')], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => {
    building = false;
    const time = new Date().toLocaleTimeString('ru-RU');
    if (code === 0) console.log(`[${time}] Собрано за ${Date.now() - started} мс`);
    else console.log(`[${time}] Сборка с ошибками:\n${out.trim()}\n`);
    version = String(Date.now());
    if (again) { again = false; build(); }
  });
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (url === '/__version') {
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }).end(version);
    return;
  }
  let file = path.join(DOCS, url);
  if (!file.startsWith(DOCS)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(`<p>Нет страницы ${url}. <a href="/">На главную</a></p>${RELOAD}`);
    return;
  }
  const ext = path.extname(file);
  let body = fs.readFileSync(file);
  if (ext === '.html') body = body.toString().replace('</body>', `${RELOAD}</body>`);
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(body);
});

function listen(port) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE') { console.log(`Порт ${port} занят, пробую ${port + 1}`); listen(port + 1); }
    else throw e;
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`\nКурс открыт: ${url}\nПравьте файлы в src/ — страница обновится сама. Остановить: Ctrl+C (на Mac тоже Control, не Cmd)\n`);
    if (!process.env.NO_OPEN) {
      const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(cmd, () => {});
    }
  });
}

let timer;
for (const dir of WATCH) {
  fs.watch(dir, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 150); });
}

build();
listen(Number(process.env.PORT) || 3000);
