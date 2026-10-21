# QA Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Task**: [Link to task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
**Gate File**: [task.211.gate.1.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.1.migration-engine-monolith-and-domainless-prds.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are delivered and every suite is green. The diff review found three defects in the
engine and QA reproduced each one. Each is a shape the deleted guard refused, so each is new to this
change. Two report `ok` over a wrong result: a doubled frontmatter block, and a stale relative mention.
The new `--name` domain boundary also has no probeable entry.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (12/12 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#712, OPEN)

### Testing Approach

- [x] Automated Testing (unit, eval)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (one Explore reviewer)

### Review Methodology

Direct tools plus one read-only diff reviewer. The reviewer was dispatched at 2026-10-21T00:42Z and took
219744 ms (from its completion notice's `duration_ms`). First review, so the scope is the whole
`origin/develop...HEAD` diff (1885 patch lines, 9 files). QA reproduced every reviewer finding in memory
against the suite's own `memIo` before grading it.

Step 4b: `qa-execute-snippets.mjs` over `skills/review-prd/SKILL.md`. Changed blocks: 2, both classified
`mutating` (they run the engine with `--apply`), so 0 executed and the engine reports
`changed-blocks-not-executed`. The eval rows gate-8 and gate-9/10 run both changed blocks in a
consumer-shaped root, so they are covered there. The one `execution-failure` (line 732) is an unchanged
`git log` block that fails in the harness's non-git temp copy. It is the same on base and is not
attributable to this change.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Frontmatter | CONCERNS | Verified | Block created; unclosed fence blocks. A BOM or leading blank line gets a second block (CR-1) |
| Phase 2: Outside links | CONCERNS | Verified | README and `docs/` links re-pointed; read count held. A relative non-link mention stays stale (QA-1) |
| Phase 3: Domain | CONCERNS | Verified | `needs-domain`, `<domain>/<slug>`, guard deleted. Domain check unprobed (QA-2); numbered PRD moved by a named domain (CR-3) |

**Overall Phase Completion**: 3/3 delivered, each with one open finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Frontmatter-less PRD migrates, check clean; unclosed fence blocks, nothing moves | engine rows `task.211 phase 1` ×3; eval gate-8 | PASS (CR-1 is a neighbouring shape) |
| README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed | engine `task.211 phase 2` row; eval gate-8, gate-9/10 | PASS |
| Domain-less PRD blocks `needs-domain`; `<domain>/<slug>` lands under the domain; keep block accepts it | engine `task.211 phase 3` rows; eval gate-8 runs create-prd's keep block on the result | PASS |
| `migration-guard.mjs` refuses nothing (or no longer exists) | file deleted in `b2cc4831`; no reference left (`git grep migration-guard` outside history) | PASS |
| Performance: the prefilter adds reads only for files naming a move source | engine row `task.211 phase 2 (performance)`: each outside file read once; `links.live` 2 | PASS |
| `ci:fast` and `eval:all` with `.agents/skills` aside; `bundle:check` clean | develop run: 6089 tests, 0 fail; eval:all 0; bundle:check 0 problems | PASS |
| `validate -- skills/review-prd/` | exit 0 | PASS |
| Every new row mutation-proven | 10 engine mutations, each red (implementation report); QA re-ran 2 | PASS |
| review-prd plan block documents `needs-domain` and `<domain>/<slug>` | `skills/review-prd/SKILL.md` plan block bullets | PASS |
| CHANGELOG names the `--name` form and the new blocker | `CHANGELOG.md` `### Changed`, BREAKING entry | PASS |

---

## Breaking Changes Validation

### Breaking Change: a bare `--name <root PRD>=<slug>` no longer plans

Documented: Yes (task § 5, CHANGELOG)
Migration Path Provided: Yes (pass `<domain>/<slug>`; the blocker detail names it)
Migration Tested: Yes (engine L3 row; eval gate-8)
Consumer Code Updated: Yes (review-prd plan block)

### Breaking Change: `review-prd/scripts/migration-guard.mjs` removed

Documented: Yes. Consumer Code Updated: Yes (both blocks no longer call it).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

**Issue CR-1: a BOM or a leading blank line gets a second frontmatter block**
- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: `﻿---\nname: prd.onb\ntitle: O\n---\n# O\n` migrates to
  `---\nname: prd.1.onb\nprd_number: 1\ntype: prd\n---\n﻿---\n…`. The same happens with one leading
  blank line. `--apply` answers `ok`.
- **Provenance**: new. The base engine left such a file unchanged and the guard refused it.
- **Recommendation**: strip a BOM before the fence test; give a late fence its own state and block on it.

**Issue QA-1: a relative non-link mention of the moved monolith stays stale (reviewer CR-2)**
- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: with `scripts/x.js` holding `"../docs/prd.md"` and `docs/guide/x.md` holding
  `` `../prd.md` ``, `--apply --name docs/prd.md=mono` answers `ok` and leaves both files unchanged.
- **Provenance**: new. The guard refused any outside mention (`outside-links`).
- **Recommendation**: re-scan the admitted files for a residual path to an outside move source and
  report each as a blocker.

**Issue QA-2: the `--name` domain boundary has no probeable entry**
- **Severity**: MEDIUM · **Category**: Security (process)
- **Observation**: the domain becomes a path segment. The checks are a shape test in `parseArgs` and an
  inline `docId.format` in `plan()`. No export reaches them, so the probe could not run (0 cases).
- **Recommendation**: one exported `parseNameValue(value)` used by both, then probe it with `--sink path`.

### LOW Severity Issues (1)

- **CR-3**: `--name docs/prd/prd.1.x/prd.1.x.md=main/x` moves an already-numbered PRD; its registry row
  keeps `Folder .` and the post-check answers `ok`. Apply `namedDomain` only to a legacy PRD.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

No bug report files: under the develop pipeline each finding goes to `/qa-fix` through the gate's
`top_issues[]`.

---

## NFR Assessment

### Performance — PASS
The read-count row holds the criterion: each outside file is read once, and a file naming no move source gets no link pass.

### Reliability — CONCERNS
CR-1 and QA-1 both report `ok` over a wrong tree.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true`: the `--name` domain is a caller-supplied path segment. By reading: `parseArgs` refuses
  more than one `/` or an empty part, and `docId.format` refuses `..`, so no escape was found. It was not
  executed, because no exported predicate reaches it (QA-2). Other candidates the diff adds:
  `frontmatterState(text)` is a three-valued classifier of a user document with no boolean verdict that a
  corpus sink scores, and the unit rows cover its three states.

### Maintainability — PASS
One state function serves both the edit and the blocker. The guard is deleted, and USAGE, the header
comment and `BLOCKER_CODES` are updated.

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out).

**Correctness bugs (3):**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:802` — a BOM or a leading blank line before
  the fence is classed `none`, and a second block is prepended → promoted to the gate as CR-1.
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:1108` — a relative non-link mention admitted
  by the prefilter is left stale while the run reports `ok` → reproduced by QA, carried as QA-1.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:490` — a named domain moves a numbered PRD →
  carried as CR-3 (low).

**Cleanups (0).**

All three anchors checked `ok` (`finding-anchors.js`).

boundary: true · probes_executed: 0 · escaped: 0 — QA-2.

mutation-proven: needs-domain blocker disabled → `task.211 phase 3: root L1 and L2 PRDs and a root index need a domain…` and the L3 index row → covered
mutation-proven: unclosed-frontmatter blocker disabled → `task.211 phase 1: an unclosed frontmatter fence is a blocker…` → covered

Two of the ten Step 3 proofs were re-run here. The other eight are recorded in the implementation report
and were not repeated.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204, 43 rows) | PASS — one row changed on purpose (L3 index → `needs-domain`) |
| Eval PRD-skill rows, gate-7 CR-1 monolith | PASS |
| `tests/doc-id-chokepoint.test.js` | PASS (14) |
| Full `ci:fast` | PASS (develop run, 6089 tests) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, its bundled copy, `shared/resources/tests/migrate-doc-numbering.test.mjs`,
`evals/shared/tests/prd-skill-numbering.test.mjs`, `skills/review-prd/SKILL.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs evals/shared/tests/prd-skill-numbering.test.mjs tests/doc-id-chokepoint.test.js   # 109/109
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-prd/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings.json> --root . --rev HEAD --json   # ok
```

### Coverage Report
Not measured (the repository runs `node --test` without coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1, QA-1, QA-2: fix in `/qa-fix`, each with a mutation-proven engine row.

### Short-term Actions (Non-Blocking)
1. CR-3: limit `namedDomain` to legacy PRDs.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high findings, but three reproduced medium defects, two of which report success over a wrong result.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, QA-1 and QA-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.211.qa.1.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: co-located at `task.211.gate.1.migration-engine-monolith-and-domainless-prds.yml`
**Next Steps**: `/qa-fix` cycle 1, then re-review.
