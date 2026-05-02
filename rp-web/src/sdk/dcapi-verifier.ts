import {
  base64UrlEncodeBytes,
  buildDcapiSessionTranscript,
  buildOrgIsoMdocRequest,
  hex,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  openWalletResponse,
  PROTOCOL_ID,
  SMART_REQUEST_INFO_KEY,
  SMART_RESPONSE_ELEMENT_ID,
  type DcapiMdocResponse,
  type OpenWalletResponseResult,
  type OrgIsoMdocNavigatorArgument,
  type OrgIsoMdocRequestBundle,
  type ReaderIdentity,
} from "../protocol/index.ts";
import {
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
} from "./core.ts";

export type CredentialGetter = (
  options: CredentialRequestOptions,
  preparedRequest?: VerifierPreparedCredentialRequest,
) => Promise<unknown>;

export type DcApiSupport =
  | { state: "checking" }
  | { state: "supported" }
  | { state: "unsupported"; reason: string };

export type DcapiVerifierOptions = {
  origin: string;
  getCredential?: CredentialGetter;
  readerIdentity?: ReaderIdentity;
};

export type PrepareCredentialRequestOptions = DcapiVerifierOptions & {
  request: SmartCheckinRequest;
  nonce?: Uint8Array;
  verifierKeyPair?: CryptoKeyPair;
  readerAuth?: boolean;
};

export type DcapiVerifierArtifacts = {
  origin: string;
  protocol: typeof PROTOCOL_ID;
  docType: typeof MDOC_DOC_TYPE;
  namespace: typeof MDOC_NAMESPACE;
  responseElement: typeof SMART_RESPONSE_ELEMENT_ID;
  navigatorArgument: OrgIsoMdocNavigatorArgument;
  recipientPublicJwk: JsonWebKey;
  recipientPrivateJwk: JsonWebKey;
  deviceRequest: { base64url: string; hex: string };
  encryptionInfo: { base64url: string; hex: string };
  sessionTranscript: { base64url: string; hex: string };
  readerAuth?: {
    hex: string;
    readerPublicJwk?: JsonWebKey;
    readerCertificateDer?: { base64url: string; hex: string };
    note: string;
  };
  note: string;
};

export type DcapiVerifierPublicArtifacts = Omit<DcapiVerifierArtifacts, "recipientPrivateJwk" | "note"> & {
  note: string;
};

export type DcapiCredentialRequestContext = {
  request: SmartCheckinRequest;
  bundle: OrgIsoMdocRequestBundle;
  origin: string;
  navigatorArgument: OrgIsoMdocNavigatorArgument;
  sessionTranscript: Uint8Array;
  recipientPrivateJwk: JsonWebKey;
  artifacts: DcapiVerifierArtifacts;
  getCredential: () => Promise<unknown>;
  openCredential: (credential: unknown) => Promise<OpenWalletResponseResult>;
};

export type VerifierAuthorityKind = "browser-local" | "server-owned" | (string & {});

export type VerifierPreparedCredentialRequest = {
  handle: string;
  authorityKind: VerifierAuthorityKind;
  request: SmartCheckinRequest;
  navigatorArgument: OrgIsoMdocNavigatorArgument;
  publicArtifacts: DcapiVerifierPublicArtifacts;
};

export type VerifierCredentialCompletion = {
  handle: string;
  authorityKind: VerifierAuthorityKind;
  credentialDebugJson: unknown;
  openedResponse: OpenWalletResponseResult;
  privateDebugArtifacts?: DcapiVerifierArtifacts;
};

export type VerifierAuthorityPrepareInput = {
  request: SmartCheckinRequest;
};

export type VerifierAuthorityCompleteInput = {
  handle: string;
  credential: unknown;
};

export interface VerifierAuthority {
  readonly kind: VerifierAuthorityKind;
  prepareCredentialRequest(input: VerifierAuthorityPrepareInput): Promise<VerifierPreparedCredentialRequest>;
  completeCredentialRequest(input: VerifierAuthorityCompleteInput): Promise<VerifierCredentialCompletion>;
}

export type BrowserLocalVerifierAuthorityOptions = DcapiVerifierOptions & {
  idFactory?: () => string;
  retainCompletedRequests?: boolean;
};

export type CredentialFlowCallbacks = {
  onPrepared?: (prepared: VerifierPreparedCredentialRequest) => void;
  onCredential?: (credential: unknown, prepared: VerifierPreparedCredentialRequest) => void;
  onComplete?: (completion: VerifierCredentialCompletion, prepared: VerifierPreparedCredentialRequest) => void;
};

