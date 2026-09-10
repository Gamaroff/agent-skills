# QA Report: Task 104 — cycle 2 (refute pass)

**Task**: [task.104.tracker-comment-plain-language-lead.md](./task.104.tracker-comment-plain-language-lead.md)
**Gate File**: [task.104.gate.2.tracker-comment-plain-language-lead.yml](./task.104.gate.2.tracker-comment-plain-language-lead.yml)
**Previous cycle**: [task.104.qa.1.*.md](./task.104.qa.1.tracker-comment-plain-language-lead.md) — FAIL, 30/100
**Review Date**: 2026-09-10
**PR**: [#377](https://github.com/Gamaroff/agent-skills/pull/377)
**Gate Status**: PASS (92/100)

---

## Executive Summary

Cycle 1's seven findings are closed and mutation-proven. The cycle-2 refute pass then found **four more defects, every one of them inside cycle 1's own fixes** — which is precisely the case the refute rule exists for, and the reason cycle 2 re-reads the whole diff instead of only the repairs.

Three of those four were mine, made while fixing cycle 1. The most instructive is C2-003: **T104-004 was fixed on one arm only, and cycle 1's gate closed it anyway.** The Jira path kept the exact regression the finding described, with a `status: closed` sitting on top of it.

All thirteen findings across both cycles are now closed. Zero open issues, `ci:fast` 3123 pass / 0 fail, `eval:all` green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Re-review scope: unscoped — cycle 2 is always a full refute pass.** Whole `origin/develop...HEAD` diff, not the files changed since the last gate. The narrowing that applies from cycle 3 would have read only cycle 1's repairs, and every finding below is *in* those repairs, so narrowing would have found some of them — but it would have missed C2-003, which is a disagreement between a repair and code the repair never touched.

Two lenses: a read-only Explore subagent given an explicit refute directive (find the claim that is FALSE, start with the previous cycle's fixes, probe bulk-teardown / in-flight / error-path / reconnect, review the combination not each change alone), and direct probing by this reviewer.

**The subagent ran for 14 minutes and earned it.** It found C2-003 and C2-004 — both of which I had looked at and passed. I found C2-001 and C2-002. Neither lens subsumed the other.

---

## Re-Review Context — cycle 1's findings

| ID | Finding | Status | Verified how |
| :--- | :--- | :--- | :--- |
| T104-001 | Slot truthiness renders the opposite of intent | **FIXED** | `blocking=false/no/0/none/off` all render "Nothing is blocking"; `blocking=true` still renders the blocking sentence. Mutation-proven |
| T104-002 | Help text documents the rejected stage-less path | **FIXED** | `--help` now states the requirement; `--summary-file` help names the case |
| T104-003 | Empty `--summary-file` posts no lead, reports one | **FIXED** | exit 2, zero transport calls. Mutation-proven |
| T104-004 | `desired:` label reads the lead | **PARTIAL → now FIXED** | Fixed on GitHub only in cycle 1 — see **C2-003**. Both arms now correct |
| T104-005 | Prototype keys throw / return non-strings | **FIXED** | Seven prototype keys return `null` without throwing. Mutation-proven |
| T104-006 | Jira ADF test asserts on its own construction | **FIXED** | Now drives `cli.run` with a stubbed transport; mutation-proven against *two* mutations the old test passed under |
| T104-007 | 12 duplicate `--stage` argv pairs | **FIXED** | 0 remaining; suite green |

---

## New Findings This Cycle

Four defects and two cleanups. All closed within the cycle; all mutation-proven.

**C2-001 (MEDIUM) — the cycle-1 coercion fix swallowed legitimate values.** One falsey-string list applied to every slot, so a text slot valued `"No"`, `"None"` or `"0"` was silently dropped. This is the failure the fix's own commit message named and then shipped. Fixed by coercing per slot *type*.

**C2-002 (LOW) — the empty-lead check had a second door.** `.trim()` leaves U+200B/U+FEFF/U+2060, so a zero-width-only summary file posted an invisible lead. The identical hole was also open on `--body-file`.

**C2-003 (MEDIUM) — T104-004 was fixed on one arm, and the gate closed it anyway.** `desiredLine` is captured in `run()`, which feeds the *pre-gate* defer. The Jira arm's *in-flight* defer is built inside `jira.addComment` and still derived the label from the composed body. Executed side by side, the two arms disagreed: GitHub recorded `"QA Gate: FAIL — story 4.2 cache"`, Jira recorded the near-identical per-stage lead. Fixed by threading `desired` through `runJira` into `addComment`, defaulting to the old behaviour so no other caller changes.

**C2-004 (MEDIUM) — the C2-002 fix rewrote human text.** Stripping the zero-width set from the *content* rather than only for the emptiness test deleted U+200D — the joiner inside every ZWJ emoji sequence, and load-bearing for Indic and Arabic shaping. `"Shipped by 👩‍💻"` posted as `"Shipped by 👩💻"`. Fixed by testing emptiness against a stripped **copy** and posting the **original**, via one shared `isVisiblyNonEmpty()` now used by both file flags.

**C2-005 (LOW, cleanup)** — `typeof template !== "function"` was dead code reading as a guard. Deleted.

**C2-006 (LOW, cleanup)** — the slot-classification lists lived apart from the templates with nothing asserting they agree, so a new boolean slot would get text semantics silently and re-open the cycle-1 HIGH. A test now scans the template sources for `s.<name>` reads and fails on any unclassified name, with a non-vacuity floor.

---

## What this cycle says about the process

Three things are worth keeping, because none is about this task.

**A closed finding is not evidence the defect is gone.** T104-004 was verified by a test that exercised one of two arms. The gate recorded it closed. The regression survived underneath. What caught it was an agent asked to *refute*, not to confirm — and the difference is not diligence, it is the question being asked.

**A mutation proof needs its own check that the mutation applied.** One attempt here used a regex with a silent fallback, never applied, and left the suite green. Recording "no test caught this" would have been a false negative *in the mechanism that exists to prevent false confidence*. Every mutation in this cycle now asserts it applied before the suite runs.

**A test that passes for the wrong reason is worse than a missing one.** The first Jira `desired` test passed with the fix reverted, because `ACCESS_TRACKER=manual` reaches the pre-gate defer and never `addComment`. It was renamed to say what it actually covers, and the contract given a unit test that injects `http` and asserts on the descriptor. The mutation proof is the only reason this was noticed.

---

## NFR Assessment

| Axis | Status | Note |
| :--- | :--- | :--- |
| Security | PASS (`measured`, 16 probes) | Cycle-1 probes stand; the finding they produced is closed with a seven-key regression test. Cycle 2 narrows input handling rather than widening it |
| Performance | PASS | Still pure string work; per-type coercion adds two array membership tests per slot |
| Reliability | PASS | Both empty-lead doors closed; the two file flags agree via one shared predicate; the emptiness test no longer mutates content |
| Maintainability | PASS | Cycle-1 CONCERNS resolved; C2-006 adds a structural guard against the drift that would have re-opened the HIGH |

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| `ci:fast` | PASS — 3123 pass / 0 fail (from 3106 at cycle 1; 17 new tests) |
| `eval:all` | PASS — exit 0 |
| 13 × 4 bundled `references/` copies | PASS — byte-identical to sources |
| `bundle:check` | PASS — 126 skills, 0 problems |
| Call sites | PASS — 0 changed; independently, **all 63** shell invocations of `tracker-comment.js` pass `--stage`, so the mandatory lead breaks none |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 92/100 — deducted for the residual LOW advisories deferred to `future`, not for the closed findings.
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c `/review-pr` is the loop's exit gate.
