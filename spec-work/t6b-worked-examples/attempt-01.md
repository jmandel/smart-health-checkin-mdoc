## 16. Worked examples

This section is informative. The examples show typical SMART Health Check-in request and response pairs using the clinical content model from §§5-6. They do not define required workflows, required clinical content, fixture values, user-interface text, trust anchors, or downstream EHR ingestion behavior.

The examples focus on the transport-neutral SMART request and SMART response. In a live SMART Health Check-in 1.0 presentation, a Verifier carries the SMART request and receives the SMART response through the same-device direct `org-iso-mdoc` flow defined in §8. An in-person QR code, NFC tap, deep link, kiosk screen, or staff workflow can be useful deployment UX to load that same-device Verifier page, but this section does not define a cross-device protocol, pointer format, relay, submission endpoint, or completion message.

Example identifiers, URLs, patient names, FHIR ids, dates, and JWS strings are synthetic. Raw `application/fhir+json` examples are patient-mediated content unless the payload itself or deployment policy supplies separate accepted provenance, signature, or source-attestation evidence. SMART Health Card examples require ordinary SMART Health Card JWS verification and local trust policy before clinical use.

### 16.1 Insurance-card-only check-in (CARIN profile, SHC preferred)

This example asks only for a coverage artifact. The selector names the exact CARIN for Digital Insurance Card Coverage profile and constrains returned raw FHIR resources, if used, to `Coverage`. The `accept[]` order says that a SMART Health Card is preferred, with raw FHIR JSON as a fallback the Requester can also process.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-insurance-001",
  "purpose": "Insurance verification",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "summary": "Coverage information for billing and check-in.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": ["Coverage"]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    }
  ]
}
```

Example response with the preferred SMART Health Card form:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-insurance-001",
  "artifacts": [
    {
      "id": "artifact-insurance-shc-1",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJodHRwczovL3BheWVyLmV4YW1wbGUuaW52YWxpZCIsInN1YiI6InN5bnRoZXRpYy1tZW1iZXIifQ.MEYCIQDm_example_signature"
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "insurance-card", "status": "fulfilled" }
  ]
}
```

The SMART response reports exactly one status entry for the one request item. The Artifact has no outer `fhirVersion` because the selected media type is `application/smart-health-card`; FHIR-version and profile evidence are evaluated inside the signed SMART Health Card payload.

### 16.2 US Core summary check-in

This example asks for a focused set of US Core resources as raw FHIR JSON. The `profilesFrom[]` value is an array containing the US Core profile-family canonical. The `resourceTypes[]` list keeps the request focused on resource types the receiver is prepared to route for this workflow.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-us-core-summary-001",
  "purpose": "Clinical summary for check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "us-core-summary",
      "title": "Health summary",
      "summary": "Demographics, active problems, medications, allergies, and recent vital signs available for this visit.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": [
          "Patient",
          "Condition",
          "MedicationRequest",
          "AllergyIntolerance",
          "Observation"
        ]
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-us-core-summary-001",
  "artifacts": [
    {
      "id": "artifact-us-core-summary-1",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["us-core-summary"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-1",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
                ]
              },
              "name": [
                { "family": "Rivera", "given": ["Alex"] }
              ],
              "birthDate": "1980-01-01"
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-1",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
                ]
              },
              "clinicalStatus": {
                "coding": [
                  {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                  }
                ]
              },
              "code": { "text": "Asthma" },
              "subject": { "reference": "Patient/patient-1" }
            }
          },
          {
            "resource": {
              "resourceType": "AllergyIntolerance",
              "id": "allergy-1",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"
                ]
              },
              "clinicalStatus": {
                "coding": [
                  {
                    "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    "code": "active"
                  }
                ]
              },
              "code": { "text": "Peanut" },
              "patient": { "reference": "Patient/patient-1" }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "us-core-summary",
      "status": "partial",
      "message": "Shared available matching US Core resources. Medication data was not available."
    }
  ]
}
```

The `partial` status is appropriate because the broad item was answered with some, but not all, requested categories. The raw FHIR Artifact declares `fhirVersion` at the Artifact level and keeps profile evidence inside the FHIR resources.

### 16.3 Inline questionnaire pre-visit intake

This example uses the flattened Questionnaire selector. The selector has `content.kind` equal to `questionnaire` and carries `canonical` and `resource` directly as sibling members. The canonical includes a `|version` suffix, and the response preserves the exact canonical string in `QuestionnaireResponse.questionnaire`.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-inline-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "previsit-intake",
      "title": "Pre-visit intake form",
      "summary": "Brief questions before today's visit.",
      "required": true,
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/previsit-intake",
          "version": "2025-01",
          "status": "active",
          "title": "Pre-visit Intake",
          "item": [
            {
              "linkId": "reason",
              "text": "What is the main reason for today's visit?",
              "type": "text"
            },
            {
              "linkId": "med-change",
              "text": "Have your medications changed since your last visit?",
              "type": "boolean"
            }
          ]
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-inline-intake-001",
  "artifacts": [
    {
      "id": "artifact-intake-response-1",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["previsit-intake"],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "id": "qr-previsit-intake-1",
        "questionnaire": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01",
        "status": "completed",
        "item": [
          {
            "linkId": "reason",
            "answer": [
              { "valueString": "Follow-up and medication refill." }
            ]
          },
          {
            "linkId": "med-change",
            "answer": [
              { "valueBoolean": false }
            ]
          }
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "previsit-intake", "status": "fulfilled" }
  ]
}
```

