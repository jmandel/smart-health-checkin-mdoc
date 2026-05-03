## 16. Worked examples

This section gives informative examples of SMART Health Check-in request and response pairs. The examples are synthetic and are intended to show interoperable protocol shape, stable fixture-friendly identifiers, selector use, Artifact packaging, and validation expectations. They are not production clinical guidance, do not define required clinical content for a visit, and do not imply that the example data is complete, current, or clinically appropriate for any patient.

Each request shown here is the transport-neutral SMART request. In a live version 1.0 presentation, the Verifier carries that JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and receives the SMART response JSON as the `smart_health_checkin_response` element in the same-device direct `org-iso-mdoc` flow. QR codes, NFC tags, deep links, kiosks, relays, and completion screens, when used, are deployment-defined ways to land the Holder on the same-device Verifier page and are not part of these examples.

Example SMART Health Card JWS strings below are abbreviated non-verifying placeholders. Fixture authors replacing them with executable vectors need to use real SMART Health Card JWS values and verify the signed payloads under SMART Health Cards and local trust policy.

### 16.1 Insurance-card-only check-in (CARIN profile, SMART Health Card preferred)

This request asks only for insurance-card content using the CARIN for Digital Insurance Card Coverage profile. The Requester prefers a SMART Health Card but can also consume raw FHIR JSON.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-insurance-card-001",
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

Response with the preferred media type:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-insurance-card-001",
  "artifacts": [
    {
      "id": "artifact-insurance-card-shc",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJhbGciOiJFUzI1NiIsInppcCI6IkRFRiIsImtpZCI6ImRlbW8ta2lkIn0.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlLm9yZyIsInZiIjp7InR5cGUiOlsiaHR0cHM6Ly9zbWFydGhlYWx0aC5jYXJkcyNjb3ZpZDE5Il19fQ.MEYCIQDemoInsuranceCardSignature"
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "insurance-card", "status": "fulfilled" }
  ]
}
```

Validation notes:

- `requestStatus[]` covers the single request item exactly once.
- The SMART Health Card Artifact has no outer `fhirVersion`; FHIR version and source-signature evidence are inside the signed credential payload.
- A Verifier validates that the Artifact `mediaType` appears in the item's `accept[]`, verifies each JWS, and inspects the signed FHIR content for responsiveness to the requested CARIN Coverage profile.
- A raw FHIR fallback response would use `mediaType: "application/fhir+json"`, include `fhirVersion: "4.0.1"`, and return a Coverage resource or Bundle with responsive Coverage content.

### 16.2 US Core summary check-in

This request asks for a focused US Core summary. It demonstrates that `profilesFrom[]` and `profiles[]` are additive: the Wallet can satisfy the profile-selector portion by matching any profile in the US Core family or by matching one of the exact profiles listed, subject to the resource-type constraint.

Request:

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
      "title": "Clinical summary",
      "summary": "Available US Core demographics, problems, allergies, and medications for today's visit.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ],
        "resourceTypes": [
          "Patient",
          "Condition",
          "AllergyIntolerance",
          "MedicationRequest"
        ]
      },
      "accept": ["application/fhir+json", "application/smart-health-card"]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-us-core-summary-001",
  "artifacts": [
    {
      "id": "artifact-us-core-summary-bundle",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["us-core-summary"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "fullUrl": "urn:uuid:patient-us-core-001",
            "resource": {
              "resourceType": "Patient",
              "id": "patient-us-core-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
                ]
              },
              "name": [{ "family": "Example", "given": ["Pat"] }],
              "birthDate": "1970-01-01"
            }
          },
          {
            "fullUrl": "urn:uuid:condition-migraine-001",
            "resource": {
              "resourceType": "Condition",
              "id": "condition-migraine-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
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
              "subject": { "reference": "Patient/patient-us-core-001" },
              "code": { "text": "Migraine" }
            }
          },
          {
            "fullUrl": "urn:uuid:allergy-penicillin-001",
            "resource": {
              "resourceType": "AllergyIntolerance",
              "id": "allergy-penicillin-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"
                ]
              },
              "patient": { "reference": "Patient/patient-us-core-001" },
              "code": { "text": "Penicillin" }
            }
          },
          {
            "fullUrl": "urn:uuid:medicationrequest-sumatriptan-001",
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medicationrequest-sumatriptan-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
                ]
              },
              "status": "active",
              "intent": "order",
              "subject": { "reference": "Patient/patient-us-core-001" },
              "medicationCodeableConcept": { "text": "sumatriptan" }
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
      "message": "Shared available matching US Core resources; completeness is not asserted."
    }
  ]
}
```

Validation notes:

