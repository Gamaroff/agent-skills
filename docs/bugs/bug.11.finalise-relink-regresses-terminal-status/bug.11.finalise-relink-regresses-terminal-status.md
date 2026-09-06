---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-06'
updated: '2026-09-06'
related: 'none — cross-cutting (finalise Step 7 · sync-jira-* status drive)'
description: "finalise Step 7 transitions the card to Done and then re-runs sync-jira-* to re-point the Document link. Task 40 justified that order on the premise that the sync would then find the issue already in Done and no-op. On any project whose statusMap deliberately maps accepted to something other than Done — which the pipeline's own guidance recommends — the sync instead moves the card BACKWARDS out of the terminal status, and the resolution it was closed with is left stranded on a non-terminal status."
---

**Bug ID**: bug.11
**Related**: none — cross-cutting (finalise Step 7 · `sync-jira-*` status drive)
**Status**: ✅ Ready for QA
**Priority**: High
**Severity**: Major
**Created**: 2026-09-06
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `skills/finalise/SKILL.md` Step 7 runs the Jira close-out in two blocks — transition to
Done, then re-run `sync-jira-{story,task}` with `--doc-branch` to re-point the Document link at the
durable branch. The order was set deliberately by task 40, whose QA record states the justification:

> *"now the transition runs first and **the sync no-ops**. Both still run in both orders, so a failure
> in either is still covered by the other."*

**That premise is false whenever the consumer's `jira.statusMap` maps `accepted` to anything other
than `Done`** — and the pipeline's own Step 7 guidance actively recommends exactly that
configuration: *"a board that wants a card to sit in a merge queue until the PR actually lands should
leave `done` to a human."* A project that follows that advice gets a sync which does **not** no-op.
It resolves `accepted` against its own `loadStatusMap`, finds a non-terminal candidate, and
**transitions the card backwards out of Done**.

**Expected Behavior**: the Document-link re-point is link-only. A card the ladder has just moved to a
terminal status stays there.

**Actual Behavior**: the card leaves the terminal status, and — because the backwards transition
carries no resolution change — the `resolution` set when it was closed is **left stranded on a
non-terminal status**. Such a card is invisible to `resolution IS EMPTY` backlog-hygiene queries
while also not appearing as done, so it is missing from both halves of the usual sweep.

## Reproduction Steps

**Environment**: Jira Cloud (team-managed project), `sync-jira-{story,task}` via `shared/resources/jira-sync.js`;
observed on the `rebirth-wallet` consumer repo, issue RAPP-715, 2026-09-05.
**Frequency**: Always — deterministic given the `statusMap` below and a workflow that offers a
non-terminal transition whose name appears in the `accepted` candidate list.
**Reproducible**: Yes

On a consumer whose `skills-config.yaml` contains a non-`Done` mapping for `accepted` — e.g.

```yaml
jira:
  statusMap:
    accepted:
      - Waiting for merge
      - Waiting for Review
```

1. Finalise a task so its frontmatter reads `status: accepted`.
2. Transition its card to `Done` (Step 7 block 1), supplying whatever `resolution` the workflow
   requires. Verify: status `Done`, resolution `Done`.
3. Run Step 7 block 3 — `sync-jira-task --file <doc> --doc-branch develop`.
4. Re-read the issue.

**Observed** (RAPP-715, rebirth-wallet, 2026-09-05): status came back `Waiting for Review` carrying
`resolution: Done`. Confirmed the mechanism from the transitions API — from `Done` the workflow offers
no self-transition, and offers one literally *named* `Waiting for Review`, which is a candidate in
that project's `accepted` list. It matched by name, on the first rule, without ever reaching the
statusCategory fallback.

## Evidence

- **RAPP-715 (rebirth-wallet, 2026-09-05).** After Step 7 block 1 the issue read status `Done`,
  `resolution: Done`. After block 3 (`sync-jira-task --file <doc> --doc-branch develop`) it read
  status `Waiting for Review`, still carrying `resolution: Done`.
