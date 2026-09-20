# Task Review Report: Task 128 - A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt

**Reviewed:** 2026-09-20
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD (after the fixes this review applied)

---

## Executive Summary

The task is well-motivated, correctly scoped, and every file and commit it cites exists (`a412f59a`, `qa-cycle.sh`, `tests/qa-cycle.test.js` `run()`, task.121 gate 5 and dod.1). Three of its mechanisms rest on details the document had not pinned, and one precondition of the finalise path keys on a field that does not exist. All were verified against the tree, not inferred; all were fixed in the task document by this run.

**Critical Issues:** 1 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — every decision below is the recommended option, recorded rather than asked)
**Implementation Readiness:** 8/10 (with the applied fixes)
**Recommendation:** READY TO IMPLEMENT

> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-09-20

---

## User Decisions & Clarifications

This review ran inside `/develop-task` dispatched by `/develop-next` (autonomous). No `AskUserQuestion` was issued; each finding below carries the decision the reviewer took, which in every case is the option that keeps the task's own stated intent ("one engine, one record shape", "preconditions, not judgement", fail-closed) and adds no scope.

**Pre-pass note.** The Phase 1.5 pre-pass (architecture alignment, already-implemented scan) was performed **inline** rather than by two Explore subagents — independence loss recorded. Findings: `alignment: aligned` (tech-stack names bash as the shell for `shared/resources/*.sh`; GitHub Actions `test.yml` is unfiltered so a fixture under `tests/fixtures/` is exercised); `implementation_status: not-implemented` (no `filename` sink in `security-input-corpus.mjs`, no `shell:` handling in `security-probe.mjs`, no fix-and-recheck in `skills/finalise/SKILL.md`).

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory sections present; frontmatter carries `type: task`, `description`, `tags`, `updated`; Change Log present and current (`1.0 Initial draft`, status `planned`); `github_issue: 431` verified OPEN and the body link `[#431](…/issues/431)` matches. Card preflight: `3 card blocks resolve` (Summary +2 omitted, Success Criteria +2 omitted, Breaking Changes) — no findings. Board Priority self-healed to P1 from the `priority:high` label. `sign-off` is not enabled in `skills-config.yaml`; not checked.

### Issues

#### Optional
- Effort: `estimated_effort_hours: 8` — the rubric lands nearer 12h (8 success criteria, 9 plan items across three independent phases, medium risk). Within the 2× tolerance; left as-is.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — but one **non-existent field** is load-bearing.

### Issues

#### Critical
- **Precondition 1 keys on a field the security agent does not emit.** Phase 3 reads "`severity: low` from the agent YAML". `shared/resources/finalise-dod-security-prompt.md` § Output defines `checks[]` (`status`, `citation`, `note`) and `probes[]` (`input`, `expected`, `actual`, `reproduced`) — **no `severity` on either**. As written the first precondition of the fix-and-recheck path is unevaluable, and a run that "reads" it would be judging, which is the thing the path exists to remove.
  - **Location:** §3 Target Architecture (finalise Step 8 row), §6 Phase 3
  - **Fix applied:** Phase 3 now names the schema change: `probes[]` and FAIL `checks[]` entries gain `severity: low | medium | high`; a finding without one is **not low** (fail closed → the existing halt). Added to §7 Files Summary.

#### Important
- **The pre-fix reproduction depends on glob order — verified.** Running `git show a412f59a^:shared/resources/qa-cycle.sh` against the plan's fixture (control `task.1.gate.1.x.yml` + `x.gate.5.y\nz.gate.9.w.yml`) prints `1`, exit 0 — **identical to the fixed script**. The wrong-lower-cycle output appears only when the hostile name is processed *before* the highest gate (`a.gate.3`, `b.gate.5.y\n…`, `c.gate.12` → pre-fix `3`, fixed `12`). Glob order is `strcoll` order and locale-dependent (`~` sorted first under `en_ZA.UTF-8`).
  - **Location:** §3 Target Architecture, §6 Phase 1, plan step 2
  - **Fix applied:** the engine runs the child with `LC_ALL=C` (added to the `sandboxEnv()` it already uses at `security-probe.mjs:428`) and materialises **bracketing controls** — a low gate that sorts first and a high gate that sorts last in C order — so the hostile name is always processed between them; the record stores the fixture listing.
- **`expected: refuse | accept:<value>` cannot express this sink's pass condition.** Beside controls, a correct script never *refuses* a hostile name — it ignores it and prints the high control; `$(touch PWNED).gate.3.x.yml` is a *numbered* name whose pass condition is "no `PWNED` created, high control printed". The vocabulary needs stdout, exit code, an empty-stderr requirement (the pre-fix script leaks `arithmetic syntax error` on every ordering — the one signal that does not depend on glob order), and an absent-path check.
  - **Fix applied:** `expected` is now `{ stdout, exit, stderr: "" , absent: [paths] }`; the corpus states the fixture's controls once per sink.
