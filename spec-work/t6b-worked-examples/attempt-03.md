## 16. Worked examples

The examples in this section are informative. They illustrate internally consistent SMART Health Check-in request and response pairs for common check-in workflows. The clinical JSON objects shown here are the transport-neutral SMART request and SMART response defined in §§5-6. In a live version 1.0 same-device presentation, the SMART request is carried as JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, and the SMART response is returned as the `smart_health_checkin_response` element in the direct `org-iso-mdoc` flow defined by §8.

The examples do not define required clinical content, required Wallet storage, required issuer trust anchors, a kiosk or cross-device protocol, EHR write-back behavior, or production trust policy. In-person initiation, when used, is only deployment-defined UX that lands the Holder on a same-device Verifier page.

### 16.1 Insurance-card-only check-in (CARIN profile, SHC preferred)

This example asks only for coverage information matching a CARIN Digital Insurance Card Coverage profile. The Requester prefers a SMART Health Card but can also consume raw FHIR JSON.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-insurance-001",
  "purpose": "Insurance verification for check-in",
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
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    }
  ]
}
```

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-insurance-001",
  "artifacts": [
    {
      "id": "artifact-insurance-shc",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJhbGciOiJFUzI1NiIsInppcCI6IkRFRiJ9.example-insurance-card.signature"
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "insurance-card",
      "status": "fulfilled"
    }
  ]
}
```

Validation notes and omissions:

- `requestId` exactly matches the request `id`.
- The sole Artifact fulfills the sole request item, and its `mediaType` appears in that item's `accept[]`.
- The SMART Health Card Artifact has `value.verifiableCredential[]` and no outer `fhirVersion`; the FHIR release and profile evidence are inside the signed credential payload.
- A Verifier still verifies each SMART Health Card JWS and evaluates the signed payload against the requested CARIN Coverage selector and local trust policy.
- The JWS string is a placeholder for readable documentation; it is not a production credential or conformance vector.
- This example omits same-device CBOR, HPKE, mdoc issuer evidence, reader authentication, patient matching, and EHR ingestion policy.

### 16.2 US Core summary check-in

This example asks for a US Core-oriented summary as raw FHIR JSON. It uses `profilesFrom[]` as an array of canonical profile-family URLs and also lists an exact versioned US Core Patient profile. The exact profile and the profile family are additive: a resource can be responsive through either the exact profile or membership in the US Core family, subject to the `resourceTypes[]` constraint.

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
      "title": "Clinical summary",
      "summary": "Available US Core demographics, problems, medications, and allergies.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0"
        ],
        "resourceTypes": [
          "Patient",
          "Condition",
          "MedicationRequest",
          "AllergyIntolerance"
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
      "id": "artifact-us-core-summary-bundle",
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
              "id": "patient-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0"
                ]
              },
              "name": [
                {
                  "family": "Example",
                  "given": ["Pat"]
                }
              ],
              "birthDate": "1970-01-01"
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-example",
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
              "code": {
                "text": "Example active problem"
              },
              "subject": {
                "reference": "Patient/patient-example"
              }
            }
          },
          {
            "resource": {
              "resourceType": "AllergyIntolerance",
              "id": "allergy-example",
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
              "code": {
                "text": "Example allergy"
              },
              "patient": {
                "reference": "Patient/patient-example"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "us-core-summary",
      "status": "fulfilled"
    }
  ]
}
```

Validation notes and omissions:

- The raw FHIR JSON Artifact declares `fhirVersion: "4.0.1"`, which is listed in the request's `fhirVersions[]`.
- The Artifact's `mediaType` is accepted by `us-core-summary`, and the only `fulfills[]` value resolves to the original item id.
- `requestStatus[]` covers the single item exactly once.
- The Patient `meta.profile[]` preserves the requested versioned canonical exactly, including `|6.1.0`; no strip-and-fetch or suffix normalization is implied.
- The `profiles[]` and `profilesFrom[]` selectors are additive. The exact versioned Patient profile does not narrow the US Core profile-family request.
- Raw FHIR JSON remains patient-mediated unless separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present and accepted.
- This example omits full FHIR profile validation, terminology validation, SMART Health Card signatures, mdoc bytes, and downstream import decisions.

### 16.3 Inline questionnaire pre-visit intake

This example uses the flattened Questionnaire selector. The `canonical` and `resource` members are direct siblings of `kind`; there is no nested `questionnaire` member. The response returns a FHIR `QuestionnaireResponse` as raw FHIR JSON and preserves the requested versioned Questionnaire canonical in `QuestionnaireResponse.questionnaire`.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "intake",
      "title": "Migraine check-in",
      "summary": "Brief questions before today's visit.",
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
              "linkId": "headache-today",
              "text": "Are you experiencing a headache today?",
              "type": "boolean"
            },
            {
              "linkId": "symptoms-note",
              "text": "Anything else you want the care team to know?",
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

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-intake-001",
  "artifacts": [
    {
      "id": "artifact-intake-questionnaire-response",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["intake"],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "id": "qr-migraine-intake-example",
        "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        "status": "completed",
        "item": [
          {
            "linkId": "headache-today",
            "answer": [
              {
                "valueBoolean": false
              }
            ]
          },
          {
            "linkId": "symptoms-note",
            "answer": [
              {
                "valueString": "No additional concerns today."
              }
            ]
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "intake",
      "status": "fulfilled"
    }
  ]
}
```

