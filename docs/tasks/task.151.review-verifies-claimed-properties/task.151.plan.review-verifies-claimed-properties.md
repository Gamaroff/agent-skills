---
id: task.151.plan
title: "Implementation Plan: review-task — stack-neutral pre-pass, executed invariants, released-shape diff"
type: plan
task-ref: task.151.review-verifies-claimed-properties.md
---

# Implementation Plan: review-task — stack-neutral pre-pass, executed invariants, released-shape diff

> Requirements and success criteria: [task.151.review-verifies-claimed-properties.md](task.151.review-verifies-claimed-properties.md)

## Overview

This plan has three independent units and a closing phase:

1. A small pure helper and a slot substitution in the two pre-pass prompt files.
2. Two named Step 3 checks, with their Detection Rule, sibling and authoring twins.
3. The closing phase: two tests, a bundle run and a CHANGELOG entry.

Edit only `shared/resources/` sources and `SKILL.md` files. `skills/*/references/` is regenerated
by `npm run bundle`.

Check the line anchors below at implementation time. They were measured on develop at `e04de749`,
and tasks 129 and 145 edit the same sections.

## Phase-by-Phase Implementation Guide

### Phase 1: Stack-neutral pre-pass (obs #130)

#### 1a. `shared/resources/jira-sync.js`: export the fence tracker

`makeFenceTracker()` (around line 1204) is module-private. Add it to `module.exports` (the block
that begins around line 5711, beside `matchCodeFence`). This is additive only. Do not add a third
fence parser beside the ones in `jira-sync.js` and `doc-links.js`.

#### 1b. `shared/resources/prepass-axes.js`

Follow the shape of `card-preflight.js` / `doc-links.js`: CommonJS, a pure export, a thin `main`,
and `require.main === module`.

```js
"use strict";
const fs = require("fs");
const path = require("path");
const { makeFenceTracker } = require("./jira-sync.js");

// Today's hard-coded lists, kept ONLY as the fallback for a repository with no concepts/ docs.
const FALLBACK_DOMAINS = Object.freeze([
  "backend",
  "frontend",
  "auth",
  "payments",
  "real-time",
]);
const FALLBACK_AXES = Object.freeze([
  "naming, layering, file placement",
  "API endpoints and payloads",
  "auth, crypto and sensitive data",
]);
const SKIP = new Set(["see also"]);

function h2s(text) {
  const isFence = makeFenceTracker();
  const out = [];
  for (const line of String(text).split("\n")) {
    if (isFence(line)) continue;
    const m = /^## +(.+?)\s*#*\s*$/.exec(line);
    if (m && !SKIP.has(m[1].toLowerCase())) out.push(m[1]);
  }
  return out;
}

function deriveAxes({ archDir, readFile = (p) => fs.readFileSync(p, "utf8") }) {
  const files = {
    domains: path.join(archDir, "concepts", "tech-stack.md"),
    axes: path.join(archDir, "concepts", "coding-standards.md"),
  };
  const read = [];
  const take = (p) => {
    try {
      const t = readFile(p);
      read.push(p);
      return t;
    } catch {
      return null;
    }
  };
  const ts = take(files.domains);
  const cs = take(files.axes);
  const domains = ts === null ? [...FALLBACK_DOMAINS] : h2s(ts);
  const axes = cs === null ? [...FALLBACK_AXES] : h2s(cs);
  const source =
    ts !== null && cs !== null
      ? "architecture"
      : ts === null && cs === null
        ? "fallback"
        : "partial";
  return { reason: source, source, domains, axes, read };
}
```

- **CLI**:
  - `--arch <dir>` is required. `--json` prints the object on one line; without it, print
    `source: …`, then `domains: a, b, …` and `axes: …`.
  - Exit 0 on success. Exit 2, with the usage on stderr and nothing on stdout, on a missing
    `--arch` or an unknown flag.
  - Set `process.exitCode`. Never call `process.exit()` after a write (see the stdout-drain trap).
- **FALLBACK_AXES**: check the exact wording against today's axes 2–4 in the prompt files. The
  fallback must reproduce today's behaviour. Libraries (axis 1) is stack-neutral already, so it
  stays in the template and is not part of the slot.

#### 1c. Both prompt files, Agent B

Apply the same edits to `shared/resources/review-task-prepass-prompts.md` (template lines 21–40) and
`shared/resources/review-story-prepass-prompts.md` (template lines 55–74).

Before:

