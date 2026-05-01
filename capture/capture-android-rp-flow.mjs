#!/usr/bin/env node
// Captures a real Android Chrome -> Credential Manager -> wallet flow.
//
// This script listens to the RP web app's @@SHC@@ console events over Android
// Chrome DevTools Protocol, saves the verifier-side request artifacts including
// the HPKE recipient private JWK, pulls the latest Android wallet handler run,
// and validates that the saved private JWK can reopen the returned ciphertext.

import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const args = parseArgs(process.argv.slice(2));
const ADB = String(args.adb || process.env.ADB || "adb");
const URL_ARG = String(args.url || "http://127.0.0.1:3010");
const OUT_ROOT = resolve(String(args.out || "/tmp/shc-handler-runs"));
const CDP_PORT = Number(args.port || 9333);
const TIMEOUT_MS = Number(args.timeout_ms || args.timeout || 5 * 60 * 1000);
const START_SERVER = args["no-server"] ? false : true;
const AUTO_CLICK = args["no-auto-click"] ? false : true;
const AUTO_WALLET = args["adb-auto-wallet"] || args["auto-wallet"] ? true : false;
const PULL_ANDROID = args["no-pull"] ? false : true;
const VALIDATE = args["no-validate"] ? false : true;
const CLICK_SELECTOR = String(args["click-selector"] || ".checkin-button:not(:disabled)");
const CLICK_TIMEOUT_MS = Number(args["click-timeout"] || 12_000);
const RP_FALLBACK_TAP = parseSingleTap(String(args["rp-tap"] || "540,1400"));
const WALLET_TAPS = parseTapPlan(String(args["wallet-taps"] || "785,2135,2500;540,2174,2500"));

