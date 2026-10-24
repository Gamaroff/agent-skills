# PR Review Report: PR #745 — fix(task.217): inline posts only checker-verified anchors

**Reviewed:** 2026-10-24
**PR:** [#745](https://github.com/Gamaroff/agent-skills/pull/745) — `feature/task.217.finding-anchors-advisory-follow-ups` → `develop` (OPEN)
**Work item:** [`task.217.finding-anchors-advisory-follow-ups.md`](./task.217.finding-anchors-advisory-follow-ups.md) — resolved via `branch-stem`
**Tracker:** [#698](https://github.com/Gamaroff/agent-skills/issues/698) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.217.implementation.1.finding-anchors-advisory-follow-ups-initial-run.md` (working tree; Step 8 commits it) |
| Review report | ✅ | `task.217.review.1.finding-anchors-advisory-follow-ups.md` |
| QA reports | 4 | `task.217.qa.1`–`qa.4` |
| Gate | PASS | `task.217.gate.4.finding-anchors-advisory-follow-ups.yml` (100) |
| DoD | ❌ | Not yet — the document is `ready-for-review`; `/finalise` writes it |
| Sprint review | ❌ | Not yet — written by `/finalise` |
| Open bugs | 0 | bug.1–bug.5 all closed |
| Handover | ✅ | none present, nothing outstanding |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. The `--inline` blocks post only checker-stamped, known verdicts | `skills/review-pr/SKILL.md` and `skills/review-code/SKILL.md` stamp guards; review-pr and review-code block tests | ✅ met |
| 2. A non-object finding is refused as `usage` | `shared/resources/finding-anchors.js`; `finding-anchors.test.mjs` usage tests | ✅ met |
| 3. review-code `--inline` and `--fix` are runnable as written and never edit an unchecked file | `finding-anchors.js --fix-list`; Step 5 block test in `skills/review-code/tests/review-code.test.js` | ✅ met |
| Test hygiene (TMPDIR, dispatcher population) | `finding-anchors.test.mjs` (`GIT_CEILING_DIRECTORIES`); `evals/shared/tests/finding-anchors-blocks.test.mjs` | ✅ met |

## Conformance Findings

```
[PC-1] scope · low · confidence: high — docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.finding-anchors-advisory-follow-ups.md:92
  The work item says Step 5 runs a `git diff --quiet` check under `--staged` and that the stamp is
  `{by, findings}`, but the PR ships `finding-anchors.js --fix-list` and adds `tree` and `root` to the
  `anchor_checked` stamp, and outside one Change Log row the work item never describes either.
  → Update §3 Target Architecture, the Phase 3 checklist and Breaking Change 2 to describe
    `--fix-list`, the stamp's `tree`/`root` fields and their effect on every `--fix` target.
```

## Code Review Findings

Skipped (`--no-code`). QA cycle 4's Step 3b code review covers this diff.

**Anchors:** 1 checked against `11fd2d2e21eef16646a0b09f9d768bfec1b79854` (via `head-branch`) — all verified

Scope: the full `origin/develop...origin/feature/task.217.finding-anchors-advisory-follow-ups` diff.
The four bundled `references/finding-anchors.js` copies were **not** excluded, because the work item
names them in its Files Summary. `npm run bundle:check` reports them fresh.

## Machine-Readable Findings

```yaml
reviewed_gate: task.217.gate.4.finding-anchors-advisory-follow-ups.yml
findings:
  - id: PC-1
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.finding-anchors-advisory-follow-ups.md:92"
    anchor_check: ok
    finding: "The work item describes Step 5 as a git diff --quiet check and the stamp as {by, findings}, but the PR ships finding-anchors.js --fix-list and adds tree and root to the anchor_checked stamp, which the work item never describes outside one Change Log row."
    suggested_action: "Update §3 Target Architecture, the Phase 3 checklist and Breaking Change 2 to describe --fix-list, the stamp's tree/root fields and their effect on every --fix target."
truncated_count: 0
```

## Recommended Actions

1. Bring the work item's §3, Phase 3 and Breaking Change 2 in line with the shipped `--fix-list` design (PC-1, low).
