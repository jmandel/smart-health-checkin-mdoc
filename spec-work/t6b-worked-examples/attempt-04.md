## 16. Worked examples

This section is informative. The examples illustrate the SMART request and SMART response model from §§5-6 and the trust separation described in §7. When these examples are carried by the version-1 same-device presentation flow, the SMART request is the JSON text at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, and the SMART response is the JSON text disclosed as `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. A QR code, NFC tap, deep link, kiosk, staff screen, or launch page can be useful deployment UX for reaching that same-device Verifier page, but it is not a separate SMART Health Check-in wire protocol.

All Artifact examples use the two version-1 core media types only:

- `application/smart-health-card`, with `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`; and
- `application/fhir+json`, with `value` containing a FHIR Resource or Bundle and an outer Artifact-level `fhirVersion`.

The examples use synthetic identifiers and clinical content. SMART Health Card strings are illustrative and are not valid production credentials.

### 16.1 Insurance-card-only check-in (CARIN profile, SHC preferred)

A clinic or payer-facing check-in workflow can request a CARIN Digital Insurance Card Coverage resource and prefer a SMART Health Card response while still accepting raw FHIR JSON.

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
      "summary": "Coverage information for this check-in.",
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

One valid response is a SMART Health Card Artifact:

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
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.eyJ2YyI6eyJ0eXBlIjpbIkhlYWx0aENhcmQiXX19.c2lnbmF0dXJl"
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

- The request item uses the FHIR profile canonical in `profiles[]` and official FHIR resource type `Coverage`; it does not use a local topic such as `"insurance"`.
- The `accept[]` order expresses preference. The Wallet can return `application/smart-health-card` here because that media type is listed for `insurance-card`.
- The SMART Health Card Artifact has no outer `fhirVersion`; FHIR version and clinical-source evidence are inside the signed SMART Health Card payload and still need receiver validation.
- The single `requestStatus[]` entry covers the single request item exactly once, and the Artifact `fulfills[]` references the same item id.

### 16.2 US Core summary check-in

A referral or new-patient workflow can request a US Core family summary as raw FHIR JSON. This example combines an implementation-guide family selector with exact profile selectors. The exact profiles and the profile family are additive; the exact profiles do not narrow the family.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-us-core-001",
  "purpose": "Clinical summary for check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "us-core-summary",
      "title": "Clinical summary",
      "summary": "Available US Core demographics, conditions, medications, and allergies.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
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

A Wallet that has responsive FHIR R4 content can return a collection Bundle:

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
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0"
                ]
              },
              "name": [{ "family": "Shaw", "given": ["Jordan"] }]
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
              "code": { "text": "Example condition" },
              "subject": { "reference": "Patient/patient-example" }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    { "item": "us-core-summary", "status": "fulfilled" }
  ]
}
```

Validation notes:

- `profilesFrom[]` is an array of canonical profile-family URLs. It is not a package id, package version, registry alias, object, or singleton string.
- The versioned Patient profile string is preserved exactly in the returned `meta.profile[]`; routing or matching does not rewrite the response value.
- `resourceTypes[]` constrains the additive profile-selected set to the listed FHIR resource types.
- Because the Artifact is raw FHIR JSON, `fhirVersion` is present and applies to the Bundle and every `Bundle.entry[].resource` in this Artifact.
- The raw FHIR JSON is patient-mediated unless the payload or deployment policy supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof.

### 16.3 Inline questionnaire pre-visit intake

A pre-visit intake can include the Questionnaire body inline so the Wallet can render it without network retrieval. The selector is flat: `content.kind` is `"questionnaire"`, and `canonical` and `resource` are direct members of `content`.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "migraine-intake",
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
              "linkId": "medication-taken",
              "text": "Have you taken medication for it today?",
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

