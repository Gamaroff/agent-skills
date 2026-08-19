# Task Review Report: Task 54 — Intercept GitHub board mutations, and give `gh-stage.js` the credential-free plan its sibling already has

**Reviewed:** 2026-08-19
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** GOOD (with one significant scope correction required)

---

## Executive Summary

The task is well-argued, concretely scoped, and unusually strong on testing — the mutation-prove list is
the kind of thing that makes a review easy. One finding dominates: **the task was authored on
2026-08-17, before task.53 merged, and task.53 already landed the interception half of this task's
plan** by a mechanism the plan does not anticipate. Implementation Plan item 2 describes injecting a
recording `exec`; `shared/resources/gh-stage.js:828-940` already contains an access gate that emits
`reason: "deferred"` and covers both `--add-to-board` and the Status field. Following the plan as
written would either duplicate a shipped, tested gate or replace it.

Everything else in the task stands: `--print-plan` is genuinely absent from `gh-stage.js`, the two
board-field shell helpers are genuinely ungated, `tracker_write` does not exist, and `finalise`'s reason
table has no `deferred` row.

**Critical Issues:** 1 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline mode — autonomous defaults applied)
**Implementation Readiness (pre-fix):** 7/10
**Recommendation (pre-fix):** NEEDS REVISION → **resolved by fixes applied in this review**

---

## User Decisions & Clarifications

Invoked by the `develop-task` orchestrator in autonomous mode. Per
`references/develop-pipeline-autonomous-defaults.md`, the interactive question points were auto-answered
rather than surfaced:

| Question point | Auto-answer | Rationale |
| -------------- | ----------- | --------- |
| Step 0 — output format | Comprehensive report | Pipeline audit trail requires a file |
| Step 0a — branch setup | Auto-skipped | Already on `feature/task.54.github-board-interception` |
| Step 8.5 — apply fixes | Yes, all critical + important | Pipeline needs the task corrected before `/develop` |
| Step 9 — status update | Yes, fixes complete | Pipeline gates on `Status:` before Step 3 |

Pre-pass conflict detection (architecture alignment, codebase already-implemented scan) was run inline
against the source tree rather than dispatched to Explore subagents — session policy prohibits
unrequested subagent dispatch, and every check here is a direct file read. The already-implemented scan
is what surfaced C1.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Card preflight

```
✅ Summary              169 chars
✅ Success Criteria     428 chars, 4 omitted → "+N more" link
· Breaking Changes      not present (optional)
No problems found.
```

Exit 0 — every card block resolves. The `+N more` link means a board reader sees 5 of the 9 success
criteria; that is information, not a defect.

### OKF frontmatter conformance

| Field | State |
| ----- | ----- |
| `type: task` | ✅ present, non-empty |
| `description` | ✅ present, one sentence |
| `tags` | ✅ YAML list |
| `updated` (≡ OKF `timestamp`) | ✅ 2026-08-17 |
| `github_issue: 232` (≡ OKF `resource`) | ✅ matches body link `[#232](…/issues/232)` |

No findings.

### Issues

#### Important
- **Three mandatory sections absent**: `## Technical Background`, `## Progress Tracking`, `## Change Log`.
  The accepted sibling in this same series — `task.53.jira-rest-interception.md` — carries all three.
  `change-log.enabled` defaults to `true` with `advisory` enforcement, so the missing log deducts from
  this score without blocking development.

#### Not applicable
- **Stakeholder Sign-off** — `sign-off.enabled` is absent from `skills-config.yaml`, so this check is
  skipped entirely and no finding is raised.

**Score: 7/10**

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — every file, function and mechanism the task names exists.

### Issues

#### Critical

