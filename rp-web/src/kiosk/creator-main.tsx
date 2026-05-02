import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import { SmartResponseReview, asRecord, smartValueFromOpenedResponse } from "../app/SmartResponseReview.tsx";
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
  const routeId = session?.verified.payload.routeId;

  const inbox = instantKioskProvider.useSubmissionRows(routeId);

  useEffect(() => {
    if (!session) {
      setReceived([]);
      return;
    }
    let cancelled = false;
    const rows = filterRowsForRequest({
      rows: inbox.rows,
      routeId: session.verified.payload.routeId,
      requestHash: session.verified.requestHash,
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
            <div className="clinic-kicker">Kiosk mode</div>
            <h1>SMART Health Check-in mailbox demo</h1>
          </div>
        </div>
      </header>

      <main className="portal kiosk-page">
        <section className="portal-card checkin-hero">
          <div className="hero-copy">
            <div className="eyebrow">Desktop creator</div>
            <h2>Mint an encrypted request pointer</h2>
            <p>
              This page signs the full SMART request as JWS, encrypts it before
              storing it in Instant, keeps the desktop response-decryption key in
              memory, and listens for encrypted DC API results.
            </p>
          </div>
          <div className="appointment-box">
            <div className="appointment-box__label">Payload target</div>
            <div className="appointment-box__title">{formatBytes(KIOSK_MAX_PAYLOAD_BYTES)}</div>
            <div className="appointment-box__meta">encrypted Storage blob + realtime pointer</div>
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
                <Field label="Route" value={session.verified.payload.routeId} />
                <Field label="Session" value={session.verified.payload.sessionId} />
                <Field label="Request" value={session.verified.payload.smartRequest.title} />
                <Field label="Expires" value={new Date(session.verified.payload.expiresAt).toLocaleString()} />
                <Field label="JWS hash" value={session.verified.requestHash} />
                <details>
                  <summary>Submit URL</summary>
                  <textarea className="json kiosk-url" readOnly value={session.submitUrl} />
                </details>
                <details>
                  <summary>Instant request row (encrypted)</summary>
                  <pre>{JSON.stringify(session.requestRow, null, 2)}</pre>
                </details>
                <details>
                  <summary>Signed SMART request JWS payload</summary>
                  <pre>{JSON.stringify(session.verified.payload, null, 2)}</pre>
                </details>
                <details>
                  <summary>Demo-only desktop private key export</summary>
                  <pre>{JSON.stringify(session.desktopPrivateJwk, null, 2)}</pre>
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
              <div className="eyebrow">Mailbox</div>
              <h2>Received submissions</h2>
            </div>
            <span className="status-pill">{inbox.isLoading ? "Listening..." : `${received.length} rows`}</span>
          </div>
          {inbox.error ? <div className="notice notice--error">{inbox.error.message}</div> : null}
          {received.length === 0 ? (
            <p className="muted">Encrypted phone submission pointers for this route will appear here.</p>
          ) : (
            <div className="task-list">
              {received.map((item) => (
                <article className={item.error ? "task-item kiosk-submission" : "task-item task-item--done kiosk-submission"} key={item.row.id}>
                  <div className="task-status">{item.error ? "Rejected" : "Opened"}</div>
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
  if (payload?.kind === "dcapi-smart-checkin") {
    return String(payload.requestLabel ?? payload.requestPresetLabel ?? payload.requestPresetId ?? "SMART Health Check-in response");
  }
  return item.row.submissionId;
}

function submissionDescription(item: ReceivedSubmission): string {
  const payload = asRecord(item.plaintext?.payload);
  if (payload?.kind === "dcapi-smart-checkin") {
    const smart = smartValueFromOpenedResponse(payload.openedResponse);
    const artifactCount = Array.isArray(smart?.artifacts) ? smart.artifacts.length : 0;
    const statusCount = Array.isArray(smart?.requestStatus) ? smart.requestStatus.length : 0;
    return `Opened DC API response: ${artifactCount} artifact(s), ${statusCount} item status row(s).`;
  }
  return "Encrypted submission opened.";
}

function SubmissionDetails({ item }: { item: ReceivedSubmission }) {
  const payload = asRecord(item.plaintext?.payload);
  if (payload?.kind !== "dcapi-smart-checkin") {
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
        openedResponse={payload.openedResponse}
        technicalDetails={{
          submissionRow: item.row,
          request: payload.request,
          requestHash: payload.requestHash,
          preparedRequest: payload.preparedRequest,
          credentialDebugJson: payload.credentialDebugJson,
          submittedFrom: payload.submittedFrom,
          plaintextEnvelope: {
            requestId: item.plaintext?.requestId,
            sessionId: item.plaintext?.sessionId,
            routeId: item.plaintext?.routeId,
            requestHash: item.plaintext?.requestHash,
            nonce: item.plaintext?.nonce,
            submittedAt: item.plaintext?.submittedAt,
            formId: item.plaintext?.formId,
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
