# PR Review Report: PR #513 — fix(task.154): bundler and snippet-test hygiene — attributed warning, symlink-free test run

**Reviewed:** 2026-09-29
**PR:** [#513](https://github.com/Gamaroff/agent-skills/pull/513) — `feature/task.154.bundler-and-snippet-test-hygiene` → `develop` (OPEN)
**Work item:** [`task.154.bundler-and-snippet-test-hygiene.md`](./task.154.bundler-and-snippet-test-hygiene.md) — resolved via `branch-stem`
**Tracker:** [#484](https://github.com/Gamaroff/agent-skills/issues/484) — OPEN
**Verdict:** ✅ APPROVE

---

Review scope: the whole PR diff `origin/develop...origin/feature/task.154.bundler-and-snippet-test-hygiene`, 40 files and 3870 lines. The one bundled `references/` copy was **not** excluded. It is `skills/observe-work/references/observation-log-contract.md`, and it is named in the task's Files Summary as a deliberate regeneration. Effort: medium. Invoked by `/develop-task` Step 5c after QA cycle 5 (gate PASS).

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.154.implementation.1.bundler-and-snippet-test-hygiene-initial-run.md` |
| Review report | ✅ | `task.154.review.1.bundler-and-snippet-test-hygiene.md` |
| QA reports | 5 | `task.154.qa.{1..5}.bundler-and-snippet-test-hygiene.md` |
| Gate | PASS | `task.154.gate.5.bundler-and-snippet-test-hygiene.yml` (100) |
| DoD | ❌ (expected) | Step 7 (`/finalise`) has not run yet |
| Sprint review | ❌ (expected) | Written by Step 7 |
| Open bugs | 0 | bugs 1–8 all Closed |
| Handover | ❌ | none; `access.tracker` is not restricted |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `npm run -s bundle` prints 0 `not found` lines | `tests/bundle-missing-source.test.js` §2 | ✅ met |
| An unresolvable citation produces exactly one attributed line | §1a, §1b | ✅ met |
| `consumer-root.mjs` is the only consumer-root builder | `evals/shared/tests/consumer-root.test.mjs`; the migrated files no longer contain `symlinkSync` | ✅ met |
| The runner fails a fixture that passes only through a gitignored symlink | `tests/test-clean-checkout.test.js` "through the runner, the same check fails" | ✅ met |
| `release.sh` gates on `test:clean-checkout` | `scripts/release.sh` pre-release step | ✅ met |

## Conformance Findings

None.

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — scripts/test-clean-checkout.sh:111
  `git clone --local` points the clone's origin/* at the source's LOCAL branches, not its
  remote-tracking ones, so a test that reads origin/develop compares against a possibly stale local
  develop (CI uses the real remote branch).
  → Repoint the clone's refs/remotes/origin/* at the source's, or document the gap in the header.

[CR-2] bug · low · confidence: low — scripts/release.sh:192
  A CLEAN_CHECKOUT_CMD left in the environment would make the release gate run something other than
  the suite and still report "Tests passed".
  → Invoke the runner with CLEAN_CHECKOUT_CMD unset from release.sh.

[CR-3] cleanup · low · confidence: medium — skills/create-skill/scripts/bundle_skill.py:149
  shared_refs_with_lines re-declares the collector regex; only test §1d guards against drift.
  → One compiled pattern in quick_validate.py, used by both.
```

## Machine-Readable Findings

```yaml
findings:
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "scripts/test-clean-checkout.sh:111"
    finding: "git clone --local points the clone's origin/* at the source's local branches, not its remote-tracking branches, so origin/develop in the clone can differ from CI's."
    suggested_action: "Repoint the clone's refs/remotes/origin/* at the source's, or document the gap in the script header."
  - id: CR-2
    category: bug
    severity: low
    confidence: low
    ref: "scripts/release.sh:192"
    finding: "An inherited CLEAN_CHECKOUT_CMD would make the release gate run something other than npm test and still report success."
    suggested_action: "Invoke the runner from release.sh with CLEAN_CHECKOUT_CMD unset."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/create-skill/scripts/bundle_skill.py:149"
    finding: "shared_refs_with_lines re-declares the collect_shared_refs regex and punctuation strip."
    suggested_action: "Define the pattern once in quick_validate.py and use it in both functions."
truncated_count: 0
```

## Recommended Actions

1. Optional, before merge: close CR-2 with a one-line `env -u CLEAN_CHECKOUT_CMD` in `release.sh`. It is the only finding that touches the release gate itself.
2. Follow-ups: CR-1 (origin refs in the clone), CR-3 (single regex), and gate 5's four advisory cleanups.
