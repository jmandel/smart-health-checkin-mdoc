## 16. Worked examples

This section shows representative SMART Health Check-in requests and responses. The examples are informative: they illustrate the request and response shapes from §§5-6 and the validation posture from §§7-8, but they do not require any particular clinical content, implementation guide, trust anchor, Wallet data source, or downstream ingestion policy.

Each request below can be carried by the same-device direct `org-iso-mdoc` flow in §8. An in-person QR code, NFC tap, or deep link can be used by a deployment to load the Holder's phone onto the Verifier page that runs §8, but that handoff is not a separate SMART Health Check-in wire protocol.

### 16.1 Insurance-card-only check-in (CARIN profile, SHC preferred)

**Scenario.** A pharmacy or clinic asks for a patient-mediated insurance card. The Requester can consume a SMART Health Card and prefers it because it carries signed clinical-source evidence, but it can also process raw FHIR JSON if no suitable SMART Health Card is available.

**Request.** The item asks for Coverage resources matching the CARIN-style insurance-card Coverage profile. The accepted media types are ordered by preference.

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
      "summary": "Coverage information for billing and pharmacy benefit verification.",
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

**Response.** The Wallet returns a SMART Health Card Artifact that fulfills the single item. The Artifact has no outer `fhirVersion`; FHIR-version and source-trust evidence are inside the signed SMART Health Card payloads.

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
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.eyJ2YyI6eyJ0eXBlIjpbIlNtYXJ0SGVhbHRoQ2FyZCJdfX0.MEYCIQDemoSignature"
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

**Validation notes.** The Verifier checks that `requestId` equals the original request `id`, that `artifact-insurance-shc.fulfills[]` contains only the known item id, that `application/smart-health-card` appears in that item's `accept[]`, and that `requestStatus[]` covers `insurance-card` exactly once. It then verifies each SMART Health Card JWS under SMART Health Cards and local trust policy and inspects the signed payload to decide whether it satisfies the CARIN Coverage selector. A raw FHIR fallback would use `mediaType: "application/fhir+json"`, include `fhirVersion`, and be treated as patient-mediated unless separately signed or provenanced.

### 16.2 US Core summary check-in

**Scenario.** A referral intake workflow asks for a small US Core clinical summary: patient demographics, current problems, and medications. The Requester can process raw FHIR R4 JSON.

**Request.** The selector combines a US Core profile family with exact US Core profiles. The exact profiles and the profile family are additive: a matching resource can satisfy either the exact `profiles[]` list or a profile in the `profilesFrom[]` family, and `resourceTypes[]` separately limits the returned resource types.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-us-core-001",
  "purpose": "Referral intake summary",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "us-core-summary",
      "title": "US Core summary",
      "summary": "Available demographics, conditions, and medications for referral intake.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ],
        "resourceTypes": ["Patient", "Condition", "MedicationRequest"]
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

**Response.** The Wallet returns a Bundle containing available matching resources but reports `partial` because it is not claiming a complete referral summary.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-us-core-001",
  "artifacts": [
    {
      "id": "artifact-us-core-summary",
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
      "status": "partial",
      "message": "Shared available Patient and Condition resources; no MedicationRequest was available."
    }
  ]
}
```

**Validation notes.** The Verifier evaluates the Bundle entries, not the outer Bundle alone, against the original selector. `profilesFrom[]` is an array, and family membership requires US Core implementation-guide or local policy knowledge; `meta.profile[]` is evidence, not an Artifact-level shortcut. The Verifier preserves any returned `meta.profile` strings exactly, including `|version` suffixes if present. Because the Artifact is raw FHIR JSON, the Verifier treats it as patient-mediated unless accepted provenance, signatures, or source attestations are present in the payload or deployment profile.

### 16.3 Inline questionnaire pre-visit intake

**Scenario.** A clinic wants the Holder to complete a short pre-visit intake form. The Requester includes the Questionnaire inline so the Wallet does not need network retrieval, while also giving a canonical identity with a version suffix for the returned `QuestionnaireResponse`.

**Request.** The Questionnaire selector is flattened: `canonical` and `resource` are direct members of `content`. There is no nested `questionnaire` member.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "intake-form",
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
              "linkId": "notes",
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

**Response.** The Wallet returns a FHIR `QuestionnaireResponse` as raw FHIR JSON and preserves the requested canonical string, including `|1.2.3`, in `QuestionnaireResponse.questionnaire`.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-intake-001",
  "artifacts": [
    {
      "id": "artifact-intake-response",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["intake-form"],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "id": "qr-migraine-example",
        "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        "status": "completed",
        "item": [
          {
            "linkId": "headache-today",
            "answer": [
              {
                "valueBoolean": true
              }
            ]
          },
          {
            "linkId": "notes",
            "answer": [
              {
                "valueString": "Symptoms started this morning."
              }
            ]
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "intake-form",
      "status": "fulfilled"
    }
  ]
}
```

**Validation notes.** A selector such as `{"kind":"questionnaire","questionnaire":"https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"}` is not a SMART Health Check-in 1.0 selector; it is a legacy nested shape and should be rejected or reported as `unsupported`. When both `canonical` and inline `resource` are supplied, the Wallet does not silently merge conflicting definitions or rewrite the canonical. If the canonical and inline Questionnaire materially disagree before answers are collected, `unsupported` is normally the better item status; an operational failure after rendering begins is normally `error`.

### 16.4 Mixed bundle: insurance + history + intake

**Scenario.** A same-device portal check-in asks for insurance information, a focused clinical history, and an intake QuestionnaireResponse in one interaction. The Holder approves all three items. The Wallet can package the approved raw FHIR content in one Bundle because all three items accept `application/fhir+json`.

