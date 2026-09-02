# Task Review Report: Task 76 — State what a mutation proof does not tell you

**Reviewed:** 2026-09-02
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-09-02

---

## Executive Summary

The task is well-motivated, precisely scoped, and — unusually — every empirical claim it makes about
task 67 checks out against the task 67 artefacts still in the repository. What it gets wrong is the
**target file's own current state**: the task was written against a 96-line, four-shape version of
`shared/resources/mutation-proving.md`, and the file on `develop` is 140 lines with five shapes. That
single drift invalidates five statements and one success criterion, and makes the length cap
unachievable. All six findings are corrections to this document; none requires new information from a
human, and all were applied in Step 8.5.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run; every ambiguity was resolved
against the repository and recorded below as an assumption.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline under an autonomous-run directive, so no questions
were put to a human. Each point at which the interactive skill would have asked is recorded here with
the evidence that settled it.

**A1 — Output format.** "Comprehensive report" (pipeline default; the audit trail needs a file).

**A2 — The stale description of the target file.** Would have been Question Point 1. Resolved by
measurement rather than by asking: `wc -l shared/resources/mutation-proving.md` = **140**, and the file
carries **five** numbered shapes under `## The five shapes vacuity takes`. The task's "96 lines" and
"four shapes" describe a version that no longer exists. **Assumption applied:** the *intent* (leave the
existing vacuity material alone, add three new sections) is unchanged and remains correct — only the
count and the line budget are wrong, so the fix is arithmetic, not a scope change.

**A3 — The ~160-line cap.** Would have been Question Point 3 ("the cap or the content — which gives?").
Resolved from the task's own §6, which specifies the additions in enough detail to size them: a
coverage-limit section, a three-row diagnosis table with two worked examples in the voice of the
existing shapes, and a table row with two sentences of explanation ≈ 50–60 lines. **Assumption
applied:** the cap was a *budget for the additions* (96 + ~64), not a magic number, so it is re-derived
from the current baseline rather than dropped — and restated as a delta so it survives the next drift.

**A4 — Tracker linkage.** The task has no `github_issue`. The interactive skill would offer to create
one. **No remote issue was created** — an autonomous run does not create tracker issues unprompted. The
gap stays flagged as Important; `/sync-github-task` can link it later.

**A5 — Pre-pass subagents.** Steps B (architecture alignment) and C (codebase already-implemented) were
executed inline rather than dispatched as Explore subagents. The review surface is one 140-line
document and three bundled copies of it, all of which were read directly. `PREPASS_B`: **aligned** — a
documentation-only change to a shared resource, which is precisely the pattern
`docs/architecture/concepts/source-tree.md` prescribes for `shared/resources/`. `PREPASS_C`:
**not-implemented** — none of the three sections exists in the file today.

---

## 1. Template Structure Compliance

**Status:** PASS (one issue)

All 11 mandatory numbered sections are present (Overview → Rollback Plan), plus Change Log, Progress
Tracking, References and Notes. Filename `task.76.mutation-proof-limits.md` matches
`task.{number}.{descriptive-name}.md`. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere in the file.

**OKF frontmatter:** `type: task` present ✅; `description` present ✅; `tags` is a well-formed list ✅;
`updated` present ✅.

**Tracker card preflight** (`sync-jira-task.js --check-card`): **exit 0** — every card block resolves
(`Summary` prose 225 chars / +3 omitted, `Success Criteria` list 391 chars / +5 omitted, `Breaking
Changes` prose 96 chars / +1 omitted). A board reader sees the first four sentences of the Overview and
five of the ten success criteria, each with a `+N more` pointer. Information, not a defect.

**Stakeholder Sign-off:** `sign-off` is absent from `skills-config.yaml` → check skipped entirely, as
specified. No finding.

### Issues

#### Important
- **Change Log is stale** — the newest row is `1.0 Initial draft` (2026-09-01) while frontmatter
  `status: ready-for-development`. `change-log.enabled` is absent from `skills-config.yaml` and
  therefore defaults to `true` at `advisory` enforcement, so this deducts from the score and does not
  block. In fairness to the author this is a soft case: `git log` shows the task was *filed* directly at
  `ready-for-development` by `/create-task` (commit `d0635d6`), so no review silently promoted it. The
  Step 8.5 verdict row closes it either way.

#### Important
- **No linked tracker issue** — frontmatter carries neither `github_issue:` nor `jira_key:`, so every
  tracker signal in the `/develop-task` pipeline (work-started comment, board move, review comment, PR
  comment, finalise close) is skipped for this task. Not created here — see A4.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations detected:** 0

Every empirical claim was checked against the artefacts it cites, and every one holds:

