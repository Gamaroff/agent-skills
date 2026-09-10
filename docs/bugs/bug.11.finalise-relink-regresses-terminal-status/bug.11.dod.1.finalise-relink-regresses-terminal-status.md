---
type: dod-verification
status: complete
bug: 'bug.11.finalise-relink-regresses-terminal-status'
created: '2026-09-06'
updated: '2026-09-06'
description: 'Definition of Done verification for bug.11 (finalise Document-link re-point regresses a card out of its terminal status). Bug-shaped DoD: fix evidence, regression proof, gates, security surface, documentation.'
---

# Definition of Done Verification — bug.11

**Bug:** bug.11.finalise-relink-regresses-terminal-status (general, Major/High)
**PR:** [#329](https://github.com/Gamaroff/agent-skills/pull/329) → `develop`
**Verification Started:** 2026-09-06
**Status:** COMPLETED — DoD SATISFIED

> **Method note.** This is a **bug-shaped DoD**, run inline rather than through the four
> story/task DoD subagents (AC traceability / security / compliance / docs). A general bug has no
> acceptance criteria and no parent story, so the AC-traceability and compliance agents have no
> input to work on. Every criterion below is instead evidenced by a command run in this session and
> reproducible from the citation given. `/finalise`'s own guidance sanctions this fallback for a
> document type it cannot process, and requires it to be recorded — this note is that record.

---

## Step 1: QA Report Review

**QA reports / gate files:** none — a general bug's verification is the develop-bug verify loop, not
a `qa-*` gate. The equivalent evidence is the **QA Iteration History** in
`bug.11.implementation.1.finalise-relink-regresses-terminal-status.md` and the **Developer Fix
Cycle** in the bug file itself.

**Verify cycles:** 4. Cycles 1–3 FAILED on `/review-code` findings and were fixed; cycle 4 PASSED.

| Cycle | Verdict | Findings | Fix commit |
|-------|---------|----------|------------|
| 1 | FAIL | 6 (1 bug + 5 cleanups; 4 fix-introduced, incl. a tautological test) | `21c78537` |
| 2 | FAIL | 3 (CR-5 partially fixed + 2 new; a rationale replaced by an incorrect one) | `6f0263e0` |
| 3 | FAIL | 4 (1 rationale outright backwards; a docs-only sweep that missed a runtime string) | `c8bde1bd` |
| 4 | **PASS** | — | — |

---

## Step 2: Fix Evidence

**Overall: ✅ PASS**

### The fix is present, and gated where it holds for every caller

**Status:** ✅ PASS
- Evidence: `shared/resources/jira-sync.js:4194` — `if (noTransition) return { transitioned: false, reason: "transition-suppressed", issueKey, localStatus };`, placed **before** the `loadStatusMap` resolution and before any HTTP.
- The gate is inside `syncDocumentStatus`, not at its callers. Rationale recorded in the bug's
  Iteration 1: a per-caller check is only as strong as the least-updated caller — and
  `sync-jira-epic`'s no-field-changes path was in fact missed on the first pass while every
  behavioural test still passed.

### The flag is wired at every call site

**Status:** ✅ PASS
- `skills/sync-jira-task/scripts/sync-jira-task.js` — 1 call site, forwards `args.noTransition`
- `skills/sync-jira-story/scripts/sync-jira-story.js` — 1 call site, forwards
- `skills/sync-jira-epic/scripts/sync-jira-epic.js` — **2** call sites (normal path + no-field-changes skip path), both forward
- Verified by: `grep -n -A 14 "syncDocumentStatus({" skills/sync-jira-*/scripts/*.js | grep -E "syncDocumentStatus|noTransition"` → four pairs.
- Held by test **E** (per call site) and **E2** (pins the epic's count at 2).

### The caller bug.11 named passes it

**Status:** ✅ PASS
- Evidence: `skills/finalise/SKILL.md` Step 7 block 3 — `... --doc-branch "$DURABLE_BRANCH" --no-transition --quiet`.

---

## Step 3: Regression Proof

**Overall: ✅ PASS**

**Regression suite:** `shared/resources/tests/jira-sync-no-transition.test.mjs` — **19 tests, 19 pass, 0 fail**.

Confirmed the suite is actually executed by `npm test` (not orphaned by the per-skill glob — a known
failure mode in this repo): the file is matched by the existing `shared/resources/tests/*.test.mjs`
entry and its test names appear in the `ci:fast` output.

### The fails-without property — six distinct mutations, each proven

| # | Behaviour reverted | Tests that go red |
|---|--------------------|-------------------|
| 1 | **The gate deleted entirely** | A, C, C2 |
| 2 | `transition-suppressed` dropped from `summariseStatusOutcome`'s zero-exit list | B |
| 3 | The reason renamed back to the colliding `no-transition` | A, B, B2 |
| 4 | One CLI's `--no-transition` case removed | that CLI's D |
| 5 | A call site unwired / hardcoded to `noTransition: false` | E |
| 6 | A documentation absolute un-qualified | F |

Mutation 1 is the decisive one and was **independently reproduced** by the round-3 reviewer, which
loaded `jira-sync.js` into a fresh module, string-deleted the gate, and re-executed the test bodies
against it.

**A control test guards the control.** C0 runs C's identical call with `noTransition: false` and
asserts it *does* transition and *does* earn a Change Log row. Without it, "no Change Log row" is the
default outcome for almost any result and C would prove nothing — which is exactly the state cycle 1
shipped and cycle 3 corrected.

---

## Step 4: Gates

**Overall: ✅ PASS**

| Gate | Result |
|------|--------|
| `npm run ci:fast` (format:check + full suite) | ✅ exit 0 — **2502 tests, 0 failures** |
| `prettier --check` | ✅ clean (included in the above) |
| `npm run bundle` | ✅ every skill reports *in sync*; re-verified by the repo's pre-commit hook on each of the four commits |
| GitHub Actions rollup on PR #329 | ✅ **SUCCESS** — all 5 jobs `COMPLETED/SUCCESS` (`test`, `validate`, `link-check`, `shellcheck`, branch-policy) |

---

## Step 5: Security & Compliance

**Overall: ✅ PASS**

**Security surface: none added.** Scanning the added lines of the source diff for
`exec|spawn|eval|require(|fetch(|http|token|password|secret` returns exactly **one** hit, and it is
a comment (`// HTTP request is issued.`).

The change is *subtractive* with respect to network surface: under `--no-transition` the function
issues **zero** HTTP requests where it previously issued at least one. Test A asserts that on the
request log, not on the return value.

**No credential, auth, or input-validation path is touched.** The flag is a boolean opt-out with a
`false` default; test A3 pins that omitting it is byte-for-byte prior behaviour.

**Compliance:** ⚠️ NOT_APPLICABLE — an internal developer-tooling change with no user data, no PII,
and no UI surface.

---

## Step 6: Acceptance Decision

**Decision: ✅ DoD SATISFIED**

| Criterion | Result |
|-----------|--------|
| Fix present at the root cause | ✅ PASS |
| Regression test, fails-without / passes-with | ✅ PASS — 6 mutations proven |
| Suite + lint/format green | ✅ PASS — `ci:fast` exit 0, 2502 tests |
| CI green on the final commit | ✅ PASS — see below |
| No new security surface | ✅ PASS |
| Documentation updated | ✅ PASS |
| Compliance | ⚠️ NOT_APPLICABLE |

### CI was waited for, not assumed

The rollup read `PENDING` on the first sample — the `test` job was `IN_PROGRESS` while the other four
were already green. Acceptance was **held** and the rollup polled in the background until it
resolved, rather than rounding a pending build up to green:

```
16:56:37 attempt=1 rollup=PENDING
16:57:23 attempt=2 rollup=SUCCESS
```

Final state — every job `COMPLETED` with conclusion `SUCCESS`:
`test`, `validate`, `link-check`, `shellcheck`, and the branch-policy check.

**The green is on the right commit.** PR head `c8bde1bd0da65c8de725656a3213866ec699f029` is identical
to local `HEAD`, so this is a green on the final code, not on an ancestor.

### One finding deliberately carried, not closed

`/review-code` finding **CR-1** — `review-story` Step 9.6, `review-task` Step 8.6 and `review-epic`
run body/link-only syncs that still re-resolve status, which is bug.11's shape at three more call
sites — was **not** fixed here. bug.11's Recommendation item 2 scoped the caller change to *"passed
by finalise's re-link"*, so fixing three further skills would be scope creep on an already-Major bug.
Filed as [`bug.12`](../bug.12.review-syncs-relink-without-no-transition/bug.12.review-syncs-relink-without-no-transition.md),
registry row added, counter bumped to 13.

This is recorded as a **carried finding, not a gap**: the bug's own stated scope is fully delivered.

### Tracker

⚠️ N/A — bug.11 has no `github_issue` / `jira_key`. Tracker close, board move and completion comment
are all skipped, as is normal for a general bug.

---

## Verification Complete

**Final Status:** ✅ DoD SATISFIED
**Completion Time:** 2026-09-06

**Artifacts:**

- ✅ Bug file carries the full Developer Fix Cycle (4 iterations), Status History and QA Verification
- ✅ Implementation report with Decisions Log, Issues Log and QA Iteration History
- ✅ Review report (`bug.11.review.1.*.md`)
- ✅ This DoD summary
- ✅ Follow-up bug.12 filed for the carried finding
- ⚠️ Tracker actions — N/A (no linked issue)

**Next step:** Part B of develop-bug Step 7 — write the Resolution Summary, flip the bug to `closed`,
and set the bug-registry row to `closed`.

---
