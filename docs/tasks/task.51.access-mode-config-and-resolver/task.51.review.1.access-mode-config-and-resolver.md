---
type: review
description: 'Review 1 of task.51 — three critical defects (a halt mechanism that does not exist, a precedence contradiction, and strict validation colliding with the documented tracker.workflowFile mapping form) plus six important findings, all verified against the code.'
tags: [review, task.51, platform-detection, access-control]
status: accepted
created: 2026-08-17
updated: 2026-08-17
---

# Task Review Report: Task 51 — Declare tracker access level in config, and reject an unrecognised one loudly

**Reviewed:** 2026-08-17
**Review Depth:** Standard
**Task Status (at review):** `planned`
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

The task is well-motivated and the reasoning is unusually clear — the "identity is not access"
argument and the `tracker: jria` bug are both correct and worth shipping. The defects are all in the
mechanism, not the idea: the specified way of halting a run **does not exist at any call site**, the
env/config precedence is specified two contradictory ways, and the new strict validation would
hard-fail a config form that `tracker-workflow.md` currently documents as supported.

Every finding below was verified by reading or executing the code, not inferred from the prose.

**Critical Issues:** 3 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 6 questions asked and answered
**Implementation Readiness (as found):** 6/10
**Recommendation:** NEEDS REVISION → all critical and important findings applied in this pass; see
[Implementation Status](#implementation-status).

---

## Implementation Status

> ✅ All 3 critical and 7 important recommendations implemented — 2026-08-17.

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

**Q1: Report format and base branch.**
- **User Decision**: Comprehensive report; branch cut from `develop`.
- **Impact**: Review artifacts land on `feature/task.51.access-mode-config-and-resolver`, based on
  `develop` (which was identical to `main` at `ec79349`).

### Question Point 2: Technical & Implementation

**Q2: Which precedence is correct — config-first or env-first?**
- **User Decision**: **Most-restrictive wins.** Resolve both tiers, then take the more restrictive of
  config and env.
- **Impact**: Removes the contradiction in a way neither original reading achieved. A committed
  `manual` can never be loosened to `full` by an env var, and an unrestricted repo can still be
  locked down per-run. Requires an explicit ordering of the five modes, which the task did not have.

**Q3: How should validation's non-zero return actually halt a run?**
- **User Decision**: **Add call-site guards to scope.** Update all 16 call sites to
  `source … || exit 1`, update the canonical snippet in `platform-detection.md`, re-bundle.
- **Impact**: Adds ~6 files to Files Summary and raises the effort estimate above 4h. This is what
  turns the security check from advisory into blocking.

**Q4: How should validation treat the `tracker:` mapping form?**
- **User Decision**: **Treat a mapping as `auto`.** A `tracker:` that parses to a mapping is the
  `workflowFile` form, not a platform override.
- **Impact**: Avoids breaking documented configs, and incidentally closes the tier disagreement
  described in C2.

**Q5: Should the nested-key reader be written fresh?**
- **User Decision**: **Extract `read_nested_config_key` to a shared helper, and fix `python` →
  `python3` in the same edit.**
- **Impact**: Removes a duplicate implementation and revives a tier that is currently dead on any
  machine without a bare `python`. Adds one file plus a bundling step.

### Question Point 3: Completeness & Safety

**Q6: How should a YAML parse failure resolve `access.*`?**
- **User Decision**: **Fail closed if `access:` is present.** Grep for an `access:` line on parse
  failure — present → halt; absent → `full`, as today.
- **Impact**: A consumer who never opted in is never locked out; one who did is never silently
  unlocked. Replaces the blanket "falls back to defaults" row for the access keys only.

**Q7: Should the missing GitHub issue be created?**
- **User Decision**: **Yes, create for task 51 and backfill tasks 47–58.**
- **Impact**: See [Tracker linkage](#6-tracker-linkage).

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Important

- **No `## Change Log` section.** `change-log.enabled` defaults to `true` and is not disabled in
  `skills-config.yaml`, so the check applies. Enforcement is `advisory`, so this does not block
  development. *(Check 4b)*
- **Missing three mandatory template sections**: `## 3. Technical Background`,
  `## 5. Breaking Changes`, `## Progress Tracking`. The template
  (`skills/create-task/resources/task-template.md`) defines 11 numbered sections; task 51 has 9 of
  them plus an extra `## Decisions`.

### Optional

- **Sections are unnumbered** where the template numbers 1–11. Siblings task.52, task.53 and task.57
  share the identical shape, so this is a **sequence-wide authoring style**, not a one-off defect —
  worth deciding once for tasks 51–58 rather than per-task.

### Not applicable

- **Stakeholder Sign-off** — `sign-off.enabled` is absent from `skills-config.yaml`, so the check is
  skipped entirely. No finding.
- **Tracker card preflight** — `TRACKER=github`, so the Jira `--check-card` preflight does not apply.

### Compliance detail

- File naming ✅ `task.51.access-mode-config-and-resolver.md` — dots as structural separators,
  hyphens within the descriptive name.
- OKF frontmatter ✅ `type: task` present and non-empty; `description` present; `tags` is a list;
  `updated` present.
- No placeholders (`TBD`, `TODO`, `???`) found.
- `estimated_effort_hours: 4` present — but see I7.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations / unverified claims detected:** 2

### 🚨 Critical

**C2 — Strict validation of `tracker:` will hard-fail a documented, legal config.**

- **Location:** Implementation Plan step 1; Testing Strategy row `tracker: jria`; Risk Assessment row 1.
- **Issue:** `tracker:` has **two** documented forms. The scalar platform override
  (`configuration.md` key reference, L120) and a **mapping** holding `workflowFile`
  (`docs/reference/tracker-workflow.md:353-363`, and `tracker-workflow.js:224-240` which reads it).
  `tracker-workflow.md` explicitly states the two "cannot coexist under one `tracker:` key in YAML".
- **Evidence (executed):** with a config of

  ```yaml
  tracker:
    workflowFile: tracker-workflow.yaml
  ```

  the pyyaml tier of `read_config_key` returns `{'workflowFile': 'tracker-workflow.yaml'}` — verified
  directly. `validate_enum` against `{jira, github, auto}` rejects that, halting a legal config.
  Separately, the awk tier returns empty → `auto` for the same file, so **the two tiers already
  disagree** and strict validation converts that latent disagreement into a hard failure on any
  machine where the pyyaml tier runs.
- **Recommendation (per Q4):** if `tracker:` parses to a mapping, resolve to `auto` and detect. Add a
  dedicated test case, and assert both tiers agree on it.

### ⚠️ Important

**I1 — The cited precedent for the nested-key read does not exist.**

- **Location:** Implementation Plan step 2 — "mirroring how `jira.*` / `github.*` keys are already
  handled elsewhere".
- **Issue:** No bash code reads `jira.*` / `github.*` nested keys. `jira.devEstimateField`,
  `github.projectStatusField` and the rest are read by node, not by a shell resolver. The claim
  points at a pattern that is not there.
- **Evidence:** `grep -rn "devEstimateField" shared/ skills/` returns no shell matches;
  `discover-qa-field.sh` and `discover-sp-field.sh` contain no config reads at all.
- **The real precedent is better than the cited one:** `read_nested_config_key`
  (`shared/resources/resolve-paths.sh:30-60`) is a working two-tier nested reader — pyyaml dotted
  read plus an awk two-line-state read — already consumed by
  `skills/jira-sprint-retrospective/scripts/render-retro.sh:63`.
- **Recommendation (per Q5):** replace the claim with the real reference, and extract the existing
  helper rather than writing a second one.

**I2 — The `tracker:` and `vcs:` legal sets are conflated.**

- **Location:** Risk Assessment, row 1 — "Only `jira`/`github`/`bitbucket`/`auto`/absent are legal".
- **Issue:** That is one set spanning two keys with different domains. Per `configuration.md`
  L120-121, `tracker` is `jira | github | auto`; `vcs` is `github | bitbucket | auto`. A single shared
  set would accept `tracker: bitbucket` and `vcs: jira` — both real misconfigurations, and precisely
  the class of silent fall-through this task exists to close.
- **Recommendation:** state the two sets separately, and give `validate_enum` a per-key legal set.

**I3 — The `python` tier is dead on modern machines.**

- **Location:** Implementation Plan step 2 — "Keep the two-tier degrade: pyyaml first, awk fallback";
  Risk Assessment row 3.
- **Issue:** Both `read_config_key` and `read_nested_config_key` invoke bare `python`. macOS has
  shipped no `python` since 12.3, and this machine has only `python3` — verified
  (`command -v python` → not found; `python3 -c "import yaml"` → OK). Tier 1 therefore never runs
  here, and awk is the only tier in practice.
- **Consequence for the plan:** risk row 3 proposes running the tests "with pyyaml forced
  unavailable" to protect the awk fallback. That tests the path that is *always* taken, while the
  pyyaml path — the one that produces the C2 dict-string — goes untested on the developer's machine
  and live in CI or on a machine that has `python`.
- **Recommendation (per Q5):** fix `python` → `python3` (with a `python` fallback) in the same edit,
  and assert both tiers explicitly in the test matrix.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### 🚨 Critical

**C1 — The specified halt mechanism does not exist at any call site.**

- **Location:** Implementation Plan step 1 — "return non-zero so `source … || exit 1` at the call
  sites halts".
- **Issue:** There is no `|| exit 1` at any call site. All 16 are bare sources:

  | Call site | Form |
  |---|---|
  | `skills/create-epic/SKILL.md:115,296` | `source references/resolve-platform.sh` |
  | `skills/create-pr/SKILL.md:106` | bare |
  | `skills/create-task/SKILL.md:510` | bare |
  | `skills/create-story/SKILL.md:388` | bare |
  | `skills/qa-fix/SKILL.md:177` | bare |
  | `skills/review-bug/SKILL.md:53` | bare (prose) |
  | `skills/review-epic/SKILL.md:785` | bare |
  | `skills/review-story/SKILL.md:641` | bare |
  | `skills/review-task/SKILL.md:541` | bare |
  | `skills/qa-task/SKILL.md:831`, `skills/qa-story/SKILL.md:1425` | bare (prose) |
  | `skills/sync-github-{epic,story,task}/SKILL.md:74,77,60` | bare |
  | `skills/develop-next/SKILL.md:64` | bare |
  | `shared/resources/platform-detection.md:13` | bare (canonical snippet) |

- **Consequence:** as specified, a rejected value prints to stderr and **the run continues**. For
  `access.tracker` that means a typo'd access mode proceeds with the default — which the Motivation
  section itself names as "the one failure the sequence must never produce".
- **Recommendation (per Q3):** add the guards to scope. ~16 SKILL.md edits plus the canonical
  snippet, plus `npm run bundle` to propagate into `skills/*/references/`.

**C3 — Precedence is specified two contradictory ways.**

- **Location:** Implementation Plan step 1 and Success Criteria bullet 1 say "config → env → `full`"
  (config wins, matching the existing resolver order in `platform-detection.md`). The Decisions row
  for `AGENT_SKILLS_ACCESS_TRACKER` says it "lets a single run be locked down without editing
  committed config". Testing Strategy says "Env override set | **Beats config**".
- **Issue:** These cannot all hold. Under config-first, a committed `access: {tracker: full}` cannot
  be locked down by an env var, so the Decisions rationale is false. Under env-first, the test row is
  right but an env var can *loosen* a deliberately restrictive committed config to `full`.
- **Consequence:** a developer must guess, and the two readings differ in security posture — the one
  axis this task says must not be guessed.
- **Recommendation (per Q2):** most-restrictive-wins. Requires an explicit ordering of the five modes
  (`manual` < `command` < `approve` < `read-only` < `full` by permissiveness), which the task did not
  previously define.

### ⚠️ Important

**I4 — Files Summary understates the change.**

Per the Q3 and Q5 decisions, the table is missing: the extracted shared nested-reader helper, the
~16 SKILL.md call sites, and `shared/resources/resolve-paths.sh` (for the `python3` fix). The prose
note about `npm run bundle` covers propagation but not the source edits themselves.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### ⚠️ Important

**I5 — Malformed YAML fails open on an access control.**

- **Location:** Testing Strategy, last row — "Malformed YAML | Falls back to defaults with a warning,
  as today — a broken file must not lock a consumer out".
- **Issue:** correct for `tracker`/`vcs`, where the default is *detect*. But the `access` default is
  `full`, so a truncated or malformed config silently grants the agent full write access. That is the
  same "permissive default on an access control" the Decisions table calls "a defect, not a
  convenience" — applied to the very key the task adds.
- **Recommendation (per Q6):** on parse failure, grep for an `access:` line. Present → halt with
  "access is configured but unreadable". Absent → `full`, as today.

### 💡 Optional

- **Sequence bounds.** The Overview says "First of seven tasks (51–57)" and the frontmatter
  description says "the restricted-tracker-access sequence (tasks 51-57)". The registry has
  **task.58** (`Document restricted tracker access…`) depending on `task.51-57` as the documentation
  layer of the same sequence. Consider "51–58", or name 58 explicitly as the doc layer that runs last.
- **Guard count.** "the ten `skip if TRACKER_ISSUE is empty` branches downstream" — there are 13
  guard sites across 8 pipeline step documents. Either soften to "~13" or drop the count; a precise
  number in prose drifts the moment a step is added.

### Coverage that is genuinely good

The Testing Strategy is stronger than most task documents in this repo: it asserts on resolved value
*and* exit status, runs under `env -i` (the technique `bitbucket-auth.test.sh` established, verified
at L25-31), and carries a **mutation table** naming the expected red for each invariant. The
`package.json` finding is also correct and non-obvious — the `test` chain is hand-maintained
(`package.json:24`) and a suite absent from it runs nowhere.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE, with one wrong premise

- Risk row 1's legal set is wrong — see **I2**.
- Risk row 3's premise is inverted — see **I3**.
- Risk row 2 (a consumer sets `manual` and believes they are protected) is well handled: a one-line
  notice on any non-`full` value, removed by task 53/54.
- The Rollback Plan is realistic and correctly notes the revert is inert for consumers who never set
  the key. With the Q3 decision it should also mention re-bundling after revert, which it already
  does via `npm run bundle`.

### ⚠️ Important

**I6 — No tracker issue linked.** `TRACKER=github` (no `tracker:` key in `skills-config.yaml`, no
`JIRA_URL`), and frontmatter has no `github_issue`. Tasks 47–58 are all unlinked; the board's last
task issue is `[Task 46]` (#216). Resolved per Q7 — see below.

**I7 — Effort estimate is now low.** `estimated_effort_hours: 4` was reasonable for the task as
written. With the Q3 (16 call sites + canonical snippet + re-bundle) and Q5 (extract shared helper,
fix both resolvers' python tier) decisions, 4h understates it.

---

## 6. Tracker linkage

Per Q7: create the issue for task 51 now, and backfill tasks 47–58. The cause of the gap is that
tracker sync is opt-in — `/create-task` Step 4.5 and `/review-task` Step 5 both prompt before
creating a remote issue — and the 51–58 sequence was authored in one pass without it.

---

## Summary of Recommendations

### Must Fix (Critical) — 3

1. **C1** Add `|| exit 1` to all 16 call sites + the canonical snippet, and add them to Files Summary.
2. **C3** Replace the contradictory precedence with most-restrictive-wins, and define the mode ordering.
3. **C2** Treat a mapping-form `tracker:` as `auto`; add a test asserting both tiers agree.

### Should Fix (Important) — 7

1. **I1** Replace the false precedent with `read_nested_config_key`; extract it to a shared helper.
2. **I2** Split the legal sets per key.
3. **I3** Fix `python` → `python3` in both resolvers; test both tiers.
4. **I4** Expand Files Summary to match the new scope.
5. **I5** Fail closed on malformed YAML when `access:` is present.
6. **I6** Create and link the GitHub issue.
7. **I7** Raise `estimated_effort_hours`.

Plus: add the missing `## Change Log`, `## Technical Background`, `## Breaking Changes` and
`## Progress Tracking` sections.

### Consider (Optional) — 3

1. Sequence bounds: 51–57 vs 51–58.
2. Soften the "ten guards" count.
3. Decide section numbering once for the whole 51–58 sequence.

---

## Implementation Readiness Assessment

**Score (as found):** 6/10

| Dimension | Score | Note |
|---|---|---|
| Template Compliance | 6/10 | Missing Change Log + 3 mandatory sections; naming and OKF clean |
| Technical Accuracy | 5/10 | One false precedent, one conflated legal set, one config-form collision |
| Implementation Clarity | 6/10 | File-level and specific, but the halt mechanism is not real |
| Consistency | 5/10 | Precedence stated two ways; access fails open on malformed YAML |
| Risk Management | 6/10 | Good structure, two wrong premises |

**Confidence Level for Successful Implementation (as found):** Medium — a developer would ship
validation that does not block, under a precedence they had to guess.

**Recommendation:** ⚠️ **NEEDS REVISION** — addressed in this pass; the task is promoted to
`ready-for-development` with all critical and important findings applied.

---

## Next Steps

1. Implement against the revised Implementation Plan (now 9 steps).
2. Watch each invariant fail under its mutation before trusting it — the table is the point.
3. Run `npm run bundle` and commit the regenerated `skills/*/references/` copies.
4. `npm test` and `npm run validate:all` green before PR.

---

## Review Metadata

- **Reviewer:** review-task skill
- **Review Date:** 2026-08-17
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md`
- **Branch:** `feature/task.51.access-mode-config-and-resolver` (base `develop`)
- **Sources consulted:** `shared/resources/resolve-platform.sh`, `shared/resources/resolve-paths.sh`,
  `shared/resources/platform-detection.md`, `docs/reference/configuration.md`,
  `docs/reference/tracker-workflow.md`, `shared/resources/tracker-workflow.js`,
  `scripts/setup-consumer.sh`, `package.json`, `shared/resources/resolve-platform.test.sh`,
  `shared/resources/bitbucket-auth.test.sh`, `skills/create-task/resources/task-template.md`,
  `docs/tasks/task-registry.md`, sibling tasks 52/53/57/58
- **Verification performed:** executed the resolver against a mapping-form `tracker:` fixture;
  probed `python`/`python3` availability; enumerated all 16 `source resolve-platform.sh` call sites;
  queried the GitHub issue list for `[Task` titles
