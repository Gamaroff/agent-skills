# PR Review Report: PR #322 — ci(task.92): add a shellcheck CI lane for the repo's shell scripts

**Reviewed:** 2026-09-05
**PR:** [#322](https://github.com/Gamaroff/agent-skills/pull/322) — `feature/task.92.shellcheck-ci-lane` → `develop` (OPEN)
**Work item:** [`task.92.shellcheck-ci-lane.md`](./task.92.shellcheck-ci-lane.md) — resolved via `branch stem`
**Tracker:** [#321](https://github.com/Gamaroff/agent-skills/issues/321) — OPEN
**Verdict:** ⚠️ **CONCERNS**

---

## Scope of this review

Diff scoped to `origin/develop...origin/feature/task.92.shellcheck-ci-lane` with
`':(exclude)skills/*/references/*'` — **137 generated bundle copies excluded**, leaving 28 files, most
of them markdown. Excluding them is not cosmetic: they are byte copies of `shared/resources/` headed
`AUTO-GENERATED — DO NOT EDIT`, and reviewing them would crowd out every real finding.

> **Both review lenses failed to complete, and that is the single most important thing in this
> report.** Two Explore subagents were dispatched in parallel per the skill's Step 5. Both ran without
> producing output, did not respond to a wrap-up request, and were terminated. Between them they
> returned two fragments — a corroboration that `EPIC` and `TASK_ID` are genuinely unused, and one that
> a quoted-literal change is cosmetic with no other consumers — and nothing else. This is the **third**
> subagent to hang this session; the cycle-2 refute pass failed the same way.
>
> The review below was therefore conducted **in-line, by the same agent that wrote the change**. That
> is precisely the arrangement Step 5c exists to avoid, and it is why this report is CONCERNS rather
> than APPROVE even though every check that ran came back clean. **A human should look at this diff.**

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.92.implementation.1.shellcheck-ci-lane-initial-run.md` |
| Review report (pre-implementation) | ✅ | `task.92.review.1.shellcheck-ci-lane.md` — 8/10, READY TO IMPLEMENT, 1 Critical + 4 Important + 3 Optional all applied |
| QA reports | 3 | `task.92.qa.{1,2,3}.shellcheck-ci-lane.md` |
| Gate | **PASS** | `task.92.gate.3.shellcheck-ci-lane.yml` (96/100); progression CONCERNS 80 → CONCERNS 85 → PASS 96 |
| DoD | ⏳ | Not yet written — Step 7 has not run. Expected at this point in the pipeline |
| Sprint review | ⏳ | Same |
| Open bugs | 0 | No `*.bug.*.md` in the task directory |
| Handover | n/a | `access.tracker` is `full`; nothing deferred |

The trail is complete for a PR at Step 5c and, more importantly, **honest**: the gate progression
records two CONCERNS cycles rather than presenting a clean first pass, and both QA reports state the
limitations of the cycles that produced them.

---

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Lane runs on every tracked source script, no path filter | `.github/workflows/shellcheck.yml:20-23` — `on: pull_request` + `push: [main, develop]`, no `paths:` key; YAML parsed to confirm | ✅ met |
| 2. Lints 56 files, not 247 | `shellcheck.yml:73` + count assertion `:79-83`; `git ls-files` re-run → 56 | ✅ met |
| 3. Green on the current tree | `shellcheck` job SUCCESS in CI on three successive heads; local container run exit 0 | ✅ met |
| 4. Observed failing on a deliberate finding | Three mutation proofs in the implementation report; re-run during QA cycle 1 | ✅ met |
| 5. Version pinned or printed | Both — `shellcheck.yml:43` pins `v0.11.0`, `:48` prints it | ✅ met |
| 6. Every disable carries a reason; no bare suppressions | 0 bare directives across all 56 sources (measured) | ✅ met |
| 7. SC2010 fixed or justified | Fixed — `tracker-access.test.sh` glob loop | ✅ met |
| 8. `npm run ci` still green; local gate duration unchanged | CI `test` job SUCCESS (that job runs `eval:all`); no npm script added to `ci`/`ci:fast` | ✅ met |
| 9. CHANGELOG states gate level + consequence | `CHANGELOG.md` `### Changed` | ✅ met |
| 10. Local invocation documented, container form included | `CONTRIBUTING.md` and `coding-standards.md`, both forms, both files | ✅ met |
| 11. Sources-only rule documented where the glob lives | `shellcheck.yml:54-72` | ✅ met |

11/11 met. No criterion is ticked in the document that this review could not evidence.

---

## Conformance Findings

**[PC-1] trail · medium · confidence: high — `.github/workflows/shellcheck.yml:59`** *(found and fixed
during this review)*

The sources-only comment — the one whose entire job is to stop a future maintainer widening the glob —
asserted *"725 findings instead of 81"* in the present tense about the tree it sits in. Measured on
this branch at the `style` tier: **515 findings across all 247 files, 55 across the 56 sources.** The
725/81 pair was the pre-change baseline from task 92 §3, correct on 2026-09-04 and made stale by this
very change resolving 26 findings.

The ratio argument the comment rests on is unaffected (~9×, either way). But a comment that exists to
be trusted at the moment someone is about to weaken the lane loses its authority if the first thing
that person does is measure and get a different number. This is the **same shape** as TASK-92-004 from
QA cycle 2 — a documentation figure that was true once and silently was not any more — and the same
shape as TASK-92-001, a claim that outlived the thing it described.

Appeared in four places: `shellcheck.yml:59`, `CONTRIBUTING.md:74`, `CHANGELOG.md:80`, and twice in the
task document. **Fixed in all of them** during this review: the durable ratio is now stated, with both
measured pairs and their dates, and the §3 baseline table is left alone as the historical record it is
labelled as.

**No other conformance finding.** Scope was checked explicitly: §4 puts "any behaviour change to the
scripts themselves" out of scope, and the diff deletes three variables and quotes twelve literals. Both
are behaviour-preserving (an unused assignment removed; `VAR=x` and `VAR="x"` store identical bytes),
all three deletions were confirmed unreferenced tree-wide, and §7 was updated to record the 9/17 split
rather than leaving the document describing an annotate-only change. That is within scope, and the
document agrees with what shipped.

---

## Code Review Findings

**None.**

The code lens did not complete, so the checks below were run in-line. Each was executed, not reasoned
about:

| Attacked | Method | Result |
|---|---|---|
| Does the job ever pass without linting anything? | Ran the exact job body under `set -euo pipefail` in three states: normal, `grep` filtering everything (exit 1), and `git ls-files` matching nothing | **No such path.** Process substitution's status is not checked by `set -e`/`pipefail`, so `mapfile` survives a `grep` that exits 1 — and the empty-list guard then fires with `exit 1` and the `::error::` line. Verified in all three states |
| `${#FILES[@]}` under `set -u` when empty | Same runs | Safe on bash 4.4+; `ubuntu-latest` ships bash 5 |
| `if ! shellcheck …` under `set -e` | Read + reasoned + CI evidence | `if !` suspends errexit for the condition; the explicit `exit 1` inside carries the failure. CI has exercised both the pass path (three green runs) and the fail path (mutation proof) |
| Pinned-tarball install | It ran in real CI on three heads and printed the version | Works where it matters, not merely by inspection |
| `~15s` claim in the workflow header | `gh run list --workflow=shellcheck.yml` | 15s, 14s, 17s — **accurate** |
| Glob loop reproduces `ls \| grep -v '\.test\.sh$'` | Ran both, diffed sorted output | Byte-identical, 16 files |
| Deleted variables genuinely dead | `git grep -w` tree-wide incl. bundles, tests, prose | Zero code references for all three |
| Quoted literals unobservable | Traced every consumer (`release.sh:340,368,75`; `_CONFIG_FILE_ORIGIN` has no external reader) | No comparison observes the quoting |
| A prose comment accidentally parsed as a directive | Full container run over 56 files | Exit 0, no SC1073/SC1072. (This failure happened once earlier in the branch and was fixed) |

---

## Recommended Actions

1. **Have a human read this diff.** Not because a specific defect is suspected, but because neither of
   the two independent lenses this step depends on actually ran, and the cycle-2 refute pass did not
   either. Three of the change's five findings were self-found; the arrangement that was supposed to
   catch what self-review misses has not been exercised on this branch at all.
2. Nothing else. PC-1 is fixed; all 11 criteria are met and evidenced; CI is green on every head.

---

## Verdict

⚠️ **CONCERNS** — advisory.

By the deterministic table a single medium-severity finding yields CONCERNS, and PC-1 was medium. It is
fixed, so the verdict could arguably be APPROVE now; it is deliberately left at CONCERNS because the
review that produced it was not independent, and recording that honestly is worth more than the
cosmetic upgrade. Per Step 5c routing, CONCERNS records findings without blocking and the pipeline
proceeds to Step 7.
