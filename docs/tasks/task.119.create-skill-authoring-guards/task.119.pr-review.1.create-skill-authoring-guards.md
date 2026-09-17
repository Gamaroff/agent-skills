# PR Review Report: PR #420 — feat(task.119): authoring guards — positional tokens in fenced bash, comment-only bundle origins, and the rules behind them

**Reviewed:** 2026-09-17
**PR:** [#420](https://github.com/Gamaroff/agent-skills/pull/420) — `feature/task.119.create-skill-authoring-guards` → `develop` (OPEN)
**Work item:** [`task.119.create-skill-authoring-guards.md`](./task.119.create-skill-authoring-guards.md) — resolved via `branch-stem`
**Tracker:** [#419](https://github.com/Gamaroff/agent-skills/issues/419) — OPEN (board: In Progress)
**Verdict:** ✅ APPROVE

Effort `medium`; both lenses dispatched 18:36, returned 18:39 (conformance) and 18:40 (code). Diff scoped to `origin/develop...origin/feature/task.119.create-skill-authoring-guards` with `*/references/*` excluded (regenerated bundle copies — 59 of the PR's 94 files); 2,761 diff lines reviewed.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.119.implementation.1.create-skill-authoring-guards-initial-run.md |
| Review report | ✅ | task.119.review.1.create-skill-authoring-guards.md |
| QA reports | 3 | task.119.qa.1 / qa.2 / qa.3 |
| Gate | PASS | task.119.gate.3.create-skill-authoring-guards.yml (100) — cycle 3 entry reads `Proceeding to 5c` |
| DoD | ❌ | not expected — status `ready-for-review`, before `/finalise` |
| Sprint review | ❌ | not expected — before `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none — `access.tracker: full`, nothing deferred |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Guard runs under `npm test`/CI, has a floor, reasoned allowlist | `tests/fenced-bash-positional-params.test.js` §1 floor, §2 scan, §3 allowlist reasons, §5 line-level coverage; `tests/*.test.js` already in the `npm test` glob | ✅ met |
| 2. create-skill states the three rules with failure modes; qa-task 4b states its from-disk limit | `skills/create-skill/SKILL.md` § Three Rules…; `skills/create-skill/references/runnable-prose.md`; `skills/qa-task/SKILL.md` Step 4b | ✅ met |
| 3. `bundle_skill.py` warns on a comment-only origin; guard test asserts the live tree has none | `bundle_skill.py` `comment_only_refs` / `warn_comment_only_refs`; `tests/bundle-comment-origin.test.js` §1a–§1c fixture, §2 live tree | ✅ met |
| 4. create-task "One task or several?" with three seams and dependency-note obligation | `skills/create-task/SKILL.md` §1.2 | ✅ met |
| 5. Observations #23, #24, #36, #39 close naming this PR | observation log entries `actioned`, resolution "task.119 (PR #420)" | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md:130,230
  The task document still describes the guard as "§5 asserts opener parity" over "478 blocks" while the shipped §5 is a line-level coverage assertion over 485 blocks — the drift gate 3 recorded under recommendations.future (b).
  → Update Files Summary and Progress Tracking Phase 1 to say §5 is a per-opener line-level coverage assertion and the count is 485.

[PC-2] consistency · low · confidence: high — tests/fenced-bash-positional-params.test.js:48
  The guard's header says the scan covered "100 SKILL.md files" while skillFiles() returns 128.
  → Correct the header count to 128.

[PC-3] scope · low · confidence: medium — skills/develop-next/references/document-status-lifecycle.md
  The branch deletes the vendored copy (qa-fix cycle 2, CR-6) but §7 Files Summary never names it, so the removal is traceable only through the Change Log row and qa.2.
  → Add a Files Summary row for the removal.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/create-skill/scripts/bundle_skill.py:111
  COMMENT_LINE_RE classifies only lines that BEGIN with //, /*, * or # as comment-only, so a trailing comment (`const x = 1; // see shared/resources/a.md`) or an interior line of a /* */ block without leading asterisks is followed by discovery yet never warned about — and §2 of the guard mirrors the same regex.
  → Treat a `//` after code and lines inside an open /* … */ block as comment origins; mirror in the test; add a trailing-comment fixture.

[CR-2] cleanup · low · confidence: high — tests/bundle-comment-origin.test.js:169
  §2 re-implements comment_only_refs in JavaScript by copying the three regexes from bundle_skill.py, and nothing asserts the two agree.
  → Drive the Python function from §2, or add a parity case running both over the same fixture.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md:130,230"
    finding: "Task document still says '§5 asserts opener parity' over '478 blocks'; the shipped §5 is a line-level coverage assertion over 485 blocks."
    suggested_action: "Update Files Summary and Progress Tracking Phase 1 to describe §5 as line-level coverage and record 485."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "tests/fenced-bash-positional-params.test.js:48"
    finding: "Guard header records '100 SKILL.md files' while skillFiles() returns 128."
    suggested_action: "Correct the header count to 128."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "skills/develop-next/references/document-status-lifecycle.md"
    finding: "The deletion of the orphaned vendored copy is not named in the task's Files Summary."
    suggested_action: "Add a Files Summary row for the removal."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/create-skill/scripts/bundle_skill.py:111"
    finding: "COMMENT_LINE_RE misses trailing comments and asterisk-less lines inside /* */ blocks, which discovery still follows without a warning."
    suggested_action: "Extend the comment-origin classifier to trailing and block-interior comments, mirror it in the test, add a fixture."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "tests/bundle-comment-origin.test.js:169"
    finding: "The test's JavaScript re-implementation of comment_only_refs is never checked against the Python original."
    suggested_action: "Drive the Python function from §2 or add a parity case over one fixture."
truncated_count: 0
```

## Recommended Actions

1. Reconcile the task document and guard header with the shipped guard (PC-1, PC-2, PC-3) — three small text edits, before `/finalise` reads the trail.
2. Follow-up (not this PR): extend the comment-origin classifier to trailing and block-interior comments and prove the JS/Python readers agree (CR-1, CR-2).
