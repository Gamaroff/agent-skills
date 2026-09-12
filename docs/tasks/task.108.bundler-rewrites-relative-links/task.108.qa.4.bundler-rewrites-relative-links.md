# QA Report: Task 108 - The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Task**: [Link to task document](./task.108.bundler-rewrites-relative-links.md)
**Gate File**: [task.108.gate.4.bundler-rewrites-relative-links.yml](./task.108.gate.4.bundler-rewrites-relative-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: PASS

---

## Executive Summary

Re-review after qa-fix cycle 3 (`0dbdd72c`). The guard now walks all 58 shared sources (`git ls-files -- 'shared/resources/*.md'` → 58; corpus 663 files / 2,098 links / 958 relative, 0 broken) and its per-half floor goes red when the pathspec is narrowed again. The scoped review of the four changed files found **no correctness bug** — two advisory cleanups in the zip-listing filter. First clean gate of the loop: `top_issues` empty, PASS 100/100 → PR conformance review (5c).

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools + one read-only Explore subagent over the diff scoped to files changed since gate 3 (`SAFETY_REPROBE=false`): `bundled-links.test.js`, `bundle-link-rewrite.test.js`, `bundled-parity.mjs` + test — 753 lines. Step 4b: not applicable.

Re-review scope: since 2026-09-12T15:49Z (default) — 4 files

### Re-Review Context

| Cycle-3 finding | Status | Evidence |
| --- | --- | --- |
| C3-CR-1 shared-sources pathspec | FIXED | `shared/resources/*.md` → 58 files; `FLOOR_SHARED_SOURCES=20` red under the old pathspec (`only 0 … visited`) |
| C3-CR-2 external `unzip` | FIXED | `python3 -m zipfile -e / -l` |
| C3-CR-3 recomputed `BUNDLER` | FIXED | exported + imported |

## New Findings This Cycle

- Cleanup `tests/bundle-link-rewrite.test.js:210` — two filter clauses carried over from the `unzip -l` format are dead with `python3 -m zipfile -l` (single header row, no trailer). Advisory.
- Cleanup `tests/bundle-link-rewrite.test.js:207` — `run("-m", …)` passes an interpreter flag through a parameter named `script`; works, reads oddly. Advisory.

## Verification

| Check | Result |
| --- | --- |
| Affected suites (3 new + 2 eval parity) | 75/75 |
| `npm run ci:fast` on `0dbdd72c` | 3,202 pass / 0 fail |
| `prettier --check .` | clean |
| `bundle --check --all` | 126 skills, 0 problems |
| CI on `0dbdd72c` | branch-policy / shellcheck / validate / link-check success; `test` in progress at review time (green on the two prior heads) |

## Success Criteria

All six hold; criterion 1 now proven by the guard over both halves of the corpus (663 files), not by a hand-scan.

## NFR Assessment

Performance PASS · Reliability PASS · Security PASS (evidence: reasoned, probes: 0) · Maintainability PASS.

## Code Review

**Correctness bugs (0).** **Cleanups (2)** — above. Mutation-proven this cycle: C3-CR-1 floor — yes.

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment Recommendation**: APPROVED

**QA Report**: `task.108.qa.4.bundler-rewrites-relative-links.md` · **Gate File**: `task.108.gate.4.bundler-rewrites-relative-links.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
