// Wallet app entry. Listens for credential request options from the verifier,
// renders an Approve/Decline screen, and posts back a real, verifier-openable
// mdoc response built from local holder records.

import {
  base64UrlDecodeBytes,
  base64UrlDecodeUtf8,
  CborTag,
  cborDecode,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  resolveSmartRequestJsonFromMdocCarriers,
  type SmartRequestCarrierResolution,
  SMART_REQUEST_INFO_KEY,
  SMART_RESPONSE_ELEMENT_ID,
} from "../protocol/index.ts";
import {
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
  buildWebWalletDcapiResponse,
  type WebWalletDeviceKey,
  type WebWalletIssuerKey,
} from "../sdk-web-wallet/index.ts";
import type { SmartCheckinRequest } from "../sdk/core.ts";
import {
  buildSmartResponseFromSelections,
  bundledDemoRecords,
  clearImportedRecords,
  loadImportedRecords,
  parseHealthSkillzFile,
  resolveImportedItems,
  resourceTypeLabel,
  saveImportedRecords,
  summarizeImportedRecords,
  type ImportedHealthRecords,
  type ImportedHealthRecordsSummary,
  type RequestItemResolution,
  type WalletCandidate,
} from "./imported-records.ts";
import {
  answerOptionKey,
  answerOptionLabel,
  answerOptions,
  integerBounds,
  isQuestionnaireItemEnabled,
  questionnaireAnswerKey,
  questionnaireFromRequestItem,
  questionnaireItems,
  questionnaireReferenceForRequestItem,
  questionnaireValuesFromAnswers,
  seedQuestionnaireAnswersForItems,
  type QuestionnaireAnswerScalar,
  type QuestionnaireAnswerValue,
} from "./questionnaire.ts";

type WalletState =
  | { phase: "waiting" }
  | {
      phase: "review";
      verifierOrigin: string;
      requestId: string;
      smartRequest: SmartCheckinRequest;
      docType: string;
      requestedElement: string;
      requestCarrier: SmartRequestCarrierResolution;
      readerAuth: ReaderAuthDebug;
      recordsSource: "imported" | "bundled-demo";
      recordsSummary: ImportedHealthRecordsSummary;
      resolutions: RequestItemResolution[];
      selectedItems: Record<string, boolean>;
      selectedCandidates: Record<string, Set<string>>;
      questionnaireAnswers: Record<string, QuestionnaireAnswerValue>;
      requestPayload: {
        deviceRequest: string;
        encryptionInfo: string;
        requestId?: string;
        responseMessageType: WebWalletResponseMessageType;
      };
      verifierWindow: WindowProxy;
    }
  | { phase: "sending" }
  | {
      phase: "done";
      outcome: "approved" | "declined" | "error";
      message?: string;
    };

type ReaderAuthDebug = {
  present: boolean;
  structure: "absent" | "detached-cose-sign1" | "unexpected";
};

