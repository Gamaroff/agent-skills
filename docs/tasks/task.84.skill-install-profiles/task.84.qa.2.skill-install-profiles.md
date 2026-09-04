# QA Report: Task 84 — Skill install profiles (cycle 2, refute pass)

**Task**: [task.84.skill-install-profiles.md](./task.84.skill-install-profiles.md)
**Gate File**: [task.84.gate.2.skill-install-profiles.yml](./task.84.gate.2.skill-install-profiles.yml)
**Previous cycle**: [task.84.qa.1.skill-install-profiles.md](./task.84.qa.1.skill-install-profiles.md) — CONCERNS, 11 findings, all closed
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 ran as a **full refute pass over the whole branch diff**, not a narrowed re-read of cycle 1's repairs. That choice is what produced the result: **five further defects, two of them HIGH, and both HIGH ones were introduced by cycle 1's own fixes.** Four of cycle 1's tests were also found vacuous, including one that passed for precisely the input its own comment claimed it guarded against.

All five are fixed with behavioural regression tests, and the vacuous drift guard is replaced with a mutation-proven one.

**Overall Assessment**: CONCERNS — the findings were HIGH at discovery, and I am not declaring PASS on my own repairs. A cycle-3 confirmation pass should close it.
**Deployment Recommendation**: staging APPROVED, production CONDITIONAL

---

## Re-Review Scope

```
Re-review scope: unscoped — cycle 2 is always a full refute pass (whole origin/develop...HEAD diff)
```

The narrowing rule would have scoped this to files changed since gate 1 — which is exactly cycle 1's own fixes. That reads only the repairs and never re-reads the original change with what cycle 1 learned. Both HIGH findings below sit *in* those repairs, so a narrowed pass would still have found them; but C2-003 (the inverted invariant) is a statement in a **comment block the fix did not touch**, and only an unscoped read surfaces that.

---

## Re-Review Context — cycle 1's eleven findings

| ID | Status | Verification |
| --- | --- | --- |
| 001 unvalidated include | **FIXED** | CLI exits 2 naming the entry; stdout stays empty |
| 002 empty-set/failure conflation | **FIXED, then found to have a side effect** | See C2-003 |
| 003 `skills:` header comment | **FIXED** | 12 adversarial YAML shapes pass |
| 004 parseInvokes comment | **FIXED, but incompletely** | `\s+#` missed `[a]# note`; now `\s*#` |
| 005 branch ordering | **FIXED** | All 8 loop cases walked; behavioural precondition test added |
| 006 counter mislabel | **FIXED** | `_not_in_profile` separate from `_skipped` |
| 007 plan divergence | **FIXED** (plan corrected) | Counts are not implementable at prompt time |
| 008 prototype lookup | **FIXED** | `Object.hasOwn` + `Array.isArray` |
| 009 `$`-profile accepted | **FIXED** | Throws `Unknown profile` |
| 010 dry-run include/exclude | **FIXED, but incompletely** | Missed `--all-skills`; see C2-004 |
| 011 `process.exit()` | **FIXED** | `process.exitCode` + return; repo guard green |

Two of the eleven were fixed *incompletely* (004, 010) and one had an unstated side effect (002). That is the case for a refute pass in three lines.

---

## New Findings This Cycle

- **[HIGH]** `scripts/generate-skill-dependencies.mjs` — block-form `invokes:` returned `[]` silently; the header claimed it was "rejected loudly". Cycle 1's fix rewrote that line and left the false claim → now throws.
- **[HIGH]** `scripts/setup-consumer.sh` — `_resolve_skill_set` collapsed exit 2 into `return 1`, so a config typo was reported as a node/PATH problem. The fix that added exit 2 existed to stop exactly that → rc now propagates, install_skills branches on 2.
- **[MEDIUM]** `scripts/setup-consumer.sh` — cycle 1's fix #2 made an empty install reachable while the surrounding comments still said it could not happen → honoured but warned, contract corrected.
- **[MEDIUM]** `scripts/setup-consumer.sh` — dry-run omitted `--all-skills`, previewing 35 where the real run installs 41 → forwarded.
- **[LOW]** `shared/resources/resolve-skill-set-cli.mjs` — an explicitly-included, tracker-excluded skill was dropped as if it were a closure by-product → distinct warning naming `--all-skills`.

Plus three cleanups: the doubly-parsed exclude list hoisted; the `\s+#`→`\s*#` comment fix; a call-contract note recording that `_resolve_skill_set` must be called from a condition (verified: a bare call under `set -e` aborts the wizard).

---

## Vacuous Tests Found and Addressed

The most important finding of this cycle is not a defect in the product.

| Test | Why it proved nothing | Now |
| --- | --- | --- |
| `invokes:` inline-form guard | Asserted `doesNotThrow`; the block form returned `[]` **without** throwing, so it passed for exactly the input it named. Would also have passed with cycle 1's comment fix reverted — no SKILL.md carries a trailing comment | Replaced with a throw assertion + value assertions per form. **Mutation-proven** |
| 005 branch ordering | Source-text match; blind to all 8 loop combinations, and would pass with the `continue` deleted | Kept structurally, **plus** a behavioural test of the precondition it depends on. Mutation-proven |
| grandfather branch | `keepIdx < rmIdx` on raw text — proves string order, not that a skill survives | **Accepted limitation**, documented, follow-up filed. See below |
| 010 dry-run flags | Greps the very lines the `--all-skills` bug was on | Kept, **plus** a behavioural assertion that the flag widens the set |

### On the grandfather test — a deliberate non-fix

Testing it behaviourally means running `install_skills`, which downloads a tarball; the alternative is extracting the per-skill decision into a helper. That means restructuring **the only code in this task that can delete a user's skills**, late in a QA loop, on code already verified across all eight cases and by a real `--update` that pruned nothing.

That trade is bad. The risk of the refactor exceeds the value of the elegance. Filed as follow-up, to be done as its own change where it can be reviewed on its own merits.

---

## NFR Assessment

**Security — PASS.** Unchanged: no credentials, no injection surface, arguments passed as a bash array.

**Performance — PASS.** Unchanged: ~115ms per resolution.

**Reliability — CONCERNS.** Materially better than cycle 1 — the four silent-full-install paths are closed and exit codes now carry meaning. But this cycle established that fixes are the least-reviewed code in a change set: two of cycle 1's eleven repairs introduced HIGH defects, and two more were incomplete. That is a pattern worth a confirmation pass, not a coincidence.

**Maintainability — CONCERNS.** Four vacuous tests in one cycle is the signal. Three are now behavioural or mutation-proven; the fourth is a documented, argued limitation rather than an oversight.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Rationale**: Five defects found, two HIGH, all fixed with behavioural tests; four vacuous tests found, three replaced. CONCERNS rather than PASS because I am not the right party to declare my own repairs clean — the whole lesson of these two cycles is that self-review converges on confirmation.

**Deployment Recommendation**: staging APPROVED, production CONDITIONAL on a cycle-3 confirmation pass with no new HIGH findings.