const captureRoot = join(ROOT, "capture", "android-rp-flow");
const captureDir = join(captureRoot, new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(captureDir, { recursive: true });

const consoleLines = [];
const shcEvents = [];
let requestArtifactsEvent = null;
let openedEvent = null;
let openErrorEvent = null;
let server = null;

process.on("exit", () => {
  if (server) {
    try { server.kill("SIGTERM"); } catch {}
  }
});

main().catch((error) => {
  console.error("[capture] fatal:", error?.stack || error);
  writeCaptureFiles();
  process.exit(1);
});

async function main() {
  console.error(`[capture] output: ${captureDir}`);
  await ensureLocalServer();
  await ensureAdb();
  await setupAndroidNetworking();
  await openAndroidChrome();

  const cdp = await attachCdp();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable").catch(() => {});
  await cdp.send("Page.bringToFront").catch(() => {});

  cdp.on("Runtime.consoleAPICalled", (params) => {
    const text = (params.args || [])
      .map((arg) => arg.value !== undefined ? String(arg.value) : (arg.description || ""))
      .join(" ");
    consoleLines.push(text);
    handleConsoleLine(text);
  });
  cdp.on("Log.entryAdded", (params) => {
    if (params.entry?.text) consoleLines.push(`[Log.${params.entry.level}] ${params.entry.text}`);
  });

  console.error(`[capture] navigating Android Chrome to ${URL_ARG}`);
  await cdp.send("Page.navigate", { url: URL_ARG });
  await waitForPageLoad(cdp).catch(() => {});

  if (AUTO_CLICK) {
    console.error(`[capture] clicking RP button via CDP selector ${CLICK_SELECTOR}`);
    const clicked = await withTimeout(clickSelector(cdp, CLICK_SELECTOR), CLICK_TIMEOUT_MS, false);
    if (clicked) {
      await withTimeout(waitForRequestArtifacts(3500), 3500, null);
    }
    if (!clicked || !requestArtifactsEvent) {
      console.error("[capture] DOM click did not emit request artifacts; trying CDP touch on selector");
      const tapped = await withTimeout(tapSelector(cdp, CLICK_SELECTOR), CLICK_TIMEOUT_MS, false);
      if (tapped) {
        await withTimeout(waitForRequestArtifacts(3500), 3500, null);
      }
      if (!tapped || !requestArtifactsEvent) {
        console.error(`[capture] CDP selector click did not complete; final adb fallback tap ${RP_FALLBACK_TAP.x},${RP_FALLBACK_TAP.y}`);
        await adbTap(RP_FALLBACK_TAP.x, RP_FALLBACK_TAP.y);
      }
    }
  } else {
    console.error("[capture] auto-click disabled; tap the RP button on the device");
  }

  if (AUTO_WALLET) {
    await waitForRequestArtifacts();
    await driveAndroidWalletFlow();
  } else {
    console.error("[capture] complete the Android Credential Manager / wallet UI on the device");
  }
  await waitForCompletion();
  writeCaptureFiles();

  let runDir = null;
  if (PULL_ANDROID) {
    runDir = await pullLatestAndroidRun();
    if (requestArtifactsEvent) {
      writeRpFixture(runDir, requestArtifactsEvent);
      copyCaptureSummary(runDir);
    }
    if (VALIDATE && requestArtifactsEvent) {
      await validateReplay(runDir);
    }
  }

  console.error("[capture] done");
  console.error(`[capture] browser events: ${captureDir}`);
  if (runDir) console.error(`[capture] combined run: ${runDir}`);
  cdp.close();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

async function ensureLocalServer() {
  const url = new URL(URL_ARG);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) return;
  try {
    const response = await fetch(`${url.origin}/`, { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      console.error(`[capture] RP server already responding at ${url.origin}`);
      return;
    }
  } catch {}
  if (!START_SERVER) {
    throw new Error(`RP server is not responding at ${url.origin}; rerun without --no-server or start it manually`);
  }
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  console.error(`[capture] starting rp-web dev server on ${port}`);
  server = spawn("bun", [`--port=${port}`, "index.html"], {
    cwd: join(ROOT, "rp-web"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => process.stderr.write(`[rp-web] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[rp-web] ${chunk}`));
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(`${url.origin}/`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`RP server did not start at ${url.origin}`);
}

function parseTapPlan(value) {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [x, y, delayMs] = part.split(",").map((item) => Number(item.trim()));
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error(`invalid --wallet-taps entry ${JSON.stringify(part)}; expected x,y,delayMs`);
      }
      return { x, y, delayMs: Number.isFinite(delayMs) ? delayMs : 2000 };
    });
}

function parseSingleTap(value) {
  const [x, y] = value.split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`invalid tap ${JSON.stringify(value)}; expected x,y`);
  }
  return { x, y };
}

async function waitForRequestArtifacts(timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (requestArtifactsEvent) return;
    await sleep(250);
  }
  throw new Error("RP did not emit REQUEST_ARTIFACTS; not driving Android wallet taps");
}

async function driveAndroidWalletFlow() {
  console.error(`[capture] driving Android wallet UI with ${WALLET_TAPS.length} fixed taps`);
  for (const tap of WALLET_TAPS) {
    await sleep(tap.delayMs);
    console.error(`[capture] adb tap ${tap.x},${tap.y}`);
    await adbTap(tap.x, tap.y);
  }
}

async function adbTap(x, y) {
  await exec(ADB, ["shell", "input", "tap", String(x), String(y)], { allowFail: true });
}

async function ensureAdb() {
  const state = (await exec(ADB, ["get-state"], { allowFail: true })).stdout.trim();
  if (state !== "device") {
    throw new Error(`ADB device is not connected (adb get-state => ${JSON.stringify(state)}). Reconnect with adb connect first.`);
  }
}

async function setupAndroidNetworking() {
  const url = new URL(URL_ARG);
  if (["127.0.0.1", "localhost"].includes(url.hostname)) {
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    console.error(`[capture] adb reverse tcp:${port} tcp:${port}`);
    await exec(ADB, ["reverse", `tcp:${port}`, `tcp:${port}`]);
  }
  console.error(`[capture] adb forward tcp:${CDP_PORT} localabstract:chrome_devtools_remote`);
  await exec(ADB, ["forward", `tcp:${CDP_PORT}`, "localabstract:chrome_devtools_remote"]);
}

