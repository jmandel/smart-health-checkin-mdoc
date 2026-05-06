// Web-wallet shim — side surface, NOT part of the rp-web SDK barrel.
//
// This module lets a verifier mediate a W3C Digital Credentials request through
// a web app instead of the platform `navigator.credentials.get` UI. It plugs into the existing
// `requestCredentialWithAuthority({ getCredential })` seam without changing
// the SDK, the React hook, or the protocol module.
//
// Usage (verifier side):
//
//   const authority = createBrowserLocalVerifierAuthority({ origin: location.origin });
//   const getCredential = createWebWalletCredentialGetter({
//     walletUrl: new URL("https://wallet.example/app/"),
//   });
//   await requestCredentialWithAuthority({ authority, request, getCredential });
//
// This file is intentionally NOT re-exported from `src/sdk/index.ts`.

export {
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
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
