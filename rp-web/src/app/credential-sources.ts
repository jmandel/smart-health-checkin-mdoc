import type { CredentialGetter } from "../sdk/dcapi-verifier.ts";
import type { WebWalletHandle } from "../sdk-web-wallet/index.ts";
import { WebWalletError } from "../sdk-web-wallet/index.ts";

export type CredentialSourceActivation = {
  getCredential: CredentialGetter;
  cleanup?: () => void;
};

export type CredentialSource = {
  kind: "platform" | "web-wallet";
  id: string;
  label: string;
  description?: string;
  origin?: string;
  available: boolean;
  unavailableReason?: string;
  activate: () => CredentialSourceActivation;
};

export type CreateCredentialSourcesOptions = {
  platformWallet?: boolean;
  platformAvailable: boolean;
  platformUnavailableReason?: string;
  webWallets?: ReadonlyArray<WebWalletHandle>;
};

export function createCredentialSources(
  options: CreateCredentialSourcesOptions,
): CredentialSource[] {
  const sources: CredentialSource[] = [];
  if (options.platformWallet !== false) {
    sources.push({
      kind: "platform",
      id: "platform",
      label: "Platform Wallet",
      description: "Use the browser's built-in Digital Credentials API.",
      available: options.platformAvailable,
      unavailableReason: options.platformAvailable
        ? undefined
        : options.platformUnavailableReason ?? "Platform wallet is unavailable in this browser.",
      activate: () => ({
        getCredential: async (requestOptions, preparedRequest) => {
          const get = navigator.credentials?.get?.bind(navigator.credentials);
          if (!get) {
            throw new Error("navigator.credentials.get is not available");
          }
          return (get as CredentialGetter)(requestOptions, preparedRequest);
        },
      }),
    });
  }

  for (const webWallet of options.webWallets ?? []) {
    sources.push({
      kind: "web-wallet",
      id: `web-wallet:${webWallet.id}`,
      label: webWallet.label,
      description: webWallet.description ?? webWallet.origin,
      origin: webWallet.origin,
      available: true,
      activate: () => {
        const popup = webWallet.credentials.openPopup();
        if (!popup) {
          throw new WebWalletError(
            "popup was blocked; allow popups for this site and try again",
          );
        }
        const getCredential = webWallet.credentials.createGetter({ popup });
        return {
          getCredential,
          cleanup: () => {
            if (!popup.closed) {
              try {
                popup.close();
              } catch {
                // ignore
              }
            }
          },
        };
      },
    });
  }

  return sources;
}
