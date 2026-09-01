# Sprint Review Summary — Task 69

**Task:** Give `/qa-story` and `/qa-task` a Bitbucket PR-comment path
**PR:** [#295](https://github.com/Gamaroff/agent-skills/pull/295) → `develop`
**Status:** Accepted
**Date:** 2026-09-01

---

## Summary

The QA gate decision is posted to the pull request by `/qa-story` (step 6) and `/qa-task` (Step 13), and both mark that step **BLOCKING**. Both called `gh pr comment` with no Bitbucket arm — so on a Bitbucket-hosted repo, a step the skills call mandatory could not succeed at all. `gh` cannot address a Bitbucket PR.

Both steps now branch on `$VCS` and carry a working Bitbucket arm, lifted from the recipe this repo already ships twice.

## Success criteria met

| Criterion | Result |
|---|---|
| On `VCS=bitbucket`, both skills post the gate decision to the Bitbucket PR | ✅ (by inspection — repo is GitHub-hosted) |
| On `VCS=github`, behaviour unchanged apart from `--body-file` | ✅ (this is the criterion QA caught failing, and it was fixed) |
| `/review-code`'s cross-reference to `/qa-story` step 6 becomes true | ✅ (stale note found and rewritten during finalise) |
| Both skills have a `tests/` directory registered in `package.json` | ✅ |
| Every fix mutation-proved | ✅ (8 mutations across develop, qa-fix and QA) |
| Wording identical between the two skills | ✅ |

## Key changes

- **`$VCS` branch** in both QA skills' PR-comment step — a PR comment is a VCS operation, the same distinction task 68 drew for `/review-code`.
- **Bitbucket arm** — `jq`-built `{content:{raw:…}}` POSTed to `…/pullrequests/{id}/comments`, copied verbatim from `qa-fix`.
- **GitHub arm moved to `--body-file`** — a correctness fix: the body carries backticks and `$(…)`, which an inline `--body` invites the shell to evaluate before `gh` sees them.
- **Platform preamble added to both** skills (it was absent from both), guarded.
- **`qa-story`'s resolver line normalised** off a broken `$(dirname "$0")` form — these snippets run from the repo root, so `$0` was never the skill file. A latent bug, outside the original scope, found during review.
- **Two contract suites** (25 tests) with a cross-file drift guard, both registered in `package.json`.

## Testing & QA

- **QA cycles:** 2 — cycle 1 **FAIL 60/100**, cycle 2 **PASS 100/100**.
- **Full gate:** 2141 tests, 0 failures, prettier clean.
- **Defect found and fixed:** TASK69-001 (HIGH) — `qa-story`'s body emitted literal `$PR_NUMBER` / `$PR_TITLE` / `$PR_STATE` after the move to a single-quoted heredoc. Silent on GitHub: the comment still posted, so the BLOCKING exit-code check passed.
- **Coverage gap found and fixed:** TASK69-002 (MEDIUM) — no test could see the body's content, which is why the HIGH defect shipped past three recorded mutation proofs.

## What this run demonstrates

The three mutations recorded during development were all *structural*, so they proved the structural assertions and nothing else. Coverage looked complete because every mutation anyone thought to run was of the kind already covered. QA caught it by running a mutation the developer had not — and then by probing the *new* guard for vacuity, confirming it fails loudly rather than silently when its anchor moves.

## Known limitations

1. **The Bitbucket arm ships unexecuted.** This repo is GitHub-hosted, and Step 4b cannot execute the blocks either (they post comments, correctly deny-listed as mutating). Verified by inspection against two shipped call sites.
2. **Step 4b provides no coverage for these two steps, ever** — recorded in the gate so it stops being rediscovered each cycle. It is why the contract-test gap mattered as much as it did.
3. **TASK69-003 (LOW) left open** — `COMMENT_RC` unset on an unreachable third `$VCS` branch.

## Follow-up

- **task 70** — inline Bitbucket comments.
- **A `bitbucket_call_with_retry` helper** would close the single-shot asymmetry across every Bitbucket call site in the repo. Deliberately deferred by this task rather than smuggled in.

## Tracker

No linked tracker issue — task 69 carries no `github_issue`, so no tracker mutation was owed at any point in this run.