type ImportState =
  | { phase: "loading" }
  | { phase: "idle" }
  | { phase: "importing" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

const root = document.getElementById("wallet-root");
if (!root) throw new Error("wallet app missing #wallet-root");

const opener = window.opener as WindowProxy | null;
// The non-sensitive ready message is deliberately not scoped to a verifier
// origin: no request session exists yet. Once the verifier posts a request, the
// browser-stamped MessageEvent.origin becomes the verifier identity for that
// session and is used for UI display, response targetOrigin, and transcript
// binding.
const readyTargetOrigin = "*";
const LEGACY_WEB_WALLET_READY_MESSAGE_TYPE = "smart-checkin/web-wallet/ready" as const;
const LEGACY_WEB_WALLET_REQUEST_MESSAGE_TYPE = "smart-checkin/web-wallet/request" as const;
const LEGACY_WEB_WALLET_RESPONSE_MESSAGE_TYPE = "smart-checkin/web-wallet/response" as const;
type WebWalletResponseMessageType =
  | typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE
  | typeof LEGACY_WEB_WALLET_RESPONSE_MESSAGE_TYPE;
const bundledRecords = bundledDemoRecords();
let importedRecords: ImportedHealthRecords | undefined;
let importState: ImportState = { phase: "loading" };
let state: WalletState = { phase: "waiting" };
const recordsLoadPromise = loadImportedRecords()
  .then((records) => {
    importedRecords = records;
    importState = { phase: "idle" };
  })
  .catch((err) => {
    importState = {
      phase: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  })
  .finally(() => render());

function render(): void {
  if (!root) return;
  root.innerHTML = "";
  const el = document.createElement("main");

  if (state.phase === "waiting") {
    el.className = opener ? "center-panel" : "wallet-shell";
    el.innerHTML = opener ? renderWaiting() : renderHome();
  } else if (state.phase === "review") {
    el.className = "wallet-shell";
    el.innerHTML = renderReview(state);
  } else if (state.phase === "sending") {
    el.className = "center-panel";
    el.innerHTML = `
      <div class="status-dot" style="background: var(--blue-soft);"><span class="brand-mark">SH</span></div>
      <h1>Sharing…</h1>
      <p class="muted">Building, signing, and encrypting the selected health data.</p>
    `;
  } else if (state.phase === "done") {
    el.className = "center-panel";
    if (state.outcome === "approved") {
      el.innerHTML = `
        <div class="status-dot" style="background: var(--success-soft);"><span style="color: var(--success); font-weight: 900;">✓</span></div>
        <h1>Submission complete</h1>
        <p class="muted">Your selected sample health data was encrypted and shared with the verifier.</p>
      `;
    } else if (state.outcome === "declined") {
      el.innerHTML = `
        <div class="status-dot" style="background: var(--amber-soft);"><span style="color: var(--amber); font-weight: 900;">–</span></div>
        <h1>Declined</h1>
        <p class="muted">No data shared. You can close this tab.</p>
      `;
    } else {
      el.innerHTML = `
        <div class="status-dot" style="background: var(--error-soft);"><span style="color: var(--error); font-weight: 900;">!</span></div>
        <h1>Could not complete request</h1>
        <pre class="error">${escape(state.message ?? "unknown error")}</pre>
      `;
    }
  }

  root.appendChild(el);
  wireHomeEvents();
  if (state.phase === "review") {
    const captured = state;
    const approve = document.getElementById("approve");
    const decline = document.getElementById("decline");
    approve?.addEventListener("click", () => void onApprove(captured));
    decline?.addEventListener("click", () => onDecline(captured));
    wireSelectionEvents(captured);
  }
}

function renderHome(): string {
  const active = activeRecords();
  const importedSummary = importedRecords ? summarizeImportedRecords(importedRecords) : undefined;
  const activeSummary = summarizeImportedRecords(active.records);
  const importMessage = importState.phase === "loading"
    ? `<p class="muted small">Loading local wallet records…</p>`
    : importState.phase === "importing"
      ? `<p class="muted small">Importing Health Skillz export…</p>`
      : importState.phase === "success"
        ? `<p class="small" style="color: var(--success);">${escape(importState.message)}</p>`
        : importState.phase === "error"
          ? `<p class="small" style="color: var(--error);">Import failed: ${escape(importState.message)}</p>`
          : "";
  return `
    ${brandHeader("SMART Health Check-in Wallet", "Web clone of the Android sample holder app")}

    <section class="panel">
      <h2>Wallet status</h2>
      <p class="muted">Ready for SMART Health Check-in requests over the web-wallet tab/window transport.</p>
    </section>

    <section class="panel">
      <h2>Imported records</h2>
      ${importedSummary ? `
        <p>Active for wallet responses: <strong>${importedSummary.providerCount}</strong> provider${importedSummary.providerCount === 1 ? "" : "s"} · <strong>${importedSummary.totalResources}</strong> FHIR resources</p>
        <p class="muted">${escape(importedSummary.patientSummary)}</p>
        <p class="muted small">${escape(importedSummary.resourceSummary)}</p>
      ` : `
        <p class="muted">No imported records. Check-in responses will use bundled demo data.</p>
      `}
      ${importMessage}
      <input id="record-file" type="file" accept=".zip,.json,application/zip,application/json" hidden />
      <button id="import-records" class="primary" type="button">${importedSummary ? "Replace imported records" : "Load Health Skillz export"}</button>
      ${importedSummary ? `<button id="clear-records" class="secondary" type="button">Use bundled demo data</button>` : ""}
    </section>

    ${renderRecordsBrowser(active.records, activeSummary, active.source)}

    <section class="panel">
      <h2>Bundled demo data</h2>
      <p class="muted">Used when no Health Skillz export is imported.</p>
      <p class="muted small">Patient, Coverage, AllergyIntolerance, MedicationStatement, Condition, and a collection Bundle.</p>
    </section>
  `;
}

function renderWaiting(): string {
  const active = activeRecords();
  const summary = summarizeImportedRecords(active.records);
  return `
    ${brandMarkHtml()}
    <h1>Open from a check-in request</h1>
    <p class="muted">This wallet tab was opened by the verifier and is waiting for the SMART Health Check-in request.</p>
    <p class="muted small">Active data source: ${escape(active.source === "imported" ? "imported Health Skillz records" : "bundled demo data")} · ${escape(summary.resourceSummary)}</p>
  `;
}

function renderReview(review: Extract<WalletState, { phase: "review" }>): string {
  const sourceLabel = review.recordsSource === "imported" ? "Imported Health Skillz records" : "Bundled demo data";
  const purpose = review.smartRequest.purpose
    ? `<p>${escape(review.smartRequest.purpose)}</p>`
    : "";
  return `
    <section class="panel">
      <div class="brand-row">
        ${brandMarkHtml()}
        <div>
          <div class="section-title">Sample Health Web Demo</div>
          <div class="brand-subtitle">Web clone of the native Android sample holder app</div>
        </div>
      </div>
      <div class="header-copy">
        <h1>Share sample health information</h1>
        <p>${escape(readerAuthMessage(review.readerAuth))}</p>
        ${purpose}
      </div>
      <div class="verifier-strip">
        <div class="label">Verifier</div>
        <div class="verifier-origin">${escape(review.verifierOrigin)}</div>
      </div>
      <div class="carrier-strip">
        <div class="label">SMART request JSON</div>
        <div class="carrier-grid">
          <div><span class="carrier-key">requestInfo</span> ${review.requestCarrier.requestInfoPresent ? "present" : "absent"}</div>
          <div><span class="carrier-key">claim</span> ${escape(claimPresenceLabel(review.requestCarrier))}</div>
          ${review.requestCarrier.requestInfoPresent && review.requestCarrier.companionPresent
            ? `<div><span class="carrier-key">agreement</span> ${escape(carrierJsonMatchLabel(review.requestCarrier))}</div>`
            : ""}
        </div>
      </div>
    </section>

    <section class="request-intro">
      <h2>Choose what to share</h2>
      <p class="muted">Each request item is matched against ${escape(sourceLabel)}. Turn off any item or record you do not want to share.</p>
    </section>

    ${review.smartRequest.items.map((item) => renderRequestCard(review, item.id)).join("")}

    <details class="technical">
      <summary>Technical details</summary>
      <div class="technical-grid">
        <div class="muted small">docType <code>${escape(review.docType)}</code></div>
        <div class="muted small">element <code>${escape(review.requestedElement)}</code></div>
        <div class="muted small">requestId <code>${escape(review.requestId)}</code></div>
        <div class="muted small">readerAuth <code>${escape(readerAuthLabel(review.readerAuth))}</code></div>
        <div class="muted small">request JSON <code>${escape(requestCarrierLabel(review.requestCarrier))}</code></div>
        ${review.requestCarrier.companionElementIdentifier ? `<div class="muted small">claim <code>${escape(claimElementLabel(review.requestCarrier.companionElementIdentifier))}</code></div>` : ""}
        <div class="muted small">data source <code>${escape(sourceLabel)}</code></div>
      </div>
    </details>

    <div class="actions">
      <button id="approve" class="primary" type="button">Share selected data</button>
      <button id="decline" class="secondary" type="button">Decline</button>
    </div>
  `;
}

function requestCarrierLabel(carrier: SmartRequestCarrierResolution): string {
  const found = [
    carrier.requestInfoPresent ? "requestInfo" : undefined,
    carrier.companionPresent ? "claim" : undefined,
  ].filter(Boolean);
  const foundLabel = found.length ? found.join(" + ") : "none";
  const matchLabel = carrier.requestInfoPresent && carrier.companionPresent
    ? ` · agreement ${carrierJsonMatchLabel(carrier)}`
    : "";
  return `${foundLabel}${matchLabel}; using ${carrierSourceLabel(carrier)}`;
}

function carrierJsonMatchLabel(carrier: SmartRequestCarrierResolution): string {
  if (carrier.requestInfoPresent && carrier.companionPresent) {
    return "same JSON";
  }
  return "n/a";
}

function carrierSourceLabel(carrier: SmartRequestCarrierResolution): string {
  if (carrier.source === "companion") return "claim";
  return carrier.source;
}

function claimPresenceLabel(carrier: SmartRequestCarrierResolution): string {
  if (!carrier.companionPresent) return "absent";
  return `present (${claimElementLabel(carrier.companionElementIdentifier ?? "")})`;
}

function claimElementLabel(elementIdentifier: string): string {
  return elementIdentifier ? `${elementIdentifier.length.toLocaleString()} chars` : "0 chars";
}

function readerAuthMessage(readerAuth: ReaderAuthDebug): string {
  if (!readerAuth.present) {
    return "This request did not include readerAuth; the browser-provided origin is shown below. Review what this wallet found before sharing.";
  }
  if (readerAuth.structure === "detached-cose-sign1") {
    return "This request includes readerAuth. This web wallet shows that it is present, but does not verify the readerAuth signature.";
  }
  return "This request includes readerAuth, but it does not look like the expected detached COSE_Sign1 shape. Review carefully before sharing.";
}

function readerAuthLabel(readerAuth: ReaderAuthDebug): string {
  if (!readerAuth.present) return "absent";
  if (readerAuth.structure === "detached-cose-sign1") return "present (detached COSE_Sign1)";
  return "present (unexpected shape)";
}

function renderRequestCard(
  review: Extract<WalletState, { phase: "review" }>,
  itemId: string,
): string {
  const item = review.smartRequest.items.find((x) => x.id === itemId);
  if (!item) return "";
  const resolution = review.resolutions.find((r) => r.itemId === item.id);
  const selected = review.selectedItems[item.id] !== false;
  const accept = item.accept.join(", ");
  const candidates = resolution?.candidates ?? [];
  const selectedIds = review.selectedCandidates[item.id] ?? new Set<string>();
  const formCard = selected && item.content.kind === "form.fhir"
    ? renderQuestionnaireCard(review, item.id)
    : "";
  const recordCards = selected && item.content.kind !== "form.fhir" && candidates.length > 0
    ? `<div class="records">${candidates.map((candidate) => renderCandidate(item.id, candidate, selectedIds.has(candidate.id))).join("")}</div>`
    : "";
  return `
    <section class="request-card">
      <div class="request-card__top">
        <div class="glyph ${glyphClass(item.title, item.content.kind)}">${escape(glyphLabel(item.title, item.content.kind))}</div>
        <div class="request-card__body">
          <div class="request-card__title">${escape(item.title)}</div>
          <div class="request-card__subtitle">${escape(item.summary ?? `${item.content.kind} · accepts ${accept}`)}</div>
        </div>
        <label class="label">
          <input data-item-toggle="${escapeAttr(item.id)}" type="checkbox" ${selected ? "checked" : ""} />
          Share
        </label>
      </div>
      <div class="match-row">
        <span class="chip ${availabilityClass(resolution?.availability)}">${escape(resolution?.matchSummary ?? "No resolution")}</span>
        ${candidates.length > 1 ? `<span class="chip chip--neutral">${selectedIds.size} selected</span>` : ""}
      </div>
      ${resolution?.detail ? `<p class="muted small">${escape(resolution.detail)}</p>` : ""}
      ${formCard}
      ${recordCards}
    </section>
  `;
}

function renderQuestionnaireCard(
  review: Extract<WalletState, { phase: "review" }>,
  itemId: string,
): string {
  const item = review.smartRequest.items.find((x) => x.id === itemId);
  if (!item) return "";
  const questionnaire = questionnaireFromRequestItem(item);
  const reference = questionnaireReferenceForRequestItem(item);
  if (!questionnaire) {
    return `
      <div class="questionnaire-card">
        <h3>Form answers</h3>
        <p class="muted">This form was referenced by URL${reference ? ` (${escape(reference)})` : ""}. Inline rendering requires the verifier to include the Questionnaire resource.</p>
      </div>
    `;
  }
  const description = typeof questionnaire.description === "string" && questionnaire.description
    ? `<p class="muted">${escape(questionnaire.description)}</p>`
    : "";
  return `
    <div class="questionnaire-card">
      <h3>${escape(questionnaire.title ?? "Form answers")}</h3>
      ${description}
      <div class="questionnaire-items">
        ${renderQuestionnaireItems(item.id, questionnaireItems(questionnaire), review.questionnaireAnswers, 0)}
      </div>
    </div>
  `;
}

function renderQuestionnaireItems(
  requestItemId: string,
  items: ReadonlyArray<Record<string, unknown>>,
  answers: Readonly<Record<string, QuestionnaireAnswerValue>>,
  depth: number,
): string {
  const values = questionnaireValuesFromAnswers(requestItemId, answers);
  return items
    .filter((item) => isQuestionnaireItemEnabled(item, values))
    .map((item) => {
      const type = typeof item.type === "string" ? item.type : "";
      if (type === "display") return renderQuestionnaireDisplay(item, depth);
      if (type === "group") return renderQuestionnaireGroup(requestItemId, item, answers, depth);
      return renderQuestionnaireField(requestItemId, item, answers, depth);
    })
    .join("");
}

function renderQuestionnaireGroup(
  requestItemId: string,
  item: Record<string, unknown>,
  answers: Readonly<Record<string, QuestionnaireAnswerValue>>,
  depth: number,
): string {
  const text = typeof item.text === "string" ? item.text : typeof item.linkId === "string" ? item.linkId : "Group";
  return `
    <div class="questionnaire-group" style="--depth: ${depth}">
      <h4>${escape(text)}</h4>
      ${renderQuestionnaireItems(requestItemId, Array.isArray(item.item) ? item.item.filter(isRecord) : [], answers, depth + 1)}
    </div>
  `;
}

function renderQuestionnaireDisplay(item: Record<string, unknown>, depth: number): string {
  const text = typeof item.text === "string" ? item.text : typeof item.linkId === "string" ? item.linkId : "";
  return `<div class="questionnaire-display" style="--depth: ${depth}">${escape(text)}</div>`;
}

function renderQuestionnaireField(
  requestItemId: string,
  item: Record<string, unknown>,
  answers: Readonly<Record<string, QuestionnaireAnswerValue>>,
  depth: number,
): string {
  const linkId = typeof item.linkId === "string" ? item.linkId : "";
  if (!linkId) return "";
  const key = questionnaireAnswerKey(requestItemId, linkId);
  const type = typeof item.type === "string" ? item.type : "string";
  const value = answers[key];
  const label = `${typeof item.text === "string" && item.text ? item.text : linkId}${item.required === true ? " *" : ""}`;
  const readOnly = item.readOnly === true;
  return `
    <div class="questionnaire-field" style="--depth: ${depth}">
      <div class="questionnaire-label">${escape(label)}</div>
      ${renderQuestionnaireInput(key, item, type, value, readOnly)}
    </div>
  `;
}

function renderQuestionnaireInput(
  key: string,
  item: Record<string, unknown>,
  type: string,
  value: QuestionnaireAnswerValue | undefined,
  readOnly: boolean,
): string {
  const disabled = readOnly ? "disabled" : "";
  const options = answerOptions(item);
  if (type === "boolean") {
    return `
      <div class="segmented" role="group">
        ${renderRadioOption(key, "boolean", "true", "Yes", value === true, disabled)}
        ${renderRadioOption(key, "boolean", "false", "No", value === false, disabled)}
      </div>
    `;
  }
  if (type === "choice" || type === "open-choice") {
    if (options.length > 0 && item.repeats === true) {
      const selected = new Set(Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",").map((v) => v.trim()).filter(Boolean) : []);
      const optionKeys = new Set(options.map(answerOptionKey));
      const customValues = Array.from(selected).filter((v) => !optionKeys.has(v)).join(", ");
      return `
        <div class="choice-list">
          ${options.map((option) => {
            const optionKey = answerOptionKey(option);
            return `
              <label class="choice-option">
                <input data-question-option="${escapeAttr(key)}" data-option-key="${escapeAttr(optionKey)}" data-repeats="true" type="checkbox" ${selected.has(optionKey) ? "checked" : ""} ${disabled} />
                <span>${escape(answerOptionLabel(option))}</span>
              </label>
            `;
          }).join("")}
          ${type === "open-choice" ? renderOpenChoiceInput(key, customValues, "Other response", disabled) : ""}
        </div>
      `;
    }
    if (options.length > 0) {
      return `
        <div class="choice-list">
          ${options.map((option) => {
            const optionKey = answerOptionKey(option);
            return renderRadioOption(key, "choice", optionKey, answerOptionLabel(option), String(value ?? "") === optionKey, disabled);
          }).join("")}
          ${type === "open-choice" ? renderTextInput(key, "string", typeof value === "string" && !options.some((option) => answerOptionKey(option) === value) ? value : "", "Other response", disabled) : ""}
        </div>
      `;
    }
  }
  if (type === "integer") {
    const bounds = integerBounds(item);
    if (bounds) {
      const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? bounds.min), 10);
      const current = Number.isFinite(numeric) ? Math.min(bounds.max, Math.max(bounds.min, numeric)) : bounds.min;
      return `
        <div class="range-answer">
          <div><span>${bounds.min}</span><strong>${current}</strong><span>${bounds.max}</span></div>
          <input data-question-answer="${escapeAttr(key)}" data-answer-kind="integer" type="range" min="${bounds.min}" max="${bounds.max}" step="1" value="${current}" ${disabled} />
        </div>
      `;
    }
    return renderTextInput(key, "integer", answerValueAsString(value), "", disabled, "number", "1");
  }
  if (type === "decimal") return renderTextInput(key, "decimal", answerValueAsString(value), "", disabled, "number", "any");
  if (type === "date") return renderDateInput(key, answerValueAsString(value), disabled);
  if (type === "dateTime") return renderTextInput(key, "string", answerValueAsString(value), "", disabled, "datetime-local");
  if (type === "time") return renderTextInput(key, "string", answerValueAsString(value), "", disabled, "time");
  return renderTextInput(key, "string", answerValueAsString(value), "", disabled, type === "text" ? "textarea" : "text");
}

