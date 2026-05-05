import { useEffect, useMemo, useState } from "react";
import { PRESETS, useStore } from "./store.ts";
import { emit, getRing, subscribe, type DebugEvent } from "./debug/events.ts";
import {
  SmartResponseReview,
  asRecord,
  readPath,
  responseFulfillmentsFromSmartValue,
  smartValueFromOpenedResponse,
} from "./app/SmartResponseReview.tsx";
import {
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  PROTOCOL_ID,
  SMART_RESPONSE_ELEMENT_ID,
  SMART_REQUEST_INFO_KEY,
} from "./protocol/index.ts";
import {
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
} from "./sdk/core.ts";
import {
  createDcapiVerifier,
  credentialToDebugJson,
} from "./sdk/dcapi-verifier.ts";
import {
  createCredentialSources,
  type CredentialSource,
} from "./app/credential-sources.ts";
import type { WebWalletHandle } from "./sdk-web-wallet/index.ts";

type TaskView = {
  id: string;
  title: string;
  description: string;
  kind: string;
  done: boolean;
};

const SMART_LOGO_URL = "https://smarthealthit.org/wp-content/themes/SMART/images/logo.svg";

export type AppProps = {
  webWallets?: ReadonlyArray<WebWalletHandle>;
  platformWallet?: boolean;
};

