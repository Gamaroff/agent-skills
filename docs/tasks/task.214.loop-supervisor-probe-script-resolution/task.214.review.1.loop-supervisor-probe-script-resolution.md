# Task Review Report: Task 214 - loop-supervisor: find select-next.mjs wherever the skills are installed

**Reviewed:** 2026-10-21
**reviewed_blob:** d209bc1aefbdf6eee1f1bdd390646bb8ed8d24b0
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 5 critical and important recommendations were implemented on 2026-10-21.

---

## Executive Summary

The task is small, well scoped and accurate about the code it changes. One claim was falsified by running it. The plan said the existing override test "must keep passing", but in this repository that test would pass in CI and fail on a developer machine. The fixes are applied, and the task is ready to build.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 4 ⚠️ (fixed)
**Optional Improvements:** 2 💡 (1 applied)

**User Clarifications:** 0 questions asked. This was an autonomous `/develop-next --defaults` run, so every question took its recommended option, as recorded below.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This was an autonomous pipeline run, so no question was put to a person. Each auto-answer is recorded here.

### Question Point 1: Structure & Scope

**Q1: Output format.** Auto-answered "Comprehensive report", the pipeline default.

**Q2: The task has no linked GitHub issue. Should one be created and linked?** Auto-answered "Sync to GitHub" (Recommended). The dedup search for `[Task 214]` found 0 matches. Issue **#721** was created, added to the "Agent Skills" board with Priority P2, and written to frontmatter with a body link. The board has no `Estimate` field, so the estimate was not set.

### Question Point 2: Technical & Implementation

**Q3: How should the existing override test, which resolves against the repository root, be kept deterministic?** Auto-answered: give it a temp `cwd` holding only the `skills/…` candidate. This matches the plan's own temp-directory pattern for the new tests.

### Question Point 3: Completeness & Safety

**Q4: The performance criteria "≤3 existsSync calls" and "dry-run timing unchanged within noise" have no planned test.** Auto-answered:

- Make `exists` injectable, and hold the call count with a counting-stub unit test.
- State that wall-clock timing does not apply. The criterion has no numeric bound, and the added work is already pinned by the count.

### Step 8.5 / Step 9

Both took the pipeline's auto-answers: apply all critical and important fixes, and record the fixes as complete. The status was promoted Planned → Ready for Development.

---

## 1. Template Structure Compliance

**Status:** PASS (after fixes)

### Issues

#### Important
- **No tracker linkage.** `github_issue` was absent. Fixed: issue #721 was created and linked (Q2).

#### Notes
- All 11 numbered sections are present. There are no placeholders, and the OKF fields (`type`, `description`, `tags`) are present.
- Card preflight: 3 card blocks resolve with no problems. The issue card omits 4 success criteria behind a "+N more" link (information only).
- Sign-off: `sign-off` is not configured in `skills-config.yaml`, so this check is skipped.
- Change Log: present. Rows for the review verdict and the status change were added.
- Relative links: `doc-links.js` reports that both relative links resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE (after fixes)
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment) returned `alignment: drift`, `prepass-axes.js` source `architecture`. The axes checked were: What this repo produces, File naming, Cross-skill resources, Validation before commit, Do not. Both of its findings were low severity:

- **`.claude/skills` as a candidate vs. the agent-agnostic path rule.** This is a read-only search for consumers whose installer put the skills there. Nothing is written to that path, and `.agents/skills` stays first. A justification sentence was added to § 3 (Optional, applied).
- **Tests in `evals/loop-supervisor/unit/`.** This is not a deviation. That directory exists, and the `package.json` `test` glob already reaches it (check 18).

Pre-pass C (codebase scan) returned `implementation_status: not-implemented`:

- `PROBE_SCRIPT_CANDIDATES` and `firstExisting` do not exist yet.
- `resolveAdapter` still takes two arguments.
- `run-loop.mjs:1105` does not pass `cwd`.

Every line cited in § 3 was re-read and is correct:

| Cited | Found at |
| --- | --- |
| Both `probeScript` literals | `adapters.js:223` and `:241` |
| `resolveAdapter` | `:281` |
| Its one call site | `run-loop.mjs:1105` |
| `cwd` in scope in `main` | `run-loop.mjs:1068` |
| `runProbe` spawns with `cwd` | `run-loop.mjs:1047` |

### Issues

#### Critical (falsified invariant, check 11)

- **"The existing test … must keep passing" is false in this repository.**
  - **Location:** plan § Key Patterns; task § 3 "Verified in this repository".
  - **Evidence:** a probe run from the repository root shows all three candidates exist locally. `.agents/skills` is a gitignored symlink to `../skills`, and `.claude/skills` is a gitignored symlink to `../.agents/skills`.
    - First-wins therefore resolves to `.agents/skills/develop-next/scripts/select-next.mjs`.
    - `adapters.test.mjs:252-254` asserts `probeArgs({}).includes("skills/develop-next/scripts/select-next.mjs")`. That is an exact array-element match, and it evaluates to `false` here.
    - CI has no symlink, so the same test passes there. The suite would be red locally and green in CI.
  - **Fix applied:** § 3 now says both symlinks are gitignored and absent in CI. Phase 2 has a step that gives that test a temp `cwd`. § 8 forbids repository-root resolves in tests, and § 9 Code Quality requires a green run both locally and in CI.