async function openAndroidChrome() {
  console.error("[capture] launching Android browser intent");
  await exec(ADB, [
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    URL_ARG,
    "com.android.chrome",
  ], { allowFail: true });
}

async function attachCdp() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
      const page = list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) {
        console.error(`[capture] CDP target: ${page.title || page.url}`);
        const cdp = new Cdp(page.webSocketDebuggerUrl);
        await cdp.ready;
        return cdp;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error("could not attach to Android Chrome CDP target");
}

async function waitForPageLoad(cdp) {
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 8000);
    cdp.on("Page.loadEventFired", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function clickSelector(cdp, selector) {
  const expression = `
    (() => {
      const selector = ${JSON.stringify(selector)};
      const el = document.querySelector(selector);
      if (!el) return { ok: false, reason: "not-found" };
      el.scrollIntoView({ block: "center", inline: "center" });
      if (typeof el.focus === "function") el.focus({ preventScroll: true });
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return { ok: false, reason: "not-visible" };
      el.click();
      return { ok: true, method: "dom-click", x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `;
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  const value = result.result?.value;
  if (!value?.ok) {
    console.error(`[capture] CDP DOM click failed: ${value?.reason || "unknown"}`);
    return false;
  }
  return true;
}

async function tapSelector(cdp, selector) {
  const expression = `
    new Promise((resolve) => {
      const selector = ${JSON.stringify(selector)};
      const started = Date.now();
      const tick = () => {
        const el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({ block: "center", inline: "center" });
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            resolve({ ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 });
            return;
          }
        }
        if (Date.now() - started > 10000) resolve({ ok: false });
        else setTimeout(tick, 250);
      };
      tick();
    })
  `;
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = result.result?.value;
  if (!value?.ok) return false;
  await cdp.send("Page.bringToFront").catch(() => {});
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: value.x, y: value.y }],
  });
  await sleep(80);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  return true;
}

function handleConsoleLine(text) {
  const match = text.match(/^@@SHC@@([^@]+)@@(.*)$/s);
  if (!match) return;
  let event;
  try {
    event = JSON.parse(match[2]);
  } catch (error) {
    console.error(`[capture] failed to parse ${match[1]}: ${error.message}`);
    return;
  }
  shcEvents.push(event);
  console.error(`[capture] SHC ${event.kind || match[1]}`);
  if (event.kind === "REQUEST_ARTIFACTS") requestArtifactsEvent = event;
  if (event.kind === "DCAPI_RESPONSE_OPENED") openedEvent = event;
  if (event.kind === "RESPONSE_OPEN_ERROR") openErrorEvent = event;
}

async function waitForCompletion() {
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    if (openedEvent || openErrorEvent) return;
    await sleep(500);
  }
  throw new Error(`timed out after ${TIMEOUT_MS}ms waiting for DCAPI_RESPONSE_OPENED or RESPONSE_OPEN_ERROR`);
}

function writeCaptureFiles() {
  mkdirSync(captureDir, { recursive: true });
  writeFileSync(join(captureDir, "console.raw.log"), `${consoleLines.join("\n")}\n`);
  writeFileSync(join(captureDir, "rp-events.json"), `${JSON.stringify(shcEvents, null, 2)}\n`);
  if (requestArtifactsEvent) {
    writeFileSync(join(captureDir, "rp-request-artifacts-event.json"), `${JSON.stringify(requestArtifactsEvent, null, 2)}\n`);
    writeFileSync(join(captureDir, "rp-request-artifacts.json"), `${JSON.stringify(requestArtifactsEvent.payload, null, 2)}\n`);
  }
  if (openedEvent) writeFileSync(join(captureDir, "rp-opened-event.json"), `${JSON.stringify(openedEvent, null, 2)}\n`);
  if (openErrorEvent) writeFileSync(join(captureDir, "rp-open-error-event.json"), `${JSON.stringify(openErrorEvent, null, 2)}\n`);
}

