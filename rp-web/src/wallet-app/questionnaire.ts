import type { SmartCheckinRequestItem } from "../sdk/core.ts";
import type { FhirResource } from "./imported-records.ts";

export type QuestionnaireAnswerScalar = string | number | boolean;
export type QuestionnaireAnswerValue =
  | QuestionnaireAnswerScalar
  | QuestionnaireAnswerScalar[];

export type QuestionnaireResource = Record<string, unknown> & {
  resourceType: "Questionnaire";
  id?: string;
  url?: string;
  version?: string;
  title?: string;
  description?: string;
  item?: unknown;
};

type QuestionnaireItem = Record<string, unknown>;

export function questionnaireAnswerKey(itemId: string, linkId: string): string {
  return `${itemId}::${linkId}`;
}

export function questionnaireFromRequestItem(
  requestItem: SmartCheckinRequestItem,
): QuestionnaireResource | undefined {
  if (requestItem.content.kind !== "form.fhir") return undefined;
  const questionnaire = requestItem.content.questionnaire;
  return isRecord(questionnaire) && questionnaire.resourceType === "Questionnaire"
    ? (questionnaire as QuestionnaireResource)
    : undefined;
}

export function questionnaireReferenceForRequestItem(
  requestItem: SmartCheckinRequestItem,
): string | undefined {
  if (requestItem.content.kind !== "form.fhir") return undefined;
  const questionnaire = questionnaireFromRequestItem(requestItem);
  return questionnaire
    ? questionnaireReference(questionnaire)
    : requestItem.content.questionnaireCanonical;
}

export function questionnaireItems(questionnaire: QuestionnaireResource): QuestionnaireItem[] {
  return arrayRecords(questionnaire.item);
}

export function seedQuestionnaireAnswersForItems(
  requestItems: ReadonlyArray<SmartCheckinRequestItem>,
): Record<string, QuestionnaireAnswerValue> {
  const answers: Record<string, QuestionnaireAnswerValue> = {};
  for (const requestItem of requestItems) {
    const questionnaire = questionnaireFromRequestItem(requestItem);
    if (!questionnaire) continue;
    seedQuestionnaireAnswers(requestItem.id, questionnaireItems(questionnaire), answers);
  }
  return answers;
}

export function questionnaireValuesFromAnswers(
  requestItemId: string,
  answers: Readonly<Record<string, QuestionnaireAnswerValue>>,
): Record<string, QuestionnaireAnswerValue> {
  const values: Record<string, QuestionnaireAnswerValue> = {};
  const prefix = `${requestItemId}::`;
  for (const [key, value] of Object.entries(answers)) {
    if (key.startsWith(prefix)) values[key.slice(prefix.length)] = value;
  }
  return values;
}

export function isQuestionnaireItemEnabled(
  item: QuestionnaireItem,
  values: Readonly<Record<string, QuestionnaireAnswerValue>>,
): boolean {
  const conditions = arrayRecords(item.enableWhen);
  if (conditions.length === 0) return true;

  const any = item.enableBehavior === "any";
  let aggregate = !any;
  for (const condition of conditions) {
    const question = stringValue(condition.question);
    const result = question ? compare(values[question], condition) : false;
    aggregate = any ? aggregate || result : aggregate && result;
  }
  return aggregate;
}

export function answerOptionKey(option: QuestionnaireItem): string {
  const coding = recordValue(option.valueCoding);
  if (coding) return stringValue(coding.code) ?? stringValue(coding.display) ?? JSON.stringify(coding);
  if (option.valueString !== undefined) return String(option.valueString);
  if (option.valueInteger !== undefined) return String(option.valueInteger);
  if (option.valueDecimal !== undefined) return String(option.valueDecimal);
  if (option.valueDate !== undefined) return String(option.valueDate);
  if (option.valueDateTime !== undefined) return String(option.valueDateTime);
  if (option.valueTime !== undefined) return String(option.valueTime);
  return JSON.stringify(option);
}

export function answerOptionLabel(option: QuestionnaireItem): string {
  const coding = recordValue(option.valueCoding);
  if (coding) return stringValue(coding.display) ?? stringValue(coding.code) ?? JSON.stringify(coding);
  return answerOptionKey(option);
}

export function answerOptions(item: QuestionnaireItem): QuestionnaireItem[] {
  return arrayRecords(item.answerOption);
}

