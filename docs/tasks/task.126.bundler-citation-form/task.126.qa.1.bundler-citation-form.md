# QA Report: Task 126 - Bundler citation form, per-skill closure count, pre-commit refusal

**Task**: [task.126.bundler-citation-form.md](./task.126.bundler-citation-form.md)
**Gate File**: [task.126.gate.1.bundler-citation-form.yml](./task.126.gate.1.bundler-citation-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are delivered and every stated success criterion measures as met:
- a fragment or `cite` reference bundles one file, in both spellings;
- the three task.116 pointers drop 16–18 files each;
- `bundle:check` and `validate:all` are clean;
- the hook refuses an untracked generated copy.

The independent diff review found one high-confidence medium bug, which this report reproduced by
execution. The hook's refusal is wider than its purpose: it also refuses an untracked, hand-written
`references/` file that has no shared source, and it calls that file a generated copy.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (12/12 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none to consumers; the authoring change is in §5)
- [x] Code on feature branch with open PR (#524, OPEN)

### Testing Approach

- [x] Automated Testing (unit, integration, fixture repos)
- [x] Performance Testing (bundle wall time, develop vs branch)
- [x] Regression Testing
- [x] Security Review (boundary rule, see below)
- [x] Code Review (Step 3b, independent Explore subagent)

### Review Methodology

Direct tools, plus one dispatched read-only code reviewer (Step 3b). First review, so the review
covered the whole branch diff with generated `references/` copies and `docs/tasks/` excluded: 15
files, 1079 diff lines. The traceability mapper was not run, because the task's Success Criteria are
a checklist, not a table. Step 4b ran on the four changed `SKILL.md` files; see below.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Citation edges | PASS | Verified | One parser in `quick_validate.py`; `discover_needed` edge kinds; closure status line; 14 tests |
| Phase 2: Pre-commit refusal | CONCERNS | Verified | Refusal works as specified for generated copies. CR-1 (over-refusal) and CR-3 (index left staged on abort) reproduced |
| Phase 3: Authoring surface + conversions | PASS | Verified | Three pointers converted; closures 37→21, 45→27, 46→29; 51 copies removed; docs added |

**Overall Phase Completion**: 3/3 delivered, 1 with concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| A fragment reference to an `.md` target bundles exactly one file | 1 file | 1 file, both spellings (tests A, D, D2, F) | PASS |
| Each pointer site contributes exactly the hub, ≥ 12-file drop | ≥ 12 per skill | −16 / −18 / −17 | PASS |
| `bundle:check` no `UNREACHED`; `validate:all` passes | clean | 0 problems, 129 skills; 129 passed | PASS |
| Untracked generated copy refused by default | exit 1 | exit 1 (hook tests) — but see CR-1: also non-generated files | CONCERNS |
| No measurable change to bundle time | within noise | 4.9 s → 4.6 s (`--all`) | PASS |
| One definition of the edge rules; mutation proofs | one; each test proved | `ref_kind`; 13 mutations, all red | PASS (CR-4 cleanup) |
| Consumer install still runs (nothing read was dropped) | — | Not run as a tarball. `setup-consumer.sh` configures credentials; it does not install skills. The equivalent check is green: `tests/executable-instructions.test.js` requires every doc reference in every skill to resolve inside that skill's own directory | PASS (equivalent evidence) |
| Observations #83, #114 close naming the PR | at finalise | — | n/a this cycle |

---

## Breaking Changes Validation

### Breaking Change: fragment references become citations
Documented: Yes (task §5)
Migration Path Provided: N/A. No bundled source used a fragment reference before this change,
measured 2026-09-29, and the bundler read one as a missing file
Migration Tested: Yes. `npm run bundle` on the whole tree before the conversion was a no-op
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CR-1 — the hook refuses skill-native untracked files as "generated copies"**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `UNTRACKED_LEFT` intersects the pre-existing dirty set with *every* untracked
  file under `skills/*/references/*`. 89 tracked `references/` files in this repo have no shared
  source, so hand-written reference files are normal. Reproduced in a fixture repo: an untracked
  `skills/fx/references/native-guide.md` with no shared source refuses a `SKILL.md` commit (exit 1),
  and the message says `bundle:check will fail in CI`. That is false: `bundle:check` does not judge
  skill-native files.
- **Impact**: an author adding a hand-written reference is blocked with a misleading remedy.
- **Recommendation**: refuse only untracked paths whose `shared/resources/<path after references/>`
  exists, and keep the others on the warning. Add a hook test for the native case.
- **Priority**: P1

(A separate bug file was not created: the finding is a single-line predicate fix, it is fully
specified in the gate's `top_issues[]`, and `/qa-fix` consumes it from there in the next pipeline
step.)

### LOW Severity Issues (1 reproduced, advisory)

- **CR-3** — `.githooks/pre-commit` runs the new refusal *after* it has `git add`ed the `NEW` copies,
  so an aborted commit leaves them staged. Reproduced: after a refused commit, `git diff --cached`
  lists `skills/fx/references/fresh.md`. The existing `UNSTAGED_SHARED` refusal exits before the
  add. Advisory (reviewer confidence medium), but cheap to fold into the CR-1 fix.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (plus advisory items in Code Review)

---

## NFR Assessment

### Performance — PASS

Bundle wall time, 3 runs each, from a detached `develop` worktree and the branch: `--all`
4.86/5.00/5.01 s → 4.61/4.63/4.61 s; `--check` 4.65–4.77 s → 4.34–4.38 s. The branch bundles 51 fewer
files. `_tracked_refs` is one cached `git` call per run.

### Reliability — CONCERNS

CR-1 (over-refusal) and CR-3 (index left staged on an aborted commit). The bundler side is sound: a
second `npm run bundle` is a no-op, and the URL rewrite changed exactly the three cited hub copies in
the tree.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary rule — `boundary: false`**, with the candidates named:
  - `quick_validate.ref_kind` / `parse_shared_refs`: a classifier, but Python, which the probe
    engine does not import (it supports JS, `shell:`, `shell-fn:` and Node `cli:` entries).
  - `.githooks/pre-commit`: a refusal gate, but it takes **no caller-supplied input value**. It
    decides on git index state, and the engine's shell form models one positional argument.

  Both are covered by executed behavioural tests: 14 bundler fixture tests and 6 hook tests in real
  git repos, plus 13 mutations. Path containment (`_within`) is unchanged, and a fragment-stripped
  traversal name (`../../x.md#a` → `../../x.md`) still meets it. The new URL rewrite only calls
  `is_file()` on a name before writing text, which is not a new sink.

### Maintainability — PASS

The three copies of the reference regex collapse to one parser, and the edge rule is stated once
(`ref_kind`). CR-4 is a cleanup: `rewrite_text` re-implements `split_fragment`'s strip.

---

## Code Review

Independent read-only Explore reviewer, whole-branch diff (15 files, 1079 lines). `code_review_blocking`
resolved `true` (the pipeline override), so `bug` + `high` confidence gates.

**Correctness bugs (3):**
- [medium/high] `.githooks/pre-commit:85` — the refusal counts every untracked `references/` file as
  generated, including skill-native files → refuse only paths with a shared source. **Promoted to gate
  `top_issues[]` as CR-1.** Reproduced by execution.
- [medium/medium] `skills/create-skill/scripts/bundle_skill.py:463` — the unshipped-to-URL decision
  uses `bundled_names` (`needed` ∪ on-disk source-backed copies). A cited copy's bytes therefore depend
  on whether the `UNREACHED` copies have been deleted yet, and a commit that only `git rm`s them can
  leave the cited copy `STALE` in CI → decide on `needed`. Verified by reading `expected_bytes` and its
  three callers; advisory.
- [low/medium] `.githooks/pre-commit:88` — the refusal runs after the `NEW` `git add` → move it before.
  Reproduced (see LOW above); advisory.

**Cleanups (2):**
- `skills/create-skill/scripts/bundle_skill.py:276` — `rewrite_text`'s `md()` re-implements
  `split_fragment`, and `comment_only_refs` still reads `#fragment` into the name → import
  `split_fragment`.
- `skills/create-skill/scripts/bundle_skill.py:1404` — `_tracked_refs` reads the index
  (`git ls-files`), so "vs committed" is really "vs index" → `git ls-tree -r HEAD`, or relabel.

**Provenance (5b):** all three bugs are in lines this branch adds. None is pre-existing.

**Mutation proofs (3c):** the 13 development-time mutations each turned a *committed* test red, with
the tree restored after each and confirmed by `git diff --stat`:
- mutation-proven: `ref_kind` always dep → A, C, D, D2, F, G, J → covered
- mutation-proven: cite any suffix → E → covered
- mutation-proven: `references/` spelling never cites → D, D2, F, J → covered
- mutation-proven: cite comment accepts the shared prefix only → F → covered
- mutation-proven: cite is not a leaf → A, C, D, D2, F, G, J → covered
- mutation-proven: no cite→dep upgrade → H → covered
- mutation-proven: fragment kept in the name → A, C, D, E, G, I, K, §1d → covered
- mutation-proven: committed count ignored → J → covered
- mutation-proven: `unshipped` not passed to `rewrite_text` → L → covered
- mutation-proven: hook never refuses → refusal test → covered
- mutation-proven: pathspec without the trailing `*` → refusal + escape-hatch tests → covered
- mutation-proven: refuses modified tracked copies too → tracked-edit test → covered
- mutation-proven: escape hatch ignored → escape-hatch test → covered

No test covers CR-1's native-file case yet. That is the finding.

**Step 4b (runnable prose):** fired. Four changed `SKILL.md` files contain fenced bash blocks
(create-skill, qa-fix, review-task, review-story). The engine reported `zero-blocks-executed` on each:
- create-skill: 4 blocks, 1 placeholder, 3 mutating
- qa-fix: 9 blocks, 2 placeholder, 7 mutating
- review-task: 16 blocks, 1 placeholder, 15 mutating
- review-story: 18 blocks, 4 placeholder, 14 mutating

**Not attributable to this change:** of the lines this diff changes in those four files, 0 fall
inside a fence (checked per hunk against the fence ranges). Every block is byte-identical to base,
so base gives the same result. Not entered in the gate.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole tree `npm run bundle` before conversion | no-op — every skill `in sync · +0 vs committed` |
| `bundle:check` / `validate:all` / `check:generated` | clean / 129 passed / green |
| `bundled-links`, `executable-instructions`, `qa-gate-preconditions-parity` | green |
| Fast gate `npm run ci:fast` | 4532/4534 — the one failure was a load-sensitive file timing budget (`bundle-missing-source`, 23.4 s vs 10 s), re-run alone twice: 7/7 in 6.9 s and 5.6 s |
| Platform variance: `TMPDIR=/tmp` on the new tests + parity file | 27/27 |

---

## Test Artifacts

### Files Reviewed
`skills/create-skill/scripts/{bundle_skill,quick_validate,package_skill}.py`, `.githooks/pre-commit`,
`tests/bundle-citation.test.js`, `tests/pre-commit-hook.test.js`, `tests/bundle-missing-source.test.js`,
`evals/shared/tests/qa-gate-preconditions-parity.test.mjs`, `skills/{create-skill,qa-fix,review-task,review-story}/SKILL.md`,
`AGENTS.md`, `CHANGELOG.md`, `docs/contributing/traps.md`.

### Test Commands Executed
```bash
command node --test tests/bundle-*.test.js tests/bundled-links.test.js tests/executable-instructions.test.js evals/shared/tests/qa-gate-preconditions-parity.test.mjs   # 122/122
TMPDIR=/tmp command node --test tests/bundle-citation.test.js tests/pre-commit-hook.test.js tests/bundle-missing-source.test.js   # 27/27
npm run -s validate -- skills/{create-skill,qa-fix,review-task,review-story}/   # 4 × ✓
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/<s>/SKILL.md --json   # 4 × zero-blocks-executed, pre-existing
python3 skills/create-skill/scripts/bundle_skill.py --check   # 0 problems
```
The CR-1 and CR-3 reproductions ran in a throwaway `git init` repo, with the hook copied in and a stub
`npm run bundle`.

### Coverage Report
Python and shell are not instrumented. Coverage is behavioural: 14 + 6 fixture tests, with 13
mutations each proven red.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: scope the refusal to untracked copies with a shared source, and add a native-file hook test.

### Short-term Actions (Non-Blocking)
1. CR-3: refuse before the `NEW` `git add` (fold into CR-1's fix).
2. CR-2: decide "unshipped" on `needed`.
3. CR-4, CR-5: the two cleanups above.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium, high-confidence, reproduced defect in the new hook refusal. Everything else
measures as specified.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.126.qa.1.bundler-citation-form.md`
**Gate File**: co-located at `task.126.gate.1.bundler-citation-form.yml`
**Next Steps**: `/qa-fix` for CR-1 (and CR-3); re-review in cycle 2.
