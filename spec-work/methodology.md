# Methodology: turning a working implementation into a complete specification

This playbook describes the workflow used in this repository to turn a working
implementation into a complete plain-Markdown specification while preserving
traceability from working code, docs, fixtures, and design decisions.

The method assumes a project starts with:

- a working implementation or prototype;
- code, tests, fixtures, and developer docs that encode real behavior;
- optionally, an existing outline of the desired specification;
- enough repository history or notes to identify decisions that replaced older
  experiments.

The output is a detailed outline, a dependency tree, a reviewable set of
retained drafting artifacts, and a canonical Markdown specification.

## Core idea

Specification writing is treated as a dependency-ordered synthesis problem.

1. Audit the implementation, docs, tests, fixtures, generated content, and
   historical notes to understand current behavior.
2. Write a detailed specification outline that captures the protocol surface,
   section structure, normative/informative split, examples, appendices, and
   unresolved issues.
3. Convert the outline into a dependency tree.
4. Work only on one or two cutpoints at a time.
5. For each cutpoint, run five independent draft attempts.
6. Run an organizer/adjudicator over the five attempts.
7. Have the orchestrator review and, if necessary, lightly patch the organizer's
   canonical result.
8. Mark the cutpoint complete only after the canonical content and review record
   are retained.
9. Do not draft dependent cutpoints canonically until all prerequisites are
   canonical.

This keeps parallelism high without letting later text drift away from earlier
foundational decisions.

## Roles

### Orchestrator

The orchestrator owns the global dependency tree, launches subagents, tracks
progress, and decides when a dependency is complete.

The orchestrator:

- runs the initial repository audit and detailed-outline generation;
- reads the outline and current dependency tree;
- selects the next eligible cutpoint or at most two independent cutpoints;
- starts five draft agents for each selected cutpoint;
- starts one organizer agent after all five drafts are present;
- reviews organizer output against prerequisite canonical files and active repo
  behavior;
- writes a small orchestrator review file for every accepted cutpoint;
- updates progress tracking;
- decides when a capture, fixture refresh, or implementation audit is needed.

### Draft agents

Draft agents write independent attempts for one cutpoint. They should not know
what other draft agents are writing. Their job is to explore useful framing and
wording, not to produce the final answer.

Draft agents:

- read the outline, dependency tree, and canonical prerequisite files;
- write exactly one numbered attempt file;
- do not edit other attempts or canonical files;
- include a short "Organizer notes" section with strengths, caveats, and
  downstream implications.

### Organizer/adjudicator agent

The organizer reads all attempts for one cutpoint and produces one canonical
section plus an adjudication log.

The organizer:

- compares all five attempts;
- researches contradictions against the active repo, docs, code, tests, and
  fixtures;
- resolves claims based on evidence, not majority vote;
- writes `adjudication.md`;
- writes `canonical.md`;
- identifies blocking unresolved issues only when they truly block the cutpoint.

### Human reviewer

The human reviewer can:

- correct scope or terminology;
- provide missing captures or empirical evidence;
- approve or redirect dependency ordering;
- decide policy questions that cannot be inferred from the repo.

## File layout

Use a stable `spec-work/` tree. Keep every draft and adjudication artifact.

```text
spec.md.outline
spec.md.outline.dependency_tree
spec-work/
  methodology.md
  outline-audit.md
  t1a-editorial-terminology/
    attempt-01.md
    attempt-02.md
    attempt-03.md
    attempt-04.md
    attempt-05.md
    adjudication.md
    canonical.md
    orchestrator-review.md
  t1b-purpose-scope-goals/
    attempt-01.md
    ...
```

Recommended naming:

```text
spec-work/<tranche><cutpoint>-<short-slug>/attempt-01.md
spec-work/<tranche><cutpoint>-<short-slug>/attempt-02.md
spec-work/<tranche><cutpoint>-<short-slug>/attempt-03.md
spec-work/<tranche><cutpoint>-<short-slug>/attempt-04.md
spec-work/<tranche><cutpoint>-<short-slug>/attempt-05.md
spec-work/<tranche><cutpoint>-<short-slug>/adjudication.md
spec-work/<tranche><cutpoint>-<short-slug>/canonical.md
spec-work/<tranche><cutpoint>-<short-slug>/orchestrator-review.md
```

