# QA Report: Task 122 - Twelve skills carry bundled copies no discovery rule reaches

**Task**: [task.122.bundle-check-unreached-copies.md](./task.122.bundle-check-unreached-copies.md)
**Gate File**: [task.122.gate.1.bundle-check-unreached-copies.yml](./task.122.gate.1.bundle-check-unreached-copies.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-18
**Testing Completed**: 2026-09-18
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are delivered and measured exactly as the task predicted: the new `UNREACHED` class
found 15 copies across 12 skills on the live tree, the scoped invocation rule plus the step-8 respell
took it to 12, and the twelve deletions to 0 — with no new `references/` file vendored anywhere, a
byte-identical regeneration of `develop-task/references/` from empty, and 37/37 in the bundler suite
(3448/3448 on `ci:fast`). One medium defect enters the gate: the task's own `_within()` change — made
so a cited copy with a symlink **at the leaf** reads `SYMLINK` rather than `SYMLINK`+`UNREACHED` —
also stopped resolving a symlinked **intermediate** directory, which is the containment the old guard
actually provided; reproduced end-to-end (branch writes through the link, `develop` refuses the name).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-122-BUG-1 and mutation-prove it

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`, 3/3 phases ticked)
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` 3448/3448 at `0932db1e`)
- [x] Breaking changes documented — §5 declares none; verified (see below)
- [x] Code on feature branch with open PR (#434 → develop)

### Testing Approach

- [x] Automated Testing (unit: `node --test` bundler suites; `npm run ci:fast`)
- [x] Regression Testing (`bundle:check`, `check:generated`, `validate:all`, full suite)
- [x] Security Review (boundary hand probe, 12 shapes)
- [x] Code Review (Step 3b, read-only reviewer subagent)
- [x] Manual verification (live-tree measurements, consumer regeneration, deletion mutation proof)
- [ ] Performance Testing — not applicable beyond wall-time observation

### Review Methodology

Direct tools plus one read-only code-review subagent (Adaptive Review Strategy: 3 phases across
several modules, `risk_level: low`, first review → default row). Standard mode (no lite directive).
First review: `PRIOR_GATES=0`, `SAFETY_REPROBE=false`, whole-branch diff (`origin/develop...HEAD`,
4961 lines, ~3500 of them the 12 whole-file deletions).

Step 4b: **fired** — the diff modifies `shared/resources/develop-pipeline-step-8-commit.md` (4 fenced
bash blocks) and `skills/create-skill/SKILL.md` (3). Both report `no-executable-blocks` (exit 0):
every block is deny-listed by design — `git push`, `rm -rf`, an unrecognised `bash …/develop-task/…`
invocation, and write redirections. Recorded; nothing to act on. No `placeholder` blocks, so not
`zero-blocks-executed`. Shells: bash + zsh available.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `UNREACHED` in `--check` | PASS | Verified | `REMEDIES['UNREACHED']` present (l.836), not in `REGENERABLE` (l.805); `check_skill` reports `reconcilable − needed` (l.959). Live tree with the class alone: 15/12 (implementation report). Measured non-regenerable by the check → bundle → check test. |
| Phase 2: invocation discovery rule + respell | PASS | Verified | `INVOKE_REF_RE` (l.71), scoped branch in `discover_needed` (l.524) on `.md`/`.sh` shared text; step-8 line 108 respelled in source and the three bundled copies (4/4 match). Over-match check: no new `references/` files after `npm run bundle`. Live tree: 12. |
| Phase 3: delete the dead copies | PASS | Verified | 12 `D` entries in the diff; `--check` on the live tree: `0 problems` across 128 skills; each candidate has 0 invocations outside `references/` in its skill. |

**Overall Phase Completion**: 3/3 phases delivered. Phase 1's supporting change to `_within()` carries the defect below.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `--check` reports UNREACHED for every source-backed undiscovered copy, nothing else changes class | yes | yes | PASS | Existing SYMLINK/ORPHANED/AMBIGUOUS/MISDECLARED/UNREADABLE tests unchanged; reconciliation test now `STALE`+`UNREACHED` by design |
| `verify-push-state.sh` in `needed` for develop-story/-task/-bug and no other new skill | yes | yes | PASS | 3 copies discovered; `git status` clean of new copies after `npm run bundle` |
| Zero UNREACHED on the merged tree | 0 | 0 | PASS | `bundle_skill.py --check` → `128 skill(s) checked, 0 problems` |

**Performance**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `--check --all` wall time within noise | ≈ today | ≈6s (live-repo test) | PASS | Same order before/after |

**Code Quality**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every new test has a mutation proof; fixtures use the existing helper | yes | yes | PASS | 6 dev mutants + 3 independent QA mutants (below); `makeFixture`/`addSkill` |
| No second definition of the discovery rules in `package_skill.py` | none | none | PASS | `package_skill.py` untouched; it walks the bundled tree |

**Migration**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Twelve copies gone; obs #118 `actioned` with the PR number | yes | copies gone; #118 not yet actioned | CONCERNS (non-gating) | The observation is ticked at finalise once the PR number is final — record it in the DoD |

---

## Breaking Changes Validation

§5 declares none. Verified: `--check` gains a class (a new failure mode for CI, by design — the task
names it and CI is green on this branch); no CLI flag, exit code, or schema changed; `REGENERABLE`
membership unchanged. **Overall Breaking Changes Assessment: PASS (N/A).**

---

## New Findings This Cycle

_First review — the section is present for parity with re-reviews; every finding below is new._

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Lexical `_within()` accepts a symlinked intermediate directory the old guard refused; the write gate checks only the leaf**
- **Severity**: MEDIUM
- **Category**: Security / Quality
- **Bug Report**: [task.122.bug.1.within-lexical-symlinked-parent-escape.md](./task.122.bug.1.within-lexical-symlinked-parent-escape.md)
- **Observation**: hand probe of `_within` (12 shapes, `env -i`, scratch tree) — `link-to-etc/passwd` and `link-to-etc/../x.md` accepted by the branch, refused by `develop`. End-to-end: a fixture skill citing `shared/resources/sub/s.md` with `references/sub → <outside>` — branch bundler writes `<outside>/s.md`; develop prints `refusing out-of-tree reference: sub/s.md` and writes nothing. The reviewer's CR-1 named the same mechanism independently.
- **Impact**: bounded (needs a symlinked directory under a skill's `references/` plus a citation reaching it) but a regression of a containment guard; the discovery path was protected on `develop` and is not on this branch.
- **Recommendation**: resolve `candidate.parent` against `root.resolve()` and refuse a `..` leaf, keeping the `ValueError`/`OSError` → `False` guard — a symlink at the leaf still passes and reports `SYMLINK` (the task's intent); add the symlinked-intermediate fixture and mutation-prove it. Optionally refuse symlinked components in `writable_copy`.
- **Priority**: P1

### LOW Severity Issues (3 — advisory, from the code review)

- **CR-2** `bundle_skill.py:525` — the `INVOKE_REF_RE` loop rebinds the enclosing `name`; harmless today, rename the inner capture.
- **CR-3** `bundle_skill.py:958` — `sorted(set(reconcilable) - set(needed))` recomputes an exclusion `source_backed_on_disk` already applies; iterate `sorted(reconcilable)` and say why.
- **CR-4** `skills/create-skill/SKILL.md:260` — the remedy sentence reads "`references/<file>` or `references/<file>`": pass 3 rewrote the `shared/resources/<file>` spelling in the skill doc. Reword without the literal that gets rewritten.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
One extra regex pass over already-read shared `.md`/`.sh` text and one set difference per `check_skill`; the live-repo `--check` test runs in ≈6s as before.

### Reliability — PASS
`UNREACHED` proved non-regenerable by measurement; over-match check on the live tree produced no new copies; regeneration of `develop-task/references/` from empty is byte-identical and includes `verify-push-state.sh`; restoring a deleted copy from git is named by `--check` and re-deleted cleanly. The QA-side mutation proofs below all `covered`.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 12 — the probe engine (`security-probe.mjs`) imports JS entry points only, so the Python `_within` sink was **declined by the engine and probed by hand** under `env -i PATH=… HOME=$(mktemp -d)` in a scratch tree: the 11 `path` corpus shapes plus `link-to-etc/../x.md`. Results (new / old): 7 shapes agree and are correct; `symlink-escape` and `symlink-dotdot` **accepted / refused** → TASK-122-BUG-1; `encoded-traversal` and `empty` accepted by **both** (pre-existing; neither is producible by the capture regexes — `+` quantifiers, `%` is not decoded); `null-byte` accepted lexically but `Path.exists()` returns `False` on it on this Python, so it is refused downstream. Arms: discovery only — `_within` has one entry (the name capture); the write arm was exercised end-to-end via the bundler run.
- The boundary rule fired because `_within` is a containment predicate whose `False` prevents a write; the `..` shape the branch's tests cover (`bundle-transitive` "out-of-tree reference is refused") is still refused.

### Maintainability — PASS
One definition of the invocation rule; the class is documented at the four sites the task names (create-skill SKILL.md, AGENTS.md, validate.yml comment, CHANGELOG). Three low cleanups advisory.

---

## Code Review

Step 3b — reviewer subagent over the whole-branch diff (read-only; 219s). `code_review_blocking=true` from the pipeline; task frontmatter sets no `code_review_blocking` → `CR_BLOCKING=true`.

**Correctness bugs (1):**
- [medium/medium → QA-verified **high** confidence] `skills/create-skill/scripts/bundle_skill.py:421` — lexical `_within()` passes containment for a name under a symlinked `references/` directory and `writable_copy` tests only the leaf, so the bundler can create a file outside the tree through the link → resolve the parent (not the leaf) and refuse `..`; refuse symlinked intermediates in the write gate. **Promoted to gate `top_issues[]` as TASK-122-BUG-1** — the reviewer rated confidence medium; QA reproduced it end-to-end against both the branch and `develop` (above), which is what raises it to gating.

**Cleanups (3):** CR-2, CR-3, CR-4 as listed under LOW above — advisory.

`probes_executed: 12` (hand probe; engine declined — Python sink). Provenance (5b): the escape reproduces on the branch and **not** on `develop` → attributable to this diff, not pre-existing.

**Mutation proofs (Step 3c — QA's own, `cp` snapshot / restore, applied-count asserted, baseline green after, `git status` unchanged):**
- mutation-proven: `check_skill` UNREACHED `report(...)` → `pass` → `UNREACHED: a fresh source-backed copy that no rule reaches is reported, and only that` (+4 others) → **covered**
- mutation-proven: `_within` back to `Path.resolve()` → `SYMLINK: a symlinked reference is reported, not silently accepted` (+ non-regenerable set) → **covered**
- mutation-proven: `INVOKE_REF_RE` scoping `if True:` → `a literal skill name … for that skill only`, `bare {placeholder} … never followed`, `alternation that omits the skill …` (+ live-repo test) → **covered**

Platform variance: the fixtures pass `os.tmpdir()`-derived paths to `_within` (a validating consumer). `TMPDIR=/tmp node --test tests/bundle-check-mode.test.js tests/bundle-transitive.test.js tests/bundle-link-rewrite.test.js` → 61/61, exit 0.

Working tree after Step 3b/3c: unchanged from the start of the review (`git status --porcelain` diff empty).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` (format + full hermetic suite) | PASS — 3448/3448, exit 0 |
| Bundler suites (`bundle-check-mode`, `bundle-transitive`, `bundle-link-rewrite`, `bundled-links`, `bundle-comment-origin`) | PASS — 73/73 |
| `npm run bundle:check` | PASS — 128 skills, 0 problems |
| `npm run check:generated` | PASS |
| `npm run validate:all` | PASS — 128 passed |
| Pre-commit bundler hook on `d4bf9f03` | all skills in sync |

---

## Test Artifacts

### Files Reviewed
`skills/create-skill/scripts/bundle_skill.py`, `tests/bundle-check-mode.test.js`, `shared/resources/develop-pipeline-step-8-commit.md` (+3 bundled copies), `skills/create-skill/SKILL.md`, `AGENTS.md`, `CHANGELOG.md`, `.github/workflows/validate.yml`, the 12 deleted copies, `docs/tasks/task.122.*`.

### Test Commands Executed
```bash
node --test tests/bundle-check-mode.test.js tests/bundle-transitive.test.js tests/bundle-link-rewrite.test.js tests/bundled-links.test.js tests/bundle-comment-origin.test.js
TMPDIR=/tmp node --test tests/bundle-check-mode.test.js tests/bundle-transitive.test.js tests/bundle-link-rewrite.test.js
npm run ci:fast; npm run bundle:check; npm run check:generated; npm run validate:all
python3 skills/create-skill/scripts/bundle_skill.py --check
node references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-8-commit.md --json
node references/qa-execute-snippets.mjs --file skills/create-skill/SKILL.md --json
# hand probe: env -i PATH=/usr/bin:/bin:/usr/local/bin HOME=$(mktemp -d) python3 probe.py  (12 shapes, new vs old _within)
# repro: fixture skill + references/sub → outside; branch bundler vs origin/develop bundler
```

### Coverage Report
Not instrumented for Python; test count and mutation outcomes above are the coverage evidence.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-122-BUG-1 — parent-resolving `_within()` with a lexical leaf; symlinked-intermediate fixture; mutation proof. (P1)

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3, CR-4 cleanups.
2. Tick observation #118 `actioned` with PR #434 at finalise (Migration criterion).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the deliverable is complete and measured, but the supporting `_within()` change regresses a containment guard (medium, reproduced, attributable to this diff); rule 2 → CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-122-BUG-1 fixed and mutation-proved

---

**QA Report**: co-located at `task.122.qa.1.bundle-check-unreached-copies.md`
**Gate File**: co-located at `task.122.gate.1.bundle-check-unreached-copies.yml`
**Next Steps**: `/qa-fix` on the gate; re-review.
