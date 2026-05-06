// Unit tests for createWebWalletCredentialGetter. Uses an injected
// messageHost + windowOpen so we don't need a DOM.

import { describe, expect, test } from "bun:test";
import {
  createWebWalletCredentialGetter,
  WebWalletClosed,
  WebWalletDeclined,
  WebWalletError,
  WebWalletTimeout,
  type WebWalletRequestMessage,
} from "./popup-credential-getter.ts";
import { makeHarness } from "./test-harness.ts";

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

describe("createWebWalletCredentialGetter", () => {
  test("posts the request after the popup signals ready and resolves on approved", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });

    const promise = getCredential(makeRequestOptions());
    expect(harness.fakePopup.location.href).toBe("https://wallet.example/wallet/");

    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );

    expect(harness.postedToPopup.length).toBe(1);
    const req = harness.postedToPopup[0]!.msg as WebWalletRequestMessage;
    expect(req.type).toBe("digital-credentials/web-wallet/request");
    expect(req.credentialRequestOptions).toEqual(makeRequestOptions());
    expect(typeof req.requestId).toBe("string");

    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId: req.requestId,
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "abc" } },
      },
      "https://wallet.example",
    );

    const credential = await promise;
    expect(credential).toEqual({
      protocol: "org-iso-mdoc",
      data: { response: "abc" },
    });
    expect(harness.fakePopup.closed).toBe(true);
  });

  test("ignores messages from the wrong origin", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 100,
      closePollMs: 10000,
    });
    const promise = getCredential(makeRequestOptions());

    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://attacker.example",
    );
    expect(harness.postedToPopup.length).toBe(0);
    await expect(promise).rejects.toBeInstanceOf(WebWalletTimeout);
  });

  test("rejects with WebWalletDeclined on declined outcome", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "declined",
      },
      "https://wallet.example",
    );
    await expect(promise).rejects.toBeInstanceOf(WebWalletDeclined);
  });

  test("rejects with WebWalletClosed when the popup closes", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
      closePollMs: 25,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fakePopup.closed = true;
    await expect(promise).rejects.toBeInstanceOf(WebWalletClosed);
  });

  test("rejects with WebWalletTimeout on timeout", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 50,
      closePollMs: 1000,
    });
    const promise = getCredential(makeRequestOptions());
    await expect(promise).rejects.toBeInstanceOf(WebWalletTimeout);
  });

  test("rejects with WebWalletError when the popup is blocked", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => null,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    await expect(getCredential(makeRequestOptions())).rejects.toBeInstanceOf(
      WebWalletError,
    );
  });

  test("rejects when the request lacks a Digital Credentials request", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    await expect(
      getCredential({} as CredentialRequestOptions),
    ).rejects.toBeInstanceOf(WebWalletError);
  });

  test("forwards a non-mdoc Digital Credentials request unchanged", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const requestOptions = {
      digital: {
        requests: [
          {
            protocol: "example-vp",
            data: { query: { type: "VerifiablePresentation" } },
          },
        ],
      },
    } as unknown as CredentialRequestOptions;
    const promise = getCredential(requestOptions);
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );

    const req = harness.postedToPopup[0]!.msg as WebWalletRequestMessage;
    expect(req.credentialRequestOptions).toBe(requestOptions);
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId: req.requestId,
        outcome: "approved",
        credential: { protocol: "example-vp", data: { vp_token: "abc" } },
      },
      "https://wallet.example",
    );

    await expect(promise).resolves.toEqual({
      protocol: "example-vp",
      data: { vp_token: "abc" },
    });
  });

  test("rejects an approved credential whose protocol was not requested", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "approved",
        credential: { protocol: "example-vp", data: { vp_token: "abc" } },
      },
      "https://wallet.example",
    );

    await expect(promise).rejects.toBeInstanceOf(WebWalletError);
  });

  test("propagates an error outcome from the wallet", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "error",
        message: "boom",
      },
      "https://wallet.example",
    );
    const err = await promise.then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(WebWalletError);
    expect((err as Error).message).toBe("boom");
  });

  test("rejects re-entry while a call is in flight (single-flight)", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const first = getCredential(makeRequestOptions());

    // Concurrent call must reject immediately, before settling the first.
    await expect(getCredential(makeRequestOptions())).rejects.toBeInstanceOf(
      WebWalletError,
    );

    // The first call should still be alive — settle it cleanly so we don't
    // leak handles into the next test.
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "abc" } },
      },
      "https://wallet.example",
    );
    await expect(first).resolves.toBeTruthy();

    // After the first call settles, the getter is reusable.
    const harness2 = makeHarness();
    const getCredential2 = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness2.fakePopup as unknown as Window,
      messageHost: harness2.messageHost,
      timeoutMs: 5000,
    });
    const reuse = getCredential2(makeRequestOptions());
    harness2.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const reuseRequestId = (harness2.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness2.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId: reuseRequestId,
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "ok" } },
      },
      "https://wallet.example",
    );
    await expect(reuse).resolves.toBeTruthy();
  });

  test("ignores a response with a missing requestId (strict match)", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 100,
      closePollMs: 10000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    // Reply WITHOUT a requestId — must be ignored, getter should time out.
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "abc" } },
      },
      "https://wallet.example",
    );
    await expect(promise).rejects.toBeInstanceOf(WebWalletTimeout);
  });

  test("ignores a response with a mismatched requestId", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 100,
      closePollMs: 10000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId: "wcr_unknown_zzzzzz",
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "abc" } },
      },
      "https://wallet.example",
    );
    await expect(promise).rejects.toBeInstanceOf(WebWalletTimeout);
  });

  test("rejects a malformed approved credential as a WebWalletError", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "approved",
        // Wrong shape: missing `data`.
        credential: { protocol: "org-iso-mdoc" },
      },
      "https://wallet.example",
    );
    const err = await promise.then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(WebWalletError);
    expect((err as Error).message).toMatch(/malformed/i);
  });

  test("rejects approved credentials whose data is not a non-null object", async () => {
    for (const data of [null, undefined, "abc", 123, true]) {
      const harness = makeHarness();
      const getCredential = createWebWalletCredentialGetter({
        walletUrl: "https://wallet.example/wallet/",
        windowOpen: () => harness.fakePopup as unknown as Window,
        messageHost: harness.messageHost,
        timeoutMs: 5000,
      });
      const promise = getCredential(makeRequestOptions());
      harness.fireFromPopup(
        { type: "digital-credentials/web-wallet/ready" },
        "https://wallet.example",
      );
      const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
      harness.fireFromPopup(
        {
          type: "digital-credentials/web-wallet/response",
          requestId,
          outcome: "approved",
          credential: { protocol: "org-iso-mdoc", data },
        },
        "https://wallet.example",
      );
      await expect(promise).rejects.toBeInstanceOf(WebWalletError);
    }
  });

  test("does not inspect protocol-specific fields inside credential data", async () => {
    const harness = makeHarness();
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      windowOpen: () => harness.fakePopup as unknown as Window,
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());
    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { notResponse: "abc" } },
      },
      "https://wallet.example",
    );

    await expect(promise).resolves.toEqual({
      protocol: "org-iso-mdoc",
      data: { notResponse: "abc" },
    });
  });

  test("uses a pre-opened popup when one is provided (gesture-preserving path)", async () => {
    const harness = makeHarness();
    let windowOpenCalls = 0;
    const getCredential = createWebWalletCredentialGetter({
      walletUrl: "https://wallet.example/wallet/",
      popup: harness.fakePopup as unknown as WindowProxy,
      windowOpen: () => {
        windowOpenCalls += 1;
        return harness.fakePopup as unknown as Window;
      },
      messageHost: harness.messageHost,
      timeoutMs: 5000,
    });
    const promise = getCredential(makeRequestOptions());
    expect(windowOpenCalls).toBe(0);

    harness.fireFromPopup(
      { type: "digital-credentials/web-wallet/ready" },
      "https://wallet.example",
    );
    const requestId = (harness.postedToPopup[0]!.msg as WebWalletRequestMessage).requestId;
    harness.fireFromPopup(
      {
        type: "digital-credentials/web-wallet/response",
        requestId,
        outcome: "approved",
        credential: { protocol: "org-iso-mdoc", data: { response: "abc" } },
      },
      "https://wallet.example",
    );
    await expect(promise).resolves.toBeTruthy();
    expect(windowOpenCalls).toBe(0);
  });
});
