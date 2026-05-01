# Headache summary SVGs

Small library of self-contained SVG charts for the "AI-generated patient summary"
free-text answer in the chronic-migraine demo. Designed to be base64-inlined into
a Markdown blob and rendered on the verifier (provider) side at sizes ranging
from a 600 px desktop preview down to roughly 200 px on a phone.

## Files

| Slug                  | viewBox        | Raw   | Base64 | What it shows                                              |
|-----------------------|----------------|-------|--------|------------------------------------------------------------|
| migraine-days-bar     | 0 0 600 240    | 4.4 K | 5.9 K  | 12 weekly bars, teal→coral ramp, weekly average annotation |
| severity-trend        | 0 0 600 200    | 3.9 K | 5.2 K  | 90-day daily severity 0–10 with severe-threshold dashed line |
| acute-meds-heatmap    | 0 0 600 240    | 10.3K | 13.8 K | 13 × 7 calendar of acute-med days plus 10 d/mo callout     |
| trigger-pareto        | 0 0 600 220    | 2.9 K | 3.8 K  | Horizontal Pareto of top 5 self-logged triggers            |
| function-donut        | 0 0 600 220    | 2.7 K | 3.6 K  | 71% donut "days fully functional" with breakdown legend    |

Total raw: ~24.4 KB; total base64: ~32.5 KB. Comfortably fits in one Markdown
field even after inlining.

## Palette

Picked from the suggested set, kept to three accent colors plus the standard
ink / muted / soft-line trio:

- Ink `#1f2937`, Muted `#64748b`, Soft line `#e2e8f0`, Bg tint `#f8fafc`.
- Cool: teal `#14b8a6` (function donut, "low" bars) and sky `#0ea5e9` /
  `#38bdf8` / `#7dd3fc` / `#bae6fd` / `#e0f2fe` (severity line, trigger Pareto).
- Warm: amber `#f59e0b` (med heatmap), orange `#fb923c` / `#f97316` (high migraine
  days), red `#ef4444` (severe-spike dots, bedridden segment).

The teal-vs-amber and teal-vs-coral pairings carry the "low/good vs high/bad"
visual contrast without leaning corporate or alarmist.

## Sizing decisions

- viewBox heights vary by chart but the width is locked at 600 to keep aspect
  consistent in the preview grid.
- Minimum text size is 11 px in the SVG coordinate system; titles are 14 px and
  the donut percentage is 44 px. At a rendered width of 200 px (≈0.33× scale)
  that puts axis labels at roughly 7–8 CSS px on a hidpi phone, which is the
  smallest we could reasonably go without losing legibility.
- Strokes are 1 px for axes / gridlines and 1.5 px for the severity sparkline,
  per the brief.
- Grids are deliberately sparse: at most one or two reference lines per chart.

## Files in this directory

- `*.svg` — the five graphics, each with `<title>` + `<desc>` and inline
  `<style>`. No external font, image or stylesheet references.
- `manifest.json` — programmatic index (slug, viewBox, byteCount, summary).
- `preview.html` — opens all SVGs side-by-side at 600 / 300 / 200 / 120 px so
  legibility at small sizes can be eyeballed.
- `encode.ts` — `bun encode.ts` (or `bun encode.ts <slug>`) prints a Markdown
  image line per SVG using a `data:image/svg+xml;base64,…` URL.

## Regenerating the encoded forms

```bash
bun encode.ts                 # prints all five
bun encode.ts function-donut  # prints just one
```

The script reads each `.svg` in this directory, base64-encodes it, and emits
`![alt](data:image/svg+xml;base64,…)` lines ready to paste into the AI summary
Markdown.

## Data caveat

All numbers are demonstration data (e.g. `2,3,4,2,5,6,3,4,5,3,2,2` migraine
days/wk). They are deliberately generic — no patient-identifying specifics.
