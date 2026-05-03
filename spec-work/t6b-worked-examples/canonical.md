## 16. Worked examples

This section is informative. The examples are synthetic request/response pairs that illustrate the SMART Health Check-in clinical JSON model. They do not define required clinical content, fixture byte strings, trust anchors, Holder choices, EHR ingestion policy, or deployment UX.

The same request and response semantics apply when these objects are carried by the same-device direct `org-iso-mdoc` flow. QR, NFC, deep links, kiosks, staff handoff, relays, and completion screens are deployment-defined ways to reach an implementation and are not standardized by these examples.

All examples use only the two core Artifact media types: `application/smart-health-card` and `application/fhir+json`. Raw FHIR JSON in these examples is patient-mediated unless the payload separately contains accepted provenance, signature, source attestation, or equivalent evidence. Holder approval, a valid presentation wrapper, `requestId`, or `fulfills[]` does not by itself prove clinical-source provenance.

### 16.1 Insurance-card-only check-in (CARIN profile, SHC preferred)

This example asks for Coverage content conforming to the CARIN digital insurance card profile and advertises SMART Health Card first. The Wallet returns an SHC Artifact because `application/smart-health-card` appears in the item `accept[]` list.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-insurance-001",
  "purpose": "Insurance verification for check-in",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "summary": "Share current coverage information conforming to the CARIN digital insurance card profile.",
      "required": true,
      "content": {
        "kind": "selection.fhir",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": [
          "Coverage"
        ]
      },
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-insurance-001",
  "artifacts": [
    {
      "id": "artifact-insurance-shc-001",
      "mediaType": "application/smart-health-card",
      "fulfills": [
        "insurance-card"
      ],
      "value": {
        "verifiableCredential": [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.synthetic-insurance-card.vc"
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "insurance-card",
      "status": "fulfilled",
      "message": "Shared a SMART Health Card containing matching Coverage content."
    }
  ]
}
```

Validation notes: `requestId` exactly matches the request `id`; the Artifact `fulfills[]` names `insurance-card`; the SHC wrapper has `value.verifiableCredential[]` and no outer `fhirVersion`. A valid SHC signature and issuer trust still have to be evaluated under SMART Health Cards and local policy; this wrapper alone does not prove that the returned credential is clinically sufficient.

### 16.2 US Core summary check-in

This example requests a small US Core summary. It includes both `profilesFrom[]` and exact `profiles[]`; those selectors are additive, and `resourceTypes[]` is the separate resource-type constraint.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-us-core-summary-001",
  "purpose": "Pre-visit chart summary",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "us-core-summary",
      "title": "US Core summary",
      "summary": "Share available patient, problem, and medication summary resources for review before the visit.",
      "content": {
        "kind": "selection.fhir",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis|6.1.0"
        ],
        "resourceTypes": [
          "Patient",
          "Condition",
          "MedicationRequest"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
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
      "id": "artifact-us-core-summary-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "us-core-summary"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-synthetic-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0"
                ]
              },
              "name": [
                {
                  "family": "Rivera",
                  "given": [
                    "Alex"
                  ]
                }
              ],
              "gender": "unknown",
              "birthDate": "1980-01-01"
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-hypertension-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis|6.1.0"
                ]
              },
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "code": {
                "text": "Hypertension"
              },
              "clinicalStatus": {
                "coding": [
                  {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                  }
                ]
              }
            }
          },
          {
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medication-lisinopril-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest|6.1.0"
                ]
              },
              "status": "active",
              "intent": "order",
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "medicationCodeableConcept": {
                "text": "lisinopril"
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
      "status": "fulfilled",
      "message": "Shared available summary resources matching the additive profile selectors and resource-type constraint."
    }
  ]
}
```

Validation notes: the raw FHIR Artifact includes `mediaType: application/fhir+json`, `fhirVersion`, and a FHIR Bundle in `value`. The versioned `meta.profile` strings are preserved exactly. The example does not require every US Core profile to be returned; the Wallet's `fulfilled` status is its response-construction claim, and a receiver can still apply stricter clinical or ingestion policy.

### 16.3 Inline questionnaire pre-visit intake

This example uses the `form.fhir` selector. Both the versioned `questionnaireCanonical` and the inline `questionnaire` resource are direct members of `content`. The expected returned FHIR resource is a `QuestionnaireResponse`.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-inline-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "previsit-intake",
      "title": "Pre-visit intake questionnaire",
      "summary": "Answer two synthetic intake questions before the visit.",
      "content": {
        "kind": "form.fhir",
        "questionnaireCanonical": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
        "questionnaire": {
          "resourceType": "Questionnaire",
          "id": "previsit-intake",
          "url": "https://example.org/fhir/Questionnaire/previsit-intake",
          "version": "2.0.0",
          "status": "active",
          "title": "Pre-visit intake",
          "item": [
            {
              "linkId": "reason",
              "text": "What is the main reason for today's visit?",
              "type": "text",
              "required": true
            },
            {
              "linkId": "symptoms",
              "text": "Do you have any new symptoms?",
              "type": "boolean"
            }
          ]
        }
      },
      "accept": [
        "application/fhir+json"
      ]
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
      "id": "artifact-previsit-intake-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "previsit-intake"
      ],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "id": "qr-previsit-intake-001",
        "questionnaire": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
        "status": "completed",
        "subject": {
          "reference": "Patient/patient-synthetic-001"
        },
        "item": [
          {
            "linkId": "reason",
            "answer": [
              {
                "valueString": "Annual check-in"
              }
            ]
          },
          {
            "linkId": "symptoms",
            "answer": [
              {
                "valueBoolean": false
              }
            ]
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "previsit-intake",
      "status": "fulfilled",
      "message": "Collected answers using the inline Questionnaire and preserved the versioned canonical."
    }
  ]
}
```

Validation notes: the returned `QuestionnaireResponse.questionnaire` preserves `https://example.org/fhir/Questionnaire/previsit-intake|2.0.0` exactly. A Wallet that detects material disagreement between `questionnaireCanonical` and the inline `questionnaire` resource would report `unsupported` or `error` rather than silently merging definitions.