#### Important (removed literal, check 15)

- **Not every test that pins the default literal was listed.**
  - **Search:** `git grep -n 'skills/develop-next/scripts/select-next.mjs' -- evals/ skills/loop-supervisor/` finds 3 test hits, all in `adapters.test.mjs`:
    - `:198` and `:201` read the `ADAPTERS` table directly. They are unaffected, because the table literal is kept as the fallback.
    - `:253` is the test in the finding above.
  - **Fix applied:** Phase 2 now lists the search and both outcomes.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

The two phases name exact files, the exact call to change, and the order (search before the override loop). The plan gives code for the resolver. Effort is `estimated_effort_hours: 2`, which is in line with 2 phases, 4 files and Low risk.

Outcome reachability (check 10): "none present → `skills/…` default" is returned by `firstExisting`'s planned fall-through (`return candidates[candidates.length - 1]`), which Phase 1 states. "An override is returned verbatim" holds because the override loop runs after the search, unchanged.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

### Issues

#### Important (check 4, a non-functional criterion held neither way)

- **"At most three `existsSync` calls" had no planned test**, although a per-PR test can assert it.
  - **Fix applied:** `firstExisting(cwd, candidates, exists = fs.existsSync)` in the task and the plan, plus a counting-stub test (at most 3 calls, and 1 when the first candidate hits). A matching mutation was added.
- **"`dry-run` timing is unchanged within noise" stated no numeric bound.**
  - **Fix applied:** replaced with a not-applicable line. The added work is the bounded `exists` calls, which the test pins.

#### Optional

- **The two dry-run integration checks were not tied to any test.** They are now marked as manual checks whose output goes in the implementation report. The unit tests hold the criteria (applied).

Control case: § 8 already names a layout the task never mentions (`.claude/skills/` only) and an override that no candidate list contains.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (after fixes)

### Issues

#### Important

- **The rollback trigger would fire by design.** "`dry-run` in this repository selects a different probe than before" is true after this change: locally it selects `.agents/skills/…`, which is the same file through the symlink.
  - **Fix applied:** the trigger now reads "a probe path that does not realpath to `skills/develop-next/scripts/select-next.mjs`".

Risk levels are right. This is a default-path change behind an override, it has no schema or API impact, and it is not a guard exemption.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. Give the existing override test a temp `cwd`, and record that the symlinks are gitignored. ✅ Applied.

### Should Fix (Important) - 4 issues

1. Link a tracker issue (#721). ✅ Applied.
2. List the removed-literal search and its 3 hits. ✅ Applied.
3. Hold the call-count bound with a test, and drop the unbounded timing criterion. ✅ Applied.
4. Reword the rollback trigger to compare realpaths. ✅ Applied.

### Consider (Optional) - 2 items

1. Justify the `.claude/skills` candidate against the agent-agnostic path rule. ✅ Applied.
2. Mark the dry-run integration checks as manual and record them in the implementation report. ✅ Applied.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

| Area | Score |
| --- | --- |
| Template Compliance | 9/10 |
| Technical Accuracy | 7/10 (one falsified claim, now fixed) |
| Implementation Clarity | 9/10 |
| Consistency | 8/10 |
| Risk Management | 8/10 |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Running the plan's one invariant falsified it, and the fix is now in the plan. Nothing else blocks the work, and the change is small and reversible.

---

## Next Steps

1. Phase 1: add the candidates and `firstExisting` with an injectable `exists`, then extend `resolveAdapter`.
2. Phase 2: pass `{ cwd }` from `main`. Add the temp-directory tests and the call-count test, and give the existing override test a temp `cwd`.
3. Mutation-prove the three guards. Write the two documentation sentences. Run the loop-supervisor suite and `npm run validate -- skills/loop-supervisor/`.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, invoked by `/develop-task` Step 2 under `/develop-next --defaults`)
- **Review Date:** 2026-10-21
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.214.loop-supervisor-probe-script-resolution/task.214.loop-supervisor-probe-script-resolution.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md` and `docs/architecture/concepts/coding-standards.md`, via pre-pass B
- **Pre-pass:** Agent B returned `drift` (2 low findings, source `architecture`). Agent C returned `not-implemented`. Both ran as Explore subagents.
- **Checks not applicable:**
  - 12: no released-shape compatibility handling.
  - 14: no engine call-site enumeration.
  - 16: no region replaced whole.
  - 17: no identity key over a command string.
  - 19: no resume rule.
  - 21: no consumed field names from another skill.
  - Mermaid: no diagrams, and none needed.
