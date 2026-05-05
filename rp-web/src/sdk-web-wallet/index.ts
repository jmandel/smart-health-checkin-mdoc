// Web-wallet shim — side surface, NOT part of the rp-web SDK barrel.
//
// This module lets a verifier mediate an `org-iso-mdoc` SMART Health Check-in
// credential request through a web app instead of the platform
// W3C Digital Credentials API. It plugs into the existing
// `requestCredentialWithAuthority({ getCredential })` seam without changing
// the SDK, the React hook, or the protocol module.
//
// Usage (verifier side):
//
//   const authority = createBrowserLocalVerifierAuthority({ origin: location.origin });
//   const getCredential = createWebWalletCredentialGetter({
//     walletUrl: new URL("/wallet/", location.href),
//   });
//   await requestCredentialWithAuthority({ authority, request, getCredential });
//
// This file is intentionally NOT re-exported from `src/sdk/index.ts`.

export {
  createWebWalletCredentialGetter,
  WebWalletDeclined,
  WebWalletClosed,
  WebWalletTimeout,
  WebWalletError,
  type WebWalletOutcome,
  type CreateWebWalletCredentialGetterOptions,
  type WebWalletRequestMessage,
  type WebWalletResponseMessage,
} from "./popup-credential-getter.ts";

export {
  buildWebWalletDcapiResponse,
  type BuildWebWalletDcapiResponseInput,
  type BuildWebWalletDcapiResponseResult,
  type WebWalletIssuerKey,
  type WebWalletDeviceKey,
} from "./wallet-core.ts";

export {
  configureWebWallets,
  type ConfigureWebWalletsOptions,
  type WebWalletConfig,
  type WebWalletCredentials,
  type WebWalletGetOptions,
  type WebWalletHandle,
} from "./configure-web-wallets.ts";
