export type FhirCanonical = string;
export type FhirVersion = string;
export type FhirResourceType = string;
export type SmartHealthCheckinAcceptedMediaType =
  | "application/smart-health-card"
  | "application/fhir+json"
  | (string & {});

export type FhirProfileCollectionRef = FhirCanonical;

export type SmartCheckinContentSelector =
  | {
      kind: "fhir.resources";
      profiles?: ReadonlyArray<FhirCanonical>;
      profilesFrom?: ReadonlyArray<FhirProfileCollectionRef>;
      resourceTypes?: ReadonlyArray<FhirResourceType>;
    }
  | {
      kind: "questionnaire";
      questionnaire:
        | FhirCanonical
        | unknown
        | {
            canonical?: FhirCanonical;
            resource?: unknown;
          };
    };

export type SmartCheckinRequestItem = {
  id: string;
  title: string;
  summary?: string;
  required?: boolean;
  content: SmartCheckinContentSelector;
  accept: ReadonlyArray<SmartHealthCheckinAcceptedMediaType>;
};

export type SmartCheckinRequest = {
  type: "smart-health-checkin-request";
  version: "1";
  id: string;
  purpose?: string;
  fhirVersions?: ReadonlyArray<FhirVersion>;
  items: ReadonlyArray<SmartCheckinRequestItem>;
};

export type SmartCheckinItemStatus = {
  item: string;
  status: "fulfilled" | "partial" | "unavailable" | "declined" | "unsupported" | "error";
  message?: string;
};

export type SmartArtifactBase = {
  id: string;
  mediaType: string;
  fulfills: ReadonlyArray<string>;
};

export type SmartArtifact =
  | (SmartArtifactBase & {
      mediaType: "application/smart-health-card";
      value: { verifiableCredential: ReadonlyArray<string> };
    })
  | (SmartArtifactBase & {
      mediaType: "application/fhir+json";
      fhirVersion: FhirVersion;
      value: unknown;
    })
  | (SmartArtifactBase & {
      value?: unknown;
      url?: string;
      data?: string;
      filename?: string;
      fhirVersion?: FhirVersion;
    });