export type RequestCredentialWithAuthorityOptions = CredentialFlowCallbacks & {
  authority: VerifierAuthority;
  request: SmartCheckinRequest;
  getCredential?: CredentialGetter;
};

export type RequestCredentialWithAuthorityResult = {
  preparedRequest: VerifierPreparedCredentialRequest;
  credential: unknown;
  credentialDebugJson: unknown;
  completion: VerifierCredentialCompletion;
};

export function createDcapiVerifier(options: DcapiVerifierOptions) {
  const authority = createBrowserLocalVerifierAuthority(options);
  return {
    authority,
    prepareCredentialRequest: (request: SmartCheckinRequest) =>
      prepareDcapiCredentialRequest({ ...options, request }),
    requestCredential: (request: SmartCheckinRequest) =>
      requestCredentialWithAuthority({
        authority,
        request,
        getCredential: options.getCredential,
      }),
  };
}

export function createBrowserLocalVerifierAuthority(
  options: BrowserLocalVerifierAuthorityOptions,
): VerifierAuthority {
  const contexts = new Map<string, DcapiCredentialRequestContext>();
  const idFactory = options.idFactory ?? defaultRequestHandle;
  return {
    kind: "browser-local",
    async prepareCredentialRequest(input) {
      const context = await prepareDcapiCredentialRequest({
        ...options,
        request: input.request,
      });
      const handle = idFactory();
      contexts.set(handle, context);
      return {
        handle,
        authorityKind: "browser-local",
        request: context.request,
        navigatorArgument: context.navigatorArgument,
        publicArtifacts: publicVerifierArtifacts(context.artifacts),
      };
    },
    async completeCredentialRequest(input) {
      const context = contexts.get(input.handle);
      if (!context) {
        throw new Error(`unknown verifier request handle: ${input.handle}`);
      }
      const credentialDebugJson = credentialToDebugJson(input.credential);
      const openedResponse = await context.openCredential(input.credential);
      if (!options.retainCompletedRequests) contexts.delete(input.handle);
      return {
        handle: input.handle,
        authorityKind: "browser-local",
        credentialDebugJson,
        openedResponse,
        privateDebugArtifacts: context.artifacts,
      };
    },
  };
}

export async function requestCredentialWithAuthority(
  options: RequestCredentialWithAuthorityOptions,
): Promise<RequestCredentialWithAuthorityResult> {
  const preparedRequest = await options.authority.prepareCredentialRequest({
    request: options.request,
  });
  options.onPrepared?.(preparedRequest);

  const getter = options.getCredential ?? defaultCredentialGetter();
  const credential = await getter(
    preparedRequest.navigatorArgument as unknown as CredentialRequestOptions,
    preparedRequest,
  );
  options.onCredential?.(credential, preparedRequest);

  const completion = await options.authority.completeCredentialRequest({
    handle: preparedRequest.handle,
    credential,
  });
  options.onComplete?.(completion, preparedRequest);

  return {
    preparedRequest,
    credential,
    credentialDebugJson: completion.credentialDebugJson,
    completion,
  };
}

export async function prepareDcapiCredentialRequest(
  options: PrepareCredentialRequestOptions,
): Promise<DcapiCredentialRequestContext> {
  const validated = validateSmartCheckinRequest(options.request);
  if (!validated.ok) {
    throw new Error(`SMART Check-in request is invalid: ${validated.error}`);
  }

  const bundle = await buildOrgIsoMdocRequest(validated.value, {
    origin: options.origin,
    nonce: options.nonce,
    verifierKeyPair: options.verifierKeyPair,
    readerAuth: options.readerAuth,
    readerIdentity: options.readerIdentity,
  });
  const recipientPrivateJwk = await crypto.subtle.exportKey(
    "jwk",
    bundle.verifierKeyPair.privateKey,
  );
  const sessionTranscript =
    bundle.sessionTranscriptBytes ??
    await buildDcapiSessionTranscript({
      origin: options.origin,
      encryptionInfo: bundle.encryptionInfoBytes,
    });
  const artifacts = buildDcapiVerifierArtifacts({
    bundle,
    origin: options.origin,
    recipientPrivateJwk,
    sessionTranscript,
  });

  const getCredential = async () => {
    const getter = options.getCredential ?? defaultCredentialGetter();
    return getter(bundle.navigatorArgument as unknown as CredentialRequestOptions);
  };

  const openCredential = (credential: unknown) => {
    if (credential === null || credential === undefined) {
      throw new Error("navigator.credentials.get returned no credential");
    }
    return openWalletResponse({
      response: credential as DcapiMdocResponse,
      recipientPrivateKey: bundle.verifierKeyPair.privateKey,
      recipientPublicJwk: bundle.verifierPublicJwk,
      sessionTranscript,
      smartRequest: validated.value,
    });
  };

  return {
    request: validated.value,
    bundle,
    origin: options.origin,
    navigatorArgument: bundle.navigatorArgument,
    sessionTranscript,
    recipientPrivateJwk,
    artifacts,
    getCredential,
    openCredential,
  };
}

