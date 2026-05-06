import headacheSummaryMarkdown from "../../../wallet-android/app/src/main/assets/demo-data/headache-summary.md" with { type: "text" };
import type { SmartCheckinRequestItem } from "../sdk/core.ts";
import {
  questionnaireAnswerKey,
  questionnaireFromRequestItem,
  questionnaireItems,
  type QuestionnaireAnswerValue,
} from "./questionnaire.ts";

const WELLBEING_LINK_ID = "wellbeing";
const HEADACHE_SUMMARY_MARKDOWN = headacheSummaryMarkdown.trim();

export function demoQuestionnairePrefillAnswersForItems(
  requestItems: ReadonlyArray<SmartCheckinRequestItem>,
): Record<string, QuestionnaireAnswerValue> {
  const answers: Record<string, QuestionnaireAnswerValue> = {};
  for (const requestItem of requestItems) {
    const questionnaire = questionnaireFromRequestItem(requestItem);
    if (!questionnaire) continue;
    collectDemoPrefillAnswers(requestItem.id, questionnaireItems(questionnaire), answers);
  }
  return answers;
}

function collectDemoPrefillAnswers(
  requestItemId: string,
  items: ReadonlyArray<Record<string, unknown>>,
  answers: Record<string, QuestionnaireAnswerValue>,
): void {
  for (const item of items) {
    const type = stringValue(item.type);
    if (type === "group") {
      collectDemoPrefillAnswers(requestItemId, recordArray(item.item), answers);
      continue;
    }
    if (type === "display") continue;

    const linkId = stringValue(item.linkId);
    if (linkId === WELLBEING_LINK_ID) {
      answers[questionnaireAnswerKey(requestItemId, linkId)] = HEADACHE_SUMMARY_MARKDOWN;
    }
  }
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
