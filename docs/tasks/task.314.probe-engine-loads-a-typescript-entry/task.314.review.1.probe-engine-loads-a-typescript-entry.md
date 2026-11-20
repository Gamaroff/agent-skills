# Task Review Report: Task 314 - The security probe engine loads a TypeScript entry

**Reviewed:** 2026-11-20
**reviewed_blob:** da33d35f33ec7c17d744d6b470066691cb57ebd4
**Review Depth:** Standard
**Task Status:** planned (before review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 Important recommendations implemented — 2026-11-20

---

## Executive Summary

The task is well grounded: every `security-probe.mjs` line anchor resolves, the bundling population (4 skills) is measured, the section 3.5 table marks each unverified figure as unverified, and the criteria name the QA report as the home of every record. Three plan gaps would each have cost a QA cycle, and all three were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions (pipeline mode, no genuine ambiguity)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

**Independence note:** the two pre-pass Explore agents (architecture, codebase) did not run. The checks were done in-line from the main session, so this review has no independent second read. Axes for architecture alignment were not measured by `prepass-axes.js`.

---

## User Decisions & Clarifications

None. Pipeline mode: output format "Comprehensive report", fixes auto-applied.

---

## 1. Template Structure Compliance

**Status:** PASS

- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no findings.
- `doc-links.js`: 2 relative links resolve.
- OKF: `type: task` and `description` present. Change Log present with one row.
- No unfilled placeholders. Sign-off is not enabled for this check.

---

## 2. Technical Accuracy

**Status:** ACCURATE, with plan gaps below

Verified by reading the tree (2026-11-20):

| Claim | Result |
| --- | --- |
| `import(pathToFileURL(spec.entryPath).href)` at `security-probe.mjs:400`, `RUNNER` at `:376`, spawn at `:2234`, `resolveEntry` at `:599`, `outside-repo-root` at `:716` and `:723`, `CLI_INTERPRETERS` at `:759` | all resolve |
| `sandboxEnv({ cwd, bindings = {} })` | resolves (`qa-execute-snippets.mjs:4518`) |
| `ENGINE_TIMEOUT_MS = 20 * 60 * 1000` | resolves (`security-probe-plan.mjs:100`) |
| 4 skills ship `security-probe.mjs`, 1 ships the plan runner | `ls skills/*/references/security-probe.mjs` → finalise, qa-story, qa-task, review-security; plan runner in finalise |
| CI is Node 22 | `.github/workflows/test.yml` `node-version: '22'` |
| `typescript` not installed | `node_modules/typescript/package.json` absent |
| Child env reaches the compiler | `leashed()` wraps the child with `env -i` plus `sandboxEnv` assignments, so a `bindings` value does pass |

### Important

- **I1. The "no compiler" decline has no stated channel.** The hook runs through `--import`, before `RUNNER`. A hook that throws on a missing `typescript` kills the child before `RUNNER` can report anything, and `RUNNER` only reports its own `stage: "import"` errors. The plan's "exit with a marker the engine maps" is therefore unspecified. The same hole exists for a Node that lacks `registerHooks` (it arrived in v22.15.0 per Node's docs; `"engines"` allows `>=22`, which includes 22.0 to 22.14). **Fix applied:** the engine checks both in the parent before spawning (`createRequire(root).resolve("typescript")` and `typeof registerHooks`), and declines with a named reason carrying the root searched or the Node version. The child never meets either failure.
- **I2. Phase 4 rewrites text that tests pin, and lists none of them.** `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` holds 5 pins on the zero-guard text (`git grep -c "executed no candidates"`). `evals/shared/tests/probes-executed-population.test.mjs`, `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` and `tests/shared-script-literals.test.js` all reference the probe documents. No test asserts a `.ts` entry is declined (`git grep '\.ts#'` over tests and evals: 0 hits), so the behaviour change breaks none. **Fix applied:** Phase 4 now names these four and requires running them after the doc edit.
- **I3. A new member of an enumerated class names no enumerating test.** The hook is a new file in `shared/resources/`, reached at runtime by a path string. **Fix applied:** Phase 4 now requires confirming the bundler copies it (`npm run bundle:check`, and `tests/bundled-links.test.js`) and that `tests/test-runner-reach.test.js` stays green. The new suite is reached by the existing `shared/resources/tests/*.test.mjs` glob in `package.json`.

