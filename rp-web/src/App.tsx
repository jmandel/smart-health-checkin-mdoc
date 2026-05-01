import { useEffect, useMemo, useState } from "react";
import { PRESETS, useStore } from "./store.ts";
import { emit, getRing, subscribe, type DebugEvent } from "./debug/events.ts";
import { ResourceCard } from "./app/ResourceCards.tsx";
import {
  base64UrlEncodeBytes,
  buildDcapiSessionTranscript,
  buildOrgIsoMdocRequest,
  hex,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  openWalletResponse,
  PROTOCOL_ID,
  SMART_RESPONSE_ELEMENT_ID,
  SMART_REQUEST_INFO_KEY,
  validateSmartCheckinRequest,
  type DcapiMdocResponse,
  type SmartCheckinRequest,
} from "./protocol/index.ts";

type TaskView = {
  id: string;
  title: string;
  description: string;
  kind: string;
  done: boolean;
};

const SMART_LOGO_URL = "https://smarthealthit.org/wp-content/themes/SMART/images/logo.svg";

export function App() {
  const presetId = useStore((s) => s.presetId);
  const requestText = useStore((s) => s.requestText);
  const validation = useStore((s) => s.validation);
  const dcApi = useStore((s) => s.dcApi);
  const runId = useStore((s) => s.runId);
  const selectPreset = useStore((s) => s.selectPreset);
  const setRequestText = useStore((s) => s.setRequestText);
  const resetRunId = useStore((s) => s.resetRunId);
  const events = useDebugEvents();
  const [loading, setLoading] = useState(false);

  const request = useMemo(() => parseRequest(requestText), [requestText]);
  const opened = latestEvent(events, "DCAPI_RESPONSE_OPENED");
  const openError = latestEvent(events, "RESPONSE_OPEN_ERROR");
  const answers = responseAnswers(opened);
  const tasks = request ? request.items.map((item) => taskFromItem(item, answers)) : [];
  const complete = tasks.length > 0 && tasks.every((task) => task.done);

  const startCheckin = async () => {
    if (!request || !validation.ok || loading) return;
    setLoading(true);
    try {
      const validated = validateSmartCheckinRequest(request);
      if (!validated.ok) {
        emit("ERROR", { where: "validate", error: validated.error });
        return;
      }
      const bundle = await buildOrgIsoMdocRequest(validated.value, {
        origin: location.origin,
      });
      const arg = bundle.navigatorArgument;
      const recipientPrivateJwk = await crypto.subtle.exportKey(
        "jwk",
        bundle.verifierKeyPair.privateKey,
      );
      const sessionTranscript = await buildDcapiSessionTranscript({
        origin: location.origin,
        encryptionInfo: bundle.encryptionInfoBytes,
      });
      emit("SMART_REQUEST_INFO", {
        key: SMART_REQUEST_INFO_KEY,
        json: bundle.smartRequestJson,
        decoded: validated.value,
      });
      emit("DEVICE_REQUEST", {
        deviceRequest: arg.digital.requests[0].data.deviceRequest,
        requestedElementIdentifier: bundle.requestedElementIdentifier,
        requestInfoKey: SMART_REQUEST_INFO_KEY,
      });
      emit("ENCRYPTION_INFO", {
        encryptionInfo: arg.digital.requests[0].data.encryptionInfo,
      });
      emit("REQUEST_ARTIFACTS", {
        origin: location.origin,
        protocol: PROTOCOL_ID,
        docType: MDOC_DOC_TYPE,
        namespace: MDOC_NAMESPACE,
        responseElement: SMART_RESPONSE_ELEMENT_ID,
        navigatorArgument: arg,
        recipientPublicJwk: bundle.verifierPublicJwk,
        recipientPrivateJwk,
        deviceRequest: {
          base64url: base64UrlEncodeBytes(bundle.deviceRequestBytes),
          hex: hex(bundle.deviceRequestBytes),
        },
        encryptionInfo: {
          base64url: base64UrlEncodeBytes(bundle.encryptionInfoBytes),
          hex: hex(bundle.encryptionInfoBytes),
        },
        sessionTranscript: {
          base64url: base64UrlEncodeBytes(sessionTranscript),
          hex: hex(sessionTranscript),
        },
        readerAuth: bundle.readerAuthBytes
          ? {
              hex: hex(bundle.readerAuthBytes),
              readerPublicJwk: bundle.readerPublicJwk,
              readerCertificateDer: bundle.readerCertificateDer
                ? {
                    base64url: base64UrlEncodeBytes(bundle.readerCertificateDer),
                    hex: hex(bundle.readerCertificateDer),
                  }
                : undefined,
              note: "Per-request demo readerAuth. The key is ephemeral until stable reader identity is implemented.",
            }
          : undefined,
        note: "Local debug artifact. The private JWK is intentionally logged for offline HPKE debugging.",
      });
      emit("DCAPI_ARGUMENT", arg);
      const credential = await navigator.credentials.get(
        arg as unknown as CredentialRequestOptions,
      );
      const credentialDebugJson = credentialToDebugJson(credential);
      emit("DCAPI_RESULT", credentialDebugJson);
      try {
        const openedResponse = await openWalletResponse({
          response: credential as unknown as DcapiMdocResponse,
          recipientPrivateKey: bundle.verifierKeyPair.privateKey,
          recipientPublicJwk: bundle.verifierPublicJwk,
          sessionTranscript,
          smartRequest: validated.value,
        });
        emit("DCAPI_RESPONSE_OPENED", {
          dcapiResponse: openedResponse.dcapiResponse,
          deviceResponse: openedResponse.deviceResponse,
        });
      } catch (e) {
        emit("RESPONSE_OPEN_ERROR", {
          error: e instanceof Error ? e.message : String(e),
          credential: credentialDebugJson,
          origin: location.origin,
          recipientPublicJwk: bundle.verifierPublicJwk,
          recipientPrivateJwk,
          sessionTranscript: {
            base64url: base64UrlEncodeBytes(sessionTranscript),
            hex: hex(sessionTranscript),
          },
        });
      }
    } catch (e) {
      emit("ERROR", {
        where: "navigator.credentials.get",
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="clinic-header">
        <div className="clinic-header__inner">
          <div className="clinic-logo">DM</div>
          <div>
            <div className="clinic-kicker">Patient portal</div>
            <h1>Dr. Mandel&apos;s Family Medicine</h1>
          </div>
        </div>
      </header>

      <main className="portal">
        <section className="portal-card checkin-hero">
          <div className="hero-copy">
            <div className="eyebrow">Same-day check-in</div>
            <h2>Migraine follow-up visit</h2>
            <p>
              Share your insurance, clinical summary, and migraine intake answers from
              your health app before your appointment.
            </p>
          </div>
          <div className="appointment-box">
            <div className="appointment-box__label">Appointment</div>
            <div className="appointment-box__title">Today, 2:30 PM</div>
            <div className="appointment-box__meta">Telehealth with Family Medicine</div>
          </div>
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Requested information</div>
              <h2>Pre-visit checklist</h2>
            </div>
            {complete ? (
              <span className="status-pill status-pill--done">Received</span>
            ) : (
              <span className="status-pill">Pending</span>
            )}
          </div>

          <TaskList tasks={tasks} />

          {openError ? (
            <div className="notice notice--error">
              Could not open the wallet response:{" "}
              {readPath<string>(openError.payload, ["error"]) ?? "unknown error"}
            </div>
          ) : null}

          <button
            className={complete ? "checkin-button checkin-button--complete" : "checkin-button"}
            type="button"
            disabled={dcApi.state !== "supported" || !validation.ok || loading}
            onClick={startCheckin}
          >
            <span className="checkin-button__mark">
              <img src={SMART_LOGO_URL} alt="SMART" />
            </span>
            <span className="checkin-button__text">
              <span className="checkin-button__primary">
                {loading
                  ? "Opening health app..."
                  : complete
                    ? "Check-in information received"
                    : "Share check-in information"}
              </span>
            </span>
          </button>

          <DcApiStatus />
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Verifier result</div>
              <h2>Received data</h2>
            </div>
          </div>
          <ResponsePanel events={events} />
        </section>

        <section className="tool-panel">
          <details open>
            <summary>Developer inspector</summary>
            <div className="tool-grid">
              <RequestInspector
                presetId={presetId}
                requestText={requestText}
                request={request}
                validation={validation}
                selectPreset={selectPreset}
                setRequestText={setRequestText}
              />
              <ProtocolInspector runId={runId} resetRunId={resetRunId} events={events} />
            </div>
          </details>
        </section>
      </main>
    </>
  );
}

function credentialToDebugJson(credential: unknown): unknown {
  if (!credential || typeof credential !== "object") return credential;
  const c = credential as {
    id?: unknown;
    type?: unknown;
    protocol?: unknown;
    data?: unknown;
  };
  return {
    id: c.id,
    type: c.type,
    protocol: c.protocol,
    data: c.data,
  };
}

function TaskList({ tasks }: { tasks: TaskView[] }) {
  if (tasks.length === 0) {
    return <div className="muted">No valid request items.</div>;
  }
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div className={task.done ? "task-item task-item--done" : "task-item"} key={task.id}>
          <div className="task-status">{task.done ? "Received" : "Pending"}</div>
          <div className="task-details">
            <div className="task-title">{task.title}</div>
            <div className="task-description">{task.description}</div>
          </div>
          <div className="task-kind">{task.kind}</div>
        </div>
      ))}
    </div>
  );
}

