# Task Review Report: Task 234 - Probe sandbox teardown and process-group reap

**Reviewed:** 2026-10-31
**reviewed_blob:** d373f7d7d21c78c24641649d69575aaf1e9206a7
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 critical and important recommendations implemented — 2026-10-31

---

## Executive Summary

The task's four fixes are sound and three of its measured claims re-measure true: the PATH_MAX failure (A), `chmod -R` not following symlinks (B), and the group kill (D). One planned test cannot work as drafted. The D red test's grandchild kept the case's stdout and stderr, so `spawnSync` waited for it and its write landed in time. That test would have been red before and after the fix. The task and plan now have the grandchild release its stdio, and give a shape for the module-runner site.

**Critical Issues:** 1 🚨 (fixed in review)
**Important Issues:** 3 ⚠️ (fixed in review)
**Optional Improvements:** 2 💡 (1 applied, 1 recorded as out of scope)

**User Clarifications:** 0. This was an autonomous pipeline run (`/develop-next` → `/develop-task --defaults`), and every question was auto-answered (see below).
**Implementation Readiness:** 8/10 after fixes (5/10 as drafted)
**Recommendation:** READY TO IMPLEMENT (after the fixes applied in this review)

---

## User Decisions & Clarifications

No interactive questions were asked. Pipeline auto-answers:

- **Step 0 output format**: Comprehensive report. This is the pipeline default.
- **Step 8.5 apply fixes**: Yes, apply all critical and important fixes. This is the pipeline default.
- **Step 9 status**: Yes, fixes complete, so Planned → Ready for Development. This is the pipeline default on READY TO IMPLEMENT.
- **Pre-pass agents B and C**: not dispatched. The checks ran inline in the orchestrator session, so no independent review read this task. The architecture axes resolved from `prepass-axes.js` with `source: architecture`.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, plus Progress Tracking, References and Notes. There are no placeholders.
- OKF: `type: task`, `description` and `tags` are present.
- Tracker: `github_issue: 750` exists (OPEN), and the body link `[#750](…/issues/750)` matches it. The board Priority is P3, set by the self-heal helper.
- Card preflight: `No problems found. 3 card blocks resolve`. Breaking Changes shows `+4 more`; this is information, not a defect.
- Change Log: present and current. A review row and a status row were added.
- Sign-off: not configured (`sign-off.enabled` absent), so it was not checked.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

The architecture axes came from `prepass-axes.js` (`source: architecture`). Every line anchor in § 3 and § 7 resolves to the code it names: `removeSandbox` `:969`, sandbox `:1795`/`:1974`, `spawnSync` sites `:479 :1169 :1185 :1908 :2287 :3334`, `watchedSpawn` `:2278`, and the tests at `:7456`, `:7458` and `:7507`. The only relative link resolves (`doc-links.js`).

Invariant checks (check 11), run in the scratchpad on Node v26.8.2 and GNU coreutils 9.12:

| Claim | Command shape | Result |
| --- | --- | --- |
| A: first `rmSync` fails on 30 × 200-byte dirs with a mode-000 leaf; `chmod -R u+rwx` clears it | build via `bash -c 'for i in $(seq 30); do mkdir d…; cd d…; done; mkdir leaf; chmod 000 leaf'` | `rm1 EACCES`, `chmod -R rc 0`, `rm2 ok, exists: false` ✅ |
| B: `chmod -R` does not follow a symlink out; `-R -L` does | symlink to a 0o500 dir inside a mode-000 dir | `-R` → `500`, `-R -L` → `700` ✅ |
| D: `detached: true` + `process.kill(-pid)` stops a background write | see below | ✅, but only for a grandchild that released the pipes |
| C: `os.tmpdir()` reads `TMPDIR` on every call | `os.tmpdir()` before and after setting `process.env.TMPDIR` | `/tmp /x/y` ✅ |

### Critical

- **The D red test could never go green (checks 10 and 11).** Phase 3 drafted the case as `(sleep 0.3; touch <marker>) &`. That grandchild inherits the case's stdout and stderr pipes. `spawnSync` returns only when every holder of the pipes has closed them, so it waited for the grandchild:
  - Measured: the inherited-pipe form returned after **306 ms with the marker already written**.
  - The redirected form `… >/dev/null 2>&1 </dev/null &` returned after **3 ms**, and the marker landed later.
  - With `detached: true` and the group kill, the redirected marker was **absent** 0.7 s later.

  As drafted, the test is red on develop and still red after the fix, because the kill runs after the write. It also does not show the false pass D is about, since `watchedSpawn`'s after-snapshot already sees an in-time write.
  - **Fixed:** § 2 D, § 3 Target D, Phase 3, § 8 D and the plan's "Red test D" now require a grandchild that releases the case's stdio. They also give the `:1908` shape: a module export that spawns with `stdio: "ignore"`, not `detached`, then `.unref()`.

