// Verifier-side demo page that uses the web-wallet shim.
// Lives next to the verifier app build (`rp-web/`) so the existing build
// pipeline picks it up under `_site/verifier/web-wallet-demo.html`. Stays
// independent of the React app: a single TS module + a minimal HTML.

import {
  createBrowserLocalVerifierAuthority,
  requestCredentialWithAuthority,
} from "./sdk/dcapi-verifier.ts";
import {
  createWebWalletCredentialGetter,
  WebWalletClosed,
  WebWalletDeclined,
  WebWalletError,
  WebWalletTimeout,
} from "./sdk-web-wallet/index.ts";
import type { SmartCheckinRequest } from "./sdk/core.ts";

const DEMO_REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: `web-wallet-demo-${Date.now()}`,
  purpose: "Clinic check-in demo (web wallet)",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "patient",
      title: "Patient demographics",
      required: true,
      content: { kind: "selection.fhir", resourceTypes: ["Patient"] },
      accept: ["application/fhir+json"],
    },
    {
      id: "coverage",
      title: "Insurance coverage",
      content: { kind: "selection.fhir", resourceTypes: ["Coverage"] },
      accept: ["application/fhir+json"],
    },
    {
      id: "history",
      title: "Clinical history bundle",
      content: { kind: "selection.fhir", resourceTypes: ["Bundle"] },
      accept: ["application/fhir+json"],
    },
  ],
};

const POPUP_FEATURES = "";

const root = document.getElementById("verifier-root");
if (!root) throw new Error("verifier demo missing #verifier-root");

type ErrorCategory =
  | "declined"
  | "closed"
  | "timeout"
  | "blocked"
  | "error";

type Status =
  | { phase: "idle" }
  | { phase: "running"; message: string }
  | {
      phase: "success";
      details: {
        hpkeOpened: boolean;
        digestMatched: boolean;
        smartValid: boolean;
      };
      summary: ResponseSummary;
    }
  | {
      phase: "error";
      category: ErrorCategory;
      heading: string;
      message: string;
      hint?: string;
    };

type ResponseSummary = {
  patient?: string;
  payer?: string;
  resourceCount?: number;
  resourceTypes: string[];
  artifactCount: number;
};

let status: Status = { phase: "idle" };
let running = false;
render();

function render(): void {
  if (!root) return;
  root.innerHTML = "";

  const intro = document.createElement("section");
  intro.className = "card";
  const buttonLabel =
    status.phase === "success"
      ? "Run again"
      : status.phase === "error"
        ? "Try again"
        : "Open web wallet";
  intro.innerHTML = `
    <h1>SMART Health Check-in — web-wallet demo</h1>
    <p>Click the button to ask a same-origin web-wallet popup for a
    SMART Health Check-in response. The popup opens, you approve, and
    this page renders what the wallet shared.</p>
    <p class="muted small">This is a side-surface demo. The wire format
    is the same <code>org-iso-mdoc</code> mdoc-over-DCAPI bytes the
    platform-wallet flow uses; only the mediator changes.</p>
    <button id="run" class="primary"${running ? " disabled" : ""}>${escape(buttonLabel)}${
      running ? " …" : ""
    }</button>
  `;
  root.appendChild(intro);

  const out = document.createElement("section");
  out.className = "card";
  if (status.phase === "idle") {
    out.innerHTML = `<p class="muted">Waiting for a request to run.</p>`;
  } else if (status.phase === "running") {
    out.innerHTML = `<p>${escape(status.message)}</p>`;
  } else if (status.phase === "error") {
    const hint = status.hint
      ? `<p class="muted small">${escape(status.hint)}</p>`
      : "";
    out.innerHTML = `
      <h2>${escape(status.heading)}</h2>
      <pre class="error">${escape(status.message)}</pre>
      ${hint}
    `;
  } else {
    const badges = [
      ["HPKE opened", status.details.hpkeOpened],
      ["MSO digest matched", status.details.digestMatched],
      ["SMART response valid", status.details.smartValid],
    ]
      .map(([label, ok]) => {
        const cls = ok ? "ok" : "fail";
        const mark = ok ? "✓" : "✗";
        return `<span class="badge ${cls}">${mark} ${escape(String(label))}</span>`;
      })
      .join("");
    const types =
      status.summary.resourceTypes.length > 0
        ? status.summary.resourceTypes.map(escape).join(", ")
        : "(none)";
    out.innerHTML = `
      <h2>Wallet response</h2>
      <div class="badges">${badges}</div>
      <ul>
        <li><strong>Patient:</strong> ${escape(status.summary.patient ?? "(absent)")}</li>
        <li><strong>Coverage payer:</strong> ${escape(status.summary.payer ?? "(absent)")}</li>
        <li><strong>Clinical resources:</strong> ${
          status.summary.resourceCount ?? 0
        }</li>
        <li><strong>Artifacts:</strong> ${status.summary.artifactCount} (${escape(types)})</li>
      </ul>
    `;
  }
  root.appendChild(out);

  const runButton = document.getElementById("run") as HTMLButtonElement | null;
  if (runButton && !running) {
    runButton.addEventListener("click", onRunClick, { once: true });
  }
}

