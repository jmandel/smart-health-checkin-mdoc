#!/usr/bin/env bun
/**
 * Reads each SVG in this directory and prints a markdown image line
 * with a base64 data URL, one per file.
 *
 * Usage:  bun encode.ts          # prints all
 *         bun encode.ts <slug>   # prints just one (e.g. "function-donut")
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const ALT_TEXT: Record<string, string> = {
  "migraine-days-bar": "Migraine days per week, last 12 weeks",
  "severity-trend": "Daily headache severity 0-10, last 90 days",
  "acute-meds-heatmap": "Acute medication days calendar, last 13 weeks",
  "trigger-pareto": "Top self-logged migraine triggers",
  "function-donut": "Percent of days fully functional",
};

const arg = process.argv[2];

const svgs = readdirSync(here)
  .filter((f) => f.endsWith(".svg"))
  .filter((f) => !arg || basename(f, ".svg") === arg)
  .sort();

if (svgs.length === 0) {
  console.error(arg ? `No SVG matched slug "${arg}"` : "No SVGs found.");
  process.exit(1);
}

for (const file of svgs) {
  const slug = basename(file, ".svg");
  const path = join(here, file);
  const raw = readFileSync(path);
  const base64 = raw.toString("base64");
  const dataUrl = `data:image/svg+xml;base64,${base64}`;
  const alt = ALT_TEXT[slug] ?? slug;
  const bytes = statSync(path).size;
  const b64Bytes = base64.length;

  console.log(`# ${slug}  (raw ${bytes} B, base64 ${b64Bytes} B)`);
  console.log(`![${alt}](${dataUrl})`);
  console.log();
}
