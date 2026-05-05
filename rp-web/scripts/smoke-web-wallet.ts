// One-shot smoke test for the web-wallet shim demo. Drives a real Chromium
// through the gesture-preserving popup flow and asserts that the verifier
// renders all three success badges. Exists to catch the class of bugs the
// in-process unit tests can't see — e.g., user-gesture loss across awaits,
// popup-blocker behavior, and real cross-document postMessage.
//
// Run from the repo root:
//   cd rp-web && bun run smoke:web-wallet
// or directly:
//   bun rp-web/scripts/smoke-web-wallet.ts
//
// Prereqs: `_site/` already built (this script will rebuild if missing) and a
// system Chromium binary.
//
// This script is dev-only and not part of `bun test`.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { serve } from "bun";
import puppeteer from "puppeteer-core";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const SITE_DIR = join(REPO_ROOT, "_site");
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";
const HEADLESS = process.env.HEADLESS !== "0";

if (
  !existsSync(SITE_DIR) ||
  !existsSync(join(SITE_DIR, "verifier/web-wallet-demo.html")) ||
  !existsSync(join(SITE_DIR, "verifier/wallet-choice.html"))
) {
  console.log("[smoke] _site/ missing or stale — rebuilding via scripts/build-pages.sh…");
  const result = spawnSync("bash", [join(REPO_ROOT, "scripts/build-pages.sh")], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error("[smoke] build-pages.sh failed");
    process.exit(2);
  }
}

if (!existsSync(CHROMIUM)) {
  console.error(`[smoke] chromium binary not found at ${CHROMIUM}; set CHROMIUM_PATH`);
  process.exit(2);
}

const server = serve({
  port: 0,
  hostname: "127.0.0.1",
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(SITE_DIR, path));
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("not found", { status: 404 });
  },
});

const baseUrl = `http://127.0.0.1:${server.port}`;
console.log(`[smoke] serving _site at ${baseUrl}`);

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: HEADLESS,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    // Allow the same-origin popup the demo opens.
    "--disable-popup-blocking",
  ],
});

