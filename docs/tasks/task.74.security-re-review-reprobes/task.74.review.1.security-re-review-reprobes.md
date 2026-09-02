# Task Review Report: Task 74 — A security re-review must re-probe, not re-read

**Reviewed:** 2026-09-02
**Review Depth:** Standard
**Task Status:** ready-for-development
**Overall Assessment:** GOOD

---

## Executive Summary

> **Implementation Status**: ✅ All 4 recommendations (1 Critical, 3 Important) implemented — 2026-09-02. The 2 Optional items were deliberately not applied; see Optional-1 for the rationale on tracker linkage.

The task is well-structured, well-motivated, and its testing strategy is grounded in fixtures that
actually exist. One finding dominates: **§3's description of the "current architecture" was overtaken
by a commit that landed the same day the task was filed.** `61197c3` (*feat(qa-loop): give the QA loop a
stall guard, and close the traps that fed it*, 2026-09-01, now on `develop`) already gives cycle 2 a
full-branch diff **and** a REFUTE directive in both QA skills. The task's framing — that a re-review
never re-asks the first question — is no longer true for cycle 2.

This narrows the task rather than voiding it. Phases 1, 3 and 4 are wholly unimplemented, and Phase 2
retains a real residual gap: the existing carve-out keys on **cycle number**, not on the **prior gate's
safety state**, so cycle 3+ after a security FAIL is still diff-scoped.

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — defaults applied and logged below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the Critical + Important fixes applied in Step 8.5)

---

## User Decisions & Clarifications

Invoked by `/develop-task` Step 2 in an autonomous `/develop-next` run. No interactive questions were
asked; the pipeline defaults were applied and are recorded here so the substitution is auditable.

| Question point | Auto-answer | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Pipeline audit trail requires the file |
| Step 8.5 — apply fixes | Yes, all critical + important | `/develop` runs next and needs a correct document |
| Step 9 — update status | N/A — already `ready-for-development` | No promotion needed |
| Step 2 check 5 — tracker sync | **Skip — leave unlinked** | Deliberate deviation from the Recommended option, see Optional-1 |

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present (Overview … Rollback Plan), plus Change Log, Progress
Tracking, References and Notes. Filename `task.74.security-re-review-reprobes.md` matches
`task.{number}.{descriptive-name}.md`. No `[TBD]` / `[TODO]` / `???` placeholders. Frontmatter is
OKF-conformant: `type: task` present and non-empty, `description` present, `tags` a YAML list,
`updated` present.

`sign-off` and `change-log` keys are absent from `skills-config.yaml`. Sign-off therefore defaults to
disabled and is not checked; Change Log defaults to enabled and **passes** — the log has the four
canonical columns and one row, and `status: ready-for-development` is consistent with a document whose
newest row is its initial draft, because no review had yet run. This review adds the row.

### Issues

#### Optional
- **[Optional-2]** No Mermaid diagram. Not flagged as a gap: the change is a three-way conditional
  described precisely in prose, and a flowchart would restate the Implementation Plan.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Stale claims detected:** 1 (Critical)

### Issues

#### Critical

- **[Critical-1] §3 "Current architecture" describes code that no longer exists.**
  - **Location:** §3 Technical Background; reinforced by §1 Overview and §2 Motivation.
  - **Issue:** The task quotes `qa-task` Phase 0 step 5 and presents the scoping as unconditional:

    ```bash
    FILES=$(git log --since="$LAST_GATE_DATE" --name-only --format="" | sort -u)
    [ -n "$FILES" ] && git diff "$BASE...HEAD" -- $FILES > "$DIFF_FILE"
    ```

    The live Step 3b block (`skills/qa-task/SKILL.md:299–318`, `skills/qa-story/SKILL.md:770–790`) is a
    **three-way** branch gated on `PRIOR_GATES`:

    | Cycle | `PRIOR_GATES` | Diff | Instruction |
    |---|---|---|---|
    | 1 | 0 | whole branch | ordinary adversarial review |
    | 2 | 1 | **whole branch** | **`REFUTE_PASS=true`** — "find the claim that is FALSE" |
    | 3+ | ≥2 | since last gate | ordinary re-review |

  - **Evidence:** `git log -S "REFUTE PASS" -- skills/qa-task/SKILL.md` → `61197c3`, dated 2026-09-01,
    an ancestor of `origin/develop`. Task 74 was filed the same day and does not mention it — the word
    "refute" appears nowhere in the document.
  - **Why it matters:** §1's claim *"Cycle 2 asks 'were those things fixed?' — and nothing asks the first
    question again"* is the load-bearing sentence of the whole task, and it is now false for cycle 2. An
    implementer reading §3 as the starting state would write a second, conflicting carve-out into the
    same `if`.
  - **Recommendation:** Rewrite §3 to state the real three-way branch, and re-aim the task at the
    residual gap. **Applied in Step 8.5.**

