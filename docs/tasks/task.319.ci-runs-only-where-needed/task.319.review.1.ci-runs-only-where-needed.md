# Task Review Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Reviewed:** 2026-11-24
**reviewed_blob:** 8b2334d73d1ae28d715ff8bc3e3811a810afaafc
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** GOOD
**Pre-pass:** the two Explore agents did not run; the architecture and codebase checks were done in-line (grep, `sed -n`, `ci-tree-equivalence.js`). Independent review did not run.

---

## Executive Summary

The task is well structured and its motivation is measured. All 11 mandatory sections are present, the card preflight passes, all 5 relative links resolve, and every cited `file:line` anchor resolves to the thing it names. The plan does have gaps: one unreproduced claim that the skip-marker config can be added with no engine change, a push-site population that is incomplete, and one unnamed remote reader (`verify-push-state.sh`).

**Critical Issues:** 0
**Important Issues:** 7
**Optional Improvements:** 5

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (fixes are small; none changes the design)

---

## User Decisions & Clarifications

| # | Question | Decision | Impact |
| --- | --- | --- | --- |
| Q1 | How is `ci.skipMarker` configured, given the `ci` parser rejects unknown keys? | Widen the parser | Phase 3 gains a parser change plus a test; "reused as is" is corrected (I-1) |
| Q2 | How does success criterion 1 read, given more `git push` sites exist than § 3 lists? | Scan test with a named allowlist | Criterion 1 becomes a scan test with a non-vacuity case (I-2) |
| Q3 | What about `verify-push-state.sh` under `batched`? | Run it after the final flush | Phase 0 lists it as a remote reader; a test shows it still catches an unpushed head (I-3) |

---

## 1. Template Structure Compliance

**Status:** PASS

- Frontmatter has `type: task`, `description`, `tags`, a numeric `estimated_effort_hours`, and `github_issue: 936`. The body link to #936 matches it.
- The registry row exists (`docs/tasks/task-registry.md`, row 319).
- Change Log is present and current for `planned`.
- Sign-off is not enabled, so it is not checked.
- Card preflight: 3 blocks resolve (check scope: card sections only).

#### Optional

- **O-1** `push-policy.sh` (§ 1, Key deliverables, says "`.sh` (or `.js`)") is decided as `.sh` in § 7. Say `.sh` in § 1.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (hallucinations: 0)

Verified: each of the 17 cited anchors resolves. `develop-pipeline-on-precompact.sh:418-433` holds the `step7`/`step8` hold and `:430` the push. `ci-tree-equivalence.js:153/365/774` are `isDocsPath`, `reduceBitbucketStatuses` and `bitbucketRollup`. `finalise-ci-poll.sh:13` says "GitHub only".

#### Important

- **I-1 `ci.skipMarker` is not accepted by the engine the task says it reuses "as is".** `ci-tree-equivalence.js:521-523` throws a usage error for "an unknown key under `ci` (the only key is docsOnly)", and its header documents exit 2 for it.
  - An attempted probe (`ci: {skipMarker: …}` in a temp repo) reached `no-green-ancestor` before the config check, so the exit-2 path is read from the code, not reproduced.
  - **Fix (Q1):** Phase 3 widens the known `ci` keys with a test whose fixture sets `skipMarker` and must not exit 2. Correct § 3's "reused as is" to "reused, with its `ci` key list widened". Name every other reader of the `ci:` block.
- **I-4 The skip marker rarely fires, and the task does not say so.** `tree-equivalent` needs a green first-parent ancestor (header, rule 2). When the helper pushes a record-only delta, the preceding code commit's CI is usually still running (QA cycle ≈ 5 min, CI lane ≈ 5 min). So the marker applies mostly at the end-of-run push. State "expected: rarely applies mid-run", and cite `gh run list` / `git log --format='%ad %s'` as the latency measurement (check 27).

#### Optional

- **O-2** § 2's "~140 → ~16 runner-minutes" and "9 → 1 pushes" are figures with no definition or command. Add the definition (which pipelines, which pushes counted) and let the test record the number (check 7).

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Important

- **I-2 The push-site population is incomplete, and success criterion 1 cannot be met as written.** `git grep -n "git push" -- shared/resources skills ':!*/references/*' ':!*test*'` also finds: `skills/develop-batch/SKILL.md:656,669` (the same base-branch tick), `skills/develop-next/SKILL.md:192,705,708,719` (tick resume and retry paths), `skills/develop-bug/SKILL.md:226` (Step 1 branch push), `skills/create-pr/SKILL.md:202`, `skills/create-branch/SKILL.md:235,393` and the develop-task/develop-story README sequence diagrams (`:332,355,387`). Some must stay (branch creation, PR creation).
  - **Fix (Q2):** replace the criterion with a scan test over the pipeline step docs and the develop-* skills. It carries a named allowlist (create-pr, create-branch, the `-u` branch pushes, the helper, tests) and a non-vacuity fixture it must flag. Record the search that defines "push site" beside § 3's table (check 20).
  - Add develop-batch's tick and develop-next's resume pushes to Phase 5's `tickVia` scope, or state them out of scope. `tickVia: pr` that covers only line 657 leaves `ticked-unpushed` retries pushing to the base branch.
  - Add the README diagrams to the Files Summary (doc sweep).