let exitCode = 0;
try {
  const verifierUrl = `${baseUrl}/verifier/web-wallet-demo.html`;
  console.log(`[smoke] opening ${verifierUrl}`);
  const verifier = await browser.newPage();
  verifier.on("pageerror", (err) => console.error("[verifier pageerror]", err));
  verifier.on("console", (msg) => {
    if (msg.type() === "error") console.error("[verifier console]", msg.text());
  });
  await verifier.goto(verifierUrl, { waitUntil: "domcontentloaded" });
  await verifier.waitForSelector("button#run", { visible: true });

  // Listen for the popup before clicking, so the await happens after the
  // gesture-initiated `window.open`.
  const popupTargetPromise = browser.waitForTarget((t) => {
    const u = t.url();
    return u.includes("/wallet/") && t.type() === "page";
  }, { timeout: 10_000 });

  await verifier.click("button#run");

  const popupTarget = await popupTargetPromise;
  const popup = await popupTarget.page();
  if (!popup) throw new Error("[smoke] popup target had no page");
  popup.on("pageerror", (err) => console.error("[popup pageerror]", err));
  popup.on("console", (msg) => {
    if (msg.type() === "error") console.error("[popup console]", msg.text());
  });
  console.log(`[smoke] popup loaded: ${popup.url()}`);

  // Approve in the wallet popup.
  await popup.waitForSelector("button#approve", { visible: true, timeout: 10_000 });
  await popup.click("button#approve");
  console.log("[smoke] clicked Approve in wallet popup");

  // Back on the verifier page, wait for the success badges.
  await verifier.waitForFunction(
    () => {
      const badges = Array.from(document.querySelectorAll(".badge"));
      const required = [
        "HPKE opened",
        "MSO digest matched",
        "SMART response valid",
      ];
      return required.every((label) =>
        badges.some(
          (b) =>
            (b.textContent ?? "").includes(label) &&
            b.classList.contains("ok"),
        ),
      );
    },
    { timeout: 15_000 },
  );

  // Sanity: the response summary should mention the demo Patient.
  const summaryText = await verifier.evaluate(() => {
    const ul = document.querySelector("ul");
    return ul ? (ul as HTMLElement).innerText : "";
  });
  if (!summaryText.includes("Patient:")) {
    throw new Error(`[smoke] verifier summary missing Patient row — got: ${summaryText}`);
  }
  console.log(`[smoke] verifier summary:\n${summaryText}`);
  console.log("[smoke] ✓ all three success badges rendered");

  const configuredUrl = `${baseUrl}/verifier/wallet-choice.html`;
  console.log(`[smoke] opening ${configuredUrl}`);
  const configured = await browser.newPage();
  configured.on("pageerror", (err) => console.error("[configured pageerror]", err));
  configured.on("console", (msg) => {
    if (msg.type() === "error") console.error("[configured console]", msg.text());
  });
  await configured.goto(configuredUrl, { waitUntil: "domcontentloaded" });
  await configured.waitForSelector(".checkin-source-toggle", { visible: true });
  await configured.click(".checkin-source-toggle");
  await configured.waitForSelector(".checkin-source-option", { visible: true });

  const configuredPopupTargetPromise = browser.waitForTarget((t) => {
    const u = t.url();
    return u.includes("/wallet/") && t.type() === "page";
  }, { timeout: 10_000 });

  await configured.evaluate(() => {
    const options = Array.from(document.querySelectorAll(".checkin-source-option"));
    const option = options.find((el) =>
      (el.textContent ?? "").includes("SMART Demo Web Wallet"),
    ) as HTMLButtonElement | undefined;
    if (!option) throw new Error("SMART Demo Web Wallet option not found");
    option.click();
  });

  const configuredPopupTarget = await configuredPopupTargetPromise;
  const configuredPopup = await configuredPopupTarget.page();
  if (!configuredPopup) throw new Error("[smoke] configured popup target had no page");
  configuredPopup.on("pageerror", (err) => console.error("[configured popup pageerror]", err));
  configuredPopup.on("console", (msg) => {
    if (msg.type() === "error") console.error("[configured popup console]", msg.text());
  });
  await configuredPopup.waitForSelector(".questionnaire-card", { visible: true, timeout: 10_000 });
  await configuredPopup.evaluate(() => {
    const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-question-answer]"));
    const wellbeing = fields.find((field) =>
      field.closest(".questionnaire-field")?.textContent?.includes("How have you been feeling"),
    );
    if (!wellbeing) throw new Error("wellbeing field not found");
    wellbeing.value = "Feeling better";
    wellbeing.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await configuredPopup.evaluate(() => {
    const yes = Array.from(document.querySelectorAll<HTMLInputElement>('[data-question-answer][data-answer-kind="boolean"]'))
      .find((input) => input.value === "true");
    if (!yes) throw new Error("headache boolean field not found");
    yes.click();
  });
  await configuredPopup.waitForFunction(() =>
    Array.from(document.querySelectorAll(".questionnaire-field")).some((field) =>
      field.textContent?.includes("Pain severity"),
    ),
  );
  await configuredPopup.evaluate(() => {
    const severity = Array.from(document.querySelectorAll<HTMLInputElement>('[data-question-answer][data-answer-kind="integer"]'))
      .find((input) => input.type === "range");
    if (!severity) throw new Error("severity slider not found");
    severity.value = "7";
    severity.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await configuredPopup.evaluate(() => {
    const parts = Array.from(document.querySelectorAll<HTMLInputElement>('[data-question-date-part]'));
    const year = parts.find((input) => input.dataset.questionDatePart === "year");
    const month = parts.find((input) => input.dataset.questionDatePart === "month");
    if (!year || !month) throw new Error("started partial-date fields not found");
    year.value = "2026";
    month.value = "05";
    month.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await configuredPopup.waitForSelector("button#approve", { visible: true, timeout: 10_000 });
  await configuredPopup.click("button#approve");
  console.log("[smoke] filled intake form and clicked Approve in configured-page wallet popup");

  await configured.waitForFunction(
    () => {
      const pills = Array.from(document.querySelectorAll(".status-pill--done"));
      return (
        pills.some((p) => (p.textContent ?? "").includes("HPKE opened")) &&
        pills.some((p) => (p.textContent ?? "").includes("digest matched"))
      );
    },
    { timeout: 15_000 },
  );
  await configured.waitForFunction(
    () => (document.body.textContent ?? "").includes("QuestionnaireResponse"),
    { timeout: 15_000 },
  );
  console.log("[smoke] ✓ configured verifier page completed through web-wallet choice");
} catch (err) {
  console.error("[smoke] FAILED:", err);
  exitCode = 1;
} finally {
  await browser.close();
  server.stop();
}

process.exit(exitCode);
