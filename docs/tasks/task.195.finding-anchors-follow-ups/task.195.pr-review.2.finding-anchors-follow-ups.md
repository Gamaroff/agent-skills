# PR Review Report: PR #695 — fix(task.195): finding-anchors follow-ups — unparseable, root-in-rev, --index, reason-deciding dispatchers

**Reviewed:** 2026-10-19
**PR:** [#695](https://github.com/Gamaroff/agent-skills/pull/695) — `feature/task.195.finding-anchors-follow-ups` → `develop` (OPEN)
**Work item:** [`task.195.finding-anchors-follow-ups.md`](./task.195.finding-anchors-follow-ups.md) — resolved via `branch-stem`
**Tracker:** [#597](https://github.com/Gamaroff/agent-skills/issues/597) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.195.implementation.1.finding-anchors-follow-ups-initial-run.md |
| Review report | ✅ | task.195.review.1.finding-anchors-follow-ups.md |
| QA reports | 5 | task.195.qa.1 … qa.5 |
| Gate | PASS | task.195.gate.5.finding-anchors-follow-ups.yml (100) |
| DoD | ✅ | task.195.dod.1.finding-anchors-follow-ups.md (from the finalise run that halted on DoD gaps; finalise writes the next one) |
| Sprint review | ❌ | not yet: the work item is `ready-for-review`, and `/finalise` writes it |
| Open bugs | 0 | — |
| Handover | ❌ | none (not required) |

## Acceptance Criteria Traceability

The conformance lens checked the success criteria against the diff and found no coverage, scope, trail or consistency gap. The rows below summarise them; the task document's success criteria are the source.

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1 a non-`path:line` code anchor reads `unparseable` | `shared/resources/finding-anchors.js` (`anchorOf`, `fieldOf`), engine tests | ✅ met |
| SC-2 `--rev` with a `--root` absent from the commit exits `bad-root` | `finding-anchors.js`, CLI test | ✅ met |
| SC-5 `--inline` refuses un-annotated or non-findings input | review-pr / review-code guards, guard tests, fence probe 43/0 | ✅ met |
| SC-10 mutation proofs | QA reports 1–5, each fix proven | ✅ met |

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`): the QA loop runs the code reviewer every cycle with `code_review_blocking=true`, and gate 5's review was clean.

**Anchors:** 0 checked against `05f97433a0a949c209e865257a61dfff493ad200` (via `head-branch`). There were no findings to check.

Scope: the four bundled `skills/{qa-story,qa-task,review-code,review-pr}/references/finding-anchors.js` copies were excluded (AUTO-GENERATED, byte-identical to the source apart from the header). `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` is hand-authored and named by the work item, so it was reviewed despite the `references/` exclusion.

## Machine-Readable Findings

```yaml
reviewed_gate: task.195.gate.5.finding-anchors-follow-ups.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`. It takes a fresh CI reading (4 checks passed and 1 still running at `05f97433` when this review ran) and re-runs the DoD.
