# Sprint Review Summary — Task 66

**Task:** Review a pull request against the paper trail that is supposed to justify it
**Status:** ✅ Accepted — 2026-08-31
**PR:** [#283](https://github.com/Gamaroff/agent-skills/pull/283) · **Issue:** [#282](https://github.com/Gamaroff/agent-skills/issues/282)

## Summary

Added `/review-pr`, a skill that reviews a pull request **as a claim**: does this change deliver what its story or task promised, and is the evidence behind it real?

The repo could already review a diff (`/review-code`) and review a document before implementation (`/review-story`, `/review-task`). Nothing asked the question a human asks when opening a PR. The gap was structural: every resolver ran doc → branch → PR; nothing went the other way.

## What was delivered

- **`skills/review-pr/SKILL.md`** — nine-step workflow: platform resolve → target parse → PR resolve → six-rung work-item cascade → artifact collection → tracker context → diff build → two parallel lenses → verdict → report → optional comment → cleanup
- **`shared/resources/pr-conformance-prompt.md`** — new conformance lens checking coverage, scope, trail, consistency; its YAML deliberately mirrors `code_review:` so one renderer serves both
- **45 contract tests** over the skill's prose
- **Standards doc sweep** registering the new `.pr-review.` artifact kind in `file-naming.md`, both Co-located artifacts tables, and `pipeline-artifacts.md`
- **Consumer docs**: CHANGELOG, `commands.md`, `activation-phrases.md`, README, regenerated catalog (119 skills)

## Demo notes

Run it against merged work that has a full trail:

```bash
/review-pr 281            # → resolves task 65, reads gate.3 (PASS 90), dod.1
/review-pr 281 --no-code  # conformance lens alone
```

The resolution cascade was exercised against exactly this data: rungs 1, 2 and 3 all converge on the same document.

## Quality

| | |
|---|---|
| QA cycles | 2 — CONCERNS (70/100) → **PASS (92/100)** |
| Code-review findings | 11, all closed and mutation-proved |
| Mutation proofs | 20 across both cycles |
| Tests | 45 contract; 1991 repo-wide, 0 failures |
| CI | 4/4 green |

**The QA gate did real work.** The diff reviewer found ten correctness defects and one cleanup *in the skill that had just been written*. Every testable one was confirmed by execution before being accepted — including a glob that matched **0 of 110** gate files because `globstar` is off by default, and an unanchored grep that resolved PR 28 to a document reading `pr_number: 281`.

Two of the eleven were the skill's *own tests* passing vacuously — assertions that would have stayed green with the behaviour deleted. The eleven mutation proofs run during development had not caught them, because neither assertion was among the behaviours anyone thought to revert.

## Known limitations

Three of twenty-two success criteria are met by documentation and contract tests, not by execution: no Bitbucket path has run against a live API, no PR comment has been posted by the skill, and the `ACCESS_TRACKER` deferral is proven on the GitHub path only. All three were declared as Deferred Work before QA ran; this repo is GitHub-hosted, so the Bitbucket path is not executable here.

## Follow-ups identified

1. Live two-lens end-to-end run producing a real verdict
2. `--comment` post-then-edit idempotency, demonstrated
3. Inline PR comments — no skill in the repo posts one; its own task
4. **`/review-code` Step 4 branches on `TRACKER` where it should branch on `VCS`** — pre-existing bug found by this work
5. `/qa-story` step 6 and `/qa-task` are GitHub-only for the QA PR comment, yet `/review-code` tells implementers to mirror them for Bitbucket
