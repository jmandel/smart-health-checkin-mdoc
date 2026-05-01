#!/usr/bin/env bun
/**
 * SMART Health Card sample verifier.
 *
 * For each sample under `fixtures/sample-shc/samples/`, this script:
 *   1. Reads `credential.jws` (a single-line compact JWS, deflate-compressed payload).
 *   2. Looks up the issuer from `iss` and finds the JWK matching `kid` in
 *      the corresponding `issuers/<slug>/jwks.json`.
 *   3. Verifies the ES256 signature over `<protected>.<payload>` (raw, no inflate yet).
 *   4. Inflates the payload with `Bun.inflateSync` (RFC 1951 raw deflate) and
 *      JSON-parses it.
 *   5. Sanity-checks that `vc.credentialSubject.fhirBundle` is a Bundle.
 *   6. Cross-checks that `decoded-payload.json` matches the inflated payload
 *      (deep-equal) so the on-disk decoded copy is trustworthy.
 *
 * Usage:
 *   bun run fixtures/sample-shc/verify.ts
 *
 * Exit code is non-zero if any sample fails to verify.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(HERE, "samples");
const ISSUERS_DIR = join(HERE, "issuers");
const MANIFEST_PATH = join(HERE, "manifest.json");

interface Jwk {
  kty: string;
  kid: string;
  alg?: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
  use?: string;
  x5c?: string[];
  [k: string]: unknown;
}

interface Manifest {
  generated: string;
  samples: Array<{
    slug: string;
    issuer: string;
    iss: string;
    kid: string;
    alg: string;
    summary: string;
    payloadBytes: number;
    verified: boolean;
    error?: string;
  }>;
}

function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToString(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

function parseHeader(jws: string): { header: any; protectedB64: string; payloadB64: string; sigB64: string } {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error(`Expected 3 JWS segments, got ${parts.length}`);
  const [h, p, s] = parts;
  const header = JSON.parse(bytesToString(b64uToBytes(h)));
  return { header, protectedB64: h, payloadB64: p, sigB64: s };
}

async function importJwkPublic(jwk: Jwk): Promise<CryptoKey> {
  const { d: _d, ...pub } = jwk; // strip private key material defensively
  return crypto.subtle.importKey(
    "jwk",
    pub as JsonWebKey,
    { name: "ECDSA", namedCurve: jwk.crv ?? "P-256" },
    false,
    ["verify"]
  );
}

async function verifyJws(jws: string, jwk: Jwk): Promise<boolean> {
  const { protectedB64, payloadB64, sigB64 } = parseHeader(jws);
  const key = await importJwkPublic(jwk);
  const sig = b64uToBytes(sigB64);
  const data = new TextEncoder().encode(`${protectedB64}.${payloadB64}`);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    sig,
    data
  );
}

function inflatePayload(payloadB64: string): any {
  const compressed = b64uToBytes(payloadB64);
  // SHC uses zip:"DEF" => raw DEFLATE (no zlib header).
  const inflated = inflateRawSync(compressed);
  return JSON.parse(inflated.toString("utf-8"));
}

function listDirs(p: string): string[] {
  return readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory());
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

function findIssuerSlug(iss: string): string | null {
  for (const slug of listDirs(ISSUERS_DIR)) {
    const urlPath = join(ISSUERS_DIR, slug, "url.txt");
    try {
      const url = readFileSync(urlPath, "utf-8").trim();
      if (url === iss) return slug;
    } catch { /* ignore */ }
  }
  return null;
}

function loadJwks(slug: string): { keys: Jwk[] } {
  return JSON.parse(readFileSync(join(ISSUERS_DIR, slug, "jwks.json"), "utf-8"));
}

function summarise(payload: any): string {
  const fb = payload?.vc?.credentialSubject?.fhirBundle;
  if (!fb || !Array.isArray(fb.entry)) return "no fhirBundle";
  const counts: Record<string, number> = {};
  for (const e of fb.entry) {
    const rt = e?.resource?.resourceType ?? "?";
    counts[rt] = (counts[rt] ?? 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `${v}×${k}`).join(", ");
}

async function main() {
  const sampleSlugs = listDirs(SAMPLES_DIR).sort();
  const manifest: Manifest = { generated: new Date().toISOString(), samples: [] };
  let failures = 0;

  for (const slug of sampleSlugs) {
    const dir = join(SAMPLES_DIR, slug);
    const jws = readFileSync(join(dir, "credential.jws"), "utf-8").trim();
    let issuerSlug = "(unknown)", iss = "", kid = "", alg = "", summary = "";
    let verified = false;
    let payload: any = null;
    let err: string | undefined;
    try {
      const { header } = parseHeader(jws);
      kid = header.kid;
      alg = header.alg;
      payload = inflatePayload(jws.split(".")[1]);
      iss = payload.iss;
      const found = findIssuerSlug(iss);
      if (!found) throw new Error(`No issuer dir matches iss=${iss}`);
      issuerSlug = found;
      const jwks = loadJwks(issuerSlug);
      const jwk = jwks.keys.find((k) => k.kid === kid);
      if (!jwk) throw new Error(`kid ${kid} not in issuer ${issuerSlug}'s JWKS`);
      const sigOk = await verifyJws(jws, jwk);
      if (!sigOk) throw new Error("ES256 signature did not verify");

      // FHIR bundle structural sanity.
      const fb = payload?.vc?.credentialSubject?.fhirBundle;
      if (!fb || fb.resourceType !== "Bundle" || !Array.isArray(fb.entry)) {
        throw new Error("payload missing fhirBundle Bundle");
      }

      // Confirm the on-disk decoded-payload.json matches what we inflated.
      const onDisk = JSON.parse(readFileSync(join(dir, "decoded-payload.json"), "utf-8"));
      if (!deepEqual(onDisk, payload)) {
        throw new Error("decoded-payload.json does not match inflated JWS payload");
      }

      summary = summarise(payload);
      verified = true;
    } catch (e: any) {
      err = e?.message ?? String(e);
      failures++;
    }
    manifest.samples.push({
      slug,
      issuer: issuerSlug,
      iss,
      kid,
      alg,
      summary,
      payloadBytes: payload ? JSON.stringify(payload).length : 0,
      verified,
      ...(err ? { error: err } : {}),
    });
    const tag = verified ? "OK " : "FAIL";
    console.log(`[${tag}] ${slug} (issuer=${issuerSlug}, kid=${kid || "?"}) ${verified ? "- " + summary : "- " + err}`);
  }

  await Bun.write(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nWrote ${MANIFEST_PATH}`);
  console.log(`${manifest.samples.length - failures}/${manifest.samples.length} samples verified.`);
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
