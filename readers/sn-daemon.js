// Background helper that keeps one ServiceNow browser session in memory (its session cookie
// is not persisted to disk). Serves read-only GET requests over a private Unix socket and exits
// after IDLE_EXIT_MS without requests.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { snGet, resetPage } from './servicenow-playwright.js';

const SOCKET_DIR = path.join(os.homedir(), '.servicenow-reader');
const SOCKET_PATH = path.join(SOCKET_DIR, 'daemon.sock');
const IDLE_EXIT_MS = 4 * 60 * 60 * 1000;

let queue = Promise.resolve();
let idleTimer;

async function shutdown() {
  await resetPage();
  fs.rmSync(SOCKET_PATH, { force: true });
  process.exit(0);
}

function touch() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(shutdown, IDLE_EXIT_MS);
}

fs.mkdirSync(SOCKET_DIR, { recursive: true, mode: 0o700 });
fs.chmodSync(SOCKET_DIR, 0o700);
fs.rmSync(SOCKET_PATH, { force: true });

const server = net.createServer((socket) => {
  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk;
    const newline = buffer.indexOf('\n');
    if (newline < 0) return;
    const line = buffer.slice(0, newline);
    touch();
    // Requests are serialized so only one sign-in can ever be in progress.
    queue = queue.then(async () => {
      let reply;
      try {
        const { apiPath, binary, stop } = JSON.parse(line);
        if (stop) {
          socket.end(`${JSON.stringify({ ok: true, data: { stopped: true } })}\n`);
          await shutdown();
        }
        reply = { ok: true, data: await snGet(apiPath, { binary: Boolean(binary) }) };
      } catch (error) {
        reply = { ok: false, error: error.message };
      }
      socket.end(`${JSON.stringify(reply)}\n`);
    });
  });
  socket.on('error', () => {});
});

server.listen(SOCKET_PATH, () => {
  fs.chmodSync(SOCKET_PATH, 0o600);
  touch();
});
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
