# Task Review Report: Task 281 - The observation log names what it cannot read

**Reviewed:** 2026-11-18
**reviewed_blob:** ff28035a00af49768fe5ba3278a38d3055a20fd1
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

---

## Executive Summary

The task's intent holds, but three of its premises did not survive reading and running the engine. The review corrected them in the task document and plan, and the task is now implementable as written.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 4 ⚠️ (fixed)
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline autonomous mode; each decision is logged below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass Agents B and C were not dispatched: the review ran inline, so it has no independent second reader.

---

## User Decisions & Clarifications

None asked. Autonomous decisions, taken by the reviewer and recorded here:

- **D1 — `open` transition.** The engine already accepts `--status open` from any status. Decision: tighten it to `--expect-status parked` only, matching the task's control case ("`actioned → open` still refuses"). No caller in the tree uses `--status open`.
- **D2 — repair route.** *Superseded at develop.* The review chose to relax `--expect-status` to any literal. That was wrong: `observation-log.test.mjs` pins `--expect-status opn` as a usage error, and the review's literal search (check 15) looked for the error message, not for the behaviour. Develop switched to a narrow `--repair` flag, which leaves that test unchanged. Task document and plan corrected in the same run.
- **D3 — `invalidStatus` shape.** File names, top level, in both `queue` and `scan`, matching `statusless`.

---

## 1. Template Structure Compliance

**Status:** PASS. All 11 mandatory sections present; no placeholders; OKF frontmatter has `type` and `description`; Change Log present. Tracker card preflight: 3 card blocks resolve. `doc-links.js`: 1 relative link resolves.

No tracker issue is linked (`github_issue` absent). The develop-next run has no card to move.

---

## 2. Technical Accuracy

**Hallucinations Detected:** 1

#### Critical
- **Wrong file path.** The task (Overview, Phase 3, Files Summary) and its own plan named `shared/resources/review-cycle.md`. It does not exist (`git ls-files | grep review-cycle` finds only `skills/observe-work/references/review-cycle.md`). That file is an authored reference, listed in `skills/observe-work/tests/observe-work.test.js`. Developing against the stated path would have created a stray file. **Fixed.**

#### Important
- **Anchors in the wrong function.** The `statusless` list at `:742`/`:752`/`:781` is in `cmdQueue` (`:733`), not `scan`. `cmdScan` (`:669`) has no such list; the task's "unverified" marker was right to doubt it. **Fixed**, with the `doctor` (`:1369`) and `set-status` anchors added.
- **False premise on reopen (check 11, run, not read).** `STATUS_VALUES` (`:98`) includes `open`. A dry run on a scratch log shows `set-status --status open` is accepted on an `actioned` entry with no guard, so "a parked entry cannot return to open" is true of the prose, and "`actioned → open` still refuses" is false today. **Fixed** by decision D1.
- **Repair is blocked by validation, not by a missing flag.** `--expect-status resolved` fails at `:1032` with `usage`. Run on a scratch log. **Fixed** by decision D2.
- **Missed consumer.** `skills/observe-work/SKILL.md` Session Start reads `doctor` and acts per failing check; a new failing check needs a row. **Fixed** (added to Phase 3 and the Files Summary).

#### Optional
- Bundle command `npm run bundle -- --check` works only by accident of argument passing; `npm run bundle:check` is the script. **Fixed.**
- "Existing `--json` consumers still parse" — grep of consumers (`create-task/scripts/lib.js`, the session-start hook, `session-handoff`'s read whitelist) shows all read named fields; new fields are additive.

Checks run: 1–5, 9, 10, 11 (executed against a scratch log under `~/.cache`, since the engine refuses an ephemeral workspace), 15 (no test pins `statusless` or the unknown-`--expect-status` message: `git grep` over tests), 18 (`shared/resources/tests/*.test.mjs` and `skills/observe-work/tests/*.test.js` are both in the `test:suite` globs), 25 (the bundled copies under `skills/create-task/references/` and `skills/observe-work/references/` are covered by `npm run bundle`).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases name functions, line anchors and the exact validation to change. Test-first fixtures (illegal, legal, statusless) are specified.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT. Success criteria now name tests and their controls; mutation proofs name the revert for each change; the review-cycle criterion names where it is recorded (the QA report). The performance criterion is a measured bound with its command and `uptime` beside each run; it is a heavy measurement, so it should be run on the LAN server.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Tightening `open` is the one behaviour change; its mitigation is the `parked` guard and the grep showing no caller.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue, applied
1. Correct the `review-cycle.md` path everywhere.

### Should Fix (Important) - 4 issues, applied
1. Move line anchors to `cmdQueue`/`cmdScan`/`cmdDoctor`/`cmdSetStatus`.
2. Restate the reopen premise and tighten `open` to parked-only.
3. Repair through a `--repair` flag (the review first said "relax `--expect-status`"; see D2).
4. Add the `SKILL.md` `doctor` row.

### Consider (Optional) - 2 items, applied
1. `bundle:check` command.
2. Consumer grep recorded.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after fixes)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every premise that drives a code change was run against the engine; the defects were in the document, and are corrected.

---

## Review Metadata

- **Reviewer:** Claude (review-task, run inside develop-task Step 2)
- **Review Date:** 2026-11-18
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.281.observation-log-names-what-it-cannot-read/task.281.observation-log-names-what-it-cannot-read.md
- **Architecture Docs Consulted:** none needed (tooling task; engine source and contract read directly)
