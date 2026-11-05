# Task Review Report: Task 256 - security-probe: a uniform failure is declined, not scored

**Reviewed:** 2026-11-04
**reviewed_blob:** 1fe95bfdf166cbd168cda50953a69789e9067f5d
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 critical and important recommendations implemented — 2026-11-04

---

## Executive Summary

The rule and its evidence hold. The review found one plan defect that would have shipped: raw stderr leaking through the `needs-fake-gh` return. It also corrected the criteria that named no test. All the fixes are applied.

**Critical Issues:** 1 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0. The run was invoked inside `/develop-task`, and every finding was settled by running the code.
**Implementation Readiness:** 9/10 after fixes
**Recommendation:** READY TO IMPLEMENT

**Independence.** The session that wrote this document also ran this review. Only the two pre-pass agents read it independently, so QA's review is the first full independent read.

---

## User Decisions & Clarifications

None were asked. Findings were settled by experiment, so no question was left for the user.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, and OKF `type` and `description` are present.
- Change Log is present and current for `planned`.
- Sign-off is not enabled in `skills-config.yaml`, so check 4a was skipped.
- `#825` is OPEN, and the body link matches `github_issue: 825`. Board Priority self-healed to P2.
- Card preflight exit 0 with 3 blocks resolving: Summary (2 omitted), Success Criteria (10 omitted before this review's edit), Breaking Changes (5 omitted).
- `doc-links.js` exit 0.

### Optional

- O1: frontmatter `description` restated the too-wide rule from the observation. Fixed: it now names both directions.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND, fixed
**Hallucinations Detected:** 0

**Pre-pass.** `prepass-axes.js` source `architecture`. Agent B: `drift`, axes checked: What this repo produces, File naming, Status lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit, Do not. Agent C: `not-implemented`, no findings.

### Critical

- **C1: raw stderr leaks through the `needs-fake-gh` return (check 11).**
  - **Location:** Phase 2 and the plan's Phase 2.
  - **Issue:** the plan deleted the private key "immediately before `const allErrored`". The run-time trip-wire return at `security-probe.mjs:2182` comes earlier and also carries `cases: caseResults`.
  - **Evidence:** the prototype, on a script that reaches `gh` by a variable: `reason: needs-fake-gh`, and the case keys were `id,shell,direction,outcome,detail,exit,_failure`. The plan's own criterion, "no private key or raw stderr", was false on this path, and the planned test looked at only one return.
  - **Fix applied:** run the check and delete the key straight after the `try`/`finally`; reclassify just before `const allErrored`. A trip-wire test, a three-return criterion and two mutations were added.

### Important

- **I1: pre-pass B, ShellCheck lane unnamed.** New `.sh` fixtures are in `git ls-files '*.sh'`, which `scripts/lint-shell.sh` lints. Fixed: `npm run lint:shell` is in Code Quality, and fixtures need a shebang. The repository lints clean today (exit 0).
- **I2: the "existing spawn-counting test" did not hold the criterion (check 10).** The test at `security-probe.test.mjs:8785` covers a `cli:` run with and without a setup, and no declined run. Fixed: extend it with a declined `cli:` run.
- **I3: site list without its search (check 20).** The document said `compareExpected` is called "in each arm". The fence caller is `scoreFenceRun`, and `runShellCase` serves two forms. Fixed: the search is recorded and the list corrected.
- **I4: three forms unverified.** The document marked `shell-fn:`, `shell-argv:` and `fence:` as unverified while a criterion promised all of them. Running them was cheap, so they ran: all decline the target shape, and the stay-scored rows hold. Tables added. A trap found: `shell-fn:` without `sink` declines for a different reason, so its test must assert the detail.

### Optional

- O2: `:2190` anchor drifted by one, to `:2191`. Fixed in the plan.
- O3: pre-pass B, the engine header must cite siblings by bare filename, since a `shared/resources/` literal in a shared source is a bundling instruction. Added to Notes.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

Three phases, each with named files and dependencies. The plan's code is a prototype that ran. Effort: 8h, within the rubric.

### Important

- **I5: multi-shell test depended on zsh (consistency check 4, obs #279).** zsh is not installed on this machine, and CI does install it (`.github/workflows/test.yml:46`). Fixed: two shells failing differently is a `uniformFailure` unit test on hand-built results, and per-form tests do not assert a literal `shells`. **What this leaves:** nothing here has run the forms under zsh, so CI is the first run. The document says so.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

### Important

- **I6: criteria with no test named (check 4, obs #222).** "One decline path" was a statement about source text, and "no committed run record is rewritten" had no command. Fixed: the first is now held by the per-form tests as a behaviour (exactly one `declined` entry, every case `errored`), and the second by `git diff --name-only origin/develop... -- '*.run.json'`, recorded in the QA report. Every functional criterion now names its test.
- **I7: the detail did not point at the remedy.** Benefit 1 says the reader fixes the entry form, and the detail did not say so. Fixed: the detail now says "Check the entry form and its argv".

Control case: present in § 8, a fixture the task's text never names.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- A guard-widening change needs a differential oracle (Step 7 check 1). The stay-scored table is that oracle, and § 10 now says so: each row must read the same on `develop` and on this branch.
- Rollback covers the whole change, with triggers and verification.

---

## Checks That Found Nothing

| Check | Result |
|---|---|
| 1 libraries | none added |
| 2 line anchors | all resolve, bar the one fixed above |
| 6 same-class mechanisms | `allErrored` fold reused and named; `isLaunchFailure` left alone with a reason |
| 7 figures | each carries its command |
| 8 path-filtered triggers | none added |
| 10 outcome reachability | SC1 ran on the real script: exit 1, `unverifiable`, `entry-not-probeable`, `executed: 0`, empty `reproduced` and `overblocked` |
| 12 compatibility | none: no shape changes on disk |
| 14 call sites | not applicable: no engine in the list |
| 15 removed literals | none removed |
| 16-19 | not triggered |
| 18 test reach | the test file already runs in `npm test` |
| 21 consumed fields | `probes` and `probes_executed` exist in `security-probe-plan.mjs` |
| Doc sweep | `finalise/SKILL.md:920` remedies apply to this shape; `probe-boundary-rule.md:162` is the row to edit |

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10, the fixed C1 aside
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** the one critical finding is fixed in both documents, and its fix was reasoned from a run. The new placement itself has not run yet: Phase 1's trip-wire test and § 8's mutations are what will prove it.

---

## Review Metadata

- **Reviewer:** review-task, in the `/develop-task` pipeline
- **Review Date:** 2026-11-04
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.256.probe-uniform-failure-declined/task.256.probe-uniform-failure-declined.md`
- **Architecture Docs Consulted:** by pre-pass Agent B, under `docs/architecture/concepts/`
