# QA Report: Task 203 - Migrate documents to hierarchical numbering

**Task**: [Link to task document](./task.203.migrate-doc-numbering.md)
**Gate File**: [task.203.gate.1.migrate-doc-numbering.yml](./task.203.gate.1.migrate-doc-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline, cycle 1)
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: FAIL

---

## Executive Summary

The repository migration is verified clean. 146 files moved as renames, every story and gate carries its new id, `doc-id check --corpus` reports ok on 22 documents, the doc-links ratchet is unchanged, and a second `--apply` answers `already`.

The engine itself has one high-confidence HIGH defect: a named L3 monolith is planned but never moved. It also has three MEDIUM findings:

- the `post-check-failed` revert hint does not revert;
- a registry refusal throws only on `--apply`, after a clean dry run;
- the refusing boundary is unprobed.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (22/22 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#671, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration via temp git repo)
- [x] Performance Testing (wall-clock bound)
- [x] Regression Testing
- [x] Security Review (by reading, plus a hand probe of `--root`)
- [x] Code Review

### Review Methodology

Direct tools, plus one dispatched diff reviewer (Step 3b). The task is high-risk and spans five phases, but the change is one module plus its tests. The reviewer was dispatched at 07:48Z and returned in 161 s (`duration_ms` 160742).

- **First review**, so this is the full branch diff.
- **Scope of the review patch.** It covers the branch diff excluding `docs/prd/**` and `docs/tasks/**`: 23 files, 2931 lines. The 146 moved PRD files are the engine's mechanical output and were verified by measurement instead (below).
- **Step 4b** is not applicable: no runnable prose (`SKILL.md` or `shared/resources/*.md`) is in the change set.
- **Gate head**: `7ac5e4456b68922e4441e2f4ce9b6b88b25c1d32`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Dependency gate | PASS | Verified | `doc-id.js` exports confirmed; `validate` added to both vocabularies; `appendPrdRow` added |
| Phase 1: Discover and plan | CONCERNS | Partial | L3 monolith never enters the file map (CR-1) |
| Phase 2: Blockers and verification | PASS | Verified | 8 codes aggregated; every one mutation-proven |
| Phase 3: Apply and the CLI | CONCERNS | Partial | Revert hint wrong (CR-2); registry refusal only at apply (CR-3) |
| Phase 4: Migrate this repository | PASS | Verified | See below |

**Overall Phase Completion**: 3/5 phases passed clean; 2 with concerns.

---

## Success Criteria Verification

Every criterion below is checked against evidence, not against its checkbox.

| Criterion | Evidence | Status |
| --- | --- | --- |
| Dry run maps 1 PRD, 4 epics, 17 stories, 146 files and writes nothing | Measured at `61baa8dc` (implementation report § Migration Mapping): `git status --porcelain` showed 0 lines before and after | PASS |
| `--apply` gives `prd.1.onboarding.md` with `prd_number: 1` and `name: prd.1.onboarding` | Read from disk: `name prd.1.onboarding`, `prd_number 1` | PASS |
| Every story has the new `id` / `epic` / `prd_number`, plus a resolving `epic_file` and `prd_source` | Script over all 17 story docs: 0 bad | PASS |
| Every gate `story:` reads `1.E.S` | Script over 17 gates: 0 bad | PASS |
| Second `--apply` answers `already` with an empty diff | Measured on the real tree, and by the test `fixture --apply in a temp git repo …` | PASS |
| `brownfield-enhancement` epic → `blocked` / `prd-less-epic`, nothing written | Tests `blocker prd-less-epic …` and `a dry run writes nothing; blocked writes nothing` | PASS |
| `in-progress` story → `in-flight` unless `--allow-in-flight` | Test `blocker in-flight …` | PASS |
| `--check` gives `needs-migration` before and `already` after | Test `--check: needs-migration before, already after` | PASS |
| Dry run under 5 s | Measured: 2.248 s at load 9.25 (`61baa8dc`, migration pending); 1.251 s at load 30.65 (head `7ac5e445`, `already`) | PASS |
| One `git mv` per tracked file, no repeated walks | Test `apply makes one move per file and walks the tree once` | PASS |
| Identifiers through `doc-id.js`; no id regex | Test `engine defines no id regex` (but see CR-7: template-literal ids escape it) | PASS (advisory gap) |
| `validate` classified as an artifact | `doc-id.test.mjs` `validate report is a non-canonical artifact`; contract test green | PASS |
| Blockers and idempotence mutation-proven | 9/9 re-run by QA this cycle (see Code Review) | PASS |
| `npm test`, `eval:all`, `bundle:check` pass | `ci:fast` 5637 tests, 0 fail; `eval:all` exit 0; `bundle:check` 0 problems (all at `87c74702`, `.agents/skills` moved aside); no code change since | PASS |
| No live link dead after the run | Engine link simulation (0 `link-would-break`) and the doc-links ratchet (no new or healed) | PASS |
| Epic registry is a pointer mapping 1–4 → 1.1–1.4 and naming task.205 | Read from disk | PASS |
| doc-links passes with KNOWN re-keyed and no healed entries | `doc-links.test.mjs` green; the 4 files with dead links are exactly the KNOWN entries | PASS |
| Implementation report records the full mapping | `task.203.implementation.1…` § Migration Mapping, 22 rows | PASS |
| **L3 PRDs are read and migrated** (§ 4 In Scope) | A named monolith is never moved (CR-1) | **FAIL** |

**Standards-named validation**: `npm run validate -- skills/finalise/` → `✓ finalise` (the only skill the change set touches, via its bundled copy).

---

## Breaking Changes Validation

### Breaking Change 1: PRD, epic and story paths change

Documented: Yes · Migration Path Provided: Yes (the run) · Migration Tested: Yes · Consumer Code Updated: Yes (19 inbound links re-pointed; doc-links green)

### Breaking Change 2: Parent fields take new values

Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes (17 stories, 17 gates verified) · Consumer Code Updated: N/A (readers are rewired in task.206)

### Breaking Change 3: The global epic registry is retired

Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes · Consumer Code Updated: N/A (task.205). The three standards that called the registry live are corrected.

The Rollback Plan's "Uncommitted: `git checkout -- . && git clean -fd docs/prd`" carries the CR-2 defect. It is part of bug 2's fix.

**Overall Breaking Changes Assessment**: CONCERNS (rollback text, CR-2)

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: A named L3 monolith is planned but never moved**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.203.bug.1.named-l3-monolith-never-moves.md](./task.203.bug.1.named-l3-monolith-never-moves.md)
- **Observation**: `run(["--root","docs/prd","--name","docs/prd.md=mono"])` over an in-memory tree answers `already {"prds":1,"files":0}`, yet the mapping lists the move.
- **Impact**: A consumer with a monolith is told there is nothing to migrate.
- **Recommendation**: Include `explicit` map keys in `fileMap`, and add a test.
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: The revert hint does not revert (CR-2)**
- **Bug Report**: [task.203.bug.2.revert-hint-does-not-revert.md](./task.203.bug.2.revert-hint-does-not-revert.md)
- **Observation**: `git checkout -- .` restores from the index, where `git mv` staged the renames. `git clean -fd <root>` deletes untracked moved files.
- **Recommendation**: A HEAD-scoped revert of the touched paths; fix the Rollback Plan text too.

