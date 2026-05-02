#!/usr/bin/env bun
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.resolve(process.argv[2] ?? path.join(ROOT, "_site", "llms.txt"));

const EXPLAINER_SOURCES = [
  "site/index.html",
  "site/smart-model-explainer.html",
  "site/kiosk-flow-explainer.html",
  "site/wire-protocol-explainer.html",
];

const MARKDOWN_ORDER = [
  "README.md",
  "docs/CONTEXT.md",
  "docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md",
  "docs/PROTOCOL-EXPLAINER.md",
  "docs/profiles/README.md",
  "docs/profiles/org-iso-mdoc.md",
  "docs/PLAN.md",
  "docs/OPEN-QUESTIONS.md",
  "rp-web/README.md",
  "rp-web/src/sdk/README.md",
  "rp-web/src/sdk/react.README.md",
  "rp-web/src/protocol/README.md",
  "wallet-android/README.md",
];

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".gradle",
  ".idea",
  ".agents",
  ".pytest_cache",
  "node_modules",
  "dist",
  "build",
  "_site",
]);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function isMarkdownDoc(relPath) {
  if (!relPath.endsWith(".md")) {
    return false;
  }
  if (relPath.startsWith("docs/archive/") || relPath.startsWith("docs/research/archive/")) {
    return false;
  }
  if (relPath === "README.md" || relPath.startsWith("docs/")) {
    return true;
  }
  if (relPath.startsWith("rp-web/")) {
    return relPath.endsWith("README.md") || relPath.endsWith(".README.md");
  }
  if (relPath.startsWith("wallet-android/")) {
    return relPath.endsWith("README.md");
  }
  if (
    relPath.startsWith("fixtures/") ||
    relPath.startsWith("fixtures-tool/") ||
    relPath.startsWith("capture/") ||
    relPath.startsWith("matcher/") ||
    relPath.startsWith("matcher-c/")
  ) {
    return relPath.endsWith("README.md");
  }
  if (relPath.startsWith("vendor/")) {
    return relPath === "vendor/README.md" || relPath === "vendor/INDEX.md" || relPath === "vendor/FIXTURES.md";
  }
  return false;
}

function markdownSortKey(relPath) {
  const orderedIndex = MARKDOWN_ORDER.indexOf(relPath);
  return orderedIndex === -1 ? 10_000 : orderedIndex;
}

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

const allFiles = await listFiles(ROOT);
const markdownSources = allFiles
  .map((file) => toPosixPath(path.relative(ROOT, file)))
  .filter(isMarkdownDoc)
  .sort((a, b) => markdownSortKey(a) - markdownSortKey(b) || a.localeCompare(b));

const sources = [];
for (const relPath of EXPLAINER_SOURCES) {
  const html = await readIfPresent(relPath);
  if (html !== undefined) {
    sources.push({ path: relPath, content: htmlToMarkdown(html) });
  }
}
for (const relPath of markdownSources) {
  const markdown = await readIfPresent(relPath);
  if (markdown !== undefined) {
    sources.push({ path: relPath, content: markdown.trim() });
  }
}

const sourceIndex = sources.map((source) => `- ${source.path}`).join("\n");
const sections = sources
  .map((source) => `---\n\n## Source: ${source.path}\n\n${source.content}`)
  .join("\n\n");

const output = `# SMART Health Check-in docs for LLMs

This file is generated during the Pages build by \`scripts/generate-llms-txt.mjs\`.
It follows the \`llms.txt\` convention and concatenates the public explainers,
active docs, and project README files into one Markdown-friendly reference.

## Source index

${sourceIndex}

${sections}
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);
console.log(`Generated ${path.relative(ROOT, outputPath)} from ${sources.length} sources`);
