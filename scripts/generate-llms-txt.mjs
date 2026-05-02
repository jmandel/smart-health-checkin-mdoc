#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.resolve(process.argv[2] ?? path.join(ROOT, "_site", "llms.txt"));

// Curated allowlist. Order is the order sources appear in the bundle.
// Goal: high-signal docs an LLM helper needs to reason about the spec, the
// protocol, the demos, and the reference SDK / wallet libraries -- without
// pulling in transient plans, research notes, or vendored material.
const HTML_EXPLAINERS = [
  "site/index.html",
  "site/smart-model-explainer.html",
  "site/kiosk-flow-explainer.html",
  "site/wire-protocol-explainer.html",
];

const MARKDOWN_SOURCES = [
  "README.md",
  "docs/CONTEXT.md",
  "docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md",
  "docs/PROTOCOL-EXPLAINER.md",
  "docs/profiles/org-iso-mdoc.md",
  "rp-web/README.md",
  "rp-web/src/sdk/README.md",
  "rp-web/src/sdk/react.README.md",
  "wallet-android/README.md",
  "wallet-android/app/matcher-rs/README.md",
];

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ");
}

function cleanInline(html) {
  return decodeHtml(stripTags(html)).replace(/\s+/g, " ").trim();
}

function htmlToMarkdown(html) {
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  body = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
      const text = decodeHtml(stripTags(code)).trim();
      return text ? `\n\n\`\`\`\n${text}\n\`\`\`\n\n` : "\n\n";
    })
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => {
      return `\n\n${"#".repeat(Number(level))} ${cleanInline(text)}\n\n`;
    })
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = cleanInline(text);
      return label ? `[${label}](${href})` : href;
    })
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|article|section|header|main|nav|ul|ol|table|thead|tbody|tr)>/gi, "\n\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]*>/g, " ");

  return decodeHtml(body)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readIfPresent(relPath) {
  try {
    return await readFile(path.join(ROOT, relPath), "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

const sources = [];
const missing = [];

for (const relPath of HTML_EXPLAINERS) {
  const html = await readIfPresent(relPath);
  if (html === undefined) {
    missing.push(relPath);
    continue;
  }
  sources.push({ path: relPath, content: htmlToMarkdown(html) });
}

for (const relPath of MARKDOWN_SOURCES) {
  const markdown = await readIfPresent(relPath);
  if (markdown === undefined) {
    missing.push(relPath);
    continue;
  }
  sources.push({ path: relPath, content: markdown.trim() });
}

if (missing.length > 0) {
  throw new Error(`Missing curated llms.txt source(s): ${missing.join(", ")}`);
}

const sourceIndex = sources.map((source) => `- ${source.path}`).join("\n");
const sections = sources
  .map((source) => `---\n\n## Source: ${source.path}\n\n${source.content}`)
  .join("\n\n");

const output = `# SMART Health Check-in docs for LLMs

This file is generated during the Pages build by \`scripts/generate-llms-txt.mjs\`.
It follows the \`llms.txt\` convention and concatenates a curated set of
high-signal sources -- the public explainers, the active spec, the protocol
profile, and the reference SDK / wallet READMEs -- into one Markdown-friendly
reference. Transient plans, design history, internal research notes, and
vendored material are intentionally excluded; see the GitHub repo for those.

## Source index

${sourceIndex}

${sections}
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);
const sizeKb = (new Blob([output]).size / 1024).toFixed(1);
console.log(
  `Generated ${path.relative(ROOT, outputPath)} from ${sources.length} sources (${sizeKb} KB)`
);