### Important

- **The case-form trace had no search beside it (check 20).** Phase 3 left "confirm every case form reaches `:1908` or `:2287`" open. Review traced it with `grep -n "watchedSpawn(\|caseWatchedSpawn(\|spawnSync(" shared/resources/security-probe.mjs`:
  - `runShellCase` → `:2469` and `runCliCase` → `:2750` call `watchedSpawn` directly.
  - `runShellArgvCase` (`:3100` setup, `:3134` case) and `runFenceCase` (`:3636`) go through `caseWatchedSpawn` (`:2912` → `:2930`).
  - **Fixed:** § 3 and the plan's Population now record the trace and the search.
- **The setup spawn is reaped too, and the task did not say so.** A shell-argv setup also runs through `caseWatchedSpawn` → `watchedSpawn`, so the reap kills a setup's background children before the case runs. **Fixed:** this is stated under § 5 Breaking Change 1, with no migration needed.
- **The `:1908` red test had no runnable shape.** A JS module case cannot use `&`. **Fixed:** this is covered by the Critical fix above.

### Optional

- **`t.skip` needs a test context.** Both `:7458` and `:7507` callbacks take no argument, and `:7507`'s guard runs after its ELOOP half. **Applied:** a note in Phase 2.
- **The tree walkers do not see past PATH_MAX.** `snapshotTree` (`qa-execute-snippets.mjs:1980`) and `workDirStamps` (`:3438`) swallow read errors. A deep tree does not crash them; it only hides entries past PATH_MAX. **Recorded** under § 3 and Out of Scope; no gate item asks for it.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with a red test, a change, a mutation and a risk level. The plan file gives the `chmod -R` argv (with `--`), the `reapGroup` helper with `ESRCH`-only swallow, and the mutation for each fix. `estimated_effort_hours: 16` is within 2× of the rubric (13 success criteria, 4 phases, medium risk).

## 4. Consistency & Completeness

**Status:** CONSISTENT

- **Removed-literal sweep (check 15).** `git grep -n "removeSandbox\|lstatSync(p).isDirectory\|chmodSync(dir, 0o700)" -- '*.test.*' 'evals/**'` found only `skills/review-security/tests/review-security.test.js:1012,1090`. Those are that suite's own fixture cleanup, not the walk. No test pins the code being removed.
- **Runner reach (check 18).** `shared/resources/tests/*.test.mjs` is in `package.json` `test:suite`, and no new test file is needed.
- **Criteria classification.**
  - Functional criteria are held by the A–D tests.
  - "Wall time grows by no more than ~0.6 s per spawn site" is a wall-clock bound held by a measurement, which needs the command and the load: `time` plus `uptime` on the PR head.
  - The `npm run ci` / `bundle:check` / `lint-shell` criterion is a command run.
  - None can only be met after merge.
- **CI platform.** The probe shells include zsh where it is installed; CI is Linux. The A/B/D tests are shell-agnostic, so no zsh-only criterion is created.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Medium risks, `detached: true` and GNU vs BSD `chmod`, are named, with mitigations.
- Rollback is per phase. The rollback trigger "any existing probe case changes outcome" is a sound differential oracle for D.
- `chmod -R` is a narrowing (it never follows symlinks), not a widening of a guard, so no exemption oracle is needed.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue (fixed)

1. D red test: the grandchild releases the case's stdio, with a shape for each spawn site.

### Should Fix (Important) - 3 issues (fixed)

1. Record the case-form trace and its search.
2. State that the setup spawn is reaped.
3. Give the `:1908` module-runner test a runnable shape.

### Consider (Optional) - 2 items

1. `(t) =>` for `t.skip` (applied).
2. Walker blindness past PATH_MAX (recorded as out of scope).

---

## Implementation Readiness Assessment

**Score:** 8/10 (after fixes)

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (one test design falsified by measurement, now fixed)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The one Critical issue was a test-design error with a measured fix, now written into the task and plan. Nothing left needs a decision.

---

## Next Steps

Follow the plan phase by phase: red, change, green, mutate. Phase 3's red tests must use the stdio-releasing grandchild.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, autonomous)
- **Review Date:** 2026-10-31
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.234.probe-teardown-and-reap-hardening/task.234.probe-teardown-and-reap-hardening.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md (axes via `prepass-axes.js`)
- **Independence:** pre-pass agents not dispatched; all checks ran inline
