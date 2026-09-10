# Sprint Review Summary — Task 70

**Task:** Build the inline PR comment primitive, on GitHub and Bitbucket
**PR:** [#308](https://github.com/Gamaroff/agent-skills/pull/308)
**Accepted:** 2026-09-02
**QA Gate:** PASS (92/100), 2 cycles

---

## Summary

`/review-code --comment` documented "post each finding as an inline review comment at its `file_line`" since it was written, and no code implemented it — there was no `pulls/*/comments` or `pulls/*/reviews` call anywhere in the repository. `/review-pr` scoped the behaviour out and named it as its own task. This is that task.

`shared/resources/pr-inline-comment.js` is now the peer of `tracker-comment.js` one axis over: that CLI comments on a tracker **issue** and branches on `$TRACKER`; this one comments on a pull **request** and branches on `$VCS`.

## Success criteria met

- A finding with a valid `file_line` posts inline on both platforms
- **A finding that cannot be anchored degrades to the summary comment and is never dropped** — the one invariant
- GitHub posts one batched review rather than N comments
- `--dry-run` resolves everything and posts nothing
- Exit codes and `reason` vocabulary match the peer CLI; `--body-file` only; the CLI resolves `$VCS` itself

## Key features

| | |
|---|---|
| **Degradation** | Six paths degrade rather than drop: 422, duplicate marker, unreadable comment list, stale anchor, update failure, non-anchor batch failure. Each reports `anchor-failed`, never `posted` |
| **Re-run rule** | Marker + update-in-place on both arms. Chosen because it needs neither thread resolution nor replies, both of which the task scoped out |
| **Access gate** | Between the local work and the first remote call, with one deferred record per finding. Registering `bitbucket.pr.comment` made the roster's 24th kind |
| **Wiring** | `/review-code --comment` calls the CLI instead of describing it; `/review-pr` gains `--inline` and drops its out-of-scope note |

## Testing & QA

- **47** unit tests, **65** skill-contract tests, **127** repo guards — all green, CI green on the final head
- **7 mutation proofs** across two QA cycles, each turning exactly its own assertion red and each restored to green
- **29 boundary probes** executed against the shipped validators at finalise — 0 reproduced
- Restricted-mode tests inject **throwing** transports, so a network leak fails the test rather than being counted afterwards

## What QA caught, and why it matters

Cycle 1 gated **FAIL (50/100)** on nine issues. The module whose sole purpose is *"a finding is never dropped"* dropped findings on two reachable paths, and the jq wiring it into both review skills could not execute at all — while its own suite was 40/40 green. **Three of the four worst defects came from the independent reviewer**, not the self-check.

Cycle 2 ran as a **refute pass over the whole diff** and found eight more, two of which were in the original commit and invisible to cycle 1 (`gh api --paginate` needs `--slurp`; the jq aborted the entire array on one malformed `file_line`). Cycle 1's own fixes had also silently killed a neighbouring branch.

The durable outcome is a guard rather than two corrections: both skill test suites now **extract the documented jq from SKILL.md and execute it against a schema-shaped fixture**. A snippet that is only read will drift again.

## Known limitations

- **The Bitbucket arm has never run against Bitbucket.** Payloads and re-run behaviour are fixture-tested; the transport is not. Treat a first Bitbucket run as a smoke test.
- **Maintainability is CONCERNS.** The two arms carry near-duplicate partition ladders — the direct cause of one defect in this task. Follow-up: extract one `partitionFindings()`.
- **The summary comment has no marker**, so repeated runs append rather than update (`TASK70-C2-008`, open by decision).
- **No tracker issue is linked.** Run `/sync-github-task` to create one.

## Demo notes

```bash
# Dry run — resolves everything, posts nothing
node shared/resources/pr-inline-comment.js --pr 308 \
  --findings-file findings.json --dry-run --json
```

Findings are `{path, line, body, side?}`. Anything that cannot anchor comes back as `anchor-failed` and appears in the summary comment — never missing.