function DcApiStatus() {
  const dcApi = useStore((s) => s.dcApi);
  if (dcApi.state === "supported") {
    return <div className="support-note support-note--ok">Digital Credentials API detected</div>;
  }
  if (dcApi.state === "checking") {
    return <div className="support-note">Checking browser support...</div>;
  }
  return <div className="support-note support-note--warn">{dcApi.reason}</div>;
}

function RequestInspector(props: {
  presetId: string;
  requestText: string;
  request: SmartCheckinRequest | undefined;
  validation: { ok: true } | { ok: false; error: string };
  selectPreset: (id: string) => void;
  setRequestText: (text: string) => void;
}) {
  return (
    <div className="tool-section">
      <div className="tool-heading">Request</div>
      <label className="field-row">
        <span>Preset</span>
        <select value={props.presetId} onChange={(e) => props.selectPreset(e.target.value)}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {props.request ? (
        <div className="decoded-list">
          {props.request.items.map((item) => {
            const task = taskFromItem(item, undefined);
            return (
              <div className="decoded-row" key={task.id}>
                <code>{task.id}</code>
                <span>{task.title}</span>
                <small>{task.kind}</small>
              </div>
            );
          })}
        </div>
      ) : null}

      <textarea
        className="json"
        value={props.requestText}
        onChange={(e) => props.setRequestText(e.target.value)}
        spellCheck={false}
        rows={14}
      />
      {props.validation.ok ? (
        <div className="status-line status-line--ok">request shape OK</div>
      ) : (
        <div className="status-line status-line--err">{props.validation.error}</div>
      )}
    </div>
  );
}