export function buildDcapiVerifierArtifacts(input: {
  bundle: OrgIsoMdocRequestBundle;
  origin: string;
  recipientPrivateJwk: JsonWebKey;
  sessionTranscript: Uint8Array;
}): DcapiVerifierArtifacts {
  const bundle = input.bundle;
  return {
    origin: input.origin,
    protocol: PROTOCOL_ID,
    docType: MDOC_DOC_TYPE,
    namespace: MDOC_NAMESPACE,
    responseElement: SMART_RESPONSE_ELEMENT_ID,
    navigatorArgument: bundle.navigatorArgument,
    recipientPublicJwk: bundle.verifierPublicJwk,
    recipientPrivateJwk: input.recipientPrivateJwk,
    deviceRequest: {
      base64url: base64UrlEncodeBytes(bundle.deviceRequestBytes),
      hex: hex(bundle.deviceRequestBytes),
    },
    encryptionInfo: {
      base64url: base64UrlEncodeBytes(bundle.encryptionInfoBytes),
      hex: hex(bundle.encryptionInfoBytes),
    },
    sessionTranscript: {
      base64url: base64UrlEncodeBytes(input.sessionTranscript),
      hex: hex(input.sessionTranscript),
    },
    readerAuth: bundle.readerAuthBytes
      ? {
          hex: hex(bundle.readerAuthBytes),
          readerPublicJwk: bundle.readerPublicJwk,
          readerCertificateDer: bundle.readerCertificateDer
            ? {
                base64url: base64UrlEncodeBytes(bundle.readerCertificateDer),
                hex: hex(bundle.readerCertificateDer),
              }
            : undefined,
          note: "Per-request demo readerAuth. The key is ephemeral until stable reader identity is implemented.",
        }
      : undefined,
    note: "Local debug artifact. The private JWK is intentionally logged for offline HPKE debugging.",
  };
}

export function publicVerifierArtifacts(
  artifacts: DcapiVerifierArtifacts,
): DcapiVerifierPublicArtifacts {
  const { recipientPrivateJwk: _privateKey, ...publicArtifacts } = artifacts;
  return {
    ...publicArtifacts,
    note: "Public verifier artifacts. Private verifier key material is retained by the verifier authority.",
  };
}

export function credentialToDebugJson(credential: unknown): unknown {
  if (!credential || typeof credential !== "object") return credential;
  const c = credential as {
    id?: unknown;
    type?: unknown;
    protocol?: unknown;
    data?: unknown;
  };
  return {
    id: c.id,
    type: c.type,
    protocol: c.protocol,
    data: c.data,
  };
}

export function detectDcApiSupport(): DcApiSupport {
  if (typeof navigator === "undefined") {
    return { state: "unsupported", reason: "no navigator (SSR?)" };
  }
  const cc = (navigator as Navigator & { credentials?: unknown }).credentials;
  if (!cc || typeof (cc as { get?: unknown }).get !== "function") {
    return {
      state: "unsupported",
      reason: "navigator.credentials.get is not available",
    };
  }
  const w = globalThis as unknown as {
    DigitalCredential?: unknown;
    IdentityCredential?: unknown;
  };
  if (!w.DigitalCredential && !w.IdentityCredential) {
    return {
      state: "unsupported",
      reason: "no DigitalCredential / IdentityCredential global (need Chrome 141+ or Safari 26+)",
    };
  }
  return { state: "supported" };
}

export function defaultCredentialGetter(): CredentialGetter {
  const get = globalThis.navigator?.credentials?.get?.bind(globalThis.navigator.credentials);
  if (!get) {
    throw new Error("navigator.credentials.get is not available");
  }
  return get as CredentialGetter;
}

function defaultRequestHandle(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
