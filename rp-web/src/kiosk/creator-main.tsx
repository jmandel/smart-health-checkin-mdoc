import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import { SmartResponseReview, asRecord } from "../app/SmartResponseReview.tsx";
import { PRESETS } from "../store.ts";
import { DEMO_KIOSK_CRYPTO_CONFIG } from "./demo-keys.ts";
import {
  filterRowsForRequest,
  formatBytes,
  initiateKioskRequest,
  KIOSK_MAX_PAYLOAD_BYTES,
  openKioskSubmission,
  type InitiatedKioskRequest,
  type KioskSubmissionRow,
  type SubmissionPlaintext,
} from "./kiosk-provider.ts";
import { instantKioskProvider } from "./instant-mailbox.ts";
import "../app/styles.css";

const KIOSK_REQUEST_PRESET = PRESETS.find((preset) => preset.id === "all-of-the-above") ?? PRESETS[0]!;

type KioskSession = InitiatedKioskRequest & { qrDataUrl: string };

type ReceivedSubmission = {
  row: KioskSubmissionRow;
  plaintext?: SubmissionPlaintext;
  error?: string;
};

function CreatorApp() {
  const [session, setSession] = useState<KioskSession>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [received, setReceived] = useState<ReceivedSubmission[]>([]);
  const requestId = session?.verified.payload.requestId;

  const inbox = instantKioskProvider.useSubmissionRows(requestId);

  useEffect(() => {
    if (!session) {
      setReceived([]);
      return;
    }
    let cancelled = false;
    const rows = filterRowsForRequest({
      rows: inbox.rows,
      requestId: session.verified.payload.requestId,
    });
    Promise.all(rows.map((row) => openRow(session, row))).then((opened) => {
      if (!cancelled) setReceived(opened);
    });
    return () => {
      cancelled = true;
    };
  }, [session, inbox.rows]);

  async function mintSession() {
    setBusy(true);
    setError(undefined);
    try {
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
        width: 340,
        errorCorrectionLevel: "M",
      });
      setSession({
        ...initiated,
        qrDataUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="clinic-header">
        <div className="clinic-header__inner">
          <div className="clinic-logo">QR</div>
          <div>
            <div className="clinic-kicker">Front desk</div>
            <h1>SMART Health Check-in</h1>
          </div>
        </div>
      </header>

      <main className="portal kiosk-page">
        <section className="portal-card checkin-hero">
          <div className="hero-copy">
            <div className="eyebrow">Clinical check-in</div>
            <h2>Start a patient check-in</h2>
            <p>
              Display a QR code for the patient, then receive only the extracted
              SMART Health Check-in response when they finish sharing from their phone.
            </p>
          </div>
          <div className="appointment-box">
            <div className="appointment-box__label">Response limit</div>
            <div className="appointment-box__title">{formatBytes(KIOSK_MAX_PAYLOAD_BYTES)}</div>
            <div className="appointment-box__meta">encrypted response for this request</div>
          </div>
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Session</div>
              <h2>QR handoff</h2>
            </div>
            <button className="checkin-button kiosk-button-inline" type="button" onClick={mintSession} disabled={busy}>
              {busy ? "Minting..." : "Mint QR"}
            </button>
          </div>

          {!instantKioskProvider.configured ? (
            <div className="notice notice--error">
              Missing Instant app id. Set BUN_PUBLIC_INSTANT_APP_ID or update src/instant/public-config.ts.
            </div>
          ) : null}
          {error ? <div className="notice notice--error">{error}</div> : null}

          {session ? (
            <div className="kiosk-grid">
              <div>
                <img className="kiosk-qr" src={session.qrDataUrl} alt="Kiosk submit QR code" />
                <p className="muted">Scan with a phone to open the submit page. The QR contains only the request pointer.</p>
              </div>
              <div className="kiosk-details">
                <Field label="Request pointer" value={session.verified.payload.requestId} />
                <Field label="Request" value={session.verified.payload.smartRequest.title} />
                <Field label="Expires" value={new Date(session.verified.payload.expiresAt).toLocaleString()} />
                <details>
                  <summary>Submit URL</summary>
                  <textarea className="json kiosk-url" readOnly value={session.submitUrl} />
                </details>
                <details>
                  <summary>Technical setup</summary>
                  <pre>{JSON.stringify({
                    requestRow: session.requestRow,
                    signedRequestPayload: session.verified.payload,
                    demoOnlyDesktopPrivateJwk: session.desktopPrivateJwk,
                  }, null, 2)}</pre>
                </details>
              </div>
            </div>
          ) : (
            <p className="muted">No active QR yet.</p>
          )}
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Patient response</div>
              <h2>Check-in status</h2>
            </div>
            <span className="status-pill">{inbox.isLoading ? "Listening..." : `${received.length} rows`}</span>
          </div>
          {inbox.error ? <div className="notice notice--error">{inbox.error.message}</div> : null}
          {received.length === 0 ? (
            <p className="muted">The patient response for this request will appear here after the phone share completes.</p>
          ) : (
            <div className="task-list">
              {received.map((item) => (
                <article className={item.error ? "task-item kiosk-submission" : "task-item task-item--done kiosk-submission"} key={item.row.id}>
                  <div className="task-status">{item.error ? "Rejected" : "Received"}</div>
                  <div className="kiosk-submission__body">
                    <div className="task-title">{submissionTitle(item)}</div>
                    <div className="task-description">{item.error ?? submissionDescription(item)}</div>
                    {!item.error ? <SubmissionDetails item={item} /> : null}
                  </div>
                  <div className="task-kind">{formatBytes(item.row.totalCiphertextBytes)}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
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

function submissionDescription(item: ReceivedSubmission): string {
  const payload = asRecord(item.plaintext?.payload);
  if (payload?.kind === "smart-health-checkin-response") {
    const smart = asRecord(payload.smartResponse);
    const artifactCount = Array.isArray(smart?.artifacts) ? smart.artifacts.length : 0;
    const statusCount = Array.isArray(smart?.requestStatus) ? smart.requestStatus.length : 0;
    return `Received ${artifactCount} artifact(s) and ${statusCount} item status row(s).`;
  }
  return "Encrypted submission opened.";
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
