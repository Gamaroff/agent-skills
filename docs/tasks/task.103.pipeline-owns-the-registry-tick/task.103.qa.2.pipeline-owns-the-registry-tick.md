# QA Report: Task 103 - Give the registry tick an owner (cycle 2)

**Task**: [task.103.pipeline-owns-the-registry-tick.md](./task.103.pipeline-owns-the-registry-tick.md)
**Gate File**: [task.103.gate.2.pipeline-owns-the-registry-tick.yml](./task.103.gate.2.pipeline-owns-the-registry-tick.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Gate Status**: PASS

---

## Executive Summary

All four cycle-1 findings are closed and verified. The cycle-2 **refute pass** — a full re-read of the branch diff aimed at falsifying the fixes rather than confirming them — found three further issues, every one of them *inside cycle 1's own fixes*. All three were resolved in-cycle. No open findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Re-review scope: unscoped** — the whole `origin/develop...HEAD` diff, per the cycle-2 rule. Narrowing to "files changed since the last gate" would have read only the repairs, and all three of this cycle's findings are in exactly those repairs.

> Same deviation as cycle 1, recorded again rather than assumed carried: Step 3b's Explore subagent was not dispatched (session constraint); the pass was performed inline. Mitigation is unchanged — every finding below was established by **running a probe**, not by reading — and it remains a real reduction in independence. Step 5c (`/review-pr`) is still to come as a separate lens.

---

## Re-Review Context

| Cycle-1 finding | Status | Verification |
| :--- | :--- | :--- |
| **TASK-103-001** (high) — check row-driven, blind to absence | **FIXED** | Fourth test walks `docs/tasks/task.{N}.*/` with its own `MIN_DOCS` floor. Mutation: removing row 97 reds it; gutting the walk reds the floor with the message "examined only 0 task directories" — the correct assertion, not the neighbouring one. It found task 97 (accepted, PR #350, never in the registry) on its first run; row added. |
| **TASK-103-002** (medium) — alignment claimed, padding checked | **FIXED** | Width now preserved exactly; test compares cell and row lengths. Both boundaries asserted. Mutation: reverting preservation reds the width test. |
| **TASK-103-003** (low) — no-op `replace` | **FIXED** | Removed; `split("|")` verified equivalent by execution before removal. |
| **TASK-103-004** (low) — guard comment stricter than code | **FIXED** | Comment rewritten to state the real asymmetry. Initially **not** mutation-proven — see New Findings. |

---

## New Findings This Cycle

Three, all inside cycle 1's fixes, all closed in-cycle. This is the expected result of a refute pass, not a surprising one: **a fix is the least-reviewed code in a change set**, and cycle 1 produced four of them.

### TASK-103-005 — `/develop-batch`'s write-disjointness no longer holds for task batches → **documented**

- **Severity**: low (documentation)
- **Probe**: `grep -c 'task-registry' skills/develop-batch/SKILL.md` → 0.
- **Finding**: `develop-batch` selects a **write-disjoint** frontier from `touches:` annotations on the *items*. It cannot see the *pipeline's* writes, and after this change every task in a batch writes `docs/tasks/task-registry.md` at Step 7. The disjointness guarantee is therefore false for any multi-task batch, silently.
- **Correction to my own first reading**: I initially rated this medium on the assumption every batch would conflict. It will not — each task edits its own row, and git merges edits to distant lines without help. The case that genuinely conflicts is **adjacent row numbers in one batch**, which a frontier of consecutive tasks makes likely. Downgraded on that basis.
- **Resolution**: documented in `docs/standards/task-registry.md`, naming the exact case and the resolution ("keep both rows"). Not fixed in code: fixing it would mean reversing the § 3 ownership decision, and the cost is a one-line table conflict.

### TASK-103-006 — the new document walk had its own silent skip → **fixed**

- **Severity**: medium
- **Probe**: created `docs/tasks/task-oddname-no-number/` holding an `accepted` task document. Suite stayed **4 pass / 0 fail**.
- **Finding**: `if (!m) continue;` dropped any directory not matching `^task\.(\d+)\.`. A mis-named directory holding an accepted task was invisible — **the same single-sided blindness as TASK-103-001, one level down, introduced by the fix for it.**
- **Resolution**: unparseable directories are now collected and asserted empty, with a message naming the naming standard. Mutation: re-creating the directory reds the test.

### TASK-103-007 — the EOL heuristic got mixed-ending files backwards → **fixed by removing the heuristic**

- **Severity**: low
- **Probe**: `"a\nb\r\nc\n".includes("\r\n")` → true, so a file with one CRLF among LF lines would be rewritten entirely as CRLF.
- **Finding**: cycle 1 fixed CRLF→LF normalisation by *guessing* the file's ending. That is right for a uniform file and wrong for a mixed one — it makes an already-inconsistent file more inconsistent while claiming to preserve endings.
- **Resolution**: the split now **keeps its separators** (`split(/(\r?\n)/)`), so only the target line is ever rewritten and every other byte survives untouched. The question is removed rather than answered. Two tests: the CRLF case, and a mixed-ending case asserting byte-for-byte preservation outside the ticked row.

---

## Step 3c: Mutation-Proof Spot Check

Every test guarding a fix made in this loop was mutation-proven. Two mutants **survived** and were closed rather than explained away — both recorded here because a surviving mutant is a finding, not a footnote.

| Mutation | Expected red | Result |
| :--- | :--- | :--- |
| Remove row 97 | document-driven test | ✅ |
| Gut the directory walk | `MIN_DOCS` floor | ✅ correct assertion verified by message |
| Revert width preservation | width test | ✅ |
| Revert EOL preservation | line-endings test | ✅ |
| Re-create the mis-named directory | unparseable assertion | ✅ |
| Tighten guard to reject absent `type` | *(nothing)* | ❌ **survived** → test added, now reds |
| — the same, re-run after the fix | absent-`type` test | ✅ |

**The first survivor is the interesting one.** TASK-103-004's fix was to make a comment describe the code. The comment then asserted a rule that nothing checked — which is the *same* overstatement class TASK-103-002 and -004 were both about, reintroduced by their own repair. Only the mutation caught it.

---

## Step 4b: Documented-Command Execution

Unchanged from cycle 1 and re-verified: `skills/finalise/SKILL.md`, bound run executes 1 block cleanly under bash and zsh, 0 findings. The `zero-blocks-executed` condition on an unbound run is pre-existing on `develop` (19 blocks, 0 runnable there too) and is not introduced here.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| Full suite (`npm run ci:fast`) | PASS |
| New suites | 19 pass, 0 fail (was 14 at gate 1, 18 mid-cycle) |
| Negative controls (cancelled, in-flight, boundary) | Unchanged and green |
| `npm run bundle` | `skills/finalise/references/registry-tick.js` regenerates in sync |
| Byte-preservation of the registry outside the ticked row | Asserted directly (mixed-ending test) |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All cycle-1 findings closed and verified by mutation. The refute pass found three issues in the fixes themselves and all three are resolved; the two that mattered (a reintroduced silent skip, and an unchecked documented rule) were each caught by a deliberate attempt to falsify rather than by re-reading. No open findings.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c (`/review-pr`) — the loop's exit gate.
