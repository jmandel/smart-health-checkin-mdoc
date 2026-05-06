import { describe, expect, test } from "bun:test";
import { configureWebWallets, WebWalletError } from "./index.ts";
import { makeHarness } from "./test-harness.ts";
import type { WebWalletRequestMessage } from "./popup-credential-getter.ts";

function makeRequestOptions() {
  return {
    digital: {
      requests: [
        {
          protocol: "org-iso-mdoc",
          data: {
            deviceRequest: "ZGV2aWNl",
            encryptionInfo: "ZW5j",
          },
        },
      ],
    },
  } as unknown as CredentialRequestOptions;
}

describe("configureWebWallets", () => {
  test("returns explicit web-wallet handles without platform-wallet state", () => {
    const wallets = configureWebWallets({
      wallets: [
        {
          id: "demo",
          label: "Demo Wallet",
          walletUrl: "https://wallet.example/app/",
          description: "Demo",
        },
      ],
      windowOpen: () => null,
    });

    expect(wallets).toHaveLength(1);
    expect(wallets[0]!.kind).toBe("web-wallet");
    expect(wallets[0]!.id).toBe("demo");
    expect(wallets[0]!.label).toBe("Demo Wallet");
    expect(wallets[0]!.origin).toBe("https://wallet.example");
    expect(typeof wallets[0]!.credentials.get).toBe("function");
    expect(typeof wallets[0]!.credentials.createGetter).toBe("function");
    expect(typeof wallets[0]!.credentials.openPopup).toBe("function");
  });

  test("opens an about:blank holding popup to preserve the user gesture", () => {
    const harness = makeHarness();
    const opened: Array<{ url?: string | URL; name?: string; features?: string }> = [];
    const wallets = configureWebWallets({
      wallets: [
        {
          id: "demo",
          label: "Demo Wallet",
          walletUrl: "https://wallet.example/app/",
          popupName: "demo-wallet",
          popupFeatures: "popup=yes,width=400,height=600",
        },
      ],
      windowOpen: (url, name, features) => {
        opened.push({ url, name, features });
        return harness.fakePopup as unknown as Window;
      },
    });

    expect(wallets[0]!.credentials.openPopup() as unknown).toBe(harness.fakePopup);
    expect(opened).toEqual([
      {
        url: "about:blank",
        name: "demo-wallet",
        features: "popup=yes,width=400,height=600",
      },
    ]);
  });

  test("createGetter uses the provided popup and navigates it before handshake", async () => {
    const harness = makeHarness();
    const wallets = configureWebWallets({
      wallets: [
        {
          id: "demo",
          label: "Demo Wallet",
          walletUrl: "https://wallet.example/app/",
        },
      ],
      windowOpen: () => {
        throw new Error("should not open a second popup");
      },
    });

    const getCredential = wallets[0]!.credentials.createGetter({
      popup: harness.fakePopup as unknown as WindowProxy,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());

    expect(harness.fakePopup.location.href).toBe("https://wallet.example/app/");

    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const req = harness.postedToPopup[0]!.msg as WebWalletRequestMessage;
    expect(req.credentialRequestOptions).toEqual(makeRequestOptions());
    const requestId = req.requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "abc" } },
      },
      "https://wallet.example",
    );

    await expect(promise).resolves.toEqual({
      protocol: "org-iso-mdoc",
      data: { response: "abc" },
    });
  });

  test("rejects duplicate wallet ids", () => {
    expect(() =>
      configureWebWallets({
        wallets: [
          { id: "demo", label: "One", walletUrl: "https://wallet.example/one" },
          { id: "demo", label: "Two", walletUrl: "https://wallet.example/two" },
        ],
      }),
    ).toThrow(WebWalletError);
  });
});