function renderDateInput(key: string, value: string, disabled: string): string {
  const parts = parseDateParts(value);
  const precision = parts.day ? "day" : parts.month ? "month" : parts.year ? "year" : "day";
  return `
    <div class="date-picker" data-question-date="${escapeAttr(key)}">
      <label class="date-picker__precision">
        <span>Date detail</span>
        <select data-question-date-precision="${escapeAttr(key)}" ${disabled}>
          <option value="year" ${precision === "year" ? "selected" : ""}>Year only</option>
          <option value="month" ${precision === "month" ? "selected" : ""}>Year + month</option>
          <option value="day" ${precision === "day" ? "selected" : ""}>Full date</option>
        </select>
      </label>
      <div class="date-answer date-answer--${precision}">
        ${renderDateYearInput(key, parts.year, disabled)}
        ${precision !== "year" ? renderDateMonthSelect(key, parts.month, disabled) : ""}
        ${precision === "day" ? renderDateDaySelect(key, parts, disabled) : ""}
      </div>
    </div>
    <div class="questionnaire-hint">Choose the precision you know; the shared FHIR date keeps that granularity.</div>
  `;
}

function renderDateYearInput(
  key: string,
  value: string,
  disabled: string,
): string {
  return `
    <label>
      <span>Year</span>
      <input data-question-date-part="year" data-question-date-key="${escapeAttr(key)}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${escapeAttr(value)}" placeholder="e.g. 2026" ${disabled} />
    </label>
  `;
}

