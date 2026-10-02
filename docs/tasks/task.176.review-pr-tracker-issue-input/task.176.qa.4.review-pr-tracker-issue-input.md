# QA Report: Task 176 - /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Task**: [task.176.review-pr-tracker-issue-input.md](./task.176.review-pr-tracker-issue-input.md)
**Gate File**: [task.176.gate.4.review-pr-tracker-issue-input.yml](./task.176.gate.4.review-pr-tracker-issue-input.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: PASS

---

## Executive Summary

Cycle 4 re-reviewed PR #554 at `ebb9c60`. All seven gate-3 findings are fixed and mutation-proven.
There is no HIGH or MEDIUM finding. One low-severity `.env` parse edge stays open. The rest is
advisory, and one advisory finding is pre-existing.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Gate-3 finding | Status |
| --- | --- |
| CR3-1 Step 0 altssh parse | FIXED — one expression at three sites; mutation red |
| CR3-3 `.env` export/CRLF | FIXED for those forms; the inline-comment form remains (CR4-2) |
| CR3-2 legacy artifacts | FIXED — consolidated §0a rule; mutation red |
| CR3-4, CR3-5, CR3-6, CR3-7 | FIXED |

---

## Testing Scope

### Review Methodology

The review used direct tools plus one read-only diff-review subagent. The subagent took 371 s
(`duration_ms` 371245).

Re-review scope: files changed since gate 3 (head 41252c36fec2; 3 files) — default

When I first built the scoped patch, it was empty. The file list was a scalar, and zsh did not
word-split it — the trap qa-task Step 3b documents. I rebuilt the patch from an array (3 files,
1663 lines) before dispatching the reviewer.

The cycle 3 commit message says `review-pr.test.js` went from 175 to 189 tests. The suite holds 187.
The message is wrong; the suite is not.

---

## New Findings This Cycle

- **[low]** `skills/review-pr/SKILL.md:135` — an inline `# comment` on the `.env` line defeats the quote strip (CR4-2)
- Advisory: CR4-1 (pre-existing, rung 2 has no artifact filter), CR4-3 (trade-off in the §0a keep rule), CR4-4 (test strength)

---

## Success Criteria Verification

All criteria PASS:

- The suite passes: 187 tests under bash and zsh.
- 174/174 real `github_issue` lookups resolve to one document.
- The reviewer classified every keyed file in `docs/`: 180 kept, 11 dropped, 0 duplicates.

---

## Issues Found

**HIGH (0)**. **MEDIUM (0)**. **LOW (1)**: CR4-2.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (plus 3 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (engine). The parser is unchanged this cycle.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (3):**
- [low/medium] `skills/review-pr/SKILL.md:416` — rung 2's `pr_number` grep has no artifact filter. This is **pre-existing** (the rung 2 command is identical on `origin/develop`) and routed to `recommendations.future` (CR4-1).
- [low/high] `skills/review-pr/SKILL.md:135` — `.env` inline comment → **promoted CR4-2**
- [low/low] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:124` — a flat work item whose basename holds a kind word is now dropped. No such layout exists in `docs/` (CR4-3).

**Cleanups (1):**
- `skills/review-pr/tests/review-pr.test.js:1729` — the one-expression test counts only canonical-form sites (CR4-4)

Provenance (5b): CR4-1 is pre-existing, because `origin/develop` carries the same rung 2 command.
The other findings are in code this branch adds.

**Boundary**: `boundary: true` (`parse-target.sh`). The parser is unchanged this cycle, so the
cycle-2 hand probe stands.

**Mutation proofs** (cycle 3's fixes; each reverted with a `cp` snapshot). Every row is `covered`:

- CR3-1 one expression → `every remote → owner/repo parse in SKILL.md uses one expression`
- CR3-4 slash before `.git` → `remote → owner/repo (bash|zsh): every remote shape…`
- CR3-3 export/CR `.env` → `Step 0b (bash|zsh): an export-form or CRLF .env…`
- CR3-5 issue-arm warnings → `Step 0b (bash|zsh): the issue arm says when it could not compare`
- CR3-2 legacy artifacts excluded → `§0a lookup (bash|zsh): an unnumbered legacy artifact…`
- CR3-2 dir-named item kept → `§0a lookup (bash|zsh): a slug that is a kind word…`

---

## Test Artifacts

```bash
npm run validate -- skills/review-pr/   # ✓
npm run bundle:check                    # rc 0
TMPDIR=/tmp node --test skills/review-pr/tests/review-pr.test.js   # 187 pass
```

---

## Final Assessment

**Gate Status**: PASS (one open LOW finding)
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

**Next Steps**: the loop route engine decides whether CR4-2 takes a fix cycle or hands to 5c.