export function integerBounds(item: QuestionnaireItem): { min: number; max: number } | undefined {
  let min: number | undefined;
  let max: number | undefined;
  for (const extension of arrayRecords(item.extension)) {
    if (extension.url === "http://hl7.org/fhir/StructureDefinition/minValue") {
      min = numberValue(extension.valueInteger);
    } else if (extension.url === "http://hl7.org/fhir/StructureDefinition/maxValue") {
      max = numberValue(extension.valueInteger);
    }
  }
  return min !== undefined && max !== undefined && max > min ? { min, max } : undefined;
}

export function buildQuestionnaireResponse(input: {
  requestItem: SmartCheckinRequestItem;
  answers: Readonly<Record<string, QuestionnaireAnswerValue>>;
  authored?: string;
}): FhirResource {
  const questionnaire = questionnaireFromRequestItem(input.requestItem);
  const values = questionnaireValuesFromAnswers(input.requestItem.id, input.answers);
  const response: FhirResource = {
    resourceType: "QuestionnaireResponse",
    id: `${input.requestItem.id}-response`,
    status: "completed",
    authored: input.authored ?? new Date().toISOString(),
  };

  const reference = questionnaireReferenceForRequestItem(input.requestItem);
  if (reference) response.questionnaire = reference;
  if (questionnaire) {
    response.item = buildQuestionnaireItems(questionnaireItems(questionnaire), values);
  }
  return response;
}

function seedQuestionnaireAnswers(
  requestItemId: string,
  items: ReadonlyArray<QuestionnaireItem>,
  answers: Record<string, QuestionnaireAnswerValue>,
): void {
  for (const item of items) {
    const type = stringValue(item.type);
    if (type === "group") {
      seedQuestionnaireAnswers(requestItemId, arrayRecords(item.item), answers);
      continue;
    }
    if (type === "display") continue;

    const linkId = stringValue(item.linkId);
    if (!linkId) continue;
    const initial = normalizeInitialValue(item, initialValueForItem(item));
    if (initial !== undefined) answers[questionnaireAnswerKey(requestItemId, linkId)] = initial;
  }
}

function initialValueForItem(item: QuestionnaireItem): QuestionnaireAnswerValue | undefined {
  const selected = answerOptions(item)
    .filter((option) => option.initialSelected === true)
    .map(answerOptionKey);
  if (selected.length > 0) {
    return item.repeats === true ? selected : selected[0];
  }

  const initial = Array.isArray(item.initial) ? recordValue(item.initial[0]) : undefined;
  return initial ? questionnaireValueFromObject(initial) : undefined;
}

function normalizeInitialValue(
  item: QuestionnaireItem,
  value: QuestionnaireAnswerValue | undefined,
): QuestionnaireAnswerValue | undefined {
  if (value === undefined) return undefined;
  if (item.repeats !== true) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [value];
}

function questionnaireValueFromObject(value: QuestionnaireItem): QuestionnaireAnswerValue | undefined {
  if (value.valueBoolean !== undefined) return Boolean(value.valueBoolean);
  if (value.valueInteger !== undefined) return Number(value.valueInteger);
  if (value.valueDecimal !== undefined) return Number(value.valueDecimal);
  if (value.valueDate !== undefined) return String(value.valueDate);
  if (value.valueDateTime !== undefined) return String(value.valueDateTime);
  if (value.valueTime !== undefined) return String(value.valueTime);
  if (value.valueString !== undefined) return String(value.valueString);
  const coding = recordValue(value.valueCoding);
  if (coding) return stringValue(coding.code) ?? stringValue(coding.display) ?? JSON.stringify(coding);
  return undefined;
}

function buildQuestionnaireItems(
  sourceItems: ReadonlyArray<QuestionnaireItem>,
  values: Readonly<Record<string, QuestionnaireAnswerValue>>,
): FhirResource[] {
  const out: FhirResource[] = [];
  for (const source of sourceItems) {
    if (!isQuestionnaireItemEnabled(source, values)) continue;

    const type = stringValue(source.type);
    const linkId = stringValue(source.linkId);
    if (!linkId) continue;
    const target: FhirResource = { linkId };
    const text = stringValue(source.text);
    if (text) target.text = text;

    if (type === "group") {
      const children = buildQuestionnaireItems(arrayRecords(source.item), values);
      if (children.length > 0) {
        target.item = children;
        out.push(target);
      }
    } else if (type === "display") {
      out.push(target);
    } else {
      const answers = answersFor(source, values[linkId]);
      if (answers.length > 0) {
        target.answer = answers;
        out.push(target);
      }
    }
  }
  return out;
}

