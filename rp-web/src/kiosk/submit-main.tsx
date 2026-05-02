import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SmartCheckinButton, useDcApiSupport, type SmartCheckinVerifierState } from "../sdk/react.tsx";
import { validateSmartCheckinRequest, type SmartCheckinRequest } from "../sdk/core.ts";
import type {
  VerifierCredentialCompletion,
} from "../sdk/dcapi-verifier.ts";
import { DEMO_KIOSK_CRYPTO_CONFIG } from "./demo-keys.ts";
import { instantKioskProvider } from "./instant-mailbox.ts";
import {
  completeKioskRequest,
  formatBytes,
  resolveKioskRequest,
  type CompletedKioskRequest,
  type KioskSubmissionRow,
  type ResolvedKioskRequest,
} from "./kiosk-provider.ts";
import {
  kioskRequestPointerFromLocationHash,
} from "./protocol.ts";
import "../app/styles.css";

const SMART_LOGO_URL = "https://smarthealthit.org/wp-content/themes/SMART/images/logo.svg";

type RequestStatus =
  | { state: "checking" }
  | { state: "ready"; resolved: ResolvedKioskRequest }
  | { state: "error"; error: string };

function SubmitApp() {
  const dcApi = useDcApiSupport();
  const [requestStatus, setRequestStatus] = useState<RequestStatus>({ state: "checking" });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>();
  const [row, setRow] = useState<CompletedKioskRequest>();

  const parsed = useMemo(() => {
    try {
      return { pointer: kioskRequestPointerFromLocationHash(location.hash) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const resolved = requestStatus.state === "ready" ? requestStatus.resolved : undefined;
  const request = resolved?.verified.payload.smartRequest;
  const requestValidation = useMemo(
    () => request ? validateSmartCheckinRequest(request) : undefined,
    [request],
  );

  useEffect(() => {
    let cancelled = false;
    async function resolveRequest() {
      setRequestStatus({ state: "checking" });
      try {
        if (!instantKioskProvider.configured) throw new Error("InstantDB app id is not configured.");
        if (!parsed.pointer) throw new Error(parsed.error ?? "Missing kiosk request pointer.");
        const next = await resolveKioskRequest({
          provider: instantKioskProvider,
          cryptoConfig: DEMO_KIOSK_CRYPTO_CONFIG,
          requestId: parsed.pointer.requestId,
        });
        if (!cancelled) setRequestStatus({ state: "ready", resolved: next });
      } catch (e) {
        if (!cancelled) {
          setRequestStatus({ state: "error", error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    void resolveRequest();
    return () => {
      cancelled = true;
    };
  }, [parsed.error, parsed.pointer]);

  async function submitCompletion(
    completion: VerifierCredentialCompletion,
  ) {
    setSubmitting(true);
    setRow(undefined);
    try {
      if (!instantKioskProvider.configured) throw new Error("InstantDB app id is not configured.");
      if (requestStatus.state !== "ready") {
        throw new Error(requestStatus.state === "error" ? requestStatus.error : "Kiosk request is still being checked.");
      }
      if (!request || !requestValidation || !requestValidation.ok) {
        throw new Error(requestValidation && !requestValidation.ok ? requestValidation.error : "SMART request is invalid.");
      }

      setStatus("Encrypting SMART response for the front desk...");
      const completed = await completeKioskRequest({
        provider: instantKioskProvider,
        request: requestStatus.resolved.verified,
        payload: buildDcapiPayload({
          completion,
        }),
      });
      setRow(completed);
      setStatus("Your check-in information was sent. You can return to the kiosk.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const canShare =
    Boolean(request) &&
    requestValidation?.ok === true &&
    requestStatus.state === "ready" &&
    instantKioskProvider.configured &&
    dcApi.state === "supported" &&
    !submitting;

  return (
    <>
      <header className="clinic-header">
        <div className="clinic-header__inner">
          <div className="clinic-logo">PH</div>
          <div>
            <div className="clinic-kicker">Patient check-in</div>
            <h1>SMART Health Check-in</h1>
          </div>
        </div>
      </header>

      <main className="portal kiosk-page">
        <section className="portal-card checkin-hero checkin-hero--patient">
          <div className="hero-copy">
            <div className="eyebrow">Welcome</div>
            <h2>Share your check-in information</h2>
            <p>
              Review what the kiosk is asking for, then open your health app to
              send the requested information back to the front desk.
            </p>
          </div>
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Step 1</div>
              <h2>{request ? "Review the request" : "Loading check-in request"}</h2>
            </div>
            <span className={requestStatus.state === "ready" ? "status-pill status-pill--done" : "status-pill"}>
              {requestStatus.state === "ready" ? "Ready" : requestStatus.state === "checking" ? "Loading" : "Blocked"}
            </span>
          </div>

          {parsed.error ? <div className="notice notice--error">{parsed.error}</div> : null}
          {requestStatus.state === "error" ? <div className="notice notice--error">{requestStatus.error}</div> : null}
          {!instantKioskProvider.configured ? (
            <div className="notice notice--error">
              Missing Instant app id. Set BUN_PUBLIC_INSTANT_APP_ID or update src/instant/public-config.ts.
            </div>
          ) : null}

          {request ? <RequestTaskList request={request} /> : null}
          {requestValidation && !requestValidation.ok ? (
            <div className="notice notice--error">{requestValidation.error}</div>
          ) : null}
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Step 2</div>
              <h2>Share from your health app</h2>
            </div>
            <span className={dcApi.state === "supported" ? "status-pill status-pill--done" : "status-pill"}>
              {dcApi.state === "supported" ? "Available" : "Unavailable"}
            </span>
          </div>

          {!request && requestStatus.state !== "checking" ? (
            <div className="notice notice--error">No SMART Health Check-in request is available.</div>
          ) : null}
          {dcApi.state !== "supported" ? (
            <div className="support-note support-note--warn">
              {dcApi.state === "checking" ? "Checking browser support..." : dcApi.reason}
            </div>
          ) : null}

          {request ? (
            <SmartCheckinButton
              className={row ? "checkin-button checkin-button--complete" : "checkin-button"}
              type="button"
              request={request}
              verifier={{ origin: location.origin }}
              disabled={!canShare}
              onComplete={(completion) => {
                void submitCompletion(completion);
              }}
              onError={(error) => {
                setStatus(error.message);
              }}
            >
              {(state) => (
                <>
                  <span className="checkin-button__mark">
                    <img src={SMART_LOGO_URL} alt="SMART" />
                  </span>
                  <span className="checkin-button__text">
                    <span className="checkin-button__primary">
                      {buttonLabel(state, submitting, Boolean(row))}
                    </span>
                  </span>
                </>
              )}
            </SmartCheckinButton>
          ) : null}

          {status ? <div className={row ? "notice notice--success" : "notice"}>{status}</div> : null}
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">For developers</div>
              <h2>Technical details</h2>
            </div>
          </div>
          <div className="kiosk-details">
            <details>
              <summary>Show request and response transport details</summary>
              {resolved ? (
                <>
                  <Field label="Request pointer" value={resolved.verified.payload.requestId} />
                  <Field
                    label="Request purpose"
                    value={resolved.verified.payload.smartRequest.purpose ?? resolved.verified.payload.smartRequest.id}
                  />
                  <Field label="SMART request id" value={resolved.verified.payload.smartRequest.id} />
                  <Field label="Expires" value={new Date(resolved.verified.payload.expiresAt).toLocaleString()} />
                  <Field label="Response limit" value={formatBytes(resolved.verified.payload.constraints.maxPlaintextBytes)} />
                  <p className="muted">
                    The QR carried only this pointer. The full SMART request was fetched
                    from the provider, decrypted locally, and verified as a trusted creator JWS.
                  </p>
                </>
              ) : null}
              {row ? (
                <>
                  <Field label="Instant write" value="Confirmed synced" />
                  <Field label="Submission" value={row.row.submissionId} />
                  <Field label="Encrypted blob" value={formatBytes(row.totalCiphertextBytes)} />
                  <Field label="Storage path" value={row.row.storagePath} />
                  <Field label="Storage file" value={row.row.storageFileId} />
                </>
              ) : null}
              <pre>{JSON.stringify({
                requestPointer: resolved?.verified.payload.requestId ?? parsed.pointer?.requestId,
                requestState: requestStatus.state,
                requestError: requestStatus.state === "error" ? requestStatus.error : undefined,
                dcApiState: dcApi.state,
                requestRow: resolved?.requestRow,
                signedRequestPayload: resolved?.verified.payload,
                submissionRow: row ? submissionDebugRow(row.row) : undefined,
              }, null, 2)}</pre>
            </details>
          </div>
        </section>
      </main>
    </>
  );
}

function buildDcapiPayload(input: {
  completion: VerifierCredentialCompletion;
}): Record<string, unknown> {
  const smartResponseValidation = asRecord(input.completion.openedResponse.smartResponseValidation);
  if (smartResponseValidation?.ok !== true) {
    throw new Error("Wallet response did not contain a valid SMART Health Check-in response.");
  }
  return {
    kind: "smart-health-checkin-response",
    smartResponse: smartResponseValidation.value,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function RequestTaskList({ request }: { request: SmartCheckinRequest }) {
  return (
    <div className="task-list">
      {request.items.map((item) => (
        <div className="task-item" key={item.id}>
          <div className="task-status">Requested</div>
          <div className="task-details">
            <div className="task-title">{item.title}</div>
            <div className="task-description">{item.summary ?? selectorDescription(item.content)}</div>
          </div>
          <div className="task-kind">{selectorKind(item.content)}</div>
        </div>
      ))}
    </div>
  );
}

function selectorKind(content: SmartCheckinRequest["items"][number]["content"]): string {
  return content.kind === "questionnaire" ? "Questionnaire" : "FHIR resources";
}

function selectorDescription(content: SmartCheckinRequest["items"][number]["content"]): string {
  if (content.kind === "questionnaire") {
    if (typeof content.questionnaire === "string") return content.questionnaire;
    const questionnaire = asRecord(content.questionnaire);
    if (typeof questionnaire?.title === "string") return questionnaire.title;
    const resource = asRecord(questionnaire?.resource);
    return typeof resource?.title === "string" ? resource.title : "Form answers requested by the verifier.";
  }
  return content.profiles?.join(", ") ?? content.resourceTypes?.join(", ") ?? "FHIR resources";
}

function buttonLabel(state: SmartCheckinVerifierState, submitting: boolean, submitted: boolean): string {
  if (submitting) return "Sending SMART response...";
  if (submitted) return "Check-in information sent";
  switch (state.phase) {
    case "preparing":
      return "Preparing wallet request...";
    case "requesting":
      return "Opening health app...";
    case "completing":
      return "Validating SMART response...";
    case "complete":
      return "SMART response ready";
    case "error":
      return "Try sharing again";
    case "idle":
      return "Share check-in information";
  }
}

function submissionDebugRow(row: KioskSubmissionRow): Record<string, unknown> {
  return {
    id: row.id,
    submissionId: row.submissionId,
    requestId: row.requestId,
    storagePath: row.storagePath,
    storageFileId: row.storageFileId,
  };
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv-row">
      <div className="kv-label">{label}</div>
      <code>{value}</code>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <SubmitApp />
  </StrictMode>,
);