Do not overwrite attempts. If a draft must be re-run, add a suffix such as
`attempt-03-rerun-01.md` and explain why in the adjudication log.

## Phase 0: repository and behavior audit

Before writing an outline or spec prose, identify active behavior. The goal is
to build a cited understanding of how the system works, what is current, and
what is stale.

Suggested inputs:

- README and architecture docs;
- active protocol docs;
- implementation modules;
- test vectors and fixtures;
- issue notes and archived plans;
- generated public docs such as `llms.txt`, if the project has them.

Separate active protocol facts from historical experiments. If archived plans
conflict with implementation and current docs, the organizer should treat them
as historical unless the human reviewer says otherwise.

Example audit prompt:

```text
You are auditing a working implementation before specification drafting.

Repository: <repo-path>

Read all available content that may encode product or protocol behavior:
- README files and architecture docs;
- active protocol docs and explainers;
- implementation code across client, server, native, web, SDK, and tooling
  packages;
- schemas, type definitions, constants, registries, generated files, tests,
  fixtures, and capture artifacts;
- examples, demo configuration, public-site pages, and generated LLM context;
- issue notes, archived plans, and prior design documents.

First, understand how the working implementation behaves end to end. Then
identify:
- active protocol invariants;
- wire identifiers and media types;
- request/response data models;
- end-to-end flows and roles;
- trust and transport boundaries;
- implementation-specific details that should not become protocol requirements;
- fixtures that prove current behavior;
- stale docs or historical experiments that should not drive the spec;
- open questions where current behavior is ambiguous or not implemented.

Write findings to <output-file>. Include citations to files and line ranges
where possible. Do not modify implementation files.
```

Recommended output file:

```text
spec-work/outline-audit.md
```

## Phase 1: detailed outline generation

Use the audit to create a detailed outline before dependency tranching. The
outline is not prose for the final spec. It is an information architecture that
names every section the final spec needs, records the intended normative status
of each section, and preserves known protocol facts that later agents must not
lose.

If a project already has an outline, still run this phase as a validation pass:
the agent should propose additions, deletions, or restructuring based on active
implementation behavior.

The outline should follow the shape of `spec.md.outline` in this repository:

- a title naming the specification and version;
- a short conventions block that defines markers such as `(N)`, `(I)`, and
  `(EX)`;
- up-front architectural framing, especially the major payload domains and
  flows;
- numbered sections for front matter, introduction, purpose, architecture,
  conformance, core data models, trust, transport bindings, security, privacy,
  registries, internationalization, implementation notes, worked examples, open
  issues, acknowledgments, and change log, adjusted to fit the project;
- nested numbered subsection placeholders deep enough that later drafting agents
  can work section-by-section without guessing scope;
- example blocks marked explicitly as examples, not normative text;
- appendices for schemas, CDDL/IDL, byte ladders, fixture indexes, compatibility
  notes, or mappings when applicable;
- style notes that capture publication constraints and conformance-checklist
  expectations.

The outline should be specific to the implementation. It should name actual
protocol fields, discriminators, profile identifiers, media types, roles,
cryptographic containers, transports, status codes, registries, and fixture
families when those are already known. It should also call out reserved/future
bindings and unresolved issues without letting them contaminate the version 1.0
normative path.

Example detailed-outline prompt:

