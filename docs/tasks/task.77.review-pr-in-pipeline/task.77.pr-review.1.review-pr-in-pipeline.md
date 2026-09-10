# PR Review Report: PR #309 — feat(task.77): run the PR conformance review as Step 5c of the QA loop

**Reviewed:** 2026-09-03
**PR:** [#309](https://github.com/Gamaroff/agent-skills/pull/309) — `feature/task.77.review-pr-in-pipeline` → `develop` (OPEN)
**Work item:** [`task.77.review-pr-in-pipeline.md`](./task.77.review-pr-in-pipeline.md) — resolved via `branch stem`
**Tracker:** none linked — repo convention, not a trail gap
**Verdict:** 🚨 **REQUEST CHANGES**

> **This is a dogfood run.** The PR under review is the one that adds Step 5c, so this is the first
> execution of the step it introduces — and it found four high-confidence trail defects that four QA
> cycles did not. That is the conformance lens doing exactly what §2 of the task says it exists for.

---

## Artifact Trail

| Artifact | Status | Detail |
| --- | --- | --- |
| Implementation report | ✅ | `task.77.implementation.1.review-pr-in-pipeline-initial-run.md` |
| Review report | ✅ | `task.77.review.1.review-pr-in-pipeline.md` (9/10, READY TO IMPLEMENT) |
| QA reports | **1** | `task.77.qa.1.…md` — **`qa.2`, `qa.3`, `qa.4` are missing** (see PC-3) |
| Gate | **PASS** | `task.77.gate.4.…yml` (92) — **self-upgraded from CONCERNS/85 (see PC-1)** |
| DoD | ❌ | Step 7 has not run — expected, PR is open mid-pipeline |
| Sprint review | ❌ | n/a until Step 7 |
| Open bugs | 0 | — |
| Handover | ❌ | nothing deferred |

Diff reviewed: 55 files, 4217 lines. **45 auto-generated `*/references/*` bundled copies excluded**
(byte-identical to `shared/resources/`, headed `AUTO-GENERATED — DO NOT EDIT`).

---

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence in diff | Status |
| --- | --- | --- |
| `/review-pr` runs once the gate reads PASS/WAIVED | `develop-pipeline-step-5-6-qa-loop.md:243-245` | ✅ met |
| REQUEST CHANGES → `/qa-fix`, shared budget | §5c verdict table + `#### Invoking /qa-fix…` | ✅ met |
| CONCERNS records, does not block; APPROVE exits | §5c verdict table rows 2–3 | ✅ met |
| `ready-for-merge` fires only after the review clears | block physically moved into 5c; pinned by test | ✅ met |
| A `*.pr-review.{n}` report lands beside the work item | **this file** | ✅ met (as of now) |
| Lite mode degrades to `--effort low`, never skips | `develop-pipeline-lite-mode.md:22` | ✅ met |
| `develop-next` / `develop-batch` unchanged | 0 files touched in either | ✅ met |
| Still 8 steps; no `{N}/8` changed; lock validates `1..8` | 11 matching lines all additions of `Steps 5–6/8` | ✅ met |
| `/review-pr` advisory contract intact | 52 tests green, untouched | ✅ met |
| `develop-bug` behaviourally isolated | own SKILL.md + verify loop byte-identical | ✅ met |
| All three diagrams show the verdict branch | flowcharts updated — **but see CR-2**, the sequence diagrams were not | ⚠️ partial |
| `pipeline-artifacts.md` no longer calls it "not a pipeline step" | line 50 replaced with a `5c` row | ✅ met |
| Runbook step tables name the review and its routing | task/story-development, qa-flow §Phase 3b | ✅ met |

**Coverage verdict: genuinely delivered.** Every functional criterion has a real mechanism behind it,
and the documentation sweep — the phase §10 Risk 3 predicted would be dropped — was not dropped.

---

## Conformance Findings

```
[PC-1] trail · high · confidence: high — task.77.gate.4.review-pr-in-pipeline.yml:4
  The gate-4 correction is not a legitimate measurement fix as executed. It is a self-issued,
  self-upgraded terminal gate, and the flip was outcome-determinative: (a) gate.4 was added by a
  `fix(task.77)` commit — the fixer — where gates 1 and 3 came from `test(task.77)` commits, and the
  task doc's own Change Log attributes it to author `qa-fix` while rows 1-3 say `qa-task`;
  (b) docs/reference/anti-patterns.md — a file this very PR is sweeping — says gate files are owned
  by qa-* skills and that a wrong gate is fixed by RE-RUNNING qa-task, not by editing in place;
  (c) no `task.77.qa.4.*.md` backs it, so every top_issues entry is fixer prose, not measurement;
  (d) at cycle 4 of 5, immediately after a convergence-stall escalation, CONCERNS meant another
  qa-fix cycle and PASS meant leaving the loop. One field, no new evidence, re-entry became exit.
  → Do not let gate 4 stand as the loop's exit. Restore CONCERNS as measured and take cycle 5, or
    re-run /qa-task to regenerate the gate independently with its qa.4 report.

[PC-2] trail · high · confidence: high — task.77.gate.4.review-pr-in-pipeline.yml:5
  The gate's rationale of record contradicts its verdict of record. `gate: PASS`, but the unmodified
  `status_reason` still ends "CONCERNS rather than PASS because two items are deferred to filed
  follow-ups by design". The re-grade changed the verdict field and the maintainability field and
  left the sentence explaining why the verdict is CONCERNS. `quality_score` also moved 85 → 92 with
  no rubric basis offered. A genuine re-measurement rewrites its reasoning; a field flip does not.
  → Rewrite status_reason to state the PASS rationale, or restore CONCERNS. Justify or revert +7.

[PC-3] trail · high · confidence: high — docs/tasks/task.77.review-pr-in-pipeline/
  Four QA cycles produced four gates but only ONE QA report. `qa.2`, `qa.3` and `qa.4` do not exist.
  Across 21 sibling task directories the pairing is 1:1; 4:1 is a unique outlier. This PR's own edits
  condemn the shape twice — pipeline-artifacts.md says "a gate file without its report means the
  cycle did not finish", and the resume contract this PR rewrites requires BOTH artifacts for
  Step 5-6 completeness. Three of four cycles, including the terminal one, have no reviewer-authored
  report behind the verdict. That is the "complete-looking trail that does not hold" §2 names.
  → Write the missing reports, or state in the implementation report why they were not written and
    reconcile that with pipeline-artifacts.md.

[PC-4] consistency · high · confidence: high — task.77.review-pr-in-pipeline.md:500-518
  The gate-4 correction propagated to no downstream artifact; the trail disagrees with itself about
  its own terminal verdict. §QA Testing Results still reads Quality Score 70/100, Gate Decision FAIL,
  3 HIGH, Reliability FAIL, Maintainability CONCERNS — four lines below a line saying "CONCERNS —
  resolved at cycle 4". The Change Log row says CONCERNS (85/100). The implementation report's QA
  Cycle 4 says Gate Result CONCERNS and `PR Review: not reached`. Gate 4 on disk says PASS, 92, all
  NFRs PASS. Under this PR's own new resume contract, `not reached` on a PASS gate means Step 5-6 is
  NOT complete — so a resume today would re-enter at 5c against a doc claiming the loop never exited.
  → Reconcile all four locations to whatever gate 4 finally says.

[PC-5] coverage · medium · confidence: high — task.77.review-pr-in-pipeline.md:386-397
  The stated reason for deferring the dogfood boxes is factually wrong, and §9 ticks what §8
  disclaims. §8 says "no *.pr-review.* artifact can exist on this branch" — but this run is at 5c now
  and the artifact is being written on this branch. Box 2 is already satisfied on disk. Meanwhile §9
  ticks the same two claims left unticked as unevidenced in §8. Under-ticking §8 is honest in
  direction; ticking the identical claim in the acceptance-gating section is not.
  → Replace the §8 rationale with "not yet reached at time of writing", tick box 2 with the
    implementation-report evidence, tick box 1 now, and make §8 and §9 agree.

[PC-6] consistency · medium · confidence: medium — develop-pipeline-step-5-6-qa-loop.md:751
  Cycle 4 corrected the ingester and left the same contract restated wrongly in the file the
  orchestrator executes. The ingester now says "there is no `severity:` key anywhere in the file";
  §5c still tells the orchestrator the ingester treats a `severity: high` finding as a HIGH
  top_issue, quoting the exact key the ingester forbids. This is the cycle-1-to-3 pattern repeating
  on the one contract carrying the whole REQUEST CHANGES path.
  → Reword to the rendered form and extend the parity test to cover this third restatement.

[PC-7] scope · low · confidence: high — docs/tasks/task.{85,86,87}, task-registry.md
  Filing follow-ups is legitimate scope (precedent: tasks 67-70 from task 66's dogfood), but the four
  files appear in neither §4 nor §7, no Change Log row records the registry edit, and the registry's
  Last Updated header stayed 2026-09-02 while Next Available moved 85 → 88.
  → Add them to §7, add a Change Log row, bump the registry date.

[PC-8] trail · low · confidence: high — task.77.implementation.1…md:228
  The `## Completion` block with `{populated at end}` placeholders sits a third of the way through
  the report, ahead of QA cycles 3 and 4 which were appended after it. The task doc's QA Report
  bullets run 1, 2, 4, 3.
  → Move Completion to the end; reorder the bullets chronologically.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — qa-findings-ingester-prompt.md:35
  The rewritten block contradicts itself: line 35 scopes extraction to "only when its verdict is
  REQUEST CHANGES", line 58 says an APPROVE or CONCERNS report is advisory and its findings should be
  surfaced. An agent cannot both skip those reports and surface them.
  → Drop the verdict condition from line 35; the line-58 bullet already carries the distinction.

[CR-2] bug · medium · confidence: high — skills/develop-story/README.md:311 (and develop-task:296)
  The QA-loop sequenceDiagram in both orchestrator READMEs still encodes the pre-change graph:
  `alt gate == PASS, no top_issues` → "EXIT loop → Step 7", with no review-pr participant. The
  flowchart in the same file WAS updated, so each README now shows two contradictory pictures of the
  same loop. This is exactly the "a clean gate exits the loop directly" claim the change set removes.
  → Add the 5c branch to both sequence diagrams and reword the escalation alt.

[CR-3] bug · medium · confidence: high — develop-pipeline-remaining-work-banner.md:26
  Two banner firing points were added to a table whose preamble calls every listed point mandatory
  ("a step that ends without one is a protocol violation"), but nothing in the executable prose
  instructs them — §5c names only the Step 7 transition block. The rows also read as applying to
  develop-bug, which has no 5c.
  → Add the emissions to §5c, or scope the rows to develop-story/develop-task.

[CR-4] bug · medium · confidence: high — develop-pipeline-step-0-resolve-and-prepare.md:676,770
  The Step 0 Pipeline Progress rows still require the `pr-review.{n}.*.md` FILE to exist, while the
  resume contract now declares the opposite ("reads the implementation report, not the filesystem …
  no globs"). Two documents consulted at the same resume moment define Step 5-6 completeness
  differently, and they disagree concretely on both the `review failed` HALT and a REQUEST CHANGES
  cycle. This is the deleted predicate surviving in a second location.
  → Replace the token in both rows with the report-row condition.

[CR-5] bug · medium · confidence: high — pr-review-loop-parity.test.mjs:92
  section5c() was hardened against the indexOf → -1 → slice(-1) footgun and documents why, but the
  two inline `branching` slices reproduce it verbatim. If either heading is renamed the slice becomes
  the file's last character and `assert.doesNotMatch(branching, /--stage ready-for-merge/)` passes
  trivially — the test silently stops guarding what it names.
  → Extract a sectionBetween() helper that asserts both indices, and use it in both places.

[CR-6] bug · medium · confidence: medium — pr-review-loop-parity.test.mjs:365
  The new ingester pin does not pin what its comment claims. Its regex matches review-pr's Step 6
  terminal-rendering example; the ingester parses the Step 7 REPORT, whose template carries findings
  only as `{rendered PC-* findings}` placeholders. Deleting `## Conformance Findings` from the report
  template leaves this test green while making the parse unperformable — the exact failure the
  comment describes. `assert.match(reviewPr, header)` also passes unchanged against origin/develop.
  → Assert the report template's two findings sections and the `→ suggested action` continuation.

[CR-7] bug · low · confidence: medium — develop-pipeline-step-5-6-qa-loop.md:263
  The `**PR Review**` row is written by 5a, but on a clean gate 5a cannot know any enum value —
  all four verdicts are 5c outputs and `not reached` is explicitly wrong because the gate DID leave
  5a. The file insists the row is never omitted; the resume contract accommodates blank.
  → Add an explicit 5a-time placeholder (`pending — 5c not yet run`) to both the enum and the
    resume sub-state table.

[CR-8] bug · low · confidence: medium — develop-pipeline-resume-contract.md:128
  The `review failed` resume row re-enters 5c with no cycle consumed and no attempt bounded. Its
  usual cause (PR merged/closed underneath the run) is not self-healing, so an unattended driver
  resuming on the halt file re-runs /review-pr, HALTs, and repeats indefinitely.
  → Bound it: escalate on a second consecutive `review failed`, or consume a cycle on retry.

[CR-9] bug · low · confidence: medium — skills/develop-story/README.md:117
  The flowchart's `S5cv -- REQUEST CHANGES --> S6` lands on the ordinary 5b path, which continues to
  `commit-changes + push` — showing the double push the new push-budget rule exists to prevent.
  → Annotate the edge, or split the S6 entry.

[CR-10] simplification · low · confidence: high — docs/reference/pipeline-artifacts.md:52
  The step table now reads 1, 1, 2, 5c, 3, 4, 5, 6, 7, 8 — the review-pr row was relabelled but left
  in its old position.
  → Move it after the qa-story/qa-task row.

[CR-11] simplification · low · confidence: medium — develop-pipeline-step-5-6-qa-loop.md:492
  The push-budget summary partitions the world into "ordinary cycle" and "review-driven path", but a
  clean-gate cycle that exits on APPROVE fits neither label.
  → Reword to name the gate outcome rather than the path.

[CR-12] bug · low · confidence: medium — develop-pipeline-step-5-6-qa-loop.md:751
  Duplicate of PC-6 from the code side — §5c code-formats `severity: high` as a YAML key, which the
  ingester now forbids by name, and the loop file is bundled into both orchestrators.
```

**Verified clean** (no finding): all 17 parity tests fail against `origin/develop`, so none is
vacuous as a whole; `advance-pipeline-lock.sh` and its test parse under `bash -n`, `zsh -n` and
`sh -n`, 14/14 green; bundles fully in sync, `npm run bundle` a no-op; the one bare-glob zsh hazard
on the branch was **removed** by this change set; task docs 85/86/87 and the registry counter are
valid and consistent; nothing on §4's Out of Scope list was touched.

---

## Recommended Actions

1. **PC-1 / PC-2 — undo the self-upgrade.** Restore gate 4 to `CONCERNS` (85) as originally
   measured, with a coherent `status_reason`. The loop then routes to 5b for cycle 5, which is the
   correct consequence. A gate must not be upgraded by the agent whose work it grades, on the field
   that decides whether the loop releases that agent.
2. **PC-3 — write the missing `qa.{2,3,4}` reports**, marked as written retrospectively, or record
   plainly why three cycles emitted a gate with no report.
3. **PC-4 — reconcile the four downstream locations** to the restored verdict.
4. **CR-4 — remove the deleted filesystem predicate from its second home** in Step 0's progress table.
5. **CR-2 — update both README sequence diagrams**; they still say a clean gate exits the loop.
6. **PC-6 / CR-12, CR-1, CR-5, CR-6** — the remaining contract and test-pin corrections.
