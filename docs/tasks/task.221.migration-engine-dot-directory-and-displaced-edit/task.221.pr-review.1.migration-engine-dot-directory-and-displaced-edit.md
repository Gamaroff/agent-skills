# PR Review Report: PR #714 — fix(task.221): migration engine dot-directory references and displaced-block edits

**Reviewed:** 2026-10-21
**PR:** [#714](https://github.com/Gamaroff/agent-skills/pull/714) — `feature/task.221.migration-engine-dot-directory-and-displaced-edit` → `develop` (OPEN)
**Work item:** [`task.221.migration-engine-dot-directory-and-displaced-edit.md`](./task.221.migration-engine-dot-directory-and-displaced-edit.md) — resolved via `branch stem`
**Tracker:** [#713](https://github.com/Gamaroff/agent-skills/issues/713) — OPEN
**Verdict:** ✅ APPROVE

---

Scope: the whole `origin/develop...origin/feature/task.221.*` diff. The bundled copy
`skills/review-prd/references/migrate-doc-numbering.mjs` was **kept in scope**, against the default
`references/` exclusion, because the task's Files Summary names it. Effort: medium. Code lens skipped
(`--no-code`): `/qa-task` ran it in cycle 1.

## Artifact Trail

| Artifact | Status | Detail |
| --- | --- | --- |
| Implementation report | ✅ | `task.221.implementation.1.migration-engine-dot-directory-and-displaced-edit-initial-run.md` |
| Review report | ✅ | `task.221.review.1.migration-engine-dot-directory-and-displaced-edit.md` |
| QA reports | 1 | `task.221.qa.1.migration-engine-dot-directory-and-displaced-edit.md` |
| Gate | PASS | `task.221.gate.1.migration-engine-dot-directory-and-displaced-edit.yml` (100) |
| DoD | ❌ (expected) | status is `ready-for-review`; `/finalise` not yet run |
| Sprint review | ❌ (expected) | same reason |
| Open bugs | 0 | none |
| Handover | ✅ | none present |

Checks the caller re-ran: Change Log append-only against the merge base → `ok`. Gate head
`18e1b36b` resolves and is an ancestor of the PR head. Gate `updated:` (04:39:16Z) is later than the
head's author time (04:35:17Z). `pr_number:` is absent from the frontmatter, which is expected:
`/finalise` writes it at acceptance.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
| --- | --- | --- |
| `cat .docs/prd.md` gives one hit | `shared/resources/migrate-doc-numbering.mjs:1145`; test `task.221 CR-1` | ✅ met |
| `cat ${ROOT}/.docs/prd.md` gives one hit | same line; test `task.221 CR-1` | ✅ met |
| `cat docs/prd.md` gives `[]` | test `task.221 CR-1` (must-not row) | ✅ met |
| `editFrontmatter` leaves displaced/unclosed input unchanged | `shared/resources/migrate-doc-numbering.mjs:902`; test `task.221 CR-2` | ✅ met |
| Existing rows pass | suite 70/70 | ✅ met |
| Linearity row unchanged; no new pass | no change to the linearity row | ✅ met |
| Each fix mutation-proven | implementation report and QA report 1 | ✅ met |
| `bundle:check` 0 problems; `npm run ci` passes | implementation report (local run) | ✅ met |
| CHANGELOG `Fixed` entry | `CHANGELOG.md` | ✅ met |

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 0 checked against `4c8cd808113e3def784f6226d1e2a251894884b4` (via `head-branch`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.221.gate.1.migration-engine-dot-directory-and-displaced-edit.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`.