export function App(props: AppProps = {}) {
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
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);

  const request = useMemo(() => parseRequest(requestText), [requestText]);
  const credentialSources = useMemo(
    () =>
      createCredentialSources({
        platformWallet: props.platformWallet,
        platformAvailable: dcApi.state === "supported",
        platformUnavailableReason:
          dcApi.state === "unsupported" ? dcApi.reason : undefined,
        webWallets: props.webWallets,
      }),
    [dcApi, props.platformWallet, props.webWallets],
  );
  const availableCredentialSources = credentialSources.filter((s) => s.available);
  const primaryCredentialSource = availableCredentialSources[0];
  const opened = latestEvent(events, "DCAPI_RESPONSE_OPENED");
  const openError = latestEvent(events, "RESPONSE_OPEN_ERROR");
  const answers = responseAnswers(opened);
  const tasks = request ? request.items.map((item) => taskFromItem(item, answers)) : [];
  const complete = tasks.length > 0 && tasks.every((task) => task.done);

  const startCheckin = async (source: CredentialSource) => {
    if (!request || !validation.ok || loading || !source.available) return;
    setLoading(true);
    setSourceMenuOpen(false);
    let cleanup: (() => void) | undefined;
    try {
      const validated = validateSmartCheckinRequest(request);
      if (!validated.ok) {
        emit("ERROR", { where: "validate", error: validated.error });
        return;
      }
      const activation = source.activate();
      cleanup = activation.cleanup;
      emit("CREDENTIAL_SOURCE", {
        id: source.id,
        label: source.label,
        kind: source.kind,
        origin: source.origin,
      });
      const verifier = createDcapiVerifier({
        origin: location.origin,
        getCredential: activation.getCredential,
      });
      const context = await verifier.prepareCredentialRequest(validated.value);
      const arg = context.navigatorArgument;
      emit("SMART_REQUEST_INFO", {
        key: SMART_REQUEST_INFO_KEY,
        json: context.bundle.smartRequestJson,
        decoded: validated.value,
      });
      emit("DEVICE_REQUEST", {
        deviceRequest: arg.digital.requests[0].data.deviceRequest,
        requestedElementIdentifier: context.bundle.requestedElementIdentifier,
        requestInfoKey: SMART_REQUEST_INFO_KEY,
      });
      emit("ENCRYPTION_INFO", {
        encryptionInfo: arg.digital.requests[0].data.encryptionInfo,
      });
      emit("REQUEST_ARTIFACTS", context.artifacts);
      emit("DCAPI_ARGUMENT", arg);
      const credential = await context.getCredential();
      const credentialDebugJson = credentialToDebugJson(credential);
      emit("DCAPI_RESULT", credentialDebugJson);
      try {
        const openedResponse = await context.openCredential(credential);
        emit("DCAPI_RESPONSE_OPENED", {
          dcapiResponse: openedResponse.dcapiResponse,
          deviceResponse: openedResponse.deviceResponse,
        });
      } catch (e) {
        emit("RESPONSE_OPEN_ERROR", {
          error: e instanceof Error ? e.message : String(e),
          credential: credentialDebugJson,
          origin: location.origin,
          recipientPublicJwk: context.bundle.verifierPublicJwk,
          recipientPrivateJwk: context.recipientPrivateJwk,
          sessionTranscript: context.artifacts.sessionTranscript,
        });
      }
    } catch (e) {
      emit("ERROR", {
        where: "credential source",
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      cleanup?.();
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

          <CredentialSourceButton
            complete={complete}
            loading={loading}
            disabled={!primaryCredentialSource || !validation.ok || loading}
            sources={credentialSources}
            primarySource={primaryCredentialSource}
            menuOpen={sourceMenuOpen}
            onMenuOpenChange={setSourceMenuOpen}
            onStart={startCheckin}
          />

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

function CredentialSourceButton(props: {
  complete: boolean;
  loading: boolean;
  disabled: boolean;
  sources: ReadonlyArray<CredentialSource>;
  primarySource: CredentialSource | undefined;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onStart: (source: CredentialSource) => void;
}) {
  const {
    complete,
    loading,
    disabled,
    sources,
    primarySource,
    menuOpen,
    onMenuOpenChange,
    onStart,
  } = props;
  const buttonClass = "checkin-button";
  const primaryText = loading
    ? "Opening wallet..."
    : complete
      ? "Check-in information received"
      : "Share check-in information";
  const showChoice = sources.filter((source) => source.available).length > 1;
  const sourceHint =
    !complete && primarySource && (showChoice || primarySource.kind === "web-wallet")
      ? primarySource.label
      : undefined;

  const buttonContent = (
    <>
      <span className="checkin-button__mark">
        <img src={SMART_LOGO_URL} alt="SMART" />
      </span>
      <span className="checkin-button__text">
        <span className="checkin-button__primary">{primaryText}</span>
        {sourceHint ? (
          <span className="checkin-button__secondary">via {sourceHint}</span>
        ) : null}
      </span>
    </>
  );

  if (complete) {
    return (
      <div className="checkin-received-notice" role="status" aria-live="polite">
        {buttonContent}
      </div>
    );
  }

  if (!showChoice) {
    return (
      <button
        className={buttonClass}
        type="button"
        disabled={disabled}
        onClick={() => primarySource && onStart(primarySource)}
      >
        {buttonContent}
      </button>
    );
  }

  return (
    <div className="checkin-source-control">
      <button
        className={`${buttonClass} checkin-button--split-primary`}
        type="button"
        disabled={disabled}
        onClick={() => primarySource && onStart(primarySource)}
      >
        {buttonContent}
      </button>
      <button
        className="checkin-source-toggle"
        type="button"
        disabled={loading}
        aria-label="Choose wallet"
        aria-expanded={menuOpen}
        onClick={() => onMenuOpenChange(!menuOpen)}
      >
        ▾
      </button>
      {menuOpen ? (
        <div className="checkin-source-menu" role="menu">
          {sources.map((source) => (
            <button
              key={source.id}
              className="checkin-source-option"
              type="button"
              role="menuitem"
              disabled={!source.available || loading}
              onClick={() => {
                onMenuOpenChange(false);
                onStart(source);
              }}
            >
              <span className="checkin-source-option__label">
                {source.id === primarySource?.id ? "✓ " : ""}
                {source.label}
              </span>
              <span className="checkin-source-option__description">
                {source.available
                  ? source.description ?? source.origin
                  : source.unavailableReason}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
        <span>Example request</span>
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

  return <SmartResponseReview openedResponse={last.payload} technicalDetails={{ eventKind: last.kind }} />;
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
  const smartValue = smartValueFromOpenedResponse(event?.payload);
  const out = responseFulfillmentsFromSmartValue(smartValue);
  return Object.keys(out).length > 0 ? out : undefined;
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
  const profileFamilies = profileFamilyCanonicals(content?.profilesFrom);
  const resourceTypes = Array.isArray(content?.resourceTypes)
    ? content.resourceTypes.filter((v): v is string => typeof v === "string")
    : [];
  const selectorDescription =
    profiles.join(", ") ||
    resourceTypes.join(", ") ||
    profileFamilies.join(", ") ||
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
  if (id === "clinical-history") return "Clinical resources";
  if (joined.includes("us-core-patient")) return "Patient demographics";
  if (profiles.some((profile) => profile.includes("/StructureDefinition/us-core-"))) return "Clinical history";
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function profileFamilyCanonicals(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  const obj = asRecord(value);
  return typeof obj?.canonical === "string" ? [obj.canonical] : [];
}