| Claim in task 76 | Verified against | Result |
| --- | --- | --- |
| Nine proofs, thirteen fail-open routes | `task.67.qa.1…md:232,245` — "The development record claims nine mutation proofs"; "thirteen holes survived to QA with a green suite — a mutation proof can only falsify a check that is there" | ✅ holds |
| `COMMAND_RUNNERS` proof unheld because the source was redundant | `task.67.bug.1…md:162` — "One proof initially came back **UNHELD**: disabling the `COMMAND_RUNNERS` check broke nothing"; `task.67.implementation.1…md:180` — "Two mutation proofs came back UNHELD and both were real" | ✅ holds |
| `--timeout` proof unheld because the premise was wrong | `task.67.bug.2…md:174,177` — "`spawnSync` **throws `ERR_OUT_OF_RANGE`** for both `NaN` and a negative timeout"; "the underlying concern is real, but for a value the finding did not name: **`--timeout 0` is accepted**" | ✅ holds |
| Two fixes regressed legitimate input, caught by an accept-set | `task.67.bug.3…md:68,75` — "arithmetic placeholder `0` became a 'command name', and splitting on `&` left the file descriptor in `2>&1` sitting in command position"; "**18 legitimate patterns** still runnable" | ✅ holds |
| `qa-task` Step 3c defers by reference | `skills/qa-task/SKILL.md:431` — links `references/mutation-proving.md` | ✅ holds |

The accuracy problems are all in the task's description of the file it is about to edit, not in its
evidence.

### Issues

#### Important
- **The target file is described as it was, not as it is.** §3 Technical Background states
  "`shared/resources/mutation-proving.md`, 96 lines" and lists five section names; §2 Motivation says
  "four worked shapes of vacuity"; §4 Scope says "The four shapes stay"; §9 Regression says "the four
  shapes … are unchanged"; §Notes says "Keep the four shapes". **The file on `develop` is 140 lines with
  five shapes** — a fifth, *"A textual rule standing in for a semantic property"*, was added after this
  task was filed, along with the mutation-landed `diff` check in step 2 of the procedure.
  - **Impact:** a regression criterion that names the wrong number is a criterion QA cannot check. Left
    uncorrected, a developer reading "keep the four shapes" against a five-shape file has to guess
    whether the fifth is in scope.
  - **Fix:** four → five throughout; 96 → 140; add the fifth shape's title to the §3 section inventory.

- **`qa-fix` is named as a consumer and is not one.** §3 says the file "is bundled into the skills that
  reference it — `develop`, `qa-task`, `qa-story`, `qa-fix` and others". The real set is exactly three:
  `skills/{develop,qa-task,qa-story}/references/mutation-proving.md`. `skills/qa-fix/` contains no copy
  and no reference — its single `mutation-prov` hit is unrelated prose in
  `references/tracker-access-record.md`. There are no "others".
  - **Impact:** Phase 4 asks the developer to "confirm every consuming skill picked up the change";
    against a wrong roster that check either fails spuriously or is waved through.
  - **Fix:** name the three, drop "and others".

- **"9 proofs held" overstates what was independently verified — in the one document that forbids
  precisely that.** §6 Phase 1 instructs writing "**9 proofs held while 13 fail-open routes sat in the
  code**". The QA report is careful here in a way the task is not: the *development record* claims nine;
  QA independently re-ran **four** of the load-bearing ones, and those four held. Writing a bare "9 held"
  into the document whose closing section is *"Do not claim it unless you did it"* — and whose own
  example of the failure is a commit message claiming proofs that were never run — would put the
  document in violation of itself on the very line meant to make it more honest.
  - **Fix:** state the provenance: "nine proofs recorded, four re-run independently in QA and all four
    held — while thirteen fail-open routes sat in the code." The rhetorical force is undiminished; the
    9-vs-13 contrast survives intact.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with a risk level, an explicit file list, checkbox-level changes and stated
dependencies (Ph2 ← Ph1; Ph3 independent; Ph4 ← Ph1–3). The diagnosis table in Phase 2 is supplied
verbatim rather than described, which removes the usual ambiguity about what "add a table" means. File
paths are exact and all exist. Phase 4 correctly identifies that `validate.yml`'s bundle-freshness check
fails the PR if the regenerated copies are not committed.

`estimated_effort_hours: 3` against the rubric (10 success criteria, 4 low-risk phases, single file
plus generated copies) is proportionate — no divergence finding.

No issues.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Overview, Scope, Implementation Plan, Files Summary and Success Criteria agree with one another. Testing
Strategy is honest about being editorial and names the three structural gates that actually apply
(bundle freshness, Prettier, link-check **against the tracked tree** — the right formulation, and one
this repository learned the hard way). The "Mutation Proving: not applicable, and saying so is the
honest answer" note is exactly right for a documentation change.

### Issues