function ProtocolInspector(props: {
  runId: string;
  resetRunId: () => void;
  events: DebugEvent[];
}) {
  const latestArgument = latestEvent(props.events, "DCAPI_ARGUMENT");
  const latestRequestInfo = latestEvent(props.events, "SMART_REQUEST_INFO");
  return (
    <div className="tool-section">
      <div className="tool-heading">Protocol</div>
      <div className="kv">
        <div className="kv__key">Trace ID</div>
        <div className="kv__val">
          <code>{props.runId}</code>
          <button
            className="small-button"
            type="button"
            title="Start a new debug trace ID for future console/CDP events"
            onClick={props.resetRunId}
          >
            new trace
          </button>
        </div>
        <div className="kv__key">Origin</div>
        <div className="kv__val">
          <code>{location.origin}</code>
        </div>
        <div className="kv__key">Protocol</div>
        <div className="kv__val">
          <code>{PROTOCOL_ID}</code>
        </div>
        <div className="kv__key">DocType</div>
        <div className="kv__val">
          <code>{MDOC_DOC_TYPE}</code>
        </div>
        <div className="kv__key">Namespace</div>
        <div className="kv__val">
          <code>{MDOC_NAMESPACE}</code>
        </div>
        <div className="kv__key">Element</div>
        <div className="kv__val">
          <code>{SMART_RESPONSE_ELEMENT_ID}</code>
        </div>
      </div>
      <p className="tool-help">
        Trace ID is for grouping console/CDP debug events. It does not change the request.
      </p>

      {latestRequestInfo ? (
        <>
          <div className="tool-subheading">requestInfo.{SMART_REQUEST_INFO_KEY}</div>
          <pre className="json compact-pre">
            {JSON.stringify(readPath(latestRequestInfo.payload, ["decoded"]), null, 2)}
          </pre>
        </>
      ) : null}

      {latestArgument ? (
        <>
          <div className="tool-subheading">navigator.credentials.get argument</div>
          <pre className="json compact-pre">{JSON.stringify(latestArgument.payload, null, 2)}</pre>
        </>
      ) : null}

      <div className="tool-subheading">Events</div>
      <EventLog events={props.events} />
    </div>
  );
}

