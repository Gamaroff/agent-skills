# QA Report: Task 69 — Give `/qa-story` and `/qa-task` a Bitbucket PR-comment path (Cycle 2)

**Task**: [Link to task document](./task.69.qa-bitbucket-pr-comment.md)
**Gate File**: [task.69.gate.2.qa-bitbucket-pr-comment.yml](./task.69.gate.2.qa-bitbucket-pr-comment.yml)
**Previous Cycle**: [task.69.qa.1.qa-bitbucket-pr-comment.md](./task.69.qa.1.qa-bitbucket-pr-comment.md) (FAIL, 60/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**Gate Status**: PASS

---

## Executive Summary

Both cycle-1 findings are fixed, and both were verified by re-mutating the code rather than by reading the fix. The `qa-story` body no longer contains a shell variable, and the new guard that would have caught it exists in **both** suites and demonstrably fails when the defect is injected into either.

Two residuals stand. Both are recorded as accepted rather than quietly dropped.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Issue | Severity | Cycle 1 | Cycle 2 |
|---|---|---|---|
| **TASK69-001** — `qa-story` body emits literal `$PR_NUMBER` / `$PR_TITLE` / `$PR_STATE` | HIGH | Open | **FIXED** |
| **TASK69-002** — no test can see the body's expansion semantics | MEDIUM | Open | **FIXED** |
| **TASK69-003** — `COMMENT_RC` unset on the unreachable third `$VCS` branch | LOW | Open | **Open — accepted** |

Scope: this is cycle 2, so per the skill's own rule the code review was a **full refute pass over the whole branch diff**, not a narrowed pass over the files changed since gate 1. The narrowed form would have read only cycle 1's own fixes and never re-read the original change with what cycle 1 taught.

---

## Verification of Fixes

### TASK69-001 — FIXED

Verified directly, not from the fix description:

```
awk '/^cat > "$BODY_FILE" <</,/^EOF$/' skills/qa-story/SKILL.md | grep -E '\$[A-Za-z_]'
  → no matches (excluding the cat line itself)
same for skills/qa-task/SKILL.md
  → no matches
```

Both bodies now use `{PR_NUMBER}` / `{PR_TITLE}` / `{PR_STATE}`.

**The chosen fix is the right one.** Converting the body rather than unquoting the heredoc preserves the security property the change gained in the first place: the body carries a backtick pair on the Code Review Findings line, and an unquoted heredoc would have turned it into command substitution. The fix was explicitly reasoned this way rather than arrived at by accident.

### TASK69-002 — FIXED

The guard exists once in each suite. QA ran **an independent mutation the developer did not run** — the developer proved `$PR_NUMBER` / `$PR_TITLE`; QA injected `$PR_STATE` specifically:

| Mutation (QA's own) | Result |
|---|---|
| `**PR State**: {PR_STATE}` → `$PR_STATE` in `qa-story` | 12 pass, **1 fail** ✅ red |

### Vacuity probe on the new guard

The relevant failure mode in this repo is not "the test is absent" but "the test survives and stops asserting" — the shape found in task 68. So the guard was probed for it:

| Probe | Result |
|---|---|
| Rename the heredoc opener (`$BODY_FILE` → `$COMMENT_FILE`) so `bodyHeredoc`'s anchor vanishes | **2 tests fail loudly** — the helper's `assert.notEqual(start, -1)` fires rather than returning an empty body |

The guard cannot pass on nothing. Both its anchors are asserted before the body is sliced.

---

## Refute Pass (Step 3b, cycle 2 — full branch diff)

Reviewed to find a false claim rather than to confirm the change. Probed the four transitions the skill names, and the **combination** of the two fixes rather than each alone.

- **Bulk teardown / in-flight / error path / reconnect** — not applicable in the usual sense: the change set is documentation prose and prose-reading tests, with no emission, subscription, caching or lifecycle. Recorded as considered, not as passed by default.
- **Combination of the two fixes** — fix 1 changed the body; fix 2 added a helper that *reads* the body. These interact, and were re-read as one change: the helper still bounds correctly after the body edit (25/25), and neither fix weakened the other.
- **False-positive surface of the new assertion** — it would fire on a body that legitimately wanted to *document* a `$VAR` in prose. No such content exists in either body today, and the failure message names the remedy (`use a {SLOT} placeholder`). Acceptable; noted, not a finding.
- **`bodyHeredoc` boundary** — terminates on `\nEOF\n`. Neither body contains a bare `EOF` line, so the slice cannot end early. Confirmed by the mutations landing on the right test.

**New findings this cycle: none.**

---

## Step 4b — Documented-command execution

`skills/qa-story/SKILL.md` changed since gate 1; re-run against it.

| File | Blocks | runnable | placeholder | mutating | Result |
|---|---|---|---|---|---|
| `skills/qa-story/SKILL.md` | 14 | 0 | 5 | 9 | `zero-blocks-executed` |

Unchanged from cycle 1 and, as established there, **pre-existing on `origin/develop`** (13 blocks, same result). Not caused by this change and not fixable within it: the blocks post PR comments, which the safety boundary deny-lists by design.

Carried into the gate's `future` recommendations so it stops being rediscovered: **Step 4b can never provide execution coverage for these two steps.** That is a correct safety decision, and it is precisely why TASK69-002 mattered — contract tests are the only guard these steps have.

---

## Regression Testing

| Area | Result |
|---|---|
| Both suites | PASS — 25/25 (was 23; +2 from the new guard) |
| Full `npm run ci:fast` | PASS — **2141 tests, 0 failures**, prettier clean, exit 0 |
| `shared/resources/tracker-access.test.sh` | PASS — 401/401 |
| `qa-task` body (not the file that failed) | Unchanged and still clean — verified, not assumed |

No regressions.

---

## NFR Assessment

### Performance — PASS
Prose-and-tests change. Suites grew by 2 tests / ~5 ms.

### Reliability — PASS
Was CONCERNS in cycle 1 **solely** because of TASK69-001. That defect is verified gone, and injecting it into either skill now turns the suite red — so the fault has a guard, not just a fix.

### Security — PASS
The cycle-1 fix deliberately preserved the quoted heredoc rather than unquoting it, keeping the reduced injection surface the original change gained. Choosing the safer of two working fixes, and recording why, is the right call.

### Maintainability — PASS
Was CONCERNS in cycle 1 because the two bodies still diverged in placeholder style — the divergence that caused TASK69-001. Both now use `{SLOT}` throughout, so Phase 2's identical-wording goal is met in the sense that mattered. Both guards in this change set — the cross-file drift guard and the new body guard — fail loudly when their anchors move rather than skipping.

---

## Accepted Residuals

Recorded explicitly so they are decisions, not oversights:

1. **TASK69-003 (LOW, open)** — `COMMENT_RC` unset on a third `$VCS` branch. `resolve-platform.sh` admits only `github` or `bitbucket` and is sourced guarded, so the branch is unreachable; the quoted test form degrades to a shell diagnostic rather than a false success. Not worth the diff.
2. **The Bitbucket arm ships unexecuted.** This repo is GitHub-hosted and Step 4b cannot run the blocks either, so the Bitbucket path is verified by inspection against two already-shipped call sites (`qa-fix`, `finalise`) only. The task states this itself; it is the reason the GitHub-side regression was weighted as heavily as it was.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both cycle-1 findings fixed and independently mutation-proved; no new findings in a full refute pass; all four NFRs PASS; full gate green on the current head. The two residuals are accepted with stated reasons.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**Next Steps**: `/finalise` — verify Definition of Done and accept.
