import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import { SmartResponseReview, asRecord } from "../app/SmartResponseReview.tsx";
import { PRESETS } from "../store.ts";
import { DEMO_KIOSK_CRYPTO_CONFIG } from "./demo-keys.ts";
import {
  filterRowsForRequest,
  initiateKioskRequest,
  openKioskSubmission,
  type InitiatedKioskRequest,
  type KioskSubmissionRow,
  type SubmissionPlaintext,
} from "./kiosk-provider.ts";
import { instantKioskProvider, readSubmissionRows } from "./instant-mailbox.ts";
import "../app/styles.css";

const KIOSK_REQUEST_PRESET = PRESETS.find((preset) => preset.id === "all-of-the-above") ?? PRESETS[0]!;

type KioskSession = InitiatedKioskRequest & { qrDataUrl: string };

type ReceivedSubmission = {
  row: KioskSubmissionRow;
  plaintext?: SubmissionPlaintext;
  error?: string;
};

let initialSessionPromise: Promise<KioskSession> | undefined;

function CreatorApp() {
  const [session, setSession] = useState<KioskSession>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string>();
  const [pollError, setPollError] = useState<string>();
  const [polledRows, setPolledRows] = useState<KioskSubmissionRow[]>([]);
  const [responseRefreshCounter, setResponseRefreshCounter] = useState(0);
  const [received, setReceived] = useState<ReceivedSubmission[]>([]);
  const requestId = session?.verified.payload.requestId;

  const inbox = instantKioskProvider.useSubmissionRows(requestId);
  const submissionRows = useMemo(() => mergeSubmissionRows(inbox.rows, polledRows), [inbox.rows, polledRows]);
  const submissionRowsKey = submissionRows.map((row) => `${row.id}:${row.storagePath}:${row.totalCiphertextBytes}`).join("|");
  const receivedOk = received.some((item) => item.plaintext && !item.error);
  const pendingRows = submissionRows.length > 0 && !receivedOk;

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setBusy(true);
      setError(undefined);
      try {
        const next = await initialKioskSession();
        if (!cancelled) setSession(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setReceived([]);
      return;
    }
    let cancelled = false;
    const rows = filterRowsForRequest({
      rows: submissionRows,
      requestId: session.verified.payload.requestId,
    });
    Promise.all(rows.map((row) => openRow(session, row))).then((opened) => {
      if (!cancelled) setReceived(opened);
    });
    return () => {
      cancelled = true;
    };
  }, [session, submissionRowsKey, responseRefreshCounter]);

  useEffect(() => {
    if (!requestId) {
      setPolledRows([]);
      setPollError(undefined);
      return;
    }
    const currentRequestId = requestId;
    if (receivedOk) return;
    let cancelled = false;
    async function poll() {
      try {
        const rows = await readSubmissionRows(currentRequestId);
        if (!cancelled) {
          setPolledRows(rows);
          if (rows.length > 0) setResponseRefreshCounter((value) => value + 1);
          setPollError(undefined);
        }
      } catch (e) {
        if (!cancelled) setPollError(e instanceof Error ? e.message : String(e));
      }
    }
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [requestId, receivedOk]);

  return (
    <>
      <header className="clinic-header">
        <div className="clinic-header__inner">
          <div className="clinic-logo">SH</div>
          <div>
            <div className="clinic-kicker">Self-service kiosk</div>
            <h1>SMART Health Check-in</h1>
          </div>
        </div>
      </header>

      <main className="portal kiosk-page">
        <section className="portal-card checkin-hero checkin-hero--patient">
          <div className="hero-copy">
            <div className="eyebrow">Welcome</div>
            <h2>Check in with your phone</h2>
            <p>
              Scan the code below, review the request in your health app, and send
              your check-in information back to this kiosk.
            </p>
          </div>
        </section>

        <section className="portal-card kiosk-scan-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Step 1</div>
              <h2>Scan this QR code</h2>
            </div>
            <span className={session ? "status-pill status-pill--done" : "status-pill"}>
              {session ? "QR displayed" : busy ? "Preparing QR" : "QR unavailable"}
            </span>
          </div>

          {!instantKioskProvider.configured ? (
            <div className="notice notice--error">
              Missing Instant app id. Set BUN_PUBLIC_INSTANT_APP_ID or update src/instant/public-config.ts.
            </div>
          ) : null}
          {error ? <div className="notice notice--error">{error}</div> : null}

          {busy && !session ? (
            <div className="kiosk-loading">Preparing your secure check-in QR code...</div>
          ) : null}

          {session ? (
            <div className="kiosk-grid kiosk-grid--patient">
              <div className="kiosk-qr-panel">
                <img className="kiosk-qr kiosk-qr--large" src={session.qrDataUrl} alt="SMART Health Check-in QR code" />
                <p className="kiosk-qr-caption">Open your phone camera and point it at this code.</p>
              </div>
              <div className="kiosk-patient-summary">
                <div className="patient-steps">
                  <div className="patient-step">
                    <strong>Scan</strong>
                    <span>Use your own phone so your wallet stays with you.</span>
                  </div>
                  <div className="patient-step">
                    <strong>Review</strong>
                    <span>Your health app will show what this check-in is asking for.</span>
                  </div>
                  <div className="patient-step">
                    <strong>Send</strong>
                    <span>This kiosk receives only your SMART Health Check-in response.</span>
                  </div>
                </div>
                <details>
                  <summary>Technical details</summary>
                  <div className="kiosk-details">
                    <Field label="Request" value={session.verified.payload.smartRequest.title} />
                    <Field label="Expires" value={new Date(session.verified.payload.expiresAt).toLocaleString()} />
                    <Field label="Pointer" value={session.verified.payload.requestId} />
                  </div>
                  <textarea className="json kiosk-url" readOnly value={session.submitUrl} />
                  <pre>{JSON.stringify({
                    requestRow: session.requestRow,
                    signedRequestPayload: session.verified.payload,
                    demoOnlyDesktopPrivateJwk: session.desktopPrivateJwk,
                  }, null, 2)}</pre>
                </details>
              </div>
            </div>
          ) : null}
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Step 2</div>
              <h2>{receivedOk ? "Check-in received" : pendingRows ? "Receiving your response" : "Waiting for your phone"}</h2>
            </div>
            <span className={receivedOk ? "status-pill status-pill--done" : "status-pill"}>
              {receivedOk ? "Received" : pendingRows ? "Opening response" : "Waiting for phone"}
            </span>
          </div>
          {inbox.error ? <div className="notice notice--error">{inbox.error.message}</div> : null}
          {pollError ? <div className="notice notice--error">Could not refresh phone responses: {pollError}</div> : null}
          {received.length === 0 ? (
            <p className="muted">After you approve sharing on your phone, this screen will update automatically.</p>
          ) : (
            <div className="task-list">
              {received.map((item) => (
                <article className={item.error ? "task-item kiosk-submission" : "task-item task-item--done kiosk-submission"} key={item.row.id}>
                  <div className="task-status">{submissionStatus(item)}</div>
                  <div className="kiosk-submission__body">
                    <div className="task-title">{submissionTitle(item)}</div>
                    <div className="task-description">{submissionDescription(item)}</div>
                    {!item.error ? <SubmissionDetails item={item} /> : null}
                  </div>
                  <div className="task-kind">{submissionKind(item)}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function mergeSubmissionRows(...rowSets: KioskSubmissionRow[][]): KioskSubmissionRow[] {
  const rowsById = new Map<string, KioskSubmissionRow>();
  for (const row of rowSets.flat()) {
    rowsById.set(row.id, row);
  }
  return Array.from(rowsById.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function initialKioskSession(): Promise<KioskSession> {
  if (!initialSessionPromise) {
    initialSessionPromise = createKioskSession().catch((e) => {
      initialSessionPromise = undefined;
      throw e;
    });
  }
  return initialSessionPromise;
}

async function createKioskSession(): Promise<KioskSession> {
  if (!instantKioskProvider.configured) {
    throw new Error("InstantDB app id is not configured. Set BUN_PUBLIC_INSTANT_APP_ID or update src/instant/public-config.ts.");
  }
  const initiated = await initiateKioskRequest({
    provider: instantKioskProvider,
    cryptoConfig: DEMO_KIOSK_CRYPTO_CONFIG,
    submitBaseUrl: new URL("./submit.html", location.href),
    smartRequest: {
      presetId: KIOSK_REQUEST_PRESET.id,
      title: KIOSK_REQUEST_PRESET.label,
      request: KIOSK_REQUEST_PRESET.request,
    },
  });
  const qrDataUrl = await QRCode.toDataURL(initiated.submitUrl, {
    margin: 1,
    width: 380,
    errorCorrectionLevel: "M",
  });
  return {
    ...initiated,
    qrDataUrl,
  };
}

async function openRow(session: KioskSession, row: KioskSubmissionRow): Promise<ReceivedSubmission> {
  try {
    const { plaintext } = await openKioskSubmission({
      provider: instantKioskProvider,
      request: session.verified,
      desktopPrivateKey: session.desktopPrivateKey,
      row,
    });
    return { row, plaintext };
  } catch (e) {
    return { row, error: e instanceof Error ? e.message : String(e) };
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv-row">
      <div className="kv-label">{label}</div>
      <code>{value}</code>
    </div>
  );
}

function submissionTitle(item: ReceivedSubmission): string {
  const payload = asRecord(item.plaintext?.payload);
  if (payload?.kind === "smart-health-checkin-response") {
    return "SMART Health Check-in response";
  }
  return item.row.submissionId;
}

function submissionStatus(item: ReceivedSubmission): string {
  if (!item.error) return "Received";
  return isTransientOpenError(item.error) ? "Opening" : "Review";
}

function submissionKind(item: ReceivedSubmission): string {
  if (!item.error) return "Done";
  return isTransientOpenError(item.error) ? "Retrying" : "Review";
}

function submissionDescription(item: ReceivedSubmission): string {
  if (item.error) {
    return isTransientOpenError(item.error)
      ? "The phone response has arrived. The kiosk is waiting for the encrypted file to become available."
      : item.error;
  }
  const payload = asRecord(item.plaintext?.payload);
  if (payload?.kind === "smart-health-checkin-response") {
    const smart = asRecord(payload.smartResponse);
    const artifactCount = Array.isArray(smart?.artifacts) ? smart.artifacts.length : 0;
    const statusCount = Array.isArray(smart?.requestStatus) ? smart.requestStatus.length : 0;
    return `Received ${artifactCount} artifact(s) and ${statusCount} item status row(s).`;
  }
  return "Encrypted submission opened.";
}

function isTransientOpenError(error: string): boolean {
  return error.includes("not available") ||
    error.includes("download failed: 404") ||
    error.includes("Query timed out");
}

function SubmissionDetails({ item }: { item: ReceivedSubmission }) {
  const payload = asRecord(item.plaintext?.payload);
  if (payload?.kind !== "smart-health-checkin-response") {
    return (
      <details className="kiosk-submission__details">
        <summary>Show decrypted payload</summary>
        <pre className="json result__pre">{JSON.stringify(item.plaintext, null, 2)}</pre>
      </details>
    );
  }

  return (
    <div className="kiosk-submission__details">
      <SmartResponseReview
        openedResponse={{
          smartResponseValidation: {
            ok: true,
            value: payload.smartResponse,
          },
        }}
        technicalDetails={{
          submissionRow: item.row,
          smartResponse: payload.smartResponse,
          plaintextEnvelope: {
            requestId: item.plaintext?.requestId,
            submittedAt: item.plaintext?.submittedAt,
          },
        }}
      />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <CreatorApp />
  </StrictMode>,
);