function EventLog({ events }: { events: DebugEvent[] }) {
  if (events.length === 0) {
    return <div className="muted">No events yet.</div>;
  }
  return (
    <ol className="events">
      {events.slice(-25).map((e, i) => (
        <li key={`${e.at}-${i}`}>
          <code className="events__kind">{e.kind}</code>
          <span className="events__at">{e.at.slice(11, 19)}</span>
        </li>
      ))}
    </ol>
  );
}

function ResponsePanel({ events }: { events: DebugEvent[] }) {
  const last = latestEvent(events, "DCAPI_RESPONSE_OPENED", "RESPONSE_OPEN_ERROR", "DCAPI_RESULT");

  if (!last) {
    return <div className="empty-state">No wallet response yet.</div>;
  }

  if (last.kind === "RESPONSE_OPEN_ERROR") {
    const error = readPath<string>(last.payload, ["error"]);
    return (
      <div className="result">
        <div className="notice notice--error">Response returned, but HPKE open failed.</div>
        <pre className="json result__pre">{error ?? JSON.stringify(last.payload, null, 2)}</pre>
      </div>
    );
  }

  if (last.kind === "DCAPI_RESULT") {
    return <div className="empty-state">Credential returned; opening response.</div>;
  }

  const payload = asRecord(last.payload);
  const deviceResponse = asRecord(payload?.deviceResponse);
  const doc = asRecord(readPath(deviceResponse, ["documents", 0]));
  const elements = readPath<unknown[]>(doc, ["elements"]) ?? [];
  const element =
    elements.map(asRecord).find((e) => e?.elementIdentifier === SMART_RESPONSE_ELEMENT_ID) ??
    asRecord(elements[0]);
  const smart = asRecord(element?.smartHealthCheckinResponse);
  const smartValue = smart?.valid === true ? asRecord(smart.value) : undefined;
  const artifacts = Array.isArray(smartValue?.artifacts) ? smartValue.artifacts : [];
  const requestStatus = Array.isArray(smartValue?.requestStatus) ? smartValue.requestStatus : [];
  const fulfilledItems = responseFulfillmentsFromSmartValue(smartValue);
  const digestMatches = readPath<boolean>(element, ["valueDigest", "matches"]);
  const docType = readPath<string>(doc, ["docType"]);
  const status = readPath<number>(deviceResponse, ["status"]);
  const cipherText = readPath<string>(payload, ["dcapiResponse", "cipherText", "base64url"]);

  return (
    <div className="result">
      <div className="summary">
        <span className="status-pill status-pill--done">HPKE opened</span>
        <span className={digestMatches ? "status-pill status-pill--done" : "status-pill"}>
          digest {digestMatches ? "matched" : "unchecked"}
        </span>
        {docType ? <code>{docType}</code> : null}
        {typeof status === "number" ? <span className="muted">status {status}</span> : null}
      </div>

      {smartValue ? (
        <>
          <div className="metric-row">
            <div>
              <span className="metric">{artifacts.length}</span>
              <span className="muted"> artifacts</span>
            </div>
            <div>
              <span className="metric">{requestStatus.length}</span>
              <span className="muted"> item statuses</span>
            </div>
            {cipherText ? (
              <div className="truncate">
                <span className="muted">cipherText </span>
                <code>{cipherText}</code>
              </div>
            ) : null}
          </div>

          {artifacts.length > 0 ? (
            <div className="received-credentials">
              <div className="tool-subheading">Received credentials</div>
              <div className="credentials-grid">
                {artifacts.map((artifact, i) => {
                  const a = asRecord(artifact);
                  const id = String(a?.id ?? `artifact-${i + 1}`);
                  return (
                    <ResourceCard
                      key={`${id}-${i}`}
                      credentialId={id}
                      resource={a?.value ?? a?.data ?? artifact}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="response-columns">
            <div>
              <div className="tool-subheading">Item status</div>
              {requestStatus.length > 0 ? (
                <div className="answers">
                  {requestStatus.map((entry, i) => {
                    const status = asRecord(entry);
                    const itemId = String(status?.item ?? `item-${i + 1}`);
                    const artifactIds = fulfilledItems[itemId] ?? [];
                    return (
                    <div className="answer-row" key={itemId}>
                      <code>{itemId}</code>
                      <span>
                        {String(status?.status ?? "unknown")}
                        {artifactIds.length > 0 ? ` (${artifactIds.join(", ")})` : ""}
                      </span>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="muted">No item status returned.</div>
              )}
            </div>

            <div>
              <div className="tool-subheading">Artifacts</div>
              {artifacts.length > 0 ? (
                <div className="artifacts">
                  {artifacts.map((artifact, i) => {
                    const a = asRecord(artifact);
                    return (
                      <details key={`${String(a?.id ?? i)}-${i}`}>
                        <summary>
                          <code>{String(a?.id ?? `artifact-${i + 1}`)}</code>
                          <span>{String(a?.mediaType ?? "unknown")}</span>
                        </summary>
                        <pre className="json result__pre">
                          {JSON.stringify(a?.value ?? a?.data ?? artifact, null, 2)}
                        </pre>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <div className="muted">No artifacts shared.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <pre className="json result__pre">{JSON.stringify(deviceResponse, null, 2)}</pre>
      )}
    </div>
  );
}

function useDebugEvents(): DebugEvent[] {
  const [events, setEvents] = useState<DebugEvent[]>(() => [...getRing()]);
  useEffect(() => {
    return subscribe(() => {
      setEvents([...getRing()]);
    });
  }, []);
  return events;
}

function latestEvent(events: DebugEvent[], ...kinds: string[]): DebugEvent | undefined {
  return [...events].reverse().find((event) => kinds.includes(event.kind));
}

function parseRequest(text: string): SmartCheckinRequest | undefined {
  try {
    const parsed = JSON.parse(text);
    const validated = validateSmartCheckinRequest(parsed);
    return validated.ok ? validated.value : undefined;
  } catch {
    return undefined;
  }
}

function responseAnswers(event: DebugEvent | undefined): Record<string, string[]> | undefined {
  const elements = readPath<unknown[]>(event?.payload, ["deviceResponse", "documents", 0, "elements"]) ?? [];
  const element =
    elements.map(asRecord).find((e) => e?.elementIdentifier === SMART_RESPONSE_ELEMENT_ID) ??
    asRecord(elements[0]);
  const smartValue = asRecord(readPath(element, ["smartHealthCheckinResponse", "value"]));
  const out = responseFulfillmentsFromSmartValue(smartValue);
  return Object.keys(out).length > 0 ? out : undefined;
}

function responseFulfillmentsFromSmartValue(smartValue: Record<string, unknown> | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const artifacts = Array.isArray(smartValue?.artifacts) ? smartValue.artifacts : [];
  for (let i = 0; i < artifacts.length; i++) {
    const artifact = asRecord(artifacts[i]);
    const artifactId = String(artifact?.id ?? `artifact-${i + 1}`);
    const fulfills = Array.isArray(artifact?.fulfills) ? artifact.fulfills : [];
    for (const itemId of fulfills) {
      if (typeof itemId !== "string" || itemId.length === 0) continue;
      (out[itemId] ??= []).push(artifactId);
    }
  }
  return out;
}

function taskFromItem(item: SmartCheckinRequest["items"][number], answers: Record<string, string[]> | undefined): TaskView {
  const id = item.id;
  const content = asRecord(item.content);
  if (content?.kind === "questionnaire") {
    const questionnaire = questionnaireResource(content.questionnaire);
    return {
      id,
      title: item.title || String(questionnaire?.title ?? "Questionnaire"),
      description:
        item.summary ??
        (typeof questionnaire?.description === "string" ? questionnaire.description : undefined) ??
        questionnaireCanonical(content.questionnaire) ??
        "Form answers requested by the verifier.",
      kind: "Questionnaire",
      done: Boolean(answers?.[id]?.length),
    };
  }
  const profiles = Array.isArray(content?.profiles)
    ? content.profiles.filter((v): v is string => typeof v === "string")
    : [];
  const resourceTypes = Array.isArray(content?.resourceTypes)
    ? content.resourceTypes.filter((v): v is string => typeof v === "string")
    : [];
  const selectorDescription =
    profiles.join(", ") ||
    resourceTypes.join(", ") ||
    (typeof content?.profilesFrom === "string" ? content.profilesFrom : undefined) ||
    "FHIR resources";
  return {
    id,
    title: item.title || profileTitle(profiles, id),
    description: item.summary ?? selectorDescription,
    kind: profiles.length > 0 ? "FHIR profile" : "FHIR resources",
    done: Boolean(answers?.[id]?.length),
  };
}

function questionnaireResource(value: unknown): Record<string, unknown> | undefined {
  const obj = asRecord(value);
  if (obj?.resourceType === "Questionnaire") return obj;
  return asRecord(obj?.resource);
}

function questionnaireCanonical(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  const obj = asRecord(value);
  return typeof obj?.canonical === "string" ? obj.canonical : undefined;
}

function profileTitle(profiles: string[], id: string): string {
  const joined = profiles.join(" ");
  if (joined.includes("C4DIC-Coverage")) return "Insurance information";
  if (joined.includes("us-core-patient")) return "Patient demographics";
  if (joined.includes("Bundle-uv-ips")) return "Clinical history";
  if (id === "ips") return "Clinical history";
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

function readPath<T = unknown>(root: unknown, path: ReadonlyArray<string | number>): T | undefined {
  let cur = root;
  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[part];
    } else {
      const obj = asRecord(cur);
      if (!obj || !(part in obj)) return undefined;
      cur = obj[part];
    }
  }
  return cur as T | undefined;
}
