# Sprint Review Summary — Task 97

**Task:** `/develop-task` Step 2 has no recovery path when `review-task` Step 9 does not promote
**Status:** ✅ Accepted — 2026-09-08
**PR:** [#350](https://github.com/Gamaroff/agent-skills/pull/350) · **Issue:** [#348](https://github.com/Gamaroff/agent-skills/issues/348)

---

## Summary

`/develop-task` Step 2 decided whether to run `/review-task` by looking at **status**. A task at
`planned` always re-ran the review, and if the status was still `planned` afterwards the pipeline
halted unconditionally.

Both tables were consistent, and the halt was the *correct* response to a promotion that did not
happen. What was wrong is narrower and worse: **the only remedy an operator reaches for is provably
a no-op.** The halt lands before any work exists — exactly when re-running the review looks like the
fix — and whatever withheld the promotion fires again identically.

The skip decision now keys on **evidence of review** (a current report) rather than on status,
without weakening the gate that stops development against an unreviewed card.

## What was delivered

- **New engine** `shared/resources/review-report-freshness.js` — pure, CommonJS, no CLI. Returns
  `fresh` / `stale` / `absent` plus the reason the halt message needs.
- **Freshness from document content, never mtime** — the task's frontmatter `updated:` against the
  report's body `**Reviewed:**` line. mtime is the checkout time in a fresh clone, so an mtime rule
  decides differently in CI than on a developer's machine.
- **Both Step 2 tables rewritten**, exhaustive over `fresh`/`stale`/`absent`, plus a three-fact halt
  message that names *which* precondition failed.
- **68 tests** where there were none, and the divergence from the pipeline's other (mtime-based)
  freshness rule stated rather than left for a reader to trip over.

## Demo notes

Run the engine against any task and its review report:

```
{verdict: "fresh", reason: "current", taskDate: "2026-09-07", reportDate: "2026-09-07"}
```

Task 97's own review report classifies `fresh` — so a re-run of this very pipeline would now skip
Step 2 on the report rather than halt. The fix demonstrated on itself.

## What this cost, and why that is the interesting part

The rule was defeatable **seven** ways before it held — every one toward `fresh`, which is the
over-correction the task's own §10 named as *worse* than the halt it removes:

| Found by | Route |
| --- | --- |
| QA cycle 1 | HTML comment; 4-space indent; nested fence; date on the following line |
| QA cycle 2 (refute) | **two of cycle 1's own fixes cancelling out** — comment-stripping inside a fence produced a bare delimiter that closed it |
| Step 5c PR review | phantom fence from an inline code span; comment removal shifting the indent bound |

**The full suite was green at every one of those moments.** Three §9 criteria were also ticked
before they were true — one of them genuinely unmet, pointing at a note that did not exist — and
were corrected rather than accepted.

## Impact

Consumers whose boards use `sign-off.enforcement: blocking` or `change-log.enforcement: blocking`
can no longer produce a card that is demonstrably reviewed and permanently unstartable. Under stock
defaults nothing changes — which is why the halt had never been observed, and why it was *predicted*
rather than hit.

## Known limitations / follow-ups

1. Step 4 of the develop pipelines silently drops every repo-root file from staging scope, while
   `/develop` requires a CHANGELOG update for behaviour changes.
2. `develop-bug` still carries the presence-only Step 2 gate in its own step-2 document.
3. No CI check that a bundled `references/*.js` matches its `shared/resources/` source.
