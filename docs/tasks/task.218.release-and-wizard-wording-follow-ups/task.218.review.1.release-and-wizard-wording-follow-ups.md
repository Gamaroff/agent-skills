# Task Review Report: Task 218 - Release runbook and setup wizard wording follow-ups

**Reviewed:** 2026-10-20
**reviewed_blob:** 8523919c8da981ab68b3c509bd1c8ffcc997b11c
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-10-20

---

## Executive Summary

The task is small, accurate and well anchored. Every file, line and function it cites checks out against `965c7e19`, and both pre-passes agree. The gaps were in how it would be accepted, not in what it asks for. One behaviour criterion had no per-PR test, two criteria had no command, and the plan left one decision to "the reviewer". All seven fixes are applied.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0. This was a non-interactive pipeline run (develop-task Step 2). Each decision below was taken by the review and recorded here.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This was a non-interactive run, so no questions were asked. The review made one scope decision:

**D1: Should §4's manual block also end with `git checkout main`?** The plan left this "only if the reviewer agrees".
- **Decision:** Yes. It is the same defect as QA-8, the fix is one line, and it makes every path through §4 end on `main`, including the third recovery, which sends the reader back to the manual block.
- **Impact:** Deliverable 1, Target Architecture, Phase 1 and the matching success criterion now include it.

---

## Pre-pass

- **Agent B (architecture):** `aligned`. Axes checked: What this repo produces, File naming, Status lifecycle, Plan files, Validation before commit, Do not. `prepass-axes.js` source: `architecture`. One low finding: shellcheck was run without `--severity=warning` (O1).
- **Agent C (codebase):** `not-implemented`. None of the target wording exists yet.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, plus Change Log, Progress Tracking, References and Notes. The filename follows the convention.
- OKF: `type: task` and `description` are present, and `tags` is a list.
- Tracker: `github_issue: 705` exists (OPEN), the body link matches, and the board Priority was self-healed to P3.
- Card preflight: clean. 3 card blocks resolve. For information: the Summary leaves out 4 sentences, Success Criteria leaves out 7, and Breaking Changes leaves out 2, each with a "+N more" link.
- Sign-off is not enabled. The Change Log is present and current.
- `doc-links.js`: the task (4 links) and the plan (1 link) resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE. Hallucinations detected: 0.

Every anchor in the task was checked by reading it:

| Claim | Verified |
| --- | --- |
| `release.sh:605` `git checkout main` closes `# ── 5. sync develop` (590) | ✅ |
| `release-and-install.md:62` opens "Otherwise `--tag`…" | ✅ |
| `setup-consumer.sh:2238` "ticks that checklist" | ✅ |
| Banners at 303, 349, 676, 1185, 1934 | ✅ |
| `select_access` called at `:300`; `write_tracker_workflow` at `:687`; `print_summary` at `:2163`; `main` at `:2273` | ✅ |
| `main` call order | ✅ (`write_tracker_workflow` and `link_agents` run after `install_skills`) |
| `restricted-access.md:34`, `:72`; `which-access.md:51`; `configuration.md:944`; `develop-pipeline-step-7-finalise.md:514` | ✅ |
| getting-started step table lists 2b, 8a and 8b as the task says | ✅ |
| Gate 4 QA-8, QA-9 and QA-10 suggested actions | ✅ |
| §8 render command works (run at `965c7e19`, both modes) | ✅ |

- **Check 15 (removed literals):** `git grep` for every removed literal finds only `setup-consumer.sh`. No test pins the runbook or the restricted-access wording.
- **Check 18 (test reach):** the new test goes in an existing suite that `npm test` already runs.
- **Checks 14, 16, 17, 19 and 21:** not applicable. The task names no engine call sites, replaces no region, has no identity key, no resume rule, and consumes no other skill's output.

### Issues

#### Important

- **I2. The banner site list has no search recorded beside it (check 20).** §2 item 4's table was hand-written. **Fixed:** `grep -n '^# ── ' scripts/setup-consumer.sh` is recorded (22 banners), and the banner criterion now carries its own grep.

#### Optional

- **O1. shellcheck severity** (pre-pass B). §8 and the plan ran plain `shellcheck`. The CI gate and coding-standards use `--severity=warning`. **Fixed** in both.
- **O2. The plan's "if over 100 columns, split" conditional.** The new line measures 97 columns. **Fixed:** the plan now states the figure and drops the conditional.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes.

#### Important

- **I4. The plan left a decision to the reviewer.** "Add `git checkout main` … only if the reviewer agrees" is a branch a developer cannot resolve. **Fixed:** resolved per D1 and written into the plan as a definite step.

#### Optional

- **O3. Two `2.` banners after the renumbering.** `2. platform` and `2. tracker access level` will both read `2.`. That is correct, because step 2 covers both prompts, but a developer might "fix" it. **Fixed:** Target Architecture says it is intended.

The effort estimate (2h) is still reasonable with one small test added.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes.

#### Important

- **I1. A behaviour criterion had no planned per-PR test (obs #222).** "The rendered `approve` summary names `*.handover.*.md`" needs code to run, so finalise sorts it as a behaviour criterion. Its only evidence was a manual command, so finalise would have failed it. **Fixed:** a new test, `rendered summary names the checklist /tracker-reconcile ticks`, goes in `shared/resources/tests/setup-consumer-config.test.mjs`. That file already sources the wizard and calls `print_summary`. The test covers `approve` and `command`, with a mutation proof. The Files Summary, Phase 2, Testing Strategy and Progress Tracking are updated to match. The review also confirmed how the test gets its input: `ACCESS_TRACKER` from the environment reaches `print_summary`, while `DRY_RUN` and `UPDATE_ONLY` are reset by the flag defaults at `:45-46`. The plan records this.
- **I3. A criterion had no command.** "No behaviour change: the diff touches only comment lines and the one `echo`" stated no command. **Fixed:** it now carries `git diff develop -- scripts/setup-consumer.sh | grep -E '^[+-][^+-]' | grep -vE '^[+-]#'`, which must print exactly two lines. The second Performance criterion (the `command` summary is unchanged) is now held by the new test's third assertion.

Documentation criteria (the §4 opening sentence, the `restricted-access.md` wording, the banners and header) are of the "file F says S" kind and need no test.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Every risk is Low, and its mitigation is a grep. The task opens no guard exemption. The rollback plan covers all three phases, which touch separate files.

---

## Summary of Recommendations

### Must Fix (Critical): 0 issues

### Should Fix (Important): 4 issues, all applied

1. I1: add a per-PR test for the rendered summary
2. I2: record the banner search
3. I3: give the diff criterion its command
4. I4: resolve the manual-block decision (D1)

### Consider (Optional): 3 items, all applied

1. O1: `shellcheck --severity=warning`
2. O2: state the 97-column measurement
3. O3: say the double `2.` banner is intended

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** There are no critical issues, every anchor resolves, and each important gap was in how acceptance is evidenced, now fixed in the document.

---

## Next Steps

1. Follow the plan phase by phase, finding each site by its quoted text.
2. Write the new summary test first, see it go red, then edit the `echo`.
3. Record the diff-criterion command's output in the implementation report.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-10-20
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.218.release-and-wizard-wording-follow-ups/task.218.release-and-wizard-wording-follow-ups.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md` (via pre-pass B)
- **Revision reviewed:** branch `feature/task.218.release-and-wizard-wording-follow-ups` at `965c7e19`
