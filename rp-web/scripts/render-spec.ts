#!/usr/bin/env bun
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked, Renderer } from "marked";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

const inputArg = process.argv[2] ?? resolve(ROOT, "spec.md");
const outputArg = process.argv[3] ?? resolve(ROOT, "_site", "spec.html");

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);

const md = await readFile(inputPath, "utf8");

interface Heading {
  depth: number;
  text: string;
  id: string;
}
const headings: Heading[] = [];
const slugSeen = new Map<string, number>();

function slugify(raw: string): string {
  const base =
    raw
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[`*_~]/g, "")
      .replace(/&[a-z]+;/gi, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "section";
  const n = slugSeen.get(base) ?? 0;
  slugSeen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const renderer = new Renderer();
const baseHeading = renderer.heading.bind(renderer);
const baseCode = renderer.code.bind(renderer);

renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const raw = tokens
    .map((t: any) => ("text" in t ? t.text : "raw" in t ? t.raw : ""))
    .join(" ");
  const id = slugify(raw || text);
  if (depth === 2 || depth === 3) {
    headings.push({ depth, text, id });
  }
  if (depth === 1) {
    return `<h1 id="${id}">${text}</h1>\n`;
  }
  return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${depth}>\n`;
};

renderer.code = function ({ text, lang }) {
  const language = (lang ?? "").trim().split(/\s+/)[0];
  if (language === "mermaid") {
    return `<div class="mermaid">${escapeHtml(text)}</div>\n`;
  }
  if (language) {
    return `<pre><code class="language-${escapeHtml(language)} hljs">${escapeHtml(text)}</code></pre>\n`;
  }
  return `<pre><code class="hljs">${escapeHtml(text)}</code></pre>\n`;
};

const marked = new Marked({ gfm: true, breaks: false });
const body = await marked.parse(md, { renderer });

const docTitle = "SMART Health Check-in 1.0 — Draft Spec";
const docDescription =
  "SMART Health Check-in 1.0 draft: TypeScript/JSDoc clinical model, trust rules and layer separation, same-device org-iso-mdoc flow, and Appendix A diagnostic bridge.";

const tocItems = headings
  .map(
    (h) =>
      `<li class="toc-l${h.depth}"><a href="#${h.id}">${h.text}</a></li>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(docTitle)}</title>
<meta name="description" content="${escapeHtml(docDescription)}" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github.min.css" media="(prefers-color-scheme: light)" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github-dark.min.css" media="(prefers-color-scheme: dark)" />
<style>
  :root {
    color-scheme: light;
    --ink: #172033;
    --muted: #5f6f86;
    --soft-ink: #2d3e58;
    --line: #d9e2ec;
    --soft: #f7fafc;
    --softer: #fcfdfe;
    --blue: #006fb7;
    --blue-soft: #eef6ff;
    --green: #08795b;
    --amber: #92590a;
    --code: #0e1726;
    --code-fg: #e7eef9;
    --rule: #d9e2ec;
    --measure: 980px;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 1rem; }
  body {
    margin: 0;
    font: 16.5px/1.62 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--ink);
    background: #ffffff;
  }
  a { color: var(--blue); }
  a:hover { color: #003c66; }

  .topbar {
    border-bottom: 1px solid var(--line);
    background: #ffffff;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .topbar-inner {
    max-width: var(--measure);
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: baseline;
    font-size: 0.92rem;
  }
  .topbar-title {
    font-weight: 700;
    color: var(--soft-ink);
    letter-spacing: -0.01em;
    margin-right: auto;
  }
  .topbar a { color: var(--soft-ink); text-decoration: none; border-bottom: 1px solid transparent; }
  .topbar a:hover { color: var(--blue); border-bottom-color: var(--blue); }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-width: var(--measure);
    margin: 0 auto;
    padding: 0 24px 80px;
  }
  @media (min-width: 1100px) {
    .layout {
      max-width: 1280px;
      grid-template-columns: 260px minmax(0, 1fr);
      gap: 36px;
    }
  }

  .toc {
    font-size: 0.92rem;
    color: var(--muted);
    line-height: 1.45;
  }
  @media (min-width: 1100px) {
    .toc {
      position: sticky;
      top: 64px;
      align-self: start;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      padding-top: 28px;
      border-right: 1px solid var(--line);
      padding-right: 16px;
    }
  }
  .toc h2 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin: 0 0 10px;
  }
  .toc ul { list-style: none; padding: 0; margin: 0 0 18px; }
  .toc li { margin: 2px 0; }
  .toc a {
    color: var(--soft-ink);
    text-decoration: none;
    display: block;
    padding: 2px 0;
    border-left: 2px solid transparent;
    padding-left: 10px;
  }
  .toc a:hover { color: var(--blue); border-left-color: var(--blue); }
  .toc-l3 { padding-left: 14px; font-size: 0.88rem; color: var(--muted); }
  .toc-l3 a { color: var(--muted); }

  main { min-width: 0; padding-top: 28px; }
  .hero {
    border-bottom: 1px solid var(--line);
    padding-bottom: 24px;
    margin-bottom: 28px;
  }
  .hero .eyebrow {
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .hero h1 {
    font-size: clamp(1.9rem, 3.6vw, 2.8rem);
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    color: var(--ink);
  }
  .hero p { color: var(--muted); margin: 0; max-width: 680px; }

  h1, h2, h3, h4, h5, h6 { line-height: 1.22; color: var(--ink); }
  h1 { margin: 0 0 12px; }
  h2 {
    font-size: 1.55rem;
    margin: 44px 0 10px;
    padding-top: 8px;
    border-top: 1px solid var(--rule);
  }
  h3 { font-size: 1.18rem; margin: 28px 0 8px; }
  h4 { font-size: 1.0rem; margin: 22px 0 6px; color: var(--soft-ink); }
  h5, h6 { font-size: 0.95rem; margin: 18px 0 6px; color: var(--soft-ink); }

  h2 .anchor, h3 .anchor, h4 .anchor {
    color: var(--rule);
    text-decoration: none;
    margin-right: 8px;
    font-weight: 400;
    opacity: 0;
    transition: opacity 80ms ease;
  }
  h2:hover .anchor, h3:hover .anchor, h4:hover .anchor { opacity: 1; }

  p { margin: 0 0 12px; }
  ul, ol { padding-left: 22px; margin: 0 0 12px; }
  li { margin: 4px 0; }
  li > p { margin: 0 0 6px; }
  blockquote {
    margin: 0 0 16px;
    padding: 10px 16px;
    border-left: 3px solid var(--blue);
    background: var(--blue-soft);
    color: var(--soft-ink);
  }
  blockquote p:last-child { margin-bottom: 0; }

  hr {
    border: none;
    border-top: 1px solid var(--line);
    margin: 28px 0;
  }

  table {
    border-collapse: collapse;
    margin: 0 0 18px;
    width: 100%;
    font-size: 0.95rem;
    overflow: auto;
    display: block;
  }
  thead { background: var(--soft); }
  th, td {
    border: 1px solid var(--line);
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  th { color: var(--soft-ink); font-weight: 600; }

  code, pre, kbd, samp {
    font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }
  :not(pre) > code {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 0.92em;
    color: var(--soft-ink);
  }
  pre {
    background: var(--code);
    color: var(--code-fg);
    padding: 14px 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0 0 16px;
    font-size: 0.88rem;
    line-height: 1.55;
  }
  pre code {
    background: transparent !important;
    color: inherit;
    padding: 0;
    border: 0;
    border-radius: 0;
    font-size: inherit;
  }
  /* Override hljs theme to fit the dark code block on light pages. */
  pre code.hljs { background: transparent !important; color: var(--code-fg); }

  .mermaid {
    background: var(--softer);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 16px;
    margin: 0 0 16px;
    text-align: center;
  }

  /* Smooth scrolling without the topbar covering targets. */
  :target { scroll-margin-top: 76px; }
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-inner">
    <span class="topbar-title">SMART Health Check-in 1.0 — Draft Spec</span>
    <a href="./index.html">Overview</a>
    <a href="./smart-model-explainer.html">Model explainer</a>
    <a href="./wire-protocol-explainer.html">Wire protocol</a>
    <a href="./verifier/">Verifier demo</a>
    <a href="./spec.md">View raw .md</a>
    <a href="https://github.com/jmandel/smart-health-checkin-mdoc" target="_blank" rel="noopener">GitHub</a>
  </div>
</div>

<div class="layout">
  <aside class="toc" aria-label="Spec contents">
    <h2>Contents</h2>
    <ul>
${tocItems}
    </ul>
  </aside>

  <main>
    <section class="hero">
      <div class="eyebrow">SMART Health Check-in</div>
      <h1>Draft Specification 1.0</h1>
      <p>${escapeHtml(docDescription)}</p>
    </section>

    <article class="spec-body">
${body}
    </article>
  </main>
</div>

<script type="module">
  // Syntax highlighting via highlight.js (CDN, ESM build)
  import hljs from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/highlight.min.js";
  import typescript from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/typescript.min.js";
  import json from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/json.min.js";
  import bash from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/bash.min.js";
  import xml from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/xml.min.js";
  import yaml from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/yaml.min.js";
  import javascript from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/javascript.min.js";
  import plaintext from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/es/languages/plaintext.min.js";
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("ts", typescript);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("sh", bash);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("html", xml);
  hljs.registerLanguage("yaml", yaml);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("js", javascript);
  hljs.registerLanguage("text", plaintext);
  hljs.registerLanguage("plaintext", plaintext);
  // CDDL has no first-class hljs grammar; treat as plaintext to keep formatting.
  hljs.registerLanguage("cddl", plaintext);
  document.querySelectorAll("pre code.hljs").forEach((el) => {
    try { hljs.highlightElement(el); } catch (e) { console.warn("hljs failed", e); }
  });
</script>

<script type="module">
  // Mermaid diagrams (only initialized if any .mermaid blocks are present).
  if (document.querySelector(".mermaid")) {
    const { default: mermaid } = await import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs");
    const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
    mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "neutral", securityLevel: "strict" });
    try {
      await mermaid.run({ querySelector: ".mermaid" });
    } catch (e) {
      console.warn("mermaid.run failed", e);
    }
  }
</script>
</body>
</html>
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html);
console.log(
  `Rendered ${headings.length} headings, ${md.length.toLocaleString()} chars markdown -> ${outputPath} (${html.length.toLocaleString()} bytes).`,
);