```text
You are creating the first detailed outline for a specification from a working
implementation.

Repository: <repo-path>
Audit findings: <outline-audit-file, if present>
Optional existing outline: <outline-file, if present>

Read the repository broadly before writing:
- README files, architecture docs, protocol docs, explainers, and public-site
  content;
- implementation code across all relevant packages and platforms;
- tests, schemas, generated vectors, captures, fixtures, examples, and demo
  data;
- archived plans or issue notes, treating them as historical when they conflict
  with active code/docs unless a human says otherwise.

Infer how the system works end to end. Then write <outline-file> as a detailed
single-spec outline, not final prose.

The outline MUST:
- start with a title of the form "<project/protocol name> <version> —
  single-page specification: outline";
- include a conventions block explaining normative `(N)`, informative `(I)`,
  and examples `(EX)` markers and any conformance-keyword policy;
- state the core architectural framing in a few bullets before section 1;
- use stable numeric sections and nested subsections;
- include front matter, introduction, purpose/problem/goals, architecture,
  conformance, each core request/response or data-model section, trust,
  transport/binding sections, security, privacy, registries, internationalization
  if relevant, implementation notes, worked examples, open issues, acknowledgments,
  change log, and appendices;
- mark each section or major subsection as normative, informative, or example
  material;
- name actual fields, constants, identifiers, media types, roles, protocol
  containers, status codes, and registries discovered in the implementation;
- separate protocol requirements from implementation-specific SDK/UI/platform
  guidance;
- include examples and appendices needed for a conformance suite, fixture index,
  byte ladder, schemas, CDDL/IDL, or compatibility notes;
- record future/reserved bindings separately from the current required flow;
- include style notes for the eventual Markdown source, cross-reference style,
  and one-row-per-rule conformance checklist expectations.

The outline MUST NOT:
- write the full specification prose;
- invent protocol behavior not grounded in implementation, docs, fixtures, or
  explicit human direction;
- preserve stale planning assumptions when active behavior has superseded them;
- make examples normative;
- hide unresolved issues by choosing speculative answers.

Where implementation evidence is uncertain, include an "Open issues / future
work" item or an explicit placeholder subsection.
```

## Phase 2: outline dependency tree

Convert the outline into a tranche tree. A tranche is a set of cutpoints that can
be completed after the previous tranche is canonical.

Good dependency rules:

- terminology and scope before architecture;
- request model before response model;
- request/response before transport bindings;
- base same-device flow before kiosk wrapper;
- normative core before security/privacy closure;
- normative closure before examples and implementation notes;
- examples before final fixture index;
- final publication or Markdown pass last.

The dependency tree should include:

- a top-level tree;
- detailed membership for each cutpoint;
- dependency edges;
- organizer focus notes;
- parallel drafting batch recommendations.

Example dependency-tree prompt:

```text
Read <outline-file>. Create <outline-file>.dependency_tree.

Represent the work as ordered tranches and cutpoints. For each cutpoint, list:
- included outline sections;
- dependencies;
- downstream sections it blocks;
- organizer focus;
- any known active protocol facts that must be preserved.

Assume the source-of-truth spec is plain Markdown. Do not assume Bikeshed, HTML,
or generated anchors.
```

## Phase 3: five independent drafts per cutpoint

For each eligible cutpoint, launch five independent draft agents. Use a mix of
models if available. The goal is not consensus; it is useful diversity.

Every draft agent gets:

- the outline;
- the dependency tree;
- all canonical prerequisite files;
- useful adjudication or orchestrator-review files from prerequisites;
- active protocol facts that must be preserved;
- the exact output filename it must write.

Every draft agent is told:

- write only its numbered attempt file;
- do not modify other files;
- stay within the cutpoint scope;
- use prerequisite terminology exactly unless a problem is noted;
- include organizer notes;
- avoid implementation logs.

### Draft agent prompt template

```text
You are drafting one independent attempt for the <project-name> Markdown
specification. Work in repository <repo-path>.

Cutpoint: <cutpoint-id> <cutpoint-title>.

Read these inputs first:
- <outline-file>
- <dependency-tree-file>
- <dependency-canonical-1>
- <dependency-adjudication-or-review-1>
- <dependency-canonical-2>
- ...

Your output file MUST be exactly:
<cutpoint-dir>/attempt-<NN>.md

Create parent dirs if needed. Do not modify any other files.

Scope for this draft:
- <outline section or subsection>
- <outline section or subsection>
- ...

Active protocol facts to preserve:
- <fact 1>
- <fact 2>
- ...

Drafting goal:
Produce high-quality Markdown prose for the eventual spec, using accepted
terminology from prerequisite canonical files. This is attempt <NN> of 05, so be
independent and opinionated. Include section numbers/headings matching the
outline. Stay within this cutpoint; do not duplicate deep details that belong in
dependent sections. Include an "Organizer notes" section at the end with
strengths, caveats, and downstream dependencies. Do not include implementation
logs.
```

