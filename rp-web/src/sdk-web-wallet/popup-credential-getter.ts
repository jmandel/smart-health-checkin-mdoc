// Popup-based CredentialGetter for the web-wallet shim.
//
// Replaces `navigator.credentials.get` with a window.open + postMessage
// loop. The verifier passes its Digital Credentials request options to a
// wallet tab/window; the wallet posts back a credential object (or an error).
// This is a side surface — it does NOT modify the verifier SDK or the protocol
// module.

import type { CredentialGetter } from "../sdk/dcapi-verifier.ts";

export const WEB_WALLET_REQUEST_MESSAGE_TYPE = "digital-credentials/web-wallet/request" as const;
export const WEB_WALLET_RESPONSE_MESSAGE_TYPE = "digital-credentials/web-wallet/response" as const;
export const WEB_WALLET_READY_MESSAGE_TYPE = "digital-credentials/web-wallet/ready" as const;

export type WebWalletCredential = {
  protocol: string;
  data: unknown;
};

export type WebWalletRequestMessage = {
  type: typeof WEB_WALLET_REQUEST_MESSAGE_TYPE;
  /** Verifier-supplied navigator.credentials.get options. */
  credentialRequestOptions: CredentialRequestOptions;
  /** Optional opaque correlation id, echoed in the response. */
  requestId?: string;
};

export type WebWalletResponseMessage =
  | {
      type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE;
      requestId?: string;
      outcome: "approved";
      credential: WebWalletCredential;
    }
  | {
      type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE;
      requestId?: string;
      outcome: "declined" | "closed";
    }
  | {
      type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE;
      requestId?: string;
      outcome: "error";
      message: string;
    };

export type WebWalletReadyMessage = {
  type: typeof WEB_WALLET_READY_MESSAGE_TYPE;
};

export type WebWalletOutcome =
  | {
      kind: "approved";
      credential: WebWalletCredential;
    }
  | { kind: "declined" }
  | { kind: "closed" }
  | { kind: "timeout" }
  | { kind: "error"; message: string; cause?: unknown };

export class WebWalletDeclined extends Error {
  readonly kind = "declined" as const;
  constructor() {
    super("user declined in web wallet");
  }
}

export class WebWalletClosed extends Error {
  readonly kind = "closed" as const;
  constructor() {
    super("web wallet popup was closed");
  }
}

export class WebWalletTimeout extends Error {
  readonly kind = "timeout" as const;
  constructor() {
    super("web wallet did not respond in time");
  }
}

