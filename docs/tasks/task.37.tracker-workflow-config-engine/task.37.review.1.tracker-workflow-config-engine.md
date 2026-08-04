---
id: task.37.review.1
title: "Task Review Report: Task 37 — tracker-workflow.yaml config engine"
type: review
description: "Standard-depth review of task.37 and its implementation plan: verifies every technical claim against the codebase, finds an install-breaking bundler gap in Phase 1, an undefined module format, and a contradictory rung model."
tags: [review, task, configuration, tracker]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# Task Review Report: Task 37 — `tracker-workflow.yaml` config engine

> **Implementation Status**: ✅ All 3 critical and 7 important recommendations implemented — 2026-08-04
> (5 optional items also applied). Task status promoted `planned` → `ready-for-development`.

**Reviewed:** 2026-08-04
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development (updated post-fix)
**Overall Assessment:** GOOD (strong design, three implementability blockers)

---

## Executive Summary

Task 37 is unusually well-argued: the motivation is grounded in real code, the "order is rank / omission
is disablement / off-ladder is free" framing is sound, and the decision to land the engine unwired is
the right sequencing. Every claim about *why* this is needed checks out against the source.

The problems are all about *how*. Three blockers stop a developer from implementing Phase 1 or Phase 2
as written: the bundler cannot carry the promoted parser into a consumer install, the module format
(CommonJS vs ESM) is never stated but is forced by the bundler's regexes, and the rung model
contradicts itself between §3, §10 and the plan. A further cluster of stale line anchors sends a
developer to the wrong functions in `jira-sync.js`.

**Critical Issues:** 3 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 6/10 before fixes → 9/10 after
**Recommendation:** NEEDS REVISION → **READY TO IMPLEMENT** (all critical + important fixes applied)

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/task.37.tracker-workflow-config-engine
  - Base:       develop
  - Epic branch: N/A
  - Auto-skip:  false