### Draft prompt additions for normative cutpoints

For normative cutpoints, add:

```text
For every SHALL/SHOULD/MAY requirement you propose, identify:
- conformance target;
- reason it is needed for interop;
- any schema/CDDL/test implication.

Do not invent requirements merely because they are good implementation advice.
If a requirement depends on deployment policy, label it as policy guidance or
defer it to the appropriate section.
```

## Phase 4: organizer/adjudicator synthesis

The organizer starts only after all five attempt files exist.

The organizer must be allowed to research. If attempts disagree about a field,
wire value, cryptographic step, role name, or semantic rule, the organizer reads
repo code/docs/fixtures to resolve the point.

Organizer output:

- `adjudication.md`
- `canonical.md`

### Organizer prompt template

```text
You are the organizer/adjudicator for cutpoint <cutpoint-id> of the
<project-name> Markdown specification.

Repository: <repo-path>

Inputs to read:
- <outline-file>
- <dependency-tree-file>
- <dependency-canonical-1>
- <dependency-adjudication-or-review-1>
- ...
- <cutpoint-dir>/attempt-01.md
- <cutpoint-dir>/attempt-02.md
- <cutpoint-dir>/attempt-03.md
- <cutpoint-dir>/attempt-04.md
- <cutpoint-dir>/attempt-05.md

You MUST write exactly these new/updated output files:
- <cutpoint-dir>/adjudication.md
- <cutpoint-dir>/canonical.md

Do not modify the five attempt files. Do not commit.

Your job is to adjudicate, not merely summarize. Compare all five attempts;
identify contradictions, overreach, missing scope, and useful language. When
attempts disagree or make claims about active protocol details, research the
repo as needed using code/docs/fixtures. Resolve against the active repo and
accepted prerequisite terminology, not majority vote.

Cutpoint scope:
- <scope item>
- <scope item>
- ...

Active protocol facts to preserve:
- <fact>
- <fact>
- ...

adjudication.md requirements:
- list the five attempts reviewed;
- summarize strongest contributions from each attempt;
- identify contradictions and how you resolved them, with citations to repo
  files/sections when possible;
- list terminology or scope decisions that downstream sections must preserve;
- list open issues only if genuinely unresolved and blocking.

canonical.md requirements:
- write polished Markdown ready to be inserted into the eventual spec;
- include section numbering/headings matching the outline;
- include only this cutpoint's scope;
- use prerequisite terminology exactly unless you explain a necessary refinement
  in adjudication.md;
- for normative cutpoints, include conformance-target-aware requirements and
  note schema/CDDL/fixture implications where appropriate;
- do not duplicate deep details that belong in other sections.

At the end of your response, report the files written and any blocking issues.
```

## Phase 5: orchestrator review

The orchestrator reads:

- organizer response;
- `adjudication.md`;
- `canonical.md`;
- relevant prerequisite canonical files;
- active implementation/docs if a claim looks suspicious.

The orchestrator may make small edits to `canonical.md` to fix:

- scope creep;
- terminology drift;
- reintroduction of stale implementation concepts;
- rendered-output assumptions when Markdown is the source of truth;
- accidental contradiction with accepted upstream canonicals.

The orchestrator then writes `orchestrator-review.md`.

### Orchestrator review template

```markdown
# <cutpoint-id> orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- <important prerequisite canonical files>

Decision: <accepted | needs organizer follow-up | blocked>.

Edits applied:

1. <edit or "None">
2. <edit>

Blocking issues:

- <none, or concrete blocker>

Downstream notes:

- <terms/decisions later sections must preserve>
- <schema/CDDL/fixture/capture implications>
```

If the organizer misses major issues, do not silently patch everything. Send a
targeted follow-up to the organizer or re-run the organizer with stricter
instructions. Keep the failed or superseded output for provenance.

## Phase 6: dependency completion and next cutpoint selection

A cutpoint is complete when all files exist:

- five attempts;
- adjudication;
- canonical;
- orchestrator review.

For a dependent cutpoint, draft agents must read all completed prerequisite
canonicals.

Example:

