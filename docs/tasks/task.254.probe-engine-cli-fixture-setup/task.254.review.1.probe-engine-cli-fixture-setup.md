# Task Review Report: Task 254 - security-probe: a cli: entry can run a fixture setup

**Reviewed:** 2026-11-03
**reviewed_blob:** 2f820294cfe6eb93075815e7fa270ae3abeb685b
**Review Depth:** Standard
**Task Status:** Planned (reviewed; promoted to Ready for Development)
**Overall Assessment:** GOOD

---

## Executive Summary

The task's diagnosis holds: the line anchors resolve, the `cli:` arm runs no setup, and the corrected remedy (extend `cli:`, do not add a form) is right. Review found one design constraint the plan missed (the shell-argv spawn needs a `harnessDir` the `cli:` arm does not have) and an incomplete list of stale documentation sites. All are fixed in the task document.

**Critical Issues:** 0
**Important Issues:** 3 (all fixed)
**Optional Improvements:** 2

**User Clarifications:** 0 (pipeline mode; no question was needed)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Run inside `develop-task`, which auto-answers Step 0 ("Comprehensive report") and Step 8.5 ("apply all critical + important fixes"). No finding required a product decision.

---

## 1. Template Structure Compliance

**Status:** PASS. All 11 numbered sections present, frontmatter carries `type: task` and `description`, no placeholders. Card preflight: 3 card blocks resolve. `doc-links.js`: 1 relative link, resolves. Change Log present; a row was added by this review.

- Optional: tracker linkage. No `github_issue` in frontmatter; the pipeline runs without a tracker issue. Run `/sync-github-task` if a card is wanted.

---

## 2. Technical Accuracy

**Status:** ACCURATE with one gap. Hallucinations detected: 0.

Verified against `shared/resources/security-probe.mjs` (4680 lines):

| Claim | Result |
|---|---|
| `runCliCase` at `:2825`, `runShellArgvCase` at `:3158` | confirmed |
| `materialiseFixture(... writeInput: fixture !== null)` at `:2893` | confirmed; the throw is `name carries a path separator or NUL` at `:2406-2408`, only when `writeInput` is true |
| a non-materialised sink avoids the path decline | confirmed by reading `materialiseFixture`; `writeInput: false` only rejects NUL. Phase 1 still runs it. The prompt already says so (`finalise-dod-security-prompt.md:253-256`) |
| decline sites `:2583` and `:2897` | confirmed; `:2583` is `runShellCase`, `:2897` is `runCliCase` |
| `--fixture-setup` refusal at `:1736-1741` and `:4492-4495` | confirmed |
| setup block at `:3255-3290` | confirmed |
| `fixture_setup` record field | already generic: `fixtureSetup: base.fixtureSetup` (`:2232`) and the record at `:4020`. The plan's "carry `fixtureSetup` into the `cli:` record" is mostly a no-op once the library check accepts it |
| `security-probe-plan.mjs` has no `fixtureSetup` handling | confirmed (no hit) |
| refusal test at `security-probe.test.mjs:6034` | confirmed |

### Important

- **I1 (check 3, fixed): the shared helper cannot reuse `caseWatchedSpawn` as the plan assumes.** It needs `harnessDir` (`:3092`, `${basename(harnessDir)}/${GH_TRIPPED}`) and `shell`. `runCliCase` is called at `:2029` without `harnessDir` and spawns through `watchedSpawn` directly. Written in as a § 3 constraint and a Phase 2 task: parameterise `caseWatchedSpawn`, do not copy it. A sibling-case write test and a mutation now hold it.
- **I2 (check 20, fixed): the documentation site list was recall, not a search.** The task named `probe-boundary-rule.md:166` and the prompt's limit paragraph. The search `grep -rn "fixture-setup\|fixture_setup" shared/resources/*.md shared/resources/security-probe.mjs` also finds the prompt's example comment (`:257`, "there is no --fixture-setup here"), `probe-boundary-rule.md` lines 552, 572-587 and 683, and `security-review-prompt.md` lines 105 and 176. The last file was not in scope at all. Scope, Files Summary and Phase 4 now list them and require the search re-run.
- **I3 (fixed): the bundled-copy count was wrong.** `finalise-dod-security-prompt.md` has three copies (finalise, qa-story, qa-task), not four; `review-security` carries the engine only. `probe-boundary-rule.md` (qa-story, qa-task) and `security-review-prompt.md` (review-security) also bundle. Defined by command in § 7; measured 10 files on 2026-11-03.

### Optional

- O1: the "one helper" criterion is asserted by a structural test (source text). That proves a string, not a behaviour. The new mutation (inline spawn in the `cli:` arm) holds the behaviour; the structural test stays as a second line.
- O2: line numbers in the task are from the tree at writing and will move; each is paired with an identifier, which is enough.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases are specific, ordered, and Phase 2 sequences "green, extract, green, then add the `cli:` call", which is the right guard for the refactor. Effort 8h is in line with the rubric.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT.

- Checks 10 and 11 (outcome reachability, invariant): "a failing setup is `errored`, never `rejected`" matches the shell-argv block, which calls `errored(...)` and `continue`. The criterion that the T252 plan "executes at least one probe" is reachable once the setup runs; the task correctly refuses to promise the clean-control verdict.
- Check 14 (call-site population): not triggered; the task enumerates no engine call sites.
- Check 15 (removed-literal sweep): the message `--fixture-setup applies to the shell-argv: entry form only` appears in the engine (`:1740`, `:4494`) and one test (`:6043`). The test is listed. No other test or doc pins it.
- Check 18 (test reach): the test file already exists and runs under `npm test`.
- Criteria classification: every behaviour criterion names a test; the proof-run criterion names the QA report as its record; no criterion is only met after merge.
- Control case present (§ 8).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The sandbox-escape and refactor risks are rated and mitigated; rollback matches the phases. I1 raises the sandbox risk's likelihood slightly (the helper is not a pure extraction); the added sibling-case test is the mitigation.

---

## Pre-pass

Run inline, not by subagents (independence not available in this orchestrator step; the reviewer is the same context that read the code). `prepass-axes.js` not run; architecture alignment judged directly: no architecture claims in the task beyond the engine's own structure, which was read.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 3, all applied

1. Constrain the shared helper to work without `harnessDir` (I1).
2. List every documentation site by search, add `security-review-prompt.md` (I2).
3. Correct the bundled-copy counts (I3).

### Consider (Optional) - 2

1. Tracker linkage (`/sync-github-task`).
2. Treat the structural "one helper" test as secondary to the mutation.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after fixes)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The diagnosis and the plan match the code; the one design gap (the spawn's `harnessDir`) and the documentation site list are now recorded in the task, so the developer meets neither as a surprise.

---

## Next Steps

Task is ready. Develop phase by phase; run the shell-argv setup tests green before and after the extraction; mutation-prove each fix.

---

## Review Metadata

- **Reviewer:** review-task (inside develop-task, Step 2)
- **Review Date:** 2026-11-03
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.254.probe-engine-cli-fixture-setup/task.254.probe-engine-cli-fixture-setup.md
- **Architecture Docs Consulted:** none required (engine-internal task); `shared/resources/security-probe.mjs`, `security-input-corpus.mjs`, the prompt and boundary-rule docs read directly
