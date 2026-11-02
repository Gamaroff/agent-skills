# QA Report: Task 246 - Wireframe mapping setup offer and first-run candidates

**Task**: [task.246.wireframe-mapping-setup-offer.md](./task.246.wireframe-mapping-setup-offer.md)
**Gate File**: [task.246.gate.1.wireframe-mapping-setup-offer.yml](./task.246.gate.1.wireframe-mapping-setup-offer.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS

---

## Executive Summary

All five phases are present and the 128 tests in the three changed suites pass. The independent diff
review found two medium correctness bugs in new engine code, and QA reproduced both: `detect` cannot
read a common `tsconfig.json`, and an empty `ui:` key makes `detect` offer a setup that `configure`
then refuses. Both break a stated criterion that no test reached. A security probe of `configure`'s
value guard (12 cases) found two low items.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 and CR-2 fixed and re-reviewed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases ticked (5/5)
- [x] Tests passing
- [x] Breaking changes documented (§ 5, two)
- [x] Code on `feature/task.246.wireframe-mapping-setup-offer` with open PR #793

### Testing Approach

- [x] Automated testing (unit, CLI through `runCli`)
- [x] Manual testing (CLI through the bundled path in scratch projects)
- [x] Security review (executed probe)
- [x] Code review (independent subagent)
- [x] Regression testing
- [ ] Performance testing (no timing criterion; the read bound is a unit test)

### Review Methodology

- Default strategy (5 phases, engine plus two skills): direct tools, plus one Explore subagent for the
  Step 3b diff review. Measured: dispatched 22:11:38Z, returned after 120 168 ms (completion notice
  `duration_ms`).
- Traceability mapper not dispatched: the criteria were mapped to named tests directly (table below),
  and every criterion names the test that holds it.
- Diff scope: `origin/develop...HEAD`, 13 files, 3 007-line patch. The 16 bundled
  `skills/*/references/wireframe-*` copies were excluded: `npm run bundle:check` (rc 0) shows they
  are byte copies of the reviewed sources.
- Code-review blocking: on (pipeline run-level `code_review_blocking=true`; the task's frontmatter
  sets no flag).
- CI on 91b0c468ca7d: pending (`qa-ci-read.sh`, read once; nothing enters the gate).
- Step 4b: run (runnable prose changed). Results below.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: decline, `detect`, `configure` | CONCERNS | 22 new tests pass | CR-1 (tsconfig parse), CR-2 (empty key), PROBE-1, PROBE-2 |
| Phase 2: catalogue candidates | PASS | 4 tests pass | Candidate tests use names absent from the task text (`Pill`, `chip`), with a `Rechip` control |
| Phase 3: setup offer in create-story / create-task | PASS | hooks test 24/24 | Step 3 runs `detect`; the six other hooked skills still gate; no develop step calls `detect`/`configure` |
| Phase 4: hand-written rows guide | PASS | doc links ok | Section exists; `MAP_HEADER` points at it by the consumer path |
| Phase 5: bundle, changelog, gate | PASS | `ci:fast` 6879/0 fail | Run with the symlinks moved aside |

**Overall Phase Completion**: 4/5 phases pass; Phase 1 has two medium findings.

---

## Success Criteria Verification

### Functional

| Criterion | Evidence | Status |
| --- | --- | --- |
| `resolve`, `ensure`, `record` answer `declined` and write nothing | test "a decline (false, off, OFF) makes ensure, resolve and record answer declined and write nothing" | PASS |
| `detect` with no `ui:` and a barrel → `unset` with a proposal naming it | test "detect proposes a src/components barrel, and reports configured and declined" | PASS |
| `detect` writes no file in any state | test "detect writes nothing, in any state" | PASS |
| `configure` appends a block read back with the given values; refuses `exists` | tests "configure appends a ui: block…", "configure refuses exists…" | PASS |
| `configure --decline` → `detect` says `declined` | test "configure --decline round-trips to declined…" | PASS |
| Partial block → `partial`; `configure` inserts only missing keys; then `configured` | test "configure inserts only the missing keys inside a partial block" | **CONCERNS**: fails for a key written with no value (CR-2, BUG-2) |
| Empty map + catalogue → `Button`-segment candidates, `source: catalogue` | test "resolve offers catalogue candidates on an empty map" | PASS |
| Near-miss candidates unchanged apart from `source` | test "near-miss output is unchanged apart from source…" | PASS |
| create-* step 3 runs `detect --json`, four states | hooks test "create-story and create-task step 3 run detect and branch on its four states" | PASS |
| Procedure defines the phrase; reason line names `declined` | hooks test "the procedure defines 'sets ui.wireframeMap' once…" | PASS |
| No develop step calls `detect`/`configure`, mutation-proven | hooks test "no develop pipeline step calls detect or configure"; implementation mutation 4c | PASS |

### Performance

| Criterion | Evidence | Status |
| --- | --- | --- |
| `detect` reads only its bounded set | test "detect reads only its bounded set: one level of packages/, docs/ to depth 4" | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Changed suites | all pass | 128/128 | PASS |
| `npm run ci:fast` (symlinks aside) | green | 6879 tests, 0 fail, 14 skipped | PASS |
| `bundle:check` | clean | rc 0 | PASS |
| `prettier --check` on changed code | clean | rc 0 | PASS |
| `npm run validate -- skills/create-story/` and `create-task/` | pass | rc 0, rc 0 | PASS |
| Every new branch tested and mutation-proven | yes | CR-1 and CR-2 are untested branches of new code | CONCERNS |

### Migration

| Criterion | Evidence | Status |
| --- | --- | --- |
| CHANGELOG names the offer, candidates and `false`/`off` | `CHANGELOG.md` `[Unreleased]` | PASS |
| `configuration.md` documents decline and the offer | `docs/reference/configuration.md` `ui.wireframeMap` row and setup paragraph | PASS |
| "Writing map rows by hand" exists and is linked from the map header | `wireframe-component-mapping.md` § and `MAP_HEADER` | PASS |

---

## Breaking Changes Validation

### Breaking Change: `ui.wireframeMap: false` and `off` change meaning
Documented: Yes (task § 5, CHANGELOG Changed, `configuration.md`)
Migration Path Provided: Yes (rename a map file literally named `off`)
Migration Tested: Yes (control: `offline.md` is still a path)
Consumer Code Updated: N/A
Notes: PR #793's body says "Breaking Changes: None" (QA-1, low).

### Breaking Change: candidates carry `source`
Documented: Yes (task § 5)
Migration Path Provided: Yes (read `source`; additive for JSON readers)
Migration Tested: Yes (near-miss output unchanged apart from `source`)
Consumer Code Updated: Yes (the procedure, the only caller)

**Overall Breaking Changes Assessment**: PASS (the PR body is corrected under QA-1)

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: `detect` cannot read a common tsconfig (TASK-246-CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.246.bug.1.tsconfig-comment-strip-eats-path-globs.md](./task.246.bug.1.tsconfig-comment-strip-eats-path-globs.md)
- **Observation**: Calibrated in a scratch project. The plain alias gives `"@app/components"`. Adding
  `"@app/*": ["src/*"]` and `"include": ["src/**/*.ts"]` gives `null`, and so do trailing commas.
- **Impact**: Most aliased TypeScript projects get no proposed import.
- **Recommendation**: a string-aware comment strip, plus trailing-comma removal.
- **Priority**: P2

**Issue: an empty `ui:` key makes `detect` and `configure` disagree (TASK-246-CR-2)**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.246.bug.2.empty-ui-key-detect-configure-disagree.md](./task.246.bug.2.empty-ui-key-detect-configure-disagree.md)
- **Observation**: `ui:` followed by `wireframeMap:` with no value: `detect` reports
  `state: partial` and `configure` refuses `exists` with key `wireframeMap`.
