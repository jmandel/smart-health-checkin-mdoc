import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SmartCheckinButton, useDcApiSupport, type SmartCheckinVerifierState } from "../sdk/react.tsx";
import { validateSmartCheckinRequest, type SmartCheckinRequest } from "../sdk/core.ts";
import type {
  VerifierCredentialCompletion,
  VerifierPreparedCredentialRequest,
} from "../sdk/dcapi-verifier.ts";
import { DEMO_KIOSK_CRYPTO_CONFIG } from "./demo-keys.ts";
import { instantKioskProvider } from "./instant-mailbox.ts";
import {
  completeKioskRequest,
  formatBytes,
  resolveKioskRequest,
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
  const [row, setRow] = useState<KioskSubmissionRow>();

  const parsed = useMemo(() => {
    try {
      return { pointer: kioskRequestPointerFromLocationHash(location.hash) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const resolved = requestStatus.state === "ready" ? requestStatus.resolved : undefined;
  const request = resolved?.verified.payload.smartRequest.request;
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
    prepared: VerifierPreparedCredentialRequest,
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

      setStatus("Encrypting opened DC API response...");
      const completed = await completeKioskRequest({
        provider: instantKioskProvider,
        request: requestStatus.resolved.verified,
        payload: buildDcapiPayload({
          resolved: requestStatus.resolved,
          prepared,
          completion,
        }),
      });
      setRow(completed.row);
      setStatus(
        `Submitted ${formatBytes(completed.totalPlaintextBytes)}. The kiosk should receive the opened DC API result in realtime.`,
      );
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
            <div className="clinic-kicker">Kiosk mode</div>
            <h1>Phone wallet handoff</h1>
          </div>
        </div>
      </header>

      <main className="portal kiosk-page">
        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Request pointer</div>
              <h2>Decrypt and verify kiosk request</h2>
            </div>
            <span className={requestStatus.state === "ready" ? "status-pill status-pill--done" : "status-pill"}>
              {requestStatus.state === "ready" ? "Verified" : requestStatus.state === "checking" ? "Checking" : "Blocked"}
            </span>
          </div>

          {parsed.error ? <div className="notice notice--error">{parsed.error}</div> : null}
          {requestStatus.state === "error" ? <div className="notice notice--error">{requestStatus.error}</div> : null}
          {!instantKioskProvider.configured ? (
            <div className="notice notice--error">
              Missing Instant app id. Set BUN_PUBLIC_INSTANT_APP_ID or update src/instant/public-config.ts.
            </div>
          ) : null}
          {resolved ? (
            <div className="kiosk-details">
              <Field label="Request pointer" value={resolved.verified.payload.requestId} />
              <Field label="Route" value={resolved.verified.payload.routeId} />
              <Field label="Request" value={resolved.verified.payload.smartRequest.title} />
              <Field label="Expires" value={new Date(resolved.verified.payload.expiresAt).toLocaleString()} />
              <Field label="Max encrypted blob" value={formatBytes(resolved.verified.payload.constraints.maxBlobBytes)} />
              <Field label="JWS hash" value={resolved.verified.requestHash} />
              <p className="muted">
                The QR only carries this pointer. The full SMART request was fetched
                from the provider, decrypted locally, and verified as a trusted creator JWS.
              </p>
              <details>
                <summary>Signed SMART request payload</summary>
                <pre>{JSON.stringify(resolved.verified.payload, null, 2)}</pre>
              </details>
            </div>
          ) : null}
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Digital Credentials API</div>
              <h2>Share from your health app</h2>
            </div>
            <span className={dcApi.state === "supported" ? "status-pill status-pill--done" : "status-pill"}>
              {dcApi.state === "supported" ? "Available" : "Unavailable"}
            </span>
          </div>

          {request ? <RequestTaskList request={request} /> : <div className="notice notice--error">No SMART request is available.</div>}
          {requestValidation && !requestValidation.ok ? (
            <div className="notice notice--error">{requestValidation.error}</div>
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
              onComplete={(completion, prepared) => {
                void submitCompletion(completion, prepared);
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
          {row ? (
            <div className="kiosk-details">
              <Field label="Submission" value={row.submissionId} />
              <Field label="Encrypted blob" value={formatBytes(row.totalCiphertextBytes)} />
              <Field label="Storage path" value={row.storagePath} />
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}

function buildDcapiPayload(input: {
  resolved: ResolvedKioskRequest;
  prepared: VerifierPreparedCredentialRequest;
  completion: VerifierCredentialCompletion;
}): Record<string, unknown> {
  const request = input.resolved.verified.payload.smartRequest;
  return {
    kind: "dcapi-smart-checkin",
    requestPresetId: request.presetId,
    requestLabel: request.title,
    request: request.request,
    requestHash: input.resolved.verified.requestHash,
    smartRequestHash: request.requestHash,
    preparedRequest: {
      handle: input.prepared.handle,
      authorityKind: input.prepared.authorityKind,
      publicArtifacts: input.prepared.publicArtifacts,
    },
    credentialDebugJson: input.completion.credentialDebugJson,
    openedResponse: {
      dcapiResponse: input.completion.openedResponse.dcapiResponse,
      deviceResponse: input.completion.openedResponse.deviceResponse,
      smartResponseValidation: input.completion.openedResponse.smartResponseValidation,
    },
    submittedFrom: {
      origin: location.origin,
      userAgent: navigator.userAgent,
    },
  };
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
  if (submitting) return "Sending result to kiosk...";
  if (submitted) return "Check-in information sent";
  switch (state.phase) {
    case "preparing":
      return "Preparing wallet request...";
    case "requesting":
      return "Opening health app...";
    case "completing":
      return "Opening wallet response...";
    case "complete":
      return "Wallet response opened";
    case "error":
      return "Try sharing again";
    case "idle":
      return "Share check-in information";
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <SubmitApp />
  </StrictMode>,
);
