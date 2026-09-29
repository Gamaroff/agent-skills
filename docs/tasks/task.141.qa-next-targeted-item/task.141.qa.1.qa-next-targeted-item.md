# QA Report: Task 141 - `/qa-next <id>` — target a specific registry item

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.1.qa-next-targeted-item.yml](./task.141.gate.1.qa-next-targeted-item.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Testing Completed**: 2026-09-22
**Gate Status**: FAIL

---

## Executive Summary

The change set does what it set out to do: `--item` and `--next` share one `describeRow` (pinned by a
field-by-field payload comparison, not a source grep), `--run-path` sequences a same-day re-run, the
sequence-aware sort key puts the day's unsuffixed first run first, and ten mutations applied to the
tool all go red. The full suite is green at 3931 tests with the `.claude/skills` symlink moved aside.

One HIGH defect blocks it. The kept-accepted predicate captures `untested`, so the **migration path
this task documents in three places** — `--set <id> untested --note "<why>"` to demote an accepted
row — leaves the row reading `✅ accepted` with its `Last run` cleared. `--check` rejects that, and
`/qa-next` Step 0 HALTs on a non-zero `--check` as `registry-invalid`. The one documented way out of
an accepted row is the command that breaks the registry.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (85/85 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (Breaking Change 1, with a migration path — see BUG-1)
- [x] Code on feature branch `feature/task.141.qa-next-targeted-item` with open PR #468

### Testing Approach

- [x] Automated Testing (unit)
- [x] Regression Testing (contract test over the untouched commands)
- [x] Security Review (reasoned — see NFR)
- [x] Code Review (Step 3b, one read-only Explore subagent over the whole branch diff)
- [x] Manual round-trip against a throwaway fixture registry
- [ ] Performance Testing (no performance dimension; cost properties checked instead)

### Review Methodology

Direct tools plus one dispatched code reviewer. First review (0 prior gates), so the diff scope was
the whole branch (`origin/develop...HEAD`, 3819 lines, 9 files) and no re-review narrowing applied.
The task is 5 phases in a single module at `risk_level: low`, which the Adaptive Review Strategy puts
on the "direct tools first, spawn agents if gaps found" row; the Step 3b reviewer is dispatched
regardless. `code_review_blocking=true` applied as the pipeline's run-level override, so
`category: bug` + `confidence: high` findings enter the gate.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| Phase 1: Resolve a named row | PASS | Verified | `describeRow` extracted and shared; `itemById` exported; `--item` registered ahead of `--set`; exit 4; lowercase id accepted; usage header extended, `--accept --force` corrected, and the `--item`/`--items` typo hazard noted (review-1's optional finding) |
| Phase 2: A run file path the agent cannot collide | PASS | Verified | `runPathFor` pure and exported; `cmdRunPath` does one `readdirSync` of the function directory; `seqKey` normalises a missing sequence to `-01`. One low-severity edge — CR-4 |
| Phase 3: The registry state rules for a re-run | **CONCERNS** | Partial | The kept rule is one predicate over the verdict set and `(kept)` is printed, as designed — but it captures `untested` (BUG-1). `--clear-note` and both its refusals verified |
| Phase 4: The protocol | **CONCERNS** | Partial | `## Arguments` in house style, Step 1 *Select or resolve*, `targeted` added **and** the staleness rule gated on it, per-verdict note table, bug/finding reuse, both new stop conditions, both *never does* bullets. But the run template still names the old evidence path (BUG-2) |
| Phase 5: Tests and the doc sweep | PASS | Verified | 10 new test groups, all mutation-proved; README, `commands.md` (including both stale story-era rows), `activation-phrases.md`, catalog regenerated, CHANGELOG |

**Overall Phase Completion**: 3/5 PASS, 2/5 CONCERNS

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/qa-next D.2` runs against a row in any state | Yes | Yes | PASS | `--item` verified against `⬜`, `❌` and `✅` rows |
| No-argument `/qa-next` unchanged | Yes | Yes | PASS | Contract test asserts `--next` payload, exit 3 and `null` |
| Unknown id stops with `unknown-item`, writes nothing | Yes | Yes | PASS | Exit 4; registry byte-identical |
| Same-day re-run writes a second file; first survives and sorts first | Yes | Yes | PASS | Compose test: both runs' findings appear in `--findings`, oldest first |
| `pass`/`blocked`/`na` on `✅` keep it; only `fail` moves it | Yes | **Partial** | **FAIL** | True for `pass`, `blocked`, `na`, `fail` — and wrongly true for `untested` (BUG-1) |
| A passing re-run leaves the `accepted <date>` note intact | Yes | Yes | PASS | `--clear-note` refused on that path; note byte-identical |
| A repeat failure re-links the existing open bug | Documented | Documented | PASS | Protocol rule with `bug` in the payload as its source; prose, not code |
| A `🟡` following a `❌` carries no stale bug link | Yes | Yes | PASS | `--clear-note` verified |

### Performance

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| `--run-path` touches one function directory | Yes | Yes | PASS |
| No command gains a network call | Yes | Yes | PASS |
| qa-next suite wall-clock same order of magnitude | Yes | 10.0s / 28 tests | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| One `describeRow`, payloads compared field-by-field | Yes | Yes | PASS |
| One sequence-aware sort key, shared by `listRunFiles` and `priorRuns` | Yes | Yes | PASS |
| Every new test mutation-proved | Yes | 10/10 red | PASS |
| `npm test` green with the symlink moved aside | Yes | 3931 pass, 0 fail | PASS |
| `check:generated` and `bundle --check` green | Yes | Yes | PASS |
| Prettier clean | Yes | Yes | PASS |

---

## Breaking Changes Validation

### Breaking Change 1: only a `fail` demotes an accepted row

Documented: Yes · Migration Path Provided: Yes · **Migration Tested: Yes — and it FAILS** ·
Consumer Code Updated: N/A (qa-next Steps 2 and 4 are the only callers)

The migration path is `--set <id> untested --note "<why>"`. Executed against an accepted fixture row
it produces `✅ accepted` with an empty `Last run`, and `--check` exits 1. See TASK-141-BUG-1. A
breaking change whose stated escape hatch does not work is worse than one with no escape hatch, because
the documentation is the only reason anyone would try it.

### Breaking Change 2: none of the rest

Documented: Yes · Verified: Yes — the contract test covers `--next`, `--check`, `--coverage`,
`--findings`, `--items`, `--automated`, `--accept`, `--init`. **Assessment: PASS**

**Overall Breaking Changes Assessment: FAIL**

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The documented `untested` demotion leaves an accepted row with no `Last run`**

- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.141.bug.1.untested-demotion-kept-on-accepted-row.md](./task.141.bug.1.untested-demotion-kept-on-accepted-row.md)
- **Observation**: `kept = state !== "fail" && stateKey(row.state) === "accepted"` captures `untested`, so the state cell is kept while the unconditional `if (state === "untested")` block still clears `row.run` and overwrites the note. Reproduced: `D.1: ✅ accepted (kept)` → `[ERROR] D.1: accepted requires a Last run link`, `--check` exit 1.
- **Impact**: The registry fails its own integrity gate, and `/qa-next` Step 0 HALTs `registry-invalid` until a human repairs the row. The sign-off provenance is destroyed in the same call.
- **Recommendation**: `const kept = !["fail", "untested"].includes(state) && stateKey(row.state) === "accepted";` plus the missing test leg.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: The run template still names the colliding evidence path**

- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.141.bug.2.run-template-evidence-path-collides.md](./task.141.bug.2.run-template-evidence-path-collides.md)
- **Observation**: `SKILL.md:160` says `<run-file-basename>/`; `assets/run.template.md:30,41` — a file this diff touches — still say `<date>-<env>/`.
- **Impact**: The template is what the agent fills in, so the colliding path is the one that would actually be written, defeating the change's purpose on the re-run path.
- **Recommendation**: Point both placeholders at the run-file basename.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-4** — `seqKey`'s `-\d{2}` group matches any trailing two digits, so `--env ci-02` produces `2026-09-22-ci-02.md` which normalises to itself and sorts *after* its own `-02` and `-10` re-runs. Reproduced. In `top_issues[]` as a low entry, not blocking.
- **CR-3** (advisory, not in `top_issues[]` — `confidence: medium`) — `--set` exits 0 whether the verdict moved the row or was kept on `✅`. The `(kept)` token is the only discriminator and no `SKILL.md` step is told to read it. The task names the print as the mitigation for exactly this risk, so this is a gap in the *protocol*, not the tool.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

No network. `--run-path` does one `readdirSync` of a single function directory, as specified.
`priorRuns` walks `runs/` recursively on both `--item` and `--next` — a deliberate, documented trade
to avoid a second comparator. Full `npm test` 101.7s; qa-next suite 10.0s for 28 tests.

### Reliability — CONCERNS

`die()` still throws rather than exits, so the stdout-drain discipline holds and exit 4 sits inside
it. The rollback plan is real: Phase 3 reverts alone, and the sort-key change is a no-op on a tree
with no sequenced files. The CONCERNS is TASK-141-BUG-1 — a command that leaves the registry in a
state its own gate rejects, on the documented path.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The change set exports no single-argument accept/reject predicate: `runPathFor` takes three
  arguments and `itemById` needs a parsed registry, so there is no entry point `security-probe.mjs`
  can take. Recorded `boundary: false` with that reason rather than as a shrug. The tool is offline
  and file-local, reads only the owner's own registry, interpolates nothing into a shell, spawns
  nothing, and adds no dependency. The accept/reject logic that does exist — `cmdSet`'s kept
  predicate — was executed against adversarial verdicts by hand through the CLI, which is how BUG-1
  was found; `reasoned` rather than `measured` because the probe engine itself was not run.

### Maintainability — CONCERNS

One `describeRow`, one sort key, and the comments carry the *why* rather than the *what*. Two marks
against: BUG-2 leaves the evidence path stated in two places and already drifted, and the
accepted-row test group never sends `untested` — a gap that let all ten mutations go red while the
defect sat in the predicate they were mutating.

---

## Code Review

Step 3b, one read-only Explore subagent over the whole branch diff (9 files; reviewable code =
`uat-status.mjs`, the test suite, `SKILL.md`, `README.md`, `run.template.md`).
`code_review_blocking=true` (pipeline run-level override).

**Correctness bugs (4):**

- [high/high] `skills/qa-next/scripts/uat-status.mjs` (cmdSet kept predicate) — the kept predicate captures `untested`, breaking the documented demotion → exclude `untested` from the predicate. **Reproduced.** Promoted to gate as `TASK-141-BUG-1`.
- [medium/high] `skills/qa-next/assets/run.template.md:30,41` — template still names the colliding `<date>-<env>/` evidence path → point both at the run-file basename. **Reproduced by reading both files.** Promoted as `TASK-141-BUG-2`.
- [low/medium] `skills/qa-next/scripts/uat-status.mjs` (cmdSet exit) — kept and moved both exit 0; only the printed `(kept)` distinguishes them → advisory, `recommendations.future`. Not promoted (`confidence: medium`).
- [low/high after reproduction] `skills/qa-next/scripts/uat-status.mjs` (seqKey) — an env label ending in `-NN` re-introduces the ordering inversion. **Reproduced.** Promoted as a low entry.

**Cleanups (0):** none identified.

**Provenance (step 5b):** all four are in code this branch introduces — `origin/develop`'s
`uat-status.mjs` has no `kept` predicate and no `seqKey`. None is `pre-existing`.

**Mutation proof (step 3c).** Carried over from the implementation run and re-read here, because no
fix was made this cycle and the proofs are the coverage claim under review. Ten mutations, each
applied to the tool with the suite re-run and the tool restored:

```
mutation-proven: kept guard deleted → only-a-fail-moves-✅ + --clear-note refusals → covered
mutation-proven: kept narrowed to pass → only-a-fail-moves-✅ (blocked/na legs) → covered
mutation-proven: --clear-note kept-✅ refusal dropped → --clear-note refusals → covered
mutation-proven: plain basename comparator restored → unsuffixed-first-run ordering + compose → covered
mutation-proven: runPathFor never sequences → runPathFor + --run-path + compose → covered
mutation-proven: runPathFor padStart dropped → runPathFor + --run-path → covered
mutation-proven: bug dropped from the payload → --item payload parity → covered
mutation-proven: unknown id no longer exits 4 → exit-4 + untouched-commands contract → covered
mutation-proven: (kept) no longer printed → only-a-fail-moves-✅ → covered
mutation-proven: --item off the shared describeRow → payload field-identity + compose → covered
```

**All ten `covered`, and all ten missed TASK-141-BUG-1.** That is the finding worth carrying forward:
the mutations all perturbed the kept predicate's *guarded* verdicts, and the suite has no case that
sends `untested` to an accepted row, so there was no assertion for a mutation to red. A mutation suite
measures the tests against the code that exists — it cannot ask about a branch nobody wrote a case for.

**Platform variance (step 4):** none. The change set derives no value from `os.tmpdir()`, `$HOME` or
`$TMPDIR` and passes nothing to a validating consumer; the new tests build their fixtures with
`mkdtempSync` and assert on basenames, not on absolute paths.

---

## Step 4b — Execute the Documented Commands

Applicable: the diff modifies `skills/qa-next/SKILL.md`, which carries fenced ```bash blocks.

```
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-next/SKILL.md --json
```

- Blocks found: **5** — runnable 0, placeholder 0, **mutating 5**
- Shells: bash + zsh (`zshAvailable: true`)
- Skipped, with reasons: line 96 `unrecognised-command: node (fail-closed)`; line 104 same; lines
  134, 142, 210 `write-redirection`
- Result: **`no-executable-blocks`** (information in `notes[]`, exit 0) — `placeholder === 0` and every
  block correctly refused as mutating. This is the second of the two zero-block states, the one with
  nothing to act on: no `--bind` or `--copy` will make `node`, a `curl` or a write redirection
  runnable, because they are deny-listed by design. Recorded, not raised as a finding.
- **Substituted by hand, since the engine cannot execute them**: every `--flag` the skill and README
  quote for `uat-status.mjs` was checked against the tool's `OPTIONS` allowlist. All present. The five
  residual flags (`--dry-run`, `--grep`, `--max-time`, `--porcelain`, `--workspace`) belong to the
  skill itself, Playwright, curl, git and npm respectively — not to the tool. This is the task's
  Consumer Test ("a documented flag the tool does not have"), executed.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| Untouched `uat-status.mjs` commands (`--next`, `--check`, `--coverage`, `--findings`, `--items`, `--automated`, `--accept`, `--init`) | PASS — contract test added this cycle asserts arguments, output and exit codes unchanged |
| The pre-existing `listRunFiles` ordering test (two different dates, plus `README.md`) | PASS — `seqKey` normalises `README.md` to `README-01.md`, which still sorts last |
| Whole repository | PASS — 3931 tests, 0 failures, 1 skipped |
| Generated artifacts | PASS — `check:generated` clean; the catalog is byte-identical because it truncates the description before the changed text |
| Bundled copies | PASS — `npm run bundle -- --check`, 129 skills, 0 problems |

---

## Test Artifacts

### Files Reviewed

`skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs`,
`skills/qa-next/SKILL.md`, `skills/qa-next/README.md`, `skills/qa-next/assets/run.template.md`,
`docs/reference/commands.md`, `docs/reference/activation-phrases.md`, `CHANGELOG.md`,
`docs/tasks/task.141.qa-next-targeted-item/*`

### Test Commands Executed

```bash
mv .claude/skills /tmp/cs-backup && npm test; mv /tmp/cs-backup .claude/skills
node --test evals/qa-next/unit/uat-status.test.mjs
npm run check:generated
npm run bundle -- --check
npx prettier --check skills/qa-next/ evals/qa-next/ docs/reference/ CHANGELOG.md
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-next/SKILL.md --json
# BUG-1 reproduction, against a throwaway fixture registry:
node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --set D.1 untested --note "reopening"
node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --check; echo $?   # 1
```

### Coverage Report

No coverage instrumentation in this repository. Coverage is argued by mutation instead: see the ten
proofs above, and the gap they did not cover.

---

## Recommendations

### Immediate Actions (Blocking)

1. **P1** — exclude `untested` from the kept predicate, and add the `untested`-on-`✅` test leg; mutation-prove the new leg (TASK-141-BUG-1).
2. **P2** — point both run-template evidence placeholders at the run-file basename (TASK-141-BUG-2).

### Short-term Actions (Non-Blocking)

1. Anchor `seqKey` to the run-file shape so an env label ending in `-NN` cannot read as a sequence (CR-4).
2. Consider having `SKILL.md` Step 4 assert the printed state matches the verdict sent, so the kept branch is observable to the caller and not only to a human reading stdout (CR-3).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH defect on the documented migration path of this task's own breaking change,
reproduced end to end, leaving the registry in a state its integrity gate rejects and the skill HALTs
on. One MEDIUM defect that defeats the collision fix through the template the agent actually fills in.
Everything else — the shared payload, the sequencing, the refusals, the doc sweep, the mutation proof —
verified clean.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-141-BUG-1 fixed and covered by a test; TASK-141-BUG-2 fixed.

---

**QA Report**: co-located at `task.141.qa.1.qa-next-targeted-item.md`
**Gate File**: co-located at `task.141.gate.1.qa-next-targeted-item.yml`
**Next Steps**: `/qa-fix` against the gate's two immediate actions, then QA cycle 2.
