# Repository root cleanup plan

## Problem

The repository root has accumulated active product code, documentation, static
site sources, shared fixtures, capture/debug tooling, reference tooling, and
generated artifacts. Some cleanup is already in progress: active docs are being
moved under `docs/`, static Pages source HTML under `site/`, and Android code is
being split into reusable Gradle modules.

The cleanup should make the root easier to understand without breaking Pages
deployment, Android Gradle wiring, fixture paths, or existing tests.

## Current root roles

| Path | Role | Keep at root? |
| --- | --- | --- |
| `.github/` | GitHub Actions workflows, including Pages deploy. | Yes |
| `README.md`, `.gitignore` | Root entry docs and ignore policy. | Yes |
| `docs/` | Active specs, plans, profiles, research, archive. | Yes |
| `site/` | Static GitHub Pages source HTML. | Yes |
| `scripts/` | Repo-level automation such as Pages build and Android handler pull. | Yes |
| `rp-web/` | Bun/React relying-party verifier, SDK, kiosk pages, TS tests/tools. | Yes |
| `wallet-android/` | Android Gradle app/library modules and app-owned Rust matcher at `wallet-android/app/matcher-rs/`. | Yes |
| `fixtures/` | Shared checked-in fixtures used by TS, Android, Python, and Pages. | Yes |
| `vendor/` | Pinned upstream reference metadata and scripts; `_src` is ignored. | Yes for now |
| `tools/capture/` | Developer-only browser/Android capture scripts and ignored outputs. | No top-level clutter |
| `tools/fixtures-tool/` | Developer-only Python fixture generation/checking sidecar. | No top-level clutter |
| `tools/matcher-c/` | Diagnostic C always-match WASM matcher. | No top-level clutter |
| `_site/`, `rp-web/dist/`, `node_modules`, Gradle/Rust/Python caches | Generated artifacts. | No, ignored only |
| `.env` | Local build/deploy environment input. | No, ignored only |
| `.agents/` | Local/project agent skill content. | Decide explicitly |

## Proposed target layout

First pass target:

```text
.github/
docs/
fixtures/
rp-web/
scripts/
site/
tools/
vendor/
wallet-android/
README.md
.gitignore
```

This keeps active product roots and shared fixtures visible while moving
debug/developer-only tooling out of the top level.

## Cleanup sequence

1. Finish the current `docs/` and `site/` move.
   - Keep active markdown specs under `docs/`.
   - Keep static Pages source HTML under `site/`.
   - Fix relative links in moved docs, especially archive/research references.
   - Public Pages URLs use specific explainer names; legacy generic explainer
     URLs are not preserved.

2. Document the root contract in `README.md`.
   - Explain which top-level paths are product roots, shared fixtures,
     documentation/static site sources, automation, and reference/developer
     tooling.
   - Make it clear that new one-off tools should not be added directly to root.

3. Clean generated clutter without moving source.
   - Confirm ignored generated paths include `_site/`, `rp-web/dist/`,
     `rp-web/node_modules/`, `wallet-android/app/matcher-rs/target/`, Gradle
      build/cache outputs, Python venv/cache, capture output folders, and
      `vendor/_src/`.
   - Add a safe `scripts/clean-generated.sh` that removes only ignored generated
      artifacts.
   - Do not delete or move checked-in fixtures.

4. Move low-risk developer-only tools.
   - Move `capture/` to `tools/capture/`.
   - Move `fixtures-tool/` to `tools/fixtures-tool/`.
   - Move `matcher-c/` to `tools/matcher-c/`.
   - Update docs, scripts, and relative paths that refer to these directories.
   - Pay particular attention to paths from `tools/fixtures-tool` to `../../fixtures`
     and scripts under `vendor/scripts`.

5. Move the Rust matcher into the Android app.
   - `wallet-android/app/build.gradle` builds from `wallet-android/app/matcher-rs`
     and copies the output into Android assets.

6. Keep `.agents/` local-only unless shared skills are intentionally added.

## Validation plan

Run the relevant checks after each cleanup commit:

```sh
scripts/build-pages.sh

cd rp-web
bun test
bun run build

cd ../wallet-android/app/matcher-rs
cargo test

cd ../..
./gradlew :app:testDebugUnitTest --no-daemon

cd ..
bash vendor/scripts/regenerate-local-fixtures.sh
```

Because the Rust matcher is now app-local, also run:

```sh
cd wallet-android
./gradlew :app:assembleDebug --no-daemon
```

## Notes and risks

- Do not flatten `rp-web/`, `wallet-android/`, or `fixtures/`; they are active
  integration surfaces.
- Do not move `site/` without updating `scripts/build-pages.sh`.
- Do not move `fixtures/`; it is referenced by tests, fixture generators,
  inspectors, Android tests, and Pages output.
- Moving developer-only tooling is safer than moving runtime or shared test
  roots, but it still requires path updates and validation.
- Treat the existing worktree moves as user work-in-progress; do not revert
  them while implementing the cleanup.
