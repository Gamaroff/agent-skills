# QA Report: Task 124 - Resume trusts what it finds on disk

**Task**: [Link to task document](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Gate File**: [task.124.gate.1.pipeline-resume-lifecycle-hygiene.yml](./task.124.gate.1.pipeline-resume-lifecycle-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: FAIL
**PR**: #436 — https://github.com/Gamaroff/agent-skills/pull/436

---

## Executive Summary

All four phases are implemented, every new mechanism ships with a test and a recorded mutation proof, and the fast gate (3511 pass), the develop-task replay evals (16/16) and shellcheck are green on the reviewing host. The gate is **FAIL** on one high-confidence platform-variance defect: `advance-pipeline-lock.sh --restore` reads candidate mtimes with the BSD `stat -f %m` form, which on GNU coreutils is *filesystem* mode — reproduced in a Linux container, where the lock-helper suite goes 39/40 — so the newest-candidate rule is not honoured where CI runs. Three medium findings on the new `waiting_on` and dirty-tree-probe mechanisms are recorded as bugs 2–4.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`, 17/17 implementation checkboxes)
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` on the committed tree — 3511 pass, 1 skip)
- [x] Breaking changes documented (§5: `advance-pipeline-lock.sh <n>` with no lock → exit 1; `--skill`/`--complete` keep exit 0)
- [x] Code on feature branch with open PR (#436)

### Testing Approach

- [x] Automated Testing (unit shell suites, node --test, replay evals)
- [x] Regression Testing (full fast gate; grant/lock/hook suites)
- [x] Security Review (boundary rule evaluated — see NFR)
- [x] Code Review (Step 3b — one full-diff adversarial Explore pass; findings CR-1..CR-10)
- [x] Mutation-proof spot check (Step 3c — four independent reverts)
- [x] Documented-command execution (Step 4b — `qa-execute-snippets.mjs` under bash + zsh)
- [ ] Performance Testing (not applicable — no hot path)

### Review Methodology

Large task (4 phases, shared/resources + three orchestrators + hooks + evals): **direct tools for
document-anchored checks, one read-only Explore subagent for the Step 3b diff review** (full
branch diff, bundled `references/` copies and test fixtures excluded — 5 292 lines), rather than
the full parallel-agent set: every phase's evidence is a script with its own suite, so the
verification is executable rather than delegated. `code_review_blocking=true` (pipeline default;
no frontmatter opt-out) → `CR_BLOCKING=true`. Wait marked on the lock via `set-waiting-on.sh`
for the review dispatch and cleared on read. Step 4b: applicable (runnable prose in the change set).
First review — no re-review context.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: snapshot and tree on resume | CONCERNS | Verified (fixtures 13–16 pass) | Probe, detector rule, Step 8 deletion present; **CR-4** — a staged overlay entry survives the discard; CR-6 (low) — unreadable report resolves to "nothing expected" |
| Phase 2: waiting_on + HALT rm | CONCERNS | Verified (17 + 4 + 8 assertions) | Writer, hook predicate, glob-safe HALT all pinned in bash and zsh; **CR-2** — CI-poll budget shorter than the poll; **CR-3** — dispatch population hand-listed, two QA-skill dispatches unmarked |
| Phase 3: report-lint.js | PASS | Verified (12 tests; corrupt fixture names the specified codes) | One-definition test holds; CR-7 (low) call-site exit-code collapse; CR-10 dead state |
| Phase 4: lock restore | FAIL | Verified on macOS (59/59); **red on Linux (39/40)** | **CR-1** GNU `stat -f` is filesystem mode; CR-5 (low) grant's guard reads a different file than the restore; CR-8 loser candidates survive |

**Overall Phase Completion**: 4/4 implemented; 1 FAIL, 2 CONCERNS, 1 PASS

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Dirty tree classified and recorded; overlay never reaches `git add` | yes | partial | CONCERNS | Unstaged overlay: yes (fixture 13); staged overlay: no (CR-4) |
| Healthy resume with no step-3 summary not blocked | yes | yes | PASS | Detector rule keyed on the report column; fixture 15 |
| No `last-halt.json` survives a completed run for the same work item | yes | yes | PASS | Step 8 deletion + checklist 2b; detector stale-snapshot deletion; fixture 16 |
| Stop hook does not re-prompt a step with `waiting_on` set | yes | yes, within budget | CONCERNS | Predicate correct (4 hook tests); the finalise CI poll's budget is shorter than the poll (CR-2); two dispatches unmarked (CR-3) |
| HALT removes the lock in bash and zsh with an empty glob | yes | yes | PASS | `halt-snippet-glob-safe.test.mjs` runs all three snippets under both shells; pre-fix form kept as an in-suite red |
| A structurally invalid report cannot be committed by the pipeline | yes | yes | PASS | Four call sites; PreCompact scenario 16 proves the corrupt report is appended but not committed |
| In-session continuation restores the lock with one command; advancing with no lock is an error | yes | on macOS | FAIL | `--restore` works; candidate ordering broken on GNU coreutils (CR-1) |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Tree probe cost | 1 `git status` + 1 diff for (a) | as specified | PASS | plus one `cat-file` + `cmp` per untracked entry |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `report-lint.js` pure with a thin CLI; one reader for all call sites | yes | yes | PASS | `lintReport` / `loadTemplate` / `parseTemplate` exported; CLI `--json` reason contract |
| Every mechanism has a mutation proof recorded | yes | yes | PASS | Implementation report records 8; QA re-ran 4 (below) |
| Linting | 0 errors | 0 | PASS | shellcheck clean over every tracked shell source; prettier clean |
| Documentation | updated | updated | PASS | hooks doc, pause doc, resume contract, anti-patterns, traps, READMEs, CHANGELOG |

**Migration:** observations #85, #86, #88, #89, #111, #115, #123 close naming the PR — deferred to `/finalise` (not a QA criterion).

---

## Breaking Changes Validation

### Breaking Change: `advance-pipeline-lock.sh <n>` with no lock exits 1
Documented: Yes (§5, header, CHANGELOG)
Migration Path Provided: Yes — `--restore <doc-dir>` named in the error, in the three orchestrators' Step 0-lock and in the PreCompact signal
Migration Tested: Yes — scenario 14 (both shells); the resume contract and pause doc describe the continuation
Consumer Code Updated: Yes — `--skill` and `--complete` keep exit 0 (tested), so the nine standalone sub-skill self-advances are unaffected
Notes: `grant-qa-cycles.sh` now consumes the halt snapshot through `--restore` (test updated: "snapshot consumed")

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: `--restore` picks the wrong candidate on GNU coreutils**
- **Severity**: HIGH
- **Category**: Functional / platform variance
- **Bug Report**: [task.124.bug.1.restore-mtime-gnu-stat.md](./task.124.bug.1.restore-mtime-gnu-stat.md)
- **Observation**: `stat -f %m "$c" 2>/dev/null || stat -c %Y "$c"` — on GNU `stat -f` is filesystem mode; `$m` is non-numeric and `[ "$m" -gt "$newest" ]` fails, so the first candidate (`last-halt.json`) always wins. Reproduced: `docker run --rm -v "$PWD:/mnt" -w /mnt alpine:3 sh -c 'apk add -q bash coreutils jq; bash shared/resources/advance-pipeline-lock.test.sh'` → `FAIL [bash] --restore: orphaned claim`, 39 passed 1 failed (macOS: 59/59).
- **Impact**: CI red for this PR; on Linux a stale snapshot is restored over a newer claim.
- **Recommendation**: GNU form first, BSD fallback, numeric validation of `$m`.
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: finalise CI-poll wait budget (10 min) shorter than the poll (25 min)** — [task.124.bug.2.ci-poll-wait-outlives-budget.md](./task.124.bug.2.ci-poll-wait-outlives-budget.md). Add `--budget-minutes N` to the writer; pass the poll bound. P2.

**Issue: dispatch-site population hand-listed; qa-task Step 3b and qa-story:566 unmarked** — [task.124.bug.3.dispatch-population-hand-listed.md](./task.124.bug.3.dispatch-population-hand-listed.md). Enumerate from directories, widen the (case-insensitive) pattern, mark both. P2. Observed on this run: the orchestrator had to mark qa-task's own review dispatch by hand.

**Issue: staged overlay entry survives the discard under a success line** — [task.124.bug.4.staged-overlay-not-discarded.md](./task.124.bug.4.staged-overlay-not-discarded.md). `git checkout HEAD -- <paths>` and re-read porcelain. P2.

### LOW Severity Issues (3)

- **CR-5** `shared/resources/grant-qa-cycles.sh:140` — the never-lower guard reads `qa_max_cycles` from `$SNAPSHOT` while `--restore` may choose a newer `.pausing.*` claim; the budget is validated against a file other than the one restored. → future.
- **CR-6** `shared/resources/pipeline-resume-detector-prompt.md:152` — "report unreadable" and "no summary-ref column" both resolve to `LOCK_STEP + 1`; the first is "could not look". → make an unreadable report a blocking issue.
- **CR-7** `shared/resources/develop-pipeline-step-8-commit.md:34` (+ the three orchestrators' inline sites) — lint exit 1 / 2 / 127 collapse into one HALT while the PreCompact hook degrades gracefully on a missing `node`. → branch on the exit code.

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 3

---

## NFR Assessment

### Performance — PASS
One `git status --porcelain` plus one `git diff --quiet` (tracked) or `cat-file -e` + `cmp` (untracked) per dirty entry; `report-lint.js` is one pass over the report; the Stop hook's `waiting_on` check is a single `jq` predicate. Nothing on a hot path.

### Reliability — CONCERNS
CR-1 (restore candidate order is platform-dependent — measured in a container) and CR-4 (staged overlay survives) both sit on the recovery path this task hardens. Rollback plan validated: phases are independent; `git revert` + `npm run bundle`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary rule (Step 1b signals): `report-lint.js` `lintReport` is a validator returning a verdict, and the task's Success Criteria carry "cannot be committed" — the rule **fires** (`boundary: true`). Its input surface is Markdown prose; none of the corpus sinks (`url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`) addresses it, so no probe was executable and the verdict is reasoned: the linter reads and never writes; `--restore` and `set-waiting-on.sh` take local paths and labels through `jq --arg` (no shell interpolation of the label — tested with `$PR "42" \`x\``), write via `mktemp` + `mv`, and `find` replaces the glob. No new network surface except the detector's `gh pr view` read.

### Maintainability — PASS
One definition (template read by step-0 and the linter, with a test asserting step-0 no longer inlines one); one restore path; one `waiting_on` writer; the parity test derives dispatch coverage rather than restating it (CR-3 is about the population it derives from, not the mechanism). Cleanups CR-8 (loser candidates survive a restore), CR-9 (`--clear` "byte-identical" overstated), CR-10 (dead `insideVariantFence`) are advisory.

---

## Code Review

From Step 3b — `code_review_blocking=true` (pipeline default): `category: bug` + `confidence: high` → gate `top_issues[]`.

**Correctness bugs (7):**
- [high/high] `shared/resources/advance-pipeline-lock.sh:157` — platform-variance: `stat -f %m` is filesystem mode on GNU coreutils; first candidate always wins on Linux → GNU form first, BSD fallback, numeric guard. **Promoted to gate: CR-1.** Reproduced under GNU coreutils (container): suite 39/40.
- [medium/high] `skills/finalise/SKILL.md:1144` — CI-poll wait marked with a 10-min budget for a 25-min poll → `--budget-minutes` on the writer, pass the poll bound. Recorded as CR-2 (medium, bug 2).
- [medium/medium] `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:186` — dispatch population hand-listed; qa-story:566 and qa-task Step 3b unmarked → enumerate from directories, widen the pattern. Recorded as CR-3 (bug 3).
- [medium/medium] `shared/resources/develop-pipeline-resume-contract.md:97` — staged overlay entry survives `git checkout -- <path>` → discard from HEAD, re-read porcelain. Recorded as CR-4 (bug 4).
- [low/medium] `shared/resources/grant-qa-cycles.sh:140` — guard reads the snapshot, restore may choose a claim → CR-5, future.
- [low/medium] `shared/resources/pipeline-resume-detector-prompt.md:152` — unreadable report = "nothing expected" → CR-6, future.
- [low/medium] `shared/resources/develop-pipeline-step-8-commit.md:34` — lint exit codes collapsed at three inline sites → CR-7, future.

**Cleanups (3):**
- `shared/resources/advance-pipeline-lock.sh:180` — only the winning candidate is consumed; a losing same-document `last-halt.json` survives → remove every same-document candidate (CR-8).
- `shared/resources/set-waiting-on.sh:37` — header says `--clear` leaves a lock "byte-identical"; it reformats through jq → reword or short-circuit on `has("waiting_on")` (CR-9).
- `shared/resources/report-lint.js:89` — `insideVariantFence` toggled but never read → delete or use (CR-10).

**Provenance:** every bug finding is in code this diff introduced (`--restore`, `set-waiting-on.sh`, the probe, the parity test extension); none is pre-existing.

**Boundary rule:** fires on `report-lint.js` (`boundary: true`); no corpus sink matches a Markdown input surface → `probes_executed: 0`, `evidence: reasoned` (see NFR Security).

**Mutation proofs (Step 3c — re-run independently at QA, `cp` snapshot + restore, tree verified clean afterwards):**
- mutation-proven: Stop hook budget comparison `> now` → `> 0` → `stale → re-prompt` → covered
- mutation-proven: `--restore` `rm -f "$chosen"` → no-op → `[bash] --restore: snapshot consumed`, `orphaned claim`, `[zsh] snapshot consumed` → covered
- mutation-proven: `report-lint.js` `headerBlocks > 1` → `false` → tests A, B, F → covered
- mutation-proven: `set-waiting-on.sh` budget always 10 → `configured budget` → covered

**Platform variance (Step 3b item 4):** the reviewer named `stat -f`/`stat -c`; QA ran the suite under the other platform (Alpine + GNU coreutils container) — that is CR-1.

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Lock helper (existing scenarios 1–12) | PASS | 59/59 on macOS (13–14 new) |
| grant-qa-cycles (task.123 re-entry) | PASS | 41/41 — restore now via `--restore`; snapshot consumed |
| Stop hook (task.123 qa_phase arms) | PASS | 32/32 |
| PreCompact hook (task.120 claim/snapshot) | PASS | 18/18 (16 new) |
| tracker-access guarded keys (§44) | PASS | 401/401 after `subagents|wallClockMinutes` |
| develop-task replay evals 01–12 | PASS | 16/16 scenarios |
| Bundle freshness | PASS | `bundle:check` 0 problems (one pre-existing `<name>` warning, observation-log-contract.md) |
| Links / relationship-assertion / comment-origin lints | PASS | in the fast gate |

---

## Step 4b — Documented Commands Executed

`qa-execute-snippets.mjs`, bash + zsh (zsh available), over the changed prose files:

| File | Blocks | runnable / placeholder / mutating | Findings | Skipped (reason) |
| --- | --- | --- | --- | --- |
| `skills/develop-task/SKILL.md` | 9 | 1 / 1 / 7 | 2 (see note) | l.17, 60, 172, 306 `bash …` invocations and l.135, 313 `node …` — fail-closed (unrecognised command); l.75 template slot; l.290 HALT snippet — deny-list `rm` |
| `skills/develop-story/SKILL.md` | 9 | 1 / 1 / 7 | 2 (same) | same shape |
| `skills/develop-bug/SKILL.md` | 8 | 1 / 1 / 6 | 2 (same) | same shape |
| `shared/resources/develop-pipeline-resume-contract.md` | 29 | 2 / 9 / 18 | 0 | placeholders `{…}`; mutating `git checkout`/`git clean`/`npm run bundle`/`bash …` — deny-listed by design (the probe **is** a mutation) |
| `shared/resources/develop-pipeline-step-8-commit.md` | 5 | 0 / 0 / 5 | 0 | `no-executable-blocks` (information): every block is `rm`/`git`/`node` by design |
| `shared/resources/develop-pipeline-hooks.md`, `develop-pipeline-pause.md` | — | — | 0 | no findings |

Note on the two findings per orchestrator: both are the **pre-existing** Step 0 block (`cat .agents/skills/<skill>/SKILL.md`, line 48), which fails identically in both shells because the engine's temp copy has no `.agents/` tree (`--copy <dir>` seeds the directory's *contents* at the root, not the directory) — not a portability defect and not attributable to this diff. The HALT snippets the engine refuses as `mutating` are executed by `shared/resources/tests/halt-snippet-glob-safe.test.mjs` in both shells instead (8/8).

---

## Test Artifacts

### Files Reviewed
`shared/resources/advance-pipeline-lock.sh`, `grant-qa-cycles.sh`, `set-waiting-on.sh`, `develop-pipeline-on-stop.sh`, `develop-pipeline-on-precompact.sh`, `report-lint.js`, `implementation-report-template.md`, `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-step-8-commit.md`, `develop-pipeline-hooks.md`, `develop-pipeline-pause.md`, `read-config.sh`; `skills/{develop-task,develop-story,develop-bug,finalise,review-pr}/SKILL.md`; the six test files and four replay fixtures.

### Test Commands Executed
```bash
npm run ci:fast                       # 3511 pass, 1 skip, 0 fail (rc 0)
npm run eval:develop-task             # 16/16 scenarios (rc 0)
bash shared/resources/{advance-pipeline-lock,grant-qa-cycles,set-waiting-on,develop-pipeline-on-stop,develop-pipeline-on-precompact}.test.sh
node --test shared/resources/tests/report-lint.test.mjs shared/resources/tests/halt-snippet-glob-safe.test.mjs
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed prose> --copy .agents --json
docker run --rm -v "$PWD:/mnt" -w /mnt alpine:3 sh -c 'apk add -q bash coreutils jq; bash shared/resources/advance-pipeline-lock.test.sh'   # 39 passed, 1 failed (CR-1)
```

### Coverage Report
Not instrumented for shell; node suites: 12 (report-lint) + 8 (halt-snippet) + 6 (parity) targeted tests; every new branch has a mutation proof.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — portable mtime read with a numeric guard; prove with the container run (P1).
2. CR-2 — `--budget-minutes` on the writer; finalise passes the poll bound (P2).
3. CR-3 — derive the dispatch population; case-insensitive pattern; mark qa-task Step 3b and qa-story:566 (P2).
4. CR-4 — discard staged overlays from HEAD; re-read porcelain; fixture variant (P2).

### Short-term Actions (Non-Blocking)
1. CR-5..CR-7 (low bugs) and CR-8..CR-10 (cleanups) — see the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — a high-severity `top_issues` entry (CR-1, high confidence, reproduced on the other platform). The implementation is otherwise complete and well-evidenced; the defect is one line on the path CI exercises.
**Quality Score**: 70/100 (100 − 20 for the high blocking finding − 10 for the reliability CONCERNS)

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1 fixed and `advance-pipeline-lock.test.sh` green under GNU coreutils.

---

**QA Report**: co-located at `task.124.qa.1.pipeline-resume-lifecycle-hygiene.md`
**Gate File**: co-located at `task.124.gate.1.pipeline-resume-lifecycle-hygiene.yml`
**Next Steps**: `/qa-fix` on gate 1 (CR-1..CR-4), then re-review.