```text
Search for architecture documents under {arch_location} that cover the task's domain (backend / frontend / auth / payments / real-time — pick the most relevant). Read at most 2 architecture files.

Compare the task's technical claims against the architecture documents on these axes:
1. Libraries: ...
2. Patterns: does the task deviate from documented patterns (naming, layering, file placement)?
3. API contracts: are API endpoints or payloads consistent with specs in architecture docs?
4. Security: ...
```

After:

```text
Search for architecture documents under {arch_location} that cover the task's domain — this repository's domains are: {arch_domains}. Pick the most relevant. Read at most 2 architecture files.

Compare the task's technical claims against the architecture documents on these axes:
1. Libraries: does the task reference libraries not in the architecture docs or tech-stack.md?
2. Patterns: for each of these documented standards that the task touches — {arch_axes} — does the task deviate from it?
3. Contracts: are interfaces the architecture docs define (endpoints, CLI flags, exit codes, output schemas — whichever they define) used consistently with those docs?
4. Security: does the task handle auth, crypto, or sensitive data in a way that contradicts architecture guidance?

Return ONLY this YAML block (no other text):

alignment: aligned | drift | conflict
axes_checked: [<each axis name from step 2 you actually compared against>]
findings: ...
```

- Keep the `area` enum unchanged (`library | pattern | api-contract | security`). Only the wording
  of axis 3 widens.
- Fallback block (arch not found): add `axes_checked: []`.
- Variable table: add these two rows.

  | Variable         | Source                                                                        |
  | ---------------- | ----------------------------------------------------------------------------- |
  | `{arch_domains}` | `prepass-axes.js --arch {arch_location} --json` → `domains`, joined with `, ` |
  | `{arch_axes}`    | the same call → `axes`, joined with `; `                                      |

- § Summary schema validation: Agent B needs `alignment` **and** `axes_checked`. If `alignment` is
  `aligned` and `axes_checked` is empty or missing, treat the agent as failed. An "aligned" that
  names nothing it was aligned against is not a result.
- The sibling note at line 10 already says to fix both files. Keep it.

#### 1d. `skills/review-task/SKILL.md`

- **Phase 1.5, step 1** (around line 407): after `{arch_location}`, add the call.

  ```bash
  # From the repository root, like every engine call in this skill.
  node .agents/skills/review-task/references/prepass-axes.js --arch "{arch_location}" --json
  ```

  Substitute `{arch_domains}` and `{arch_axes}` from its output. Cite
  `shared/resources/prepass-axes.js` in the prose so the bundler copies it, then run
  `npm run bundle`, which rewrites the path to `references/`.

- **Phase 1.5, step 3** (around line 415): the `axes_checked` rule.
- **§ Pre-pass Summary Consumption** (around line 302): when `PREPASS_B` is `aligned`, record
  `axes_checked` in one line under the report's Technical Accuracy section.

#### 1e. `skills/review-story/SKILL.md`

In Step 1, item 4, **Subagent 3** (around line 511), replace the one-line description with a
dispatch from `shared/resources/review-story-prepass-prompts.md` § Agent B, using the same
`prepass-axes.js` call (`.agents/skills/review-story/references/prepass-axes.js`) and the same
`axes_checked` validation. Today review-story never cites the file:
`grep -c prepass skills/review-story/SKILL.md` → `0`.

### Phase 2: Invariant verification (obs #161)

#### 2a. review-task Step 3

Append the check after the **last** numbered check present at implementation time. Today that is
`9. Configuration Key Accuracy` (around line 847). Tasks 129 and 145 may have landed first. Match
the shape of checks 6–8.

```markdown
N. **Invariant verification** (obs #161):

- When the document asserts a **property** of an **existing** function under **new** inputs —
  an ordering, a uniqueness, an idempotence, a round-trip — do not reason about it: import the
  function (or re-implement the two lines under test) and run it on the inputs the document
  proposes. A property is the one claim that is cheap to execute and expensive to read
- Pure and local only — no network, no writes outside a temp directory; for a function with side
  effects, re-implement the lines rather than import it
- Worked example: task.141 claimed zero-padding (`-02`, `-03`) keeps `listRunFiles`' basename sort
  chronological. Every existence check passed; one line falsified it, because run 1 has no suffix
  and `.` sorts after `-`:
  `node -e 'console.log(["a-lan.md","a-lan-02.md"].sort())'` → `[ 'a-lan-02.md', 'a-lan.md' ]`
- Report a falsified invariant as **Critical** — the document is wrong, not under-specified, and
  its plan is already written on top of it. Quote the command and its output as the evidence.
  A property that cannot be run here (needs a live service) → **Optional**, "unverified — needs X"
- Adjacent to outcome reachability (task.145): that check _reads_ one stated outcome through the
  deciding function; this one _runs_ a property over inputs. Where a claim is both, run it and
  report once, here
```