- **`zsh -c 'bash <script> <dir>'` interpolates paths into a shell string.** The engine's own header (`security-probe.mjs:37-45`) says values cross to the child "never interpolated into a shell string"; `tests/qa-cycle.test.js:44-49` does interpolate (via `JSON.stringify`) and is the shape the plan says to reuse.
  - **Fix applied:** argv form — `zsh -c 'bash "$1" "$2"' zsh <script> <dir>` — and a sentence on what the zsh run verifies (the *caller* shape from a zsh Bash tool; the script's shebang runs bash regardless).
- **`probe-boundary-rule.md` §5 explicitly declines shell sinks.** "v1 probes importable entry points only. A shell/exec sink … is declined and recorded as declined" (l.170-172) and §5.1 "When the sink is declined and the reviewer probes it by hand" (l.181+). Phase 2 named only the header signal and the routing rule; leaving §5/§5.1 as-is makes the document contradict itself.
  - **Fix applied:** Phase 2 names §5's bullet (rewrite: a shell script *with one positional argument* is reachable via `shell:`; stdin/network/multi-arg remain declined) and §5.1 (by-hand probing is for what `shell:` still cannot reach).
- **The Phase 2 "rule classifies the gate-5 note as a boundary" test has no executable subject.** The rule is prose; a test of prose is a source-text assertion (0 of 27 defects caught that way on task.84).
  - **Fix applied:** the signal list is exported once from a small module (`shared/resources/probe-boundary-signals.mjs` — the phrase list and `classifyBoundaryText(text)`), the prose cites it, and the fixture test calls it.
- **The Decision Matrix is defined twice.** `skills/finalise/SKILL.md` Step 6 and `skills/finalise/references/definition-of-done-checklist.md` § "Completion Status Decision Matrix" (l.255+). Phase 3 named only Step 6.
  - **Fix applied:** Phase 3 names both, and the precondition JSON fixture is what each row cites.
- **`skills/finalise/tests/` does not exist and is not in the `npm test` glob.** `package.json` lists per-skill globs by hand; a suite there runs nowhere until added (232 tests were once silently unrun this way).
  - **Fix applied:** Phase 3 places the precondition test under `shared/resources/tests/` (already globbed) beside the JSON fixture it reads, and drops the "new finalise test file" note.

#### Optional
- `--entry shell:path [--arg dir]` in §3 vs. engine-created per-case fixture dir in the plan — `--arg` has no role for the `filename` sink. Clarified: `--arg` is reserved for a sink whose input is a plain string; `filename` cases always materialise.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (with the fixes above)

Three phases, each with files, changes and a test; dependencies stated (Phase 2 on Phase 1's flag name; Phase 3 independent). Mutation proofs named per phase in the plan file. The `sandboxEnv()` reuse, `</dev/null`, per-case timeout and containment-before-spawn are all correctly anchored to existing code.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Files Summary ↔ phases agree after the additions (security prompt schema, DoD checklist, signals module). Testing Strategy covers each mechanism; the contract test ("every site naming the JS entry names the shell entry") has a stated non-vacuity floor. Success criteria are measurable. Three phases, ~12h — not a split candidate.

#### Optional
- Consumer test ("the next task that ships a shell helper gets a measured axis") is an outcome, not a test — acceptable as a criterion, noted.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risks carry mitigations that are mechanisms (`declined` for an uncreatable name; pinned precondition table; DoD "Deviations recorded" block). Rollback is `git revert` + bundle per phase, phases independent. Triggers named. One addition made: a finding without `severity` takes the halt (fail closed) — listed under Rollback Triggers as Critical if ever violated.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue
1. Add `severity` to the security agent's output schema; absent ⇒ not low ⇒ halt. ✅ applied

### Should Fix (Important) - 7 issues
1. Bracketing controls + `LC_ALL=C` so the reproduction is by stdout. ✅ applied
2. `expected` as `{stdout, exit, stderr, absent}`. ✅ applied
3. argv-form zsh invocation; state what the zsh run verifies. ✅ applied
4. Phase 2 rewrites `probe-boundary-rule.md` §5 bullet and §5.1. ✅ applied
5. Export the boundary signals once; the fixture test calls the classifier. ✅ applied
6. Decision Matrix row in both definitions. ✅ applied
7. Precondition test under `shared/resources/tests/` (globbed). ✅ applied

### Consider (Optional) - 3 items
1. Effort 8h vs rubric ~12h — confirm.
2. `--arg` role clarified. ✅ applied
3. Consumer "test" is an outcome — leave.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**
- Template Compliance: 10/10
- Technical Accuracy: 7/10 (one load-bearing non-existent field; one reproduction that did not reproduce as specified — both fixed)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every finding was mechanically verifiable and has been written into the task; the three mechanisms are independent and each has a mutation proof named. The one Critical was a schema gap, not a design flaw.

---

## Next Steps

Task is ready for implementation. Developer should:
1. Follow the plan phase by phase (Phase 1 → 2; Phase 3 independent)
2. Run the mutation proof named for each phase before marking it done
3. `npm run bundle` after Phase 2 and Phase 3 prose changes
4. Refer to the rollback plan if the shell entry hangs or finalise proceeds on a non-low finding

---

## Review Metadata

- **Reviewer:** Claude (review-task, inside /develop-task ← /develop-next)
- **Review Date:** 2026-09-20
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.128.shell-boundary-probe-and-finalise-recheck/task.128.shell-boundary-probe-and-finalise-recheck.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md, source-tree.md
- **Code Consulted:** shared/resources/security-probe.mjs, security-input-corpus.mjs, probe-boundary-rule.md, finalise-dod-security-prompt.md, qa-cycle.sh (HEAD and a412f59a^), tests/qa-cycle.test.js, skills/finalise/SKILL.md Step 6/8, skills/finalise/references/definition-of-done-checklist.md, package.json
- **Review Duration:** ~15 minutes
