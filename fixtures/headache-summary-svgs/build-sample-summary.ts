#!/usr/bin/env bun
/**
 * Builds a sample "AI-generated 90-day check-in" markdown summary with the
 * SVG charts embedded as base64 data URLs, then renders it to a self-contained
 * HTML file using `marked` so we can preview in a browser.
 *
 * Outputs:
 *   sample-summary.md     — markdown source (the kind of thing the wallet
 *                            would prefill into a free-text questionnaire item)
 *   sample-summary.html   — self-contained HTML preview
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));

function dataUrl(slug: string): string {
  const raw = readFileSync(join(here, `${slug}.svg`));
  return `data:image/svg+xml;base64,${raw.toString("base64")}`;
}

const md = `# How I've been since the last visit

**TL;DR.** Slightly better month-over-month. Migraine-day count is still
elevated but trending down; severity peaks are fewer; acute medication days
are riding the edge of the 10-day-per-month threshold and need a closer look.

## Migraine days, last 12 weeks

Average **3.4 migraine days/week** over the last 12 weeks, ranging from 1 to
6. The most recent four weeks averaged **2.8 days/week** — that's the lowest
4-week stretch in this look-back.

![Migraine days per week, last 12 weeks](${dataUrl("migraine-days-bar")})

## Daily severity, last 90 days

Most days were mild-to-moderate (severity ≤ 4). Five days crossed into
**severe** territory (≥ 7) — three of those were clustered around weeks 6–7,
the rest were isolated.

![Daily headache severity 0-10, last 90 days](${dataUrl("severity-trend")})

## Acute medication use

Took acute headache medicine on **27 of the last 90 days**. The most recent
30 days included **12 days** of acute meds — above the 10-day-per-month
threshold for medication overuse, which is worth discussing.

![Acute medication days calendar, last 13 weeks](${dataUrl("acute-meds-heatmap")})

## What seems to set them off

The pattern from my self-logging:

![Top self-logged migraine triggers](${dataUrl("trigger-pareto")})

- **Sleep loss** is the dominant trigger — usually the night before a migraine
  day.
- **Stress** and **skipped meals** tie for second.
- **Caffeine** changes (skipped morning coffee, or extra afternoon coffee)
  are a smaller but real factor.
- **Hormonal** is at the bottom but consistently present around the cycle.

## Function

Across the 90 days, **71% of days were fully functional** — no missed work,
no canceled plans, no significant impairment.

![Percent of days fully functional](${dataUrl("function-donut")})

## What I want to talk about today

1. Whether the acute-med days/month is high enough to change the preventive
   plan.
2. Whether the trigger pattern around sleep loss suggests anything we can act
   on (CBT-i? schedule changes?).
3. A backup acute plan for the severe spikes — the standard dose isn't always
   cutting it within two hours.

> *This summary was generated from my self-tracking data. Numbers are
> rounded. Happy to drill into any of these or share the raw log.*
`;

writeFileSync(join(here, "sample-summary.md"), md);

const bodyHtml = await marked.parse(md, { async: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>How I've been since the last visit — preview</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1f2937;
    --muted: #64748b;
    --line: #e2e8f0;
    --bg: #f8fafc;
    --panel: #ffffff;
    --accent: #0ea5e9;
  }
  body {
    margin: 0;
    background: var(--bg);
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: var(--ink);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  main {
    max-width: 740px;
    margin: 32px auto;
    padding: 32px 40px;
    background: var(--panel);
    border-radius: 18px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
  }
  h1, h2, h3 { color: var(--ink); line-height: 1.2; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  h2 { font-size: 19px; margin: 32px 0 8px; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  p { margin: 8px 0 14px; }
  ul, ol { padding-left: 20px; margin: 8px 0 14px; }
  li { margin: 4px 0; }
  img { display: block; max-width: 100%; height: auto; margin: 6px 0 14px; }
  blockquote {
    border-left: 3px solid var(--line);
    margin: 14px 0;
    padding: 4px 14px;
    color: var(--muted);
    font-style: italic;
  }
  strong { color: var(--ink); }
  hr { border: 0; border-top: 1px solid var(--line); margin: 24px 0; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  .source {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px dashed var(--line);
    color: var(--muted);
    font-size: 12px;
  }
</style>
</head>
<body>
<main>
${bodyHtml}
<div class="source">Preview rendered from sample-summary.md • ${new Date().toISOString()}</div>
</main>
</body>
</html>
`;

writeFileSync(join(here, "sample-summary.html"), html);

console.log("Wrote:");
console.log("  sample-summary.md");
console.log("  sample-summary.html");