#### Important
- **The ~160-line cap is arithmetically unachievable and contradicts §6.** §9 Quality requires "the
  document does not grow past roughly 160 lines". That budget was set against a 96-line file — 64 lines
  of headroom, comfortable. Against the actual 140-line file it leaves **20**, and §6 specifies three
  additions that cannot fit in 20 lines: a coverage-limit section with the task-67 number and a
  consequence sentence (~12), a three-row diagnosis table plus the "investigate before strengthening"
  rule plus two worked examples in the voice of the existing shapes (~30), and a *When to do it* row
  with its explanation and the cited regression (~10). Roughly 50–60 lines.
  - **Impact:** as written, §6 and §9 cannot both be satisfied. A developer must silently pick one, and
    the likely casualty is the worked examples — the part §9 Quality separately requires.
  - **Fix:** re-derive the cap from the current baseline (~140 + ~55 ≈ **195 lines**) and state the real
    constraint as a **delta** — "adds no more than ~55 lines" — which stays meaningful if the file drifts
    again before this is implemented. The intent behind the cap (length is a cost; the document is read
    mid-task) is preserved and made drift-proof.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Both medium risks are the right ones, and the second — "an unheld proof is a finding" being misread as
"never strengthen the test" — is the genuinely subtle failure mode of this change; the stated mitigation
(vacuous-test stays the **first** row; the rule is *investigate before strengthening*, not *do not
strengthen*) is well targeted. Rollback is accurate: nothing parses these sections programmatically, so
`git revert` + `npm run bundle` is complete. The forward fix (move the additions to a companion document
if length rather than content is the problem) is a real option, not a placeholder.

One consequential note: the rollback verification says "the file is 96 lines with its original five
sections". Post-correction that reads **140 lines with its original six sections** (the fifth shape's
arrival added no section, but *Two things work instead* sits under it). Corrected in Step 8.5 to avoid a
rollback check that can never pass.

No new risks identified.

---

## Summary of Recommendations

### Must Fix (Critical) — 0

None.

### Should Fix (Important) — 6

1. Correct "four shapes" → "five shapes" in §2, §4, §9 and §Notes (4 sites).
2. Correct "96 lines" → "140 lines" in §3 and add the fifth shape to the section inventory.
3. Re-derive the length cap in §9: ~160 → ~195 lines, restated as "adds no more than ~55 lines".
4. Correct the consumer roster in §3: `develop`, `qa-task`, `qa-story` — three, not four-plus-others.
5. Qualify the nine-proofs number in §6 Phase 1 and §9 so the document does not overclaim in the one
   place overclaiming is the subject.
6. Correct the §11 rollback verification line to the true post-revert state.

### Consider (Optional) — 1

7. §References cites `task.67.qa.1…md` "— Code Review section" for the nine-held/thirteen-holes number.
   That material is under its own heading, `### Mutation-proof spot check (Step 3c)`; the Code Review
   section is where `mutation-proven: yes/no` is recorded. A reader following the citation lands one
   section short.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — all sections present, card preflight clean, no placeholders; −1 stale Change Log
- Technical Accuracy: 6/10 — every task-67 claim verifies; −4 for a target-file description stale in six places and a wrong consumer roster
- Implementation Clarity: 9/10 — phases specific, dependencies explicit, the key table supplied verbatim
- Consistency: 7/10 — §6 and §9 cannot both be satisfied as written
- Risk Management: 9/10 — right risks, concrete and correct rollback

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No finding requires information the repository does not already hold — every one is a
correction to a number, a name or a budget, and all six were applied in Step 8.5. The underlying
argument, the evidence behind it and the shape of the three additions are sound and independently
verified.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work Phases 1 → 2 → 3 → 4 in order (Phase 3 may precede 1–2; Phase 4 is last by construction).
2. Hold the corrected budget: **~55 added lines, ~195 total**. If the worked examples push past it, cut
   prose elsewhere in the new sections rather than dropping an example — §9 Quality requires both cases.
3. Change nothing in *The procedure*, *the five shapes*, *Recording it* or *Do not claim it*.
4. Run `npm run bundle` and commit all three regenerated copies — CI's bundle-freshness check fails the
   PR otherwise.
5. Verify new internal links resolve **in the tracked tree**, not merely in the working tree.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` pipeline Step 2)
- **Review Date:** 2026-09-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.76.mutation-proof-limits/task.76.mutation-proof-limits.md`
- **Artefacts consulted:** `shared/resources/mutation-proving.md`; `task.67.qa.1`, `task.67.bug.1`, `task.67.bug.2`, `task.67.bug.3`, `task.67.implementation.1`; `skills/qa-task/SKILL.md`; `skills-config.yaml`; `skills/{develop,qa-task,qa-story,qa-fix}/`
- **Tracker:** GitHub; no issue linked (see A4)
