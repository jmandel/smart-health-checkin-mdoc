// Stable, capture-friendly event emitter.
//
// All events are logged to console with the `@@SHC@@<KIND>@@<json>` prefix so
// the CDP capture script (tools/capture/capture-dc-request.mjs and the future
// scripts/run-cdp-flow.mjs) can scrape them without DOM scraping.
//
// Same emitter also pushes to an in-memory ring buffer that the React UI
// can subscribe to for the on-screen debug panel.

export type DebugEvent = {
  kind: string;
  at: string; // ISO timestamp
  runId: string;
  payload: unknown;
};

const RING_LIMIT = 500;
const ring: DebugEvent[] = [];
const listeners = new Set<(e: DebugEvent) => void>();

let runId = makeRunId();

export function getRunId(): string {
  return runId;
}

export function newRunId(): string {
  runId = makeRunId();
  emit("RUN_ID_RESET", { runId });
  return runId;
}

export function emit(kind: string, payload: unknown): DebugEvent {
  const evt: DebugEvent = {
    kind,
    at: new Date().toISOString(),
    runId,
    payload,
  };
  // Console form: @@SHC@@<KIND>@@<json>
  // (single line, no embedded newlines, so CDP scrapers can split cleanly)
  try {
    // eslint-disable-next-line no-console
    console.log(`@@SHC@@${kind}@@${safeStringify(evt)}`);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`@@SHC@@${kind}@@{"error":"stringify-failed"}`);
  }
  ring.push(evt);
  if (ring.length > RING_LIMIT) ring.splice(0, ring.length - RING_LIMIT);
  for (const fn of listeners) fn(evt);
  return evt;
}

export function getRing(): readonly DebugEvent[] {
  return ring;
}

export function subscribe(fn: (e: DebugEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function makeRunId(): string {
  // Short, sortable, copy-pasteable. Not crypto-grade.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `run_${t}_${r}`;
}

function safeStringify(v: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object") {
      if (seen.has(val as object)) return "[circular]";
      seen.add(val as object);
    }
    if (val instanceof ArrayBuffer) {
      return { __arrayBuffer: val.byteLength };
    }
    if (ArrayBuffer.isView(val)) {
      const view = val as ArrayBufferView;
      return { __typedArray: view.constructor.name, byteLength: view.byteLength };
    }
    return val;
  });
}
