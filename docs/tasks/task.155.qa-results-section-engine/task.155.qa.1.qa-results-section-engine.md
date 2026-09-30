# QA Report: Task 155 - QA Testing Results section engine

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.1.qa-results-section-engine.yml](./task.155.gate.1.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 1 (develop-task Step 5a, `code_review_blocking=true`) over PR #537 at `6d6c166d`. The
engine, both Step 12 wirings, the corpus guard, the task.65 repair and the bundles all work as the
task specifies, and every stated success criterion is met. Executing the engine against shapes the
unit tests do not cover found two medium correctness defects: a rendered section carrying a second
H2 is accepted and stacks that H2 on every later write, and a section sitting between a
**marker-less** `## Change Log` heading and its table is "replaced" by deleting the table rows.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix REL-001 and REL-002 in `/qa-fix`)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 checked)
- [x] Tests passing
- [x] Breaking changes documented (none to a public contract; the `multiple` refusal is stated in § 5)
- [x] Code on feature branch `feature/task.155.qa-results-section-engine` with open PR #537

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, wiring, corpus; full `npm run ci:fast`)
- [x] Performance Testing (task test files timed)
- [x] Regression Testing (full suite, corpus-wide write simulation)
- [x] Security Review (reasoned)
- [x] Code Review (independent Explore subagent, Step 3b)

### Review Methodology

Direct tools plus one independent read-only Explore code reviewer (Step 3b). Small task (4 phases,
Low/Medium risk), first review: default strategy. In addition to the task's own tests, the engine
was executed against 12 hand-built edge-case documents (CRLF, section at EOF without a trailing
newline, legacy marker pairs, change-log block preceding the section, frontmatter-less document,
H3 hand-written change log, section inside the block before / after its heading, a section ending
in `---`, a section carrying an extra H2, two marker blocks) and a whole-corpus write simulation
(192 tracked task/story documents: write, re-write, re-write; asserted one section, idempotence,
marker counts preserved and all non-QA content preserved).

Step 4b: ran `qa-execute-snippets.mjs` over both changed `SKILL.md` files under bash and zsh —
qa-task 1 runnable / 3 placeholder / 16 mutating, qa-story 1 / 4 / 14, zero findings. The new
Step 12 writer block is classified `mutating` (it writes the document), so Step 4b does not execute
it; `tests/qa-results-step12-wiring.test.js` executes it verbatim from a consumer-shaped cwd, and
that test passes.

Autonomous-mode note: the observe-work Session Start Protocol was not run in this subagent — the
orchestrator restricted writes to the QA artefacts and task document, and the observation log is
outside that set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the engine | CONCERNS | Verified | All five reasons, prefix match, block-start bound, separator trim present; REL-001 / REL-002 / REL-003 are edge shapes it mishandles |
| Phase 2: wire the QA skills | PASS | Verified | Both blocks bind their own file var, halt on refusal, executed by the wiring test; bundles fresh |
| Phase 3: corpus guard and repair | PASS | Verified | task.65 keeps the gate-3 copy (highest of gates 1–3); guard passes, floor 50 vs 154 scanned |
| Phase 4: docs and validation | PASS | Verified | CHANGELOG `[Unreleased]` › Changed cites task 155; validate / bundle:check clean |

**Overall Phase Completion**: 4/4 phases delivered; Phase 1 carries two medium defects.

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Each reason in its § 3 case; nothing written on `multiple` / `bad-section` | Yes | Yes (unit tests A1–A5, E1) | PASS |
| Fenced / inline-code heading never found or replaced | Yes | Yes (C1) | PASS |
| Step 12 writes through the engine; executed call leaves one section | Yes | Yes (wiring test, both skills) | PASS |
| Corpus guard passes after repair, fails naming the file when re-stacked | Yes | Yes (passes; mutation recorded in implementation report) | PASS |

**Performance:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Engine + corpus tests | < 2 s | ~1.1 s for all three task test files (29 tests) | PASS |
| No network access | None | None (pure module, `fs` only in the Step 12 caller) | PASS |

