#!/usr/bin/env node
// Read-only ServiceNow CLI (GET only).
//   node sn-query.js incident <INC number> [outDir]
//   node sn-query.js table <table> '<encoded query>' [fields] [limit=20]
//   node sn-query.js attachment <attachment sys_id> <outFile>
//   node sn-query.js stop        (end the in-memory ServiceNow session now)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { snGet, snStop } from './sn-client.js';

const q = encodeURIComponent;

async function table(name, query, fields, limit = 20) {
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Invalid table name: ${name}`);
  const params = [
    `sysparm_query=${q(query || '')}`,
    `sysparm_limit=${Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500)}`,
    'sysparm_display_value=true',
    'sysparm_exclude_reference_link=true',
    fields ? `sysparm_fields=${q(fields)}` : '',
  ].filter(Boolean);
  return (await snGet(`/api/now/table/${name}?${params.join('&')}`)).result;
}

async function incident(number, outDir) {
  if (!/^INC\d+$/i.test(number)) throw new Error(`Not an incident number: ${number}`);
  const [inc] = await table('incident', `number=${number.toUpperCase()}`, '', 1);
  if (!inc) throw new Error(`${number} not found (or not visible to your account).`);
  const sysId = inc.sys_id;
  const fields = Object.fromEntries(Object.entries(inc).filter(([, v]) => v !== '' && v != null));

  const attachments = await table(
    'sys_attachment',
    `table_name=incident^table_sys_id=${sysId}^ORDERBYsys_created_on`,
    'sys_id,file_name,content_type,size_bytes,sys_created_on',
    100,
  );

  const dir = outDir || path.join(os.homedir(), '.copilot', 'incident-triage', number.toUpperCase(), 'attachments');
  fs.mkdirSync(dir, { recursive: true });
  for (const a of attachments) {
    const safeName = `${a.sys_id.slice(0, 8)}_${a.file_name.replace(/[^\w.-]+/g, '_')}`;
    const file = path.join(dir, safeName);
    fs.writeFileSync(file, await snGet(`/api/now/attachment/${a.sys_id}/file`, { binary: true }));
    a.local_path = file;
  }

  return { number: inc.number, sys_id: sysId, fields, attachments };
}

const [cmd, ...args] = process.argv.slice(2);
let exitCode = 0;
try {
  let out;
  if (cmd === 'incident') out = await incident(args[0], args[1]);
  else if (cmd === 'table') out = await table(args[0], args[1], args[2], args[3]);
  else if (cmd === 'stop') out = await snStop();
  else if (cmd === 'attachment') {
    if (!/^[0-9a-f]{32}$/i.test(args[0] || '') || !args[1]) throw new Error('Usage: attachment <sys_id> <outFile>');
    fs.writeFileSync(args[1], await snGet(`/api/now/attachment/${args[0]}/file`, { binary: true }));
    out = { saved: path.resolve(args[1]) };
  } else {
    console.error("Usage: sn-query.js incident <INC> [outDir] | table <table> '<query>' [fields] [limit] | attachment <sys_id> <outFile> | stop");
    process.exit(2);
  }
  console.log(JSON.stringify(out, null, 2));
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  exitCode = 1;
}
process.exit(exitCode);
