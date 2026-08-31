# PR Review Report: PR #283 — feat(review-pr): review a pull request against the paper trail behind it

**Reviewed:** 2026-08-31
**PR:** [#283](https://github.com/Gamaroff/agent-skills/pull/283) — `feature/task.66.review-pr` → `develop` (OPEN)
**Work item:** [`task.66.review-pr.md`](./task.66.review-pr.md) — resolved via `branch-stem`
**Tracker:** [#282](https://github.com/Gamaroff/agent-skills/issues/282) — CLOSED
**Verdict:** 🚨 **REQUEST CHANGES** → ✅ **all findings fixed 2026-08-31**

> **Status: closed.** All 10 findings were fixed in the same session, each held by a test, each
> mutation-proved. Test count 45 → 51. The verdict above is preserved as the review's original
> finding rather than rewritten.

> **This is the skill reviewing its own pull request.** The first live end-to-end run of `/review-pr`,
> which was one of the three residual criteria carried at acceptance. It found two `high`/`high`
> defects that two QA cycles and a DoD pass did not.

---

## Resolution provenance

The cascade resolved on **rung 1 (branch stem)**, and rungs 2 and 3 were cross-checked and converge on
the same document — the fall-through is real, not assumed:

| Rung | Mechanism | Result |
|---|---|---|
| 1 | branch stem `task.66.review-pr` | `docs/tasks/task.66.review-pr/task.66.review-pr.md` ✅ |
| 2 | `^pr_number:\s*283\s*$` | same document ✅ |
| 3 | gate `pr:` URL | `task.66.gate.2.review-pr.yml` → same sibling ✅ |

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.66.implementation.1.review-pr-initial-run.md` |
| Review report | ✅ | `task.66.review.1.review-pr.md` (pre-implementation, 8/10) |
| QA reports | 2 | `task.66.qa.1.*` (CONCERNS 70), `task.66.qa.2.*` (PASS 92) |
| Gate | **PASS** | `task.66.gate.2.review-pr.yml` (92/100), `top_issues` empty |
| DoD | ✅ | `task.66.dod.1.review-pr.md` |
| Sprint review | ✅ | `sprint-review-summary.md` |
| Open bugs | 0 | — |
| Handover | ✅ n/a | none — `access.tracker` was `full` |
| Plan | ✅ | `task.66.plan.review-pr.md` |

**CI:** 4/4 SUCCESS. **PR review:** none (no reviewer requirement in this repo).

## Acceptance Criteria Traceability

| Criterion | Evidence | Status |
|---|---|---|
| Resolves a PR from number / URL / branch / no argument | `SKILL.md:83-97`; **but see CR-2 and CR-3** | ⚠️ partial |
| Cascade resolves by branch stem and `pr_number` | Demonstrated live in this run — three rungs converge | ✅ met |
| All eight artifact kinds collected | `SKILL.md:156-169` — **but see CR-1**: collects nothing under zsh | ❌ unmet |
| Tracker fetched read-only, state compared | `SKILL.md:178-186`; exercised this run (#282 CLOSED) | ✅ met |
| Both lenses run, independently disableable | Both dispatched this run | ✅ met |
| Verdict follows the deterministic table exactly | **Two different tables exist** — see PC-2 / PC-3 | ❌ unmet |
| Co-located `.pr-review.{n}.` report | This file | ✅ met |
| `--comment` posts once, edits on re-run | Still unexecuted | ⚠️ deferred |
| Bitbucket resolves PR, builds diff, posts comment | **CR-2, CR-5** are Bitbucket-path defects | ❌ unmet |

## Conformance Findings

```
[PC-2] trail · high · confidence: high — task.66.gate.2.review-pr.yml (CR-6 resolved_issues entry)
  Gate 2 records CR-6 as status: closed, mutation_proven: true — but the fix landed in SKILL.md
  only. shared/resources/pr-conformance-prompt.md:131-133 still carries the pre-fix verdict table,
  so the defect the gate certifies as closed is live in a second file.
  → Apply the CR-6 wording to the prompt, re-bundle, and extend the test to assert the invariant
    against BOTH files rather than SKILL.md alone.

[PC-3] consistency · medium · confidence: high — SKILL.md:246-250 vs pr-conformance-prompt.md:129-133
  The two authored files state two different deterministic verdict tables, so the criterion "the
  verdict follows the deterministic table exactly" has no single table to follow.
  → Make one normative; have the prompt point at SKILL.md Step 6 rather than restating it.

[PC-1] coverage · low · confidence: high — § 9 Success Criteria vs § 8 Manual End-to-End
  Three § 9 boxes are ticked [x] while their § 8 execution boxes are unticked and § Notes lists
  them as Outstanding — the ticked state overstates the DoD's own 19/22 residual.
  → Untick them, or annotate "contract-test only".

[PC-4] scope · low · confidence: medium — skills/create-skill/scripts/generate_catalog.py:178
  The generator was hand-edited but no phase or criterion names it; § 7 lists only the generated
  catalog.
  → Add generate_catalog.py to § 7 Files to Modify.
```

## Code Review Findings

```
[CR-1] bug · high · confidence: high — skills/review-pr/SKILL.md:158
  The seven-glob `ls` that collects the paper trail aborts entirely under zsh (macOS default) when
  any single glob has no match. Verified against this very task directory: zsh printed
  "no matches found: *.bug.*.md" and listed NOTHING, while bash listed all seven existing
  artifacts. The conformance lens is then handed an empty trail and reports a complete paper trail
  as absent — the worst available failure shape for this skill.
  → Collect each kind with `find "$D" -maxdepth 1 -name '<glob>'`, or run the block under bash.

[CR-3] bug · medium · confidence: high — skills/review-pr/SKILL.md:104
  Step 0b binds a non-numeric target to $BRANCH, but the GitHub path calls `gh pr view "${PR:-}"`,
  and an empty argument resolves the CURRENT branch's PR. Verified: `gh pr view "" --json number`
  returned 283. So `/review-pr some-other-branch` silently reviews the wrong PR rather than erroring.
  → Use `gh pr view "${PR:-$BRANCH}"`.

[CR-2] bug · medium · confidence: high — skills/review-pr/SKILL.md:93
  The URL case-arm matches `*/pullrequests/*` (the API path), but Bitbucket WEB PR URLs are
  `.../pull-requests/{id}` — the form this repo already documents at
  `shared/resources/finalise-dod-ac-prompt.md:20`. Verified: a pasted Bitbucket URL falls through
  to the branch arm.
  → Add `*://*/pull-requests/*` to the URL arm.

[CR-4] bug · medium · confidence: high — shared/resources/pr-conformance-prompt.md:131
  Same defect as PC-2, found independently by the code lens. Two lenses converging on one finding
  from different directions is worth more than either alone.

[CR-5] bug · medium · confidence: medium — skills/review-pr/SKILL.md:211
  The Bitbucket diff fallback uses `curl -sf` without `-L`; the Bitbucket Cloud
  `/pullrequests/{id}/diff` endpoint redirects, so the command exits 0 having written an empty
  $DIFF_FILE — precisely on the merged/cross-fork path the fallback exists to serve.
  → Add `-L`, and assert `[ -s "$DIFF_FILE" ]` after the fallback.

[CR-6] cleanup · low · confidence: high — skills/review-pr/tests/review-pr.test.js:341
  "the conformance prompt declares all four categories" does bare `includes()` on words occurring
  4-8 times in surrounding prose, so it passes even if the contract enum line were deleted.
  → Assert the enum line itself.
```

## Reviewer-observed (outside both lenses)

```
[RV-1] trail · low — task.66.dod.1.review-pr.md header
  The DoD header still reads "**Status:** IN PROGRESS" while its own later section and the task
  both read ACCEPTED. Sections were appended during finalise; the header line was never updated.

[RV-2] scope · medium — SKILL.md Step 4
  This PR is 24,253 lines across 55 files, 30 of which are auto-generated byte-identical bundle
  copies carrying an "AUTO-GENERATED — DO NOT EDIT" header. Step 4 says only "build the diff" and
  offers no guidance for excluding them, so both lenses would receive ~23k lines of generated
  content. This run scoped it by hand in the dispatch — which means the documented workflow does
  not reproduce what was actually executed.
```

## Verdict rationale

**🚨 REQUEST CHANGES** — two findings are `severity: high` with `confidence: high` (PC-2, CR-1), which
is the top row of the deterministic table.

Neither is architectural. CR-1 is a one-line change to how a glob list is built; PC-2/CR-4 is applying
an existing corrected table to a second file. But CR-1 in particular defeats the skill's core purpose
on the default macOS shell, and PC-2 is a defect the QA record already certifies as closed.

## Recommended Actions

1. **CR-1** — rebuild the Step 3 artifact collection so a missing kind cannot suppress present ones. Highest priority: it silently breaks the trail check on zsh.
2. **PC-2 / CR-4** — apply the CR-6 verdict-table fix to `pr-conformance-prompt.md`, re-bundle, and extend the guard to assert against both files. Correct the gate-2 `resolved_issues` entry for CR-6, which currently overstates what was verified.
3. **CR-3** — `gh pr view "${PR:-$BRANCH}"`, so the branch form cannot silently review the wrong PR.
4. **CR-2, CR-5** — Bitbucket URL arm and the missing `curl -L`.
5. **CR-6, PC-1, PC-3, PC-4, RV-1, RV-2** — the low-severity cluster; all one-line.

## Resolution — 2026-08-31

| ID | Fix | Held by | Mutation-proved |
|---|---|---|---|
| CR-1 | `find "$D" -maxdepth 1 -name` per kind, replacing the multi-glob `ls` | "no shell snippet depends on bash-only glob behaviour" | ✅ 2 red |
| PC-2 / CR-4 | Prompt now defers to SKILL.md Step 6; **cross-file guard** asserts the rule lives in exactly one place | "the verdict rule lives in exactly one place" | ✅ |
| CR-3 | `gh pr view "${PR:-$BRANCH}"` | "a branch target reaches the PR resolver…" | ✅ |
| CR-2 | `*://*/pull-requests/*` arm added | "the Bitbucket web PR URL form is recognised" | ✅ |
| CR-5 | `curl -sfL` + `[ -s "$DIFF_FILE" ]` assert | "the Bitbucket diff fallback follows redirects…" | ✅ 2 red |
| CR-6 | Assertion bound to the contract enum line | "the conformance prompt declares all four categories" | ✅ |
| PC-3 | SKILL.md Step 6 declared normative; prompt points at it | "the verdict rule lives in exactly one place" | ✅ |
| RV-2 | Step 4 documents `':(exclude)*/references/*'` | "auto-generated files are excluded from the reviewed diff" | ✅ |
| PC-1 | Three § 9 boxes annotated with what is live-verified vs contract-test only | — | doc |
| PC-4 | `generate_catalog.py` added to § 7 Files to Modify | — | doc |
| RV-1 | DoD header corrected to COMPLETED — ACCEPTED | — | doc |

**`gate.2`'s CR-6 record was corrected**, not left standing. It read `status: closed,
mutation_proven: true` on a verification scoped to one file while the defect lived in another. It now
records what was actually checked and names this report as what reopened it.

### Two mutations did not hold on the first attempt, and why that matters

- **CR-1's** first mutation reported "target missing" — a fault in the mutation harness, not the test.
- **PC-2 and CR-6** came back **NOT HELD** because the test reads the **bundled** copy under
  `skills/review-pr/references/`, and the mutation edited only the `shared/resources/` source. Without
  a re-bundle in between, the test saw the unmutated file and passed.

  That is the same failure shape as the finding itself, one level up: *a check that silently examines
  something other than what you think it examines.* Re-run with a re-bundle step, all three went red.

## Method note

The Adaptive scoping was done **by the reviewer, not by the skill**: 24,253 lines were narrowed to the
5 authored files before dispatch. That is RV-2, and it means this run is not a clean reproduction of
the documented workflow. A future run should not have to do that by hand.
