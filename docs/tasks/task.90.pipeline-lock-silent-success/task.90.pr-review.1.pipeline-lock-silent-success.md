# PR Review Report: PR #313 — fix(task.90): advance-pipeline-lock.sh reports success for an advance that did not happen

**Reviewed:** 2026-09-04
**PR:** [#313](https://github.com/Gamaroff/agent-skills/pull/313) — `feature/task.90.pipeline-lock-silent-success` → `develop` (OPEN)
**Work item:** [`task.90.pipeline-lock-silent-success.md`](./task.90.pipeline-lock-silent-success.md) — resolved via `branch stem`
**Tracker:** none linked (`TRACKER=github`, `github_issue` absent — 0 of the last 4 tasks in this repo carry one)
**Verdict:** ⚠️ **CONCERNS**

> Both findings are documentation-consistency defects in the work item, not defects in the change.
> The code is sound, the tests bind it, and the trail is unusually honest. Both are closeable in
> minutes. Per the Step 5c contract, `CONCERNS` records findings without blocking.

**Diff scope:** 14 files reviewed. The 9 auto-generated `skills/*/references/advance-pipeline-lock.sh`
copies were **excluded** — byte-identical to the source but for the `AUTO-GENERATED` banner, so
reviewing them is pure noise. Their correctness was verified separately by content comparison rather
than by reading.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.90.implementation.1.*.md` — 218 lines, all 7 sections |
| Review report | ✅ | `task.90.review.1.*.md` — pre-implementation, 8.6/10 READY TO IMPLEMENT |
| QA reports | 2 | `task.90.qa.1.*.md` (FAIL 60/100), `task.90.qa.2.*.md` (PASS 100/100) |
| Gate | **PASS** | `task.90.gate.2.*.yml` (100/100), supersedes `gate.1` (FAIL 60/100) |
| DoD | ⏳ | Not yet written — Step 7 has not run. Expected at this point in the pipeline. |
| Sprint review | ⏳ | Same. |
| Open bugs | 0 | 3 filed, all **Closed** with QA verification appended |
| Handover | n/a | Nothing deferred; no tracker issue to defer to |

The trail is complete for this stage. Both gates are retained rather than the failing one being
overwritten, which is what makes the run's history legible.

---

## Success Criteria Traceability

| # | Criterion | Evidence in diff | Status |
|---|---|---|---|
| 1 | Zero-byte lock fails closed, silent | `advance-pipeline-lock.sh` `require_parsable_lock`; test scenario 8 | ✅ met |
| 2 | Whitespace-only identical, not truncated | same guard; scenario 9 asserts byte count | ✅ met |
| 3 | Non-object lock fails closed, byte-identical | `jq -e 'type == "object"'`; scenario 12, 4 shapes × 2 shells | ✅ met |
| 4 | `--complete` still removes a malformed lock | guard not called from that arm; scenario 11 pins it | ✅ met |
| 5 | Symlink at `$LOCK.tmp` not written through | `mktemp` in the lock dir; scenario 10 asserts canary **and** advance | ✅ met |
| 6 | Green under bash **and** zsh (30 scenarios) | `run_malformed_lock_scenarios` parameterised on `$SH`, `command -v zsh` guarded | ✅ met |
| 7 | 14 pre-existing scenarios remain green | unchanged in the diff; 30 = 14 + 16 new | ✅ met |
| 8 | Mutation-proved, each fix reverted individually | recorded in §13 and both QA reports; re-derived independently at QA cycle 2 | ✅ met |
| 9 | 9 bundled copies refreshed, verified **by content** | 9/9 verified as `source + banner` | ⚠️ **partial** — see PC-1 |
| 10 | `touches:` tag in the legend; row retagged | `pipeline-lock` tag added; `touches: pipeline-lock!, bundles!` | ✅ met |
| 11 | `npm run ci` exits 0 | full tier last ran **before** `a1e836a` | ⚠️ **stale** — see PC-2 |

9 of 11 fully met; 2 carry documentation/evidence defects rather than functional gaps.

---

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md:§9
  Success criterion 9 still carries the parenthetical "(the bundler prints `in sync` for stale
  transitive copies — see task 86)" — the exact claim this run RETRACTED in §13, which states
  "this run produced no evidence for or against it, and should not be cited as having reproduced
  it." The document contradicts itself: a criterion asserts what a later section withdraws.
  The correction pass reached §1, §2, §4 and the criteria's substance, but missed this parenthetical.
  → Drop the parenthetical, or reword it to what actually justifies the "by content" requirement:
    a bundled copy is the source plus an AUTO-GENERATED banner line, so a raw checksum never matches
    and content comparison must skip that line.

[PC-2] coverage · medium · confidence: high — docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md:§9
  Criterion 11, "`npm run ci` exits 0", is ticked on evidence from a superseded commit. The full
  tier (format:check + npm test + eval:all) last ran during Step 3, BEFORE `a1e836a`. Commit
  `584bdbb` then changed both `advance-pipeline-lock.sh` and `advance-pipeline-lock.test.sh`, and
  only `npm run ci:fast` has been re-run since — `eval:all` has not executed against the current
  head `d74bce3`.
  This is the staleness class task.75 exists to prevent: a gate that passed on one commit being
  reported as passing for another. Low practical risk — `eval:all` exercises create-task,
  create-story and the develop-* step-isolation scenarios, none of which reference
  advance-pipeline-lock — and `develop-next`'s merge gate runs the full `npm run ci` before merging,
  so a real break would be caught before landing. But the tick is currently unearned.
  → Re-run `npm run ci` against `d74bce3` and record the result, or qualify the criterion to name
    the commit its evidence came from.
```

### Scope — the mid-run widening is legitimate

The guard grew beyond the task's original §4 (`"empty or whitespace-only"` → `"not a JSON object"`)
after QA found that a whole-file `null` lock still fabricated `{"current_step":5}` and reported it as
an advance. **This is scope evolution, not scope creep**, on four counts:

1. It is the **same defect class** — a lock carrying no state reported as advanced — in the **same
   function**, reached by the **same predicate**.
2. It is one predicate, not a new mechanism.
3. §4 and §9 were **updated to match** rather than left describing a narrower change than shipped.
4. Deferring it would have left a known, reproduced instance of the exact defect this task closes
   sitting in the code, with the task's own §2 rationale reading awkwardly around it.

A separate task would have been ceremony. The judgement to widen is recorded in the implementation
report's Decisions Log with its reasoning, which is what makes it auditable rather than silent.

### Trail — the retractions are accurate, not self-serving

This run records two of its own mistakes. Both were checked rather than taken at face value:

- **The bundler false finding.** The retraction's central premise — that a bundled copy is the source
  plus one `AUTO-GENERATED` banner line, so a raw checksum can never match — was **re-verified here**:
  `diff <(sed '2d' copy) source` is empty for all 9, and line 2 of each copy is the banner. The
  retraction also names the second, less flattering cause (only the last fifteen lines of a ~130-line
  bundler output were read) and explicitly declines to claim it reproduced `task.86`. That last
  refusal is the part that makes it credible: the self-serving version of this retraction would have
  kept the task-86 citation.
- **The 28 MB corrupted report.** The admission names the commit it reached (`293da69`), states that
  it was pushed, gives the exact Python mechanism, and — notably — records that **no gate in this repo
  could have caught it**, since `prettier --check` passes on well-formed 28 MB markdown. It does not
  soften this into "a formatting issue".

A third, smaller self-catch is recorded in the same place: the first attempt at the `null` fix left
the original mutation proof silently broken, and that was found by *running* the proof rather than
assuming it survived. Recording a defect introduced by a fix, in the fix's own cycle, is the
behaviour the trail is supposed to produce.

### Consistency — the corrected claim propagated everywhere

Cycle 1's failure was a false claim shipped to three places. Verified this cycle:

| Surface | States the parse-vs-object distinction | Verified |
|---|---|---|
| Task doc §1, §2, §4 | ✅ | re-read |
| `CHANGELOG.md` | ✅ | `grep` confirms |
| PR #313 description | ✅ | `grep` confirms, twice |
| `shared/resources/advance-pipeline-lock.sh` | ✅ | `jq -e 'type == "object"'` at `:110` |
| QA reports 1 and 2 | ✅ | claim tables re-executed 9/9 and 4/4 |

The only surviving "single hole" mentions are the retraction itself and the QA finding that raised
it. Test count claimed (30) matches actual (30) under both shells. **PC-1 is the one place the
correction pass did not reach.**

---

## Code Review Findings

```
None.
```

The change is small, well-commented, and every predicate in it is falsifiable — confirmed by
re-deriving both mutation proofs at QA cycle 2 rather than reading the claim.

Three things the reviewer would otherwise have flagged, and why each is already correct:

- **`--complete` bypasses the guard.** Deliberate and commented at the definition: gating it would
  make a corrupt lock permanently unclearable, which is worse than the defect being fixed. Pinned by
  scenario 11, so a later widening breaks a test rather than shipping.
- **The emptiness test survives inside the guard.** It is message-selection, not control flow —
  verified structurally: one `exit 1` in the block, with the inner `if` choosing between two strings.
  The comment states why it was demoted rather than deleted.
- **Scenario 12 asserts four shapes, only one of which binds the predicate.** Declared as such in the
  fix note, and independently confirmed at QA cycle 2. Asserting four rather than one is right: a
  guard that special-cased the `null` literal would not satisfy the arm.

---

## Recommended Actions

1. **PC-1** — remove or reword the retracted task-86 parenthetical in §9 criterion 9, so the criterion
   and §13 stop contradicting each other. One line.
2. **PC-2** — re-run `npm run ci` against `d74bce3` and record it, or qualify criterion 11 with the
   commit its evidence came from. `develop-next`'s merge gate will run it regardless, so this is about
   the tick being earned rather than about risk.
3. Consider filing the follow-up QA already recommends: nothing in this repo can see a committed
   artifact orders of magnitude larger than plausible. That gap is what let a 28 MB file reach a PR.