- **Mechanism confirmed from the Jira transitions API**, not inferred: from `Done` that workflow
  offers no self-transition, and offers one literally named `Waiting for Review`, which is a
  candidate in the project's `accepted` list. It matched by name, on the first rule, without ever
  reaching the `statusCategory` fallback.
- **The unconditional call site** — `syncDocumentStatus` is invoked whenever frontmatter carries a
  `status:`, with no way for a caller to opt out. Four call sites:
  `skills/sync-jira-story/scripts/sync-jira-story.js:1149`,
  `skills/sync-jira-task/scripts/sync-jira-task.js:947`,
  `skills/sync-jira-epic/scripts/sync-jira-epic.js:940` and `:1379`.
- **The flag does not exist.** `grep -rn -- '--no-transition' skills/ shared/` returns exactly one
  hit — `skills/finalise/SKILL.md:1129`, which *describes* the durable fix. No implementation.

## Scope & Impact

- **Silent regression of a terminal status.** The pipeline's last act un-does its own close.
- **Stranded resolution.** Neither `resolution IS EMPTY` nor a status-is-Done filter finds the card.
- **Hits precisely the projects that took the pipeline's advice.** A consumer that left `done` to a
  human — which Step 7 recommends, and which `tracker-workflow.yaml`'s `done: ~` exists to express —
  is the consumer this breaks. A consumer that maps `accepted → Done` never sees it.
- Low frequency, high confusion: it presents as the tracker mysteriously reopening a card, and the
  cause is two blocks apart in one step of one skill.

## Root Cause

`sync-jira-*` has **no way to be status-neutral**. `syncDocumentStatus` is invoked unconditionally
whenever frontmatter carries a `status:`:

```js
if (result?.issueKey && !args.dryRun && frontmatter.status) {
  statusOutcome = await lib.syncDocumentStatus({ ... });
}
```

The accepted flag list is `--check-card --doc-branch --dry-run --fail-on-status-skip --file --force
--json --labels --priority --probe-workflow --quiet --summary --write-record` — there is no
`--no-transition`. So a caller that wants only the Document-link re-point cannot ask for only the
Document-link re-point, and finalise's *link* step is unavoidably also a *status* step driven by a
second, independent resolver.

Task 40's reasoning — *make the ladder the single resolver* — is sound and should be kept. The defect
is that the sync's resolver still gets a say afterwards, which is the very thing that reordering was
supposed to prevent.

## Recommendation

Two changes, the first cheap and shipped with this bug, the second the durable fix:

1. **Documentation, in this PR.** Amend the Step 7 ordering block so it no longer asserts the sync
   no-ops, states the configuration under which it does not, and requires the close-out to
   **verify the status after the re-link and re-assert the terminal transition if it moved**.
   Verification is by re-reading the issue, not by trusting the transition call's `204`.

2. **A `--no-transition` flag on `sync-jira-{story,task,epic}`**, passed by finalise's re-link.
   This preserves task 40's benefit in full — the ladder stays the single resolver — and removes the
   second resolver from the path entirely, rather than correcting after the fact. Deferred from this
   PR to keep it one change, and because the doc fix already closes the observed failure.

**Not the fix: reversing the order back to sync-first.** That re-opens what task 40 closed, and the
QA record for that task should be read before anyone proposes it again.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-06

**Reproduction**: The live failure is consumer-configuration dependent (it needs a Jira project whose
`statusMap` maps `accepted` to a non-terminal column), so the deterministic signal used here is a
**failing automated test** encoding the defect rather than a live API call. Pre-fix,
`shared/resources/tests/jira-sync-no-transition.test.mjs` case A fails: `syncDocumentStatus` has no
way to be asked not to transition, so a caller wanting only the Document-link re-point still issues
transition requests to Jira. Confirmed the defect is present and not already fixed:
`grep -rn -- '--no-transition' skills/ shared/ evals/` returned a single hit —
`skills/finalise/SKILL.md:1129`, prose *describing* the fix — and no implementation.

