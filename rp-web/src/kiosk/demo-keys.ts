import type { KioskCryptoConfig } from "./kiosk-provider.ts";

/*
 * DEMO ONLY KEY MATERIAL.
 *
 * These keys are intentionally checked in so the static kiosk demo can show the
 * protocol shape without a server. They are not secrets and must never be used
 * for production traffic.
 */

export const DEMO_CREATOR_KEY_ID = "demo-creator-es256-2026-05";
export const DEMO_SUBMISSION_SERVICE_KEY_ID = "demo-submission-service-ecdh-2026-05";

export const DEMO_CREATOR_SIGNING_PUBLIC_JWK: JsonWebKey = {
  key_ops: ["verify"],
  ext: true,
  kty: "EC",
  x: "j0kNfLLcVCEPKLgjt6orgBnqdRQzPS152GAL5sZ129k",
  y: "QRod_PPrJgmUdsdii_EHhwZHJTMurL72TDGbSjKL-RM",
  crv: "P-256",
};

export const DEMO_CREATOR_SIGNING_PRIVATE_JWK: JsonWebKey = {
  key_ops: ["sign"],
  ext: true,
  kty: "EC",
  x: "j0kNfLLcVCEPKLgjt6orgBnqdRQzPS152GAL5sZ129k",
  y: "QRod_PPrJgmUdsdii_EHhwZHJTMurL72TDGbSjKL-RM",
  crv: "P-256",
  d: "QLpHFJr6iSNytSrK1oWNbegQtOPNmGcwwa9PIFA5vnU",
};

export const DEMO_SUBMISSION_SERVICE_PUBLIC_JWK: JsonWebKey = {
  key_ops: [],
  ext: true,
  kty: "EC",
  x: "YLuPcqFOOjcCQbGJjNlsefh5WcYvKgSa8APP5ma-R2g",
  y: "vevfXcV4ClT5e7qlg4B6YLCQoPBlztf--B37hpSAJKs",
  crv: "P-256",
};

export const DEMO_SUBMISSION_SERVICE_PRIVATE_JWK: JsonWebKey = {
  key_ops: ["deriveBits"],
  ext: true,
  kty: "EC",
  x: "YLuPcqFOOjcCQbGJjNlsefh5WcYvKgSa8APP5ma-R2g",
  y: "vevfXcV4ClT5e7qlg4B6YLCQoPBlztf--B37hpSAJKs",
  crv: "P-256",
  d: "oBqOtEHcDa4jLXr8w_CCoqAJ5Mw1YpLOj8wo4YhLAXY",
};

export const TRUSTED_DEMO_CREATOR_PUBLIC_KEYS: Record<string, JsonWebKey> = {
  [DEMO_CREATOR_KEY_ID]: DEMO_CREATOR_SIGNING_PUBLIC_JWK,
};

export const DEMO_KIOSK_CRYPTO_CONFIG = {
  creatorKeyId: DEMO_CREATOR_KEY_ID,
  creatorPrivateJwk: DEMO_CREATOR_SIGNING_PRIVATE_JWK,
  submissionServiceKeyId: DEMO_SUBMISSION_SERVICE_KEY_ID,
  submissionServicePublicJwk: DEMO_SUBMISSION_SERVICE_PUBLIC_JWK,
  submissionServicePrivateJwk: DEMO_SUBMISSION_SERVICE_PRIVATE_JWK,
  trustedCreatorPublicKeys: TRUSTED_DEMO_CREATOR_PUBLIC_KEYS,
} satisfies KioskCryptoConfig;