**Request.** The request uses three item ids so consent and status remain item-level even though the response may use one Artifact.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-mixed-001",
  "purpose": "Clinic check-in",
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
      "accept": ["application/fhir+json"]
    },
    {
      "id": "history",
      "title": "Health history",
      "summary": "Available conditions and medications for today's visit.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": ["Condition", "MedicationRequest"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake-form",
      "title": "Visit intake questions",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/visit-intake|2025-01",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/visit-intake",
          "version": "2025-01",
          "status": "active",
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

**Response.** One raw FHIR Bundle Artifact fulfills all three items. The status array still has exactly one entry for each request item.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-mixed-001",
  "artifacts": [
    {
      "id": "artifact-checkin-bundle",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["insurance-card", "history", "intake-form"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
                ]
              },
              "status": "active"
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
                ]
              }
            }
          },
          {
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "visit-intake-response",
              "questionnaire": "https://clinic.example.org/fhir/Questionnaire/visit-intake|2025-01",
              "status": "completed",
              "item": [
                {
                  "linkId": "reason",
                  "answer": [
                    {
                      "valueString": "Follow-up appointment."
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
      "item": "history",
      "status": "partial",
      "message": "Shared available condition history; no matching medications were available."
    },
    {
      "item": "intake-form",
      "status": "fulfilled"
    }
  ]
}
```

**Validation notes.** Many-to-many fulfillment does not relax media-type or selector checks. The Verifier evaluates the same Artifact independently for each id in `fulfills[]`: `application/fhir+json` is accepted by every listed item, the Coverage entry supports `insurance-card`, the Condition entry supports `history`, and the QuestionnaireResponse supports `intake-form`. The `history` item can be `partial` even though the Artifact also fulfills other items. A Verifier does not infer that an item is fulfilled solely from an Artifact reference; the matching `requestStatus[]` entry is required.

### 16.5 Per-item declined / partial / error

**Scenario.** A pre-registration workflow asks for several items. The Holder shares demographics, allows only partial medication history, declines a sensitive-history item, and the Wallet encounters an operational error while trying to construct an intake QuestionnaireResponse.

**Request.** Each requested outcome has its own item id. `required: true` communicates workflow importance for demographics, but it is not consent and does not force disclosure.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-status-001",
  "purpose": "Pre-registration",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "demographics",
      "title": "Patient demographics",
      "required": true,
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
      "title": "Current medications",
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
      "title": "Additional sensitive history",
      "summary": "Optional information that may help the care team prepare.",
      "content": {
        "kind": "fhir.resources",
        "resourceTypes": ["Condition", "Observation"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake-form",
      "title": "Intake questionnaire",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/pre-registration|2.0.0"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

**Response.** The Wallet returns Artifacts only for items with shareable content. It still reports exactly one status for every request item.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-status-001",
  "artifacts": [
    {
      "id": "artifact-demographics",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["demographics"],
      "value": {
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
              "id": "medicationrequest-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
                ]
              },
              "status": "active",
              "intent": "order"
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "demographics",
      "status": "fulfilled"
    },
    {
      "item": "medications",
      "status": "partial",
      "message": "Shared medications the Holder approved for this visit."
    },
    {
      "item": "sensitive-history",
      "status": "declined",
      "message": "The Holder chose not to share this item."
    },
    {
      "item": "intake-form",
      "status": "error",
      "message": "The Wallet could not construct the questionnaire response."
    }
  ]
}
```

**Validation notes.** `declined`, `partial`, and `error` are normal item-level outcomes when a request is valid enough to answer. An item with `declined` or `error` normally has no fulfilling Artifact. A `partial` status should have returned content when the Wallet shares a subset, and that content must still pass media-type and selector checks. The `message` field is explanatory only; receivers use `status` for machine behavior and should not put secrets, stack traces, tokens, or unnecessary patient details in `message`.

### 16.6 “No selectors” — full open-ended share

**Scenario.** A records-reconciliation workflow can accept broad patient-specific FHIR content, but it cannot predict which profiles or resource types the Holder's Wallet has. The Requester uses the no-selector default intentionally and explains the breadth to the Holder.

**Request.** The `fhir.resources` selector omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`. This requests any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share, subject to `accept[]`, `fhirVersions[]`, Wallet policy, local policy, and Holder decision.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-ended-001",
  "purpose": "Records reconciliation before visit",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "open-ended-records",
      "title": "Share available health records",
      "summary": "You may choose which available patient-specific FHIR records to share for reconciliation. This request is broad and may include demographics, coverage, medications, allergies, conditions, immunizations, observations, or other available records.",
      "content": {
        "kind": "fhir.resources"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

**Response.** The Wallet shares a small subset and reports `partial` because the no-selector item does not imply that all available records were disclosed.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-open-ended-001",
  "artifacts": [
    {
      "id": "artifact-open-ended-subset",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["open-ended-records"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-example"
            }
          },
          {
            "resource": {
              "resourceType": "AllergyIntolerance",
              "id": "allergy-example",
              "clinicalStatus": {
                "coding": [
                  {
                    "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    "code": "active"
                  }
                ]
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "open-ended-records",
      "status": "partial",
      "message": "Shared the subset selected by the Holder."
    }
  ]
}
```

**Validation notes.** The no-selector default is intentionally broad; it is not a command to export a complete patient record and not a guarantee of comprehensiveness. Wallets should make broad requests understandable to the Holder and should avoid returning unrelated or unapproved content merely because it is available. Verifiers should validate the raw FHIR wrapper, `fhirVersion`, Bundle contents, `fulfills[]`, and status coverage, then apply local policy for provenance, patient matching, deduplication, and ingestion. Raw FHIR JSON remains patient-mediated unless the payload or deployment profile supplies separate accepted provenance or signature evidence.
