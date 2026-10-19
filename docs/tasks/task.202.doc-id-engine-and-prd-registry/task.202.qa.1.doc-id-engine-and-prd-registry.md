# QA Report: Task 202 - Doc-id engine and PRD registry

**Task**: [Link to task document](./task.202.doc-id-engine-and-prd-registry.md)
**Gate File**: [task.202.gate.1.doc-id-engine-and-prd-registry.yml](./task.202.gate.1.doc-id-engine-and-prd-registry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are delivered and the suite is green (`npm run ci:fast`, 5542 tests, 0 failures). The independent diff review and the security probe found four medium correctness defects in `doc-id.js` and four low ones; none is HIGH. The engine is not called by anything yet, so none affects a running pipeline, but each would be inherited by tasks 203–207.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix the medium findings in the qa-fix cycle

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (14/14 plan items)
- [x] Tests passing
- [x] Breaking changes documented (documentation only — dated interim notes)
- [x] Code on feature branch with open PR (#667, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, CLI as spawned process)
- [x] Performance Testing (corpus timing)
- [x] Regression Testing (select-next, registry-tick)
- [x] Security Review (security-probe.mjs, measured)
- [x] Code Review (independent diff reviewer)

### Review Methodology

Default strategy — direct tools, plus one read-only Explore diff reviewer (Step 3b) over `origin/develop...HEAD` excluding `docs/tasks/` (2354-line patch). First review: no prior gate. The reviewer ran about 3.9 minutes (`duration_ms` 234606 from its completion notice).

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Grammar and pure functions | CONCERNS | Verified | PROBE-1, CR-1, CR-3 |
| Phase 2: Checks and CLI | CONCERNS | Verified | CR-2, CR-5, CR-6, CR-7, CR-8 (CR-4, CR-9, CR-10 advisory) |
| Phase 3: Registry parser and standards | PASS | Verified | prd kind scoped to `kind === "prd"`; roadmap reader unchanged |

**Overall Phase Completion**: 3/3 delivered; 2 with findings

---

## Success Criteria Verification

**Functional**

| Criterion | Evidence | Status |
| --- | --- | --- |
| parse/format round-trip every generated name | `doc-id.test.mjs` "format/parse round-trip over a generated name set" (6 ids × 14 shapes) | PASS — but format() accepts non-canonical parts (CR-3) |
| `matchesEpic` true / false cases | `doc-id.test.mjs` "matchesEpic: P is required…" | PASS |
| `nextNumber("story", …)` returns 4 | `doc-id.test.mjs` "nextNumber: highest + 1…" | PASS — the never-reuse claim is too strong for a tail deletion (CR-1) |
| `check --corpus` one finding per seeded defect, `ok` on the valid chain | `doc-id.test.mjs` "checkCorpus: exactly one finding per seeded defect…", "the valid chain is ok…" | PASS |
| `parseRegistry(t, "prd", …)` returns the row; roadmap link not a work item | `select-next.test.mjs` "task.202: a prd registry row parses…", "…roadmap line linking a PRD is still not a work item" | PASS |

**Performance**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `check --corpus` over `docs/prd` | < 1 s | 0.029 s on head c58dde41, `uptime` load 0.62, 1.44, 1.30 | PASS |
| No new runtime dependency | none | `package.json` unchanged | PASS |

**Code Quality**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `npm test` with `.agents/skills` moved aside | `npm run ci:fast` TEST_EXIT=0, 5542 tests (implementation report) | PASS |
| Every `check` reason mutation-proven | implementation report; QA spot check below | PASS |
| `npm run bundle:check` clean | 0 problems | PASS |
| `npm run validate -- skills/develop-next/` | ✓ develop-next | PASS |

**Migration**

| Criterion | Evidence | Status |
| --- | --- | --- |
| Four standards + coding-standards carry the dated interim note | file-naming.md, prd-documents.md, epic-documents.md, story-documents.md, coding-standards.md § Registries | PASS |
| prd-registry.md defines location, columns, counter, never-reuse | `docs/standards/prd-registry.md` § Format, § Rules | PASS |
| epic-registry.md names task 203 | `docs/standards/epic-registry.md` superseded note | PASS |

---

## Breaking Changes Validation

### Breaking Change: The standards describe the hierarchical scheme
Documented: Yes
Migration Path Provided: Yes (dated interim note; `parseLegacy` reads the old shapes)
Migration Tested: N/A (task 203)
Consumer Code Updated: N/A (no caller migrated by design)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (4)

**PROBE-1: A number past `Number.MAX_SAFE_INTEGER` parses as valid**
- **Category**: Functional / Security (probe)
- **Observation**: `parse("prd.99999999999999999999.x")` is `ok`, `prd` is `100000000000000000000`, `id` is `prd.99999999999999999999`, and `format()` of it returns `prd.100000000000000000000.x`.
- **Impact**: the parsed number no longer names the file; the round-trip breaks.
- **Recommendation**: reject unsafe integers as `bad-number`.

**CR-1: A tail-deleted epic or story number is handed out again** — the docs and standards claim it never is.

**CR-2: `next epic` / `next story` allocate under a parent directory that does not exist** — exit 0, `epic.9.1`.

**CR-3: `format()` does not enforce canonical parts** — `seq` undefined or 0 and a dotted slug produce names without throwing.

### LOW Severity Issues (4)

CR-5 (CLI `cwd` not applied to paths), CR-6 (registry reader counts fenced/other-table rows), CR-7 (counter 0 or zero-padded accepted), CR-8 (missing file reported as `frontmatter-mismatch`).

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 4 (plus 3 advisory)

---

## NFR Assessment

### Performance — PASS
0.029 s over today's `docs/prd` (29 documents). No dependency added.

### Reliability — CONCERNS
Missing-parent and missing-file paths answer like valid states (CR-2, CR-8); an unreadable root answers `empty` (CR-4, advisory).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 27
- `security-probe.mjs --sink filename --cases-file doc-id.cases.json --entry shared/resources/doc-id.js#parse`: verdict `present-but-inert`; 20 of 21 hostile cases rejected (newline, NUL, `$(…)`, backticks, whitespace, uppercase, non-ASCII, leading zero, zero, digit-first slug, legacy shapes, double/trailing hyphen, sub-story + digit, extra segment, empty slug, unknown kind); `docid.huge-number` accepted (PROBE-1); 6 of 6 legitimate accepted. Record: `task.202.qa.1.security.run.json`. The engine runs no shell, opens no network and writes nothing.

### Maintainability — PASS
One engine with named reasons, injected filesystem for pure tests, fixture trees per reason.

---

## Code Review

**Correctness bugs (9):**
- [medium/high] `shared/resources/doc-id.js:313` — tail-deleted number reused despite the never-reuse claim → reword docs/standards or persist a high-water mark; add a tail test (CR-1, promoted)
- [medium/high] `shared/resources/doc-id.js:702` — `next epic/story` allocate under a missing parent → require the parent; exit 1 `parent-missing` (CR-2, promoted)
- [medium/high] `shared/resources/doc-id.js:240` — `format()` accepts non-canonical parts → throw unless `parse(out)` round-trips the parts (CR-3, promoted)
- [medium/medium] `shared/resources/doc-id.js:532` — unreadable root reads as `empty` → distinct `root-unreadable` reason (CR-4, advisory)
- [low/high] `shared/resources/doc-id.js:726` — runCli `cwd` not applied to paths (CR-5, promoted)
- [low/high] `shared/resources/doc-id.js:280` — `registryNumbers` reads fenced/other-table rows (CR-6, promoted)
- [low/high] `shared/resources/doc-id.js:309` — PRD counter 0 / zero-padded accepted (CR-7, promoted)
- [low/high] `shared/resources/doc-id.js:425` — missing file reported as `frontmatter-mismatch` (CR-8, promoted)
- [low/medium] `shared/resources/doc-id.js:370` — trailing YAML comment kept in a frontmatter value (CR-9, advisory)

**Cleanups (1):**
- `shared/resources/doc-id.js:542` — an unparsed name with a trailing artifact word is skipped silently by the corpus walk (CR-10, advisory)

Every anchor checked by `finding-anchors.js --rev HEAD`: all 10 `ok`.

**Boundary:** `boundary: true` — `parse` accepts or rejects a name and gates every later allocation and check. Probed (see Security): `probes_executed: 27`, copied from the run record's `totals.executed`.

**Provenance:** every finding is in code this change adds (`doc-id.js` is a new file) — none pre-existing.

**Mutation spot check (scratch worktree):**
mutation-proven: duplicate-id branch removed → "checkCorpus: exactly one finding per seeded defect" and "check covers every reason it declares" → covered

The develop-time proofs for all eight `check` reasons are recorded in the implementation report, each against a committed test (covered).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `evals/develop-next/unit/select-next.test.mjs` (bug/task registries, roadmap) | PASS (172/172) |
| `shared/resources/tests/registry-tick.test.mjs` | PASS (inside `ci:fast`) |
| Full hermetic suite | PASS (5542 tests) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/doc-id.js`, `shared/resources/tests/doc-id.test.mjs`, `shared/resources/tests/fixtures/doc-id/**`, `skills/develop-next/scripts/select-next.mjs`, `evals/develop-next/unit/select-next.test.mjs`, the eight standards and architecture docs.

### Test Commands Executed
```bash
npm run ci:fast                       # with .agents/skills moved aside (develop step)
npm run bundle:check && npm run check:generated
npm run validate -- skills/develop-next/
node --test shared/resources/tests/doc-id.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --cases-file doc-id.cases.json --entry 'shared/resources/doc-id.js#parse' --record task.202.qa.1.security.run.json --json
time node shared/resources/doc-id.js check --corpus --json
```

### Coverage Report
Not instrumented (the repository runs `node --test` without coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. PROBE-1, CR-1, CR-2, CR-3 (medium), then CR-5–CR-8 (low).

### Short-term Actions (Non-Blocking)
1. CR-4, CR-9, CR-10.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH finding; four medium correctness defects in a new engine that five later tasks build on.
**Quality Score**: 60/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: medium findings fixed and re-reviewed

---

**QA Report**: co-located at `task.202.qa.1.doc-id-engine-and-prd-registry.md`
**Gate File**: co-located at `task.202.gate.1.doc-id-engine-and-prd-registry.yml`
**Next Steps**: `/qa-fix` (Step 5b)