async function pullLatestAndroidRun() {
  console.error("[capture] pulling latest Android handler run");
  const result = await exec(join(ROOT, "scripts", "pull-android-handler-run.sh"), [OUT_ROOT, "latest"], {
    env: { ...process.env, ADB },
  });
  const runDir = result.stdout.trim().split(/\r?\n/).at(-1);
  if (!runDir || !existsSync(runDir)) {
    throw new Error(`pull script did not produce a run directory: ${result.stdout}`);
  }
  return runDir;
}

function writeRpFixture(runDir, event) {
  const payload = event.payload || {};
  const dir = join(runDir, "rp-request");
  mkdirSync(dir, { recursive: true });
  writeJson(join(dir, "metadata.json"), {
    origin: payload.origin,
    protocol: payload.protocol,
    docType: payload.docType,
    namespace: payload.namespace,
    responseElement: payload.responseElement,
    rpRunId: event.runId,
    capturedAt: event.at,
    source: "rp-web @@SHC@@REQUEST_ARTIFACTS event",
  });
  writeJson(join(dir, "request-artifacts.json"), payload);
  writeJson(join(dir, "navigator-credentials-get.arg.json"), payload.navigatorArgument);
  writeJson(join(dir, "recipient-public.jwk.json"), payload.recipientPublicJwk);
  writeJson(join(dir, "recipient-private.jwk.json"), payload.recipientPrivateJwk);
  if (payload.deviceRequest?.base64url) writeFileSync(join(dir, "device-request.b64u"), `${payload.deviceRequest.base64url}\n`);
  if (payload.deviceRequest?.hex) writeFileSync(join(dir, "device-request.cbor.hex"), `${payload.deviceRequest.hex}\n`);
  if (payload.encryptionInfo?.base64url) writeFileSync(join(dir, "encryption-info.b64u"), `${payload.encryptionInfo.base64url}\n`);
  if (payload.encryptionInfo?.hex) writeFileSync(join(dir, "encryption-info.cbor.hex"), `${payload.encryptionInfo.hex}\n`);
  if (payload.sessionTranscript?.base64url) writeFileSync(join(dir, "session-transcript.cbor.b64u"), `${payload.sessionTranscript.base64url}\n`);
  if (payload.sessionTranscript?.hex) writeFileSync(join(dir, "session-transcript.cbor.hex"), `${payload.sessionTranscript.hex}\n`);
}

function copyCaptureSummary(runDir) {
  const dir = join(runDir, "rp-capture");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "console.raw.log"), `${consoleLines.join("\n")}\n`);
  writeJson(join(dir, "rp-events.json"), shcEvents);
  if (requestArtifactsEvent) writeJson(join(dir, "rp-request-artifacts-event.json"), requestArtifactsEvent);
  if (openedEvent) writeJson(join(dir, "rp-opened-event.json"), openedEvent);
  if (openErrorEvent) writeJson(join(dir, "rp-open-error-event.json"), openErrorEvent);
}

async function validateReplay(runDir) {
  const requestFixtureDir = join(runDir, "rp-request");
  const outDir = join(runDir, "analysis", "hpke-opened");
  console.error("[capture] validating HPKE replay with saved recipient private JWK");
  await exec("bun", [
    "scripts/validate-android-mdoc-response.ts",
    runDir,
    requestFixtureDir,
    "--out",
    outDir,
  ], { cwd: join(ROOT, "rp-web") });
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function exec(command, argv, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, argv, {
      cwd: options.cwd,
      env: options.env,
      timeout: options.timeout,
      maxBuffer: 20 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (stderr) process.stderr.write(stderr);
      if (error && !options.allowFail) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr, error });
      }
    });
  });
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (error) => reject(error));
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
      } else if (message.method) {
        const handler = this.handlers.get(message.method);
        if (handler) handler(message.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) {
    this.handlers.set(method, handler);
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, fallback) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