A completed response can be a single `QuestionnaireResponse` resource:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-intake-001",
  "artifacts": [
    {
      "id": "artifact-migraine-intake",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["migraine-intake"],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "status": "completed",
        "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        "item": [
          {
            "linkId": "headache-today",
            "answer": [{ "valueBoolean": true }]
          },
          {
            "linkId": "medication-taken",
            "answer": [{ "valueBoolean": false }]
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

- The `QuestionnaireResponse.questionnaire` value preserves the requested canonical string exactly, including `|1.2.3`.
- If the Wallet resolves the versioned canonical, resolution uses the parsed `(url, version)` pair and verifies the resolved Questionnaire; direct dereference of a versioned canonical is not shown here.
- If the supplied `canonical`, `resource.url`, `resource.version`, or item structure materially disagrees, a Wallet can report the item as `unsupported` before collecting answers.
- These legacy nested selector forms are invalid non-examples for version 1.0: `{"kind":"questionnaire","questionnaire":"..."}`, `{"kind":"questionnaire","questionnaire":{"resourceType":"Questionnaire"}}`, and `{"kind":"questionnaire","questionnaire":{"canonical":"...","resource":{}}}`.

### 16.4 Mixed bundle: insurance + history + intake

A check-in workflow can request separate user-review items for insurance, history, and intake while allowing one raw FHIR Bundle to fulfill all three. This is valid only because every listed item accepts `application/fhir+json` and the Bundle content is responsive to each item.

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
      "summary": "Available US Core conditions and medications.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": ["Condition", "MedicationRequest"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Today's intake questions",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://clinic.example.org/fhir/Questionnaire/checkin-intake|2025-01",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/checkin-intake",
          "version": "2025-01",
          "status": "active",
          "item": [
            {
              "linkId": "concern",
              "text": "What is your main concern today?",
              "type": "string"
            }
          ]
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

One response can package the returned Coverage, Condition, and QuestionnaireResponse resources together:

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
      "fulfills": ["insurance-card", "clinical-history", "intake"],
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
              "status": "active",
              "beneficiary": { "reference": "Patient/patient-example" },
              "payor": [{ "display": "Example Health Plan" }]
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
              "code": { "text": "Example condition" },
              "subject": { "reference": "Patient/patient-example" }
            }
          },
          {
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "intake-response-example",
              "status": "completed",
              "questionnaire": "https://clinic.example.org/fhir/Questionnaire/checkin-intake|2025-01",
              "item": [
                {
                  "linkId": "concern",
                  "answer": [{ "valueString": "Follow-up visit" }]
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
    { "item": "clinical-history", "status": "fulfilled" },
    { "item": "intake", "status": "fulfilled" }
  ]
}
```

Validation notes:

- One Artifact can fulfill many items, but its `mediaType` must be listed in every item named in `fulfills[]`.
- The Bundle is evaluated by inspecting `Bundle.entry[].resource`; the outer Bundle itself does not satisfy a request for `Coverage`, `Condition`, or `QuestionnaireResponse`.
- The response still has exactly one status entry for each request item, even though there is only one Artifact.
- The raw FHIR Bundle remains patient-mediated unless separate clinical-source proof is present and accepted.

### 16.5 Per-item declined / partial / error

Item-level outcomes let a Wallet answer a valid request without forcing an all-or-nothing exchange. The following response shows Holder refusal, partial disclosure, and an operational error in one response.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-outcomes-001",
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
      "id": "clinical-history",
      "title": "Clinical history",
      "summary": "Available US Core conditions, medications, and allergies.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "resourceTypes": ["Condition", "MedicationRequest", "AllergyIntolerance"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
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
      "fulfills": ["clinical-history"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-example",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"
                ]
              },
              "code": { "text": "Example condition" },
              "subject": { "reference": "Patient/patient-example" }
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
      "message": "The holder chose not to share this item."
    },
    {
      "item": "clinical-history",
      "status": "partial",
      "message": "Shared selected matching resources."
    },
    {
      "item": "intake",
      "status": "error",
      "message": "The questionnaire could not be completed."
    }
  ]
}
```

Validation notes:

- `requestStatus[]` covers `insurance-card`, `clinical-history`, and `intake` exactly once.
- The `partial` item has a supporting Artifact whose `fulfills[]` references `clinical-history`.
- The `declined` and `error` items do not need empty placeholder Artifacts.
- `message` values are concise and avoid secrets, stack traces, source-system names, sensitive patient details, and Holder reasoning.
- If the Wallet could not support the `intake` selector or exact canonical version before attempting it, `unsupported` would usually be a better status than `error`.

### 16.6 "No selectors" — full open-ended share

A `fhir.resources` selector with no `profiles[]`, no `profilesFrom[]`, and no `resourceTypes[]` requests any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share, subject to the item `accept[]`, `fhirVersions[]`, Wallet capability, local policy, and Holder decision. This is intentionally broad and should be explained clearly to the Holder.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-ended-001",
  "purpose": "Open-ended record share for check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "open-ended-records",
      "title": "Share available records",
      "summary": "Share any patient-specific FHIR records you choose to provide for this check-in. This may include more than one category of information.",
      "content": {
        "kind": "fhir.resources"
      },
      "accept": ["application/fhir+json", "application/smart-health-card"]
    }
  ]
}
```

A privacy-preserving Wallet can return only selected resources and mark the item `partial` rather than claiming a complete export:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-open-ended-001",
  "artifacts": [
    {
      "id": "artifact-selected-records",
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
              "id": "patient-example",
              "name": [{ "family": "Shaw", "given": ["Jordan"] }]
            }
          },
          {
            "resource": {
              "resourceType": "Observation",
              "id": "observation-example",
              "status": "final",
              "code": { "text": "Example observation" },
              "subject": { "reference": "Patient/patient-example" }
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
      "message": "Shared selected records chosen for this check-in."
    }
  ]
}
```

Validation notes:

- The no-selector request is not a command to export every record, an IPS shortcut, an `all of the above` profile, a SMART App Launch scope, or a FHIR `$everything` operation.
- A Wallet can satisfy the item with any accepted core Artifact media type. If it chooses raw FHIR JSON, the Artifact includes `fhirVersion`; if it chooses a SMART Health Card, the wrapper has `value.verifiableCredential[]` and no outer `fhirVersion`.
- `partial` is often the accurate status when the Holder or Wallet shares selected resources from a broad request.
- Receivers should not infer undisclosed diagnoses, medications, coverage status, or Holder intent from resources that are absent or from the `partial` status.
