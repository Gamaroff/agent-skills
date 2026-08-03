---
id: task.36.review.1
title: "Task Review Report: Task 36 — Stop setup-consumer.sh generating a narrowing jira.statusMap"
type: review
description: "Standard-depth review of task.36 and its implementation plan: one Critical detector-wiring defect, seven Important accuracy and coverage issues, five Optional refinements."
tags: [review, task, jira, configuration]
task-ref: task.36.setup-consumer-statusmap-fix.md
status: accepted
created: 2026-08-03
updated: 2026-08-03
---

# Task Review Report: Task 36 — Stop `setup-consumer.sh` generating a `jira.statusMap` that disables status syncing

**Reviewed:** 2026-08-03
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD (with one blocking defect)

> **Implementation Status**: ✅ All 13 recommendations implemented — 2026-08-03

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/task.36.setup-consumer-statusmap-fix
  - Base:       develop
  - Epic branch: N/A
  - Auto-skip:  false
```

Output format: Comprehensive report (user choice, Step 0).
Tracker: `TRACKER=github` (resolved via `shared/resources/resolve-platform.sh`). `github_issue: 184`
verified OPEN; frontmatter, body cross-reference link and registry row all agree — no linkage gap.

---

## Executive Summary

The task is unusually well-sourced: every line number, symbol name, commit hash and candidate-list
claim I checked against the codebase was accurate, and the central diagnosis — that
`loadStatusMap` *replaces* rather than seeds, so the wizard's generated block narrows six-name
candidate lists to one name — is correct and verified at `shared/resources/jira-sync.js:1660-1667`.

One defect blocks implementation: the detector described in Phase 3 is wired to the **merged**
status map, where its whole-map fingerprint test can never evaluate true. As specified, the detector
would ship, pass its own unit test, and never fire in production — the single most consequential
failure mode for a feature whose entire purpose is discoverability.

The remaining findings are accuracy and coverage: two overstated claims in the Motivation, a third
mirrored `statusMap` example the doc scope misses, a test strategy that does not verify the success
criteria it is paired with, and two plan-level edit instructions that would land in the wrong place.

**Critical Issues:** 1 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1 — Detector wiring (Critical)

**Question**: `detectNarrowingStatusMap(statusMap)` is fed `loadStatusMap()`'s merged output, so
`wholeMap` can never be true. How should it get the raw override block?

- **User Decision**: **New `loadStatusMapOverrides()` helper** — an exported function doing the
  file-read + `parseStatusMapBlock`, returning `base` unmerged. `probeWorkflow` calls it alongside
  `loadStatusMap`.
- **Impact**: `detectNarrowingStatusMap` stays a pure function over a plain object, so the Phase 3
  unit test needs no temp files. Adds one exported symbol to the library surface.

### Q2 — Documentation scope

**Question**: `configuration.md` has three `statusMap` examples; the task scopes only one.

- **User Decision**: **Fix L42 too** — the top-of-file skeleton must not teach the narrowing shape.
- **Impact**: Phase 2 widens from one worked example to two, plus the singular-name comment.

### Q3 — Test approach

**Question**: The plan's source-grep never generates a file, so it verifies neither the emitted YAML
nor any reader — contradicting §8 and §9.

- **User Decision**: **Generate for real in the test.**
- **Impact**: Phase 3 gains real scaffolding (drive the wizard non-interactively into a temp dir, or
  extract `write_skills_config`), and the four integration checks become executable rather than
  manual. This is the largest single increase in scope from the review.

### Q4 — Effort estimate

**Question**: Frontmatter `estimated_effort_hours: 2` vs rubric 8h (4× divergence).

- **User Decision**: **Raise to 4h.**
- **Impact**: Frontmatter updated; reflects the added test scaffolding from Q3.

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present: Overview, Motivation, Technical Background, Scope, Breaking Changes,
Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback
Plan, Progress Tracking, References, Notes. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere.

- **File naming**: `task.36.setup-consumer-statusmap-fix.md` — dots as structural separators,
  hyphens within the descriptive name. ✅
- **Metadata**: `status: planned` / `**Status:** Planned` consistent across frontmatter and body. ✅
- **OKF conformance**: `type: task` present and non-empty ✅; `description` present ✅; `tags` is a
  YAML list ✅; `updated` present ✅. Tracker resource derivable from `github_issue: 184` ✅.
- **Tracker linkage**: `github_issue: 184` → issue OPEN, title matches, body link
  `[#184](https://github.com/Gamaroff/agent-skills/issues/184)` agrees with frontmatter, registry
  row 78 agrees. ✅ No dedup or repair needed.
- **Co-located plan**: `task.36.plan.setup-consumer-statusmap-fix.md` present and linked from §6,
  satisfying the plan-file-location standard. ✅

No issues.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Nothing in this task is invented. Every symbol, path, line number and commit referenced exists. What
follows are two *inaccuracies* — claims about real things that do not hold — not fabrications.

### Verified accurate

| Claim | Verification |
|---|---|
| `setup-consumer.sh:337` emits the live `statusMap` block | ✅ exact line |
| `loadStatusMap` at `jira-sync.js:1659-1681`, replace semantics | ✅ L1660 `{...DEFAULT_STATUS_MAP}`, L1663 `map[k] = v` |
| `parseStatusMapBlock` L1571-1648 | ✅ exact |
| `DEFAULT_STATUS_MAP` L1417-1447 | ✅ exact |
| Every generated scalar equals `candidates[0]` of its list | ✅ `To Do`, `In Progress`, `In Review`, `Done`, `Cancelled` all confirmed as index 0 |
| `ready-for-review` loses "Waiting for Review", "Code Review", "Peer Review", "Review" | ✅ all four in `REVIEW_CANDIDATES` (L1291-1298) |
| `configuration.md:362` claims "the built-in defaults" | ✅ exact line |
| `configuration.md:235` says "Most projects need **no** `statusMap` at all" | ✅ exact line |
| `088af2b` (2026-06-30) introduced the block | ✅ `feat(setup-consumer): scaffold jira.statusMap in generated config` |
| `2e14043` (2026-07-29) introduced candidate lists | ✅ `feat(jira): resolve transitions against the board, not a hardcoded status name` |
| `shared/resources/tests/*.test.mjs` already globbed; no `package.json` change | ✅ `package.json:24` |
| `jira-stage.test.mjs` / `jira-stage-fixtures.test.mjs` exist | ✅ |
| Commented lines are safe for `parseJiraScalar` | ✅ L1750 skips `#`-leading lines explicitly |
| `parseStatusMapBlock` tolerates an all-comment `jira:` block | ✅ `isSkippable` (L1576) skips them; returns `{}` |
| task.37 exists and does not depend on this task | ✅ `docs/tasks/task.37.tracker-workflow-config-engine/` |

### Issues

#### Critical (1)

**C1 — The detector as wired can never fire.**

- **Location**: plan §Phase 3, the `probeWorkflow` wiring snippet
- **Issue**: the snippet calls `detectNarrowingStatusMap(statusMap)`, but in `probeWorkflow` the
  variable `statusMap` is `loadStatusMap(repoRoot, docKind)` (`jira-sync.js:2592`) — i.e.
  `{...DEFAULT_STATUS_MAP}` **merged** with the overrides, carrying ~27 keys including all the
  aliases (`todo`, `doing`, `review`, `wontfix`, …).
- **Evidence**: `detectNarrowingStatusMap` counts as hits only keys whose value is a *string* equal
  to `DEFAULT_STATUS_MAP[key][0]`. Against the merged map the seven wizard keys are strings and hit;
  the ~20 alias keys are still frozen arrays and cannot. So `hits.length` is 7 while `keys.length`
  is 27, and `wholeMap = hits.length === keys.length` is **false for every possible input**.
- **Consequence**: the detector ships, its unit test passes (the test feeds it a bare 7-key object,
  not the merged map), and no affected consumer is ever told. The feature exists only in the
  changelog.
- **Recommendation** *(per Q1)*: add an exported `loadStatusMapOverrides(repoRoot)` that performs
  the file-read + `parseStatusMapBlock` and returns `base` **unmerged**, matching `loadStatusMap`'s
  swallow-everything discipline (`catch → {}`). `probeWorkflow` calls it alongside `loadStatusMap`
  and passes its result to the detector. `detectNarrowingStatusMap` stays pure.

#### Important (2 of 7 in this section)

**I1 — "six 4–6-name candidate lists" is wrong; there are five.**

- **Location**: §1 Overview, L29-30; repeated in the plan's Phase 4 CHANGELOG draft
- **Issue**: the seven generated keys resolve to **five** distinct lists — `NEW_CANDIDATES` (shared
  by `draft`, `planned`, `ready-for-development`), `IN_PROGRESS_CANDIDATES`, `REVIEW_CANDIDATES`,
  `DONE_CANDIDATES`, `CANCELLED_CANDIDATES`. Sizes 5, 4, 6, 5, 5 — so "4–6-name" is right, "six"
  is not.
- **Recommendation**: "collapses five 4–6-name candidate lists (across seven keys) down to one
  vanilla name each". Fix in both the task and the CHANGELOG draft, since the changelog is the
  version future readers will quote.

**I2 — "Ready for Testing" is not a candidate for any status the wizard writes.**

- **Location**: §1 Overview, L31
- **Issue**: "Ready for Testing" lives in `QA_CANDIDATES` (`jira-sync.js:1327-1333`), which is **not
  referenced by `DEFAULT_STATUS_MAP`** — it belongs to the pipeline-stage vocabulary, not the
  document-status map. A board using that word is unaffected by this bug, so the example argues
  against the task rather than for it.
- **Secondary**: "gets silent, **total** status-sync failure" overstates. A board with vanilla
  `In Progress`/`Done` but a non-vanilla review column loses only the review transition. The bug is
  serious enough stated accurately.
- **Recommendation**: replace the third example with one that is actually reachable — `"Resolved"`
  or `"Closed"` for `accepted`, or `"Doing"` for `in-progress` — and soften "total" to "silent
  status-sync failure for every status whose column your board words differently".

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Phase structure, risk levels, dependencies and the Phase 1↔2 same-commit constraint are all well
specified. Three gaps, all in Phases 2 and 3.

#### Important

**I3 — A third mirrored `statusMap` example is out of scope.**

- **Location**: §4 In Scope / plan Phase 2 — both name only `configuration.md:361-372`
- **Issue**: `configuration.md:42-44`, in the annotated skeleton at the top of the file, is the
  first `statusMap` a reader meets:
  ```yaml
  statusMap: # optional — local status → Jira workflow status name
    ready-for-development: Selected for Development
    ready-for-review: In Review
  ```
  `ready-for-review: In Review` is exactly the narrowing scalar this task exists to stop teaching,
  and the comment says "status **name**" singular, contradicting the list form the same document
  documents at L254-256. (The third example at L253-268, under *Overriding*, is already correct —
  it shows list form and states the replace semantics. No change needed there.)
- **Recommendation** *(per Q2)*: extend Phase 2 to fix L42-44 — show the list form
  (`ready-for-review: [Waiting for Review, In Review]`), pluralise the comment to "status name(s)",
  and add "usually unnecessary".

**I6 — Plan Edit 3's insertion point lands inside a fenced code block.**

- **Location**: plan §Phase 2, "Edit 3 — new subsection, after the 'Overriding' paragraph (~L267)"
- **Issue**: L267 is *inside* the ```` ```yaml ```` fence that runs L258-268. Inserting a markdown
  subsection there corrupts the example.
- **Recommendation**: insert after L271 (the end of the per-issue-type paragraph), before the
  "**Required transition fields.**" paragraph at L273.

**I7 — Plan Edit 4 creates a duplicate link to the same anchor.**

- **Location**: plan §Phase 2, "Edit 4 — key reference table, L100"
- **Issue**: the `jira.statusMap` cell at L100 **already** ends with
  `See [Jira status mapping](#jira-status-mapping).` Appending
  `See [Migration](#jira-status-mapping)` gives two links to the same target in one cell.
- **Recommendation**: point the new link at the Migration subsection's own generated anchor, or
  replace the existing sentence rather than appending to it.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important

**I4 — The test strategy does not verify the success criteria it is paired with.**

- **Location**: §8 Testing Strategy vs plan §Phase 3, Test 1
- **Issue**: §9 Success Criteria asserts "A freshly generated Jira `skills-config.yaml` contains no
  active `statusMap:` key", and §8 Integration Tests lists four checks against *the generated file*.
  The plan's Test 1 instead greps `scripts/setup-consumer.sh` **source** for an uncommented
  `statusMap:` — it never generates a file, so it exercises no reader and cannot substantiate either
  claim. §8 also asserts "Generator output for `TRACKER=github` is unchanged", which a source-grep
  likewise cannot show.
- **Recommendation** *(per Q3)*: drive the wizard non-interactively into a temp directory (or
  extract `write_skills_config` into a sourceable unit), assert on the emitted YAML, and run the
  four reader checks against it. Keep the source-grep as a cheap additional guard if desired.

**I5 — The Risk-2 mitigation claims reader coverage the test list does not deliver, and the reader
count is low.**

- **Location**: §10 Risk Assessment, Medium Risk 2 ("the integration tests above exercise all
  readers"); §Notes Known Issues ("Five independent hand-rolled YAML readers exist in this repo")
- **Issue**: §8 Integration Tests names three readers (`resolve-platform.sh:read_config_key`,
  `resolve-paths.sh:read_nested_config_key`, `jira-sync.js:parseJiraScalar`) plus a wizard re-run —
  not "all". Uncovered: `setup-consumer.sh:_read_config_path` (L292) and
  `generate-prd-epic-index.mjs:prdRootFromConfig` (L66). That also makes the count **six**
  hand-rolled readers, not five — plus `set-github-project-estimate.sh`, which shells out to Python
  `yaml.safe_load` and so is a seventh reader of the same file, though a real parser rather than a
  hand-rolled one.
- **Recommendation**: either add the two uncovered readers to §8, or downgrade the mitigation
  wording to name exactly which readers are exercised. Correct the Known Issues count to six
  hand-rolled (seven readers total). Note the practical risk stays Low — both uncovered readers key
  off blocks that precede `jira:` in the generated file.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk identification is proportionate and honest. Two observations, both favourable:

- **Medium Risk 2 (commented YAML confusing a hand-rolled parser) is verified Low.** I checked both
  scanners directly: `parseJiraScalar` skips `#`-leading lines at L1750 before any indent logic, and
  `parseStatusMapBlock`'s `isSkippable` (L1576) does the same. An all-comment `jira:` block yields
  `""` and `{}` respectively — exactly what the plan's "Verified safe" note claims. The stated
  mitigation (the adjacent `devEstimateField` lines are already commented, so the shape is proven)
  holds.
- **Medium Risk 1 (a consumer relying on the narrowing) is well handled** — delete → probe → re-add
  is the right order, and the instruction to keep an ordered-list override when two board columns
  both match is the correct nuance.

Rollback plan is realistic: three tiers with distinct triggers, and the partial-rollback split
(revert the `jira-sync.js` hunk, keep the generator and docs) correctly identifies which half is
load-bearing.

No issues.

---

## 6. Mermaid Diagram Validation

No Mermaid diagrams in either the task or the plan. **None recommended** — the task introduces no
data shape and no branching logic; §3's four-line ASCII call chain
(`mapStatusCandidates → loadStatusMap → parseStatusMapBlock`) conveys the structure more compactly
than a flowchart would. Adding one would restate the Implementation Plan.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. **C1** — Add `loadStatusMapOverrides(repoRoot)` and feed the detector the *unmerged* override
   block. As specified the detector cannot fire. *(per Q1)*

### Should Fix (Important) — 7

1. **I4** — Make the test actually generate a config; the current approach verifies neither §8 nor
   §9. *(per Q3)*
2. **I3** — Bring `configuration.md:42-44` into Phase 2. *(per Q2)*
3. **I1** — "six" candidate lists → **five** (seven keys), in both the task and the CHANGELOG draft.
4. **I2** — Drop the "Ready for Testing" example (not reachable from `DEFAULT_STATUS_MAP`); soften
   "total status-sync failure".
5. **I5** — Align the Risk-2 mitigation with what §8 actually tests; Known Issues count is six
   hand-rolled readers, not five.
6. **I6** — Plan Edit 3 insertion point moves from ~L267 (inside a fence) to after L271.
7. **I7** — Plan Edit 4 must not duplicate the existing `#jira-status-mapping` link in the L100 cell.

### Consider (Optional) — 5

1. **O1** — `estimated_effort_hours: 2` → **4**. *(per Q4)*
2. **O2** — Plan §Key Patterns calls `loadStatusMap`'s second parameter `docKind`; the signature is
   `issueType` (`jira-sync.js:1659`). `docKind` is the caller-side name.
3. **O3** — "before v0.35" hardcodes an unreleased version. CHANGELOG is at `v0.34.1`; `package.json`
   says `1.0.0` (a pre-existing inconsistency). Prefer "generated before this fix" and let the
   CHANGELOG entry carry the version.
4. **O4** — `eqName` is defined at L2036, *after* the detector's proposed home (~L1681). Safe,
   because `probeWorkflow` (L2512) runs long after module evaluation — but worth a one-line comment
   so nobody "fixes" it later.
5. **O5** — §4 and plan Phase 2 cite `configuration.md:361-372`; the block actually spans L360-372
   (`jira:` at 363, `statusMap:` at 365). L362 is exact.

---

## Implementation Readiness Assessment

**Score:** 7/10

| Dimension | Score | Note |
|---|---|---|
| Template Compliance | 10/10 | Complete, no placeholders, tracker linkage clean |
| Technical Accuracy | 6/10 | Zero hallucinations; one wiring defect, two overstated claims |
| Implementation Clarity | 7/10 | Phases sharp; two plan edits point at the wrong lines |
| Consistency | 6/10 | Test strategy contradicts success criteria; doc scope misses one mirror |
| Risk Management | 8/10 | Proportionate, honest, verified — mitigation wording overreaches |

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** The diagnosis, the decision not to "fix the values", and the sourcing are all
strong — this is a task written by someone who read the code. But the detector is the only part of
the change that reaches already-affected consumers, and as specified it cannot fire; shipping it
would produce a changelog entry for a feature that does nothing. That plus the test/criteria
mismatch must be resolved before implementation.

---

## Next Steps

1. Apply C1 — `loadStatusMapOverrides` helper, detector fed the unmerged block *(per Q1)*
2. Apply I4 — real generation in the test, four reader checks executable *(per Q3)*
3. Apply I3 — widen Phase 2 to `configuration.md:42-44` *(per Q2)*
4. Apply I1, I2, I5 — accuracy corrections to Overview, Risk 2 and Known Issues
5. Apply I6, I7 — correct the two plan edit targets
6. Apply O1 — `estimated_effort_hours: 4` *(per Q4)*
7. Promote status to `ready-for-development` and run `/develop-task`

---

## Review Metadata

- **Reviewer:** Claude (review-task, standard depth)
- **Review Date:** 2026-08-03
- **Task File:** `docs/tasks/task.36.setup-consumer-statusmap-fix/task.36.setup-consumer-statusmap-fix.md`
- **Plan File:** `docs/tasks/task.36.setup-consumer-statusmap-fix/task.36.plan.setup-consumer-statusmap-fix.md`
- **Sources consulted:** `shared/resources/jira-sync.js` (L1278-1333, L1417-1447, L1571-1748,
  L2036, L2512-2712, L3103-3105), `scripts/setup-consumer.sh` (L286-360),
  `docs/reference/configuration.md` (L36-50, L100, L216-275, L350-380),
  `shared/resources/resolve-platform.sh`, `shared/resources/resolve-paths.sh`,
  `shared/resources/generate-prd-epic-index.mjs`, `shared/resources/set-github-project-estimate.sh`,
  `package.json`, `CHANGELOG.md`, `docs/tasks/task-registry.md`, git history (`088af2b`, `2e14043`)
- **Architecture docs consulted:** none required — this task touches no architectural boundary
