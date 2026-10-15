# Implementation Report: Doc-id engine and PRD registry

**Task**: `task.202.doc-id-engine-and-prd-registry.md`
**Run Number**: 1
**Started**: 2026-10-15 05:34
**Status**: In Progress

---

## Summary

First pipeline run for task 202: ship `shared/resources/doc-id.js` (hierarchical doc-id engine + CLI), a `prd` kind in `parseRegistry`, and the PRD registry standard plus updated naming standards. Dispatched autonomously by `/develop-next` (roadmap item T202).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (work-started: transitioned; comment posted on #645)        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.202.*` exists in git                             | Branch created at `3b8d4026` | —                    | 2026-10-15T03:34Z |
| 2. review-task             | ✅ Done | `task.202.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10; 3 Important fixed; Planned → Ready for Development | —                    | 2026-10-15T03:38Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan file + surface map); 1 iteration; audit 14/14, ready-for-review @ b0ec491a; ci:fast 5542 pass | —                    | 2026-10-15T03:51Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #667: https://github.com/Gamaroff/agent-skills/pull/667 | —                    | 2026-10-15T03:52Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.202.qa.{N}.*.md`; `task.202.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 6 cycles (5 + 2 granted, 1 used); gate.6 PASS 100; 5c APPROVE (pr-review.1) | —                    | 2026-10-15T05:24Z |
| 7. finalise                | ⏳ Pending | `task.202.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-15

- Feature branch base: develop — source: recommended (`--defaults`, develop-next autonomous run)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (Phase 0 run inline: risk_level=medium → risk_ok=false; 3 phases; single_module=false)
- Skips: none — refused: none
- Upfront questions asked: 0 (`--defaults`, no conflicts)
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: Planned — Step 2 `/review-task` will validate and promote
- Always-load files resolved: 3 files — from skills-config.yaml `devLoadAlwaysFiles`
- Branch: `feature/task.202.doc-id-engine-and-prd-registry` from `develop` @ 3b8d4026, pushed. Implementation report stashed before branch creation, restored after
- GitHub board: work-started → transitioned (In Progress). Tracker comment: posted. Priority default block not run (task frontmatter already carries Priority: Medium)
- review-task invoked (status Planned, no prior report). Auto-answers: output = Comprehensive report; Step 8.5 = Yes, apply all critical + important fixes; Step 9 = Yes, fixes complete
- Review report: docs/tasks/task.202.doc-id-engine-and-prd-registry/task.202.review.1.doc-id-engine-and-prd-registry.md (reviewed_blob stamped)
- Pre-pass: Agent B drift (prepass-axes source: architecture), Agent C not-implemented
- Planned promoted to Ready for Development by review-task. Fixes: coding-standards.md § Registries in scope; non-canonical artifact classification + agreement test; timing criterion records uptime + head commit
- Tracker key re-read after review: 645 (unchanged)
- Review outcome comment skipped — review-task reported posted
- Pre-develop surface map: 20 files identified in shared/resources (engine, tests, fixtures), skills/develop-next (select-next.mjs + unit suite), docs/standards, docs/architecture/concepts — key guards: stdout-drain-on-exit (use process.exitCode), prettier, work-item-artifact-naming (task rows untouched); parseRegistry checks hrefs in two places (title link + resolveDocCell)
- Plan file found: docs/tasks/task.202.doc-id-engine-and-prd-registry/task.202.plan.doc-id-engine-and-prd-registry.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the co-located plan names every hunk (grammar as code, check-reason table, CLI contract, select-next edits) and the surface map was in hand
- Fast gate precondition: develop.fastGateCommand unset → suggested `npm run ci:fast`, which this project defines
- parseRegistry: `isPrdHref` added beside `isWorkItemHref` (not a widening); `resolveDocCell` takes the row predicate as an optional third argument so the document-column path is scoped to the kind too
- Non-canonical artifacts (dated, slug-before-keyword, seq-less) parse as artifacts with `seq: null, canonical: false`; agreement with WORK_ITEM_ARTIFACT_RE / isWorkItemDocument verified over every tracked task/bug filename
- `next()` returns `{ok, reason, next}`; `nextNumber()` returns the number and throws an Error carrying `.reason` (the success criterion `nextNumber("story", …) === 4` needs a bare number)
- `checkCorpus` adds `root-missing` (exit 1) beside `empty` (exit 0): a missing root is a claim about the instrument, not an empty tree
- PRD registry rows are read in doc-id.js by a minimal number-column reader, not parseRegistry: doc-id.js is CommonJS and the selector is ESM
- Mutation proof (each `check` branch removed in turn, `node --test shared/resources/tests/doc-id.test.mjs`): bad-shape → 3 red; dir-stem-mismatch → 2; frontmatter-mismatch → 3; parent-missing → 3; parent-number-mismatch → first mutation survived (it removed only the P half by operator precedence — `false && a || b`), which exposed that the P half had no test; test added, full-branch mutation → 3 red; unregistered → 2; registry-missing → 2; duplicate-id → 2
- Timing (pre-commit, base 3b8d4026): `time node shared/resources/doc-id.js check --corpus --json` over docs/prd → real 0.031s, `uptime` load average 1.25, 1.24, 1.08; 29 documents, 29 `bad-shape` (the unmigrated legacy tree — expected until task 203). Re-measure on the PR head before finalise
- Fast gate (`npm run ci:fast`, `.agents/skills` symlink moved aside): TEST_EXIT=0, 5542 tests, 0 failures. Also `npm run bundle:check` (0 problems) and `npm run check:generated` (clean)
- Loop audit iter 1: status ready-for-review, 14/14 phase items, last commit b0ec491a → exit loop
- Development completion comment posted to github issue 645
- Step 4 scope: work-item dir + 24 changed-code paths (`.claude/state/step4-scope-paths.txt`); everything except the report update was already committed in Step 3, so the Step 4 commit carried the report only — no leak possible
- PR body written inline from the committed diff (the author had the full change set in context) rather than via the pr-body-summariser subagent
- PR #667: https://github.com/Gamaroff/agent-skills/pull/667 (base develop, Closes #645). Tracker comment (in-review): posted
- GitHub board: in-review → stage-disabled (no `pipeline.in-review` mapping)
- Post-PR state check (inline `gh pr view`, not the poller subagent): PR #667 state = OPEN, head c58dde41. errors = 0
- QA start: board re-assert in-review → stage-disabled. Traceability mapper skipped: no Success Criteria table (criteria are checkbox lists), Phase 0 run inline
- QA cycle 1: /qa-task (code_review_blocking=true) → CONCERNS 60/100; security probe on doc-id.js#parse measured (27 executed, present-but-inert on docid.huge-number); PR comment + tracker comment (qa-gate-1: posted)
- QA Cycle 1 — changes-requested: stage-disabled. qa-fix ran inline on the findings summary 5a had just produced (same session wrote the gate), not via the findings-ingester subagent
- CR-1 decision (autonomous; two options offered): reword the claim rather than persist a high-water mark — a counter per PRD/epic would add frontmatter state outside this task's scope. The task document's own §3 sentence ("a deleted story's number is not handed out again") overstates the same way; it is the requirement text, which qa-fix may not edit, so it is noted here for /finalise
- QA Cycle 1 post-fix: PR comment + tracker comment (qa-fix-1: posted); PR #667 state OPEN
- QA cycle 2: refute pass over the whole branch → CONCERNS 60/100; security probe engages (30 executed; case docid.unsafe-seq re-specified hostile → legitimate — it classifies as a non-canonical artifact with seq null, the documented grammar). QA-1 found by QA, not the reviewer: check --corpus documents 29 → 34 after cycle-1 CR-10
- QA Cycle 2 — changes-requested: stage-disabled. Narrowing residue — every MEDIUM on gates 1 and 2 names shared/resources/doc-id.js; HIGH 0 on both. Move: consolidate (registry reader → selector parity; frontmatter reader replaced)
- CR-8 resolved by parity rather than CommonMark fence lengths: both readers must give one answer; a fence-length fix belongs to the selector as a follow-up
- QA cycle 3: scoped to the 5 files changed since gate 2's head → CONCERNS 90/100; probe engages (30); route classifier: continue (not-a-pass-gate); convergence check not tripped (HIGH 0, 0, 0). Narrowing residue offered again (gates 2 and 3); move: patch — distinct edge cases in readers already consolidated
- QA Cycle 3 — changes-requested: stage-disabled. Post-fix: PR + tracker comments (qa-fix-3: posted)
- QA cycle 4: scoped (2 files since gate 3) → CONCERNS 90/100; the reviewer checked the whole tracked tree (5808 files parse/parseLegacy old vs new; 568 frontmatter blocks vs PyYAML); probe engages (30); route continue (not-a-pass-gate); HIGH 0×4. Note for task 203: 7 legacy `story.*.validate.<date>.md` files in docs/prd do not parse — `validate` is not in the artifact vocabulary (pre-existing, unchanged by this task)
- QA Cycle 4 — changes-requested: stage-disabled. Post-fix comments: qa-fix-4 posted
- Resume after QA loop limit (operator approved 'go ahead' with the recommended grant): develop-next run state halted → false; PR #667 OPEN, nothing to reconcile. Phase 0b: QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk (grant-qa-cycles.sh: QA_CYCLE=5, qa_max_cycles=7, lock restored from the halt snapshot, reenter at 5a)
- QA cycle 6 (granted): scoped review, 0 findings → PASS 100/100; probe engages (30). Gate committed and pushed (a3ef6bca) before 5c
- Step 5c: /review-pr --effort medium --comment --no-code → APPROVE (PC-1, PC-2 low); report staged for the acceptance commit; PR summary comment posted; ready-for-merge signalled
- Step 7: /finalise → GAPS (DoD file task.202.dod.1…; gaps PR comment posted). The gaps comment's lead was given count=2 (the two gaps) rather than the block's checkbox count, which also counted the 3 Next Steps boxes

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 7 /finalise — DoD gaps (2), both documentation-only: (1) AC6 — the `check --corpus` timing was recorded on 8103737b, not on the PR head a3ef6bca, and the implementation report carries only the base-commit figure; (2) Docs — `CHANGELOG.md [Unreleased]` has no `(task 202)` entry (the changelog-entry-drift test would fail CI after merge). AC, security (30 probes, 0 reproduced), compliance (N/A) otherwise pass; CI SUCCESS on a3ef6bca. Fix-and-recheck (8a) not applicable: two sections failed. Resume at Step 7 after the doc-only fix (no QA re-entry)

### QA Loop Limit Reached — 2026-10-15

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (90/100), gate 5 — read head 5fbf970b; cycle 5's fix 0399f61f has not been gated
**HIGH findings per cycle**: 0, 0, 0, 0, 0 — no blocker at any cycle
**MEDIUM findings per cycle**: 4, 4, 1, 1, 1 — fell, then flat at 1 from cycle 3
**Remaining issues** (from final gate file):
- CR-1 — parseLegacy accepted new-scheme sub-story artifacts (`story.1.2.3A.*`) as legacy — medium — `shared/resources/doc-id.js`. **Fixed in 0399f61f** (mutation-proven, fast gate green) but not re-reviewed: the budget ended on the fix

**What was attempted per cycle**:
- Cycle 1: 8 gate findings + 3 advisory (safe integers, round-trip format, fail-closed CLI paths, registry fence/table rows, counter validity, trailing YAML comments) — e096933d
- Cycle 2: 8 gate findings + 4 advisory; structural move on the narrowing-residue offer: registry reader consolidated with the selector's parseRegistry rules (parity test), frontmatter reader replaced with a linear line reader — 5e822832 (fast gate red twice on one test, committed unpushed per the 2-attempt bound)
- Cycle 3: parseLegacy full-stem guard, closed-frontmatter rule, unreadable registry in next prd — 1254d308
- Cycle 4: the cycle-3 guard moved from the shared path to parseLegacy only; parseLegacy refuses a digit-first remainder — 5fbf970b
- Cycle 5: the digit-first refusal widened to the sub-story suffix — 0399f61f
- Route 2c (gate-the-last-fix half-cycle) considered and declined: `medium-not-falling` (MEDIUM 1, 1, 1 over cycles 3–5)

**Likely root cause**: not a stall in the deliverable. Each gate from cycle 2 on found one or two edge cases in a hand-written grammar (`doc-id.js`'s legacy/new-scheme boundary and its two readers), several of them introduced by the previous cycle's fix — the narrowing-residue shape on one file at HIGH 0. The single remaining finding is already fixed on the head; the loop budget ended one gate before it could be read. The legacy/new-scheme boundary is inherently ambiguous by name alone (the task says task 203 decides "legacy" from frontmatter), which is why parseLegacy kept attracting edge cases.

**Recommended next steps**:
1. Grant one more QA cycle (re-run `/develop-task` — Phase 0b offers "Resume at 5a with {k} more cycles", recommended k = 2) so a gate reads 0399f61f; the expected outcome is a clean gate, then 5c and finalise
2. Or accept the current state via option 2 of the HALT message: `/review-pr --effort medium --comment --no-code`, then `/finalise`
3. For task 203: decide whether parseLegacy should exist as a name parser at all, or whether "legacy" is decided only by the missing `prd_number` frontmatter (the task's own rule) — the latter removes the boundary every late finding sat on

- QA cycle 2 fast gate: attempt 1's log was deleted before it was read (orchestrator slip — the protocol retains a red log); the failing test was identified on attempt 2 as `tests/load-sensitive-marker.test.js` direction C and fixed. Committed without pushing per the 2-attempt bound; the next cycle's push carries it

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: 8 open — PROBE-1 (huge number parses with precision loss), CR-1 (tail-deleted number reused), CR-2 (next under a missing parent), CR-3 (format accepts non-canonical parts) medium; CR-5–CR-8 low. Advisory: CR-4, CR-9, CR-10
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: all 8 gate findings (PROBE-1, CR-1–3, CR-5–8) plus advisory CR-4, CR-9, CR-10; 11 regression tests, each mutation-proven (revert → its own test red); CR-1 resolved by correcting the never-reuse claim in epic-documents.md and prd-registry.md (gaps never refilled; a tail-deleted epic/story number is freed — no counter). Fast gate: ci:fast 5553 tests, 0 failures
**Commit**: `e096933d`

### QA Cycle 2 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: 8 open — QA-1 (sprint-review-summary read as a document — regression from cycle-1 CR-10), CR-1 (allocator reads an unreadable directory as empty), CR-2 (registry reader disagrees with the selector), CR-3 (format rejects string-number parts) medium; CR-4, CR-5, CR-6, CR-8 low. Advisory: CR-7, CR-9, CR-10, CR-11
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: all 8 gate findings plus advisory CR-7, CR-9, CR-10, CR-11; registry reader consolidated with the selector's parseRegistry rules (parity test, 8 inputs); frontmatter reader replaced with a linear line reader; 10 tests, 9 fixes mutation-proven (CR-6 timing test not mutated — not-run). Fast gate: attempt 1 red on 1 test (log deleted before reading — not identified), attempt 2 red on 1 test (`tests/load-sensitive-marker.test.js` direction C: the new timing test lacked the loadSensitive marker); fixed, targeted re-run green; committed without pushing per the 2-attempt bound
**Commit**: `5e822832` (not pushed)

### QA Cycle 3 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: 2 open — CR-1 (parseLegacy reads new-scheme full-stem artifacts as legacy) medium; CR-3 (next prd: unreadable registry reported as missing) low. Advisory: CR-2, CR-4, CR-5
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: CR-1, CR-3 plus advisory CR-2, CR-4, CR-5; 4 tests, each mutation-proven. Fast gate: ci:fast 5567 tests, 0 failures (attempt 1)
**Commit**: `1254d308` (pushed, carrying 5e822832)

### QA Cycle 4 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: 1 open — CR-1 (cycle 3's docSlug guard in the shared path blocks digit-first bug/task full-stem reviews in parse()) medium. Advisory: CR-2
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: CR-1 (guard moved to the parseLegacy path) and advisory CR-2 (parseLegacy refuses a digit-first remainder); 2 tests, each mutation-proven. Fast gate: ci:fast 5569 tests, 0 failures
**Commit**: `5fbf970b`

### QA Cycle 5 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: 1 open — CR-1 (parseLegacy digit-first guard misses the sub-story suffix, story.1.2.3A.*) medium
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: Loop route: continue (medium-not-falling) — MEDIUM reads 1, 1, 1 over cycles 3–5 — route 2c needs it strictly falling, or 0 on the last gate, which is the evidence that one more gate would clear.
**Action**: Escalating — loop limit reached
**Fixes Applied**: CR-1 (guard widened to /^\.\d+[A-Z]?(?:\.|$)/); 3 refusal cases, mutation-proven. Fast gate: ci:fast 5569 tests, 0 failures
**Commit**: `0399f61f` (pushed; no gate has read it)

### QA Cycle 6 — 2026-10-15
**Gate Result**: PASS
**Issues Found**: none
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — task.202.pr-review.1.doc-id-engine-and-prd-registry.md (2 low conformance findings: PC-1 §3 never-reuse wording, PC-2 Completion block)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: {populated at end}
**Final Status**: Escalated — QA loop limit reached (5 cycles, final gate CONCERNS 90/100, HIGH 0 throughout)
**Branch**: feature/task.202.doc-id-engine-and-prd-registry
**PR**: https://github.com/Gamaroff/agent-skills/pull/667
**QA Iterations**: 5
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
