# QA Report: Task 42 - Canonical Change Log spec and shared engine

**Task**: [Link to task document](./task.42.change-log-spec-and-engine.md)
**Gate File**: [task.42.gate.1.change-log-spec-and-engine.yml](./task.42.gate.1.change-log-spec-and-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**Testing Completed**: 2026-08-12
**Gate Status**: FAIL

---

## Executive Summary

The task delivers what it set out to deliver: one canonical spec, one engine, 33 tests, the
standards sweep, and a clean extraction that leaves `jira-sync.js`'s callers untouched. The
documentation quality is the best I have reviewed in this repo — every defect class the module
guards is named in the header comment with the failure it prevents.

It fails the gate on **two high-confidence correctness bugs, both in the fence guard the task
itself introduced**. The guard was applied where a Change Log block *starts* but not where it
*ends*, and the dual-legacy collapse silently depends on which order the two legacy blocks
appear in. The second is the more serious for having a passing test that covers only the working
ordering.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5, no unchecked boxes)
- [x] Tests passing — 1137/1137
- [x] Breaking changes documented (three, with migration paths)
- [x] Code on feature branch with open PR (#209, OPEN, head `6aa4320`)

### Testing Approach

- [x] Automated Testing (unit, integration, contract)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (adversarial, against the engine's own edge cases)
- [ ] Performance Testing — N/A per the task; string manipulation on single documents
- [ ] Manual Testing — N/A; no UI surface

### Review Methodology

**Direct tools.** Phase 0 found no prior gate, so this is a fresh review. The traceability mapper
pre-step was not dispatched; qa-task's internal criteria mapping was used, which is the
documented fallback. The code review was performed by constructing executable probes against the
engine's stated invariants rather than reading the diff for smells — appropriate here because the
unit under review is a pure function with a written specification, so every claim in the spec is
directly testable.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Write the canonical spec | PASS | N/A (docs) | `document-change-log.md` covers all eight required elements: section, four columns, heading tolerance, marker pair, `updated:` rule, moment table, both exclusions, config keys. Modelled on `sign-off.md` as instructed. |
| Phase 2: Extract and generalise the engine | **CONCERNS** | Partial | Engine exists and exports all six required functions. `jira-sync.js` delegates and re-exports correctly. **Two correctness bugs found — see Issues.** |
| Phase 3: Unit tests | **CONCERNS** | Partial | 33 cases, well organised by defect class. **The dual-legacy case tests only one of two orderings and passes while the other fails.** |
| Phase 4: Standards, configuration, AGENTS.md | PASS | Verified | All eight files updated. Each links the spec rather than restating it, as the plan required. `epic-documents.md` gained the `## Required body sections` it lacked. |
| Phase 5: Bundle and verify | PASS | Verified | `change-log.js` distributed to all 14 skills transitively; second `npm run bundle` yields an empty diff; no `references/` file hand-edited. |

**Overall Phase Completion**: 3/5 passed, 2 with concerns

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `document-change-log.md` defines section, columns, heading tolerance, markers, `updated:` rule, moment table, exclusions | All 8 | All 8 present | PASS |
| `change-log.js` exports `upsertChangeLog`, `findChangeLog`, `buildChangeLogBlock`, `fmtEntry`, `migrateLegacyEntries`, `bumpUpdated` | 6 | 6 (+8 more) | PASS |
| `### Change Log` under `## Notes & Updates` updated in place, no second block, nothing at top of body | Yes | Yes — verified | PASS |
| **Both legacy marker pairs migrate in place, four columns, no duplication** | Yes | **Only when jira precedes github** | **FAIL** |
| `jira-sync.js` still exports the four old names with existing signatures | Yes | Yes — verified by require | PASS |
| `upsertChangeLog` on this task's own document leaves fenced samples byte-identical | Yes | Yes — verified | PASS |

### Performance

| Criterion | Target | Actual | Status |
|---|---|---|---|
| No test slows by more than a second | <1s delta | Suite 34.4s vs 33.7s baseline, with 33 tests added | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `npm test` passes | Green | 1137/1137 | PASS |
| `node --test change-log.test.mjs` | Green | 33/33 | PASS |
| `npm run bundle` idempotent | Empty diff | Empty | PASS |
| No `skills/*/references/` file hand-edited | 0 | 0 — all 28 bundler-generated | PASS |
| ~~No pre-existing test modified except `ROW`~~ | — | **Not met — 4 more; documented** | See note |

> **On the modified-tests criterion.** The task document already records this as not met and
> explains why, which is the correct handling. I verified the claim independently: the four
> changed assertions are `changelog must precede ## Section` (×2) and `out.includes(lib.CL_START)`
> (×2). Both assert behaviour Breaking Changes 1–2 deliberately remove. Neither was weakened —
> each still asserts a property, against the new documented behaviour. `jira-sync-sections` and
> `jira-sync-card-summary` are untouched and green, which preserves the behaviour-preservation
> evidence the criterion was reaching for. **No finding.**

### Migration

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `configuration.md` documents both `change-log.*` keys with defaults | Yes | Yes, with rationale for `true` default | PASS |
| All five `docs/standards/*-documents.md` name the section | 5 | 5 | PASS |
| `AGENTS.md` TL;DR pointer | Yes | Yes | PASS |
| `CHANGELOG.md` updated | Yes | Yes | PASS |

---

## Breaking Changes Validation

### Breaking Change 1: four columns, not two

Documented: Yes · Migration path: Yes (`migrateLegacyEntries` widens rows) · Tested: Yes ·
Consumer code updated: N/A — the shim absorbs it
**Assessment**: PASS. Verified that `parseLegacyRow` handles both 2-column and already-canonical
4-column input; the fidelity test's `ROW` fixture exercises the latter.

### Breaking Change 2: insertion fallback is anchor-then-EOF

Documented: Yes · Migration path: Yes (misplaced legacy block is updated in place) · Tested: Yes
(all three anchors + EOF + missing anchor) · Consumer code updated: 4 tests, documented
**Assessment**: PASS.

### Breaking Change 3: fenced and inline-code matches ignored

Documented: Yes · Migration path: N/A (strictly narrowing) · Tested: Yes (7 cases) ·
Consumer code updated: N/A
**Assessment**: **CONCERNS** — the rule is correct and well argued, but its implementation is
incomplete. See TASK-42-BUG-1: the guard is absent from the block-end scan, which is the second
place a fence can mislead the engine.

**Overall Breaking Changes Assessment**: CONCERNS

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: Heading-block end scan ignores fences**
- **Severity**: HIGH · **Category**: Functional (correctness)
- **Bug Report**: [task.42.bug.1.heading-block-end-scan-ignores-fences.md](./task.42.bug.1.heading-block-end-scan-ignores-fences.md)
- **Observation**: `findChangeLog` filters the heading match through `insideFence`
  (`change-log.js:296`) but the end-scan at `:305-309` matches `nextRe` against raw text. A
  fenced `##` line inside a Change Log section ends the block there.
- **Impact**: The rewrite consumes the opening fence, leaving an orphaned closing fence — every
  later fence in the file is mis-paired — and strands a Change Log row outside the block, where
  the next write will not carry it. Silent; nothing errors.
- **Recommendation**: Reuse the `ranges` already computed at `:266`; skip `nextRe` matches inside
  a protected range.
- **Priority**: P1

**Issue: Dual-legacy collapse is order-dependent**
- **Severity**: HIGH · **Category**: Functional (correctness)
- **Bug Report**: [task.42.bug.2.dual-legacy-collapse-is-order-dependent.md](./task.42.bug.2.dual-legacy-collapse-is-order-dependent.md)
- **Observation**: `findChangeLog` picks the first pair in `LEGACY_MARKER_PAIRS` array order
  (`:275`), not the first by document position; `collapseOtherLegacyBlocks` only receives
  `content.slice(found.end)` (`:371`). With github before jira, the github block is never
  examined.
- **Impact**: Two Change Logs survive and superseded markers remain — the exact condition §2
  Problem 3 exists to remove — failing a stated Success Criterion. Masked by a green test that
  builds only the working ordering.
- **Recommendation**: Select the block with the lowest start index; collapse across the whole
  document. Parameterise the test over both orderings.
- **Priority**: P1

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (2)

- `insideFence` (`change-log.js:189`) now receives `protectedRanges` (fences **and** inline
  code). The name understates what it checks and will mislead the next reader.
- `migrateLegacyRow` (`:225`) treats any row with fewer than 4 cells as the 2-column shape, so a
  3-cell row silently loses cell 2. Verified: `| 2026-01-01 | Desc | Extra |` →
  `| 2026-01-01 |  | Desc | sync-jira-task |`. No such rows are known to exist; worth a comment
  at minimum.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

Same string work in a different file, as the task predicted. `fencedRanges` and
`inlineCodeRanges` are single passes over lines; the inline pairing loop is O(runs²) per line but
bounded by backtick count. Suite time 34.4s against a 33.7s baseline while adding 33 tests —
within noise, and comfortably inside the task's "no test slows by more than a second".

### Reliability — FAIL

Both HIGH issues are **silent** failure paths: no exception, no warning, and in BUG-2's case a
passing test actively signalling health. For a module whose stated purpose is to preserve
history, an under-match that detaches rows (BUG-1) and a collapse that leaves duplicates (BUG-2)
go to the core of the reliability claim. The task's own §10 Risk 2 anticipated exactly this class
("under-matching loses history") and rated its impact High.

### Security — PASS

Pure string manipulation: no I/O, network, shell, `eval`, or filesystem access. The only
constructed regex interpolates `level`, an integer captured from `/^(#{2,3})/`, so it is bounded
to 2–3. No new dependencies. No secrets or credentials touched.

### Maintainability — PASS

The strongest dimension of this change. The header comment enumerates each defect class with the
concrete failure it prevents rather than describing the code; `bodyStart`'s original comment is
preserved verbatim as the reason the function exists; tests are grouped A–G by defect class so a
future reader can find the guard for a symptom. Spec and engine cross-link. The task document
records its own deviations rather than quietly meeting a reworded criterion — which is what made
the modified-test question quick to adjudicate.

---

## Code Review

Run against the branch diff (`develop...HEAD`, 45 files). `code_review_blocking=true` was passed
by the pipeline, and no `code_review_blocking: false` in frontmatter, so **CR_BLOCKING resolves
to true** and high-confidence bug findings were promoted to gate `top_issues`.

**Correctness bugs (2):**

- [high/high] `shared/resources/change-log.js:305-309` — heading-block end scan matches `nextRe`
  against raw text with no `protectedRanges` filter → block ends inside a fence, consuming the
  opening fence and detaching a row. **Promoted to gate as TASK-42-BUG-1.**
- [high/high] `shared/resources/change-log.js:275,371,418` — block selection is by
  `LEGACY_MARKER_PAIRS` array order rather than document position, and collapse scans only the
  tail slice → github-before-jira leaves two blocks. **Promoted to gate as TASK-42-BUG-2.**

**Cleanups (2):**

- `shared/resources/change-log.js:189` — `insideFence` now takes fences *and* inline-code ranges;
  rename to `insideProtected` (or similar) to match.
- `shared/resources/change-log.js:225` — the `cells.length >= 4` branch means a 3-cell row falls
  into the 2-column path and drops a cell. Document the assumption or handle explicitly.

Both cleanups are advisory and do not affect the gate.

---

## Regression Testing

| Area | Result |
|---|---|
| `jira-sync-sections.test.mjs` | PASS — untouched |
| `jira-sync-card-summary.test.mjs` | PASS — untouched |
| `jira-sync-publishing-fidelity.test.mjs` | PASS — `ROW` fixture + 2 documented assertions changed |
| `sync-jira-{epic,story,task}` suites | PASS — 1 documented assertion changed in two of them |
| `tests/bundle-mjs.test.js` drift guard | PASS |
| `tests/executable-instructions.test.js` doc links | PASS — the new spec's links resolve |
| Full suite | 1137/1137 |

The two untouched jira-sync suites passing is the behaviour-preservation evidence the task named,
and it holds.

---

## Test Artifacts

### Files Reviewed

- `shared/resources/change-log.js` (new, 480 lines) — read in full, line by line
- `shared/resources/document-change-log.md` (new) — checked against all eight required elements
- `shared/resources/jira-sync.js` — delegation shim and export surface
- `shared/resources/tests/change-log.test.mjs` (new, 33 cases)
- `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`
- `skills/sync-jira-{story,task}/tests/*.test.js`
- All eight documentation files from Phase 4

### Test Commands Executed

```bash
npm test                                              # 1137 passing, 0 failing
node --test shared/resources/tests/change-log.test.mjs # 33/33
node --test 'shared/resources/tests/jira-sync-*.test.mjs'
npm run bundle && git diff --stat                     # empty — idempotent
node <probe scripts>                                  # adversarial edge-case probes
```

### Coverage Report

No coverage instrumentation is configured for this repo's `node --test` suites; coverage was
assessed structurally instead. Every exported function in `change-log.js` has at least one
direct test. The gap this review found is not an uncovered function but an **uncovered input
shape** in two covered functions.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-42-BUG-1** — apply `protectedRanges()` to the heading-block end scan (`change-log.js:305-309`), with a regression test.
2. **TASK-42-BUG-2** — make block selection positional and collapse across the whole document (`:275`, `:371`, `:418`); parameterise the dual-legacy test over both orderings.

### Short-term Actions (Non-Blocking)

1. Rename `insideFence` to reflect that it now covers inline code too.
2. Document or handle the 3-cell legacy row case in `migrateLegacyRow`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Two high-confidence correctness bugs, both promoted to `top_issues` under
`code_review_blocking`, and Reliability assessed FAIL. Deterministic rule 1 (any high-severity
top issue → FAIL) and rule 3 (any NFR FAIL → FAIL) both apply.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-42-BUG-1 and TASK-42-BUG-2 fixed and covered by regression tests.

Worth stating plainly: this is a FAIL on two edge-case defects in an otherwise strong change.
The architecture, the extraction, the spec, and the documentation are all sound, and the fixes
are localised — one guard reused in a second place, and one selection made positional. Neither
requires rethinking the design.

---

**QA Report**: co-located at `task.42.qa.1.change-log-spec-and-engine.md`
**Gate File**: co-located at `task.42.gate.1.change-log-spec-and-engine.yml`
**Next Steps**: qa-fix cycle 1 — address both HIGH issues, then re-review.