export class WebWalletError extends Error {
  readonly kind = "error" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export type CreateWebWalletCredentialGetterOptions = {
  /**
   * URL of the wallet app. Same-origin in v1.
   *
   * Examples:
   *   - new URL("../wallet/", location.href)
   *   - new URL("https://verifier.example/wallet/")
   */
  walletUrl: URL | string;
  /** Popup window features. Defaults to a centered, modest-sized popup. */
  popupFeatures?: string;
  /**
   * Popup target name. Defaults to a per-getter-instance unique name so two
   * unrelated getters can't accidentally share a `WindowProxy`. Set this
   * deliberately if you want named-window reuse across calls.
   */
  popupName?: string;
  /**
   * Pre-opened wallet popup. **Highly recommended** in real browsers: call
   * `window.open(walletUrl, ...)` synchronously inside the click handler and
   * pass the result here. If you `await` anything between the click and the
   * call to `getCredential`, Safari/Firefox will treat the eventual
   * `window.open` call as non-user-initiated and block the popup.
   *
   * If provided, the getter uses this window directly and will not call
   * `windowOpen`. The caller hands lifecycle to the getter (which will
   * `close()` it on cleanup).
   */
  popup?: WindowProxy | null;
  /** Total timeout (ms). Defaults to 5 minutes. */
  timeoutMs?: number;
  /** How often (ms) to poll for popup-closed. Defaults to 500. */
  closePollMs?: number;
  /**
   * Override the postMessage origin check. Defaults to the wallet URL's
   * origin. Set to `"*"` to disable; not recommended.
   */
  expectedOrigin?: string;
  /** Override `window.open`. Used in tests. */
  windowOpen?: typeof window.open;
  /** Override the message-event host (defaults to `window`). Used in tests. */
  messageHost?: {
    addEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
    removeEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
  };
};

const DEFAULT_FEATURES = "";

/**
  * Build a `CredentialGetter` that mediates a Digital Credentials request
  * through a web-wallet tab/window.
 *
 * Plug into the existing `requestCredentialWithAuthority({ getCredential })`
 * seam; no SDK changes required.
 */
export function createWebWalletCredentialGetter(
  options: CreateWebWalletCredentialGetterOptions,
): CredentialGetter {
  const walletUrl =
    typeof options.walletUrl === "string"
      ? new URL(options.walletUrl, typeof location !== "undefined" ? location.href : "https://localhost/")
      : options.walletUrl;
  const expectedOrigin = options.expectedOrigin ?? walletUrl.origin;
  const popupFeatures = options.popupFeatures ?? DEFAULT_FEATURES;
  // Per-getter-instance unique default avoids cross-wiring two unrelated
  // getters that both use `window.open(url, "smart-checkin-web-wallet", ...)`.
  const defaultPopupName = `smart-checkin-web-wallet-${Math.random().toString(36).slice(2, 10)}`;
  const popupName = options.popupName ?? defaultPopupName;
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const closePollMs = options.closePollMs ?? 500;
  const opener = options.windowOpen ?? (typeof window !== "undefined" ? window.open.bind(window) : undefined);
  const messageHost =
    options.messageHost ??
    (typeof window !== "undefined"
      ? {
          addEventListener: (type: "message", listener: (ev: MessageEvent) => void) =>
            window.addEventListener(type, listener),
          removeEventListener: (type: "message", listener: (ev: MessageEvent) => void) =>
            window.removeEventListener(type, listener),
        }
      : undefined);

  // Single-flight: a getter instance services one in-flight call at a time.
  // Re-entry is almost always a verifier UI bug (e.g., a Run button left live
  // while the popup is open) and would otherwise cross-wire requests through
  // a shared popup.
  let busy = false;

  return async function getCredentialViaWebWallet(
    requestOptions: CredentialRequestOptions,
  ): Promise<unknown> {
    if (busy) {
      throw new WebWalletError(
        "web wallet getter is already servicing a request; reject re-entry until the first call settles",
      );
    }
    if (!messageHost) {
      throw new WebWalletError("web wallet getter requires a message host (window)");
    }
    const requestedProtocols = requestedDigitalProtocols(requestOptions);
    if (requestedProtocols.length === 0) {
      throw new WebWalletError(
        "web wallet getter requires at least one Digital Credentials request with a string protocol",
      );
    }

    // Prefer a caller-supplied pre-opened popup (gesture-preserving path).
    // Fall back to opening here, which only works synchronously inside a
    // user-gesture handler. The popup starts at about:blank and is navigated
    // after our message listener is installed, so the wallet's early "ready"
    // message cannot race ahead of the verifier.
    let popup: WindowProxy | null | undefined = options.popup ?? null;
    if (!popup) {
      if (!opener) {
        throw new WebWalletError("web wallet getter requires window.open or a pre-opened popup");
      }
      popup = opener("about:blank", popupName, popupFeatures);
    }
    if (!popup) {
      throw new WebWalletError(
        "popup was blocked; pre-open the popup synchronously in your click handler and pass it via { popup }",
      );
    }
    const popupRef = popup;

    busy = true;

    const requestId = `wcr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const requestPayload: WebWalletRequestMessage = {
      type: WEB_WALLET_REQUEST_MESSAGE_TYPE,
      credentialRequestOptions: requestOptions,
      requestId,
    };

    try {
      const outcome = await new Promise<WebWalletOutcome>((resolve) => {
        let settled = false;
        const cleanups: Array<() => void> = [];
        const settle = (v: WebWalletOutcome) => {
          if (settled) return;
          settled = true;
          for (const c of cleanups) {
            try {
              c();
            } catch {
              // ignore
            }
          }
          resolve(v);
        };

        const onMessage = (ev: MessageEvent) => {
          if (ev.source !== popupRef) return;
          if (expectedOrigin !== "*" && ev.origin !== expectedOrigin) return;
          const data = ev.data;
          if (!data || typeof data !== "object") return;
          const tag = (data as { type?: unknown }).type;
          if (tag === WEB_WALLET_READY_MESSAGE_TYPE) {
            try {
              popupRef.postMessage(requestPayload, expectedOrigin === "*" ? "*" : expectedOrigin);
            } catch (err) {
              settle({
                kind: "error",
                message: `failed to post request to popup: ${errString(err)}`,
                cause: err,
              });
            }
            return;
          }
          if (tag === WEB_WALLET_RESPONSE_MESSAGE_TYPE) {
            const message = data as WebWalletResponseMessage;
            // Strict requestId match. Every wallet reply must echo the
            // requestId we generated; missing-id replies are ignored to
            // contain stale-popup / opener-reload bugs.
            if (message.requestId !== requestId) return;
            if (message.outcome === "approved") {
              const cred = message.credential as unknown;
              if (
                !cred ||
                typeof cred !== "object" ||
                typeof (cred as { protocol?: unknown }).protocol !== "string" ||
                !Object.prototype.hasOwnProperty.call(cred, "data") ||
                !requestedProtocols.includes((cred as { protocol: string }).protocol)
              ) {
                settle({
                  kind: "error",
                  message:
                    "wallet returned a malformed approved credential (expected { protocol: <requested string>, data: ... })",
                });
                return;
              }
              settle({ kind: "approved", credential: cred as WebWalletCredential });
            } else if (message.outcome === "declined") {
              settle({ kind: "declined" });
            } else if (message.outcome === "closed") {
              settle({ kind: "closed" });
            } else if (message.outcome === "error") {
              settle({ kind: "error", message: message.message });
            }
          }
        };
        messageHost.addEventListener("message", onMessage);
        cleanups.push(() => messageHost.removeEventListener("message", onMessage));

        cleanups.push(() => {
          if (!popupRef.closed) {
            try {
              popupRef.close();
            } catch {
              // ignore
            }
          }
        });

        const navigationError = navigatePopupToWallet(popupRef, walletUrl);
        if (navigationError) {
          settle(navigationError);
          return;
        }

        const closeTimer = setInterval(() => {
          if (popupRef.closed) {
            settle({ kind: "closed" });
          }
        }, closePollMs);
        cleanups.push(() => clearInterval(closeTimer));

        const timeoutTimer = setTimeout(() => {
          settle({ kind: "timeout" });
        }, timeoutMs);
        cleanups.push(() => clearTimeout(timeoutTimer));

      });

      if (outcome.kind === "approved") {
        return outcome.credential;
      }
      if (outcome.kind === "declined") throw new WebWalletDeclined();
      if (outcome.kind === "closed") throw new WebWalletClosed();
      if (outcome.kind === "timeout") throw new WebWalletTimeout();
      throw new WebWalletError(outcome.message, { cause: outcome.cause });
    } finally {
      busy = false;
    }
  };
}

function errString(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function requestedDigitalProtocols(
  requestOptions: CredentialRequestOptions,
): string[] {
  const navigatorArg = requestOptions as unknown as {
    digital?: {
      requests?: ReadonlyArray<{
        protocol?: unknown;
      }>;
    };
  };
  const requests = navigatorArg.digital?.requests;
  if (!Array.isArray(requests) || requests.length === 0) return [];
  return requests
    .map((request) => request?.protocol)
    .filter((protocol): protocol is string => typeof protocol === "string" && protocol.length > 0);
}

function navigatePopupToWallet(
  popupRef: WindowProxy,
  walletUrl: URL,
): Extract<WebWalletOutcome, { kind: "error" }> | undefined {
  try {
    const locationLike = (popupRef as unknown as { location?: { href: string } }).location;
    if (!locationLike) return undefined;
    locationLike.href = walletUrl.href;
    return undefined;
  } catch (err) {
    return {
      kind: "error",
      message: `failed to navigate popup to wallet: ${errString(err)}`,
      cause: err,
    };
  }
}
