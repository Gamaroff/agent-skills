# QA Report: Task 100 - the false-RED mirror in mutation-proving

**Task**: [Link to task document](./task.100.mutation-proving-false-red.md)
**Gate File**: [task.100.gate.1.mutation-proving-false-red.yml](./task.100.gate.1.mutation-proving-false-red.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Testing Completed**: 2026-09-10
**Gate Status**: CONCERNS

---

## Executive Summary

The deliverable does what the task set out to do: all four success criteria that concern *content* are met, including the discriminating one (SC4, row 5), and the change is verifiably additive. One finding blocks a clean PASS — the section makes an unqualified quantitative claim ("The three cost about twenty seconds") that **does not hold**, and this is precisely the claim the task's own §8 nominated for checking. A document whose subject is *do not record a measurement you did not take* should not ship an unmeasured number.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix MED-1, then merge.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented — task declares None, and the diff confirms it
- [x] Code on feature branch with open PR (#369, OPEN)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast`, `npm run eval:all`)
- [x] Regression Testing (full suite + full eval tier)
- [x] Code Review (Step 3b — diff review)
- [x] Documented-command execution (Step 4b — snippet engine)
- [ ] Performance Testing — n/a, no runtime code
- [ ] Manual Testing — n/a

### Review Methodology

Direct tools. **Adaptive strategy override: session policy bars subagent dispatch — the Step 3b diff review and the Phase 1.5-equivalent scans were performed inline by reading the diff directly rather than via an Explore subagent.** This is a 4-phase, single-module, low-risk documentation change; the whole change set is one file plus six mechanical regenerations, so the diff is small enough to read in full, which is what a direct pass does anyway.

First review — no prior gate, so `REFUTE_PASS=false` and `SAFETY_REPROBE=false`. Scope: whole branch diff (`origin/develop...HEAD`), 11 files.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1 — section + four-row table | PASS | Verified | `## When the proof goes red for the WRONG reason` at L85, table L103–108. Placed between `## When the proof does not go red` and `## When to do it`, as specified. Signals match SC1's four labels verbatim. |
| Phase 2 — three mechanical checks | PASS with concern | Verified | Present and correctly ordered (L122–132) with a copyable block. The **cost claim attached to them is wrong** — see MED-1. |
| Phase 2b — the row-5 judgement | PASS | Verified | L149–180. Labelled a judgement, carries no time claim, includes the mangled-shell-variable diff, and states explicitly that the edit **passes the applied-check**. |
| Phase 3 — bundle | PASS | Verified | All six `skills/*/references/mutation-proving.md` regenerated. Each differs from the source by exactly one line — the `AUTO-GENERATED` banner — confirming a clean regeneration and no hand-edit. |

**Overall Phase Completion**: 4/4 phases passed.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status |
| - | --------- | ------ | ------ | ------ |
| SC1 | Reader can classify a red run from the table alone | 4 named classes | 4 rows, signals in bold: *a real kill*, *environmental refusal*, *invocation error*, *wrong thing mutated* | PASS |
| SC2 | Procedure states all four checks + "proves nothing in either direction" | Both | Checks 1–3 at L122–132, judgement at L149; the "in either direction" sentence at L119–120 | PASS |
| SC3 | Says a false RED is worse than a false GREEN, and why | Stated plainly | L92–97 — "certifies coverage that was never exercised, while looking exactly like diligence" | PASS |
| SC4 | Row 5 explicit **and** stated to pass the applied-check | Both | L158–180; the load-bearing sentence **"That edit passes the applied-check."** at L171 | PASS |
| SC5 | Existing false-GREEN material unchanged | Unchanged | 98 insertions, 1 deletion. The single deletion is the frontmatter `description`, whose original text survives **verbatim** with one clause appended | PASS — see ruling below |

### Ruling on SC5 and the `description` edit

The pipeline explicitly asked for this to be adjudicated. **It satisfies SC5.**

SC5 protects the *false-GREEN material* — the procedure, the three-row table, the six shapes, `## Do not claim it unless you did it`. All are byte-identical. The `description` is frontmatter, not material, and the original sentence enumerating "the three things an unheld proof can mean" is preserved word for word; the change is an appended clause. §4 Scope lists the frontmatter neither in nor out, and the developer recorded the call rather than burying it.

The reasoning offered — that `description` is the auto-activation signal, so a document whose new half is absent from it is undiscoverable by the mechanism the repo relies on — is sound and matches `coding-standards.md` ("the most-read line of any skill"). Left in place.

### Code Quality Criteria

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| Full hermetic suite | 0 failures | 3023 tests, 3022 pass, **0 fail**, 1 pre-existing skip | PASS |
| Eval tier (`npm run eval:all`) | exit 0 | exit 0 — all replay scenarios passed | PASS |
| Formatting (`prettier --check`) | clean | clean across all 11 changed files | PASS |
| Documented-command execution (Step 4b) | no execution failures | 3 blocks, 0 findings | PASS |
| Bundle integrity | 6/6 regenerated | 6/6, each source+banner only | PASS |

> Running `eval:all` here rather than leaving it to the merge gate is deliberate. It is the tier that has previously let a task reach `accepted` and then go red in CI, so it is worth its cost inside the QA cycle where a failure is still cheap.

---

## Breaking Changes Validation

Task declares **None**. Verified against the diff: 98 insertions and 1 deletion, the deletion being an extended (not truncated) frontmatter line. No heading was renamed, moved or removed, so no consumer reference into this document can break. **PASS — no migration path required.**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**MED-1: the section's stated cost is an unmeasured constant, and it is wrong in both directions**

- **Severity**: MEDIUM
- **Category**: Quality (accuracy of shipped guidance)
- **File**: `shared/resources/mutation-proving.md:145`
- **Observation**: the section asserts *"The three cost about twenty seconds."* The three mechanical checks are, by the section's own definition, **two full runs of the matrix command plus one `diff`** — check 1 is a baseline run, check 2 is a known-bad mutation run. Their cost is therefore a multiple of whatever that command costs, not a constant. Measured in this repository:

  | Matrix command | One run | Three checks (≈2 runs + diff) | vs. the claim |
  | -------------- | ------- | ----------------------------- | ------------- |
  | `npm test` (whole suite) | 53,966 ms | ≈108 s | **~5× too fast** |
  | `node --test tests/skill-protocol.test.js` (scoped) | 294 ms | ≈0.6 s | **~33× too slow** |

- **Impact**: two-fold, and the second is the one that matters. (a) A reader on a slow suite finds the rule five times more expensive than advertised — which is exactly the "expensive enough to feel like a detour" outcome the sentence was written to forestall, so the claim undermines its own argument. (b) More seriously, this is a **false measurement claim in the document that exists to stop false measurement claims**. §8 of the task nominated this specific number for checking, and the same document ends with `## Do not claim it unless you did it`.
- **Recommendation**: replace the wall-clock constant with the unit that actually scales, and make the cheapness argument relative to the matrix rather than absolute — a matrix of N mutations already costs N runs of that command, so validating the probe adds **two more runs and a diff**, i.e. `2/N` overhead. That is true at any suite size, it is checkable, and it is a stronger argument than a number. Per §8, the judgement (check 4) must still carry no time claim.
- **Priority**: P2

### LOW Severity Issues (2)

**LOW-1: `Step 2` is ambiguous inside a section that has its own item 2.**
`shared/resources/mutation-proving.md:171,174` — "so step 2 is satisfied" and "Step 2's `diff` closes the …" refer to step 2 of `## The procedure`, but they sit inside `### Validate the probe…`, whose own numbered item 2 is *"One known-bad mutation goes RED"*. Item 3 gets this right ("the `diff` from step 2 of the procedure"); L171 and L174 drop the qualifier. Two words fixes it.

**LOW-2: frontmatter `description` is now 95 words.**
`coding-standards.md` asks for "under ~100 words". Still inside the guidance, so no action is required — recorded because it means the next addition to this description has roughly five words of headroom, not because anything is wrong now.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

Not applicable in the runtime sense: the change ships no executable code. The one performance-adjacent property is the document's own length — 220 → 317 lines, and it is loaded into six skills' context on demand rather than always, so the cost lands only where the file is actually read.

### Reliability — PASS

Purely additive, and the rollback plan (delete the section, `npm run bundle`) is verified feasible by the same mechanism the change used. No heading was renamed or removed, so no inbound reference can dangle.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- The change introduces no code, no credential handling and no new command that anything executes — the snippet engine refused all three bash blocks as `mutating` and ran none. This verdict was reached by reading the diff and by reading the engine's classification output, not by executing hostile candidates, so it is recorded as `reasoned` rather than `measured`. Per `qa-gate-security-evidence.md` that is the accurate value here, not a failing grade.

### Maintainability — CONCERNS

The section is well-placed, mirrors the structure of the one it complements, and the six bundled copies are provably clean regenerations. **The concern is MED-1**: a shipped reference document that carries an unverified quantitative claim loses authority faster than one that is merely incomplete, and this document's closing section is an argument against exactly that. Resolving MED-1 clears this axis.

---

## Code Review

Step 3b, performed inline over the whole-branch diff (11 files, +1080/−30).

**Correctness bugs (0):** none. There is no executable code in the change set. The three fenced bash blocks were classified and refused by the snippet engine rather than assumed safe.

**Cleanups (2):**

- `shared/resources/mutation-proving.md:171,174` — the `Step 2` referent ambiguity (LOW-1).
- `shared/resources/mutation-proving.md:145` — the cost claim (MED-1); recorded here as well as in Issues Found because it originates in the prose, not in a criterion.

**Rendering check** (the failure mode particular to this diff): the numbered procedure runs `1.`–`3.`, is interrupted by a paragraph and a fenced block, then resumes at `4.`. Under CommonMark this starts a new ordered list whose `start` attribute is 4, so GitHub renders it as "4." rather than restarting at 1. Verified against the spec rather than assumed, because a silently-renumbered judgement step would undercut SC2's "all four checks".

**Promoted to gate**: MED-1 (`TASK-100-001`). Note this is *not* the `code_review_blocking` path — that promotes only `category: bug` + `confidence: high`, and this is neither. It enters `top_issues` on its own merits as a quality finding from the review proper.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full hermetic suite (`npm test`) | PASS — 3022/3023, 0 fail |
| Eval tier (`npm run eval:all`) | PASS — exit 0 |
| Bundle integrity across all 128 skills | PASS — one pre-existing warning (`shared/resources/<name> not found`), traced to a literal placeholder string in `observation-log-contract.md` and documented as known noise in task.98. Not caused by this change; confirmed absent from this diff. |
| Consumers of the six regenerated copies | PASS — no heading removed or renamed; every existing anchor still resolves |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/mutation-proving.md` (the change)
- `skills/{develop,double-check,finalise,qa-story,qa-task,review-security}/references/mutation-proving.md` (regenerations)
- `CHANGELOG.md`, the task document, the implementation report, the review report

### Test Commands Executed

```bash
npm run ci:fast                      # exit 0 — 3023 tests, 3022 pass, 0 fail, 1 skip, 53,966 ms
npm run eval:all                     # exit 0
npx prettier --check <11 files>      # clean
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/mutation-proving.md --json
node --test tests/skill-protocol.test.js   # 294 ms — the scoped measurement behind MED-1
```

### Coverage Report

Not applicable — no executable code in the change set. Suite pass rate 3022/3023 (the single skip is pre-existing and unrelated).

---

## Recommendations

### Immediate Actions (Blocking)

1. **MED-1** — replace "The three cost about twenty seconds" with a cost expressed in matrix-command runs, and make the cheapness argument relative (`2/N` overhead on an N-mutation matrix). Keep check 4 free of any time claim.

### Short-term Actions (Non-Blocking)

1. **LOW-1** — qualify the two bare `Step 2` references as "step 2 of the procedure".
2. **LOW-2** — no action; noted for whoever next edits the `description`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Every content criterion passes, including the discriminating row-5 check the task named as its own anti-vacuity test, and the full test and eval tiers are green. One medium finding stands: the section ships an unmeasured wall-clock claim that is wrong by ~5× on a full suite and ~33× on a scoped one — the very claim §8 asked QA to check, in the document that ends by forbidding unverified claims. It is a two-sentence fix and does not warrant FAIL.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: MED-1 resolved.

---

**QA Report**: co-located at `task.100.qa.1.mutation-proving-false-red.md`
**Gate File**: co-located at `task.100.gate.1.mutation-proving-false-red.yml`
**Next Steps**: `/qa-fix` addresses MED-1 (and LOW-1 while in the file), then QA cycle 2 re-reviews.