**Root Cause Analysis**: `shared/resources/jira-sync.js` — `syncDocumentStatus` unconditionally
resolves and drives status; there is no opt-out on the function or on any of the three CLIs. Four
call sites consume it: `sync-jira-task.js:951`, `sync-jira-story.js:1153`, and **two** in
`sync-jira-epic.js` (`:944`, the no-field-changes skip path, and `:1384`, the normal path). So
finalise's link-only re-point was unavoidably also a status decision, resolved by a second resolver
(`loadStatusMap`) after the `tracker-workflow.yaml` ladder had already made the call.

**Proposed Fix**: add a `noTransition` opt-out gated **inside** `syncDocumentStatus` (before any
HTTP), expose it as `--no-transition` on all three CLIs, and pass it from finalise's Step 7 re-link.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-06

**Root Cause**: `syncDocumentStatus` could not be asked to skip the status decision, so the
Document-link re-point carried a second, independent status resolver.

**Fix Description**:

- `syncDocumentStatus` accepts `noTransition` and returns early — **before any HTTP request** —
  with `{ transitioned: false, reason: "transition-suppressed" }`.
- The gate lives **in the shared function, not at the four call sites**. Placing it at the callers
  makes the guarantee only as strong as the least-updated one; that is not hypothetical — the epic's
  no-field-changes path was missed on the first pass of this very fix while every behavioural test
  still passed.
- `--no-transition` added to `sync-jira-{task,story,epic}` (parse, usage string, header docs), and
  forwarded at all four call sites.
- `summariseStatusOutcome` treats `transition-suppressed` as exit 0, so `--no-transition` composes
  with `--fail-on-status-skip` instead of failing every run that uses both.
- **The reason is `transition-suppressed`, not `no-transition`.** The latter name was already in use
  in this module for the *opposite* condition — the board offers no matching transition from here,
  a genuine skip that must keep failing. The first version of this fix reused it and added it to
  `summariseStatusOutcome`'s zero-exit list, which would have silently stopped every real
  unreachable-transition skip from failing under `--fail-on-status-skip`. Caught before commit; test
  B2 now pins the two meanings apart.
- `finalise` Step 7 block 3 passes `--no-transition`; the prose that asserted the sync no-ops is
  corrected, and block 4's status re-read is reframed from a repair of expected damage to a cheap
  confirmation (kept — it still catches a consumer pinned to a pre-flag sync).

**Files Modified**:

- `shared/resources/jira-sync.js` — `noTransition` gate in `syncDocumentStatus`;
  `transition-suppressed` added to `summariseStatusOutcome`'s zero-exit reasons.
- `skills/sync-jira-task/scripts/sync-jira-task.js` — flag parsed, usage, header, call site.
- `skills/sync-jira-story/scripts/sync-jira-story.js` — same.
- `skills/sync-jira-epic/scripts/sync-jira-epic.js` — same, **both** call sites.
- `skills/finalise/SKILL.md` — Step 7 passes the flag; ordering note and block 4 corrected.
- `shared/resources/develop-pipeline-step-7-finalise.md` — re-point note names the flag.
- `shared/resources/tests/jira-sync-no-transition.test.mjs` — **added**, 16 regression tests.
- `CHANGELOG.md` — Unreleased entry.
- Bundled `references/` copies refreshed via `npm run bundle`.

**Testing**:

- 16 regression tests in `shared/resources/tests/jira-sync-no-transition.test.mjs`, covering the
  gate (zero HTTP issued), its negative half (the un-flagged call *does* reach Jira, so "no request"
  is caused by the flag and not by a broken function), the default, exit semantics both ways,
  Change Log silence, per-CLI parsing, and per-call-site forwarding.
