# QA Report: Task 176 - /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Task**: [task.176.review-pr-tracker-issue-input.md](./task.176.review-pr-tracker-issue-input.md)
**Gate File**: [task.176.gate.2.review-pr-tracker-issue-input.yml](./task.176.gate.2.review-pr-tracker-issue-input.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: FAIL

---

## Executive Summary

This is the cycle 2 re-review of PR #554 at `4583942`. All ten gate-1 findings are fixed and
mutation-proven, and 175 tests pass. The refute pass then found one HIGH finding. Bitbucket PR URLs
never carry `repo=`, so the owner/repo HALT that the CHANGELOG and SKILL.md promise for bitbucket.org
never fires. It also found two medium findings where cycle-1 fixes meet.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — CR2-1 fixed

---

## Re-Review Context

| Gate-1 finding | Status |
| --- | --- |
| CR-1 §0a misses `sprint-review-summary.md` | FIXED — fixture siblings; mutation red |
| CR-2 `bb_pr_search` in another block | FIXED — one rungs 3–4 block; mutation red |
| CR-3 host check binds no inputs | FIXED — one Step 0b block; mutation red |
| QA-1 newline forges parser output | FIXED — control characters refused; mutation red |
| CR-8 owner/repo named `issues`/`pull` | FIXED for github.com — positional reader; mutation red |
| CR-4, CR-5, CR-6, CR-7, CR-9 (advisory) | FIXED — each mutation red |

---

## Testing Scope

### Review Methodology

The review used direct tools plus one read-only diff-review subagent, which ran a **refute pass**
(cycle 2). The subagent took 327 s (`duration_ms` 327219). No safety re-probe ran: gate 1's security
axis read `PASS reasoned`.

Re-review scope: unscoped — cycle 2 refute pass over the whole `origin/develop...HEAD` diff (bundled
`references/` copies excluded)

Step 4b: the new blocks are still refused fail-closed by `qa-execute-snippets.mjs`, because they call
`gh`, `git` and `curl`. They are executed instead by `review-pr.test.js`:

- Step 0b runs as one block in a consumer-shaped git repo.
- Rungs 3–4 run with a stub `gh`.
- `bash -n` and `zsh -n` run over every fenced block.

---

## New Findings This Cycle

- **[high]** `skills/review-pr/scripts/parse-target.sh:173` — the bitbucket.org arm emits no `repo=`, so the owner/repo HALT never runs on Bitbucket → read Bitbucket web and API paths by position (CR2-1)
- **[medium]** `skills/review-pr/SKILL.md:143` — the SSH-alias arm skips the owner/repo check, which `repo_of` can make → HALT on a repo mismatch there too (CR2-2)
- **[medium]** `skills/review-pr/SKILL.md:234` — the rungs 3–4 block guards only `KIND`; an unbound `DOC_FILE` or `JIRA_KEY` fails silently → add `:?` / `?` guards (CR2-3)
- **[low]** `skills/review-pr/SKILL.md:148` — `$JIRA_URL` is never bound in an `.env`-only setup → bind it, or say the host was not checked (CR2-7)
- Advisory (medium confidence): CR2-4, CR2-5, CR2-6, CR2-8, CR2-9 — see Code Review

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0 | PASS | — |
| Phase 1: Parser | FAIL | CR2-1 |
| Phase 2: Resolution | CONCERNS | CR2-2, CR2-3, CR2-7 |
| Phase 3: Bundle, docs, changelog | CONCERNS | The CHANGELOG claims a Bitbucket owner/repo HALT that does not happen |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| New forms parse and route | PASS | 23 cases × 2 shells |
| Selection outcomes stated | PASS | — |
| PR-URL host mismatch HALTs; Jira host warns | CONCERNS | The host check holds; the documented Bitbucket owner/repo check does not (CR2-1) |
| Old forms parse as before | PASS | — |
| Jira-key → branch fallback | PASS | — |
| Key match never auto-resolved | PASS | — |
| §0a lookup anchored, quote-tolerant, one doc | PASS | Advisory CR2-5: a kind word anywhere in the path excludes |
| No extra call for a PR target | PASS | — |
| Suites green; mutation check | PASS | 175/175; 10/10 cycle-1 mutations red |
| `bundle:check` + full suite | PASS | `bundle:check` rc 0; `ci:fast` 5108 pass at the fix (1 load-sensitive timing failure, passes alone) |

---

## Breaking Changes Validation

**Overall:** PASS. The stricter §0a lookup is documented, and the `sprint-review-summary.md`
regression is fixed.

---

## Issues Found

**HIGH (1)**: CR2-1. **MEDIUM (2)**: CR2-2, CR2-3. **LOW (1)**: CR2-7.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 1 (plus 5 advisory)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR2-3 and CR2-7 are unbound reads that fail silently.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (engine — no entry form fits a one-string script)
- The parser was hand-probed per `probe-boundary-rule.md` §5.1 with 28 inputs × bash/zsh. No command
  executed, and LF, CR and DEL are refused.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (8):**
- [high/high] `skills/review-pr/scripts/parse-target.sh:173` — Bitbucket PR URLs carry no `repo=` → **promoted CR2-1**
- [medium/high] `skills/review-pr/SKILL.md:143` — the alias arm skips the owner/repo check → **promoted CR2-2**
- [medium/high] `skills/review-pr/SKILL.md:234` — the rungs block guards only `KIND` → **promoted CR2-3**
- [medium/medium] `skills/review-pr/SKILL.md:151` — the GitHub-issue check is gated on TRACKER, ignores host, and passes when `gh repo view` fails (CR2-4)
- [low/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:115` — the exclusion matches a kind word anywhere in the path (CR2-5)
- [low/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:114` — an unreadable `docs/` reads as `DOC_STATUS=none` (CR2-6)
- [low/high] `skills/review-pr/SKILL.md:148` — `JIRA_URL` is never bound → **promoted CR2-7**
- [low/medium] `skills/review-pr/SKILL.md:225` — the printed re-bind line omits `TARGET_HOST` (CR2-8)

**Cleanups (1):**
- `skills/review-pr/SKILL.md:300` — the copied host-anchored Bitbucket sed misreads `altssh … :443` remotes (CR2-9)

Provenance (5b): every finding is in code this branch adds.

**Boundary**: `boundary: true` (`parse-target.sh`). Engine `probes_executed: 0`. The hand probe is
recorded above.

**Mutation proofs** (cycle 1's fixes, from the 5b run; each reverted with a `cp` snapshot). Every row
is `covered`:

- QA-1 control-char refusal → `parser (bash|zsh): malformed RAPP-1…`
- CR-8 positional reader → `parser (bash|zsh): …org/issues/issues/5`
- CR-1 sprint-review exclusion → `§0a lookup (bash|zsh): a quoted key with a .request. sibling…`
- CR-5 ambiguous exit 1 → `§0a lookup (bash|zsh): two work items with one key HALT…`
- CR-7 input guard → `§0a lookup (bash|zsh): an unbound KEY_VALUE fails loudly…`
- CR-3 one block → `Step 0b (bash|zsh): …` (20 red)
- CR-2 in-block definition → `bb_pr_search is defined in the same block…`
- CR-4 STEM binding → `rungs 3–4 (bash|zsh): the branch stem binds STEM itself…`
- CR-9 owner/repo → `Step 0b (bash|zsh): a GitHub PR URL for another repo…`
- CR-6 alias warns → `Step 0b (bash|zsh): an SSH-alias remote only warns…`

---

## Test Artifacts

```bash
npm run validate -- skills/review-pr/      # ✓
npm run bundle:check                       # rc 0
shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh   # clean
TMPDIR=/tmp node --test skills/review-pr/tests/review-pr.test.js tests/unbound-default-reads.test.js tests/fenced-bash-positional-params.test.js tests/bundled-links.test.js   # 175 pass
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH finding. The documented Bitbucket owner/repo check is missing, so a wrong-repo
PR URL is reviewed silently.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` on gate 2, then cycle 3.
