# Task Review Report: Task 111 - One local command that runs every CI lane, and two coverage gaps the sweep found

**Reviewed:** 2026-09-16
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development (promoted by this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-09-16

---

## Executive Summary

The task's intent is right and cheap, but as written it would go red on its first run: the repository already has a test (`evals/shared/tests/ci-gate-parity.test.mjs`) that asserts `expand(ci)` equals the npm scripts of `test.yml`'s `test` job *and nothing else*, in both directions — exactly the composition this task changes. The task did not mention it, though `shellcheck.yml`'s own header comment names that constraint as the reason the lane got a separate workflow. Two of the three factual claims in Motivation also needed correcting: the "develop-story wrappers are tested" claim is false (the cited test stubs the hooks and never executes a wrapper — none of the three pipelines' wrappers is tested), and the 1,024-character cap has no in-repo provenance and a measurement that depends on normalisation. All of this was fixable in the document, and was fixed.

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — pipeline run (`develop-next` → `develop-task`), every prompt auto-answered with the recommended option and recorded below
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run — no interactive questions. Decisions taken by the documented defaults:

- **Output format**: Comprehensive report (pipeline default).
- **Tracker linkage** (`github_issue` absent): Sync to GitHub (recommended option, auto-answered — same decision as tasks 110, 113, 114, 115). Dedup search for `[Task 111]` returned zero matches; issue [#411](https://github.com/Gamaroff/agent-skills/issues/411) created via `ensure-task-github-issue`, added to the *Agent Skills* board, Priority P2, milestone "Technical Tasks (standalone)"; `github_issue: 411` written to frontmatter and the body cross-reference inserted. Estimate field absent on the board — non-blocking.
- **Step 8.5** (apply fixes): Yes, apply all critical + important fixes (pipeline default).
- **Step 9** (promote): Yes, fixes complete (pipeline default; outcome is READY TO IMPLEMENT).
- **Design call the review had to make without a human** — how to reconcile the new `ci` composition with the parity test. Two routes: change the workflows to call the npm scripts (`validate.yml` → `npm run validate:all`, `shellcheck.yml` → `npm run lint:shell`), which the task's own §4 rules out ("any change to what CI runs"); or widen the test to read every green-defining job and map non-npm steps to their local twin by step name. Chose the second — it honours §4, keeps set equality in both directions, and turns a renamed or added CI step into a loud failure. Recorded in the task (Technical Background, Target Architecture, §6 step 2) and the plan (Phase 1b). **If the operator would rather take the first route, it is a one-commit swap and the twin map shrinks to nothing.**

---

## Pre-pass Summaries

Both Explore subagents dispatched in parallel and returned valid YAML (Agent B 26 s, Agent C 24 s).

**PREPASS_B (architecture alignment)** — `alignment: drift`, four `low` findings: (1) coding-standards prescribe the `docker koalaman/shellcheck` fallback where the task loud-skips — folded into the skip message (names the container form); (2) 1,024-char cap vs coding-standards' "~100 words" guidance — different axes (spec cap vs. house style), both kept; (3) shell-source counts differ across docs (56/58/59) — stale docs, out of scope, and the task correctly never hardcodes a count; (4) "five CI lanes" vs six workflows — clarified in §3.

**PREPASS_C (already-implemented)** — `implementation_status: not-implemented`. No `lint:shell` script; `ci` still two lanes; no wrapper test references develop-task/develop-bug; `quick_validate.py` has a word-count warning and no character cap; `releases.md` never names `npm run ci`. Nothing to scope down.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Change Log present with the canonical four columns; Progress Tracking and References present.
- Filename `task.111.local-ci-parity.md` ✅. Frontmatter: `type: task` ✅, `description` ✅, `tags` is a list ✅, `updated` ✅. Status `Planned`, priority `Medium`, `estimated_effort_hours: 4` ✅.
- No placeholders.
- Sign-off: `sign-off.enabled` absent from `skills-config.yaml` → not checked. Change Log: `change-log` block absent → default advisory; newest row consistent with `planned` ✅.
- Tracker linkage: absent at review start → **Important** gap → resolved during review (issue #411, see decisions).
- Card preflight (`sync-jira-task.js --check-card`): exit 0 before and after the fixes. Summary 170 chars (+1 omitted), Success Criteria 533 chars (+1 omitted after the sixth criterion was added), Breaking Changes 92 chars (+1 omitted).

### Issues

#### Important
- **No tracker issue linked** — `github_issue:` absent. → Resolved: #411 created and written back.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 invented technologies; 2 inaccurate claims about existing code.

### Issues

#### Critical
- **The task's headline change breaks an existing test the task does not mention.** `evals/shared/tests/ci-gate-parity.test.mjs` reads `test.yml`'s `test` job only (its `jobBlock` comment says so deliberately) and asserts `deepEqual(sorted(expand("ci")), sorted(workflowScripts()))`. With `ci` recomposed as in §3/§6, the composite would contain `validate:all`, `bundle:check` and `lint:shell`, none of which the `test` job runs → red on the first `npm test`. `shellcheck.yml`'s header records this exact constraint as why the lane is its own workflow. Neither the task nor the plan named it.
  - **Location:** §3 Target Architecture, §6 step 2, plan Phase 1.
  - **Fix applied:** Technical Background now names the test and its scope; Target Architecture specifies widening it to every green-defining job (`test.yml:test`, `validate.yml:validate`, `shellcheck.yml:shellcheck`) with a `LANE_TWINS` step-name→script map, a `SETUP_STEPS` list, declared exclusions with reasons, and the rule that an unclassified step fails; plan Phase 1b gives the shape; §6 orders it before the recomposition; success criterion 6 and a mutation in §8 cover it; §4 and §7 updated.

#### Important
- **"develop-story's identical wrappers are covered by `install-hooks-behavior.test.mjs`" is false.** That test runs the *shared installer* against a sandbox in which `on-stop.sh`/`on-precompact.sh` are stubs it writes itself; no wrapper under `skills/develop-*/scripts/` is executed by any test. All three sets are byte-identical (`diff -q` empty) and all three are untested. The gap is real and larger than stated; the proposed remedy ("generalise the existing test") would have inherited the same blind spot.
  - **Fix applied:** Motivation #2, Technical Background, Target Architecture, §6 step 3, §7 and the plan's Phase 2 now describe a new shared test (`evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs`, glob already in `npm test`) that enumerates the population from the tree (floor 3 × 3) and behaviourally proves argv, stdin and exit-status pass-through against a stub `exec` target.
- **The 1,024-character cap has no provenance and its measurement was under-specified.** Nothing in the repository states the cap (it is the Agent Skills spec's limit on `description`), and the task's "1,027" is neither the raw length (1,029) nor the normalised length `quick_validate.py` would check (1,025). `sync-jira-bug` sits at 1,023 — one character from the cap — and was not mentioned.
  - **Fix applied:** Motivation #3 cites the spec, pins the measure to the normalised string, and records both lengths; §6 step 4 asks for a trim with margin and names sync-jira-bug as the next to drift; the failure message names the spec.
- **`lint:shell` as an inline package.json one-liner drops the lane's two guards and is not itself lintable.** The plan's `git ls-files … | xargs shellcheck` has no ≥200/empty guard (the workflow's protection against the bundled copies leaking in, which the task's own Technical Background lists as a feature to reproduce) and `xargs` on an empty list is implementation-dependent.
  - **Fix applied:** `scripts/lint-shell.sh` with both guards, the identical list expression and severity, and a skip message that names the container form (PREPASS_B finding 1); `lint:shell` = `bash scripts/lint-shell.sh`; workflow gets a comment-only twin pointer.

#### Optional
- `PATH=/usr/bin npm run lint:shell` (§8) cannot run — `npm` is not on that PATH. → Rewritten as `PATH=/usr/bin:/bin bash scripts/lint-shell.sh`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

- Five steps, each with files, changes and an order; dependencies made explicit (parity test before recomposition).
- Effort: `estimated_effort_hours: 4`. Rubric: 6 success criteria, 5 plan steps, low risk → ~4–5h; the added parity-test work is the one item that could push it to 5. Within tolerance; not flagged.

### Issues

#### Important
- **`validate.yml` has five gate steps; the task mirrored two.** The catalog and skill-dependency drift checks have no local counterpart at all (the pre-commit hook only re-bundles), so "every lane" was not true even on the task's own terms.
  - **Fix applied:** `check:generated` added (the exact shape of CI's two steps); the regenerate-and-diff bundle step is a *declared* exclusion with its reason rather than an unmentioned one.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Overview ↔ Target Architecture ↔ §6 ↔ §7 ↔ §9 now agree on the lane list (`check:generated` appears in all five).
- Success criteria are each measurable; a sixth was added for the parity test. Criterion 3's "126 skills" was a stale count (128 today) → made count-free.
- Testing Strategy names a mutation per new check, including the parity test in both directions.
- Scope: five small, loosely-coupled changes; no split warranted.

#### Optional
- "Five CI lanes" is now defined in §3 (the five workflows the release checklist lists; the aggregate mirrors three and says which two it does not).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Low risk is right: script composition and additive tests. The review added the second judgement call (the twin map is a second enumeration of CI's steps — accepted because it is keyed on step names the test asserts exist, so drift is loud).
- Rollback: revert `package.json`; the tests and the cap can stay. Still true; the widened parity test would need `ci` reverted with it — noted implicitly by "revert package.json".

#### Optional
- Docs (`coding-standards.md`, `CONTRIBUTING.md`) carry stale shell-source counts (56 vs 59 today). Out of scope; the task correctly avoids hardcoding one.

---

## 6. Mermaid Diagrams

None present; none needed — the change is a script list and three tests, and the prose carries it.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue
1. Reconcile the `ci` recomposition with `ci-gate-parity.test.mjs` by widening the test to all green-defining jobs — **applied** to task + plan.

### Should Fix (Important) - 3 issues
1. Correct the wrapper-test claim; specify a new tree-enumerated behavioural test — **applied**.
2. Pin the description cap's provenance and measure — **applied**.
3. Make `lint:shell` a guarded script; add `check:generated` so the validate lane is actually mirrored — **applied**.
4. Link a tracker issue — **applied** (#411).

### Consider (Optional) - 3 items
1. §8 mutation command for the absent-binary case — **applied**.
2. Define "five lanes" — **applied**.
3. Stale shell-source counts in two docs — left; out of scope.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**
- Template Compliance: 9/10 (tracker linkage was missing; resolved)
- Technical Accuracy: 7/10 (one unmentioned breaking interaction, two inaccurate claims — all corrected)
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every finding was a documentation defect with a determinate fix, and every fix is in the task now; the one design decision taken without a human (widen the test rather than change CI) is recorded with its alternative so it can be reversed in one commit.

---

## Next Steps

Task is ready for implementation. Developer should:
1. Follow §6 in order — the parity test widening (Phase 1b) before recomposing `ci`.
2. Record each §8 mutation's failing test name in the implementation report.
3. Check off Progress Tracking as phases land.

---

## Review Metadata

- **Reviewer:** Claude (review-task, dispatched by develop-task Step 2 under develop-next)
- **Review Date:** 2026-09-16
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.111.local-ci-parity/task.111.local-ci-parity.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md` (via Agent B)
- **Sources Verified In-line:** `package.json`, `.github/workflows/{test,validate,shellcheck}.yml`, `evals/shared/tests/ci-gate-parity.test.mjs`, `evals/develop-story/protocol/install-hooks-behavior.test.mjs`, `skills/develop-{story,task,bug}/scripts/*.sh`, `skills/create-skill/scripts/quick_validate.py`, `.githooks/pre-commit`, `docs/contributing/releases.md`, `docs/contributing/evals/README.md`, description lengths of all 128 `SKILL.md` files
- **Subagents:** Pre-pass B and C dispatched (Explore, parallel); both returned within budget