- **Every one mutation-proven** — five separate reverts, each turning the intended test red and only
  that test:
  1. gate removed → A fails
  2. `transition-suppressed` dropped from the zero-exit list → B fails
  3. flag case removed from one CLI → that CLI's D fails
  4. epic skip-path call site unwired → E fails (the real defect hit during this fix)
  5. reason renamed back to the colliding `no-transition` → A, B and B2 fail
- `npm run ci:fast` (format:check + full suite): **2498 pass, 0 fail**, exit 0. The new file is
  matched by the existing `shared/resources/tests/*.test.mjs` glob and confirmed present in that run.

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/jira-sync-no-transition.test.mjs` → 16/16 pass.
2. Confirm the gate is central, not per-caller: `grep -n "if (noTransition)" shared/resources/jira-sync.js`.
3. Confirm all four call sites forward it:
   `grep -n -A 14 "syncDocumentStatus({" skills/sync-jira-*/scripts/*.js | grep -E "syncDocumentStatus|noTransition"` → four pairs.
4. Confirm finalise passes it: `grep -n -- "--no-transition" skills/finalise/SKILL.md`.
5. Confirm the naming collision is guarded: revert `transition-suppressed` → `no-transition` in
   `jira-sync.js` and observe B2 go red; restore.
6. `npm run ci:fast` → green.

### Iteration 2

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-06

**Trigger**: Verify Cycle 1 signal 3 — `/review-code` on the PR #329 diff returned 6 findings.
Signals 1 (regression test) and 2 (suite + format) were green. Four of the findings are defects the
fix itself introduced, so the cycle is treated as FAIL rather than waved through on the
"only high-confidence *correctness* findings block" letter:

- **CR-2** (medium/high) — `--no-transition` absent from all three `sync-jira-*` SKILL.md
  `Script Options` tables and from the prose describing finalise's re-point. The flag is now
  *required* by finalise Step 7, and SKILL.md is where a consumer reads; `--doc-branch`, its
  companion in the same command, was documented while its partner was not.
- **CR-3** (low/high) — finalise's "Order matters" paragraph was left untouched and now contradicts
  the paragraph five lines below it, giving two mutually exclusive accounts of the same command.
- **CR-4** (low/high) — the epic skip-path comment states "the status transition still runs here,
  and must" as an absolute that the line 12 below it now falsifies.
- **CR-5** (low/high) — **test C was tautological.** `buildChangeLogEntries` branches only on
  `created` and `transitioned`; it never reads `reason`. Fed a hand-written outcome, C passed for any
  reason string and would have passed with no gate in the codebase at all. It was cited as evidence
  in the Iteration 1 record, so this is a correction to that record as much as to the test.
- **CR-6** (low/high) — four soft spots in the E/E2 structural check, whose entire justification is
  catching what behavioural tests cannot: a literal-string needle invisible to reformatting, an
  unbalanced slice silently returning the rest of the file (a later call site could satisfy an
  earlier one's assertion — a false pass in exactly the miss E exists to catch), and a
  presence-only match that `noTransition: false` would satisfy.

**CR-1** (bug, medium/medium) is **not** fixed here: `review-story` 9.6, `review-task` 8.6 and
`review-epic` run body/link-only syncs that still re-resolve status, which is bug.11's shape at three
more call sites. bug.11 scoped its Recommendation item 2 to the flag *"passed by finalise's re-link"*,
so widening this PR would be scope creep. Filed as
[`bug.12`](../bug.12.review-syncs-relink-without-no-transition/bug.12.review-syncs-relink-without-no-transition.md)
with the registry row and counter bumped, so it is carried rather than dropped.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-06

**Fix Description**:

- **CR-2** — `--no-transition` row added to the `Script Options` table in all three `sync-jira-*`
  SKILL.md files, and named alongside `--doc-branch` in the current-branch-URLs prose for task and
  story.
- **CR-3** — finalise's "Order matters" paragraph rewritten: the ladder is now the single resolver
  *by construction* rather than by sequencing, and the ordering is kept explicitly as belt-and-braces
  for a consumer pinned to a pre-flag sync.
- **CR-4** — the epic skip-path comment now carries the `--no-transition` exception and says why
  suppressing on that path is what makes the flag path-independent.
- **CR-5** — test C is now driven **end-to-end**: it calls `syncDocumentStatus({noTransition:true})`
  and feeds the real return into `buildChangeLogEntries`, so a regression in the gate's return shape
  fails it. Added C2, the end-to-end twin of B.
- **CR-6** — the extractor matches by regex (`/syncDocumentStatus\(\s*\{/`) so reformatting cannot
  hide a call site; it records whether the slice actually **balanced** and E fails loudly if not; and
  E now asserts the forwarded **value** (`noTransition: args.noTransition`), not merely the key.

**Files Modified**:

- `skills/sync-jira-{task,story,epic}/SKILL.md` — flag documented
- `skills/finalise/SKILL.md` — ordering paragraph corrected
- `skills/sync-jira-epic/scripts/sync-jira-epic.js` — skip-path comment
- `shared/resources/tests/jira-sync-no-transition.test.mjs` — C rewritten, C2 added, extractor hardened
- `docs/bugs/bug.12.…` + `docs/bugs/bug-registry.md` — CR-1 filed

**Testing**:

- 17 tests pass (was 16; C2 added).
- **Both hardened tests mutation-proven against mutations their previous versions would have passed**:
  - gate returns `transitioned: true` → **C fails** (old C could not see this)
  - a call site hardcoded to `noTransition: false` → **E fails** (old E matched the key only)

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/jira-sync-no-transition.test.mjs` → 17/17.
2. Hardcode `noTransition: false` at any call site → E goes red; restore.
3. `grep -n -- "--no-transition" skills/sync-jira-*/SKILL.md` → one Script Options row each.
4. Read `skills/finalise/SKILL.md` Step 7 blocks 3–4 and confirm no two paragraphs disagree.

### Iteration 3

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-06

**Trigger**: Verify Cycle 2 — a re-review of the cycle-1 delta confirmed CR-2, CR-3, CR-4 and CR-6
fixed, but returned **CR-5 as only partially fixed** plus two new findings. All three are defects in
the cycle-1 *corrections*, which makes this the more important iteration of the two:

- **NEW-1 (the significant one)** — the CR-5 fix was **overclaimed**. Making test C drive
  `syncDocumentStatus` end-to-end removed the hand-written outcome, and the mutation run for it
  (`transitioned: true`) did go red — but that mutation only changes the gate's *return shape*. With
  the fixture `localStatus: "accepted"`, `currentStatus: "Done"`, an **un-gated** call short-circuits
  at `reason: "already"` with zero HTTP, because `Done` is itself in the `accepted` candidate list. So
  C and C2 still passed with the gate **deleted** — verbatim the flaw CR-5 raised. The plumbing was
  fixed and the fixture was not, and the Iteration 2 record asserted more than the test supported.
- **NEW-2** — the CR-3 rewrite's replacement rationale is unreachable. It justified keeping the block
  order as protecting "a consumer pinned to a `sync-jira-*` predating the flag", but such a sync
  rejects `--no-transition` with `Unknown option` and exits before resolving status — a fact stated
  20 lines later in the same step. Ordering protects nobody there.
- **NEW-3** — the CR-4 fix qualified the absolute in the epic *script* comment but left three
  identical absolutes standing in the SKILL.md docs (`sync-jira-epic` §10, `sync-jira-story` line 32
  and step 8), one of them two lines below a bullet the same pass had edited.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-06

**Fix Description**:

- **NEW-1** — the fixture is now load-bearing and says so. `currentStatus` is `"In Review"` (not an
  `accepted` candidate) and a new `transitioningHttp` double **offers a real `Done` transition**, so
  the un-gated path genuinely transitions and earns a Change Log row. Added **C0**, an explicit
  *control*: it runs the identical call with `noTransition: false` and asserts `transitioned === true`
  and exactly one Change Log entry. Without a control, "no Change Log row" is the default for almost
  any outcome and C proves nothing; C0 fails the moment the fixture drifts back toward vacuity.
- **NEW-2** — the ordering rationale now names the **reachable** pairing: a *finalise copy* older than
  this one (whose step 3 omits the flag) against a current sync. The unreachable pairing is called out
  explicitly as not being what the ordering protects, so the next reader does not re-derive it.
- **NEW-3** — all three doc absolutes qualified with "unless `--no-transition` is passed"; swept the
  three SKILL.md files for the phrase to confirm none remain.

**Files Modified**:

- `shared/resources/tests/jira-sync-no-transition.test.mjs` — `transitioningHttp` double, shared
  `SUPPRESSED` fixture, C rewritten, **C0 control added**, C2 re-pointed
- `skills/finalise/SKILL.md` — ordering rationale and block-4 causes corrected
- `skills/sync-jira-{epic,story}/SKILL.md` — three absolutes qualified

**Testing**:

- 18 tests pass (was 17; C0 added).
- **The decisive mutation now lands.** Deleting the `noTransition` gate **entirely** — the mutation
  the Iteration 2 tests could not detect — fails **A, C and C2**. That is the proof the previous
  record claimed and did not have.

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/jira-sync-no-transition.test.mjs` → 18/18.
2. Delete the `if (noTransition) return {...}` block from `syncDocumentStatus` → **A, C, C2 go red**; restore.
3. `grep -niE "status transitions? (still )?run" skills/sync-jira-*/SKILL.md` → every hit qualified.
4. Read `skills/finalise/SKILL.md` Step 7 blocks 3–4: the ordering rationale and the block-4 causes
   must name the same reachable case and agree about `Unknown option`.