**Code Quality:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No second fence scanner | Imports from `change-log.js` | `protectedRanges`, `insideProtected`, `bodyStart`, `findChangeLog`, `ANCHORS` imported | PASS |
| New assertions mutation-proved | Recorded | Implementation report records M1–M8, corpus and W1–W4 | PASS |
| `ci:fast`, `bundle:check`, `validate` | Clean | `ci:fast` exit 0 (Prettier clean; 4744 tests, 4743 pass, 0 fail, 1 skipped); `bundle:check` 0 problems; `validate` qa-task and qa-story pass | PASS |

**Migration:** CHANGELOG entry present (PASS). Observation #178 → `actioned` is post-merge and open by design.

---

## Breaking Changes Validation

### Breaking Change: a stacked document now refuses (`multiple`) instead of gaining another copy
Documented: Yes (§ 5, CHANGELOG)
Migration Path Provided: Yes — the halt message states the repair rule (keep the copy linking the highest gate)
Migration Tested: Yes — wiring test "halts on stacked sections and writes nothing"
Consumer Code Updated: Yes — task.65 repaired; no other tracked document stacks (corpus guard)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue REL-001 (CR-1): a section carrying a second H2 is accepted, and that H2 stacks on every later write**
- **Severity**: MEDIUM · **Category**: Functional · **File**: `shared/resources/qa-results.js:185`
- **Observation**: `normaliseSection` only checks that the rendered text holds exactly one `## QA Testing Results`. A section that also carries another H1/H2 (qa-story's Step 12 renders `## QA Completion Summary` directly after it, item b) passes as `created`; the next write's span ends at that H2, so the old H2 block is left behind and a new one is appended each cycle.
- **Repro**:
  ```bash
  command node -e 'const Q=require("./shared/resources/qa-results.js");let d="# T\n\n<!-- change-log-start -->\n\n## Change Log\n\n| Date | Version | Description | Author |\n|---|---|---|---|\n| 2026-01-01 | 1 | a | b |\n\n<!-- change-log-end -->\n";for(const n of [1,2,3]){const r=Q.upsertQaResults(d,`## QA Testing Results\n\nCycle ${n}.\n\n## QA Completion Summary\n\ndone ${n}\n`,{docType:"story"});d=r.content;console.log(r.reason,(d.match(/^## QA Completion Summary/gm)||[]).length)}'
  # created 1 / replaced 2 / replaced 3
  ```
- **Impact**: the stacking this engine exists to remove, reached through the input it validates. The header comment's table promises `bad-section` for "the new section is not one section".
- **Recommendation**: refuse as `bad-section` unless the section's span in the normalised body reaches the end of the body (no unprotected H1/H2 and no change-log marker after its own heading); add a unit test.

**Issue REL-002 (CR-2): a section between a marker-less `## Change Log` heading and its table is "replaced" by deleting the table**
- **Severity**: MEDIUM · **Category**: Functional / data loss · **File**: `shared/resources/qa-results.js:114`
- **Observation**: `insideChangeLog` requires `hasMarkers`. With a hand-written `## Change Log` (no markers) and the obs #178 shape (section written after the heading), the section counts as outside the log, its span runs to the next H2 or EOF — swallowing the log's table — and `replaced` drops every Change Log row. The `RE_LOG_HEADER` cutoff that protects the marker case is applied only when `insideChangeLog`.
- **Repro**:
  ```bash
  command node -e 'const Q=require("./shared/resources/qa-results.js");const r=Q.upsertQaResults("# T\n\n## Body\n\nx\n\n## Change Log\n\n## QA Testing Results\n\nold\n\n| Date | Version | Description | Author |\n|---|---|---|---|\n| 2026-01-01 | 1 | a | b |\n","## QA Testing Results\n\nnew\n",{docType:"task"});console.log(r.reason,JSON.stringify(r.content))'
  # replaced "# T\n\n## Body\n\nx\n\n## Change Log\n\n## QA Testing Results\n\nnew\n"
  ```
- **Impact**: the task's own rollback plan names "lost section content" a critical trigger. The task states most corpus documents carry no change-log markers, so the marker-less shape is the common one; the corpus guard would not flag it either (it relies on the same `insideChangeLog`). No tracked document has this shape today (corpus simulation clean).
- **Recommendation**: treat a section that directly follows a marker-less change-log heading as inside the log (relocate it), or apply the log-header cutoff to every span; add the marker-less twin of unit test D1. The reviewer returned this at `confidence: medium`; QA reproduced it deterministically and promotes it on its own evidence.

### LOW Severity Issues (5)

- **REL-003 (gate entry, low): a section inside the later of two change-log marker blocks deletes that block's end marker.** `findChangeLog` returns the earliest block, so `insideChangeLog` is false for a section inside a later block and the span runs past `<!-- change-log-end -->`; `replaced` removes it (`shared/resources/qa-results.js:114`). Repro: a document with a `jira-sync-changelog` block, then a `## Mid` heading, then a `change-log` block holding the section — end-marker count goes 1 → 0. Low because two marker blocks is itself an anomaly `upsertChangeLog` collapses on its next write, and one tracked document has any legacy pair.
- **CR-3 (advisory, low/medium): the corpus guard counts with the engine's own `findQaResults`**, so a heading variant the engine misses is missed by both (`tests/qa-results-corpus.test.js:55`). Measured: an independent raw `^#{1,6} QA Testing Results` count, fence-aware, agrees with the engine on every tracked document today — so no current miss; the guard is not independent.
- **CR-4 (advisory, low/low): the section file `.claude/state/qa-results-section.md` is a fixed reused path**; a stale file from an earlier run passes `bad-section`. Mitigated by the prose ordering (render, save, then call).
- **QA-L1 (advisory, low): CRLF documents get LF-only seams.** A write into a CRLF document inserts `\n\n` separators and an LF body, producing mixed line endings (and, on replace, one extra blank line before a CRLF `---`). Sections are still found and writes are idempotent.
- **QA-L2 (advisory, low, inherited): a document with no frontmatter that opens with a `---` thematic break** has everything up to its next `---` read as frontmatter by `change-log.js`'s `bodyStart`, so a section there is invisible and a write creates a second copy. Pre-existing `bodyStart` behaviour; rare shape.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 5 (1 in the gate, 4 advisory)

---

## NFR Assessment

### Performance — PASS
The three task test files (29 tests) run in ~1.1 s; the engine is linear string work with no I/O.

### Reliability — CONCERNS
Refusal paths (`multiple`, `bad-section`) write nothing, verified by unit and wiring tests. REL-001 and
REL-002 are reliability defects: one re-creates stacking, one deletes Change Log rows while reporting
`replaced`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Pure module, no network, no shell interpolation: the Step 12 block passes the document path, the
  section file and the doc type to `node -e` as argv, never into the script text. The engine's inputs
  are a work-item document and a section this pipeline renders — see `boundary: internal` below.

### Maintainability — PASS
Well-commented engine that reuses `change-log.js` primitives; bundled copies byte-identical to the
source apart from the generated header; tests cover every reason.

---

## Code Review

Independent Explore reviewer over the full `origin/develop...HEAD` diff (14 files). Blocking
resolution: `code_review_blocking=true` passed by the pipeline, no frontmatter override →
`CR_BLOCKING=true`.

**Correctness bugs (4 from the reviewer, 1 from QA):**
- [medium/high] `shared/resources/qa-results.js:185` — CR-1: section with a second H2 accepted and stacks → promoted to gate as **REL-001**
- [medium/medium → reproduced by QA] `shared/resources/qa-results.js:114` — CR-2: marker-less change log table deleted → promoted as **REL-002** on QA's own reproduction
- [low/medium] `tests/qa-results-corpus.test.js:55` — CR-3: guard shares the engine's matcher → advisory
- [low/low] `skills/qa-task/SKILL.md:1357` (and `skills/qa-story/SKILL.md:1879`) — CR-4: fixed reused section file → advisory
- [low/high, QA] `shared/resources/qa-results.js:114` — REL-003: end marker of a later marker block deleted → gate entry, low

**Cleanups (0).**

**Provenance (5b):** `shared/resources/qa-results.js` does not exist on `origin/develop`, so every
engine finding is new to this change.

**Boundary rule:** `boundary: internal`. `internal_reason`: the engine's refusals (`multiple`,
`bad-section` in `upsertQaResults` / the private `normaliseSection`) guard document integrity; the
only inputs are a work-item document and a section the QA skill itself renders, and no corpus sink
models them (`markdown-structure` models implementation reports only, whose legitimate cases this
writer would reject for being the wrong document). Candidates named: `upsertQaResults`,
`normaliseSection`, `findQaResults`. The 12 hand-built edge documents above were executed in lieu of
a sink, and found REL-001 to REL-003.

