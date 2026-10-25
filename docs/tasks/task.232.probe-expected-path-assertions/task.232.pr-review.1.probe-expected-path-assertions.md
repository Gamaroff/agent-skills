# PR Review Report: PR #748 — feat(security-probe): expected.absent takes nested paths; expected.removed asserts a cleanup

**Reviewed:** 2026-10-25
**PR:** [#748](https://github.com/Gamaroff/agent-skills/pull/748) — `feature/task.232.probe-expected-path-assertions` → `develop` (OPEN)
**Work item:** [`task.232.probe-expected-path-assertions.md`](./task.232.probe-expected-path-assertions.md) — resolved via `branch stem`
**Tracker:** [#747](https://github.com/Gamaroff/agent-skills/issues/747) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.232.implementation.1.probe-expected-path-assertions-initial-run.md |
| Review report | ✅ | task.232.review.1.probe-expected-path-assertions.md |
| QA reports | 3 | task.232.qa.1/2/3.probe-expected-path-assertions.md |
| Gate | PASS | task.232.gate.3.probe-expected-path-assertions.yml (100) |
| DoD | ❌ | not yet — written by `/finalise` (Step 7) |
| Sprint review | ❌ | not yet — written by `/finalise` (Step 7) |
| Open bugs | 0 | bugs 1–7 closed |
| Handover | ❌ | none (not required) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `expectedProblem` accepts in-directory relative paths for `absent`/`removed` and refuses `..`, absolute, `.`, empty, NUL | `isCasePath` / `caseKey` in `shared/resources/security-probe.mjs`; the grammar and base-differential tests | ✅ met |
| A nested `absent` side effect is caught on all five forms | per-form "a nested absent side effect is caught" tests | ✅ met |
| An `absent` path the fixture creates, or an ancestor, is declined on all five forms | `pathAssertionProblem`; per-form decline tests, including the trailing-slash spelling | ✅ met |
| `removed`: delete passes, left is a mismatch, not-created is declined (case variant too) | `compareExpected` `removed` arm; per-form `removed` tests | ✅ met |
| An ancestor resolving outside is a mismatch, never read through | `casePathState`; per-form containment tests | ✅ met |
| task.227's two cleanup cases are executed and accepted under every shell | the "task.227 regression" test | ✅ met |
| Every runner routes through `pathAssertionProblem` (mutation-proved) | implementation report M1 | ✅ met |
| `npm run ci` with `.agents/skills` aside; `bundle:check` clean | implementation report; QA cycles 1–3 | ✅ met |
| The four docs and CHANGELOG state the grammar and `removed` | `probe-boundary-rule.md` §5, `security-input-corpus.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, `CHANGELOG.md` | ✅ met |

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`). The code lens ran in each of the three QA cycles (5a).

**Anchors:** 0 checked (no findings).

## Machine-Readable Findings

```yaml
reviewed_gate: task.232.gate.3.probe-expected-path-assertions.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`.
2. Follow-ups, non-blocking and recorded in gate 3's `recommendations.future`:
   - reap each case's process group before the path assertions are read (pre-existing);
   - make the permission walk best-effort;
   - harden the QA2-1 test (assert no sandbox remains, and `t.skip` it under root).