**Issue: A registry refusal throws only on `--apply` (CR-3)**
- **Bug Report**: [task.203.bug.3.registry-write-throws-only-on-apply.md](./task.203.bug.3.registry-write-throws-only-on-apply.md)
- **Observation**: Reproduced. A registry with the alias header `| # | Name | …` gives `dry-run`, then `--apply` throws `no-table`, after the moves.
- **Recommendation**: Compute the registry text in plan/verify; turn the reason into a blocker.

**Issue: The refusing boundary is unprobed, and an empty `--root` is accepted (QA-1)**
- **Bug Report**: [task.203.bug.4.boundary-not-probed.md](./task.203.bug.4.boundary-not-probed.md)
- **Observation**: `--root ""` answers `already` against the default root, and `probes_executed` is 0.
- **Recommendation**: Export the root predicate, probe it with `--sink path`, and refuse an empty `--root`.

### LOW Severity Issues (0 gating; advisory below)

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 0 (plus 4 advisory code-review findings)

---

## NFR Assessment

### Performance — PASS
A dry run takes 2.248 s (load 9.25) with the migration pending and 1.251 s (load 30.65) on head. One move per file is held by a test.

### Reliability — CONCERNS
The revert guidance is wrong (CR-2), and a registry refusal can crash a half-applied run (CR-3). The idempotent re-run is verified.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary**: `true`. The header says the run "stops rather than guessing", and `--root` refuses an out-of-repo root.
- **Why nothing was probed**: no engine form reaches the decision. The `cli:` form runs outside a git repository, and the decision sits behind `git rev-parse`. The decision is not exported.
- **Hand probe** (it does not count toward `probes_executed`): `../secrets`, `/etc`, `docs/../../x` and `docs/prd/../../..` are refused as `usage`. `""` is accepted, which is QA-1.
- **What reading found**: `git` is spawned with argument arrays and `--`, and `ls-files` / `status` read NUL-delimited, so no shell or filename injection.