function renderDateMonthSelect(key: string, value: string, disabled: string): string {
  const months = [
    ["01", "Jan"],
    ["02", "Feb"],
    ["03", "Mar"],
    ["04", "Apr"],
    ["05", "May"],
    ["06", "Jun"],
    ["07", "Jul"],
    ["08", "Aug"],
    ["09", "Sep"],
    ["10", "Oct"],
    ["11", "Nov"],
    ["12", "Dec"],
  ];
  return `
    <label>
      <span>Month</span>
      <select data-question-date-part="month" data-question-date-key="${escapeAttr(key)}" ${disabled}>
        <option value="">Month</option>
        ${months.map(([month, label]) => `<option value="${month}" ${value === month ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderDateDaySelect(
  key: string,
  parts: { year: string; month: string; day: string },
  disabled: string,
): string {
  const count = daysInMonth(parts.year, parts.month);
  const days = Array.from({ length: count }, (_, index) => String(index + 1).padStart(2, "0"));
  return `
    <label>
      <span>Day</span>
      <select data-question-date-part="day" data-question-date-key="${escapeAttr(key)}" ${disabled}>
        <option value="">Day</option>
        ${days.map((day) => `<option value="${day}" ${parts.day === day ? "selected" : ""}>${Number(day)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderCandidate(itemId: string, candidate: WalletCandidate, selected: boolean): string {
  const types = candidate.resourceType ? resourceTypeLabel(candidate.resourceType) : "FHIR resource";
  return `
    <label class="record-card">
      <div class="request-card__top">
        <input data-candidate-toggle="${escapeAttr(candidate.id)}" data-item-id="${escapeAttr(itemId)}" type="checkbox" ${selected ? "checked" : ""} />
        <div class="request-card__body">
          <div class="record-card__title">${escape(candidate.label)}</div>
          <div class="record-card__subtitle">${escape(candidate.subtitle)} · ${escape(candidate.sourceName)}</div>
          <div class="record-card__types">${escape(types)}</div>
        </div>
      </div>
    </label>
  `;
}

function renderRadioOption(
  key: string,
  kind: "boolean" | "choice",
  optionValue: string,
  label: string,
  selected: boolean,
  disabled: string,
): string {
  return `
    <label class="choice-option">
      <input data-question-answer="${escapeAttr(key)}" data-answer-kind="${kind}" type="radio" name="${escapeAttr(key)}" value="${escapeAttr(optionValue)}" ${selected ? "checked" : ""} ${disabled} />
      <span>${escape(label)}</span>
    </label>
  `;
}

function renderTextInput(
  key: string,
  kind: "string" | "integer" | "decimal",
  value: string,
  placeholder: string,
  disabled: string,
  inputType = "text",
  step?: string,
): string {
  if (inputType === "textarea") {
    return `<textarea data-question-answer="${escapeAttr(key)}" data-answer-kind="${kind}" rows="3" ${disabled}>${escape(value)}</textarea>`;
  }
  return `<input data-question-answer="${escapeAttr(key)}" data-answer-kind="${kind}" type="${escapeAttr(inputType)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" ${step ? `step="${escapeAttr(step)}"` : ""} ${disabled} />`;
}

function renderOpenChoiceInput(
  key: string,
  value: string,
  placeholder: string,
  disabled: string,
): string {
  return `<input data-question-open-choice="${escapeAttr(key)}" type="text" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" ${disabled} />`;
}

function answerValueAsString(value: QuestionnaireAnswerValue | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function renderRecordsBrowser(
  records: ImportedHealthRecords,
  summary: ImportedHealthRecordsSummary,
  source: "imported" | "bundled-demo",
): string {
  const providerCards = records.providers.map((provider, providerIndex) => {
    const total = Object.values(provider.fhir).reduce((sum, resources) => sum + resources.length, 0);
    const groups = Object.entries(provider.fhir)
      .filter(([, resources]) => resources.length > 0)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([resourceType, resources]) => `
        <div class="record-card">
          <div class="record-card__title">${escape(resourceTypeLabel(resourceType))}</div>
          <div class="record-card__subtitle">${resources.length} ${resources.length === 1 ? "record" : "records"}</div>
          <div class="record-card__types">${escape(resourcePreview(resources))}</div>
        </div>
      `)
      .join("");
    return `
      <section class="panel">
        <h2>${escape(provider.provider)}</h2>
        <p class="muted">${escape([provider.patientDisplayName, provider.patientBirthDate ? `DOB ${provider.patientBirthDate}` : undefined, provider.fetchedAt ? `Fetched ${provider.fetchedAt}` : undefined].filter(Boolean).join(" · ") || "Imported patient records")}</p>
        <p class="muted small">${total} ${total === 1 ? "resource" : "resources"}</p>
        <div class="records">${groups}</div>
      </section>
    `;
  }).join("");
  return `
    <section class="request-intro">
      <h2>Browse wallet data</h2>
      <p class="muted">${source === "imported" ? "Imported records currently used to match check-in requests." : "Bundled records currently used to match check-in requests."}</p>
      <p class="muted small">${escape(summary.patientSummary)} · ${escape(summary.resourceSummary)}</p>
    </section>
    ${providerCards}
  `;
}

function brandHeader(title: string, subtitle: string): string {
  return `
    <section>
      <div class="brand-row">
        ${brandMarkHtml()}
        <div>
          <h1>${escape(title)}</h1>
          <div class="brand-subtitle">${escape(subtitle)}</div>
        </div>
      </div>
    </section>
  `;
}

function brandMarkHtml(): string {
  return `<div class="brand-mark">SH</div>`;
}

function wireHomeEvents(): void {
  const importButton = document.getElementById("import-records") as HTMLButtonElement | null;
  const fileInput = document.getElementById("record-file") as HTMLInputElement | null;
  const clearButton = document.getElementById("clear-records") as HTMLButtonElement | null;
  importButton?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) void importRecordsFile(file);
  });
  clearButton?.addEventListener("click", () => void clearImportedData());
}

function wireSelectionEvents(review: Extract<WalletState, { phase: "review" }>): void {
  for (const input of document.querySelectorAll<HTMLInputElement>("[data-item-toggle]")) {
    input.addEventListener("change", () => {
      const itemId = input.dataset.itemToggle;
      if (!itemId) return;
      review.selectedItems[itemId] = input.checked;
      render();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement>("[data-candidate-toggle]")) {
    input.addEventListener("change", () => {
      const itemId = input.dataset.itemId;
      const candidateId = input.dataset.candidateToggle;
      if (!itemId || !candidateId) return;
      const selected = review.selectedCandidates[itemId] ?? new Set<string>();
      if (input.checked) {
        selected.add(candidateId);
      } else {
        selected.delete(candidateId);
      }
      review.selectedCandidates[itemId] = selected;
      render();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-question-answer]")) {
    input.addEventListener("change", () => {
      const key = input.dataset.questionAnswer;
      if (!key) return;
      if (input instanceof HTMLInputElement && input.type === "radio" && !input.checked) return;
      setQuestionnaireAnswer(review, key, coerceQuestionnaireInput(input.dataset.answerKind, input.value));
      render();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement>("[data-question-option]")) {
    input.addEventListener("change", () => {
      const key = input.dataset.questionOption;
      const optionKey = input.dataset.optionKey;
      if (!key || !optionKey) return;
      setQuestionnaireAnswer(review, key, selectedOpenChoiceValues(key));
      render();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement>("[data-question-open-choice]")) {
    input.addEventListener("change", () => {
      const key = input.dataset.questionOpenChoice;
      if (!key) return;
      setQuestionnaireAnswer(review, key, selectedOpenChoiceValues(key));
      render();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-question-date-part]")) {
    input.addEventListener("change", () => {
      const key = input.dataset.questionDateKey;
      if (!key) return;
      setQuestionnaireAnswer(review, key, selectedDateValue(key));
      render();
    });
  }
  for (const select of document.querySelectorAll<HTMLSelectElement>("[data-question-date-precision]")) {
    select.addEventListener("change", () => {
      const key = select.dataset.questionDatePrecision;
      if (!key) return;
      setQuestionnaireAnswer(review, key, selectedDateValue(key));
      render();
    });
  }
}

function selectedOpenChoiceValues(key: string): string[] {
  const selected: string[] = [];
  for (const option of document.querySelectorAll<HTMLInputElement>("[data-question-option]")) {
    if (option.dataset.questionOption === key && option.checked && option.dataset.optionKey) {
      selected.push(option.dataset.optionKey);
    }
  }
  const custom = Array.from(document.querySelectorAll<HTMLInputElement>("[data-question-open-choice]"))
    .filter((input) => input.dataset.questionOpenChoice === key)
    .flatMap((input) => input.value.split(",").map((value) => value.trim()).filter(Boolean));
  return [...selected, ...custom];
}

function coerceQuestionnaireInput(
  kind: string | undefined,
  value: string,
): QuestionnaireAnswerScalar | undefined {
  if (kind === "integer") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (kind === "decimal") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (kind === "boolean") return value === "true";
  return value;
}

function selectedDateValue(key: string): string | undefined {
  const parts = { year: "", month: "", day: "" };
  let precision = "day";
  for (const select of document.querySelectorAll<HTMLSelectElement>("[data-question-date-precision]")) {
    if (select.dataset.questionDatePrecision === key) precision = select.value;
  }
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-question-date-part]")) {
    if (input.dataset.questionDateKey !== key) continue;
    const part = input.dataset.questionDatePart;
    const sanitized = input.value.replace(/\D/g, "");
    if (part === "year") parts.year = sanitized.slice(0, 4);
    if (part === "month") parts.month = sanitized.slice(0, 2);
    if (part === "day") parts.day = sanitized.slice(0, 2);
  }
  return formatDateParts(
    parts.year,
    precision === "year" ? "" : parts.month,
    precision === "day" ? parts.day : "",
  ) || undefined;
}

function parseDateParts(raw: string): { year: string; month: string; day: string } {
  const [year = "", month = "", day = ""] = raw.split("-");
  return {
    year: year.replace(/\D/g, "").slice(0, 4),
    month: month.replace(/\D/g, "").slice(0, 2),
    day: day.replace(/\D/g, "").slice(0, 2),
  };
}

function formatDateParts(year: string, month: string, day: string): string {
  if (year.length !== 4) return "";
  const mm = month.trim() ? month.padStart(2, "0") : "";
  if (!mm) return year;
  const dd = day.trim() ? day.padStart(2, "0") : "";
  return dd ? `${year}-${mm}-${dd}` : `${year}-${mm}`;
}

function daysInMonth(year: string, month: string): number {
  const y = Number.parseInt(year, 10);
  const m = Number.parseInt(month, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 31;
  return new Date(y, m, 0).getDate();
}

function setQuestionnaireAnswer(
  review: Extract<WalletState, { phase: "review" }>,
  key: string,
  value: QuestionnaireAnswerValue | undefined,
): void {
  if (
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  ) {
    delete review.questionnaireAnswers[key];
  } else {
    review.questionnaireAnswers[key] = value;
  }
}

async function importRecordsFile(file: File): Promise<void> {
  importState = { phase: "importing" };
  render();
  try {
    const records = await parseHealthSkillzFile(file);
    await saveImportedRecords(records);
    importedRecords = records;
    const summary = summarizeImportedRecords(records);
    importState = {
      phase: "success",
      message: `Imported ${summary.totalResources} FHIR ${summary.totalResources === 1 ? "resource" : "resources"}.`,
    };
  } catch (err) {
    importState = {
      phase: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
  render();
}

async function clearImportedData(): Promise<void> {
  await clearImportedRecords();
  importedRecords = undefined;
  importState = { phase: "idle" };
  render();
}

function activeRecords(): {
  source: "imported" | "bundled-demo";
  records: ImportedHealthRecords;
} {
  return importedRecords
    ? { source: "imported", records: importedRecords }
    : { source: "bundled-demo", records: bundledRecords };
}

function initialSelection(
  resolutions: ReadonlyArray<RequestItemResolution>,
): {
  selectedItems: Record<string, boolean>;
  selectedCandidates: Record<string, Set<string>>;
} {
  const selectedItems: Record<string, boolean> = {};
  const selectedCandidates: Record<string, Set<string>> = {};
  for (const resolution of resolutions) {
    selectedItems[resolution.itemId] = resolution.availability === "available";
    selectedCandidates[resolution.itemId] = new Set(
      resolution.candidates
        .filter((candidate) => candidate.selectedByDefault)
        .map((candidate) => candidate.id),
    );
  }
  return { selectedItems, selectedCandidates };
}

function availabilityClass(availability: string | undefined): string {
  if (availability === "available") return "chip--success";
  if (availability === "partially-available") return "chip--warning";
  if (availability === "unavailable" || availability === "unsupported") return "chip--neutral";
  return "chip--warning";
}

function glyphLabel(title: string, kind: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("coverage") || lower.includes("insurance")) return "ID";
  if (lower.includes("plan")) return "PL";
  if (kind === "form.fhir") return "QA";
  if (lower.includes("clinical") || lower.includes("history")) return "CL";
  return "DT";
}

function glyphClass(title: string, kind: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("coverage") || lower.includes("insurance")) return "glyph--coverage";
  if (lower.includes("plan")) return "glyph--plan";
  if (kind === "form.fhir") return "glyph--questionnaire";
  if (lower.includes("clinical") || lower.includes("history")) return "glyph--clinical";
  return "glyph--default";
}

function resourcePreview(resources: ReadonlyArray<{ resourceType?: string; id?: string }>): string {
  const values = resources
    .slice(0, 3)
    .map((resource, index) => resource.id || resource.resourceType || `resource ${index + 1}`);
  return values.length > 0 ? `Examples: ${values.join(", ")}` : "No preview";
}

function escapeAttr(s: string): string {
  return escape(s);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function generateP256(): Promise<{ keyPair: CryptoKeyPair; publicJwk: JsonWebKey }> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { keyPair, publicJwk };
}

async function onApprove(reviewing: Extract<WalletState, { phase: "review" }>): Promise<void> {
  const { verifierWindow, requestPayload, verifierOrigin } = reviewing;
  state = { phase: "sending" };
  render();
  try {
    const issuer = await generateP256();
    const device = await generateP256();
    const issuerKey: WebWalletIssuerKey = {
      privateKey: issuer.keyPair.privateKey,
      publicJwk: issuer.publicJwk,
    };
    const deviceKey: WebWalletDeviceKey = {
      privateKey: device.keyPair.privateKey,
      publicJwk: device.publicJwk,
    };
    const response = buildSmartResponseFromSelections({
      request: reviewing.smartRequest,
      resolutions: reviewing.resolutions,
      selectedItems: reviewing.selectedItems,
      selectedCandidates: reviewing.selectedCandidates,
      questionnaireAnswers: reviewing.questionnaireAnswers,
    });

    const built = await buildWebWalletDcapiResponse({
      deviceRequestBase64Url: requestPayload.deviceRequest,
      encryptionInfoBase64Url: requestPayload.encryptionInfo,
      origin: verifierOrigin,
      smartResponse: response,
      issuerKey,
      deviceKey,
    });

    verifierWindow.postMessage(
      {
        type: requestPayload.responseMessageType,
        requestId: requestPayload.requestId,
        outcome: "approved",
        credential: built.response,
      },
      verifierOrigin,
    );
    state = { phase: "done", outcome: "approved" };
    render();
    setTimeout(() => {
      window.close();
    }, 600);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    verifierWindow.postMessage(
      {
        type: requestPayload.responseMessageType,
        requestId: requestPayload.requestId,
        outcome: "error",
        message,
      },
      verifierOrigin,
    );
    state = { phase: "done", outcome: "error", message };
    render();
  }
}

function onDecline(reviewing: Extract<WalletState, { phase: "review" }>): void {
  reviewing.verifierWindow.postMessage(
    {
      type: reviewing.requestPayload.responseMessageType,
      requestId: reviewing.requestPayload.requestId,
      outcome: "declined",
    },
    reviewing.verifierOrigin,
  );
  state = { phase: "done", outcome: "declined" };
  render();
  setTimeout(() => window.close(), 400);
}

async function onMessage(ev: MessageEvent): Promise<void> {
  if (!opener) return;
  if (ev.source !== opener) return;
  const verifierOrigin = ev.origin;
  // Accept requests from any bindable opener origin. The origin is shown to the
  // user in the consent UI, and all replies plus the mdoc transcript bind to
  // this exact browser-stamped value. Opaque "null" origins cannot be safely
  // exact-targeted with postMessage, so they are not accepted.
  if (!isBindableOrigin(verifierOrigin)) return;
  const data = ev.data as { type?: unknown };
  if (!data || typeof data !== "object") return;
  const responseMessageType = mapRequestTypeToResponseType(data.type);
  if (!responseMessageType) return;
  const payload = data as {
    credentialRequestOptions?: unknown;
    deviceRequest?: unknown;
    encryptionInfo?: unknown;
    requestId?: unknown;
  };
  const requestId =
    typeof payload.requestId === "string" ? payload.requestId : undefined;
  // Busy-safe: only accept a new request when we're idle. Concurrent requests
  // would clobber an in-progress approval.
  if (state.phase !== "waiting") {
    opener.postMessage(
      {
        type: responseMessageType,
        requestId,
        outcome: "error",
        message: "wallet is busy with another request",
      },
      verifierOrigin,
    );
    return;
  }
  try {
    await recordsLoadPromise;
    const mdocRequest = extractOrgIsoMdocRequest(payload);
    const decoded = decodeRequest(mdocRequest);
    const smartRequest = decoded.smartRequest ?? {
      type: "smart-health-checkin-request",
      version: "1",
      id: "request",
      items: [],
    } satisfies SmartCheckinRequest;
    const records = activeRecords();
    const resolutions = resolveImportedItems(records.records, smartRequest.items);
    const selection = initialSelection(resolutions);
    const questionnaireAnswers = seedQuestionnaireAnswersForItems(smartRequest.items);
    state = {
      phase: "review",
      verifierOrigin,
      requestId: decoded.smartRequest?.id ?? "(no id)",
      smartRequest,
      docType: decoded.docType,
      requestedElement: decoded.requestedElement,
      requestCarrier: decoded.requestCarrier,
      readerAuth: decoded.readerAuth,
      recordsSource: records.source,
      recordsSummary: summarizeImportedRecords(records.records),
      resolutions,
      selectedItems: selection.selectedItems,
      selectedCandidates: selection.selectedCandidates,
      questionnaireAnswers,
      requestPayload: {
        deviceRequest: mdocRequest.deviceRequest,
        encryptionInfo: mdocRequest.encryptionInfo,
        requestId,
        responseMessageType,
      },
      verifierWindow: opener,
    };
    render();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    opener.postMessage(
      {
        type: responseMessageType,
        requestId,
        outcome: "error",
        message,
      },
      verifierOrigin,
    );
    state = { phase: "done", outcome: "error", message };
    render();
  }
}

function mapRequestTypeToResponseType(type: unknown): WebWalletResponseMessageType | undefined {
  if (type === WEB_WALLET_REQUEST_MESSAGE_TYPE) return WEB_WALLET_RESPONSE_MESSAGE_TYPE;
  if (type === LEGACY_WEB_WALLET_REQUEST_MESSAGE_TYPE) {
    return LEGACY_WEB_WALLET_RESPONSE_MESSAGE_TYPE;
  }
  return undefined;
}

function extractOrgIsoMdocRequest(payload: {
  credentialRequestOptions?: unknown;
  deviceRequest?: unknown;
  encryptionInfo?: unknown;
}): {
  deviceRequest: string;
  encryptionInfo: string;
} {
  const credentialRequestOptions = payload.credentialRequestOptions as
    | {
        digital?: {
          requests?: ReadonlyArray<{
            protocol?: unknown;
            data?: {
              deviceRequest?: unknown;
              encryptionInfo?: unknown;
            };
          }>;
        };
      }
    | undefined;
  const requests = credentialRequestOptions?.digital?.requests;
  if (Array.isArray(requests)) {
    const orgIsoMdoc = requests.find((request) => request?.protocol === "org-iso-mdoc");
    if (!orgIsoMdoc) {
      const requestedProtocols = requests
        .map((request) => request?.protocol)
        .filter((protocol): protocol is string => typeof protocol === "string" && protocol.length > 0);
      throw new Error(
        `wallet does not support any requested credential protocol: ${requestedProtocols.join(", ") || "(none)"}`,
      );
    }
    if (
      typeof orgIsoMdoc.data?.deviceRequest !== "string" ||
      typeof orgIsoMdoc.data?.encryptionInfo !== "string"
    ) {
      throw new Error("org-iso-mdoc request is missing deviceRequest or encryptionInfo");
    }
    return {
      deviceRequest: orgIsoMdoc.data.deviceRequest,
      encryptionInfo: orgIsoMdoc.data.encryptionInfo,
    };
  }

  if (
    typeof payload.deviceRequest === "string" &&
    typeof payload.encryptionInfo === "string"
  ) {
    return {
      deviceRequest: payload.deviceRequest,
      encryptionInfo: payload.encryptionInfo,
    };
  }

  throw new Error("web wallet request missing credentialRequestOptions.digital.requests");
}

function decodeRequest(input: {
  deviceRequest: string;
  encryptionInfo: string;
}): {
  docType: string;
  requestedElement: string;
  requestCarrier: SmartRequestCarrierResolution;
  readerAuth: ReaderAuthDebug;
  smartRequest: SmartCheckinRequest | undefined;
} {
  // Light validation of encryptionInfo up front so a malformed request fails
  // before the user is asked to consent.
  let encryptionInfoBytes: Uint8Array;
  try {
    encryptionInfoBytes = base64UrlDecodeBytes(input.encryptionInfo);
  } catch (err) {
    throw new Error(`encryptionInfo is not valid base64url: ${err instanceof Error ? err.message : String(err)}`);
  }
  try {
    cborDecode(encryptionInfoBytes);
  } catch (err) {
    throw new Error(`encryptionInfo is not valid CBOR: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bytes = base64UrlDecodeBytes(input.deviceRequest);
  const decoded = cborDecode(bytes);
  const docRequests = mapGet(decoded, "docRequests");
  if (!Array.isArray(docRequests) || docRequests.length === 0) {
    throw new Error("DeviceRequest has no docRequests");
  }
  const itemsRequestTag = mapGet(docRequests[0], "itemsRequest");
  if (
    !(itemsRequestTag instanceof CborTag) ||
    itemsRequestTag.tag !== 24 ||
    !(itemsRequestTag.value instanceof Uint8Array)
  ) {
    throw new Error("itemsRequest is not a tag-24 byte string");
  }
  const itemsRequest = cborDecode(itemsRequestTag.value);
  const readerAuth = decodeReaderAuth(mapGet(docRequests[0], "readerAuth"));
  const docType = mapGet(itemsRequest, "docType");
  const nameSpaces = mapGet(itemsRequest, "nameSpaces");
  let requestedElement: string | undefined;
  const elementIdentifiers: string[] = [];
  if (nameSpaces instanceof Map) {
    const elements = nameSpaces.get(MDOC_NAMESPACE);
    if (elements instanceof Map) {
      for (const k of elements.keys()) {
        if (typeof k === "string") {
          elementIdentifiers.push(k);
          if (k === SMART_RESPONSE_ELEMENT_ID) {
            requestedElement = k;
          } else {
            requestedElement ??= k;
          }
        }
      }
    }
  }
  const requestInfo = mapGet(itemsRequest, "requestInfo");
  const requestCarrier = resolveSmartRequestJsonFromMdocCarriers({
    requestInfoValue: mapGet(requestInfo, SMART_REQUEST_INFO_KEY),
    elementIdentifiers,
  });
  const smartRequestJson = requestCarrier.json;
  let smartRequest: SmartCheckinRequest | undefined;
  if (typeof smartRequestJson === "string") {
    try {
      smartRequest = JSON.parse(smartRequestJson) as SmartCheckinRequest;
    } catch {
      smartRequest = undefined;
    }
  }
  return {
    docType: typeof docType === "string" ? docType : "(unknown)",
    requestedElement: requestedElement ?? SMART_RESPONSE_ELEMENT_ID,
    requestCarrier,
    readerAuth,
    smartRequest,
  };
}

function decodeReaderAuth(readerAuth: unknown): ReaderAuthDebug {
  if (readerAuth === undefined) return { present: false, structure: "absent" };
  if (
    Array.isArray(readerAuth) &&
    readerAuth.length === 4 &&
    readerAuth[0] instanceof Uint8Array &&
    readerAuth[2] === null &&
    readerAuth[3] instanceof Uint8Array
  ) {
    return { present: true, structure: "detached-cose-sign1" };
  }
  return { present: true, structure: "unexpected" };
}

function mapGet(value: unknown, key: string): unknown {
  if (!(value instanceof Map)) return undefined;
  return value.get(key);
}

function isBindableOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.origin === origin;
  } catch {
    return false;
  }
}

window.addEventListener("message", onMessage);
window.addEventListener("beforeunload", () => {
  if (state.phase === "review" && opener) {
    try {
      opener.postMessage(
        {
          type: state.requestPayload.responseMessageType,
          requestId: state.requestPayload.requestId,
          outcome: "closed",
        },
        state.verifierOrigin,
      );
    } catch {
      // ignore
    }
  }
});

if (opener) {
  try {
    opener.postMessage(
      { type: WEB_WALLET_READY_MESSAGE_TYPE },
      readyTargetOrigin,
    );
    opener.postMessage(
      { type: LEGACY_WEB_WALLET_READY_MESSAGE_TYPE },
      readyTargetOrigin,
    );
  } catch {
    // ignore — verifier will time out
  }
}

render();

// Re-export to keep optional debugging hooks tree-shake-stable.
export { base64UrlDecodeUtf8, MDOC_DOC_TYPE };
