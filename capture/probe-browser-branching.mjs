#!/usr/bin/env node
// Probe whether a verifier page builds different Digital Credentials requests
// when it sees different browser identities or credential API availability.
//
// This launches Chromium with CDP. Safari profiles here are UA/device probes, not
// real WebKit. Use manual-safari-hook.js for an actual Safari capture.
//
// Usage:
//   node capture/probe-browser-branching.mjs --profile chrome
//   node capture/probe-browser-branching.mjs --profile safari-macos --mode stub
//   node capture/probe-browser-branching.mjs --profile safari-ios --mode stub
//   node capture/probe-browser-branching.mjs --url https://... --click-selector 'button'

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL = "https://tools.mattrlabs.com/verify-credentials";

const UA_PROFILES = {
  chrome: {
    label: "chrome",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    platform: "Linux x86_64",
    deviceMetrics: null,
  },
  "safari-macos": {
    label: "safari-macos",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
    platform: "MacIntel",
    deviceMetrics: { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false },
  },
  "safari-ios": {
    label: "safari-ios",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    deviceMetrics: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
  },
};

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
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

function safeFileLabel(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function makeHook(mode) {
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  function safeStringify(v) {
    const seen = new WeakSet();
    return JSON.stringify(v, (k, val) => {
      if (val && typeof val === "object") {
        if (seen.has(val)) return "[circular]";
        seen.add(val);
      }
      if (val instanceof ArrayBuffer) return { __arrayBuffer: val.byteLength };
      if (ArrayBuffer.isView && ArrayBuffer.isView(val)) {
        return { __typedArray: val.constructor.name, byteLength: val.byteLength };
      }
      if (typeof val === "function") return "[function " + (val.name || "anonymous") + "]";
      return val;
    }, 2);
  }
  function emit(label, payload) {
    try { console.log("@@DC-PROBE@@" + label + "@@" + safeStringify(payload)); }
    catch (e) { console.log("@@DC-PROBE-ERR@@" + label + "@@" + e.message); }
  }
  function env(stage) {
    emit("env." + stage, {
      href: location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      hasCredentials: !!navigator.credentials,
      credentialsGetType: navigator.credentials && typeof navigator.credentials.get,
      hasNavigatorIdentity: !!navigator.identity,
      identityGetType: navigator.identity && typeof navigator.identity.get,
      digitalCredentialType: typeof window.DigitalCredential,
      identityCredentialType: typeof window.IdentityCredential,
    });
  }
  function capturedGet(origFn, label) {
    return function(arg) {
      emit(label, arg);
      if (mode === "wrap" && origFn) return origFn.apply(this, arguments);
      return Promise.reject(new DOMException("Captured by probe-browser-branching.mjs", "AbortError"));
    };
  }
  function installObjectProp(obj, key, value) {
    try {
      Object.defineProperty(obj, key, { value, configurable: true, writable: true });
      return true;
    } catch (_) {
      try { obj[key] = value; return true; } catch (_) { return false; }
    }
  }

  env("before-install");
  try {
    let credentials = navigator.credentials;
    if (!credentials && mode === "stub") {
      credentials = {};
      installObjectProp(navigator, "credentials", credentials);
    }
    if (credentials) {
      const original = typeof credentials.get === "function"
        ? credentials.get.bind(credentials)
        : null;
      installObjectProp(credentials, "get", capturedGet(original, "credentials.get"));
    }

    let identity = navigator.identity;
    if (!identity && mode === "stub") {
      identity = {};
      installObjectProp(navigator, "identity", identity);
    }
    if (identity) {
      const original = typeof identity.get === "function"
        ? identity.get.bind(identity)
        : null;
      installObjectProp(identity, "get", capturedGet(original, "identity.get"));
    }

    if (mode === "stub") {
      if (typeof window.DigitalCredential === "undefined") {
        installObjectProp(window, "DigitalCredential", function DigitalCredential() {});
      }
      if (typeof window.IdentityCredential === "undefined") {
        installObjectProp(window, "IdentityCredential", function IdentityCredential() {});
      }
    }
  } catch (e) {
    emit("install-error", { name: e.name, message: e.message, stack: e.stack });
  }
  env("after-install");
})();
`;
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
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCdp(port) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return await response.json();
    } catch (_) {}
    await sleep(250);
  }
  throw new Error(`CDP did not come up on port ${port}`);
}

async function getPageTarget(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json`);
  const targets = await response.json();
  return targets.find((target) => target.type === "page");
}

const args = parseArgs(process.argv.slice(2));
const profileName = String(args.profile || "chrome");
const profile = UA_PROFILES[profileName];
if (!profile) {
  throw new Error(`Unknown profile ${profileName}; choose ${Object.keys(UA_PROFILES).join(", ")}`);
}

const mode = String(args.mode || "stub");
if (!["stub", "wrap"].includes(mode)) {
  throw new Error("--mode must be stub or wrap");
}