### Iteration 4

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-06

**Trigger**: Verify Cycle 3. The round-3 reviewer independently confirmed NEW-1 fixed by an
**in-memory gate-deletion experiment** — loading `jira-sync.js` into a fresh module, string-deleting
the `if (noTransition) …` block, and re-executing the test bodies against it: A, C and C2 all fail,
while C0 (the control) passes under both, which is exactly what a control should do. The gate and its
tests are settled from here.

The remaining findings are all in the **prose written by the previous two cycles**:

- **R3-2 (the substantive one)** — the replacement rationale from Iteration 3 is **backwards**. It
  claimed that for an older-*finalise*-against-current-sync pairing, "ladder-first is what keeps the
  ladder's decision the one that stands". In that pairing the sync runs **second** with status
  resolution live, so it writes **last** and can walk the card straight off the ladder's target —
  which is the RAPP-715 sequence recorded 15 lines above in the same block. NEW-2 replaced an
  unreachable rationale with an incorrect one.
- **R3-1** — block 4's *intro* still cited the unreachable pre-flag-sync case, contradicting the
  bullet rewritten in the same commit 14 lines below it.
- **R3-3** — the sweep for the "status transition still runs" absolute was **docs-only**; it missed
  the one occurrence that reaches a user at runtime, `sync-jira-story.js:920`, which printed the
  claim unconditionally including on a `--no-transition` run.
