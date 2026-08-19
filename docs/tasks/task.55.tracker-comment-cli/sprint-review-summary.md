# Sprint Review Summary — Task 55

**Task**: [Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose](./task.55.tracker-comment-cli.md)
**Issue**: [#233](https://github.com/Gamaroff/agent-skills/issues/233) · **PR**: [#257](https://github.com/Gamaroff/agent-skills/pull/257)
**Accepted**: 2026-08-19 · **Gate**: PASS 92/100 · **QA Cycles**: 2

---

## Summary

`jira-sync.js` had no comment function at all. Every Jira comment in this repository was an `addCommentToJiraIssue` MCP call an agent made by following prose, and every GitHub issue comment was a bare `gh issue comment`. Neither could be intercepted, retried by code, or made idempotent — interception needs a chokepoint, and prose has none.

This builds the missing endpoint, adds a CLI peer of `jira-stage.js` / `gh-stage.js`, routes every prose site through it, and adds a guard so they cannot grow back.

## What shipped

- **`addComment()`** in `jira-sync.js` — transcribed from `putIssueAtomic`, through the same `http()` factory, so task 53's access gate covers it for free.
- **`shared/resources/tracker-comment.js`** — same `--issue` / `--stage` / `--json` contract and exit codes as both peers; the access gate sits above the first credential read, so a restricted run demonstrably makes no network call. The Jira `require` is lazy, honouring the intent of `gh-stage.js`'s module boundary.
- **ADF renderer extensions** — a `codeBlock` builder, an `em` mark, and CommonMark-correct fence tracking. Every existing caller benefits: `sync-jira-{task,story,epic}` previously flattened fenced blocks.
- **Idempotent comments** — an invisible HTML marker on GitHub, a small italic footer on Jira (ADF drops unknown nodes). 0 matches posts, 1 reports `already`, **2+ reports `unverifiable` and posts nothing** — replacing the `| head -1` convention that makes a duplicate invisible forever.
- **25 sites rewritten**, including one that had drifted to raw `curl` against REST v2 and was invisible to both interception layers.
- **A parity guard** — an absolute prohibition on the MCP literal outside two canonical docs, plus a meta-test proving the guard can reject.

## Demo note

The feature demonstrated itself during acceptance. The completion comment on issue #233 was posted **by the CLI this task built**, and an immediate re-run with a different body returned `reason: "already"` and posted nothing.

## Quality

**12 defects found and closed across 2 QA cycles, every one mutation-proved** — each fix reverted, the suite observed red, and reverted back. Three were HIGH, and all three were the same failure mode this task exists to remove: a silent loss that looks exactly like success.

The most instructive: **the first fix for a fence bug reintroduced the same bug class**, collapsing 31,235 characters of a real shipped document into a single code block — invisible to a fully green 1483-test suite. And **the parity guard initially passed on the exact regression it names**, because its proximity window was pre-satisfied by every site's own reason table.

**Final**: 1513 tests passing · `validate:all` 115/0 · prettier clean · CI green on the exact head.

## Known limitations / follow-ups

Recorded in gate 2 as non-blocking `future` items:

1. `capDescriptionAdf` drops an oversized block from the **middle** while its notice claims trailing omission — pre-existing, made likelier by the fence branch.
2. Authored GitHub-path comment sites still post via bare `gh issue comment` — interception-covered but **not idempotent**, so a resumed run comments again. Out of this task's scope (which targeted the MCP sites), and the remaining half of the idempotency story.
3. `bundle_skill.py` does not follow links inside already-bundled docs, so a transitively-referenced file can stay stale forever while the bundler reports "in sync". Worked around by hand here.
4. `adfContainsText` is now unused but still exported; `AGENTS.md` sits outside the parity guard's scan set.

## Impact

Comments can now be retried by code rather than by the model, intercepted by the restricted-access layers, and deduplicated across a resume. This was the load-bearing task of the 51–57 sequence: tasks 56 and 57 build on the contract it pins.
