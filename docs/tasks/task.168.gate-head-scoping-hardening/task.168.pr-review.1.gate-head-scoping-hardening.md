# PR Review Report: PR #562 — fix(qa): harden task.135's gate-head scoping (task.168)

**Reviewed:** 2026-10-03
**PR:** [#562](https://github.com/Gamaroff/agent-skills/pull/562) — `feature/task.168.gate-head-scoping-hardening` → `develop` (OPEN)
**Work item:** [`task.168.gate-head-scoping-hardening.md`](./task.168.gate-head-scoping-hardening.md) — resolved via `branch stem`
**Tracker:** [#533](https://github.com/Gamaroff/agent-skills/issues/533) — OPEN
**Verdict:** ✅ APPROVE

Effort: medium. Scope: `origin/develop...origin/feature/task.168.gate-head-scoping-hardening`, 22 files and 2,924 diff lines. The 12 generated `skills/*/references/` copies are excluded. They are byte copies of the reviewed `shared/resources/` sources, which the Files Summary names only as regenerated. Lenses dispatched 2026-10-03T16:05:09Z. Conformance took 60 s (`duration_ms` 59589) and code took 187 s (`duration_ms` 187438).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.168.implementation.1.gate-head-scoping-hardening-initial-run.md` (mid-run; Step 8 finalises it) |
| Review report | ✅ | `task.168.review.1.gate-head-scoping-hardening.md` |
| QA reports | 3 | `task.168.qa.1…`, `qa.2…`, `qa.3…` |
| Gate | PASS | `task.168.gate.3.gate-head-scoping-hardening.yml` (100) |
| DoD | ❌ | not yet — `/finalise` (Step 7) runs after this review |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Invalid head → `CODE_MOVED=1` | `skills/qa-task/SKILL.md` Phase 0 step 3; tests L1, L2 | ✅ met |
| `:`-named file stays in the cycle-3+ patch | `--literal-pathspecs` in the shared block; L3 | ✅ met |
| Security FAIL + bound `false` → whole branch | Step 3b preambles call `qa-safety-clause1.sh`; L9 | ✅ met |
| Step 3b HALTs on an uncommitted change outside the work item | shared block `PRIOR_GATES >= 1` guard; L4, L11, L15 | ✅ met |
| `qa-cycle.sh` refusal → HALT naming the reason | Phase 0 steps 2 and 5 (both skills); L7, L8, L13 | ✅ met |
| `field()` and the shell sed agree | `gate-head-freshness.test.mjs` shipped-sed test | ✅ met |

## Conformance Findings

```
[PC-2] scope · low · confidence: medium — shared/resources/develop-pipeline-step-5-6-qa-loop.md
  The QA loop's red-fast-gate change is described in § 5 and the CHANGELOG but absent from § 4 In Scope and § 7 Files Summary.
  → List the file in § 4 and § 7, citing QA cycle 2 CR-1.

[PC-1] consistency · low · confidence: low — task frontmatter: no pr_number
  Only the implementation report links the document to PR #562.
  → Add pr_number: 562, or confirm /finalise adds it.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/develop-pipeline-step-5-6-qa-loop.md:1089
  The red-exit commit says nothing about a commit a pre-commit hook refuses, which would leave the attempt uncommitted and re-strand the next review.
  → Read the commit's exit status; name the hook-refusal path (--no-verify for this unpushed attempt, or HALT with the hook's output); pin it.

[CR-2] bug · low · confidence: medium — shared/resources/qa-re-review-scope.md:222
  DIRTY / UNTRACKED never check git's exit status, so a git failure (e.g. a WORK_ITEM_DIR in another checkout) reads as a clean tree.
  → HALT on a non-zero git status, and compare show-toplevel for WORK_ITEM_DIR; keep the three copies identical.

[CR-3] cleanup · low · confidence: high — shared/resources/qa-re-review-scope.md:114
  qa-gate-security-evidence.md still places the clause-1 probe in the shared rule.
  → Point it at qa-safety-clause1.sh; grep for other stale placements.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: scope
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-step-5-6-qa-loop.md"
    finding: "The QA loop's red-fast-gate change is described in § 5 and the CHANGELOG but absent from § 4 In Scope and § 7 Files Summary."
    suggested_action: "List the file in § 4 and § 7, citing QA cycle 2 CR-1."
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "task.168.gate-head-scoping-hardening.md frontmatter: pr_number"
    finding: "The task frontmatter has no pr_number, so only the implementation report links the document to PR #562."
    suggested_action: "Add pr_number: 562, or confirm /finalise adds it."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-step-5-6-qa-loop.md:1089"
    finding: "The red-exit commit does not say what happens when a pre-commit hook refuses it, which would leave the attempt uncommitted and strand the next review."
    suggested_action: "Read the commit's exit status and name the hook-refusal path, pinned by the bounded-retry paragraph test."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/qa-re-review-scope.md:222"
    finding: "DIRTY and UNTRACKED never check git's exit status, so a git failure reads as a clean tree."
    suggested_action: "HALT on a non-zero git status and compare show-toplevel for WORK_ITEM_DIR, in all three copies."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/qa-re-review-scope.md:114"
    finding: "qa-gate-security-evidence.md still places the clause-1 probe in the shared rule."
    suggested_action: "Point it at qa-safety-clause1.sh and grep for other stale placements."
truncated_count: 0
```

## Recommended Actions

1. CR-1 and CR-2 are the substantive LOW items (both about a guard that can still read a failure as clean). Address them in the follow-up that takes gate 3's carried items.
2. PC-1 is expected to be covered by `/finalise`, which writes `pr_number:`.
3. PC-2 and CR-3 are documentation tidy-ups.
