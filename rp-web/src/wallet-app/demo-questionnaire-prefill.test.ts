import { describe, expect, test } from "bun:test";
import type { SmartCheckinRequestItem } from "../sdk/core.ts";
import { demoQuestionnairePrefillAnswersForItems } from "./demo-questionnaire-prefill.ts";

describe("web wallet demo questionnaire prefill", () => {
  test("fills the wellbeing free-text item with the compact headache summary", () => {
    const items: SmartCheckinRequestItem[] = [
      {
        id: "intake",
        title: "Intake form",
        content: {
          kind: "form.fhir",
          questionnaire: {
            resourceType: "Questionnaire",
            title: "Migraine Check-in",
            status: "active",
            item: [
              {
                linkId: "wellbeing",
                text: "How have you been feeling since your last visit?",
                type: "text",
              },
            ],
          },
        },
        accept: ["application/fhir+json"],
      },
    ];

    const prefills = demoQuestionnairePrefillAnswersForItems(items);

    expect(prefills["intake::wellbeing"]).toContain("| Signal |");
    expect(prefills["intake::wellbeing"]).toContain("Weekly migraine days");
  });
});