The legacy nested forms below are not SMART Health Check-in 1.0 examples and are shown only to clarify what not to copy:

```json
{ "kind": "questionnaire", "questionnaire": "https://clinic.example.org/fhir/Questionnaire/previsit-intake" }
```

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "canonical": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01",
    "resource": { "resourceType": "Questionnaire" }
  }
}
```

### 16.4 Mixed bundle: insurance + history + intake

This example combines three request items in one check-in: insurance coverage, clinical history, and an intake Questionnaire. It demonstrates that the response can mix core Artifact media types and that a single raw FHIR JSON Bundle can fulfill more than one item when every listed item accepts that media type and the payload is responsive to each selector.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-mixed-checkin-001",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "summary": "Coverage information for billing.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": ["Coverage"]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "Clinical history",
      "summary": "Available US Core problems, allergies, and medications.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|8.0.1"
        ],
        "resourceTypes": ["Patient", "Condition", "AllergyIntolerance", "MedicationRequest"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "previsit-intake",
      "title": "Pre-visit intake",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/previsit-intake",
          "version": "2025-01",
          "status": "active",
          "title": "Pre-visit Intake",
          "item": [
            { "linkId": "reason", "text": "Reason for visit", "type": "text" }
          ]
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-mixed-checkin-001",
  "artifacts": [
    {
      "id": "artifact-insurance-shc-1",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJodHRwczovL3BheWVyLmV4YW1wbGUuaW52YWxpZCJ9.MEUCIQD_example_signature"
        ]
      }
    },
    {
      "id": "artifact-history-and-intake-1",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["clinical-history", "previsit-intake"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-1",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|8.0.1"
                ]
              },
              "name": [
                { "family": "Rivera", "given": ["Alex"] }
              ]
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-1",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
                ]
              },
              "code": { "text": "Asthma" },
              "subject": { "reference": "Patient/patient-1" }
            }
          },
          {
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "qr-previsit-intake-1",
              "questionnaire": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01",
              "status": "completed",
              "item": [
                {
                  "linkId": "reason",
                  "answer": [
                    { "valueString": "Follow-up and medication refill." }
                  ]
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "insurance-card", "status": "fulfilled" },
    {
      "item": "clinical-history",
      "status": "partial",
      "message": "Shared patient demographics and one active condition; other requested categories were not available."
    },
    { "item": "previsit-intake", "status": "fulfilled" }
  ]
}
```

The versioned US Core patient profile string is preserved exactly in the returned `meta.profile`. The `profiles[]` and `profilesFrom[]` selector fields in the clinical-history item are additive; the exact patient profile does not narrow the US Core family request. The `resourceTypes[]` list is the separate resource-type constraint.

