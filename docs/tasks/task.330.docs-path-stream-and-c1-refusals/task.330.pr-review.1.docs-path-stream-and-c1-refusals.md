# PR Review Report: PR #961 — fix(task.330): isDocsPath refuses the NTFS .git stream and C1 controls (#957)

**Reviewed:** 2026-11-27
**PR:** [#961](https://github.com/Gamaroff/agent-skills/pull/961) — `feature/task.330.docs-path-stream-and-c1-refusals` → `develop` (OPEN)
**Work item:** [`task.330.docs-path-stream-and-c1-refusals.md`](./task.330.docs-path-stream-and-c1-refusals.md) — resolved via `branch stem`
**Tracker:** [#957](https://github.com/Gamaroff/agent-skills/issues/957) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.330.implementation.1.docs-path-stream-and-c1-refusals-initial-run.md |
| Review report | ✅ | task.330.review.1.docs-path-stream-and-c1-refusals.md |
| QA reports | 1 | task.330.qa.1.docs-path-stream-and-c1-refusals.md |
| Gate | PASS | task.330.gate.1.docs-path-stream-and-c1-refusals.yml (100) |
| DoD | ❌ | not yet — written by `/finalise` (task is `ready-for-review`) |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ✅ | none present, nothing outstanding |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Every row of the § 8 table holds in a test | the four `task.330:` tests in `shared/resources/tests/ci-tree-equivalence.test.mjs`; the `git-name` cases in `shared/resources/security-input-corpus.mjs` | ✅ met |
| `isDotGitSegment` has no new caller | `shared/resources/ci-tree-equivalence.js:197` is the one call | ✅ met |
| Performance: not applicable | — | ✅ met |
| Every § 8 mutation recorded in the QA report with its red test | QA report § Code Review, three `mutation-proven` lines | ✅ met |
| `npm run test:remote` and `npm run bundle:check` pass | implementation report Step 3; QA report | ✅ met |
| CHANGELOG names both § 5 changes and `@(`, `!(`, `+(` | `CHANGELOG.md` `[Unreleased]` | ✅ met |
| Bracket message and runbook give the `?` advice | `shared/resources/ci-tree-equivalence.js` UsageError; `docs/runbooks/ci-docs-only-skip.md` | ✅ met |

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`). The code lens ran in QA cycle 1 (Step 3b) and returned no findings.

**Anchors:** 0 findings to check against `9c1a872a0e8a` (via `head-branch`). All verified.

Scope note: the 16 generated `skills/*/references/` copies were excluded from the diff. `npm run bundle:check` reports them identical to their sources, and the Files Summary names them only as `npm run bundle` output.

## Machine-Readable Findings

```yaml
reviewed_gate: task.330.gate.1.docs-path-stream-and-c1-refusals.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Run `/finalise`.
