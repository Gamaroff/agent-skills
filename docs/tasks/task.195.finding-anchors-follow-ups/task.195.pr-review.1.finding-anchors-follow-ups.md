# PR Review Report: PR #695 — fix(task.195): finding-anchors follow-ups — unparseable, root-in-rev, --index, reason-deciding dispatchers

**Reviewed:** 2026-10-19
**PR:** [#695](https://github.com/Gamaroff/agent-skills/pull/695) — `feature/task.195.finding-anchors-follow-ups` → `develop` (OPEN)
**Work item:** [`task.195.finding-anchors-follow-ups.md`](./task.195.finding-anchors-follow-ups.md) — resolved via `branch-stem`
**Tracker:** [#597](https://github.com/Gamaroff/agent-skills/issues/597) — OPEN
**Verdict:** ✅ APPROVE

---

Scope: the full `origin/develop...origin/feature/task.195.finding-anchors-follow-ups` diff at `faec9ea4` (25 files). The four AUTO-GENERATED copies `skills/{qa-story,qa-task,review-code,review-pr}/references/finding-anchors.js` are excluded. They are byte copies of `shared/resources/finding-anchors.js`, which is reviewed. `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` is hand-authored and named in the task, so it was kept in scope. Run inside the develop-task pipeline at Step 5c, `--effort medium --no-code`.

## Artifact Trail

| Artifact              | Status   | Detail                                                                                |
| --------------------- | -------- | ------------------------------------------------------------------------------------- |
| Implementation report | ✅       | task.195.implementation.1.finding-anchors-follow-ups-initial-run.md                   |
| Review report         | ✅       | task.195.review.1.finding-anchors-follow-ups.md                                       |
| QA reports            | 2        | task.195.qa.1.finding-anchors-follow-ups.md, task.195.qa.2.finding-anchors-follow-ups.md |
| Gate                  | PASS     | task.195.gate.2.finding-anchors-follow-ups.yml (100)                                  |
| DoD                   | ❌       | not yet: the task is `ready-for-review`, and `/finalise` writes it                     |
| Sprint review         | ❌       | not yet, for the same reason                                                          |
| Open bugs             | 0        | none                                                                                  |
| Handover              | ✅       | none; 0 outstanding                                                                   |

## Acceptance Criteria Traceability

| Criterion                                                      | Evidence in diff                                                     | Status |
| -------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| SC-1 unparseable code anchor; conformance `ref` stays `no-line` | `shared/resources/finding-anchors.js` `anchorOf`/`lensesOf`; `finding-anchors.test.mjs` | ✅ met |
| SC-2 `--rev` with an absent `--root` exits `bad-root`          | `finding-anchors.js` `checkTree`; `finding-anchors.test.mjs`         | ✅ met |
| SC-3 `--index` reads the staged content                        | `finding-anchors.js` `makeReader`; `finding-anchors.test.mjs`        | ✅ met |
| SC-4 dispatchers HALT when the checker cannot load             | four SKILL.md checker blocks; `finding-anchors-blocks.test.mjs`      | ✅ met |
| SC-5 `--inline` refuses un-annotated input                     | review-code / review-pr guards; their guard tests                    | ✅ met |
| SC-6 review-pr Step 6 `--rev` is a local PR head               | existing `resolve-head-rev.sh` tests                                 | ✅ met |
| SC-7 develop-bug states the unverified-anchor rule             | `develop-bug-step-5-6-verify-loop.md`; `finding-anchors-callers.test.mjs` | ✅ met |
| SC-8 one read per distinct path                                | counting-`readFile` test                                             | ✅ met |
| SC-9 test / bundle:check / validate                            | fast gate 5961/0; validate rc 0 for five skills (QA 2)               | ✅ met |
| SC-10 mutation proofs                                          | implementation report; QA 1 and QA 2 `mutation-proven` lines         | ✅ met |
| SC-11 CHANGELOG entry                                          | `CHANGELOG.md` `[Unreleased]` › Fixed                                | ✅ met |

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`): the code lens ran in QA 5a. Cycle 2 was a full-branch refute pass and promoted no finding to the gate.

**Anchors:** 0 checked against `faec9ea45bf91575be6afd3aebf1321d999e4bd3` (via `head-branch`). All verified.

## Machine-Readable Findings

```yaml
reviewed_gate: task.195.gate.2.finding-anchors-follow-ups.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`.
2. Open a follow-up for gate 2's `recommendations.future`: CR-1 (the review-pr guard should require an array for every lens present), CR-2 (a null finding entry, pre-existing), and CR-3 (`--staged --fix` compares the index with the worktree).
