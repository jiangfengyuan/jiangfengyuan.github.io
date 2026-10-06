import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};
http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    let file = path.join(root, name);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, 'index.html');
    let status = 200;
    if (!fs.existsSync(file)) {
      file = path.join(root, '404.html');
      status = 404;
    }
    res.writeHead(status, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4330, '127.0.0.1', () => console.log('Static preview: http://127.0.0.1:4330'));