- `partial` is appropriate when the Wallet returns responsive content but does not claim a complete US Core summary.
- The Verifier evaluates the Bundle and each `Bundle.entry[].resource` under `fhirVersion: "4.0.1"`.
- Returned `meta.profile` strings are evidence for selector responsiveness and are preserved exactly.
- Raw FHIR JSON remains patient-mediated unless the payload or deployment policy supplies separate provenance, signature, source attestation, or equivalent proof.

### 16.3 Inline questionnaire pre-visit intake

This request uses the flattened Questionnaire selector. `canonical` and `resource` are direct members of `content`; there is no nested `questionnaire` member. The example Questionnaire is illustrative and is not clinical advice.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-inline-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "migraine-intake",
      "title": "Migraine check-in",
      "summary": "Brief questions to prepare for today's visit.",
      "required": true,
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
          "version": "1.2.3",
          "status": "active",
          "title": "Migraine Check-in",
          "item": [
            {
              "linkId": "visit-priority",
              "text": "What would you most like to discuss today?",
              "type": "text",
              "required": true
            },
            {
              "linkId": "headache-today",
              "text": "Are you experiencing a headache today?",
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

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-inline-intake-001",
  "artifacts": [
    {
      "id": "artifact-migraine-intake-response",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["migraine-intake"],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "id": "qr-migraine-intake-001",
        "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        "status": "completed",
        "authored": "2026-05-01T14:30:00Z",
        "item": [
          {
            "linkId": "visit-priority",
            "answer": [
              { "valueString": "Discuss migraine frequency and medication options." }
            ]
          },
          {
            "linkId": "headache-today",
            "answer": [{ "valueBoolean": true }]
          }
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "migraine-intake", "status": "fulfilled" }
  ]
}
```

Validation notes:

- The returned `QuestionnaireResponse.questionnaire` preserves the exact requested canonical string, including `|1.2.3`.
- A legacy selector such as `{ "kind": "questionnaire", "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake" }` is not an alternate example; it is the old nested shape and should be rejected or reported as `unsupported` by version 1.0 processors.
- If a Wallet detects material disagreement between `canonical` and the inline `resource`, `unsupported` is usually the appropriate item outcome before answers are collected; an operational failure after the Questionnaire is understood is usually `error`.

### 16.4 Mixed bundle: insurance + history + intake

This example shows a single raw FHIR Bundle Artifact fulfilling several request items. The Artifact can fulfill all three items only because each item accepts `application/fhir+json` and the Bundle contains content responsive to each selector. The Requester still receives exactly one status entry per item.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-mixed-checkin-001",
  "purpose": "Visit check-in",
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
      "summary": "Available US Core patient, condition, allergy, and medication resources.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": [
          "Patient",
          "Condition",
          "AllergyIntolerance",
          "MedicationRequest"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "previsit-intake",
      "title": "Pre-visit intake",
      "summary": "Short visit-specific intake questionnaire.",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2026-05",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/previsit-intake",
          "version": "2026-05",
          "status": "active",
          "title": "Pre-visit Intake",
          "item": [
            {
              "linkId": "reason-for-visit",
              "text": "What is the main reason for today's visit?",
              "type": "text"
            }
          ]
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-mixed-checkin-001",
  "artifacts": [
    {
      "id": "artifact-mixed-checkin-bundle",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["insurance-card", "clinical-history", "previsit-intake"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "fullUrl": "urn:uuid:coverage-carin-001",
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-carin-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
                ]
              },
              "status": "active",
              "beneficiary": { "reference": "Patient/patient-mixed-001" },
              "payor": [{ "display": "Example Health Plan" }]
            }
          },
          {
            "fullUrl": "urn:uuid:patient-mixed-001",
            "resource": {
              "resourceType": "Patient",
              "id": "patient-mixed-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
                ]
              },
              "name": [{ "family": "Example", "given": ["Riley"] }]
            }
          },
          {
            "fullUrl": "urn:uuid:condition-asthma-001",
            "resource": {
              "resourceType": "Condition",
              "id": "condition-asthma-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
                ]
              },
              "subject": { "reference": "Patient/patient-mixed-001" },
              "code": { "text": "Asthma" }
            }
          },
          {
            "fullUrl": "urn:uuid:qr-previsit-intake-001",
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "qr-previsit-intake-001",
              "questionnaire": "https://clinic.example.org/fhir/Questionnaire/previsit-intake|2026-05",
              "status": "completed",
              "item": [
                {
                  "linkId": "reason-for-visit",
                  "answer": [{ "valueString": "Follow-up visit." }]
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
      "message": "Shared selected matching clinical history resources."
    },
    { "item": "previsit-intake", "status": "fulfilled" }
  ]
}
```

Validation notes:

- The single Artifact's `mediaType` is acceptable for every item in `fulfills[]`.
- The Bundle is interpreted entirely under `fhirVersion: "4.0.1"`; resources requiring another FHIR release would need another Artifact or a non-fulfilled status.
- The Artifact id is response-scoped and is not a source-system document id, patient id, or provenance id.
- Even though `insurance-card` listed SMART Health Card first, raw FHIR JSON is valid because it also appears in that item's `accept[]`.

### 16.5 Per-item declined / partial / error

This example shows normal item-level non-fulfillment outcomes. A Holder can decline one item, a Wallet can share a subset for another, and an operational error can affect a third without converting the whole response into a transport failure.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-status-mix-001",
  "purpose": "Pre-visit check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "demographics",
      "title": "Demographics",
      "summary": "Basic patient demographics for check-in.",
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
        ],
        "resourceTypes": ["Patient"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "medications",
      "title": "Medications",
      "summary": "Available current medications.",
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ],
        "resourceTypes": ["MedicationRequest"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "sensitive-history",
      "title": "Sensitive history",
      "summary": "Additional history that may be relevant to today's visit.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": ["Condition", "Observation"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake-form",
      "title": "Intake form",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/intake|2.0.0"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-status-mix-001",
  "artifacts": [
    {
      "id": "artifact-demographics",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["demographics"],
      "value": {
        "resourceType": "Patient",
        "id": "patient-status-001",
        "meta": {
          "profile": [
            "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
          ]
        },
        "name": [{ "family": "Example", "given": ["Sam"] }]
      }
    },
    {
      "id": "artifact-medications-partial",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["medications"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medicationrequest-status-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
                ]
              },
              "status": "active",
              "intent": "order",
              "subject": { "reference": "Patient/patient-status-001" },
              "medicationCodeableConcept": { "text": "albuterol" }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "demographics", "status": "fulfilled" },
    {
      "item": "medications",
      "status": "partial",
      "message": "Shared one available current medication; no completeness claim is made."
    },
    {
      "item": "sensitive-history",
      "status": "declined",
      "message": "The Holder chose not to share this item."
    },
    {
      "item": "intake-form",
      "status": "error",
      "message": "The Wallet could not complete the questionnaire response."
    }
  ]
}
```

Validation notes:

- `requestStatus[]` covers all four request items exactly once, including items that have no Artifact.
- `declined` reports Holder refusal or a Holder-preference policy decision. Receivers should not infer the presence or absence of a condition from the declined status.
- `partial` is paired with a responsive Artifact but does not assert completeness.
- `error` is used for an operational failure after the item was understood; the message is concise and avoids stack traces, tokens, internal source names, or clinical details.

### 16.6 "No selectors" — full open-ended share

A `fhir.resources` selector with no `profiles[]`, no `profilesFrom[]`, and no `resourceTypes[]` requests any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share. Requesters should avoid this broad form unless the workflow can safely consume broad FHIR content and the Holder-facing text explains the breadth of the request.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-ended-share-001",
  "purpose": "Open-ended health record share",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "open-ended-fhir-share",
      "title": "Share available health information",
      "summary": "Share any patient-specific FHIR resources you choose to provide for this check-in. This may include demographics, coverage, medications, conditions, allergies, immunizations, observations, or other records available to your Wallet.",
      "required": false,
      "content": {
        "kind": "fhir.resources"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-open-ended-share-001",
  "artifacts": [
    {
      "id": "artifact-open-ended-bundle",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["open-ended-fhir-share"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-open-ended-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
                ]
              },
              "name": [{ "family": "Example", "given": ["Jordan"] }]
            }
          },
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-open-ended-001",
              "status": "active",
              "beneficiary": { "reference": "Patient/patient-open-ended-001" },
              "payor": [{ "display": "Example Health Plan" }]
            }
          },
          {
            "resource": {
              "resourceType": "Immunization",
              "id": "immunization-open-ended-001",
              "status": "completed",
              "patient": { "reference": "Patient/patient-open-ended-001" },
              "vaccineCode": { "text": "Example vaccine" },
              "occurrenceDateTime": "2024-10-01"
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "open-ended-fhir-share",
      "status": "partial",
      "message": "Shared selected available FHIR resources chosen for this check-in; this is not a complete record export."
    }
  ]
}
```

Validation notes:

- The empty selector object is valid only because `kind` is `"fhir.resources"`; it is not a local topic shortcut and does not imply a required full-record export.
- `partial` is often the most accurate status for no-selector requests because the Wallet typically cannot or should not claim that all possible patient-specific FHIR resources have been disclosed.
- The Verifier still applies normal raw FHIR checks: `fhirVersion` is present, the Bundle and entries are interpreted under that version, `fulfills[]` references the original item, the media type is accepted, and raw FHIR provenance is not inferred from transport success.
