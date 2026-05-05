// Invariant tests for the web-wallet shim.
//
// These guard the architectural promises:
//   1. The SDK barrel `src/sdk/index.ts` exports the same set of names it
//      did before the shim was added (no contamination).
//   2. No file under `src/sdk/` imports from `sdk-web-wallet/`.
//   3. `src/sdk/index.ts` does not mention `sdk-web-wallet/` at all.
//   4. `react.tsx` does not import from `sdk-web-wallet/`.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as sdkBarrel from "../sdk/index.ts";

const ROOT = new URL("..", import.meta.url).pathname; // .../rp-web/src/

const EXPECTED_SDK_BARREL_NAMES: ReadonlyArray<string> = [
  // From sdk/core.ts
  "validateSmartCheckinRequest",
  "validateSmartCheckinResponse",
  "validateResponseAgainstRequest",
  // From sdk/dcapi-verifier.ts (functions/classes only — types are erased)
  "createDcapiVerifier",
  "createBrowserLocalVerifierAuthority",
  "requestCredentialWithAuthority",
  "prepareDcapiCredentialRequest",
  "buildDcapiVerifierArtifacts",
  "publicVerifierArtifacts",
  "credentialToDebugJson",
  "detectDcApiSupport",
  "defaultCredentialGetter",
  // From sdk/kiosk-session.ts
  "createKioskPortalUrl",
  "createKioskSessionDescriptor",
  "decodeKioskSessionFragment",
  "encodeKioskSessionFragment",
];

describe("sdk-web-wallet invariants", () => {
  test("the SDK barrel does not leak any web-wallet names", () => {
    const names = Object.keys(sdkBarrel);
    for (const name of names) {
      expect(name.toLowerCase()).not.toContain("webwallet");
      expect(name.toLowerCase()).not.toContain("web-wallet");
    }
  });

  test("the SDK barrel still exports its expected name set (no surprise additions)", () => {
    const exported = new Set(Object.keys(sdkBarrel));
    for (const name of EXPECTED_SDK_BARREL_NAMES) {
      expect(exported.has(name)).toBe(true);
    }
    // No "WebWallet" or "createWebWallet*" should ever appear here.
    for (const name of exported) {
      expect(name.startsWith("createWebWallet")).toBe(false);
      expect(name.startsWith("buildWebWallet")).toBe(false);
    }
  });

  test("no file under src/sdk/ imports from sdk-web-wallet/", () => {
    const offenders = scanForForbiddenImports(
      join(ROOT, "sdk"),
      [/from ["']\.\.\/sdk-web-wallet\b/, /from ["']\.\/sdk-web-wallet\b/],
    );
    expect(offenders).toEqual([]);
  });

  test("src/sdk/index.ts does not mention sdk-web-wallet", () => {
    const content = readFileSync(join(ROOT, "sdk/index.ts"), "utf8");
    expect(content.toLowerCase()).not.toContain("sdk-web-wallet");
    expect(content.toLowerCase()).not.toContain("webwallet");
  });

  test("react.tsx does not import from sdk-web-wallet", () => {
    const content = readFileSync(join(ROOT, "sdk/react.tsx"), "utf8");
    expect(content.toLowerCase()).not.toContain("sdk-web-wallet");
  });

  test("protocol/index.ts does not mention sdk-web-wallet", () => {
    const content = readFileSync(join(ROOT, "protocol/index.ts"), "utf8");
    expect(content.toLowerCase()).not.toContain("sdk-web-wallet");
  });
});

function scanForForbiddenImports(
  rootDir: string,
  patterns: ReadonlyArray<RegExp>,
): string[] {
  const offenders: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      const content = readFileSync(full, "utf8");
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          offenders.push(relative(rootDir, full));
          break;
        }
      }
    }
  }
  return offenders;
}
