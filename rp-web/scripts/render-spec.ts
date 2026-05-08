#!/usr/bin/env bun
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked, Renderer } from "marked";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

const inputArg = process.argv[2] ?? resolve(ROOT, "spec.md");
const outputArg = process.argv[3] ?? resolve(ROOT, "_site", "spec.html");
const titleArg = process.argv[4];
const descriptionArg = process.argv[5];
const rawHrefArg = process.argv[6];
const heroTitleArg = process.argv[7];

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

const docTitle = titleArg ?? "SMART Health Check-in 1.0 — Draft Spec";
const docDescription =
  descriptionArg ??
  "SMART Health Check-in 1.0 draft: TypeScript/JSDoc clinical model, trust rules and layer separation, same-device org-iso-mdoc flow, and Appendix A diagnostic bridge.";
const rawHref = rawHrefArg ?? "./spec.md";
const heroTitle = heroTitleArg ?? "Draft Specification 1.0";

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
<link rel="stylesheet" href="./smart-design.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github.min.css" />
<style>
  :root {
    color-scheme: light;
    --ink: var(--fg-1);
    --muted: var(--fg-2);
    --soft-ink: var(--gray-800);
    --line: var(--border);
    --soft: var(--bg-alt);
    --softer: var(--gray-0);
    --blue: var(--brand);
    --blue-soft: var(--info-wash);
    --green: var(--success);
    --amber: #8A4F0E;
    --code: var(--bg-alt);
    --code-fg: var(--fg-1);
    --rule: var(--border);
    --measure: 980px;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 1rem; }
  body {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 16.5px;
    line-height: 1.62;
    color: var(--fg-1);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  a {
    color: var(--brand);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out);
  }
  a:hover { color: var(--brand-ink); border-bottom-color: currentColor; }

  /* Doc-level topbar (under the global SMART topbar) */
  .topbar {
    border-bottom: 1px solid var(--border);
    background: var(--bg-alt);
  }
  .topbar-inner {
    max-width: var(--measure);
    margin: 0 auto;
    padding: 10px 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: baseline;
    font-size: 13px;
  }
  .topbar-title {
    font-weight: 700;
    color: var(--gray-800);
    letter-spacing: var(--tracking-snug);
    margin-right: auto;
  }
  .topbar a {
    color: var(--fg-2);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    font-weight: 600;
  }
  .topbar a:hover { color: var(--brand-ink); border-bottom-color: var(--brand); }

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
    font-size: 13.5px;
    color: var(--fg-2);
    line-height: 1.5;
  }
  @media (min-width: 1100px) {
    .toc {
      position: sticky;
      top: 12px;
      align-self: start;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding-top: 28px;
      border-right: 1px solid var(--border);
      padding-right: 16px;
    }
  }
  .toc h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--fg-mark);
    font-weight: 700;
    margin: 0 0 var(--space-3);
  }
  .toc ul { list-style: none; padding: 0; margin: 0 0 var(--space-4); }
  .toc li { margin: 2px 0; }
  .toc a {
    color: var(--fg-2);
    text-decoration: none;
    display: block;
    padding: 2px 0;
    border-left: 2px solid transparent;
    padding-left: 10px;
    border-bottom: 0;
    font-weight: 500;
  }
  .toc a:hover { color: var(--brand-ink); border-left-color: var(--brand); border-bottom-color: transparent; }
  .toc-l3 { padding-left: 14px; font-size: 12.5px; color: var(--fg-3); }
  .toc-l3 a { color: var(--fg-3); }

  main { min-width: 0; padding-top: 28px; }
  .hero {
    border-bottom: 1px solid var(--border);
    padding-bottom: var(--space-5);
    margin-bottom: var(--space-6);
  }
  .hero .eyebrow {
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--brand);
    font-weight: 700;
    margin-bottom: var(--space-2);
  }
  .hero h1 {
    font-size: clamp(2rem, 3.8vw, 3rem);
    line-height: var(--lh-tight);
    letter-spacing: var(--tracking-tight);
    margin: 0 0 var(--space-2);
    color: var(--fg-1);
    font-weight: 800;
  }
  .hero p { color: var(--fg-2); margin: 0; max-width: 680px; font-size: var(--fs-md); line-height: var(--lh-relaxed); }

  h1, h2, h3, h4, h5, h6 { line-height: 1.22; color: var(--fg-1); }
  h1 { margin: 0 0 var(--space-3); font-weight: 800; letter-spacing: var(--tracking-tight); }
  h2 {
    font-size: 1.5rem;
    margin: var(--space-7) 0 var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border);
    font-weight: 700;
    letter-spacing: var(--tracking-snug);
  }
  h3 { font-size: var(--fs-lg); margin: var(--space-6) 0 var(--space-2); font-weight: 600; }
  h4 { font-size: var(--fs-md); margin: var(--space-5) 0 var(--space-2); color: var(--gray-800); font-weight: 600; }
  h5, h6 { font-size: var(--fs-base); margin: var(--space-4) 0 var(--space-2); color: var(--gray-800); font-weight: 600; }

  h2 .anchor, h3 .anchor, h4 .anchor {
    color: var(--border-strong);
    text-decoration: none;
    margin-right: 8px;
    font-weight: 400;
    opacity: 0;
    transition: opacity 80ms ease;
    border-bottom: 0;
  }
  h2:hover .anchor, h3:hover .anchor, h4:hover .anchor { opacity: 1; }

  p { margin: 0 0 var(--space-3); }
  ul, ol { padding-left: 22px; margin: 0 0 var(--space-3); }
  li { margin: 4px 0; }
  li > p { margin: 0 0 6px; }
  blockquote {
    margin: 0 0 var(--space-4);
    padding: 12px 18px;
    border-left: 3px solid var(--brand);
    background: var(--info-wash);
    color: var(--gray-800);
    border-radius: var(--radius-md);
  }
  blockquote p:last-child { margin-bottom: 0; }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: var(--space-7) 0;
  }

  table {
    border-collapse: collapse;
    margin: 0 0 var(--space-5);
    width: 100%;
    font-size: var(--fs-sm);
    overflow: auto;
    display: block;
  }
  thead { background: var(--bg-alt); }
  th, td {
    border: 1px solid var(--border);
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }
  th {
    color: var(--fg-mark);
    font-weight: 700;
    font-size: 12px;
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  code, pre, kbd, samp { font-family: var(--font-mono); }
  :not(pre) > code {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1px 6px;
    font-size: 0.92em;
    color: var(--gray-800);
  }
  pre {
    background: var(--bg-alt);
    color: var(--fg-1);
    border: 1px solid var(--border);
    padding: 14px 16px;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 0 0 var(--space-4);
    font-size: var(--fs-sm);
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
  /* Keep all code and text blocks visually light to match the rendered spec. */
  pre code.hljs { background: transparent !important; color: var(--code-fg); }

  .mermaid {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    margin: 0 0 var(--space-4);
    text-align: center;
  }

  /* Smooth scrolling without the topbar covering targets. */
  :target { scroll-margin-top: 80px; }
</style>
</head>
<body>
<div data-smart-topbar></div>

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
      <h1>${escapeHtml(heroTitle)}</h1>
      <p>${escapeHtml(docDescription)}</p>
    </section>

    <article class="spec-body">
${body}
    </article>
  </main>
</div>

<div data-smart-footer></div>
<script src="./smart-chrome.js" defer></script>

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
