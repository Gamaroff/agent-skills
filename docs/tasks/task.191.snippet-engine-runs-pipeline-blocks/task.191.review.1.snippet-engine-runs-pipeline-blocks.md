# Task Review Report: Task 191 - Snippet engine runs pipeline blocks

**Reviewed:** 2026-10-19
**reviewed_blob:** 6b837f5c4e85c695fe3ddb3ebbd6c3c88c2a2d49
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 important recommendations implemented — 2026-10-19 (optional items O1–O4 applied too; O5–O6 recorded only)

---

## Executive Summary

The task is well-sourced: every incident it cites reproduces on the current tree, and the engine's
current shape matches the Technical Background apart from drifted line anchors. One real gap sits in the
safety boundary: the helper rule resolves the helper path against the temp-copy root, but the block runs
it from the block's own working directory, so a block that `cd`s first runs a file the classifier never
read. Two other Important gaps concern the callers: this repository's `.agents/skills` symlink layout,
and a wrong path for the parity test.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 6 💡

**User Clarifications:** 0. This was an autonomous pipeline run (develop-next → develop-task Step 2). No questions were asked; each decision below is resolved from the codebase and recorded as an assumption.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the Important fixes, which are applied)

---

## User Decisions & Clarifications

Autonomous run: no `AskUserQuestion` calls. These are the assumptions made in place of questions:

- **A1 (cd rule)**: helper recognition is refused for the whole block when the block changes directory (`cd`, `pushd`, `popd`). This is the narrowest rule that closes the gap without modelling the shell's working directory. It removes nothing that runs today, because every such block is refused now.
- **A2 (dogfood seeding)**: Step 4b and Phase 1.7 document `--copy-as .agents:.agents` for a consumer install. They also document `--copy-as skills:.agents/skills` for a repository where `.agents/skills` is a symlink. The engine is not changed to dereference symlinks: following a symlink out of the copy is exactly what the helper rule must refuse.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections plus Progress Tracking, References and Change Log are present. No placeholders.
- OKF: `type: task`, `description` and `tags` are present.
- Sign-off is not configured (`sign-off.enabled` is absent), so it is not checked.
- Change Log is present and current for `planned`.
- Tracker: `github_issue: 590` exists and is OPEN, and the body link matches.
- Card preflight: 3 card blocks resolve (`sync-jira-task.js --check-card` rc 0). The section omissions the card will show as `+N more`: Summary 5, Success Criteria 6, Breaking Changes 4.
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

Verified by running the code (check 11):

- `classifyBlock(readFileSync("shared/resources/qa-cycle.sh"))` → `mutating`, `unrecognised-command: shopt, <unparseable>`. `newest-numbered.sh` → `<unparseable>`. `advance-pipeline-lock.sh` and `set-qa-phase.sh` → `deny-list: rm -rf`. These match § 3's measurement.
- `bash`, `sh`, `source` and `.` are absent from `SAFE_COMMANDS`. `SHELL_KEYWORDS` says so explicitly (`qa-execute-snippets.mjs:461-464`).
- `executeFile` seeds `--copy` / `--copy-as` **before** its block loop (`:1702` `--copy`, `:1713` `--copy-as`, then `for (const block of blocks)`). The plan's concern that "classification currently happens before the copy exists" does not hold: the copy already exists when a helper would be resolved.

Pre-pass: Agents B and C were not dispatched. The passes ran inline, and **the independence of those two passes is lost**. `prepass-axes.js` source: `architecture` (10 axes). Alignment: the task touches one Node engine and two skill documents, and it follows the coding standards' Node ESM and `command node` conventions. No drift was found.

### Important

- **I1. The helper rule resolves a path the block does not run.** § 3 says the path "resolves (realpath) to a regular `.sh` file inside `helperRoot`". At run time the block executes from its own working directory, and `cd` is an allowed builtin (`SHELL_KEYWORDS`). Take `cd sub && bash x.sh`: the classifier vets `<copy>/x.sh`, then the shell runs `<copy>/sub/x.sh`, a file nobody classified. `bash` also searches `PATH` when the name holds no slash and the file is not in the working directory. This fails open on the safety boundary the task says it keeps. **Fix (A1):** a block that contains `cd`, `pushd` or `popd` gets no helper recognition. The runner word stays `unrecognised-command`, with reason `helper call after a directory change`. Add a control test.