- **Impact**: The offer repeats on every wireframe and never succeeds.
- **Recommendation**: decide presence with `presentKeys` in `configure`, and replace the empty line
  in place.
- **Priority**: P2

### LOW Severity Issues (3)

- **TASK-246-PROBE-1**: `configure` accepts NEL (U+0085) but refuses U+2028 and U+2029. It is inert
  here, because yaml-subset reads the value back verbatim and no second key appears.
- **TASK-246-PROBE-2**: a value holding `"` (or `\`) is refused as `write-failed` after the restore,
  where a usage error naming the character would be clearer. The behaviour is safe.
- **TASK-246-QA-1**: PR #793 body under "Breaking Changes" says None; § 5 lists two.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3 (plus two advisory items below)

---

## NFR Assessment

### Performance — PASS
`detect` reads a bounded set (unit test). No timing criterion.

### Reliability — CONCERNS
`configure` restores the original bytes on a failed read-back. That is tested, and QA's probe saw it
twice (PROBE-2 and the whitespace-only `--map` of CR-3) with no file left behind. CR-2 puts a
hand-blanked key into a loop.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (run record `totals.executed`); escaped: 0
- `boundary: true`: `configure` refuses values before writing `skills-config.yaml`. The probe used the
  cli form, `--entry cli:shared/resources/wireframe-map.js` with
  `--argv ["configure","--barrel","src/c/index.ts","--map","{input}","--root","{fixture}","--json"]`,
  cases in [task.246.qa.1.configure-value-cases.json](./task.246.qa.1.configure-value-cases.json),
  and wrote the record [task.246.qa.1.security.run.json](./task.246.qa.1.security.run.json).
  Results:
  - LF, CR, CRLF, U+2028 and U+2029 were refused.
  - Plain, space, colon-hash, unicode and leading-dash paths were accepted.
  - NEL was accepted (PROBE-1, inert).
  - A double quote was overblocked (PROBE-2).
  - Sink `path` was used as the label. No corpus sink models "a value written into a YAML key", so
    the cases file replaces the corpus. A first run under `filename` was discarded because that sink
    turns each input into a file name and could not build the cases.
- Map and catalogue paths are not checked for containment. This is unchanged from before (future
  recommendation).

### Maintainability — PASS
The code is formatted, the tests are named for behaviour, and the docs are updated. CR-4 is an
advisory cleanup.

---

## Code Review

Independent Explore reviewer over the 3 007-line patch: 3 bugs and 1 cleanup. Every `anchor_check`
is `ok`. QA reproduced all four. Provenance: all four are in code this change adds, so none is
pre-existing.

**Correctness bugs (3):**
- [medium/high] `shared/resources/wireframe-map.js:1068`: the block-comment strip runs inside JSON
  strings, so a `/*` alias plus a `**/` glob, or trailing commas, defeat `JSON.parse` → string-aware
  strip. **Promoted: TASK-246-CR-1.**
- [medium/high] `shared/resources/wireframe-map.js:1348`: an empty key is missing to `detect` and
  present to `configure`, so they reach two states with one value → decide presence with
  `presentKeys`. **Promoted: TASK-246-CR-2.**
- [low/medium] `shared/resources/wireframe-map.js:1435`: a whitespace-only `--map` passes the
  presence check and ends as `write-failed` (QA saw exit 1, file restored) → trim first. Advisory.

**Cleanups (1):**
- `shared/resources/wireframe-map.js:1414`: the configure-only flags are now accepted, and ignored,
  by `ensure`, `resolve` and `record` (QA: `ensure --map x` → `unset`, exit 0) → accept them only for
  `configure`. Advisory.

**Probe findings mapped to the finding shape:** `configure.nel` (accepted; PROBE-1) and
`configure.double-quote` (overblocked; PROBE-2), both at `shared/resources/wireframe-map.js:1288`.

**Mutation proof (this cycle):**
mutation-proven: disabled the configure line-terminator guard (`wireframe-map.js:1288`) → "configure
refuses a value holding a line terminator, and writes nothing" (the only red) → covered

The implementation's 10 engine mutations and the hooks mutation are recorded in the task's
Implementation Record. They were not re-run here; this cycle has no fixes to prove.

**Step 4b (runnable prose):**
- `skills/create-story/SKILL.md`: changed blocks 0. The step 3 change is prose naming a command, not
  a fenced block. File level: 6 blocks (2 placeholder, 4 mutating) and `zero-blocks-executed`, all on
  unchanged blocks.
- `skills/create-task/SKILL.md`: changed blocks 0. File level: 6 blocks, all mutating
  (`no-executable-blocks`, information).
- `shared/resources/wireframe-component-mapping.md`: changed blocks 1, executed 0
  (`changed-blocks-not-executed`, medium confidence, advisory). The block is the command reference
  (lines 43–58), which has write commands and `[--exclude …]` syntax, so it was correctly refused as
  mutating. Its two new commands were run by hand through the bundled path
  `.agents/skills/create-story/references/wireframe-map.js` in a scratch project:
  - `detect` gave `unset` with a proposal;
  - `configure` gave `appended`;
  - `detect` then gave `configured`;
  - `configure --decline` gave `exists`.
  These runs are by hand and do not count toward `probes_executed`.
- Shells: bash and zsh available.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Existing wireframe-map behaviour (29 prior tests) | PASS |
| The six other hooked skills still gate on `ui.wireframeMap` | PASS |
| create-story / create-task protocol tests | PASS (HALT test re-anchored, mutation-proven in Step 3) |
| Whole fast gate (`ci:fast`, symlinks aside) | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/wireframe-map.js`, `shared/resources/tests/wireframe-map.test.mjs`,
`shared/resources/wireframe-component-mapping.md`, `skills/create-story/SKILL.md`,
`skills/create-task/SKILL.md`, `evals/shared/tests/wireframe-mapping-hooks.test.mjs`,
`tests/skill-protocol.test.js`, `docs/reference/configuration.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/wireframe-map.test.mjs evals/shared/tests/wireframe-mapping-hooks.test.mjs tests/skill-protocol.test.js
npm run validate -- skills/create-story/ ; npm run validate -- skills/create-task/
npm run bundle:check
./node_modules/.bin/prettier --check <changed code>
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed prose> --diff-base <merge-base> --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'cli:shared/resources/wireframe-map.js' --argv '[…]' --cases-file <cases> --record <record> --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 793
```

### Coverage Report
No coverage tool is configured for these suites. Coverage is argued from the branch-to-test mapping
above.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-246-CR-1: string-aware tsconfig parsing, with tests (P2).
2. TASK-246-CR-2: one definition of "present" in `detect` and `configure`, with tests (P2).

### Short-term Actions (Non-Blocking)
1. PROBE-1, PROBE-2 and QA-1 (low; cheap to fix in the same cycle).
2. CR-3 and CR-4 (advisory).
3. Containment for map and catalogue paths (pre-existing; follow-up).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium, high-confidence correctness bugs in new code, each against a stated
criterion. No high-severity issue and no NFR failure.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.246.qa.1.wireframe-mapping-setup-offer.md`
**Gate File**: co-located at `task.246.gate.1.wireframe-mapping-setup-offer.yml`
**Next Steps**: `/qa-fix` cycle for the five `top_issues`, then QA cycle 2 (full-diff refute pass).
