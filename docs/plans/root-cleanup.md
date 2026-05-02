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
| `wallet-android/` | Android Gradle app and library modules. | Yes |
| `fixtures/` | Shared checked-in fixtures used by TS, Android, Python, and Pages. | Yes |
| `matcher/` | Rust WASM matcher built by Android Gradle from sibling `../matcher`. | Yes for now |
| `vendor/` | Pinned upstream reference metadata and scripts; `_src` is ignored. | Yes for now |
| `capture/` | Developer-only browser/Android capture scripts and ignored outputs. | Move later |
| `fixtures-tool/` | Developer-only Python fixture generation/checking sidecar. | Move later |
| `matcher-c/` | Diagnostic C always-match WASM matcher. | Move later |
| `_site/`, `rp-web/dist/`, `node_modules`, Gradle/Rust/Python caches | Generated artifacts. | No, ignored only |
| `.env` | Local build/deploy environment input. | No, ignored only |
| `.agents/` | Local/project agent skill content. | Decide explicitly |

## Proposed target layout

First pass target:

```text
.github/
docs/
fixtures/
matcher/
rp-web/
scripts/
site/
vendor/
wallet-android/
README.md
.gitignore
```

Optional second pass:

```text
tools/capture/
tools/fixtures-tool/
tools/matcher-c/
```

This keeps active product roots and shared fixtures visible while moving
debug/developer-only tooling out of the top level.

## Cleanup sequence

1. Finish the current `docs/` and `site/` move.
   - Keep active markdown specs under `docs/`.
   - Keep static Pages source HTML under `site/`.
   - Fix relative links in moved docs, especially archive/research references.
   - Keep public Pages URLs stable by updating only source paths, not output
     paths.

2. Document the root contract in `README.md`.
   - Explain which top-level paths are product roots, shared fixtures,
     documentation/static site sources, automation, and reference/developer
     tooling.
   - Make it clear that new one-off tools should not be added directly to root.

3. Clean generated clutter without moving source.
   - Confirm ignored generated paths include `_site/`, `rp-web/dist/`,
     `rp-web/node_modules/`, `matcher/target/`, Gradle build/cache outputs,
     Python venv/cache, capture output folders, and `vendor/_src/`.
   - Optionally add a safe `scripts/clean-generated.sh` that removes only
     ignored generated artifacts.
   - Do not delete or move checked-in fixtures.

4. Move low-risk developer-only tools in a separate commit.
   - Move `capture/` to `tools/capture/`.
   - Move `fixtures-tool/` to `tools/fixtures-tool/`.
   - Move `matcher-c/` to `tools/matcher-c/`.
   - Update docs, scripts, and relative paths that refer to these directories.
   - Pay particular attention to paths from `fixtures-tool` to `../fixtures`
     and scripts under `vendor/scripts`.

5. Defer any `matcher/` move.
   - `wallet-android/app/build.gradle` currently builds the Rust matcher from
     sibling `../matcher` and copies the output into Android assets.
   - If `matcher/` is moved, do it as its own isolated change with Gradle,
     documentation, and Android validation updates.

6. Decide what to do with `.agents/`.
   - If project skills are intended to be shared, commit them deliberately.
   - Otherwise add `.agents/` to `.gitignore`.

## Validation plan

Run the relevant checks after each cleanup commit:

```sh
scripts/build-pages.sh

cd rp-web
bun test
bun run build

cd ../matcher
cargo test

cd ../wallet-android
./gradlew :app:testDebugUnitTest --no-daemon

cd ..
bash vendor/scripts/regenerate-local-fixtures.sh
```

For a `matcher/` relocation, also run:

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
