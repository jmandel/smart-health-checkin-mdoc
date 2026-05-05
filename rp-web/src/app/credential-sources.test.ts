import { describe, expect, test } from "bun:test";
import { createCredentialSources } from "./credential-sources.ts";
import { configureWebWallets } from "../sdk-web-wallet/index.ts";
import { makeHarness } from "../sdk-web-wallet/test-harness.ts";

describe("createCredentialSources", () => {
  test("keeps platform wallet as an app-level source, not sdk-web-wallet state", () => {
    const sources = createCredentialSources({
      platformAvailable: true,
      webWallets: [],
    });

    expect(sources.map((source) => source.id)).toEqual(["platform"]);
    expect(sources[0]!.kind).toBe("platform");
    expect(sources[0]!.available).toBe(true);
  });

  test("composes platform and explicitly configured web-wallet handles", () => {
    const harness = makeHarness();
    const webWallets = configureWebWallets({
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
      platformAvailable: false,
      platformUnavailableReason: "not supported",
      webWallets,
    });

    expect(sources.map((source) => [source.id, source.kind, source.available])).toEqual([
      ["platform", "platform", false],
      ["web-wallet:demo", "web-wallet", true],
    ]);

    const webSource = sources[1]!;
    const activation = webSource.activate();
    expect(typeof activation.getCredential).toBe("function");
    expect(harness.fakePopup.location.href).toBe("about:blank");
    activation.cleanup?.();
    expect(harness.fakePopup.closed).toBe(true);
  });

  test("can omit platform wallet at the app layer", () => {
    const sources = createCredentialSources({
      platformWallet: false,
      platformAvailable: true,
      webWallets: [],
    });

    expect(sources).toEqual([]);
  });
});
