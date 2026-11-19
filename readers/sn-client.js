// Client for sn-daemon.js: starts the helper on first use and sends it read-only GET requests.
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const SOCKET_PATH = path.join(os.homedir(), '.servicenow-reader', 'daemon.sock');
const DAEMON = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sn-daemon.js');
const REQUEST_TIMEOUT_MS = 6 * 60 * 1000;

function request(payload) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(SOCKET_PATH);
    let buffer = '';
    socket.setTimeout(REQUEST_TIMEOUT_MS, () => socket.destroy(new Error('ServiceNow helper timed out.')));
    socket.on('connect', () => socket.write(`${JSON.stringify(payload)}\n`));
    socket.on('data', (chunk) => { buffer += chunk; });
    socket.on('end', () => {
      try { resolve(JSON.parse(buffer)); } catch { reject(new Error('Invalid reply from ServiceNow helper.')); }
    });
    socket.on('error', reject);
  });
}

async function requestWithDaemon(payload) {
  try {
    return await request(payload);
  } catch (error) {
    if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error;
  }
  spawn(process.execPath, [DAEMON], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 40; i += 1) {
    await delay(250);
    try {
      return await request(payload);
    } catch (error) {
      if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error;
    }
  }
  throw new Error('Could not start the ServiceNow helper.');
}

export async function snGet(apiPath, { binary = false } = {}) {
  const reply = await requestWithDaemon({ apiPath, binary });
  if (!reply.ok) throw new Error(reply.error);
  return binary ? Buffer.from(reply.data, 'base64') : reply.data;
}

export async function snStop() {
  try {
    return (await request({ stop: true })).data;
  } catch (error) {
    if (['ENOENT', 'ECONNREFUSED'].includes(error.code)) return { stopped: false, reason: 'not running' };
    throw error;
  }
}
