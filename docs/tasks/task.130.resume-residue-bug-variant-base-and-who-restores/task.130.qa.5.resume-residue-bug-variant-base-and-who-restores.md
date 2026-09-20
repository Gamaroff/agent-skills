# QA Report: Task 130 - Resume residue from task.124 — cycle 5 (safety re-probe)

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.5.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.5.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review of PR #441 after fix commit `b07373df`. Gate 4's HIGH (bug 9) and both mediums (bugs 10, 11) are fixed and re-verified — QA ran the bind block and the delete block in two separate processes under both shells, which is the condition bug 9 hid behind, and then enumerated fifteen further inputs to the delete boundary. Because gate 4 was `FAIL` and the task's Success Criteria contain "refused", the scope rule's clause 3 fired and this cycle was an **unscoped safety re-probe** over the whole branch diff. It found no HIGH and one MEDIUM: the three orchestrators still *describe* the delete as a prefix rule ("whose `concern` starts `stale-snapshot`") — the selector shape cycle 2 removed — so three citations promise a delete-and-verify for the two skip notes that the executed block correctly refuses. The executed code is right at every input tried; what is wrong is one of the four statements of the rule. HIGH sequence `0, 1, 0, 1, 0`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — bug 12

---

## Testing Scope

### Prerequisites Verified

- [x] Task complete; bugs 9–11 Ready for QA; tests passing (re-run: `ci:fast` 3574/3574); breaking changes documented; PR #441 OPEN

### Testing Approach

- [x] Automated · [x] Regression · [x] Security (reasoned; boundary re-probed by execution) · [x] Code Review (safety re-probe) · [x] Executed prose · [x] Mutation spot checks

### Review Methodology

Direct tools plus one read-only Explore reviewer with the **SAFETY RE-PROBE** directive (702 s; it executed the delete, bind and step-8 legacy blocks under both shells against 27 input variants). `SAFETY_REPROBE=true` by clause 3 of `qa-re-review-scope.md` (clause 1: gate 4's security axis read `CONCERNS reasoned` → OK; clause 2: gate 4's HIGH concerned a variable binding across fences, not a boundary; clause 3: `gate: FAIL` and § 9 Success Criteria contain "refused"). Scope rebuilt from the fix commit (`git diff fa3e3fdc..HEAD`) for the Re-Review Context, whole-branch diff for the re-probe. Traceability mapper skipped. `Adaptive strategy override: lite mode — direct tools only` (one reviewer, per the Step 3b exception).

```
Re-review scope: unscoped (safety re-probe — prior gate FAIL and "refused" in the Success Criteria); full origin/develop...HEAD diff, 2593 lines / 34 files
```

---

## Re-Review Context