- T1.C reads T1.A and T1.B canonical outputs.
- T2.A reads all T1 canonical outputs.
- T3.B reads T1, T2.A, T2.B, and T3.A canonical outputs.
- T4.B reads T1, T2, T3, and T4.A canonical outputs.

When two cutpoints are independent under the dependency tree, the orchestrator
may run both in parallel. Keep the total active work bounded: one or two
cutpoints at a time, with five draft agents plus one organizer per cutpoint.

## Phase 7: integration into the spec

After a tranche is complete, integrate canonical sections into the draft spec in
section order.

Integration checks:

- headings match `spec.md.outline`;
- section numbers are stable;
- cross-references point to existing sections;
- terminology matches upstream canonical sections;
- normative text has clear conformance targets;
- examples do not create hidden requirements;
- appendices do not introduce behavior absent from normative sections.

For a plain Markdown source-of-truth, prefer readable source over generated
cleverness. Avoid hidden preprocessing unless the project later explicitly
adopts a publication toolchain.

## Phase 8: validation against implementation

As each tranche becomes canonical, compare it against the working
implementation.

Suggested checks:

- code constants match spec identifiers;
- validators accept and reject shapes described by the spec;
- tests cover important conformance rules;
- fixtures still represent current behavior or are clearly labeled historical;
- public docs and generated LLM context do not contradict the spec;
- examples round-trip through available encoders/decoders when practical.

When a spec change intentionally moves beyond current implementation, record the
implementation gap as a follow-up rather than silently changing the spec to match
old behavior.

## Capture and fixture policy

Do not request a new platform capture for every prose change.

Request a new capture when:

- wire bytes or envelope structure changed;
- platform behavior is unknown and affects normative text;
- a fixture is currently treated as current canonical evidence but shows stale
  request/response shape;
- an example byte ladder must be generated from fresh real-world behavior.

Do not request a new capture when:

- only explanatory wording changed;
- the active generated vectors already cover the updated shape;
- stale fixtures are intentionally preserved as historical captures and tests
  treat them that way.

When a new capture is needed, write a capture request that states:

- exact app/page/build to use;
- exact flow to perform;
- expected request shape;
- artifacts to save;
- how the capture will be validated;
- which fixture paths will be replaced.

## Progress tracking

Use any task tracker, but keep it aligned with files on disk.

Recommended statuses:

- `pending`: cutpoint not started;
- `in_progress`: draft or organizer agents are active;
- `done`: all retained artifacts exist and orchestrator accepted the canonical;
- `blocked`: human decision, missing capture, or unresolved contradiction is
  required.

Do not mark a dependency as done merely because five drafts exist. The organizer
and orchestrator review are part of completion.

## Quality bar for canonical sections

Canonical sections should be:

- faithful to the active implementation unless intentionally specifying the next
  target behavior;
- precise enough for independent implementers;
- scoped to their outline cutpoint;
- consistent with all prerequisite canonical sections;
- clear about conformance targets;
- free of hidden dependencies on implementation language, SDK shape, or demo UI;
- useful to write schemas, CDDL, fixtures, and certification tests later.

## Common failure modes

Avoid these:

- accepting majority wording when one attempt matches the implementation and four
  repeat a stale assumption;
- letting examples define behavior not stated normatively;
- using package-specific demo terms as protocol objects;
- treating kiosk as a separate clinical protocol instead of a wrapper around the
  same-device presentation flow;
- reintroducing stale selector shapes such as object-valued `profilesFrom`;
- moving platform-specific Android/iOS implementation details into the
  platform-neutral protocol core;
- completing a dependent cutpoint before prerequisite canonicals are accepted;
- losing attempt files or overwriting the evidence trail.

## Minimal repeatable workflow checklist

For each cutpoint:

1. Confirm dependencies are complete.
2. Create `spec-work/<cutpoint>/`.
3. Launch five draft agents with numbered output files.
4. Wait for all five files.
5. Launch organizer with all attempts and all prerequisite canonicals.
6. Review `adjudication.md` and `canonical.md`.
7. Patch only small orchestrator issues or send organizer follow-up.
8. Write `orchestrator-review.md`.
9. Mark the cutpoint complete.
10. Proceed to the next eligible cutpoint.
