# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.9.open-coverage-fail-closed-reader.yml](./task.240.gate.9.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: PASS

---

## Executive Summary

Cycle 9 reviews cycle 8's fix (`a3b9c0d0`): the reader now takes the report's bytes and decodes
them strictly. BUG-11 is verified fixed. No probe found a count PyYAML disagrees with, at the byte
level or the text level. Two low cleanups are advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Gate | Status | Evidence |
| --- | --- | --- | --- |
| TASK-240-QA-14 (BUG-11): an invalid UTF-8 byte decoded leniently and counted | 8 | ✅ FIXED | The bug.11 reproduction reads `OPEN_COVERAGE=unreadable`, and stderr says `bad-encoding`. The reviewer compared the fatal decoder with Python's strict codec over 862,998 sequences: identical |
| Gate 8 CR-2 (low): the differential test header named `lenientFreeText` | 8 | ✅ FIXED | The header now says the reference models no leniency |

BUG-11 is closed (Status History row added).

---

## New Findings This Cycle

- **[low, cleanup]** `shared/resources/open-coverage.js:282`: a non-string input that is not a
  same-realm `Uint8Array` (an `ArrayBuffer`, a `DataView`, a cross-realm view) reads `no-section`.
  It fails closed, but the reason misleads. Routed to `future`.
- **[low, cleanup]** `shared/resources/open-coverage.js:88`: no test pins `ignoreBOM: true` on the
  bytes path. Routed to `future`.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on the feature branch with open PR #776

### Testing Approach

- [x] Automated Testing (unit, parity, differential, full fast gate)
- [x] Regression Testing (tracked corpus)
- [x] Security Review (boundary classification)
- [x] Code Review (Step 3b, one Explore reviewer)
- [x] Manual probing (the 54-shape hand probe, re-run)

### Review Methodology

Direct tools plus one read-only Explore reviewer. The reviewer was dispatched at 17:58:55Z and
returned at 18:02:21Z (`duration_ms` 186,419). This cycle ran from the qa-task instructions already
loaded in this session; the skill was not re-invoked.

`CI on a3b9c0d051cc: pending`

Re-review scope: files changed since gate 8 (head afccc7883d3e; 12 files) — default

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` file is in this cycle's change
set.

Traceability mapper: skipped. The Success Criteria are a checkbox list, not a table.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Precondition | PASS | Verified | Unchanged since gate 8 |
| Phase 1: The reader | PASS | Verified | The strict decode closes BUG-11 |
| Phase 2: The call site | PASS | Verified | Parity suite green; the §5c block is unchanged |
| Phase 3: Corpus, probe and docs | PASS | Verified | Corpus unchanged; bundle fresh; CHANGELOG names `bad-encoding` |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1: refusals read `unreadable`, counts read their count | PASS | Unit suite 123/0 with 4 new byte-level refusal rows. M36 and M37 each red (cycle 8) |
| SC-2: parity under bash and zsh | PASS | Parity suite green in `ci:fast` |
| SC-3: a failing reader reads `unreadable` | PASS | The `node`-stub case, green |
| SC-4: the tracked corpus reads the same | PASS | 187 reports: 0×128, 1×35, 2×5, unreadable×19, unchanged |
| SC-5: one `node` call at 5c | PASS | The parity assertion, green |
| SC-6: `ci:fast` | PASS | 6,710 pass, 0 fail (qa-fix cycle 8, attempt 2, at `a3b9c0d0`) |
| SC-7: `bundle:check` | PASS | 128 skills, 0 problems |
| SC-8: `validate` for develop-task and develop-story | PASS | Gate 8. Neither skill's SKILL.md changed since |
| SC-9: every new guard mutation-proven | PASS | M36 and M37 (cycle 8) |
| SC-10: CHANGELOG cites task.240 | PASS | `[Unreleased]` entry, `bad-encoding` named |
| SC-11: the phrase probe lists every site | PASS | qa-fix cycle 8 Probe: 4 hits, all unrelated |

---

## Breaking Changes Validation

No new breaking change this cycle. The printed contract is unchanged. A report holding an invalid
UTF-8 byte anywhere now reads `unreadable`, including a byte outside the block. That is
fail-closed, and the corpus holds none.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (2)

- CR-1: a non-view byte container reads `no-section`.
- CR-2: `ignoreBOM` is not pinned on the bytes path.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

One linear pass and one `node` call at 5c.

### Reliability — PASS

BUG-9, BUG-10 and BUG-11 are fixed. No probe found a count PyYAML disagrees with.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. `internal_reason`: `shared/resources/open-coverage.js#countOpenCoverage`
  reads a `/review-pr` report, an artefact this pipeline writes, and no corpus sink models that
  document. Text parsing only.

### Maintainability — PASS

The code, header, CHANGELOG and tests agree. Two advisory cleanups.

---

## Code Review

Reviewer probes, all read-only:

- The fatal `TextDecoder` and Python's strict UTF-8 codec, over 862,998 sequences: identical results.
- 15 byte injections inside a deciding value, checked against PyYAML: the reader counts only U+FFFD and an emoji, and PyYAML reads both.
- 18 input types: a Buffer and Uint8Array variants count the same as the string; everything else is refused.

**Correctness bugs (0):** none.

**Cleanups (2):**
- `shared/resources/open-coverage.js:282`: refuse a non-string, non-view input with its own reason, or decode it.
- `shared/resources/open-coverage.js:88`: add a BOM-prefixed byte row to the bytes-equal-text test.

Both anchors verified (`finding-anchors.js`, `reason: ok`). Neither entered `top_issues[]`: both are
cleanups.

`boundary: internal`, as recorded under Security.

Hand probe re-run (54 shapes): 0 wrong. Differential seeds 5, 99 and 4242 at 25,000 blocks: green.

mutation-proven: lenient decode inside the reader (M36, cycle 8) → `open-coverage.test.mjs` byte rows (5 red) → covered
mutation-proven: `utf8` read in the CLI (M37, cycle 8) → `open-coverage.test.mjs` CLI case (1 red) → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Tracked corpus (187 reports) | PASS: distribution unchanged |
| String-input path | PASS: hand probe and differential suite unchanged |
| Full fast gate | PASS: 6,710 pass, 0 fail |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/open-coverage.js`, its tests, and the bundled copies

### Test Commands Executed

```bash
command node shared/resources/open-coverage.js --file "$SCRATCH/cr1.md"         # unreadable, bad-encoding
command node "$SCRATCH/qa8-probe.mjs" "$PWD/shared/resources/open-coverage.js"  # 54 shapes, 0 wrong
OPEN_COVERAGE_DIFF_SEED={5,99,4242} OPEN_COVERAGE_DIFF_N=25000 \
  command node --test shared/resources/tests/open-coverage-differential.test.mjs # 3 x pass
git ls-files '*pr-review.*.md' | while read f; do command node shared/resources/open-coverage.js --file "$f"; done | sort | uniq -c
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 776      # pending
```

### Coverage Report

No line-coverage tooling for this module. The differential suite and the mutation proofs stand in
for it.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1 and CR-2 (cleanups).
2. Carried follow-ups: separate reasons for an unreadable file and an internal error; quote free text in the review-pr template.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding. The fail-closed contract held under every probe this cycle.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: none

---

**QA Report**: co-located at `task.240.qa.9.open-coverage-fail-closed-reader.md`
**Gate File**: co-located at `task.240.gate.9.open-coverage-fail-closed-reader.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise`.
