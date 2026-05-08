import { describe, expect, test } from "bun:test";
import { createCredentialSources } from "./credential-sources.ts";
import { configureWebWallets } from "../sdk-web-wallet/index.ts";
import { makeHarness } from "../sdk-web-wallet/test-harness.ts";

describe("createCredentialSources", () => {
  test("builds a single platform source when only platform is requested", () => {
    const sources = createCredentialSources({
      sources: [{ kind: "platform" }],
      platformAvailable: true,
    });

    expect(sources.map((source) => source.id)).toEqual(["platform"]);
    expect(sources[0]!.kind).toBe("platform");
    expect(sources[0]!.available).toBe(true);
  });

  test("preserves the order the caller passes (web wallet before platform)", () => {
    const harness = makeHarness();
    const [demoWallet] = configureWebWallets({
      wallets: [
        {
          id: "demo",
          label: "Demo Web Wallet",
          walletUrl: "https://wallet.example/app/",
        },
      ],
      windowOpen: () => harness.fakePopup as unknown as Window,
    });

    const sources = createCredentialSources({
      sources: [
        { kind: "web-wallet", wallet: demoWallet! },
        { kind: "platform" },
      ],
      platformAvailable: false,
      platformUnavailableReason: "not supported",
    });

    expect(sources.map((source) => [source.id, source.kind, source.available])).toEqual([
      ["web-wallet:demo", "web-wallet", true],
      ["platform", "platform", false],
    ]);

    const webSource = sources[0]!;
    const activation = webSource.activate();
    expect(typeof activation.getCredential).toBe("function");
    expect(harness.fakePopup.location.href).toBe("about:blank");
    activation.cleanup?.();
    expect(harness.fakePopup.closed).toBe(true);
  });

  test("returns no sources when the caller passes an empty list", () => {
    const sources = createCredentialSources({
      sources: [],
      platformAvailable: true,
    });

    expect(sources).toEqual([]);
  });
});
