import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { emit } from "./debug/events.ts";
import { configureWebWallets } from "./sdk-web-wallet/index.ts";
import "./app/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

const verifierBaseUrl = new URL("./", document.baseURI);
const demoWalletUrl = new URL("../wallet/", verifierBaseUrl);
const webWallets = configureWebWallets({
  wallets: [
    {
      id: "smart-demo",
      label: "SMART Demo Web Wallet",
      walletUrl: demoWalletUrl,
      description: `Reference web wallet at ${demoWalletUrl.pathname}`,
    },
  ],
});

emit("BOOT", {
  userAgent: navigator.userAgent,
  href: location.href,
  configuredWebWallets: webWallets.map((wallet) => ({
    id: wallet.id,
    label: wallet.label,
    origin: wallet.origin,
  })),
});

createRoot(root).render(
  <StrictMode>
    <App webWallets={webWallets} />
  </StrictMode>,
);
