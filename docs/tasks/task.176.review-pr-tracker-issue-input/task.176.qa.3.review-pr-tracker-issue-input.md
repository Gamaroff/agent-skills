# QA Report: Task 176 - /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Task**: [task.176.review-pr-tracker-issue-input.md](./task.176.review-pr-tracker-issue-input.md)
**Gate File**: [task.176.gate.3.review-pr-tracker-issue-input.yml](./task.176.gate.3.review-pr-tracker-issue-input.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 re-reviewed PR #554 at `41252c3`. All nine gate-2 findings are fixed and mutation-proven, and
HIGH is back to 0. Two reproducible defects remain, both left by cycle 2's own edits:

- Step 0 still parses an altssh Bitbucket remote the old way.
- The `.env` read of `JIRA_URL` misses the `export` and CRLF forms.

The gate is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR3-1 fixed

---

## Re-Review Context

| Gate-2 finding | Status |
| --- | --- |
| CR2-1 Bitbucket PR URLs carry no `repo=` | FIXED — positional reader; mutation red |
| CR2-2 alias arm skips repo check | FIXED — mutation red |
| CR2-3 rungs block inputs unguarded | FIXED — mutation red |
| CR2-7 `JIRA_URL` unbound | PARTIAL — env and bare `.env` work; `export` and CRLF do not (CR3-3) |
| CR2-4, CR2-6, CR2-8, CR2-9 (advisory) | FIXED |
| CR2-5 (advisory) kind word in a path | FIXED for the case named, but regressed legacy unnumbered artifacts (CR3-2) |

---

## Testing Scope

### Review Methodology

The review used direct tools plus one read-only diff-review subagent. The subagent took 415 s
(`duration_ms` 414929).

Re-review scope: files changed since gate 2 (head 4583942c1e4e; 12 files) — default

The reviewer checked `repo_of`/`norm_host` on 14 remote shapes and the parser on 11 URLs, under both
shells. It also ran the §0a block against every real `github_issue` under `docs/`: all were found, and
none was ambiguous.

---

## New Findings This Cycle

- **[medium]** `skills/review-pr/SKILL.md:65` — Step 0 parses `ssh://git@altssh.bitbucket.org:443/ws/repo.git` as workspace `443` (CR3-1)
- **[low]** `skills/review-pr/SKILL.md:131` — the `.env` read misses `export` and CRLF (CR3-3)
- Advisory: CR3-2, CR3-4, CR3-5; cleanups CR3-6, CR3-7

---

## Success Criteria Verification

All criteria are as in gate 2. The PR-URL host criterion now holds on Bitbucket, because CR2-1 is
fixed. The §0a criterion holds on the real tree, with the advisory caveat CR3-2.

---

## Issues Found

**HIGH (0)**. **MEDIUM (1)**: CR3-1. **LOW (1)**: CR3-3.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (plus 3 advisory, 2 cleanups)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR3-1 makes a supported remote shape halt. CR3-2 is advisory: legacy artifacts carrying the key would
make the lookup halt.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (engine). The cycle-2 hand probe stands.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (5):**
- [medium/high] `skills/review-pr/SKILL.md:65` — Step 0 altssh parse → **promoted CR3-1**
- [medium/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:120` — the numbered-kind exclusion lets through 204 unnumbered legacy artifacts, none of which carries a key today (CR3-2)
- [low/high] `skills/review-pr/SKILL.md:131` — `.env` `export`/CRLF → **promoted CR3-3**
- [low/medium] `skills/review-pr/SKILL.md:124` — `repo_of` strips `.git` before a trailing slash; `TARGET_REPO` is only lowercased (CR3-4)
- [low/medium] `skills/review-pr/SKILL.md:162` — the issue arm is silent when origin is not github.com or is missing (CR3-5)

**Cleanups (2):**
- `skills/review-pr/SKILL.md:263` — two copies of the remote-to-repo expression (CR3-6)
- `skills/review-pr/SKILL.md:410` — the Step 2 filter restates §0a in older words (CR3-7)

Provenance (5b): every finding is in code this branch adds.

**Boundary**: `boundary: true` (`parse-target.sh`). Engine `probes_executed: 0`. No refusal-surface
change this cycle.

**Mutation proofs** (cycle 2's fixes; each reverted with a `cp` snapshot). Every row is `covered`:

- CR2-1 positional Bitbucket → `parser (bash|zsh): …bitbucket.org/ws/repo/pull-requests/7`
- CR2-2 alias repo check → `Step 0b (bash|zsh): an SSH-alias remote still HALTs…`
- CR2-3 `DOC_FILE` guard → `rungs 3–4 (bash|zsh): an unset DOC_FILE or JIRA_KEY fails loudly…`
- CR2-7 `.env` fallback → `Step 0b (bash|zsh): JIRA_URL is read from .env…`
- CR2-4 issue host → `Step 0b (bash|zsh): a GitHub issue URL on another host HALTs…`
- CR2-6 `docs/` readable → `§0a lookup (bash|zsh): a missing docs/ HALTs…`
- CR2-5 basename kinds → `§0a lookup (bash|zsh): a slug that is a kind word…`

---

## Test Artifacts

```bash
npm run validate -- skills/review-pr/   # ✓
npm run bundle:check                    # rc 0
shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh   # clean
TMPDIR=/tmp node --test skills/review-pr/tests/review-pr.test.js         # 175 pass
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR3-1 fixed

**Next Steps**: `/qa-fix` on gate 3, then cycle 4.