### 16.5 Per-item declined / partial / error

This example shows that a valid response can contain non-fulfilled item outcomes. The Holder declines insurance sharing, the Wallet returns only some clinical history, and an operational failure occurs while attempting to construct a QuestionnaireResponse. These are item-level outcomes, not a reason to invent an alternate Artifact shape.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-status-demo-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": ["Coverage"]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "Clinical history",
      "summary": "Available US Core problems and medications.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": ["Condition", "MedicationRequest"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "previsit-intake",
      "title": "Pre-visit intake form",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-status-demo-001",
  "artifacts": [
    {
      "id": "artifact-clinical-history-1",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["clinical-history"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-1",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
                ]
              },
              "code": { "text": "Asthma" },
              "subject": { "reference": "Patient/patient-1" }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "insurance-card",
      "status": "declined",
      "message": "Holder chose not to share coverage information."
    },
    {
      "item": "clinical-history",
      "status": "partial",
      "message": "Shared one available condition; medication data was not available."
    },
    {
      "item": "previsit-intake",
      "status": "error",
      "message": "The questionnaire response could not be constructed."
    }
  ]
}
```

Every request item appears exactly once in `requestStatus[]`, including items with no Artifact. The only Artifact lists the one item it supports in `fulfills[]`. A response with an unknown status code, a missing status entry, a duplicate status entry, or an Artifact whose `mediaType` was not accepted by the fulfilled item would fail request/response cross-validation.

A related unsupported case is a malformed Questionnaire selector that uses the legacy nested `questionnaire` member. The following is not a valid 1.0 selector shape:

```json
{
  "id": "legacy-intake",
  "title": "Legacy intake form",
  "content": {
    "kind": "questionnaire",
    "questionnaire": {
      "canonical": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2025-01"
    }
  },
  "accept": ["application/fhir+json"]
}
```

If a Wallet proceeds far enough to answer a request containing such an item rather than rejecting the whole presentation, the item can be reported as `unsupported` with no fulfilling Artifact:

```json
{
  "item": "legacy-intake",
  "status": "unsupported",
  "message": "Questionnaire selector used a legacy nested shape."
}
```

### 16.6 "No selectors" — full open-ended share

This example uses the no-selector default for `fhir.resources`: `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted. The item therefore requests any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share, limited by accepted media types, requested FHIR versions, Wallet capability, local policy, and Holder decision.

No-selector requests are intentionally broad. They are most appropriate when the workflow can safely process broad patient-mediated FHIR content and the Holder-facing text makes that breadth clear. A Wallet is not expected to disclose every available resource merely because no selector was supplied, and `partial` is often the accurate status for a limited open-ended share.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-share-001",
  "purpose": "Open-ended health record share",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "open-fhir-share",
      "title": "Share available health records",
      "summary": "Share patient-specific FHIR records you choose to provide for this visit. This may include demographics, coverage, conditions, medications, allergies, immunizations, observations, documents, and other available resources.",
      "content": {
        "kind": "fhir.resources"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example response with a limited Holder-approved subset:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-open-share-001",
  "artifacts": [
    {
      "id": "artifact-open-share-1",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["open-fhir-share"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-1",
              "name": [
                { "family": "Rivera", "given": ["Alex"] }
              ]
            }
          },
          {
            "resource": {
              "resourceType": "Observation",
              "id": "observation-bp-1",
              "status": "final",
              "code": { "text": "Blood pressure" },
              "subject": { "reference": "Patient/patient-1" }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "open-fhir-share",
      "status": "partial",
      "message": "Holder shared a limited subset of available patient-specific FHIR records."
    }
  ]
}
```

The absence of selector fields does not create a special media type, a generic Artifact carrier, a requirement to export a full longitudinal record, or an authenticated clinical-source claim for unsigned raw FHIR JSON. The Verifier still validates `requestId`, `fulfills[]`, accepted `mediaType`, `requestStatus[]`, and `fhirVersion`, then applies FHIR-aware and local policy checks before downstream use.