- **I-3 `verify-push-state.sh` is an unnamed reader of the remote.** Step 8 (`step-8-commit.md:280,316`) and `skills/finalise/SKILL.md:2232` assert that reported work is on the remote and fail the run otherwise. It runs after Step 8's push, so under `batched` it is satisfied only if the end-of-run flush precedes it.
  - **Fix (Q3):** Phase 0's reader table lists it, the helper's end-of-run flush is ordered before it, and a test (a deferred record commit, then the flush, then `verify-push-state.sh` exits 0; without the flush it exits non-zero) shows it still catches an unpushed head.
  - Phase 0 should also list finalise's CI poll (reads the head SHA's rollup) and the merge gate's head comparison. The task names only 5c and the merge gate.
- **I-5 Tests that pin the behaviour being removed are not listed (check 15).** Searching for the literals `git push`, `NOT pushed` and `one push per cycle` finds tests that will react: `shared/resources/develop-pipeline-on-precompact.test.sh` (the push under the pause hook), `evals/develop-next/protocol/skill-shape.test.mjs`, `skills/develop-bug/tests/develop-bug.test.js` and `shared/resources/tests/finalise-6a-registry-staging.test.mjs`. List them in § 7 as tests to update. The removed sentences are "Push after every commit…" (three skills), "exactly one `git push origin HEAD` per cycle" (`:1176`) and the hook's push.
- **I-6 New test files and a new script are not shown to be reached (checks 18, 25).** `package.json` `test:suite` lists `.test.sh` files by hand. If `push-policy.test.sh` is a shell test, § 7 must list the runner edit. Name the tests that enumerate a new script or resource (`tests/test-runner-reach.test.js`, the bundle closure check, `tests/mutation-call-site-coverage.test.js` for a new call to a CLI), and what each will require of `push-policy.sh`.
- **I-7 `finalise.rerunAtHead` has no same-class inventory and no safety contract (checks 6, 21).** `qa-execute-snippets.mjs` already runs commands from documents behind an allow-list. State whether `rerunAtHead` replaces, extends or sits beside it, and why. The config also introduces three new top-level blocks (`pipeline:`, `finalise:`, `developNext:`; `skills-config.yaml` has only `ci:` today). Say where their schema and reader live. Say how a criterion's text is matched to a listed command (exact match, never a substring), because task-document text is untrusted input to a command runner.

#### Optional

- **O-3** The task mixes four concerns across 7 phases and 16 h. The Notes already offer a split along A–D; this review does not require it.
- **O-4** Phase 1's helper has no stated input contract (site name, delta, remote-reader flag). The plan file should give it as a table so Phase 2's sites cannot each invent one.

---

## 4. Consistency & Completeness

**Status:** MOSTLY CONSISTENT

- Success criteria that name a record name its location (QA report, DoD): pass (check 22).
- Criterion 1 is a negative-content criterion ("no other push") with no scan test: see I-2.
- Control case: the `eslint:` entry has one (a rule the fixtures never mention). The helper's tests have a red-first case. Good.
- Criterion "`npm run bundle` leaves no diff after commit" is a process criterion; name the record (QA report) that holds it.

---

## 5. Risk & Rollback

**Status:** ADEQUATE. The risk table and per-part rollback keys are specific and testable.

- The HIGH risk (a deferred push hides a commit a reader needed) is mitigated by Phase 0. I-3 and I-4 above are two readers and one latency fact that Phase 0 currently misses.

---

## Summary of Recommendations

### Must Fix (Critical) — 0

### Should Fix (Important) — 7

1. I-1: widen the `ci` parser's known keys and correct "reused as is" (per Q1).
2. I-2: replace criterion 1 with a scan test plus allowlist; add the missing push sites and the README diagrams (per Q2).
3. I-3: name `verify-push-state.sh` (and finalise's poll) in Phase 0; order the flush before it, with a test (per Q3).
4. I-4: state that the skip marker rarely applies mid-run, with the latency evidence.
5. I-5: list the tests that pin the removed pushes.
6. I-6: name the runner edit and the enumerating tests for `push-policy.sh`.
7. I-7: state `rerunAtHead` against `qa-execute-snippets.mjs`, the config schema location and the match rule.

### Consider (Optional) — 5

O-1 (`.sh`), O-2 (figure definitions), O-3 (split), O-4 (helper input contract), and the process-criterion record location.

---

## Implementation Readiness Assessment

**Score:** 7/10

- Template Compliance: 9/10
- Technical Accuracy: 6/10
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 7/10

**Confidence for successful implementation:** Medium-High. The design is sound and measured; the revisions add missing readers and one parser change.

**Recommendation:** NEEDS REVISION. Apply I-1 to I-7, then promote to `ready-for-development`.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-11-24
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md
- **Architecture docs consulted:** `skills-config.yaml`, `docs/reference/configuration.md` (referenced), the cited `shared/resources/` sources