export type SmartCheckinResponse = {
  type: "smart-health-checkin-response";
  version: "1";
  requestId: string;
  artifacts: ReadonlyArray<SmartArtifact>;
  requestStatus: ReadonlyArray<SmartCheckinItemStatus>;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateSmartCheckinRequest(v: unknown): ValidationResult<SmartCheckinRequest> {
  if (!isRecord(v)) {
    return { ok: false, error: "request must be an object" };
  }
  const obj = v;
  if (obj.type !== "smart-health-checkin-request") {
    return { ok: false, error: 'type must be "smart-health-checkin-request"' };
  }
  if (obj.version !== "1") return { ok: false, error: 'version must be "1"' };
  if (!nonEmptyString(obj.id)) return { ok: false, error: "id missing or not a string" };
  if (obj.purpose !== undefined && typeof obj.purpose !== "string") {
    return { ok: false, error: "purpose must be a string" };
  }
  if (obj.fhirVersions !== undefined && !stringArray(obj.fhirVersions)) {
    return { ok: false, error: "fhirVersions must be an array of strings" };
  }
  if (!Array.isArray(obj.items)) return { ok: false, error: "items must be an array" };
  const ids = new Set<string>();
  for (let i = 0; i < obj.items.length; i++) {
    const item = obj.items[i];
    if (!isRecord(item)) {
      return { ok: false, error: `items[${i}] is not an object` };
    }
    if (!nonEmptyString(item.id)) {
      return { ok: false, error: `items[${i}].id missing or not a string` };
    }
    if (ids.has(item.id)) return { ok: false, error: `items[${i}].id is duplicated` };
    ids.add(item.id);
    if (!nonEmptyString(item.title)) {
      return { ok: false, error: `items[${i}].title missing or not a string` };
    }
    if (item.summary !== undefined && typeof item.summary !== "string") {
      return { ok: false, error: `items[${i}].summary must be a string` };
    }
    if (item.required !== undefined && typeof item.required !== "boolean") {
      return { ok: false, error: `items[${i}].required must be a boolean` };
    }
    if (!stringArray(item.accept) || item.accept.length === 0) {
      return { ok: false, error: `items[${i}].accept must be a non-empty string array` };
    }
    const content = item.content;
    if (!isRecord(content)) {
      return { ok: false, error: `items[${i}].content must be an object` };
    }
    const contentError = validateContentSelector(content, `items[${i}].content`);
    if (contentError) return { ok: false, error: contentError };
  }
  return { ok: true, value: obj as unknown as SmartCheckinRequest };
}

function validateContentSelector(content: Record<string, unknown>, path: string): string | undefined {
  if (content.kind === "fhir.resources") {
    if (content.profiles !== undefined && !stringArray(content.profiles)) {
      return `${path}.profiles must be an array of strings`;
    }
    if (content.resourceTypes !== undefined && !stringArray(content.resourceTypes)) {
      return `${path}.resourceTypes must be an array of strings`;
    }
    if (content.profilesFrom !== undefined && !validProfilesFrom(content.profilesFrom)) {
      return `${path}.profilesFrom must be a non-empty array of canonical URLs`;
    }
    return undefined;
  }
  if (content.kind === "questionnaire") {
    const questionnaire = content.questionnaire;
    if (typeof questionnaire === "string") {
      return questionnaire.length > 0 ? undefined : `${path}.questionnaire must not be blank`;
    }
    if (!isRecord(questionnaire)) return `${path}.questionnaire must be a canonical string or object`;
    if (questionnaire.resourceType === "Questionnaire") return undefined;
    if (questionnaire.canonical === undefined && questionnaire.resource === undefined) {
      return `${path}.questionnaire object must include canonical or resource`;
    }
    if (questionnaire.canonical !== undefined && !nonEmptyString(questionnaire.canonical)) {
      return `${path}.questionnaire.canonical must be a string`;
    }
    if (questionnaire.resource !== undefined && !isRecord(questionnaire.resource)) {
      return `${path}.questionnaire.resource must be an object`;
    }
    return undefined;
  }
  return `${path}.kind must be fhir.resources or questionnaire`;
}

function validProfilesFrom(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string" && isCanonicalUrl(v));
}

export function validateSmartCheckinResponse(v: unknown): ValidationResult<SmartCheckinResponse> {
  if (!isRecord(v)) {
    return { ok: false, error: "response must be an object" };
  }
  const obj = v;
  if (obj.type !== "smart-health-checkin-response") {
    return { ok: false, error: 'type must be "smart-health-checkin-response"' };
  }
  if (obj.version !== "1") return { ok: false, error: 'version must be "1"' };
  if (!nonEmptyString(obj.requestId)) return { ok: false, error: "requestId missing or not a string" };
  if (!Array.isArray(obj.artifacts)) return { ok: false, error: "artifacts must be an array" };
  if (!Array.isArray(obj.requestStatus)) {
    return { ok: false, error: "requestStatus must be an array" };
  }
  const artifactIds = new Set<string>();
  for (let i = 0; i < obj.artifacts.length; i++) {
    const artifact = obj.artifacts[i];
    if (!isRecord(artifact)) {
      return { ok: false, error: `artifacts[${i}] is not an object` };
    }
    if (!nonEmptyString(artifact.id)) {
      return { ok: false, error: `artifacts[${i}].id missing or not a string` };
    }
    if (artifactIds.has(artifact.id)) {
      return { ok: false, error: `artifacts[${i}].id is duplicated` };
    }
    artifactIds.add(artifact.id);
    if (!nonEmptyString(artifact.mediaType)) {
      return { ok: false, error: `artifacts[${i}].mediaType missing or not a string` };
    }
    if (!stringArray(artifact.fulfills) || artifact.fulfills.length === 0) {
      return { ok: false, error: `artifacts[${i}].fulfills must be a non-empty array of strings` };
    }
    const artifactError = validateArtifact(artifact, `artifacts[${i}]`);
    if (artifactError) return { ok: false, error: artifactError };
  }
  const seenStatus = new Set<string>();
  for (let i = 0; i < obj.requestStatus.length; i++) {
    const status = obj.requestStatus[i];
    if (!isRecord(status)) return { ok: false, error: `requestStatus[${i}] is not an object` };
    if (!nonEmptyString(status.item)) {
      return { ok: false, error: `requestStatus[${i}].item missing or not a string` };
    }
    if (seenStatus.has(status.item)) {
      return { ok: false, error: `requestStatus[${i}].item is duplicated` };
    }
    seenStatus.add(status.item);
    if (!["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"].includes(String(status.status))) {
      return { ok: false, error: `requestStatus[${i}].status invalid` };
    }
    if (status.message !== undefined && typeof status.message !== "string") {
      return { ok: false, error: `requestStatus[${i}].message must be a string` };
    }
  }
  return { ok: true, value: obj as unknown as SmartCheckinResponse };
}

function validateArtifact(artifact: Record<string, unknown>, path: string): string | undefined {
  if (artifact.mediaType === "application/smart-health-card") {
    if (artifact.fhirVersion !== undefined) {
      return `${path}.fhirVersion must not be present for application/smart-health-card`;
    }
    const value = artifact.value;
    if (!isRecord(value) || !stringArray(value.verifiableCredential) || value.verifiableCredential.length === 0) {
      return `${path}.value.verifiableCredential must be a non-empty string array`;
    }
    return undefined;
  }
  if (artifact.mediaType === "application/fhir+json") {
    if (!nonEmptyString(artifact.fhirVersion)) return `${path}.fhirVersion missing or not a string`;
    if (!("value" in artifact)) return `${path}.value missing`;
    return undefined;
  }
  if (!("value" in artifact) && !("url" in artifact) && !("data" in artifact)) {
    return `${path} must include value, url, or data`;
  }
  return undefined;
}

export function validateResponseAgainstRequest(
  request: unknown,
  response: unknown,
): ValidationResult<SmartCheckinResponse> {
  const requestValidation = validateSmartCheckinRequest(request);
  if (!requestValidation.ok) return { ok: false, error: `request invalid: ${requestValidation.error}` };
  const responseValidation = validateSmartCheckinResponse(response);
  if (!responseValidation.ok) return responseValidation;

  const req = requestValidation.value;
  const resp = responseValidation.value;
  if (resp.requestId !== req.id) {
    return { ok: false, error: `requestId must match request id ${req.id}` };
  }

  const itemsById = new Map(req.items.map((item) => [item.id, item]));
  const allowedFhirVersions = req.fhirVersions;
  for (let i = 0; i < resp.artifacts.length; i++) {
    const artifact = resp.artifacts[i]!;
    for (const itemId of artifact.fulfills) {
      const item = itemsById.get(itemId);
      if (!item) {
        return { ok: false, error: `artifacts[${i}].fulfills references unknown item ${itemId}` };
      }
      if (!item.accept.includes(artifact.mediaType)) {
        return {
          ok: false,
          error: `artifacts[${i}].mediaType "${artifact.mediaType}" is not accepted by item ${itemId} (accept: ${JSON.stringify(item.accept)})`,
        };
      }
    }
    if (allowedFhirVersions !== undefined && allowedFhirVersions.length > 0) {
      const declared = (artifact as { fhirVersion?: unknown }).fhirVersion;
      if (typeof declared === "string" && !allowedFhirVersions.includes(declared)) {
        return {
          ok: false,
          error: `artifacts[${i}].fhirVersion "${declared}" is not in request.fhirVersions ${JSON.stringify(allowedFhirVersions)}`,
        };
      }
    }
  }

  const statusItems = new Set(resp.requestStatus.map((status) => status.item));
  for (let i = 0; i < resp.requestStatus.length; i++) {
    const itemId = resp.requestStatus[i]!.item;
    if (!itemsById.has(itemId)) {
      return { ok: false, error: `requestStatus[${i}].item references unknown item ${itemId}` };
    }
  }
  for (const itemId of itemsById.keys()) {
    if (!statusItems.has(itemId)) {
      return { ok: false, error: `requestStatus missing item ${itemId}` };
    }
  }

  return responseValidation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCanonicalUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}