### Optional

- **O1. Line anchors have drifted.** They are declared against `5f09b4da`, but the current `develop` differs: the `unrecognised-command` reason is at `:1317`, the zero-run findings at `:1820-1875`, `--bind` at `:1943`, qa-task's Step 4b command at `skills/qa-task/SKILL.md:904`, and qa-story's at `skills/qa-story/SKILL.md:1304`. Re-anchored.
- **O2. `local` is already a recognised builtin** (`SHELL_KEYWORDS`). Helper mode does not need to learn it. Removed from the helper-mode list.
- **O3. The helper population is now 32 `shared/resources/*.sh` files** (excluding `*.test.sh`), not 29. Measured with `ls shared/resources/*.sh | grep -v '\.test\.sh' | wc -l`. The test records the figure; the prose no longer states it.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Every phase names its files, risk and dependencies. The plan file carries the function-level detail. The plan's claim that "classification currently happens before the copy exists" is corrected (see § 2).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I2. This repository's own layout defeats the documented caller.** Here `.agents/skills` is a gitignored symlink (`skills -> ../skills`, `.gitignore:22`), and CI has no `.agents/skills` at all. `--copy-as .agents:.agents` copies the symlink as a symlink. Inside the copy it points at `<copy>/skills`, which does not exist, so every helper realpath fails and every helper call is refused. That is the opposite of what Step 4b promises when QA dogfoods this repository. **Fix (A2):** Phase 4 documents both seedings. Phase 2's fixtures place real files (no symlinks), and a control covers the symlinked-layout refusal.
- **I3. The parity test is not where the task says.** Phase 4 says "check `tests/qa-execution-step-parity*.test.*`". The file is `evals/shared/tests/qa-execution-step-parity.test.mjs`, and the success criterion "held by the existing qa execution-step parity test" now names that path.

Check 15 (removed-literal sweep) → `git grep -n 'template slot\|supply the missing values' -- '*.test.*'`: no test pins the `"template slot"` reason or the `--bind` detail text. Tests assert `klass` and the finding `kind` only. The parity test pins the literal `zero-blocks-executed`, which this task keeps.

Check 18 (runner reach): no new test file. The cases go into the existing `shared/resources/tests/qa-execute-snippets.test.mjs`, which the test runner already reaches.

Check 4 (criteria): every functional criterion names its test. The Performance criterion is an explicit "not applicable" line, which is acceptable. No criterion has to wait for the merge.

### Optional

- **O4. "Functions a sourced helper defines are recognised for the rest of the block."** `commandWords` returns words without positions, so "rest of the block" means "anywhere in the block". A call placed before the `source` fails at run time with command-not-found, which writes nothing, so the simplification is safe. The task now says "in that block".
- **O5. A sourced bash-only helper differs under zsh.** A helper using `shopt` is an example. Because `runBlock` runs both shells, expect a shell-divergence finding for such blocks. That is the dual-shell check working, not a defect. Recorded here only.
- **O6. `--diff-base` on an untracked file.** `git diff <rev> -- <file>` prints nothing for an untracked file, so `changed.total` is 0 and no finding fires. QA runs on a committed branch, so this is acceptable. Recorded here only.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (with I1)

The helper rule is an exemption to a refuse-by-default guard, and it is rated Medium. The § 8 controls are the differential oracle: shapes it must still refuse. I1 adds the `cd` control to them. Rollback is per phase and realistic.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. I1: refuse helper recognition in a block that changes directory, with a control test. ✅ applied
2. I2: document the dogfood seeding (`--copy-as skills:.agents/skills`), and add a symlinked-layout control. ✅ applied
3. I3: correct the parity test path. ✅ applied

### Consider (Optional) - 6 items

O1–O4 applied. O5 and O6 are recorded only.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** There are no critical issues. The three Important gaps each have a one-paragraph fix, and all three are applied to the task document.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, develop-task Step 2)
- **Review Date:** 2026-10-19
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.191.snippet-engine-runs-pipeline-blocks/task.191.snippet-engine-runs-pipeline-blocks.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md (via prepass-axes.js)