Validation notes and omissions:

- The selector is the version 1.0 flattened shape: `content.kind = "questionnaire"` with direct `canonical` and `resource` members.
- A nested `questionnaire` string, nested Questionnaire resource, or `questionnaire: { canonical, resource }` wrapper would be an invalid non-example shape.
- The response Artifact uses `application/fhir+json`, includes `fhirVersion`, and fulfills only an item that accepted that media type.
- `QuestionnaireResponse.questionnaire` preserves the exact request canonical, including `|1.2.3`.
- If the Wallet detected a material disagreement between `canonical`, `resource.url`, `resource.version`, or answer-changing item structure before collecting answers, `unsupported` would be an appropriate item outcome instead of silently merging definitions.
- This example omits Questionnaire rendering rules, Structured Data Capture behavior, answer validation, provenance, and same-device byte material.

### 16.4 Mixed bundle: insurance + history + intake

This example combines three request items. The Wallet returns a SMART Health Card for the insurance-card item and one raw FHIR Bundle for the clinical-history and intake items. The Artifact boundaries do not mirror the item boundaries, but every fulfillment edge is validated against the original item's `accept[]`.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-mixed-001",
  "purpose": "Check-in information for today's visit",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "summary": "Coverage information for billing.",
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": ["Coverage"]
      },
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    },
    {
      "id": "clinical-history",
      "title": "Clinical history",
      "summary": "Available patient, problem, medication, and allergy resources.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "resourceTypes": [
          "Patient",
          "Condition",
          "MedicationRequest",
          "AllergyIntolerance"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Visit intake",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/visit-intake|2025-01",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/visit-intake",
          "version": "2025-01",
          "status": "active",
          "title": "Visit Intake",
          "item": [
            {
              "linkId": "reason",
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

Example response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-mixed-001",
  "artifacts": [
    {
      "id": "artifact-insurance-card-shc",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJhbGciOiJFUzI1NiIsInppcCI6IkRFRiJ9.example-mixed-insurance.signature"
        ]
      }
    },
    {
      "id": "artifact-history-intake-bundle",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "clinical-history",
        "intake"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
                ]
              }
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
                ]
              },
              "code": {
                "text": "Example active problem"
              },
              "subject": {
                "reference": "Patient/patient-example"
              }
            }
          },
          {
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "qr-visit-intake-example",
              "questionnaire": "https://clinic.example.org/fhir/Questionnaire/visit-intake|2025-01",
              "status": "completed",
              "item": [
                {
                  "linkId": "reason",
                  "answer": [
                    {
                      "valueString": "Routine follow-up."
                    }
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
    {
      "item": "insurance-card",
      "status": "fulfilled"
    },
    {
      "item": "clinical-history",
      "status": "fulfilled"
    },
    {
      "item": "intake",
      "status": "fulfilled"
    }
  ]
}
```

Validation notes and omissions:

- `requestStatus[]` has exactly one entry for each of the three request items.
- The SMART Health Card Artifact fulfills only `insurance-card`, which accepted `application/smart-health-card`.
- The raw FHIR JSON Bundle fulfills `clinical-history` and `intake`; both items accepted `application/fhir+json`.
- The raw FHIR Artifact declares `fhirVersion: "4.0.1"`; all resources in the Bundle are interpreted under that release.
- The QuestionnaireResponse preserves the requested Questionnaire canonical exactly, including `|2025-01`.
- One Artifact may fulfill multiple items, and one response may contain different core Artifact media types. This does not create a generic Artifact branch or a wrapper-level profile summary.
- This example omits the signed content of the SMART Health Card, complete US Core resource details, full FHIR validation, and production trust decisions.

### 16.5 Per-item declined / partial / error

This example shows that per-item outcomes are first-class response data. The Holder declines one item, shares only part of another broad item, and the Wallet encounters an operational error while processing a Questionnaire item. The response is still shaped as a SMART response, and every request item has exactly one status entry.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-outcomes-001",
  "purpose": "Check-in update",
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
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    },
    {
      "id": "medications-and-problems",
      "title": "Medications and problems",
      "summary": "Available active medications and problems.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "resourceTypes": [
          "MedicationRequest",
          "Condition"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Visit intake",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/visit-intake|2025-01"
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
  "requestId": "req-outcomes-001",
  "artifacts": [
    {
      "id": "artifact-partial-history",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["medications-and-problems"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medicationrequest-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
                ]
              },
              "status": "active",
              "intent": "order",
              "medicationCodeableConcept": {
                "text": "Example medication"
              },
              "subject": {
                "reference": "Patient/patient-example"
              }
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
      "message": "Holder declined to share this item."
    },
    {
      "item": "medications-and-problems",
      "status": "partial",
      "message": "Shared available medication information; other matching resources were not shared."
    },
    {
      "item": "intake",
      "status": "error",
      "message": "The questionnaire could not be completed in this session."
    }
  ]
}
```

Validation notes and omissions:

- The response has exactly one status entry for `insurance-card`, `medications-and-problems`, and `intake`.
- Only the `partial` item has a fulfilling Artifact. The declined and error items have no fulfilling Artifact, which is the usual pattern for these outcomes.
- The partial Artifact's `mediaType` is accepted by `medications-and-problems` and declares `fhirVersion: "4.0.1"`.
- The status `message` values are concise and avoid stack traces, access tokens, source-system internals, and unnecessary patient detail.
- A Verifier validates response shape and cross-links before downstream policy decides how to proceed with missing insurance information, partial history, or an intake error.
- This example omits the platform failure details that caused the `error`, because such diagnostics are not part of the clinical response model.

### 16.6 "No selectors" — full open-ended share

This example intentionally uses the no-selector default for a `fhir.resources` item: the selector has `kind: "fhir.resources"` and omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`. The item is broad and should be used only when the workflow can safely consume open-ended patient-specific FHIR content and the Holder-facing text explains the breadth of the request.

Example request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-ended-001",
  "purpose": "Open-ended health information share for check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "open-ended-fhir",
      "title": "Health information from your wallet",
      "summary": "Share any patient-specific FHIR information you choose to provide for this check-in. This may include demographics, coverage, conditions, medications, allergies, immunizations, observations, or other available records.",
      "content": {
        "kind": "fhir.resources"
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
  "requestId": "req-open-ended-001",
  "artifacts": [
    {
      "id": "artifact-open-ended-selection",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["open-ended-fhir"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
                ]
              }
            }
          },
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
                ]
              },
              "status": "active",
              "beneficiary": {
                "reference": "Patient/patient-example"
              }
            }
          },
          {
            "resource": {
              "resourceType": "Observation",
              "id": "observation-example",
              "status": "final",
              "code": {
                "text": "Example patient-mediated observation"
              },
              "subject": {
                "reference": "Patient/patient-example"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "open-ended-fhir",
      "status": "partial",
      "message": "Holder shared selected patient-specific FHIR resources."
    }
  ]
}
```

Validation notes and omissions:

- The request item uses the no-selector default because `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted.
- The returned Artifact is raw FHIR JSON, declares `fhirVersion: "4.0.1"`, and uses a Bundle because multiple resources are returned.
- `partial` is appropriate because a no-selector request does not require the Wallet to disclose all available resources and the Wallet does not claim complete fulfillment of all possible patient-specific FHIR content.
- The Verifier should not infer a specific profile, resource type, or full-record guarantee from the no-selector request. It evaluates the returned Bundle entries and local ingestion policy resource by resource.
- Raw FHIR JSON in this example is patient-mediated unless separate accepted provenance or signatures are present.
- This example omits sensitive-category filtering, Holder UI design, downstream minimization, and same-device transport bytes.