function onRunClick(): void {
  if (running) return;
  // STEP 1 — gesture-preserving popup open. This MUST be synchronous inside
  // the click handler. If we awaited anything before calling window.open,
  // Safari/Firefox would block the popup as non-user-initiated.
  const preOpened = window.open("about:blank", undefined, POPUP_FEATURES);
  if (!preOpened) {
    status = {
      phase: "error",
      category: "blocked",
      heading: "Popup was blocked",
      message: "The browser refused to open the wallet popup.",
      hint: "Allow popups for this site in your browser settings, then click Try again.",
    };
    render();
    return;
  }
  running = true;
  status = { phase: "running", message: "Preparing request and opening wallet popup…" };
  render();
  void runDemo(preOpened).finally(() => {
    running = false;
    // If the demo failed before the getter saw the popup, close it manually
    // so the user isn't left with an orphaned wallet window.
    if (!preOpened.closed) {
      try {
        preOpened.close();
      } catch {
        // ignore
      }
    }
    render();
  });
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

async function runDemo(popup: Window): Promise<void> {
  try {
    const authority = createBrowserLocalVerifierAuthority({
      origin: location.origin,
    });
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: walletUrl(),
      popup,
    });

    const result = await requestCredentialWithAuthority({
      authority,
      request: { ...DEMO_REQUEST, id: `web-wallet-demo-${Date.now()}` },
      getCredential,
    });

    const opened = result.completion.openedResponse;
    const document0 = opened.deviceResponse.documents[0];
    const element0 = document0?.elements[0];
    const hpkeOpened = opened.deviceResponseBytes.length > 0;
    const digestMatched = element0?.valueDigest?.matches === true;
    const smartValid = opened.smartResponseValidation?.ok === true;

    const summary = summarizeOpenedResponse(opened);
    status = {
      phase: "success",
      details: { hpkeOpened, digestMatched, smartValid },
      summary,
    };
  } catch (err) {
    status = formatErrorStatus(err);
  }
}

function walletUrl(): URL {
  // Same-origin sibling deployment.
  // Built-pages layout: /verifier/* and /wallet/*.
  // Dev-server: /wallet/ should be served as well (e.g. via `bun wallet/index.html`).
  return new URL("/wallet/", location.href);
}

function formatErrorStatus(err: unknown): Extract<Status, { phase: "error" }> {
  if (err instanceof WebWalletDeclined) {
    return {
      phase: "error",
      category: "declined",
      heading: "Declined",
      message: "You declined to share data in the wallet popup.",
      hint: "Click Try again to re-issue the request.",
    };
  }
  if (err instanceof WebWalletClosed) {
    return {
      phase: "error",
      category: "closed",
      heading: "Wallet popup closed",
      message: "The wallet popup was closed before responding.",
      hint: "Click Try again to re-open the wallet.",
    };
  }
  if (err instanceof WebWalletTimeout) {
    return {
      phase: "error",
      category: "timeout",
      heading: "Wallet timed out",
      message: "The wallet did not respond within the allowed time.",
      hint: "Make sure the wallet popup loaded and click Try again.",
    };
  }
  if (err instanceof WebWalletError) {
    return {
      phase: "error",
      category: "error",
      heading: "Wallet error",
      message: err.message,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    phase: "error",
    category: "error",
    heading: "Verifier error",
    message,
  };
}

function summarizeOpenedResponse(opened: {
  deviceResponse: {
    documents: ReadonlyArray<{
      elements: ReadonlyArray<{
        smartHealthCheckinResponse:
          | {
              present: true;
              valid: true;
              value: {
                artifacts: ReadonlyArray<{
                  fulfills: ReadonlyArray<string>;
                  value: unknown;
                }>;
              };
            }
          | { present: false }
          | { present: true; valid: false; error: string }
          | { present: true; json: string; valid: false; error: string };
      }>;
    }>;
  };
}): ResponseSummary {
  const summary: ResponseSummary = {
    artifactCount: 0,
    resourceTypes: [],
  };
  const elements = opened.deviceResponse.documents[0]?.elements ?? [];
  for (const element of elements) {
    const inspection = element.smartHealthCheckinResponse;
    if (!inspection.present || !inspection.valid) continue;
    summary.artifactCount += inspection.value.artifacts.length;
    for (const a of inspection.value.artifacts) {
      summarizeFhirValue(a.value, summary);
    }
  }
  return summary;
}

function summarizeFhirValue(value: unknown, summary: ResponseSummary): void {
  const v = value as { resourceType?: unknown; entry?: unknown };
  if (v?.resourceType === "Patient") {
    summary.patient = formatPatient(v);
    summary.resourceTypes.push("Patient");
  } else if (v?.resourceType === "Coverage") {
    summary.payer = formatCoveragePayer(v);
    summary.resourceTypes.push("Coverage");
  } else if (v?.resourceType === "Bundle" && Array.isArray(v.entry)) {
    summary.resourceCount = (summary.resourceCount ?? 0) + v.entry.length;
    for (const e of v.entry) {
      const r = (e as { resource?: unknown }).resource;
      summarizeFhirValue(r, summary);
    }
  } else if (typeof v?.resourceType === "string") {
    summary.resourceTypes.push(v.resourceType);
  }
}

function formatPatient(v: unknown): string {
  const p = v as {
    name?: ReadonlyArray<{ family?: unknown; given?: ReadonlyArray<unknown> }>;
    id?: unknown;
  };
  const name = p.name?.[0];
  const given = (name?.given ?? []).filter((x): x is string => typeof x === "string");
  const family = typeof name?.family === "string" ? name.family : "";
  const display = [given.join(" "), family].filter(Boolean).join(" ");
  return display || (typeof p.id === "string" ? p.id : "(unknown)");
}

function formatCoveragePayer(v: unknown): string {
  const c = v as {
    payor?: ReadonlyArray<{ display?: unknown }>;
  };
  const display = c.payor?.[0]?.display;
  return typeof display === "string" ? display : "(unknown)";
}
