import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { emit } from "./debug/events.ts";
import { configureWebWallets } from "./sdk-web-wallet/index.ts";
import "./app/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

const demoWalletUrl = new URL("/wallet/", location.href);
const webWallets = configureWebWallets({
  wallets: [
    {
      id: "smart-demo",
      label: "SMART Demo Web Wallet",
      walletUrl: demoWalletUrl,
      description: `Same-origin demo wallet (${demoWalletUrl.origin})`,
    },
    {
      id: "smart-demo-training",
      label: "SMART Training Web Wallet",
      walletUrl: demoWalletUrl,
      description: "Second configured entry using the same demo wallet app.",
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