| Prior issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-130-QA-9 delete block reads the previous fence's variable | 9 | **FIXED** | bind block in process 1, delete block in process 2 → MERGED removed with the evidence line; OPEN / failed `gh` → KEPT; absent and empty detector file → HALT, nothing deleted (bash, `zsh -f`); mutation re-bind→variable guard → 32 red incl. E, P |
| TASK-130-QA-10 four bare-string note sites | 10 | **FIXED** | string note → bind exit 1; prompt sites :108/:112/:113/:167 + mtime line are objects; mutation bare string restored at each → Q red (Q's first ±1-window draft stayed green at :112 — replaced before commit) |
| TASK-130-QA-11 empty `pr_url` reads the current branch | 11 | **FIXED** | no `pr_url` and `null` `pr_url` → KEPT before any `gh` call, even with a stub answering MERGED for everything; mutation guard dropped → N2 red ×2 |
| CR-4 provenance scenario · CR-5 field-table mtime fields | advisory | FIXED | read; 85/85; field table row says "mtime deltas only" |

---

## New Findings This Cycle

Searched unscoped: full branch diff; the reviewer executed the three blocks against 27 inputs; QA independently ran 15 (below).

- **[medium]** `skills/develop-{task,story,bug}/SKILL.md` Step 0a — the citing sentence describes the delete label as a prefix (`starts \`stale-snapshot\``); the contract's selector is exact equality since cycle 2; test D passes on the wording → reword to the exact label, extend D. **Bug 12.** Confirmed by grep at all three sites.
- **[advisory, medium/medium]** CR-2 — step-0 :253 and the three Step 0-lock paragraphs put the `--restore` imperative in the main clause and the who-restores rule in a parenthetical; QA reads the parenthetical ("which snapshots restore here and which wait for the grant") as gating, so this is a clarity item: make the main clause conditional.
- **[advisory, medium/medium]** CR-3 — the detector prompt's Step 1 candidate selection is a second derivation of `choose_candidate()`: silent on a directory-less (legacy) candidate, ranks by mtime alone. Not promoted — a prompt-reading finding with no executed reproduction, and the legacy-alone case is already handled by the Step 0-lock paragraphs' `legacy-snapshot:` exit-1 arm; the mixed case (newer legacy file beside an older matched claim) is a genuine gap. Follow-up candidate.
- **[low]** CR-4 — "already absent" from a non-root cwd: **refuted** for the pipeline's relative `{doc-directory}` — from `<repo>/docs` the rule-6 guard HALTs on the absent detector file before `SNAPSHOT_PATH` is consulted (executed, both shells). Holds only with an absolute substitution.
- Cleanups: CR-5 an unrecognised `stale-snapshot`-prefixed concern is skipped silently; CR-6 the lint rc=2 arm names the call site for three distinct causes (`usage()` is reached by unknown argument, unreadable `--file`, bad `--variant`, unreadable template) at four sites; CR-7 `{doc-directory}` unquoted at four substitution sites.

**QA boundary re-probe (15 inputs, bash + `zsh -f`, two processes each):** MERGED / OPEN / failing `gh` for this document → removed / KEPT / KEPT; other document → HALT; no `pr_url` and `null` `pr_url` → KEPT before `gh`; absent and empty detector file → HALT; unparsable snapshot → HALT (fails closed; message says `'absent'`); metachar `pr_url` (`merged1; touch PWNED`) → passed to `gh` as one argument, no injection; detector JSON without the `deltas_since_pause` key → HALT; the same path spelled `./…` and absolute → one rm, second "already absent"; a symlink *at* the snapshot path → the link is unlinked, the target untouched; string note → bind exit 1; object note with `path: null` → nothing to do, exit 0.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Probe base | PASS | Verified | Unchanged |
| Phase 2: Dispatch mark + population | PASS | Verified | Unchanged |
| Phase 3: Stale-snapshot delete in the orchestrator | CONCERNS | Verified (executed) | The block is correct at 42 executed inputs across QA and the reviewer; bug 12 is the citing description at three sites |
| Phase 4: One statement of who restores | PASS | Verified | CR-2 is a clarity item on the citing sites, the statement itself is one |
| Phase 5: Gate-6 futures | PASS | Verified | CR-4 (cycle 4) landed; 85/85 |

**Overall Phase Completion**: 4/5 pass; Phase 3 CONCERNS (description, not behaviour).

---

## Success Criteria Verification

| Criterion (Functional) | Status | Notes |
| --- | --- | --- |
| MERGED snapshot deleted by the orchestrator from one stated loop, asserted absent | PASS | Two-process run deletes and asserts absence; one statement (D: no orchestrator carries a copy) |
| Detector read-only; delete verified on disk | PASS | Directory + MERGED re-read before `rm`; empty `pr_url` kept |
| Who restores stated once | PASS | `who-restores-single-statement` green |
| All other functional criteria | PASS | as cycles 1–4 |

Code Quality: `ci:fast` 3574/3574 + shell suites (85, 42); `eval:develop-task` 13/13 (the fixture count is 17; 13 is the test count on the committed tree as well); `bundle:check` 0; shellcheck clean; Prettier clean; cycle-4 fixes mutation-covered (4/4, re-run by QA) — PASS. Migration: PASS.

---

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

- **Three orchestrator citations describe a prefix delete** — [bug 12](./task.130.bug.12.orchestrator-citations-describe-prefix-delete.md). Maintainability. P2.

### LOW Severity Issues (0) + 6 advisories — documented here only

CR-2, CR-3 (medium/medium, not promoted — see New Findings), CR-4 (refuted), CR-5, CR-6, CR-7.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (+6 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS — the block runs on a literal two-fence resume; healthy resumes pass the schema check; absent/empty/unparsable inputs fail closed.
### Security — CONCERNS — **Evidence**: reasoned · **Probes executed**: 0 (no JS boundary for the engine; the shell boundary executed at 42 inputs) — the one open item is a *description* of the boundary wider than the boundary.
### Maintainability — CONCERNS — bug 12; CR-2, CR-3, CR-5, CR-6, CR-7.

---

## Code Review

Safety re-probe, 7 findings: promoted CR-1 → QA-12 (medium, confidence high, confirmed); advisory CR-2..CR-7 (CR-4 refuted by execution).

**Provenance:** CR-1 is the feat commit's own sentence, left behind by the cycle-1→2 selector change; the rest are on code introduced by this branch.

**Mutation proofs (QA-run, cp snapshot/restore, tree verified equal to committed):**

```
mutation-proven: contract — delete block re-bind → previous-fence variable guard → stale-snapshot-delete 32 red incl. E, P → covered
mutation-proven: contract — empty-pr_url keep dropped → stale-snapshot-delete N2 [bash], N2 [zsh] → covered
mutation-proven: detector prompt — bare string restored at :108 / :112 / :113 / :166–167 → Q red each → covered
```

**On the harness:** the suite now carries the detector JSON by file only, and P runs the two fences as two processes — the class bug 9 hid behind is no longer invisible to it.

**Step 4b:** contract (2 runnable, exit 0 under both shells; 8 placeholder; 20 mutating skipped), detector prompt (`:69` `cat` of an absent lock; `:80` `ls -t … .pausing.*` prints `no matches found` under `zsh -f` — under zsh `nomatch` the whole `ls` never runs, so an existing `last-halt.json` goes unlisted; both lines byte-identical on `origin/develop`, so 0 attributable — noted as a follow-up of the same glob-safety class Phase 5 fixed in step-8), step-8 (`no-executable-blocks`). **5c:** tree unchanged after checks.

---

## Regression Testing

`npm test` glob 3574/3574; shell suites green; `eval:develop-task` 13/13; `bundle:check` 0; `lint:shell` clean; Prettier clean.

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 12 — exact label (or no label) at the three citations; test D rejects a prefix description. P2

### Short-term Actions (Non-Blocking)
CR-2 conditional main clause; CR-3 legacy rule in the detector prompt or read the winner from `--restore --which`; CR-5 named skip; CR-6 one rc=2 message the four sites cite; CR-7 quoting; detector `:80` glob under zsh (pre-existing).

---

## Final Assessment

**Gate Status**: CONCERNS · **Rationale**: no HIGH (rule 2: one medium, confirmed); reliability PASS; security and maintainability CONCERNS on the same item · **Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL — bug 12 fixed and re-verified.

---

**QA Report**: `task.130.qa.5.…md` · **Gate File**: `task.130.gate.5.…yml` · **Next Steps**: `/qa-fix`; this was the last budgeted cycle — the loop's budget rule decides what reads the fix.