### 16.4 Mixed bundle: insurance + history + intake

This example shows one `application/fhir+json` Bundle fulfilling three request items: insurance, clinical history, and intake. The insurance item listed SHC first but also accepted raw FHIR JSON, so the Bundle's media type is accepted for every item in `fulfills[]`.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-mixed-checkin-001",
  "purpose": "Combined check-in package",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "content": {
        "kind": "selection.fhir",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": [
          "Coverage"
        ]
      },
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    },
    {
      "id": "clinical-history",
      "title": "Clinical history",
      "summary": "Share active problems and medications.",
      "content": {
        "kind": "selection.fhir",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "resourceTypes": [
          "Condition",
          "MedicationRequest"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    },
    {
      "id": "intake",
      "title": "Intake answers",
      "content": {
        "kind": "form.fhir",
        "questionnaireCanonical": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
        "questionnaire": {
          "resourceType": "Questionnaire",
          "id": "previsit-intake",
          "url": "https://example.org/fhir/Questionnaire/previsit-intake",
          "version": "2.0.0",
          "status": "active",
          "title": "Pre-visit intake",
          "item": [
            {
              "linkId": "reason",
              "text": "What is the main reason for today's visit?",
              "type": "text",
              "required": true
            },
            {
              "linkId": "symptoms",
              "text": "Do you have any new symptoms?",
              "type": "boolean"
            }
          ]
        }
      },
      "accept": [
        "application/fhir+json"
      ]
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
      "id": "artifact-mixed-bundle-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "insurance-card",
        "clinical-history",
        "intake"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-synthetic-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
                ]
              },
              "status": "active",
              "beneficiary": {
                "reference": "Patient/patient-synthetic-001"
              },
              "payor": [
                {
                  "display": "Synthetic Health Plan"
                }
              ]
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-asthma-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis|6.1.0"
                ]
              },
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "code": {
                "text": "Asthma"
              }
            }
          },
          {
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "qr-mixed-intake-001",
              "questionnaire": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
              "status": "completed",
              "item": [
                {
                  "linkId": "reason",
                  "answer": [
                    {
                      "valueString": "Medication refill"
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

Validation notes: one Artifact may fulfill several items, but every fulfillment edge must satisfy the target item's `accept[]`, selector, FHIR-version, and local validation rules. The QuestionnaireResponse again preserves the versioned Questionnaire canonical. The raw FHIR Bundle is patient-mediated unless its contents carry separate provenance or signature evidence.

### 16.5 Per-item declined / partial / error

This example shows that item status is separate from Artifact boundaries. The Wallet returns one medication Bundle but does not claim complete satisfaction, the Holder declines one item, and an operational failure affects another item.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-outcomes-001",
  "purpose": "Optional pre-visit review",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "current-medications",
      "title": "Current medications",
      "required": true,
      "content": {
        "kind": "selection.fhir",
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest|6.1.0"
        ],
        "resourceTypes": [
          "MedicationRequest"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    },
    {
      "id": "sensitive-history",
      "title": "Sensitive history",
      "summary": "Optional sensitive-category history.",
      "content": {
        "kind": "selection.fhir",
        "resourceTypes": [
          "Condition"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    },
    {
      "id": "recent-vitals",
      "title": "Recent vitals",
      "content": {
        "kind": "selection.fhir",
        "resourceTypes": [
          "Observation"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-outcomes-001",
  "artifacts": [
    {
      "id": "artifact-current-medications-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "current-medications"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medication-albuterol-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest|6.1.0"
                ]
              },
              "status": "active",
              "intent": "order",
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "medicationCodeableConcept": {
                "text": "albuterol inhaler"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "current-medications",
      "status": "partial",
      "message": "Shared one current medication; other available medication details were withheld by policy."
    },
    {
      "item": "sensitive-history",
      "status": "declined",
      "message": "The Holder chose not to share this item."
    },
    {
      "item": "recent-vitals",
      "status": "error",
      "message": "A data-source error prevented retrieval of recent observations."
    }
  ]
}
```

Validation notes: `requestStatus[]` covers `current-medications`, `sensitive-history`, and `recent-vitals` exactly once. `partial` has a fulfilling Artifact; `declined` and `error` do not. Status `message` values are concise and avoid secrets, stack traces, and unnecessary clinical details.

### 16.6 "No selectors" — full open-ended share

This example uses `content.kind = "selection.fhir"` with no `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. It is intentionally broad and should be used only when the Requester can safely consume broad patient-specific FHIR content and the Holder-facing text explains the breadth.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-share-001",
  "purpose": "Open-ended record sharing",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "open-ended-share",
      "title": "Share available health records",
      "summary": "This broad request has no profile, profile-family, or resource-type selector. The Wallet may offer any patient-specific FHIR resources it can safely share.",
      "content": {
        "kind": "selection.fhir"
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-open-share-001",
  "artifacts": [
    {
      "id": "artifact-open-ended-share-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "open-ended-share"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-synthetic-001",
              "name": [
                {
                  "family": "Rivera",
                  "given": [
                    "Alex"
                  ]
                }
              ]
            }
          },
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-synthetic-001",
              "status": "active",
              "beneficiary": {
                "reference": "Patient/patient-synthetic-001"
              }
            }
          },
          {
            "resource": {
              "resourceType": "AllergyIntolerance",
              "id": "allergy-peanut-001",
              "patient": {
                "reference": "Patient/patient-synthetic-001"
              },
              "code": {
                "text": "peanut"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "open-ended-share",
      "status": "fulfilled",
      "message": "Shared the Holder-approved open-ended set selected for this example."
    }
  ]
}
```

Validation notes: the Wallet may satisfy a no-selector item with any compatible patient-specific FHIR resources it can safely offer, but it is not required to disclose everything in other deployments. Here the Wallet marks the item `fulfilled` for the Holder-approved open-ended set selected for this example. The Artifact still needs `fhirVersion`, a FHIR Resource or Bundle in `value`, and media-type acceptance by the item.
