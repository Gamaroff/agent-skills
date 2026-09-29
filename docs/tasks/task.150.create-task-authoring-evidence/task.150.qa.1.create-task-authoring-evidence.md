# QA Report: Task 150 - create-task: anchored claims, a bounded title, and a --from-observation entry

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Gate File**: [task.150.gate.1.create-task-authoring-evidence.yml](./task.150.gate.1.create-task-authoring-evidence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Testing Completed**: 2026-09-28
**Gate Status**: FAIL

---

## Executive Summary

All five phases are implemented as planned, and every success criterion holds. `ci:fast`,
`bundle:check` and `validate` are green. The security probe of the delivered boundaries found one
real defect. `seedFromObservations`' id guard is present but inert: six malformed ids are accepted
and converted, so a park vector can name a **different** observation (HIGH). The seed also reads an
entry's status differently from the engine (MEDIUM). Both are in `skills/create-task/scripts/lib.js`
and are small fixes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED until TASK-150-BUG-1 is fixed and re-probed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases completed (38/38 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (one visible behaviour: `title-too-long` findings)
- [x] Code on the feature branch with open PR #512

### Testing Approach

- [x] Automated testing (unit, corpus, section-scoped presence, round trip)
- [x] Regression testing (`npm run ci:fast`)
- [x] Security review, measured (22 probes)
- [x] Code review (Step 3b, independent Explore subagent)

### Review Methodology

Direct tools, plus one independent Explore subagent for the diff code review (Step 3b). The
traceability mapper was not dispatched: Success Criteria is a checklist, not a table.
First review, whole-branch diff (`origin/develop...HEAD`, bundled `references/` copies excluded
because `bundle:check` proves them identical to their sources).

Step 4b (runnable prose): create-task `SKILL.md` has 5 bash blocks, all refused as mutating
(`no-executable-blocks`: the new blocks use `source` and `node`). QA therefore ran the § 1.1
resolve-and-scan block **by hand** from the repository root under both bash and zsh. Both returned
`reason: ok` with 56 entries. review-task `SKILL.md` reports `zero-blocks-executed` (16 blocks,
1 placeholder, 15 mutating). The same result on `origin/develop` makes it **pre-existing**, not
caused by this change.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: Title bound | PASS | Verified | `checkCardTitle` + `CARD_TITLE_MAX` beside `checkCardSections`. `preflight()` reads the frontmatter; the scope line keys on `titleChecked`. Task.140 (368 chars) now reports `title-too-long` naming its H1 |
| 2: Evidence rules | PASS | Verified | § 3.5 obs #127 and #124 bullets; Section 3 paragraph |
| 3: Discriminator rule | PASS | Verified | § 3.5 obs #135 bullet; review-task check 13 + patterns line |
| 4: `--from-observation` | FAIL | Partial | § 1.1, § 5 step 2b, exceptions, `lib.js` seed; **id guard inert (BUG-1), status divergence (BUG-2)** |
| 5: Docs and validation | PASS | Verified | CHANGELOG cites obs #124, #127, #128, #135, #147 |

**Overall Phase Completion**: 4/5 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| Over-bound title: one `title-too-long` naming the H1, exit 0, 1 under `--strict` | yes | yes (7 tests) | PASS |
| No title outside `LEGACY_LONG_TITLES` over the bound; every listed one still over | yes | 43 listed, ratchet green | PASS |
| Section-scoped rules (§ 3.5 ×3, Section 3, review-task Step 3) | yes | 7 tests; moving the obs #135 bullet to § 4 goes red | PASS |
| `seedFromObservations` refuses non-open, `title: null` over bound, park vectors accepted by the real engine | yes | yes, but the id guard is inert on malformed ids (BUG-1) | CONCERNS |
| Offline, no network / `gh` | yes | yes | PASS |
| Corpus ratchet adds one parse per document | yes | yes | PASS |
| Mutation table run and recorded | 13 rows | 15 rows recorded in the implementation report | PASS |
| `CARD_TITLE_MAX` defined once | 1 | `jira-sync.js:1950` plus generated copies | PASS |
| `ci:fast`, `bundle:check`, `validate` clean | clean | 4385 pass / 0 fail; 0 problems; both skills ✓ | PASS |
| CHANGELOG cites task 150 and the five obs ids | yes | yes | PASS |
| `authoring-card-preflight.md` documents the finding | yes | yes | PASS |
| task.123 hand run recorded | yes | yes (`e0881adb`) | PASS |

---

## Breaking Changes Validation

### Breaking Change: `card-preflight.js` can report `title-too-long`

Documented: Yes. Migration Path Provided: Yes (the `Fix:` line). Migration Tested: Yes (task.140
real document). Consumer Code Updated: N/A (no shipped caller passes `--strict`:
`git grep -n -- '--strict' -- 'skills/*/SKILL.md' | grep card-preflight` returns nothing).

**Overall Breaking Changes Assessment:** PASS

---

## New Findings This Cycle

First review. See Issues Found.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the seed id guard accepts ids that park a different entry**

- **Severity**: HIGH
- **Category**: Functional / integrity
- **Bug Report**: [task.150.bug.1.seed-id-guard-inert.md](./task.150.bug.1.seed-id-guard-inert.md)
- **Observation**: `Number(frontmatter.id)` plus `Number.isInteger` accepts `"0x10"` → 16,
  `"1e2"` → 100, `""` → 0, `"-3"`, `"0"` and `" 12 "`. The engine parses `id: 0x10` as the string
  `"0x10"`, so a hand-edited entry reaches the seed in that shape.
- **Impact**: `set-status --id 16` parks an unrelated observation on the new task.
- **Recommendation**: accept only a positive integer number or a `/^[1-9][0-9]*$/` string.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: the seed reads status differently from the engine**

- **Severity**: MEDIUM
- **Bug Report**: [task.150.bug.2.seed-status-diverges-from-engine.md](./task.150.bug.2.seed-status-diverges-from-engine.md)
- **Observation**: `" open "` is open to the engine's `statusOf` and refused by the seed.
- **Recommendation**: reuse `statusOf` from the bundled engine.

### LOW Severity Issues (4, advisory — from the code review)

See Code Review CR-2, CR-3, CR-4, and CR-1, which is medium severity but medium confidence.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 4 (advisory)

---

## NFR Assessment

### Performance — PASS

The corpus ratchet does one frontmatter parse per document in a walk that already reads each file.
The preflight adds one regex over the body.

### Reliability — PASS

Parking runs only after both files exist, and a failed park never blocks the document. The round
trip runs through the real engine in a repo-local workspace. It is green under `TMPDIR=/tmp` as well
as the macOS default, so there is no platform variance.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 22 (run record `task.150.qa.1.security.run.json`, `totals.executed`)
- The boundary rule fired. `seedFromObservations` states in its doc comment and Success Criteria
  that it refuses non-open entries, and `checkCardTitle` is an exported validator. The engine
  `security-probe.mjs` probed three controls, with custom cases, through a wrapper that adapts each
  to the one-input predicate shape:
  - `titleWithinBound` (`checkCardTitle`): **engages**, 5/5. That includes 51 astral characters
    (102 UTF-16 units), flagged because the bound counts code units.
  - `seedAcceptsStatus`: **engages**, 7/8. It over-blocks `" open "` (BUG-2).
  - `seedAcceptsId`: **present-but-inert**, 6 of 7 hostile ids accepted (BUG-1).
- No network, credential or shell surface. The data is operator-authored and local.

### Maintainability — PASS

`CARD_TITLE_MAX` is defined once, the tests are section-scoped, and 15 mutation proofs are
recorded. There are two advisory cleanups (CR-5, CR-6).

---

## Code Review

Advisory except where promoted. This run passed `code_review_blocking=true`, but no code-review
finding is both `bug` and `confidence: high`, so none entered the gate. Both gate entries come from
the executed probe.

**Correctness bugs (4):**

- [medium/medium] `shared/resources/jira-sync.js:1962`. CR-1: the bound measures the raw frontmatter
  title, while GitHub publishes `[Task N] ` plus the bare title, and the seed counts the prefix. A
  100-character title with no prefix passes the check and publishes at about 111 characters. Fix:
  define one measured string and pin it with a test. The task's convention puts `[Task N]` in the
  frontmatter title, so today the two agree on every convention-following document. Deferred as
  advisory.
- [low/medium] `shared/resources/jira-sync.js:1964`. CR-2: the fix offers the H1 verbatim, and task
  H1s carry `Technical Task: `. Fix: strip known H1 template prefixes.
- [low/medium] `skills/create-task/SKILL.md:700`. CR-3: the § 5 step 2b block hard-codes `--id 124`
  and `task.150`, and an agent that runs it as written parks the wrong entry. Fix: use placeholders
  or the seed's `park` vectors verbatim.
- [low/low] `skills/create-task/SKILL.md:200`. CR-4: step 3 reads `${OBS_LOG_DIR}` in a later shell
  than the resolver's. Fix: say to source the resolver in the same block, or pass `--workspace`.

**Cleanups (2):**

- `shared/resources/tests/card-preflight.test.mjs:373`. CR-5: the "only the title finding was
  filtered" assertion is tautological (complementary filters over one array).
- `skills/create-task/scripts/lib.js:17`. CR-6: loads all of `jira-sync.js` for one constant.

**Security probe (Step 3b.3):** `boundary: true`, `probes_executed: 22` (copied from the run
record's `totals.executed`). Reproduced: `id.empty`, `id.hex`, `id.exp`, `id.neg`, `id.zero` and
`id.ws` on `seedAcceptsId`. Over-blocked: `st.open-ws` on `seedAcceptsStatus`.

**Provenance (5b):** both probe findings are in code this branch adds (`seedFromObservations` does
not exist on `origin/develop`), so both are new.

**Mutation proofs (3c):** the developer's 15 proofs are recorded in the implementation report
(Step 3). No fixes were made this cycle, so nothing was re-proved.

- mutation-proven: disable the non-open status guard → `from-observation.test.js` refusal case → covered
- mutation-proven: drop `--parked-until` from `park[]` → round trip → covered
- mutation-proven: bound `<=` → `<` → `card-preflight.test.mjs` exactly-100 boundary → covered

The probe shows that the id guard has **no** covering test: no test feeds a malformed id.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Card preflight parity with the four sync paths | PASS (parity shape + the four-script scope test) |
| Sync `--check-card` wording unchanged | PASS (`describeCardScope` without `titleChecked`) |
| Bundled copies | PASS (`bundle:check` 0 problems; copy-identity test) |
| Full suite | PASS (`ci:fast` 4385 / 0) |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/card-preflight.test.mjs shared/resources/tests/card-preflight-corpus.test.mjs tests/create-task-authoring-evidence.test.js skills/create-task/tests/from-observation.test.js   # 40/40
TMPDIR=/tmp command node --test <the same four files>   # 40/40 — platform variance
npm run bundle:check                                     # 0 problems
python3 skills/create-skill/scripts/quick_validate.py skills/create-task    # ✓
python3 skills/create-skill/scripts/quick_validate.py skills/review-task    # ✓
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-task/SKILL.md --copy-as docs:docs --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry '<wrapper>#seedAcceptsId' --cases-file <id cases> --record docs/tasks/task.150.create-task-authoring-evidence/task.150.qa.1.security.run.json --json
```

### Coverage Report

No coverage tooling for Node test files in this repository. Every new export has direct tests, and
the uncovered guard is named above.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-150-BUG-1: a strict positive-integer id guard, plus the six probe inputs as refusal tests.
2. TASK-150-BUG-2: reuse the engine's `statusOf`.

### Short-term Actions (Non-Blocking)

1. CR-3 and CR-4: fix the executed-prose hazards in § 1.1 and § 5 step 2b. They are cheap, and they
   sit in the same file the fix cycle touches.
2. CR-1 and CR-2: define the measured title string, and strip the H1 template prefix.
3. CR-5: replace the tautological parity assertion with an independent one.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: deterministic rule 1. There is a HIGH `top_issues` entry, from an executed probe with
6 reproduced hostile inputs.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-150-BUG-1 fixed and re-probed

---

**QA Report**: co-located at `task.150.qa.1.create-task-authoring-evidence.md`
**Gate File**: co-located at `task.150.gate.1.create-task-authoring-evidence.yml`
**Next Steps**: `/qa-fix` (Step 5b), then QA cycle 2 (a refute pass plus a safety re-probe of the seed).
