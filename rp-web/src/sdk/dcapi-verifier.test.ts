import { describe, expect, test } from "bun:test";
import {
  base64UrlDecodeBytes,
  hex,
  hpkeSealDirectMdoc,
  SMART_RESPONSE_ELEMENT_ID,
} from "../protocol/index.ts";
import {
  createKioskPortalUrl,
  createKioskSessionDescriptor,
  decodeKioskSessionFragment,
  encodeKioskSessionFragment,
} from "./kiosk-session.ts";
import {
  createBrowserLocalVerifierAuthority,
  credentialToDebugJson,
  prepareDcapiCredentialRequest,
  publicVerifierArtifacts,
  requestCredentialWithAuthority,
} from "./dcapi-verifier.ts";
import { type SmartCheckinRequest } from "./core.ts";

const PATIENT_REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "fixture-minimal-request",
  purpose: "Clinic check-in",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "patient",
      title: "Patient demographics",
      required: true,
      content: {
        kind: "fhir.resources",
        profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
      },
      accept: ["application/fhir+json"],
    },
  ],
};

describe("dcapi verifier SDK", () => {
  test("prepares a reusable request context and opens a wallet response", async () => {
    const context = await prepareDcapiCredentialRequest({
      request: PATIENT_REQUEST,
      origin: "https://clinic.example",
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
    });
    const plaintext = new Uint8Array(
      await Bun.file("../fixtures/responses/pymdoc-minimal/document.cbor").arrayBuffer(),
    );
    const sealed = await hpkeSealDirectMdoc({
      plaintext,
      recipientPublicJwk: context.bundle.verifierPublicJwk,
      info: context.sessionTranscript,
    });
    const opened = await context.openCredential(sealed.response);

    expect(context.navigatorArgument.digital.requests[0].data.deviceRequest).toBe(
      context.artifacts.deviceRequest.base64url,
    );
    expect(context.artifacts.responseElement).toBe(SMART_RESPONSE_ELEMENT_ID);
    expect(hex(opened.deviceResponseBytes)).toBe(hex(plaintext));
    expect(opened.smartResponseValidation?.ok).toBe(true);
  });

  test("uses an injected credential getter without exposing browser globals", async () => {
    const context = await prepareDcapiCredentialRequest({
      request: PATIENT_REQUEST,
      origin: "https://clinic.example",
      getCredential: async (options) => ({
        id: "test-credential",
        type: "digital",
        protocol: "org-iso-mdoc",
        data: { requestEcho: options },
      }),
    });
    const credential = await context.getCredential();

    expect(credentialToDebugJson(credential)).toEqual({
      id: "test-credential",
      type: "digital",
      protocol: "org-iso-mdoc",
      data: { requestEcho: context.navigatorArgument },
    });
  });

  test("runs through the verifier authority interface with browser-local crypto", async () => {
    const plaintext = new Uint8Array(
      await Bun.file("../fixtures/responses/pymdoc-minimal/document.cbor").arrayBuffer(),
    );
    const authority = createBrowserLocalVerifierAuthority({
      origin: "https://clinic.example",
      idFactory: () => "authority-test-request",
    });

    const result = await requestCredentialWithAuthority({
      authority,
      request: PATIENT_REQUEST,
      getCredential: async (_options, prepared) => {
        if (!prepared) throw new Error("prepared request missing");
        const sealed = await hpkeSealDirectMdoc({
          plaintext,
          recipientPublicJwk: prepared.publicArtifacts.recipientPublicJwk,
          info: base64UrlDecodeBytes(prepared.publicArtifacts.sessionTranscript.base64url),
        });
        return sealed.response;
      },
    });

    expect(result.preparedRequest.handle).toBe("authority-test-request");
    expect(result.preparedRequest.authorityKind).toBe("browser-local");
    expect("recipientPrivateJwk" in result.preparedRequest.publicArtifacts).toBe(false);
    expect(result.completion.privateDebugArtifacts?.recipientPrivateJwk).toBeDefined();
    expect(hex(result.completion.openedResponse.deviceResponseBytes)).toBe(hex(plaintext));
  });

  test("redacts private verifier key material from public artifacts", async () => {
    const context = await prepareDcapiCredentialRequest({
      request: PATIENT_REQUEST,
      origin: "https://clinic.example",
    });

    const publicArtifacts = publicVerifierArtifacts(context.artifacts);

    expect(publicArtifacts.recipientPublicJwk).toEqual(context.artifacts.recipientPublicJwk);
    expect("recipientPrivateJwk" in publicArtifacts).toBe(false);
  });
});

describe("kiosk session SDK", () => {
  test("round-trips a QR fragment without private verifier material", async () => {
    const context = await prepareDcapiCredentialRequest({
      request: PATIENT_REQUEST,
      origin: "https://clinic.example",
      nonce: new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
    });
    const descriptor = createKioskSessionDescriptor({
      sessionId: "session-123",
      requestBundle: context.bundle,
      returnTransport: {
        kind: "worker-relay",
        relayUrl: "https://shc-relay.example/session",
      },
      origin: "https://clinic.example",
      createdAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-01T00:05:00.000Z",
    });

    const fragment = encodeKioskSessionFragment(descriptor);
    const decoded = decodeKioskSessionFragment(fragment);
    const portalUrl = createKioskPortalUrl("https://example.org/checkin", descriptor);

    expect(decoded).toEqual(descriptor);
    expect(portalUrl).toContain("#shc=kiosk");
    expect(fragment).toContain("dr=");
    expect(fragment).toContain("ei=");
    expect(fragment).not.toContain("recipientPrivateJwk");
    expect(fragment).not.toContain("d=");
    expect(fragment).not.toContain("kid=");
  });
});
