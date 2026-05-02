import { SMART_RESPONSE_ELEMENT_ID } from "../protocol/index.ts";
import { ResourceCard } from "./ResourceCards.tsx";

export type SmartResponseReviewProps = {
  openedResponse: unknown;
  technicalDetails?: Record<string, unknown>;
  emptyMessage?: string;
};

export function SmartResponseReview({
  openedResponse,
  technicalDetails,
  emptyMessage = "No wallet response yet.",
}: SmartResponseReviewProps) {
  const payload = asRecord(openedResponse);
  if (!payload) return <div className="empty-state">{emptyMessage}</div>;

  const deviceResponse = asRecord(payload.deviceResponse);
  const doc = asRecord(readPath(deviceResponse, ["documents", 0]));
  const elements = readPath<unknown[]>(doc, ["elements"]) ?? [];
  const element =
    elements.map(asRecord).find((e) => e?.elementIdentifier === SMART_RESPONSE_ELEMENT_ID) ??
    asRecord(elements[0]);
  const smartValue = smartValueFromOpenedResponse(payload);
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
        {digestMatches !== undefined ? (
          <span className={digestMatches ? "status-pill status-pill--done" : "status-pill"}>
            digest {digestMatches ? "matched" : "unchecked"}
          </span>
        ) : null}
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
                    const statusEntry = asRecord(entry);
                    const itemId = String(statusEntry?.item ?? `item-${i + 1}`);
                    const artifactIds = fulfilledItems[itemId] ?? [];
                    return (
                      <div className="answer-row" key={itemId}>
                        <code>{itemId}</code>
                        <span>
                          {String(statusEntry?.status ?? "unknown")}
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
        <pre className="json result__pre">{JSON.stringify(deviceResponse ?? payload, null, 2)}</pre>
      )}

      <details className="technical-details">
        <summary>Technical details</summary>
        <div className="technical-details__grid">
          <details>
            <summary>Opened DC API response</summary>
            <pre className="json result__pre">{JSON.stringify(payload, null, 2)}</pre>
          </details>
          {technicalDetails ? (
            <details>
              <summary>Transport and verifier details</summary>
              <pre className="json result__pre">{JSON.stringify(technicalDetails, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function smartValueFromOpenedResponse(openedResponse: unknown): Record<string, unknown> | undefined {
  const payload = asRecord(openedResponse);
  const validatedSmart = asRecord(readPath(payload, ["smartResponseValidation"]));
  if (validatedSmart?.ok === true) return asRecord(validatedSmart.value);

  const deviceResponse = asRecord(payload?.deviceResponse);
  const doc = asRecord(readPath(deviceResponse, ["documents", 0]));
  const elements = readPath<unknown[]>(doc, ["elements"]) ?? [];
  const element =
    elements.map(asRecord).find((e) => e?.elementIdentifier === SMART_RESPONSE_ELEMENT_ID) ??
    asRecord(elements[0]);
  const smart = asRecord(element?.smartHealthCheckinResponse);
  return smart?.valid === true ? asRecord(smart.value) : undefined;
}

export function responseFulfillmentsFromSmartValue(
  smartValue: Record<string, unknown> | undefined,
): Record<string, string[]> {
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

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function readPath<T = unknown>(root: unknown, path: ReadonlyArray<string | number>): T | undefined {
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