function answersFor(item: QuestionnaireItem, value: QuestionnaireAnswerValue | undefined): FhirResource[] {
  if (value === undefined) return [];
  if (typeof value === "string" && value.trim() === "") return [];
  if (Array.isArray(value)) return value.map((v) => answerForScalar(item, v)).filter(isRecord);
  const answer = answerForScalar(item, value);
  return answer ? [answer] : [];
}

function answerForScalar(
  item: QuestionnaireItem,
  value: QuestionnaireAnswerScalar,
): FhirResource | undefined {
  const type = stringValue(item.type);
  const answer: FhirResource = {};
  if (type === "integer") {
    const parsed = typeof value === "number" ? Math.trunc(value) : Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return undefined;
    answer.valueInteger = parsed;
  } else if (type === "decimal") {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(parsed)) return undefined;
    answer.valueDecimal = parsed;
  } else if (type === "boolean") {
    answer.valueBoolean = value === true || String(value).toLowerCase() === "true";
  } else if (type === "date") {
    answer.valueDate = String(value);
  } else if (type === "dateTime") {
    answer.valueDateTime = String(value);
  } else if (type === "time") {
    answer.valueTime = String(value);
  } else if (type === "choice" || type === "open-choice") {
    const option = answerOptions(item).find((candidate) => answerOptionKey(candidate) === String(value));
    const optionValue = option ? answerOptionValue(option) : undefined;
    if (optionValue) {
      answer[optionValue.key] = optionValue.value;
    } else {
      answer.valueString = String(value);
    }
  } else {
    answer.valueString = String(value);
  }
  return answer;
}

function answerOptionValue(option: QuestionnaireItem): { key: string; value: unknown } | undefined {
  const coding = recordValue(option.valueCoding);
  if (coding) return { key: "valueCoding", value: copyJson(coding) };
  if (option.valueString !== undefined) return { key: "valueString", value: String(option.valueString) };
  if (option.valueInteger !== undefined) return { key: "valueInteger", value: Number(option.valueInteger) };
  if (option.valueDecimal !== undefined) return { key: "valueDecimal", value: Number(option.valueDecimal) };
  if (option.valueDate !== undefined) return { key: "valueDate", value: String(option.valueDate) };
  if (option.valueDateTime !== undefined) return { key: "valueDateTime", value: String(option.valueDateTime) };
  if (option.valueTime !== undefined) return { key: "valueTime", value: String(option.valueTime) };
  return undefined;
}

function compare(actual: QuestionnaireAnswerValue | undefined, condition: QuestionnaireItem): boolean {
  const operator = stringValue(condition.operator);
  const expected = expectedConditionValue(condition);

  if (operator === "exists") return (actual !== undefined) === (expected === true);
  if (actual === undefined || expected === undefined) return false;
  if (operator === "=") return valuesContain(actual, expected);
  if (operator === "!=") return !valuesContain(actual, expected);

  const left = Number(Array.isArray(actual) ? actual[0] : actual);
  const right = Number(expected);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (operator === ">") return left > right;
  if (operator === "<") return left < right;
  if (operator === ">=") return left >= right;
  if (operator === "<=") return left <= right;
  return false;
}

function expectedConditionValue(condition: QuestionnaireItem): QuestionnaireAnswerScalar | undefined {
  if (condition.answerInteger !== undefined) return Number(condition.answerInteger);
  if (condition.answerDecimal !== undefined) return Number(condition.answerDecimal);
  if (condition.answerBoolean !== undefined) return Boolean(condition.answerBoolean);
  if (condition.answerString !== undefined) return String(condition.answerString);
  const coding = recordValue(condition.answerCoding);
  if (coding) return stringValue(coding.code) ?? stringValue(coding.display);
  return undefined;
}

function valuesContain(actual: QuestionnaireAnswerValue, expected: QuestionnaireAnswerScalar): boolean {
  const values = Array.isArray(actual) ? actual : [actual];
  return values.some((v) => String(v) === String(expected));
}

function questionnaireReference(questionnaire: QuestionnaireResource): string | undefined {
  const url = stringValue(questionnaire.url);
  if (url) {
    const version = stringValue(questionnaire.version);
    return version ? `${url}|${version}` : url;
  }
  const id = stringValue(questionnaire.id);
  return id ? `Questionnaire/${id}` : undefined;
}

function arrayRecords(value: unknown): QuestionnaireItem[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordValue(value: unknown): QuestionnaireItem | undefined {
  return isRecord(value) ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is QuestionnaireItem {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}