- **R3-4** — the older-finalise scenario's reachability was asserted rather than established
  (`setup-consumer.sh` installs the skill set as one tarball, so skew needs a hand-copied install).

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-06

**Fix Description**:

- **R3-2 + R3-4** — the protective claim is **dropped**, not re-worded. The ordering block now says
  plainly that ladder-first protects nothing once step 3 is status-neutral, and names *both*
  plausible-sounding justifications as wrong, with the reason for each — the pre-flag sync never runs
  (`Unknown option`), and the older-finalise pairing is backwards because the sync writes last. It
  states what actually protects the close: **block 4's read-back**. The order is kept as convention.
- **R3-1** — block 4's intro rewritten to name the same causes its own bullet names.
- **R3-3** — the runtime message now branches on `args.noTransition` and says
  "Status transition suppressed by `--no-transition`" on a suppressed run. Confirmed `args` is in
  scope (declared `sync-jira-story.js:647`, inside `run` at `:642`) and the other two CLIs carry no
  equivalent string.
- **Added test F** — a documentation invariant asserting every "status transition still runs" claim
  in the three sync skills' prose *and* runtime strings is qualified. This class of miss has now
  recurred twice (NEW-3, then R3-3), and it is invisible to every behavioural test, so it gets a
  guard rather than a third sweep. **The test caught two hits on its first run** — both false
  positives from a forward-only 3-line window, since a ternary names the flag on the line *above* its
  else-arm; the window now looks both ways.