### Maintainability — PASS
There are 33 focused tests, an injected io and a pure core. The cleanups are advisory.

---

## Code Review

Step 3b ran with `code_review_blocking=true` (pipeline override). Every anchor checked `ok` (`finding-anchors.js --rev HEAD`).

**Correctness bugs (5):**
- [high/high] `shared/resources/migrate-doc-numbering.mjs:622` — a named L3 monolith is never put in the file map, so the run answers `already` → include explicit-map keys in `fileMap`, and test it. **Promoted: CR-1.**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1415` — the revert hint leaves staged renames and destroys unrelated work → a HEAD-scoped revert of the touched paths. **Promoted: CR-2.**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1382` — `appendPrdRow` throws only on `--apply` → compute it in plan/verify and turn it into a blocker. **Promoted: CR-3.**
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:1391` — the registry row append starts from the original text, so a planEdits rewrite of an in-tree `prd-registry.md` is overwritten → layer the append on `e.edits.get(registryPath)`. Advisory: it bites only a registry that itself links into the moved tree.
- [low/medium] `shared/resources/doc-id.js:559` — the `appendPrdRow` header search ignores fences → track fence state. Advisory.

**Cleanups (2):**
- `shared/resources/migrate-doc-numbering.mjs:599` — identical `if` / `else if` bodies for L3 → collapse.
- `shared/resources/tests/migrate-doc-numbering.test.mjs:705` — the no-id-regex test cannot see template-literal id construction (`legacyShortId`, the gate `P.E.S`) → build those through doc-id, or widen the test.

**Provenance** (5b): every promoted finding is in code this branch adds. None is pre-existing.

**Boundary**: `true`, `probes_executed: 0`. The remedy is in QA-1. The zero-guard would fail this at the DoD.

**Mutation proofs** (re-run by QA this cycle against the committed tests, with snapshot restore; the tree was unchanged before and after):

```
mutation-proven: prd-less-epic push disabled → blocker prd-less-epic … → covered
mutation-proven: in-flight check disabled → blocker in-flight … → covered
mutation-proven: target-exists check disabled → blocker target-exists … → covered
mutation-proven: dirty-path check disabled → blocker dirty-path … → covered
mutation-proven: link-would-break check disabled → blocker link-would-break … → covered
mutation-proven: registry-missing branch disabled → blocker registry-missing … → covered
mutation-proven: kept-epic number renumbered → partially migrated … → covered
mutation-proven: label/target position check removed → history keeps its literal … → covered
mutation-proven: dead-link protection removed → a live link is re-pointed … dead link stays byte-identical → covered
```

The developer's run also proved `unplaced-prd`, `registry-behind` and the slash-path lookbehind, for 12/12 overall.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| `finalise` artifact classification | `finalise-fix-and-recheck.test.mjs`, doc-id contract and classification-agreement tests | PASS |
| doc-links ratchet | `doc-links.test.mjs` | PASS |
| Full hermetic suite | `ci:fast` (5637 tests) | PASS |
| Eval layers | `eval:all` | PASS |
| Bundled copies | `bundle:check` | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`, `shared/resources/doc-id.js`, `shared/resources/tests/doc-id.test.mjs`, `shared/resources/finalise-fix-and-recheck.mjs`, `docs/development/epic-registry.md`, `docs/prd/prd-registry.md`, the 17 migrated story docs and 17 gates.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 33/33
npm run -s validate -- skills/finalise/                                       # ✓
command node shared/resources/doc-id.js check --corpus --json                 # ok, 22 documents
uptime; time command node shared/resources/migrate-doc-numbering.mjs --json   # 1.251 s at load 30.65
command node shared/resources/migrate-doc-numbering.mjs --json --root ""      # already (QA-1)
```

### Coverage Report
Not instrumented: this repository runs `node --test` without coverage. Behaviour coverage is held by the mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 1 (CR-1): a named monolith must move. P1.
2. Bug 2 (CR-2): the revert hint and the Rollback Plan text.
3. Bug 3 (CR-3): registry refusals become blockers before any write.
4. Bug 4 (QA-1): export and probe the root predicate, and refuse an empty `--root`.

### Short-term Actions (Non-Blocking)
1. CR-4: layer the registry row on the planEdits output.
2. CR-5: make the header search in `appendPrdRow` fence-aware.
3. CR-6 and CR-7: cleanups.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high-confidence HIGH correctness bug, promoted under `code_review_blocking`.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.203.qa.1.migrate-doc-numbering.md`
**Gate File**: co-located at `task.203.gate.1.migrate-doc-numbering.yml`
**Next Steps**: run `/qa-fix` (5b) for bugs 1–4, then QA cycle 2 (full-diff refute pass).
