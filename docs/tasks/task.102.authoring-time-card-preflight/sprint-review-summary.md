# Sprint Review Summary — Task 102

**Task:** run the card preflight where the defect is created
**Status:** ✅ Accepted — 2026-09-10
**PR:** [#373](https://github.com/Gamaroff/agent-skills/pull/373) → `develop`
**Issue:** [#372](https://github.com/Gamaroff/agent-skills/issues/372)
**QA Gate:** PASS (100/100) · **QA Cycles:** 1 · **CI:** 5/5 green

---

## Summary

A check that costs nothing was running one step *after* the moment the defect it catches is
introduced. `--check-card` is offline — no auth, no network, no writes — and it reports whether a
document will publish a complete tracker card or a thin one. All three `review-*` skills ran it.
None of the three `create-*` skills did.

The consequence was measured, not hypothetical: `task.99` was authored without a `## Success
Criteria` block, and the first thing to notice was a zero-tolerance corpus assertion on PR #355 — a
full push–CI round trip for something an offline call catches in under a second. Second known
occurrence of the class.

This task moves the section specs to a single definition and calls the checker where the document is
written.

## Success Criteria Met

9 of 9, each verified by execution rather than by reading:

1. ✅ `create-task`, `create-story`, `create-epic` each run the preflight on the document just written
2. ✅ Advisory at authoring — exit 0 even with findings
3. ✅ `review-*` remains the blocking gate; the advise-then-gate split is unchanged
4. ✅ The section specs are defined in **exactly one** place, asserted with a non-vacuity floor
5. ✅ A document missing `Success Criteria` produces a finding — demonstrated on a fixture
6. ✅ All four `sync-jira-*` suites pass unchanged; each still exports its spec
7. ✅ The check works for a consumer with no `sync-jira-*` installed
8. ✅ The § 8 naming question answered — **tracker-agnostic** — with placement following
9. ✅ `npm run bundle` run; regenerated `references/` committed

## Key Changes

| Change | Where |
| :--- | :--- |
| Four card section specs consolidated into one definition, plus `CARD_SECTIONS_BY_KIND` | `shared/resources/jira-sync.js` |
| New tracker-neutral preflight CLI | `shared/resources/card-preflight.js` |
| The contract: what the call is, and why the spec is never restated in a skill | `shared/resources/authoring-card-preflight.md` |
| Authoring-time call | `create-task` §4.6, `create-story` §6.2a, `create-epic` |
| Re-export instead of define | all four `sync-jira-*` scripts |
| New index section | `AGENTS.md` § Authoring-Time Card Preflight |
| 14 assertions — anti-vacuity, one-definition, parity, isolation | `shared/resources/tests/card-preflight.test.mjs` |

## Testing & QA

- **3050 tests, 0 failures** (fast gate); 420 in the `sync-jira-*` suites unchanged; 37-test corpus
  preflight unchanged
- **CI: 5 of 5 jobs green**, polled to a decision and re-verified on the head carrying acceptance
- **Every fix mutation-proved.** Seven mutations across the run, each reverted and confirmed red in
  the predicted place, then restored

## What this run found that the task had wrong

The most useful output of the pipeline was not the feature — it was four corrections, each caught by
a different stage, none of which the previous stage could have caught:

1. **Review (Step 2)** — two of the three claims in the task's own "verified rather than assumed"
   section did not hold: `create-epic` did not bundle the library, and the `create-bug-report`
   exclusion rested on a Change Log rule misread as a tracker-card rule.
2. **Review (Step 2)** — there were **four** section specs, not three. Success Criterion 4's "exactly
   one place" was unsatisfiable without enumeration until the fourth moved too.
3. **QA (Step 5)** — the new CLI hand-rolled a frontmatter parse the library already exported, and
   the two diverged. Latent across all 177 documents in the repo — which is how a parse divergence
   stays invisible.
4. **PR review (Step 5c)** — the *fix* for (3) leaked the whole document body into the `--json`
   payload: 17.3 KB of 18.3 KB. A regression introduced by a fix, invisible to a gate that had
   already passed. This is the case for a lens that runs *after* the gate.

A fifth was found by neither: a comment moved into a bundled file changed the bundle graph, adding
~16,000 lines of generated churn across 20 skills, because the bundler treats any `shared/resources/`
path in a file — comments included — as a dependency.

## Follow-ups (filed, not forgotten)

- **Bug reports have no card preflight at any layer** — not at authoring, not in `review-bug` (0
  references where the other three have 1 each), not in the CI corpus. Recorded in the task's § 4
  with its measurements; the spec move already lands the bug spec in the shared definition, so the
  follow-up is a call site and a test, not another move.
- `qa-execute-snippets` classifies a read-only `node <script> --file` as mutating, so Step 4b could
  not exercise the very blocks this task adds.

## Impact

The failure this removes is **silent by construction** — a heading the spec does not recognise raises
no error; the sync succeeds, reports success, and publishes a thin card. There was nothing for an
author to notice. Now there is, at the moment they could still fix it in one edit, and it costs one
offline call.