#### Important

- **[Important-1] §2 Motivation attributes the task.67 failure to a cycle that is now covered.**
  - **Location:** §2 Current Problems items 1–3.
  - **Issue:** The measured incident was a *cycle 2* that re-tested 13 findings and looked no further.
    Under `61197c3` that exact cycle now gets a full-branch refute pass. Left as written, the task's
    motivating evidence argues for something already shipped.
  - **Recommendation:** Keep the incident — it is the reason the class is known — but state plainly what
    `61197c3` already fixed and what it did not. The residual gap is twofold: **(a)** cycle 3+ after a
    safety failure is still diff-scoped, and **(b)** even cycle 2's refute directive anchors on *"the
    fixes from the previous QA cycle"*, which is narrower than "search the surface again". **Applied.**

- **[Important-2] §6 Phase 2 would duplicate the existing branch rather than compose with it.**
  - **Location:** §6 Phase 2, bullets 1–2.
  - **Issue:** *"Before the `LAST_GATE_DATE` scoping block, evaluate the trigger … use the full
    `BASE...HEAD` diff"* describes inserting a second, independent full-diff path in front of a block
    that already has one. The result is two conditions computing `DIFF_FILE`, and an undefined
    interaction with `REFUTE_PASS` — which the subagent prompt reads.
  - **Recommendation:** Specify composition explicitly: the trigger becomes an additional disjunct on
    the existing `PRIOR_GATES ≥ 2` guard, and the task must say what `REFUTE_PASS` is set to when the
    safety trigger fires on cycle 3+. **Applied.**

- **[Important-3] §8 Mutation Proving needs a third proof, because the second is now weaker.**
  - **Location:** §8 Mutation Proving.
  - **Issue:** *"Remove the 'search again' instruction → the unscoped diff is produced but the prompt
    still only verifies prior findings"* was decisive when no refute directive existed. It no longer is
    on cycle 2, where `REFUTE_PASS` supplies an adversarial instruction independently — so the mutation
    can pass for a reason unrelated to this task's change.
  - **Recommendation:** Add a proof that isolates the new trigger: remove the safety trigger and confirm
    a **cycle-3** re-review after a `security: FAIL` gate reverts to diff-scoping. **Applied.**

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with a risk level, named files, checkboxed changes, and explicit dependencies forming
a clean chain (1 → 2 → 3 → 4). File paths are specific and correct:

- `shared/resources/qa-re-review-scope.md` — new; the `shared/resources/` location matches this repo's
  single-source-of-truth convention, and `npm run bundle` will propagate it. Verified no such file
  exists today, and no existing shared resource covers re-review scoping.
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — both exist and both carry the rule.
- `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — new; sits beside
  `transition-protocol-parity.test.mjs`, the prior art §Notes cites, which exists.

`estimated_effort_hours: 5` is consistent with the rubric for 4 low/medium phases, 11 success criteria
and one new test file. No divergence flagged.

> **Carried into `/develop`:** `package.json` lists per-skill test globs by hand. A new
> `evals/shared/tests/*.test.mjs` file is covered by the existing `evals/shared` glob, so no
> `package.json` edit should be needed — but Phase 4 must confirm the new test actually runs under
> `npm run ci`, not merely under a direct `node --test` invocation.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- §7 Files Summary matches the files named across §6's phases, including the `npm run bundle`
  regeneration row — correct, since both QA skills carry bundled `references/` copies.
- §9 Success Criteria are individually verifiable and map to phases: Functional → Phases 2–3,
  Regression → Phase 4, Safety → Phases 1 and 3.
- §8 Replay Verification names real fixtures. Verified: `task.67.gate.1.*.yml` carries
  `security: {status: FAIL}` and `task.67.gate.2.*.yml` carries `security: {status: PASS}`. Both are
  committed and readable, so the replay is runnable as specified.
- Scope boundaries are clean — §4 explicitly excludes the DoD-side probe (task.73, already merged) and
  the gate schema.

### Optional

- **[Optional-2]** §8 Contract Tests give the command as `node --test evals/shared/tests/…`. Adding the
  `npm run ci` invocation alongside it would make the Phase 4 "does it actually run in CI" check
  explicit rather than implied.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

High risk (cost of unscoped re-reviews) and both medium risks (trigger too narrow; two copies drift) are
identified with proportionate mitigations. The drift mitigation — put the rule in `shared/resources/` and
assert non-restatement in a contract test — is the pattern this repo already uses for the transition
protocol, and it is the right one.

Rollback is concrete, time-boxed, and has a verification step. The forward-fix option (cap the unscoped
path to the first re-review after a security FAIL) is a genuine alternative, not filler.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. Rewrite §3 to describe the real three-way `PRIOR_GATES` branch introduced by `61197c3`, and re-aim
   the task at the residual gap. — **applied**

### Should Fix (Important) — 3

1. Qualify §2's motivating incident with what `61197c3` already covers. — **applied**
2. Make §6 Phase 2 compose with the existing branch and define `REFUTE_PASS` under the new trigger. — **applied**
3. Add the cycle-3 mutation proof to §8. — **applied**

### Consider (Optional) — 2

1. Tracker linkage — see below. Not applied.
2. Name `npm run ci` alongside `node --test` in §8. Not applied (cosmetic).

---

## Optional-1: Tracker linkage — deliberate deviation from the Recommended default

The task has no `github_issue:` in frontmatter. Step 2 check 5 would normally flag this **Important** and
offer to create one, with "Sync to GitHub" as the Recommended option.

Downgraded to **Optional**, and the sync **skipped**, on evidence: of the five most recent sibling tasks
(67, 72, 73, 75, 76) only **task.72** carries a `github_issue`. The prevailing convention in this repo is
that standalone technical tasks are tracked by the roadmap and the task registry, not by GitHub issues.
Creating one here would be an outward-facing side effect that departs from the convention four of five
neighbours follow, taken unprompted during an autonomous run.

Run `/sync-github-task` on this file if an issue is wanted. Logged, not silently dropped.

---

## Implementation Readiness Assessment

**Score:** 8/10

| Axis | Score | Note |
|---|---|---|
| Template Compliance | 9/10 | All mandatory sections; OKF-conformant; Change Log current |
| Technical Accuracy | 6/10 | Critical-1 — §3 overtaken by `61197c3` (now corrected) |
| Implementation Clarity | 8/10 | Phases specific; Phase 2 needed composition detail (now added) |
| Consistency | 8/10 | Internally coherent; fixtures verified present |
| Risk Management | 9/10 | Risks, mitigations, rollback and forward fix all concrete |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Score ≥ 8 and the single Critical finding was a stale premise, not a design fault —
it has been corrected in place and the task's scope is narrower and more accurate for it. The remaining
work in Phases 1, 3 and 4 is entirely unimplemented, and Phase 2's residual gap is real.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Start at Phase 1 — write `shared/resources/qa-re-review-scope.md` before touching either skill.
2. In Phase 2, **read the live Step 3b block first** (`skills/qa-task/SKILL.md:299`) and extend the
   existing `PRIOR_GATES` conditional rather than inserting a new one ahead of it.
3. Edit `shared/resources/` sources, never the bundled `skills/*/references/` copies — `npm run bundle`
   silently reverts fixes applied only to bundled output.
4. Run `npm run bundle` after Phases 1–3, and confirm in Phase 4 that the new parity test runs under
   `npm run ci`, not only under a direct `node --test`.
5. Execute all three mutation proofs in §8, including the cycle-3 proof added by this review.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, via `/develop-task` Step 2/8 under `/develop-next`)
- **Review Date:** 2026-09-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.74.security-re-review-reprobes/task.74.security-re-review-reprobes.md`
- **Sources consulted:** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `git log -S "REFUTE PASS"`,
  `docs/tasks/task.67.execute-the-skill-qa-gate/task.67.gate.{1,2}.*.yml`, `skills-config.yaml`,
  `shared/resources/`, `evals/shared/tests/`, sibling task frontmatter (67, 72, 73, 75, 76)
