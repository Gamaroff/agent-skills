# QA Report: Task 86 — `bundle_skill.py` prints `in sync` for bundled references it never examines

**Task**: [task.86.bundle-transitive-refresh.md](./task.86.bundle-transitive-refresh.md)
**Gate File**: [task.86.gate.1.bundle-transitive-refresh.yml](./task.86.gate.1.bundle-transitive-refresh.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: FAIL

---

## Executive Summary

The change delivers what it claims. All eight §9 success criteria were re-verified **against the tree
rather than the reports**, five separate mutation proofs held, the full local `npm run ci` is green
(2806 tests, 0 fail), and all five GitHub CI checks pass on PR #352 — including `validate`, which now
runs the new freshness assertion.

It nonetheless fails this gate on one HIGH finding from the independent code review, **confirmed by
execution**: the new `--check` flag is recognised only at `argv[0]`, so `bundle_skill.py --all --check`
silently performs a full mutating bundle. A read-only flag that writes the repo when the arguments are
reversed is exactly the class of silent, order-dependent failure this task exists to remove.

A second confirmed finding is sharper still: `--check` does **not** verify the `.sh` executable bit,
which the `git diff` check it replaced *did* catch. The fix therefore reintroduced, on one axis, the
green-CI-while-stale split it was written to eliminate.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (11/11 mandatory sections after Step 2 review)
- [x] All 5 implementation phases marked complete
- [x] Tests passing
- [x] Breaking changes documented (None)
- [x] Code on feature branch with open PR (#352, OPEN)

### Testing Approach

- [x] Automated testing (unit + full CI)
- [x] Mutation proving
- [x] Regression testing
- [x] Security review
- [x] Code review (independent adversarial agent)

### Review Methodology

Direct tools plus one independent Explore agent for Step 3b. Full pass — `PIPELINE_MODE=standard`
(`risk_level: medium`), so no lite-mode narrowing. First review; no prior gate.

**Step 3b was dispatched to an agent that did not write the code.** This matters here more than
usual: the implementation and the QA are the same pipeline run, so every finding below that the
implementer could have reached alone is one the implementer did not reach.

**Step 4b: not applicable** — the change set contains no `SKILL.md` and no `shared/resources/*.md`.
The `skills/*/references/*.md` files in the diff are auto-generated bundler output, byte-identical to
sources already in the repo.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1 — Failing test first | PASS | Verified | 6 of the original 8 tests red before the fix; the 2 green ones are deliberate guards |
| 2 — Close discovery edges | PASS | Verified | `.json` added. The `references/X`-in-shared-text edge was implemented, measured to vendor 38 unwanted files, and reverted — recorded rather than hidden |
| 3 — Disk reconciliation + status | CONCERNS | Partial | Works, but TASK86-004/005 are latent traps in the reconciler |
| 4 — CI equality assertion | FAIL | Partial | TASK86-001 (arg parsing) and TASK86-002 (mode coverage) |
| 5 — Land the correction | PASS | Verified | Exactly 8 files, 0 added, 0 removed |

**Overall Phase Completion**: 3/5 PASS, 1 CONCERNS, 1 FAIL

---

## Success Criteria Verification

Every row below was checked against the working tree, not against the implementation report.

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Unreachable copy refreshed on source change | mutation-proved | Disabling reconciliation reds 3 tests | PASS |
| Staled **orphan** fails CI | mutation-proved | Clean-room worktree: old check GREEN with 8 stale; `--check` names all 8, exit 1 | PASS |
| 26 source-backed copies examined; 8 corrected | 26 / 8 | 775 source-backed copies checked repo-wide, **0 stale** | PASS |
| `in sync` never printed over a refresh | — | Pinned by test; disabling reconciliation reds it | PASS |
| `npm run bundle` idempotent | no-op | 3 consecutive runs → **0 file operations** | PASS |
| No skill gains/loses a bundled file | 0 / 0 | `git diff --diff-filter=A` = 0, `=D` = 0 | PASS |
| 83 source-less copies untouched | untouched | All 8 touched files are source-backed; 858 = 775 + 83 | PASS |
| `npm run ci` green + `validate.yml` reproduced | green | Local `ci` exit 0 (2806 tests); GitHub CI 5/5 SUCCESS | PASS |

**All eight criteria hold.** The gate fails on code-review findings, not on unmet criteria.

---

## Mutation Proofs Executed

A green test says the test ran, not that it can fail. Each behaviour below was reverted and the suite
re-run.

| Behaviour reverted | Result | Verdict |
| --- | --- | --- |
| Disk reconciliation (`reconcilable = {}`) | 3 tests red | proven |
| `json` in `REFS_REF_RE` | exactly 1 test red | proven |
| Over-vendoring guard (edge 1 re-added) | exactly 1 test red | proven |
| Old CI check vs staled orphan (clean-room worktree at HEAD) | old check GREEN, `--check` exit 1 | proven |
| `--check` read-only (mtime hash across 858 files) | identical before/after | proven |

**A measurement error is recorded rather than quietly dropped.** The first read-only probe reported
`--check MUTATED FILES`. It was wrong — an unsorted `find … | md5` whose ordering is not stable. The
deterministic re-run (adding `sort`) showed an identical hash across all 858 files. The dirty file the
probe pointed at was the implementation report, edited after its own commit.

---

## Issues Found

### HIGH Severity (1)

**TASK86-001 — `--check` is silently dropped when it is not the first argument, and the tool writes**

- **File**: `skills/create-skill/scripts/bundle_skill.py`
- **Observation**: `if args and args[0] == '--check'` inspects position 0 only. Executed
  `bundle_skill.py --all --check` with one shared source modified: **6 files written**, exit 0, no
  warning. `bundle_skill.py <path> --check` bundles `<path>` and then fails resolving a skill at
  `./--check` — a write plus a nonsense error.
- **Impact**: The flag exists to be read-only. CI invokes it correctly today, so the lane is honest;
  a human reaching for it with the arguments the other way round gets a repo-wide rewrite instead.
- **Recommendation**: Scan all of `argv`; reject unrecognised leading `--` tokens.

### MEDIUM Severity (4)

**TASK86-002 — `--check` does not verify the `.sh` executable bit (coverage regression)**
Executed: `chmod 644` on a bundled `.sh`, `--check --all` exits **0**, while `git status` shows it
modified. `bundle_skill()` treats mode as part of being in sync; `check_skill()` does not. The
replaced `git diff` form caught this because git tracks the bit. 205 `.sh` files are affected in
principle. This change reintroduced, on one axis, the failure mode the task exists to remove — which
is why it is called out here rather than deferred.

**TASK86-003 — an orphaned copy whose source was deleted is invisible to `--check`**
The expectation set is built only from paths whose source exists. A deleted shared resource leaves
copies carrying `Source: shared/resources/foo.md` banners pointing at nothing, green forever.

**TASK86-004 — reconciliation clobbers a name-colliding skill-native file** *(latent — none today)*
`source_backed_on_disk()` keys on the source path existing, so a hand-authored
`references/read-config.sh` sharing a name with a shared resource is overwritten and given an
AUTO-GENERATED banner. The function's docstring asserts the inverse but never establishes the forward
direction.

**TASK86-005 — `write_bytes` writes through a symlink** *(latent — none today)*
Would inject the banner into the shared source itself, after which `--check` reports STALE forever.

### LOW Severity (4)

- Dead guard: `dst.name in EXCLUDE_DIRS` is subsumed by the `dst.parts` check on the next line.
- `validate.yml` lost the `::error::` annotation its two sibling steps still emit; the stale comment
  above it ("Until now only `scripts/release.sh` caught this") now misdescribes the step.
- Fixture temp dirs leak (123 observed). House-wide — `bundle-mjs.test.js` leaks 988 — but this file
  compounds it.
- `check()` helper collapses a signal-kill (`e.status === null`) and a missing `python3`
  (`e.code === 'ENOENT'`) into a staleness assertion failure.

**Total**: HIGH 1, MEDIUM 4, LOW 4

---

## Code Review

**Correctness bugs (5)**: TASK86-001 (high/high), TASK86-002 (medium/high), TASK86-003 (medium/high),
TASK86-004 (medium/high), TASK86-005 (medium/medium). All promoted to gate `top_issues[]` — a HIGH
correctness bug in a freshness checker is exactly what the loop is for.

**Cleanups (4)**: the four LOW items above.

**mutation-proven**: yes for all five behaviours listed in the proofs table.

**Probes that came back clean**, and are recorded so a later cycle does not redo them:

- Nested reconcilable paths resolve correctly — `needed` keys and
  `dst.relative_to(refs_dir).as_posix()` produce the same form; flat and nested names cannot collide.
- No spurious empty `references/` directory: `reconcilable` is non-empty only when `refs_dir.is_dir()`,
  so the guard degenerates to the old one when the directory is absent.
- `write_if_changed()` is line-for-line behaviour-preserving against the original inline loop,
  including evaluation order and the `.sh` mode re-sync.
- `rewrite_text` hoisting captured nothing from the enclosing scope — verified against `origin/develop`.
- Bundled `.json` stays byte-identical and parseable (`autogen_header` returns `""` for `.json`).
- `validate.yml` YAML is valid and its failure semantics are equivalent.

---

## NFR Assessment

**Security — PASS.** No auth, network, secrets or user data. The bundler reads and writes only inside
the repo. TASK86-005 is a file-integrity risk, not a security one, and is latent.

**Performance — PASS.** `--all` over 125 skills ~2s; the new reconciliation adds one rglob per skill.

**Reliability — CONCERNS.** TASK86-001 makes a read-only invocation mutate the repo depending on
argument order; TASK86-002 drops mode coverage. Idempotence itself is solid: three consecutive runs,
0 operations.

**Maintainability — PASS.** One definition of "in sync" (`expected_bytes`) with three call sites and
no re-implementation, verified by grep. The rejected alternative is documented in code, task and
CHANGELOG — the part a future reader would otherwise re-derive at cost.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `tests/bundle-mjs.test.js` (pre-existing bundler suite) | PASS 10/10 |
| Full `npm run ci` (2806 tests incl. `eval:all`) | PASS, 0 fail |
| GitHub CI on PR #352 | 5/5 SUCCESS (`validate`, `test`, `shellcheck`, `link-check`, branch policy) |
| Refreshed `.sh` copies parse (`bash -n`) | PASS 5/5 |
| Bundled ref counts per dependent skill | Unchanged |
| File modes vs source | Now match (755); the 644→755 change on two copies is a correction |

---

## Test Artifacts

```bash
node --test tests/bundle-transitive.test.js tests/bundle-mjs.test.js   # 19/19
npm run ci                                                             # exit 0, 2806 tests
npm run validate:all                                                   # 125 passed
python3 skills/create-skill/scripts/bundle_skill.py --check --all      # 125 verified
git worktree add --detach /tmp/t86-cleanroom HEAD                      # clean-room mutation proof
```

---

## Recommendations

### Immediate (Blocking)

1. **TASK86-001** — parse `--check` anywhere in argv; reject unknown leading `--` tokens. Add a test.
2. **TASK86-002** — compare `.sh` mode in `check_skill`; report MODE drift. Add a test.
3. **TASK86-003** — report banner-carrying copies whose source was deleted as ORPHANED.
4. **TASK86-004 / 005** — gate reconciliation on `AUTOGEN_MARKER`; skip symlinks; unlink before write.

### Short-term (Non-Blocking)

1. Emit `::error::` from the check so the annotation appears in the PR checks UI; refresh the stale
   comment above the step.
2. Register `t.after()` cleanup for fixture temp dirs.
3. Delete the dead `EXCLUDE_DIRS` clause.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH correctness bug, confirmed by execution, in the flag this task adds and CI
now depends on. The underlying work is sound — every success criterion holds and every mutation proof
held — but a read-only checker that writes the repo under a reversed argument order cannot ship.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK86-001 and TASK86-002 fixed and covered by tests.

---

**Next Steps**: `/qa-fix` cycle 1 → re-review.