const url = String(args.url || args._[0] || DEFAULT_URL);
const clickSelector = args["click-selector"] ? String(args["click-selector"]) : null;
const port = Number(args.port || 9300 + Math.floor(Math.random() * 500));
const timeoutMs = Number(args.timeout_ms || args.timeout || 5 * 60 * 1000);
const profileDir = join(tmpdir(), `dc-probe-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const outRoot = args.out ? String(args.out) : join(HERE, "browser-branching");
const runLabel = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeFileLabel(profileName)}-${mode}`;
const outDir = join(outRoot, runLabel);
mkdirSync(outDir, { recursive: true });

const hook = makeHook(mode);
const chromiumBinary = process.env.CHROMIUM || "chromium";
const chromiumArgs = [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-features=DigitalCredentialsApiOriginTrial",
  "--enable-features=WebIdentityDigitalCredentials,WebIdentityDigitalCredentialsCreation",
  "about:blank",
];

if (args.headless) chromiumArgs.unshift("--headless=new");

console.error(`[probe] starting ${chromiumBinary}, profile=${profileName}, mode=${mode}`);
console.error(`[probe] output dir: ${outDir}`);
const chromium = spawn(chromiumBinary, chromiumArgs, { stdio: ["ignore", "inherit", "inherit"] });

let finalized = false;
function cleanup() {
  try {
    chromium.kill("SIGTERM");
  } catch (_) {}
}
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("exit", cleanup);

const rawConsole = [];
const probeEvents = [];
let captured = null;

function writeOutputs(status) {
  if (finalized) return;
  finalized = true;
  const run = {
    status,
    at: new Date().toISOString(),
    url,
    profileName,
    profile,
    mode,
    clickSelector,
    timeoutMs,
    caveat:
      profileName.startsWith("safari") &&
      "This is Chromium with a Safari user agent/device profile. It detects page branching, not actual WebKit behavior.",
  };
  writeFileSync(join(outDir, "run.json"), JSON.stringify(run, null, 2));
  writeFileSync(join(outDir, "console.raw.log"), rawConsole.join("\n"));
  writeFileSync(join(outDir, "probe-events.json"), JSON.stringify(probeEvents, null, 2));
  if (captured) {
    const name = captured.label === "identity.get"
      ? "navigator-identity-get.arg.json"
      : "navigator-credentials-get.arg.json";
    writeFileSync(join(outDir, name), JSON.stringify(captured.payload, null, 2));
    writeFileSync(join(outDir, "capture.json"), JSON.stringify(captured, null, 2));
  }
  const noteLines = [
    `# ${runLabel}`,
    "",
    `- URL: ${url}`,
    `- Profile: ${profileName}`,
    `- Mode: ${mode}`,
    `- Status: ${status}`,
    "",
    profileName.startsWith("safari")
      ? "This run used Chromium with Safari-like identity. It is useful for detecting verifier-page user-agent branches, but it is not a real Safari/WebKit capture."
      : "This run used Chromium identity.",
    "",
    captured
      ? `Captured call: \`${captured.label}\``
      : "No credential API call was captured.",
  ];
  writeFileSync(join(outDir, "notes.md"), `${noteLines.join("\n")}\n`);
  console.error(`[probe] wrote ${outDir}`);
}

(async () => {
  const version = await waitForCdp(port);
  console.error(`[probe] CDP up: ${version.Browser}`);
  const target = await getPageTarget(port);
  if (!target) throw new Error("no page target");
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Network.setUserAgentOverride", {
    userAgent: profile.userAgent,
    platform: profile.platform,
  });
  if (profile.deviceMetrics) {
    await cdp.send("Emulation.setDeviceMetricsOverride", profile.deviceMetrics);
  }

  cdp.on("Runtime.consoleAPICalled", (params) => {
    const text = (params.args || [])
      .map((arg) => (arg.value !== undefined ? String(arg.value) : arg.description || ""))
      .join(" ");
    rawConsole.push(text);
    const match = text.match(/^@@DC-PROBE@@([^@]+)@@(.*)$/s);
    if (!match) return;
    const event = { label: match[1], payload: JSON.parse(match[2]), at: new Date().toISOString() };
    probeEvents.push(event);
    if (event.label === "credentials.get" || event.label === "identity.get") {
      captured = event;
      console.error(`[probe] captured ${event.label}`);
      writeOutputs("captured");
      setTimeout(() => process.exit(0), 250);
    }
  });

  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: hook });
  const pageLoaded = new Promise((resolve) => {
    cdp.on("Page.loadEventFired", resolve);
  });
  console.error(`[probe] navigating to ${url}`);
  await cdp.send("Page.navigate", { url });
  await cdp.send("Runtime.evaluate", { expression: hook, awaitPromise: false });

  if (clickSelector) {
    await pageLoaded;
    await sleep(750);
    console.error(`[probe] clicking ${clickSelector}`);
    await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const el = document.querySelector(${JSON.stringify(clickSelector)});
          if (!el) throw new Error("No element for selector: ${clickSelector.replaceAll('"', '\\"')}");
          el.click();
        })()
      `,
      awaitPromise: true,
    });
  } else {
    console.error("[probe] interact with the page; capture exits on credentials.get or timeout");
  }

  setTimeout(() => {
    console.error("[probe] timeout; no credential API call captured");
    writeOutputs("timeout");
    process.exit(2);
  }, timeoutMs);
})().catch((error) => {
  console.error("[probe] fatal:", error);
  writeOutputs("fatal");
  process.exit(1);
});
