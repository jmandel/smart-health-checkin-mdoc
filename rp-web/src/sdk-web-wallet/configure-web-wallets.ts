import type { CredentialGetter } from "../sdk/dcapi-verifier.ts";
import {
  createWebWalletCredentialGetter,
  WebWalletError,
  type CreateWebWalletCredentialGetterOptions,
} from "./popup-credential-getter.ts";

export type WebWalletConfig = {
  id: string;
  label: string;
  walletUrl: URL | string;
  description?: string;
  popupFeatures?: string;
  popupName?: string;
};

export type WebWalletCredentials = {
  get: CredentialGetter;
  createGetter: (options?: WebWalletGetOptions) => CredentialGetter;
  openPopup: () => WindowProxy | null;
};

export type WebWalletHandle = {
  kind: "web-wallet";
  id: string;
  label: string;
  description?: string;
  origin: string;
  walletUrl: URL;
  credentials: WebWalletCredentials;
};

export type ConfigureWebWalletsOptions = {
  wallets: ReadonlyArray<WebWalletConfig>;
  windowOpen?: typeof window.open;
};

export type WebWalletGetOptions = Pick<
  CreateWebWalletCredentialGetterOptions,
  "popup" | "timeoutMs" | "closePollMs" | "expectedOrigin" | "messageHost"
>;

const DEFAULT_POPUP_FEATURES = "";

export function configureWebWallets(
  options: ConfigureWebWalletsOptions,
): WebWalletHandle[] {
  const ids = new Set<string>();
  return options.wallets.map((wallet) => {
    if (!wallet.id) throw new WebWalletError("web wallet id is required");
    if (ids.has(wallet.id)) {
      throw new WebWalletError(`duplicate web wallet id: ${wallet.id}`);
    }
    ids.add(wallet.id);
    const walletUrl = normalizeWalletUrl(wallet.walletUrl);
    const popupFeatures = wallet.popupFeatures ?? DEFAULT_POPUP_FEATURES;
    const opener =
      options.windowOpen ??
      (typeof window !== "undefined" ? window.open.bind(window) : undefined);

    const getterOptions = (
      getOptions?: WebWalletGetOptions,
    ): CreateWebWalletCredentialGetterOptions => ({
      walletUrl,
      popupFeatures,
      popupName: wallet.popupName,
      windowOpen: opener,
      ...getOptions,
    });

    const createGetter = (getOptions?: WebWalletGetOptions): CredentialGetter =>
      createWebWalletCredentialGetter(getterOptions(getOptions));

    return {
      kind: "web-wallet" as const,
      id: wallet.id,
      label: wallet.label,
      description: wallet.description,
      origin: walletUrl.origin,
      walletUrl,
      credentials: {
        get: createGetter(),
        createGetter,
        openPopup: () => {
          if (!opener) {
            throw new WebWalletError("web wallet popup requires window.open");
          }
          return opener("about:blank", wallet.popupName, popupFeatures);
        },
      },
    };
  });
}

function normalizeWalletUrl(walletUrl: URL | string): URL {
  if (walletUrl instanceof URL) return walletUrl;
  const base =
    typeof location !== "undefined" ? location.href : "https://localhost/";
  return new URL(walletUrl, base);
}
