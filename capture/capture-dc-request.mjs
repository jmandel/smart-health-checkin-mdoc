#!/usr/bin/env node
// Launches Chromium with CDP, hooks navigator.credentials.get on the verifier page,
// captures the full argument the page passes, and writes it to capture-output.json.
//
// Usage: node capture-dc-request.mjs [url]
//   defaults to https://tools.mattrlabs.com/verify-credentials
//
// After it opens the browser, click whatever button on the page triggers the
// credential request. The script will grab the argument and exit.

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_ARG = process.argv[2] || 'https://tools.mattrlabs.com/verify-credentials';
const PORT    = 9333;
const HERE    = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = HERE;
const OUT     = join(OUT_DIR, 'capture-output.json');
const RAW_LOG = join(OUT_DIR, 'capture-output.raw.log');

// Hook installed before any page script runs.
const HOOK = `
(() => {
  function safeStringify(v) {
    const seen = new WeakSet();
    return JSON.stringify(v, (k, val) => {
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[circular]';
        seen.add(val);
      }
      if (val instanceof ArrayBuffer) return { __arrayBuffer: val.byteLength };
      if (ArrayBuffer.isView && ArrayBuffer.isView(val)) {
        return { __typedArray: val.constructor.name, byteLength: val.byteLength };
      }
      return val;
    }, 2);
  }
  const wrap = (origFn, label) => function(arg) {
    try { console.log('@@DC-CAPTURE@@' + label + '@@' + safeStringify(arg)); }
    catch (e) { console.log('@@DC-CAPTURE-ERR@@' + label + '@@' + e.message); }
    // Forward so any UI flow can proceed; we only need the request shape.
    return origFn.apply(this, arguments);
  };
  if (navigator.credentials && navigator.credentials.get) {
    const o = navigator.credentials.get.bind(navigator.credentials);
    navigator.credentials.get = wrap(o, 'credentials.get');
  }
  if (navigator.identity && navigator.identity.get) {
    const o = navigator.identity.get.bind(navigator.identity);
    navigator.identity.get = wrap(o, 'identity.get');
  }
  console.log('@@DC-CAPTURE-HOOK-INSTALLED@@');
})();
`;

const profileDir = mkdtempSync(join(tmpdir(), 'cdp-cap-'));

console.error(`[capture] starting chromium, profile=${profileDir}`);
const chromium = spawn('chromium', [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=DigitalCredentialsApiOriginTrial', // make sure the unflagged production path is used
  '--enable-features=WebIdentityDigitalCredentials,WebIdentityDigitalCredentialsCreation',
  'about:blank',
], { stdio: ['ignore', 'inherit', 'inherit'] });

const cleanup = () => { try { chromium.kill('SIGTERM'); } catch {} };
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('exit', cleanup);

// Wait for CDP to come up.
async function waitForCdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('CDP did not come up');
}

async function getPageTarget() {
  const r = await fetch(`http://localhost:${PORT}/json`);
  const list = await r.json();
  return list.find(t => t.type === 'page');
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', e => rej(e));
    });
    this.ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      } else if (m.method) {
        const h = this.handlers.get(m.method);
        if (h) h(m.params);
      }
    });
  }
  send(method, params = {}) {
    const i = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(i, { resolve, reject });
      this.ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  on(method, h) { this.handlers.set(method, h); }
}

(async () => {
  const ver = await waitForCdp();
  console.error(`[capture] CDP up: ${ver.Browser}`);
  const target = await getPageTarget();
  if (!target) throw new Error('no page target');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  console.error('[capture] CDP attached');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  let captured = null;
  let hookInstalled = false;
  const lines = [];

  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type !== 'log') return;
    const text = (params.args || [])
      .map(a => a.value !== undefined ? String(a.value) : (a.description || ''))
      .join(' ');
    lines.push(text);
    if (text.startsWith('@@DC-CAPTURE-HOOK-INSTALLED@@')) {
      hookInstalled = true;
      console.error('[capture] hook installed in page');
      return;
    }
    if (text.startsWith('@@DC-CAPTURE-ERR@@')) {
      console.error('[capture] hook error:', text);
      return;
    }
    if (text.startsWith('@@DC-CAPTURE@@')) {
      const [, label, json] = text.split('@@').slice(1); // ['DC-CAPTURE', label, json]
      // text format is @@DC-CAPTURE@@<label>@@<json>
      // handle properly:
      const m = text.match(/^@@DC-CAPTURE@@([^@]+)@@(.*)$/s);
      if (m) {
        captured = { label: m[1], request: JSON.parse(m[2]), at: new Date().toISOString() };
        console.error(`[capture] got call to ${m[1]}`);
        finalize();
      }
    }
  });

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
  console.error(`[capture] navigating to ${URL_ARG}`);
  await cdp.send('Page.navigate', { url: URL_ARG });

  // Also evaluate the hook in the current document in case the navigation race
  // means the page already loaded before the new-document script applied.
  await cdp.send('Runtime.evaluate', { expression: HOOK, awaitPromise: false });

  console.error('\n[capture] >>> click the verify button on the page <<<');
  console.error('[capture] (Ctrl-C to abort; will auto-exit on first capture or after 5 min)\n');

  const timeout = setTimeout(() => {
    console.error('[capture] timeout — no call captured in 5 min');
    writeFileSync(RAW_LOG, lines.join('\n'));
    process.exit(2);
  }, 5 * 60 * 1000);

  function finalize() {
    clearTimeout(timeout);
    writeFileSync(OUT, JSON.stringify(captured, null, 2));
    writeFileSync(RAW_LOG, lines.join('\n'));
    console.error(`[capture] wrote ${OUT}`);
    setTimeout(() => process.exit(0), 250);
  }
})().catch(e => {
  console.error('[capture] fatal:', e);
  process.exit(1);
});