- _Common Hallucination Patterns to Detect_:
  `- ❌ A property of an existing function asserted for new inputs, and never run on them`.
- _Issues to Flag_ › Critical: add "a falsified invariant".
- `### Detection Rules` (around line 1901): add
  `7. **Invariant Verification**: A property claimed of an existing function under new inputs MUST be executed on those inputs — an existence check and a behaviour check are different instruments, and passing the first is not evidence for the second`.

#### 2b. review-story

- Step 4 (around line 872): the same check, appended after the last numbered check (today
  `6. Reference Validation`). Use "Dev Notes, tasks or acceptance criteria" in place of "the
  document".
- `### Detection Rules` (around line 2538): add `6. **Invariant Verification**` with the same
  sentence.

#### 2c. create-task Step 3.5 › 🚨 Critical

Add after the obs #102 bullet (around line 432):

```markdown
- **A property claimed, not run** (obs #161): when the document asserts that an existing function
  keeps an ordering, a uniqueness, an idempotence or a round-trip under the inputs this task adds,
  run it on those inputs before writing the claim down — task.141's zero-padding sort was false and
  its plan's own test asserted it.
```

### Phase 3: Released-shape diff (obs #170)

#### 3a. review-task Step 3

Append this check after Invariant verification.

```markdown
N+1. **Released-shape diff for compatibility handling** (obs #170):

- Trigger: the document defines backward-compatibility, migration, "legacy" or old-format handling
  for a file, record, state file, schema or config shape
- Derive the legacy shape from the last **released** version, not from the finding that prompted
  the task:
  `git tag --list 'v*' --sort=-v:refname | head -1` (or the project's release-tag pattern), then
  `git show <tag>:<path>` on the file that **defines or writes** the shape, and diff its fields
  against the target shape
- Every field or key the released shape lacks (or reads differently) that the document does not
  cover → **Important**. The document must **cite the tag** it compared against; no citation →
  **Important**
- No release tag → **Optional** ("state the baseline"). The path did not exist at the tag → say
  so: there is no released legacy, and the handling covers unreleased states only
- Worked example: task.143 specified legacy handling for `priorRuns` alone — the field its QA
  finding named. `git show v0.51.0:skills/qa-next/SKILL.md` lacks `targeted`, `priorRuns`, `bug`
  and `filedBug`; a missing `bug` would have made a repeat failure file a duplicate bug
```

#### 3b. review-story Step 4

Add the same check after Invariant verification.

#### 3c. create-task Step 3.5 › 🚨 Critical

```markdown
- **Compatibility scoped from a finding, not from the release** (obs #170): when the task defines
  legacy or migration handling for a shape, derive the legacy shape with `git show <tag>:<path>` from
  the last release tag, cover every field the diff shows, and cite the tag in Technical Background.
```

### Phase 4: Tests, bundle, docs

#### 4a. `shared/resources/tests/prepass-axes.test.mjs`

This is an ESM file under `node:test`. `createRequire` loads the CommonJS helper.

- **This repository.** Compute the expected lists from the files themselves with a `^## ` scan that
  skips fences and drops `See also`. Assert `deriveAxes` equals them, that `source` is
  `"architecture"`, and that no domain or axis matches `/payments|real-time|frontend/i`.
- **Fixtures.** Use `mkdtempSync(join(tmpdir(), "prepass-axes-"))`:
  - none → `fallback`;
  - coding-standards only → `partial`;
  - `## Inside` in a fenced block → absent from `axes`.
- **CLI.**
  - `spawnSync(process.execPath, [helper, "--arch", dir, "--json"])` → status 0. The parsed keys
    are `reason`, `source`, `domains`, `axes` and `read`, with `read.length <= 2`.
  - `--bogus` → status 2 and an empty stdout.
  - Symlink a temp directory to `shared/resources` and run the helper through it → status 0.
- **Prompt files.**
  - Slice each file from `## Agent B` to the next `## `. Do not skip fences here: the template is
    fenced.
  - Assert the slice includes `{arch_domains}`, `{arch_axes}` and `axes_checked`, and has no
    `payments` or `real-time`.
  - Extract `/^\d\. .*/gm` from both slices, replace `\b(task|story)('s)?\b` with `X`, and
    `assert.deepEqual`.