**Mutation spot check (Step 3c):** two of the implementation report's eight engine mutations re-run from a `cp` snapshot, each restored and the baseline re-confirmed green; the tree was left as found.

```
mutation-proven: drop the change-log block-start span bound (qa-results.js:136) → D2, E3, E6 red → covered
mutation-proven: exact-line heading match instead of prefix (qa-results.js:58) → E1 red (corpus guard stays green: no suffixed heading remains after the task.65 repair) → covered
```

**Platform variance:** `tests/qa-results-step12-wiring.test.js` builds its fixture under
`os.tmpdir()`; re-run with `TMPDIR=/tmp command node --test tests/qa-results-step12-wiring.test.js`
→ 6/6 pass, exit 0. No validating consumer of the path.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`npm run ci:fast`: format check + `npm test`) | PASS — exit 0; 4744 tests, 4743 pass, 0 fail, 1 skipped |
| `change-log.test.mjs` (engine reuses its primitives) | Included in the suite |
| Corpus-wide write simulation (192 task/story documents, 3 writes each) | PASS — 154 `replaced`, 38 `created`, 0 problems |
| `bundle:check` | PASS — 129 skills, 0 problems |
| `validate` qa-task, qa-story | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-results.js` (+ both bundled copies), `shared/resources/tests/qa-results.test.mjs`,
`tests/qa-results-corpus.test.js`, `tests/qa-results-step12-wiring.test.js`, `skills/qa-task/SKILL.md`
Step 12, `skills/qa-story/SKILL.md` Step 12, `CHANGELOG.md`, task.65 repair diff,
`shared/resources/change-log.js` (reused primitives).

### Test Commands Executed
```bash
command npm run ci:fast
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
TMPDIR=/tmp command node --test tests/qa-results-step12-wiring.test.js
command npm run validate -- skills/qa-task/
command npm run validate -- skills/qa-story/
command npm run bundle:check
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --json
```

### Coverage Report
Not instrumented (the repo has no coverage tooling); every `reason` and each span rule has a unit test.

---

## Recommendations

### Immediate Actions (Blocking)
1. REL-001: refuse a section whose span does not reach the end of its own body (`bad-section`), with a unit test.
2. REL-002: bound or relocate a section written under a marker-less change-log heading, with the marker-less twin of D1.

### Short-term Actions (Non-Blocking)
1. REL-003: treat a section inside any change-log marker block (not only the earliest) as inside the log.
2. CR-3: give the corpus guard an independent raw heading count that must agree with the engine.
3. QA-L1: preserve the document's line ending at the seams.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high findings; two medium, high-confidence correctness defects under
`code_review_blocking` (rule 2) and reliability CONCERNS.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: REL-001 and REL-002 fixed and re-reviewed.

---

**QA Report**: co-located at `task.155.qa.1.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.1.qa-results-section-engine.yml`
**Next Steps**: `/qa-fix` for REL-001 and REL-002 (REL-003 optional), then QA cycle 2 (full-diff refute pass).