- **[C1] Implementation Plan item 2 is premised on a mechanism that task.53 has already superseded.**
  - **Location:** Decisions table row 2 ("Recording `exec`, not a new parameter"); Implementation Plan item 2; Scope ("recording `exec`")
  - **Issue:** The task argues for injecting a recording `exec` at `makeExec` so that `ensureOnBoard` and
    `setOption` record instead of executing. Commit `bfbebc8` (*"fix(task.53): the stage CLIs must
    capture the operator knob too"*) already landed an **access gate** at
    `shared/resources/gh-stage.js:828-940`, placed deliberately between arg-parsing and `ghAvailable`,
    that resolves the moment, writes a `github.board.field-set` record via `defer-mutation.js`, and
    returns `emit({transitioned: false, reason: "deferred", access, target, record}, 0)`.
  - **Evidence:** `grep -n '"deferred"' shared/resources/gh-stage.js` → lines 830, 928, 939. The gate's
    own comment states *"PLACEMENT IS THE WHOLE POINT… a gated run demonstrably attempts no network
    call."* Because it returns before `ghAvailable`, it covers the **entire invocation** — `--add-to-board`
    included — which is strictly broader than a recording `exec` at the two call sites would be.
  - **Consequence if unfixed:** a developer following the plan literally either adds a second, redundant
    interception layer or tears out a shipped and tested one. Success Criterion 2 ("Under a deferring mode
    no `gh` write verb is issued") is already partly satisfied and would read as new work.
  - **Recommendation:** re-scope item 2 from *"inject a recording exec"* to *"verify the existing gate and
    close its two gaps"* (see I2 below for what those gaps are). Rewrite the Decisions row to record
    the superseding rather than delete it — the reasoning about `makeExec` being an injectable seam is
    still true and still worth the reader's time.

#### Important

- **[I1] Line-number anchors have drifted.** Four commits have touched `gh-stage.js` since the task was
  authored (`f47ad25` task.61, `bfbebc8` task.53, `25014fa` task.52, `1fd3aaa` credentials).

  | Task cites | Actual |
  | ---------- | ------ |
  | `ghAvailable` gate at `:811` | definition `:274`, call site `:955` |
  | `args.dryRun` branch at `:1068` | `:1212` |
  | `makeExec(execImpl)` at `:263` | `:264` |
  | `ensureOnBoard:526` | `:527` |
  | `setOption:572` | `:573` |
  | `finalise/SKILL.md:1176-1192` | table `:1178-1187`, escalation `:1193` |
  | `tests/gh-stage.test.mjs:9` | ✅ correct — the throwing stub rationale is at `:8-12` |

  `jira-stage.js:344-392` is ✅ correct — `--print-plan` is at `:344-392` and does run above the auth
  check (`no-credentials` is emitted at `:533`).

- **[I2] The existing gate has two concrete gaps the task should name and close.** These are the real
  remaining work in `gh-stage.js` beyond `--print-plan`:
  1. **The record does not mention board membership.** Under `--add-to-board`, an unrestricted run would
     perform `gh project item-add` *and* set the field. The deferred record's `desired` and `manual.fields`
     describe only the field-set, so a human following the checklist on an issue that is not yet on the
     board is told to set a field on an item that does not exist there.
  2. **`verify.cmd` is not credential-free.** The record emits
     `verify: { cmd: "gh-stage.js --issue N --stage S --dry-run --json" }`. `--dry-run` sits below
     `ghAvailable`, so on the `manual`-mode machine that produced the record the verify command cannot
     run. Once `--print-plan` exists it is the correct verify command — which is a second, independent
     argument for item 1 that the task does not currently make.

- **[I3] `resolve-platform.sh`'s coverage banner must change in this task and is not in scope.**
  `shared/resources/resolve-platform.sh:465-479` carries a comment block that names **task.54 by number**
  as the change that alters GitHub coverage, and a runtime warning asserting that *"all GitHub issue and
  PR writes still proceed normally"*. Once the two `.sh` helpers are gated, board-field writes no longer
  do. The comment block itself instructs: *"Keep this notice accurate as each one lands; a warning that
  overstates coverage is worse than none."* Neither the Implementation Plan nor the Files Summary
  mentions it.

- **[I4] Item 3 does not name the established shell-guard precedent.** `shared/resources/jira-sprint-lib.sh:27-140`
  already implements exactly the shape item 3 needs, landed by task.53: subshell-sourced resolver,
  two env tiers most-restrictive-wins (`ACCESS_TRACKER` from `resolve-platform.sh` plus the operator's
  `AGENT_SKILLS_ACCESS_TRACKER`), and `defer-mutation.js` located via `$(dirname "${BASH_SOURCE[0]}")` so
  it resolves both in-tree and in an installed skill. That file's comments warn explicitly against
  open-coding the mode table again — *"This file used to open-code the mode table over the two env names,
  which made it a FOURTH copy of a contract that already had three."* An implementer who does not know
  the precedent exists will write the fifth copy.

**Score: 6/10** (pre-fix)

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Items 1, 3, 4, 5 and 6 are specific, correctly scoped, and name real files and functions. Verified absent
from the tree, so all five are genuine work:

| Item | Verification | Verdict |
| ---- | ------------ | ------- |
| 1. `gh-stage.js --print-plan` | `grep -c printPlan gh-stage.js` → **0** | genuinely absent |
| 3. two `.sh` helper guards | neither file references `ACCESS_TRACKER` or `defer` | genuinely ungated |
| 4. `tracker_write` + alias | only `tracker_call_with_retry` exists (`resolve-platform.sh:505`) | genuinely absent |
| 5. `finalise` `deferred` row | reason table `:1178-1187` has no `deferred` row | genuinely absent |

Item 2 is the exception — see C1.

### Issues

#### Important
- **[I5] Files Summary omits files the plan requires changing.** Missing:
  `shared/resources/resolve-platform.sh` coverage banner (I3 — the file is listed, but for
  `tracker_write` only, and the banner is a separate edit with a separate reason);
  `shared/resources/tracker-access.test.sh` and/or `shared/resources/resolve-platform.test.sh` for the
  `tracker_write` alias test the Testing Strategy explicitly requires; and no named test home for the two
  `.sh` helper guards.

**Score: 7/10** (pre-fix)

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Success criteria are all measurable and checkbox-form. The Testing Strategy is genuinely strong — the
mutation-prove list gives each invariant a specific way to be seen failing, which is the discipline this
repo's test suites are built around. Scope in/out is explicit, and the out-of-scope boundary is handled
with a dependency edge to task.56 rather than a wrapper hack, with the reason stated (`$( )` capture
would swallow stdout under a deferring mode).

### Issues

#### Optional
- **[O1] "wraps 15 `gh` mutations"** understates the count. Excluding bundled `references/` copies and the
  four definition-site lines in `resolve-platform.sh`, `tracker_call_with_retry` appears **38 times across
  11 files** — the heaviest being `develop-pipeline-step-7-finalise.md` (9), `qa-story/SKILL.md` (7) and
  `qa-task/SKILL.md` (5). The "zero call-site edits" argument is *stronger* than the task claims.
- **[O2] Scope/complexity:** 6 implementation items across 3 technical areas (JS CLI, shell, skill prose),
  one module boundary (`shared/resources/` plus one skill file). Well under the >8-phase split threshold.
  No split recommended.

**Score: 7/10** (pre-fix)

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risk table identifies the right three risks, and the first is the sharp one: `--print-plan` reads the
ladder file while the board is the truth, and the mitigation — assert agreement with `--dry-run`, and
where they differ `--dry-run` wins and the checklist says the target is *derived*, not *observed* — is the
correct resolution rather than a hand-wave. The "unhandled `reason` treated as success" risk correctly
identifies the ordering hazard between emitter and consumer and resolves it by requiring both in one
change.

Rollback is realistic: `git revert <sha>` then `npm run bundle`, with the accurate observation that
`--print-plan` is additive and separable.

No findings.

**Score: 9/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. **C1** — Re-scope Implementation Plan item 2 and its Decisions row to reflect that task.53 already
   landed the access gate; redirect the remaining work to the two concrete gaps in I2.

### Should Fix (Important) — 5

1. **I1** — Correct the six drifted line-number anchors.
2. **I2** — Name the two gate gaps (board-membership in the record; credential-free `verify.cmd`) as
   explicit plan work and success criteria.
3. **I3** — Add the `resolve-platform.sh` coverage-banner update to the plan and Files Summary.
4. **I4** — Point item 3 at the `jira-sprint-lib.sh` precedent so the guard is a reuse, not a fifth copy.
5. **I5** — Complete the Files Summary with the omitted test files.

Plus the three missing template sections (Technical Background, Progress Tracking, Change Log).

### Consider (Optional) — 2

1. **O1** — Correct the "15 mutations" figure to 38.
2. **O2** — No split needed; scope is appropriate.

---

## Implementation Readiness Assessment

**Score (pre-fix):** 7/10 · **Score (post-fix):** 9/10

| Dimension | Pre-fix | Post-fix |
| --------- | ------- | -------- |
| Template Compliance | 7/10 | 9/10 |
| Technical Accuracy | 6/10 | 9/10 |
| Implementation Clarity | 7/10 | 9/10 |
| Consistency | 7/10 | 9/10 |
| Risk Management | 9/10 | 9/10 |

**Confidence Level for Successful Implementation:** High (post-fix)

**Recommendation:** ✅ **READY TO IMPLEMENT** — after the fixes recorded below.

**Justification:** The single critical finding is a staleness artefact, not a design fault: the task was
written two days before its sibling landed a broader version of one of its six items. With item 2
re-scoped onto the two real gaps that gate left, all six items are genuine, verified work with a strong
test plan behind them.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Start with item 1 (`--print-plan`) — items 2 and 3 both depend on it for a credential-free verify path.
2. Verify the existing gate before touching it (item 2 is now *verify and extend*, not *build*).
3. Follow `jira-sprint-lib.sh` for the shell guards rather than open-coding the mode table.
4. Update the `resolve-platform.sh` coverage banner in the same change as the guards.
5. Run `npm test` and `npm run bundle`, and commit the bundle output.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, via `/develop-task` Step 2)
- **Review Date:** 2026-08-19
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.54.github-board-interception/task.54.github-board-interception.md`
- **Sources consulted:** `shared/resources/gh-stage.js`, `shared/resources/jira-stage.js`,
  `shared/resources/resolve-platform.sh`, `shared/resources/jira-sprint-lib.sh`,
  `shared/resources/set-github-project-{priority,estimate}.sh`,
  `shared/resources/tests/gh-stage.test.mjs`, `skills/finalise/SKILL.md`, `package.json`,
  `skills-config.yaml`, `docs/tasks/task.53.jira-rest-interception/`, git history for the above
