# Task Review Report: Task 217 - Finding-anchors advisory follow-ups

**Reviewed:** 2026-10-23
**reviewed_blob:** 7ca0b9a6b6981cc6e50707057a957e73fd4dfd97
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-10-23

---

## Executive Summary

The task is precise, its line anchors resolve on `develop` at `30ece59c`, and the one non-trivial invariant it rests on (the jq `capture` grammar equals the checker's `/^(\S+):(-?\d+)$/` on the trimmed value) holds when run. The review found one gap the plan did not search for: two test extractors locate the `--inline` guard by the exact clause Phase 2 replaces. Three smaller test-holding gaps were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — every question was resolvable from the code; assumptions recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` (via `/develop-next`, `--defaults`) in autonomous mode. No `AskUserQuestion` was issued. Each finding below had a single resolution supported by the code, so no decision was needed:

- **Assumption 1** — the re-keyed guard extractors use a literal the new guard keeps (`anchor_checked.by`); the exact key is the developer's choice.
- **Assumption 2** — the probe re-run writes a new `task.217` cases file rather than editing task.195's historical record.

Pre-pass: Agents B and C were **not dispatched**; both passes were performed inline by the reviewer (independence loss recorded). Architecture alignment: this is an internal Node/jq/shell change inside the existing engine and two skill blocks; no tech-stack axis changes.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References. `type: task`, `description`, `tags` present (OKF conformant).
- Tracker linkage: `github_issue: 698` exists, body link `[#698](…/issues/698)` matches.
- Card preflight: exit 0 — 3 card blocks resolve (Summary +4 more, Success Criteria +10 more, Breaking Changes +7 more).
- Relative links: `doc-links.js` — 3/3 resolve in the task, 1/1 in the plan.
- Change Log present and current; sign-off not enabled.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Line anchors checked by reading the lines (check 2):

| Claim | Found |
|---|---|
| `finding-anchors.js:145` `const id = f.id ?? null;` | ✅ |
| `:131` `/^(\S+):(-?\d+)$/` on trimmed value | ✅ (`:131`) |
| `:450` `if (f && typeof f === "object")` | ✅ |
| `:96` `MALFORMED`, `:172` `findingsOf`, `:395` `run`, `:477` export | ✅ |
| review-pr guard `:976`, selector `:986` | ✅ |
| review-code guard `:172`, selector `:178`, `staged) set -- --index` `:94`, Step 5 `:238` | ✅ |
| review-pr schema verdict list `:790` | ✅ |
| Dispatchers HALT on `usage` | ✅ review-code `:107`, review-pr `:623`, qa-task `:651`, qa-story `:1141` |
| Dispatcher population (4 files) | ✅ `grep -rln 'finding-anchors.js' skills/*/SKILL.md shared/resources/*.md` |

**Invariant run (check 11)** — the new selector grammar against the checker's:

```
jq capture("^\\s*(?<path>\\S+):(?<line>-?[0-9]+)\\s*$")?
  'src/a:b.js:3' → {"path":"src/a:b.js","line":"3"}
  '  a.js:1'     → {"path":"a.js","line":"1"}
  'a.js:1-4'     → no match (empty, no abort)
  'AC-3'         → no match
node: /^(\S+):(-?\d+)$/.exec(a.trim()) → ["src/a:b.js","3"], ["a.js","1"]
```

Parity holds, and `capture(...)?` yields empty inside `[ … ]` rather than aborting.

#### Optional
- `usage` helper is at `finding-anchors.js:379` (plan says `:378`). The identifier is paired with it, so it is still findable.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND → fixed

#### Important
1. **Removed-literal sweep missing (check 15).** Phase 2a replaces `select((.anchor_check | type) != "string")` with an `IN(...)` clause. `git grep -n 'anchor_check | type' -- '*.test.*'` finds two extractors that locate the guard by exactly that literal: `extractInlineGuard` in `skills/review-pr/tests/review-pr.test.js:2495` and the extractor in `skills/review-code/tests/review-code.test.js:379`. Both would fail with "could not find the --inline anchor_check guard", naming the literal rather than the change. Their annotated control fixtures also carry no stamp and would HALT under the new guard. **Fix applied:** Phase 2 lists both extractors and the control-fixture update.
2. **Probe cases pin the old HALT message.** `task.195.dod.2.security.cases.1.json` expects the current HALT `stdout` verbatim; Phase 2 extends that message. **Fix applied:** the re-run writes a new `task.217` cases file; task.195's record is not edited.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND → fixed

#### Important
3. **A behaviour fix in prose (check 4, obs #258).** Phase 3a's `--staged` skip lands in Step 5, which is prose today (`:234-245`); the plan offered "pin the rule's sentence" as a fallback. A pinned sentence leaves the test green with the fix reverted. **Fix applied:** the check lands as a fenced `bash` block the test extracts and runs against a temp repo.
4. **A non-functional criterion with no bound and no test (check 4, obs #206).** "No measurable change in run time" states no numeric bound and names no test (task.164's AC7 shape). **Fix applied:** restated as a per-PR-testable bound — a refused input makes zero calls to the injected `deps.exec` and writes no `--annotate` output.

Other checks: the population test addresses a shared key (check 13 — invocation regex plus a comment-only control); no new test files, so runner reach (check 18) is unchanged; the only new field (`anchor_checked`) is produced by the engine itself (check 21).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The guard change tightens a refuse-by-default boundary rather than widening it, so no differential oracle is required; the plan still re-runs the existing probe cases and adds stamp cases. Rollback (full and partial) is specified with triggers.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues (all applied)

1. List both guard extractors keyed on the replaced clause, and add the stamp to their control fixtures.
2. Write the probe re-run as a new task.217 cases file.
3. Land the `--staged` skip as an extractable fenced block.
4. Restate the performance criterion as a test-held bound.

### Consider (Optional) - 1 item

1. `usage` anchor `:378` → `:379`.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; every important finding had a single code-supported fix, now applied to the task document.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous pipeline run)
- **Review Date:** 2026-10-23
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.finding-anchors-advisory-follow-ups.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load)