### Optional

- **O1.** With no `tsconfig.json` the hook passes `{}` options, so `ts.resolveModuleName` falls to classic resolution and a NodeNext `./x.js` → `x.ts` import will not resolve. State the default (`moduleResolution: Bundler`) for the tsconfig-less case, and put one tsconfig-less fixture in the family.
- **O2.** Phase 4 says "the 4 skills ... (and with `finalise`, which ships the plan runner)". `finalise` is one of the 4. Harmless; fixed by wording.
- **O3.** Section 10 says "a test or a grep over the three keeps them in step" for the three documents that list the entry forms. No test is planned. Either plan one or drop the claim.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases name files, risk and checkboxes. Phase 0 settles the premises (Node 22 hook API, per-child cost, transpile-once decision) before any build. The fixture family covers the three handoff shapes plus four named wider shapes, with the measuring command to be recorded.

Checks run with nothing to report: 10 (outcome reachability: mutation (a) removes `--import`, and the child's own `import` then fails, which `RUNNER` reports as `stage: "import"`, which the engine declines as `entry-not-probeable`), 11 (no property of an existing function is claimed), 12 (no legacy handling), 14 (no engine call-site list), 17, 19, 24, 26 (fixture literals such as `@scope/shared-types` are generic), 28 (temp-dir removal is named in the plan), 29 (the hook writes nothing; the escape test covers the scan), 30, 31 (no transfer or build command is named; the plan's `docker run` is a read-only `typeof` probe, left to Phase 0 because it needs the LAN server).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Success criteria each name a test, a measurement or a document, and the records live in the QA report. The performance criterion is a measured bound (median of at least five runs, `uptime` beside each, outliers kept). `CI=true npm run test:remote` is a CI-state criterion. The criterion on three documents "not still saying a TypeScript boundary is not probeable" is met trivially today: none of the three says that (`git grep -i typescript` over the engine header, `probe-boundary-rule.md` and `finalise/SKILL.md` found no such statement), so the work is to add the TypeScript entry, which the criterion's first clause already requires.

Scope: 5 phases, estimated 16 hours, one technical area. No split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The Node-range risk is identified with a mitigation (Phase 0 runs `typeof` on the CI image first), and I1 now covers the case at runtime. The no-OS-sandbox statement is protected. Rollback is a single revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

None.

### Should Fix (Important) - 3, all applied

1. I1: parent-side compiler and hook-API check with a named decline.
2. I2: name the tests that pin the probe documents; run them after the Phase 4 edits.
3. I3: confirm bundling and runner reach for the new hook file.

### Consider (Optional) - 3

1. O1: tsconfig-less default and one fixture. Applied to Phase 1 wording.
2. O2: wording fix. Applied.
3. O3: a drift test for the three entry-form lists, or drop the claim. Left to the developer.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No Critical finding; the three Important gaps were closed in the document, and the core design (a bundled fixed hook borrowing the repo's own compiler) is grounded in verified anchors.

---

## Next Steps

Developer follows the five phases in order. Phase 0 first: run the Node 22 `typeof` probe on the LAN server before writing the hook.

---

## Review Metadata

- **Reviewer:** review-task (pipeline mode, in-line pre-pass)
- **Review Date:** 2026-11-20
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.314.probe-engine-loads-a-typescript-entry/task.314.probe-engine-loads-a-typescript-entry.md`
- **Architecture Docs Consulted:** none read; `prepass-axes.js` not run (see independence note)