- **Dispatch sites.**
  - review-task `### Phase 1.5` contains `prepass-axes.js` and `axes_checked`.
  - review-story's `### Step 1: Context Discovery` section contains `review-story-prepass-prompts.md`
    and `prepass-axes.js`.
  - The floor: each heading is found.

#### 4b. `tests/review-property-checks.test.js`

This is a CommonJS file under `node:test`, like the other `tests/*.test.js`.

```js
const SITES = [
  {
    file: "skills/review-task/SKILL.md",
    heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
    obs: 161,
  },
  {
    file: "skills/review-task/SKILL.md",
    heading: "### Detection Rules",
    obs: 161,
    rule: true,
  },
  {
    file: "skills/review-story/SKILL.md",
    heading: "### Step 4: Technical Accuracy and Anti-Hallucination Review",
    obs: 161,
  },
  {
    file: "skills/review-story/SKILL.md",
    heading: "### Detection Rules",
    obs: 161,
    rule: true,
  },
  {
    file: "skills/create-task/SKILL.md",
    heading: "### 3.5 Adversarial Quality Review",
    obs: 161,
  },
  {
    file: "skills/review-task/SKILL.md",
    heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
    obs: 170,
  },
  {
    file: "skills/review-story/SKILL.md",
    heading: "### Step 4: Technical Accuracy and Anti-Hallucination Review",
    obs: 170,
  },
  {
    file: "skills/create-task/SKILL.md",
    heading: "### 3.5 Adversarial Quality Review",
    obs: 170,
  },
];
// section(): heading line → next heading of same-or-higher level, fenced blocks skipped.
// 161: /obs #161/ (Detection Rules sites: /Invariant Verification/ instead) + /\b(run|execut)/i;
//      full sites also /existing function/i, /inputs/i, /Critical/.
// 170: /obs #170/, /git show/, /\btag\b/, /diff/i, /Important/.
// Floor: SITES.length === 8 and every heading found.
```

- **Detection Rules sites carry no obs number.** The rules list cites none today, so they assert
  the rule name `Invariant Verification`. Their `section()` spans `### Detection Rules` up to
  `### Reporting Hallucinations`.
- **Mutation proof.** For each site, snapshot the file, delete the check or rule, run the test, and
  confirm the red names `file` and `heading`. Then restore the snapshot. Record all eight runs in the
  implementation report.

#### 4c. Bundle, validate, CHANGELOG

- Run `npm run bundle`, then `npm run bundle:check`: no drift and no `UNREACHED`.
  - The new `prepass-axes.js` is cited from both `SKILL.md` files, which is what makes it reachable.
  - `jira-sync.js` is already a copy in `skills/review-task/references/`. Confirm review-story
    receives it transitively.
- Run `npm test`, `npm run format:check` (Prettier formats the new `.js` / `.mjs`) and
  `npm run validate`.
- CHANGELOG `[Unreleased]` › Changed: one paragraph per observation, citing `(task 151)`.

## Key Patterns and References

- **Checks 6–8 in review-task Step 3 and their create-task twins** are the shape to copy: bold
  name, obs citation, bullets and a severity line.
- **The engine contract** comes from `card-preflight.js` and `doc-links.js`: pure export, `main`
  returning an exit code, `--json` with a `reason`, exit 2 on usage. Invoke as `command node` in
  tests and scripts.
- **Section-scoped population tests.** Copy the pattern of
  `shared/resources/tests/probe-boundary-signals.test.mjs`. A file-scoped grep passed on a site that
  lacked the text (task.144 QA cycle 2, CR-4).
- **The bundling rule.** Inside `shared/resources/`, cite a sibling by bare filename. The prompt
  files therefore say `prepass-axes.js`, never `shared/resources/prepass-axes.js`. The `SKILL.md`
  files use the `shared/resources/` literal, and the bundler rewrites it.

## Testing Approach

1. `command node --test shared/resources/tests/prepass-axes.test.mjs tests/review-property-checks.test.js`.
   Both should be red on develop before the change and green after.
2. Run the mutation proofs listed in the task § 8.
3. `npm test`, then `npm run bundle:check` and `npm run validate`.
4. Hand runs, recorded in the implementation report:
   - `/review-task --validate` on scratch copies of task.141 at `cd0c9804` and task.143 at
     `82c61b33`;
   - one Phase 1.5 pre-pass on a task in this repository, showing `axes_checked`.