```

Branch created directly via git following the `/create-branch` naming convention
(`feature/task.{id}.{slug}`); working tree was clean, so no stash was required.

---

## Pre-pass Summaries (Phase 1.5)

**Agent B — architecture alignment:** `drift`

| Area | Severity | Note |
|---|---|---|
| pattern | medium | New root `assets/` dir absent from source-tree.md; starter assets belong in `docs/examples/` |
| pattern | medium | CommonJS `yaml-subset.js` imported by ESM `schedule.mjs`; export form must change |
| api-contract | low | Example `pipeline` block omits `ready-for-merge`, uses unwired `pr-merged` |

**Agent C — codebase scan:** `not-implemented` — no `tracker-workflow.js`, no `yaml-subset.js`, no
`tracker-workflow.yaml`, no `tracker.workflowFile` key. `parseYamlSubset` still local to
`schedule.mjs`. `loadWorkflowRecord` exists as prior art only. Scope is intact; nothing to descope.

---

## User Decisions & Clarifications

### Q1 — Bundler cannot carry the promoted parser (Critical)

**Decision: Extend the bundler for `.mjs` + ESM.**

**Impact**: Phase 1 gains a bundler change (`skills/create-skill/scripts/bundle_skill.py`) plus a
regression test. `bundle_skill.py` and its test join the Files Summary. Effort rises modestly.

### Q2 — Module format for the two new shared files

**Decision: CommonJS.**

**Impact**: `module.exports` + `require("./yaml-subset.js")`, matching `jira-sync.js` and keeping
`JS_SIBLING_RE` transitive bundling functional. Phase 1's "move verbatim" wording and the Contract
Test's "exported signature is unchanged" both had to be reworded — the export *form* necessarily
changes.

### Q3 — Rung model for candidate alternatives

**Decision: `target` becomes the full candidate list.**

**Impact**: A rung is always `{ names: [...] }`; a plain YAML string is sugar for a one-name rung.
`resolveMoment` returns `{ targets: [...], rank, offLadder }` and `planMove` returns rungs rather than
first-names, so task.38/39 can try candidates in order the way `resolveTransition` already does. The
model is now stated in §3 rather than living only in the plan.

### Q4 — Default template location

**Decision: `docs/examples/tracker-workflow.default.yaml`.**

**Impact**: No new root-level `assets/` directory; no collision with the per-skill `assets/` meaning;
no `source-tree.md` update needed.

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present: Overview, Motivation, Technical Background, Scope, Breaking Changes,
Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback
Plan, Progress Tracking, References, Notes. No placeholders, no TBD markers.

**Filename**: `task.37.tracker-workflow-config-engine.md` ✅ conforms (dots as structural separators,
hyphens within the descriptive name).

**OKF frontmatter conformance**: ✅ `type: task` present; `description` present and one sentence;
`tags` a proper YAML list; `updated` present. No findings.

**Metadata**: `status: planned` / `**Status:** Planned` consistent across frontmatter and body ✅.
`priority: High`, `estimated_effort_hours: 16` present ✅. The rubric puts a four-phase task with ~20
success criteria and ~30 plan checkboxes in the 16–24h band; 16h was defensible before Q1 and remains
within tolerance after (no >2× divergence), so no adjustment is flagged.

**Tracker linkage**: `github_issue: 185` → verified OPEN, title `[Task 37] tracker-workflow.yaml — a
consumer-owned status ladder the pipelines read` ✅. Body cross-reference `[#185](…/issues/185)`
matches frontmatter ✅. No dedup or creation needed.

### Issues

Only §7's headings — "Files to Modify (Core Implementation)" listing files marked **new** — a cosmetic
mismatch. Optional.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 invented technologies; 5 stale or incorrect source references

Every substantive claim about existing behaviour was verified against source and holds:

| Claim | Location | Verdict |
|---|---|---|
| `DEFAULT_STATUS_RANK` derived from candidate lists, so `READY FOR SHOWCASE` is unranked | `jira-sync.js:1421-1435` | ✅ the code comment says exactly this |
| `resolveTransition` does exactly one hop | `jira-sync.js:2194-2227` | ✅ single match, no walk |
| Five independent hand-rolled YAML readers | all five located | ✅ `resolve-platform.sh:23`, `resolve-paths.sh:30`, `set-github-project-estimate.sh:29`, `jira-sync.js:1597`, `jira-sync.js:1863`, plus `schedule.mjs` |
| `package.json` globs already cover `shared/resources/tests/*.test.mjs` | `package.json:24` | ✅ no dependency work needed, as §7 states |
| Plan's `DEFAULT_LADDER` names | vs `NEW/IN_PROGRESS/REVIEW/QA/MERGE/DONE_CANDIDATES` | ✅ rung-for-rung match |
| Plan's `DEFAULT_PIPELINE` indices (1, 2, 5) | vs `defaultEnabled: true` stages | ✅ `work-started`, `in-review`, `done` |

### Issues

#### Important — stale source anchors

- **`jira-sync.js:1820` cited for `loadWorkflowRecord`** — actual location **1952**. Line 1820 lands
  inside `mapStatusCandidates`. A developer following the anchor reads the wrong function.
  - **Location:** §References, "Prior art"; plan "Key Patterns and References"
- **`jira-sync.js:1855` cited for `resolveStage`** — actual **1987**.
- **Plan: `DEFAULT_STAGE_MAP` / `DEFAULT_STATUS_RANK` at `1366-1415`** — actual **1388** and **1424**.
- **Plan: case-insensitive type-key lookup at `1866-1872`** — actual ~**1998-2005**.
- **`schedule.mjs:68` cited for `parseYamlSubset`** — line 68 is the `// ── minimal YAML subset ──`
  section header; the function is at **172**, exported, and used at **493**.

All five are consistently ~130 lines low, i.e. written against an older revision of `jira-sync.js`.

#### Important — factually incorrect claim about the worktree fix

The plan instructs "mirror `loadWorkflowRecord` exactly, including the worktree fix
(`--git-common-dir` fallback)". `loadWorkflowRecord` (`jira-sync.js:1952-1968`) has **no**
`--git-common-dir` fallback — it uses a plain `git rev-parse --show-toplevel`. The `--git-common-dir`
fallback lives in the `.env` loader at `jira-sync.js:46-50`, a different function with a different
reason (gitignored files are absent from linked worktrees). Copying "exactly" would produce neither.

#### Important — the canonical format example cannot be parsed

§3's `byIssueType` example uses a **flow sequence**:

```yaml
statuses: [Selected for Development, In Progress, In Review, Done]
```

`parseYamlSubset`'s own header states "Deliberately NOT a general YAML parser — no anchors, no
multi-line strings, **no flow collections**". This does not error; `parseScalar` returns the literal
string `"[Selected for Development, In Progress, In Review, Done]"`, so a whole overlay is silently
dropped — the exact failure mode §10's "Quoted keys" risk worries about, one row up.

The task already carries this as a Medium risk to be settled in Phase 1, which is correct — but until
it is settled the document should not *show* the unsupported form as the format.

### Recommendations

1. Correct all five line anchors to the verified values — *per the verification table above*.
2. Delete the `--git-common-dir` claim from the plan; point at `loadWorkflowRecord`'s real shape and
   note the worktree trap separately as a thing to be aware of, not a thing to copy.
3. Rewrite §3's `byIssueType` example as a block sequence; keep the Phase 1 flow-sequence decision.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Critical 1 — Phase 1 breaks `develop-batch` in every consumer install

`bundle_skill.py`'s Pass 1 collects skill files with
`rglob('*.md') + rglob('*.js') + rglob('*.sh')` — **`.mjs` is not walked**. `rewrite_text` branches on
`.md`, `.js`, `.sh` and returns content unchanged for anything else. `JS_SHARED_RE` matches only
`require("../…/shared/resources/X")`, never an ESM `import`.

`schedule.mjs` is a `.mjs` file, and the plan has it `import` the promoted parser. Therefore:

1. the reference is never collected → `yaml-subset.js` is never copied into
   `skills/develop-batch/references/`, and
2. even if it were, the import path is never rewritten → it stays
   `../../../shared/resources/yaml-subset.js`, which does not exist under
   `.agents/skills/develop-batch/scripts/`.

`npm test` stays green in this repo, because the relative path resolves in-tree. The breakage appears
only in a tarball or zip install — the same silent in-repo/installed divergence already recorded for
this codebase. §10's Low Risk entry asserts "`bundle_skill.py`'s sibling-require following handles
them"; for the specified ESM-import-from-`.mjs` shape, it does not.

- **Fix (per Q1):** extend `bundle_skill.py` — add `*.mjs` to Pass 1's rglob, add a `.mjs` branch to
  `rewrite_text`, add an ESM-import regex beside `JS_SHARED_RE`/`JS_SIBLING_RE`. Add a bundler
  regression test asserting a `.mjs` file's shared ref is bundled and rewritten.

#### Critical 2 — module format never stated, and it is forced

`package.json` declares `"type": "commonjs"`; every `shared/resources/*.js` uses `module.exports`;
`JS_SIBLING_RE` follows only `require("./x.js")`. An ESM `import` between `tracker-workflow.js` and
`yaml-subset.js` would break transitive bundling outright. The task says neither, and Phase 1's
"Move `parseYamlSubset` **verbatim**" plus the Contract Test's "exported signature is **unchanged**
after promotion" are jointly unsatisfiable: `export function parseYamlSubset` must become
`module.exports`.

Also unaddressed: `parseYamlSubset` depends on module-private helpers in `schedule.mjs`
(`stripComment`, `parseScalar`, `significantLines`, `parseBlock`). "Move the function" understates the
unit — the whole parser block moves.

- **Fix (per Q2):** state CommonJS explicitly; reword "verbatim" to "body and behaviour unchanged,
  export form adapted to CommonJS"; reword the Contract Test to pin arity and behaviour, not export
  form; name the helper set that moves with it.

#### Critical 3 — the rung model contradicts itself

- §3 shows `statuses:` as a flat list of single strings.
- §6 Phase 2 and the plan give `resolveMoment` a **singular** `{ target, rank, offLadder }`.
- §10's High Risk mitigation requires the default ladder to "keep candidate *lists* per rung".
- The plan models rungs as `{ names: [...] }` and has `planMove` emit `rung.names[0]`.

A developer cannot tell what `target` means for a rung carrying six alternatives. Taking
`names[0]` — the plan's answer — silently makes every alternative unreachable as a move target: a
board whose column is `Waiting for Review` would be moved to `In Review` instead, which is precisely
the behaviour change §10 exists to prevent.

- **Fix (per Q3):** rungs are always `{ names: [...] }`; a plain string is sugar for a one-name rung;
  `resolveMoment` returns `{ targets: [...], rank, offLadder }`; `planMove` returns rungs. Document the
  model in §3, not only in the plan.

#### Important — Success Criteria contradicts the plan on purity

§9 Code Quality: "Engine is pure — no `require` of `jira-sync.js`, no HTTP, no `gh`, no `execSync`
except an injectable `repoRoot`". The plan instructs mirroring `loadWorkflowRecord`, which *does*
`execSync("git rev-parse --show-toplevel")` whenever `repoRoot` is absent. Either the criterion means
"`repoRoot` is injectable, and `execSync` is the fallback when it is not injected" — in which case say
so — or the engine must require `repoRoot` and never shell out.

#### Important — the shipped template would ship the wrong moments

§3's example `pipeline:` block names `pr-merged` (declared in this task, **wired in task.41**) and
**omits `ready-for-merge`** (one of the six that exist today). §9 Migration then requires the shipped
default template to be "byte-equal to the one the reference doc shows". As written, every scaffolded
consumer gets a key that does nothing for two more tasks and is missing a key that works now.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important — `assets/` at the repo root

§7 (#6) and Phase 4 add `assets/tracker-workflow.default.yaml`. No root-level `assets/` exists; in
this repo `assets/` is a **per-skill** directory (AGENTS.md → Skill Structure), and shipped starter
material lives under `docs/examples/` (e.g. `docs/examples/architecture/`). A new root `assets/`
collides with an established meaning and would need a `source-tree.md` entry.

- **Fix (per Q4):** `docs/examples/tracker-workflow.default.yaml`.

#### Optional

- **CHANGELOG.md** appears in §7 (#9) and in Progress Tracking Phase 4, but is absent from Phase 4's
  **Files** list.
- **Consumer Tests** authors a `tracker-workflow.yaml` for this repo's own board; that file is not in
  §7's Files Summary.
- **§7 headings** label new files under "Files to Modify".
- **Files Summary** needs `bundle_skill.py` and its regression test after Q1.
- **Default-ladder snapshot** should derive its expectations from the actual `*_CANDIDATES` constants
  rather than hand-transcribed literals, so a change to those constants fails the snapshot rather than
  passing a stale copy. The plan says "cross-check"; the test should enforce it.

### Testing completeness

Coverage is genuinely good: unit, integration, contract, performance and a dogfood pass, with the
default-ladder snapshot correctly identified as the compatibility contract and correctly ordered
first. Two additions follow from the fixes: a bundler regression test (Q1) and a test asserting the
`{ names: [...] }` sugar (Q3).

### Scope and complexity

Four phases, one new module plus one promoted module, tests and docs. Well inside single-task scope;
splitting is not warranted. The Q1 bundler change adds one file and one test — still comfortable.

---

## 5. Mermaid Diagram Validation

**Status:** PASS — no diagram required.

§3's current/target ASCII pipelines convey the data flow clearly, and the YAML block conveys the
shape. A Mermaid current-vs-target flowchart would restate the ASCII without adding structure. Per the
"do not flag absence if the prose already conveys the structure" rule, no diagram is recommended.

---

## 6. Risk & Rollback Assessment

**Status:** ADEQUATE, one gap

The risk register is unusually honest — the High Risk entry correctly identifies that collapsing
candidate lists to a ladder is "a real modelling decision, not a transcription", and both Medium risks
(flow sequences, quoted keys) are real and were confirmed by this review.

### Gap

The **bundler fan-out** risk is rated Low with the mitigation "`bundle_skill.py`'s sibling-require
following handles them". Verification shows it does not, for the shape this task specifies (Critical 1).
Severity should rise to High with the Q1 mitigation, and the rollback trigger list should include
"a consumer install of `develop-batch` cannot resolve the parser" — which no existing trigger catches,
since `npm test` passes in-repo.

Rollback plan is otherwise sound: the engine is inert, Phase 1 is a one-hunk revert, and the partial
rollback (keep `yaml-subset.js`, drop the engine) is correctly identified as viable.

---

## Summary of Recommendations

### Must Fix (Critical) — 3

1. **Extend `bundle_skill.py` for `.mjs` + ESM imports** and add a regression test; add both to §7 and
   Phase 1 — *per Q1*.
2. **State CommonJS explicitly** for `yaml-subset.js` and `tracker-workflow.js`; reword "verbatim" and
   the Contract Test; name the helpers that move — *per Q2*.
3. **Fix the rung model**: `{ names: [...] }` everywhere, `targets` plural, `planMove` returns rungs;
   document in §3 — *per Q3*.

### Should Fix (Important) — 7

4. Correct five stale line anchors in §References and the plan.
5. Remove the false `--git-common-dir` claim from the plan.
6. Rewrite §3's `byIssueType` example as a block sequence.
7. Resolve the purity-vs-`execSync` contradiction in §9.
8. Move the default template to `docs/examples/` — *per Q4*.
9. Fix the example `pipeline:` block: include `ready-for-merge`, comment `pr-merged` as task.41.
10. Raise the bundler-fan-out risk to High and add its rollback trigger.

### Consider (Optional) — 5

11. Add CHANGELOG.md to Phase 4's Files list.
12. Add the dogfood `tracker-workflow.yaml` to §7.
13. Relabel §7's "Files to Modify" headings for new files.
14. Add `bundle_skill.py` + test to §7.
15. Derive the snapshot from the real `*_CANDIDATES` constants.

---

## Implementation Readiness Assessment

**Score:** 6/10 before fixes → **9/10** after

| Dimension | Before | After |
|---|---|---|
| Template Compliance | 9/10 | 9/10 |
| Technical Accuracy | 6/10 | 9/10 |
| Implementation Clarity | 4/10 | 9/10 |
| Consistency | 6/10 | 9/10 |
| Risk Management | 7/10 | 9/10 |

**Confidence Level for Successful Implementation:** High (post-fix)

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The design was sound throughout; every blocker was a specification gap rather than a
modelling error, and all three are now closed with explicit user decisions. The remaining risk is
concentrated in the default-ladder snapshot, which the task already sequences first.

---

## Next Steps

1. Write the default-ladder snapshot test first, deriving expectations from the `*_CANDIDATES`
   constants in `jira-sync.js:1278-1362`.
2. Settle the flow-sequence question as Phase 1's first action, before any documented example is
   finalised.
3. Land the `bundle_skill.py` change with its regression test in Phase 1, ahead of the
   `schedule.mjs` swap — the swap is unsafe until the bundler can carry the file.
4. Run `npm run bundle && git diff --stat -- 'skills/*/references/*'` before committing to see the
   fan-out.
5. Then `/develop-task docs/tasks/task.37.tracker-workflow-config-engine/task.37.tracker-workflow-config-engine.md`.

---

## Review Metadata

- **Reviewer:** Claude (review-task skill, standard depth)
- **Review Date:** 2026-08-04
- **Task File:** `docs/tasks/task.37.tracker-workflow-config-engine/task.37.tracker-workflow-config-engine.md`
- **Plan File:** `docs/tasks/task.37.tracker-workflow-config-engine/task.37.plan.tracker-workflow-config-engine.md`
- **Sources Consulted:** `shared/resources/jira-sync.js`, `skills/develop-batch/scripts/schedule.mjs`,
  `skills/create-skill/scripts/bundle_skill.py`, `skills/create-skill/scripts/quick_validate.py`,
  `package.json`, `skills-config.yaml`, `AGENTS.md`
- **Pre-pass Agents:** 2 (architecture alignment, codebase scan) — both returned valid summaries