**Testing**:

- 19 tests pass (was 18; F added).
- **Mutation-proven**: un-qualifying one doc absolute → **F fails**.
- Gate deletion → A, C, C2 fail (independently reproduced by the reviewer).

**Verification Steps for QA**:

1. `command node --test shared/resources/tests/jira-sync-no-transition.test.mjs` → 19/19.
2. Remove "unless `--no-transition` is passed" from any of the three SKILL.md files → **F goes red**.
3. Read `skills/finalise/SKILL.md` Step 7 blocks 3–4 end to end: no two statements about the same
   scenario may disagree, and no protective effect may be claimed for the block ordering.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-06 | New | create-bug-report | Bug filed alongside the Step 7 documentation fix (PR #326). |
| 2026-09-06 | New | review-bug | Fix-readiness validate pass. Added the template sections the report was missing (Evidence, Reproduction Steps environment/frequency/reproducible, Developer Fix Cycle, Status History, Resolution Summary); renamed `Steps to Reproduce` → `Reproduction Steps` and `Impact` → `Scope & Impact` to the canonical headings. No severity/priority change — Major/High confirmed correct. |
| 2026-09-06 | In Progress | develop-bug | Reproduced via a failing regression test; root cause localised to the unconditional `syncDocumentStatus` and its four call sites. |
| 2026-09-06 | Ready for QA | develop-bug | `--no-transition` implemented on all three syncs, gated inside `syncDocumentStatus`; finalise Step 7 passes it. 16 regression tests, five mutation proofs, `ci:fast` green. |
| 2026-09-06 | Reopened | develop-bug | Verify Cycle 1 FAIL — 5 review-code findings, 4 of them introduced by the fix. |
| 2026-09-06 | Ready for QA | develop-bug | Cycle 1 fixes applied: flag documented, contradictory prose corrected, tautological test C rewritten end-to-end, structural check hardened. CR-1 filed as bug.12. |
| 2026-09-06 | Reopened | develop-bug | Verify Cycle 2 FAIL — CR-5 only partially fixed (overclaimed) plus 2 new findings, all in the cycle-1 corrections. |
| 2026-09-06 | Ready for QA | develop-bug | Cycle 2 fixes: gate-sensitive fixture + C0 control, reachable ordering rationale, three doc absolutes qualified. Gate deletion now fails A/C/C2. |
| 2026-09-06 | Reopened | develop-bug | Verify Cycle 3 FAIL — NEW-1 confirmed fixed; 4 findings remained, all in the prose the prior cycles wrote (one rationale outright backwards). |
| 2026-09-06 | Ready for QA | develop-bug | Cycle 3 fixes: protective claim dropped rather than re-worded, block-4 intro reconciled, runtime string branched, doc-invariant test F added and mutation-proven. |

## Resolution Summary

_Not yet resolved._

## Related

- `skills/finalise/SKILL.md` — Step 7, "Move Tracker Issue to Done"
- `docs/tasks/task.40.github-pipeline-step-wiring/task.40.qa.1.github-pipeline-step-wiring.md` §72 —
  the ordering decision and the premise this bug falsifies
- `skills/sync-jira-task/scripts/sync-jira-task.js` — the unconditional `syncDocumentStatus` call
