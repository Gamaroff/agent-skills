# QA Report: Task 126 - Bundler citation form, per-skill closure count, pre-commit refusal (cycle 3)

**Task**: [task.126.bundler-citation-form.md](./task.126.bundler-citation-form.md)
**Gate File**: [task.126.gate.3.bundler-citation-form.yml](./task.126.gate.3.bundler-citation-form.yml)
**Previous Gate**: [task.126.gate.2.bundler-citation-form.yml](./task.126.gate.2.bundler-citation-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: PASS

---

## Executive Summary

Both cycle-2 findings are fixed, and each fix is held by a test that goes red when it is reverted.
The cycle-3 review covered every file changed since gate 2 (7 files, 1155 diff lines, with cycle
2's 294-line fix diff as the starting point). It found no correctness bug, only two low cleanups,
which stay advisory. The fast gate passes and `bundle:check` is clean.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Cycle-2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 refused-commit retry loop | FIXED | `revert_new`; both retry-path tests; mutations F6 (no-op revert) and F7 (no revert in the unstaged-source refusal) red |
| CR-2 links relocate on on-disk copies | FIXED | links decide on the reached set; test M extended with a sibling link; mutation F8 red |
| CR-3 remedy for an unreached leftover | FIXED | the refusal names both remedies |
| CR-4 net-delta wording | FIXED | docstring and create-skill say "net" |
| CR-5 CHANGELOG said ls-files | FIXED | now `git ls-tree` from `HEAD` |
| CR-6 dead `shared_refs_with_lines` | FIXED | removed; §1d asserts `parse_shared_refs` against a fixed expectation |

### Review Methodology

Direct tools, plus one dispatched read-only reviewer, scoped per Step 3b cycle 3+ to the files
changed since gate 2's `updated:`.

```
Re-review scope: since 2026-09-29T17:54:52Z (default)
```

Step 4b: fired on `skills/create-skill/SKILL.md` (one prose sentence changed, outside any fence);
the engine reports `zero-blocks-executed` exactly as it did on the base in cycle 1. That is
pre-existing, and not entered in the gate.

---

## New Findings This Cycle

- **[low, cleanup]** `skills/create-skill/scripts/bundle_skill.py:483` — CR-1: the
  `shipped if shipped is not None else set(bundled_names)` fallback cannot run, and the
  `expected_bytes` docstring plus the `bundle_skill` comment still describe `needed ∪ reconcilable`.
- **[low, cleanup]** `tests/pre-commit-hook.test.js:261` — CR-2: `revert_new`'s tracked-copy branch
  (`git checkout -- p`) has no test. The stub's output matches the seeded tracked copy, so no tracked
  copy is ever NEW.

Neither is a correctness bug, and neither enters `top_issues[]`.

---

## Code Review

`code_review_blocking` resolved `true`. No `bug` + high-confidence finding, so nothing is promoted.

**Mutation proofs (cycle 2's fixes):**
- mutation-proven: `revert_new` made a no-op → both retry tests → covered
- mutation-proven: no revert in the unstaged-source refusal → unstaged-source retry test → covered
- mutation-proven: links relocate on `bundled_names` → M → covered

**Not covered:** `revert_new`'s tracked branch (CR-2 above), recorded as `no-red-untested`.

---

## NFR Assessment

### Performance — PASS
Discovery cost unchanged.

### Reliability — PASS
A refused run leaves the working tree and index as it found them. Retries succeed on both remedy
paths.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, unchanged. No new input surface this cycle.

### Maintainability — PASS
The two advisory cleanups above.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Fast gate `npm run ci:fast` | 4537/4538, 0 fail |
| Bundler, link, hook and parity suites | 133/133; 25/25 under `TMPDIR=/tmp` |
| Whole tree `npm run bundle` / `--check` | no-op / 0 problems across 129 skills |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c `/review-pr` over PR #524.
