---
id: task.102
title: "[Task 102] The card preflight runs in every review-* skill and no create-* skill"
type: task
description: "`--check-card` is an offline preflight — no auth, no network, no writes — that reports whether a document will publish a complete tracker card or a thin one. All three review-* skills run it; none of the three create-* skills do. So a free check runs one step after the moment the defect is introduced, and a document that is filed but not yet reviewed reaches CI unchecked. Move the section specs into the shared library and call the checker at authoring time."
tags: [authoring-skills, tracker-cards, fail-fast, shared-resources]
category: infrastructure
status: accepted
priority: Medium
risk_level: low
created: 2026-09-09
updated: 2026-09-10
completed_date: 2026-09-10
pr_number: 373
assignee:
estimated_effort_hours: 3
github_issue: 372
---

# Technical Task: run the card preflight where the defect is created

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.102.review.1.authoring-time-card-preflight.md` implemented 2026-09-10
**GitHub Issue**: [#372](https://github.com/Gamaroff/agent-skills/issues/372)

---

## 1. Overview

`sync-jira-task.js --check-card` is an **offline** preflight: no auth, no network, no writes. It
reports whether a document will publish a complete tracker card or a thin one, printing the fix
beside each finding.

All three `review-*` skills run it. **None of the three `create-*` skills do.**

| Skill | references `check-card` |
| :--- | :--- |
| `review-task` / `review-story` / `review-epic` | 1 each |
| `create-task` / `create-story` / `create-epic` | **0 each** |
| `review-bug` / `create-bug-report` | **0 each** — a wider gap, deferred; see § 4 |

So the check that costs nothing runs one step *after* the moment the defect is introduced, and a
document that is filed but not yet reviewed reaches CI unchecked.

## 2. Motivation

Observed end to end on 2026-09-08. `task.99` was authored without a `## Success Criteria` block,
using a bespoke `## 7. The rule to add` heading in its place, while `task.100` and `task.101` from
the same batch both carried one. Nothing surfaced it at authoring. The document was committed and
pushed, and the first thing to notice was a zero-tolerance CI assertion on PR #355:

```
not ok 1148 - H: every real task card passes preflight
  task cards that would publish a thin card: task.99.….md
```

That is a full push–CI round trip for a defect an offline call catches in under a second, using a
checker already shipped in the repo, from the directory the authoring step was running in.

**The failure mode is silent by construction.** As the checker's own tests put it, a heading mismatch
*"is SILENT: the sync succeeds, reports no problem, and publishes a thin or empty card."* Without the
preflight there is nothing for an author to notice — the document looks complete, and only a
corpus-wide CI test disagrees.

**This is the second known occurrence.** The corpus test's own comment records the first: *"The
single document that failed when this landed (task.2, whose criteria list was headed 'Definition of
Done') was fixed rather than tolerated."* Two occurrences of the same class, against a guard that is
nearly free, is what justifies touching three skills.

## 3. Technical Background

Three facts constrain the shape of the fix, and all three were verified rather than assumed:

1. **The checker is already available at authoring time — in two of the three skills.**
   `create-task` and `create-story` both bundle `references/jira-sync.js`, which exports
   `checkCardSections` and `buildCardSections`. **`create-epic` does not**, so adding the call there
   makes the bundler pull that module (5,538 lines) into `skills/create-epic/references/`. That is
   automatic rather than manual work — but it *is* a new install-surface entry for one of the three,
   and the claim "no new install surface" holds only for the other two. Verified by inspection.
2. **The spec is not.** `TASK_CARD_SECTIONS` is eleven lines defined inside
   `skills/sync-jira-task/scripts/sync-jira-task.js`; `shared/resources/jira-sync.js` contains zero
   references to it. The checker travels; the thing it checks against does not.
3. **The requirement is already in the template.** `create-task/SKILL.md` specifies Success Criteria
   as Section 9. This is an **unenforced** requirement, not an absent one — which is why the fix is a
   check and not a template change.

Note also what this task does **not** claim: `task.99` was authored in a consumer session and filed
here, so `create-task` was probably not its producer. The supported claim is narrower and still
holds — an authoring-time check would have caught it, and nothing ran one.

## 4. Scope

**In scope**

- Move **all four** section specs — `TASK_CARD_SECTIONS`, `STORY_CARD_SECTIONS`,
  `EPIC_CARD_SECTIONS` **and `BUG_CARD_SECTIONS`** — into `shared/resources/jira-sync.js` as the
  single definition; `sync-jira-*` import from there.

  > **Four, not three, and the fourth is what makes Success Criterion 4 mean anything.**
  > `BUG_CARD_SECTIONS` is defined at `skills/sync-jira-bug/scripts/sync-jira-bug.js:53`, in exactly
  > the same shape as the other three. Moving three of four and then asserting "the specs live in one
  > place" would force the test to enumerate *which* three — the enumeration trap of § 7,
  > reintroduced inside the assertion meant to prevent it. Moving the bug spec costs one more import
  > and removes the ambiguity.
- Call `checkCardSections` at the end of `create-task`, `create-story` and `create-epic`, on the
  document just written, printing findings inline with their fixes.
- **Advisory at authoring, blocking at review.** That split already exists in the family and should
  be preserved.

**Out of scope**

- The corpus CI tests in `shared/resources/tests/jira-sync-card-summary.test.mjs`. They stay as the
  backstop; this task keeps them from being the *first* line of defence.
- **The authoring call in `create-bug-report`** — deferred, and the reason originally given here was
  wrong. Bug reports are **not** barred from tracker cards: `sync-jira-bug` publishes them from
  `BUG_CARD_SECTIONS` and supports `--check-card` (`sync-jira-bug.js:476`). The rule that bars bug
  reports concerns the **Change Log** — they carry `## Status History` instead — and says nothing
  about cards.

  The real reason to defer is that the bug gap is **wider** than this task, not narrower:
  `create-bug-report` does not run the preflight, `review-bug` does not run it either (0 references,
  where the other three `review-*` skills have 1 each), and the corpus preflight in
  `jira-sync-card-summary.test.mjs` covers task, story and epic only. Bug reports therefore have no
  preflight at **any** of the three layers, and closing that needs a `review-bug` change plus a
  corpus test whose fallout across existing bug documents is unmeasured. File it as a follow-up — the
  spec move above still lands the bug spec in the shared definition, so the follow-up is a call site
  and a test, not another move.
- Changing which sections are required. Any change to the spec's content is a separate decision.

## 5. Breaking Changes

None expected. Moving a constant behind an import is internal, and the new call is advisory. The one
risk to watch is import-cycle or bundling fallout — see § 10.

## 6. Implementation Plan

- [x] **Phase 1 — one definition.** Move the **four** section specs into
      `shared/resources/jira-sync.js` and re-export from `sync-jira-{task,story,epic,bug}.js` so
      existing callers and their tests are unchanged. **Do not duplicate the spec into `create-*`** —
      see § 7.
- [x] **Phase 2 — the authoring call.** Add the preflight step to the three `create-*` skills.
- [x] **Phase 3 — decide the naming question** in § 8 and apply whichever answer is chosen.
- [x] **Phase 4 — `npm run bundle`** and commit the regenerated `references/`.

## 7. The trap this task must avoid

**Do not copy the spec into the `create-*` skills.** Two definitions of "what sections a card needs"
will drift, and the drift is silent: the authoring check and the sync would disagree, with the
authoring side passing a document the sync then publishes thin — reintroducing the exact failure this
task exists to prevent, one layer earlier.

That is the enumeration class recorded in
[`docs/reference/anti-patterns.md`](../../reference/anti-patterns.md) § *Never fix N call sites
without a population check*. **Move the definition; do not duplicate it.**

## 8. The design question to settle, not assume

Are those three sections **"Jira card sections"** or **"what a task document must contain"**?

They are the former in code — `TASK_CARD_SECTIONS`, in a Jira-named module, exercised by
`jira-sync-card-summary.test.mjs` — and the latter in enforcement: a corpus test applies them to
every task document in a repo that syncs to **GitHub**. Whichever answer is chosen, the naming and
the module placement should follow it rather than leaving the two readings in tension.

This matters beyond tidiness: a GitHub-only consumer under platform-aware skill exclusion (task.83)
or install profiles (task.84) may not have `sync-jira-task` installed at all. If the requirement is
tracker-agnostic, its definition cannot live behind a Jira-only skill.

## 9. Files Summary

**Added**

- `shared/resources/card-preflight.js` — the tracker-neutral CLI the `create-*` skills call. **This
  file is the deliverable**; an earlier version of this list omitted it, which would have left a
  reader reviewing or rolling back from § 9 unaware of the thing being added.
- `shared/resources/authoring-card-preflight.md` — the contract: what the call is, what to do with
  its output, and why the spec must never be restated in an authoring skill
- `shared/resources/tests/card-preflight.test.mjs` — anti-vacuity, one-definition, parity and
  isolation tests

**Modified**

- `shared/resources/jira-sync.js` — the four section specs, moved here, plus `CARD_SECTIONS_BY_KIND`
- `skills/sync-jira-{task,story,epic,bug}/scripts/sync-jira-*.js` — import instead of define
- `skills/create-{task,story,epic}/SKILL.md` — the authoring-time preflight step

**Regenerated by `npm run bundle`** (committed, not hand-edited)

- `skills/*/references/jira-sync.js` — every skill that bundles the library
- `skills/create-{task,story,epic}/references/{card-preflight.js,authoring-card-preflight.md}`
- `skills/create-epic/references/{jira-sync,change-log,tracker-workflow,yaml-subset}.js` — first
  copies for that skill, which did not previously bundle the library

## 10. Testing Strategy

- **Anti-vacuity, and the point of the task:** a fixture document missing `Success Criteria` must
  make the authoring check report a finding. If it does not, the call is present and inert — the
  `present-but-inert` verdict, which is worse than absent because it looks guarded.
- The spec move is behaviour-preserving: `sync-jira-{task,story,epic,bug}` test suites must be green
  **unchanged**, and each `sync-jira-*` module must still export its own `*_CARD_SECTIONS` (an
  existing test asserts the task spec's shape directly).
- **One definition, asserted:** a check that the section specs are defined in exactly one place, with
  a non-vacuity floor so it fails rather than passing on zero matches if the pattern drifts.
- The corpus preflight tests for task, story and epic cards stay green.
- A consumer without `sync-jira-*` installed must still get the authoring check — exercise the
  `create-*` path with the Jira sync skill absent.

## 11. Success Criteria

1. [x] `create-task`, `create-story` and `create-epic` each run the preflight on the document just
       written and print findings with their fixes.
2. [x] The check is **advisory** at authoring — a document legitimately in progress is not blocked,
       and no author is pushed toward writing filler to satisfy a gate.
3. [x] `review-*` remains the blocking gate; the family's advise-then-gate split is unchanged.
4. [x] All **four** section specs (task, story, epic, bug) are defined in **exactly one** place, and
       a test asserts that, with a non-vacuity floor.
5. [x] A document missing `Success Criteria` produces a finding at authoring time — demonstrated on a
       fixture, not asserted in prose.
6. [x] `sync-jira-{task,story,epic,bug}` suites pass **unchanged**; each module still exports its own
       `*_CARD_SECTIONS` (`jira-sync-card-summary.test.mjs:469` asserts
       `TASK_CARD_SECTIONS.length === 3` directly).
7. [x] The authoring check works for a consumer that does not have `sync-jira-*` installed.
8. [x] The § 8 naming question is answered in the implementation report, and the module placement
       follows the answer.
9. [x] `npm run bundle` has been run and the regenerated `references/` copies are committed.

## 12. Risk Assessment

**Low.** The check is offline and advisory, and the spec move is behaviour-preserving.

| Risk | Mitigation |
| :--- | :--- |
| The authoring call is added but never fires (present-but-inert) | The anti-vacuity fixture in § 10 is the primary test, not an afterthought |
| The spec is duplicated rather than moved, and the two drift | § 7; plus the one-definition assertion in Success Criterion 4 |
| A blocking check at authoring pushes authors to write filler | Advisory-only at authoring (Success Criterion 2) — filler is worse than a thin card, because it looks deliberate |
| Moving the constant creates an import cycle or bundling churn | Phase 1 keeps re-exports in place so existing callers are untouched; `npm run bundle` runs in Phase 4 |

## 13. Rollback Plan

Remove the authoring-time call from the three `create-*` skills, then delete
`shared/resources/{card-preflight.js,authoring-card-preflight.md,tests/card-preflight.test.mjs}` and
re-run `npm run bundle` — leaving the CLI in place with no caller would strand a file and a suite
nothing runs. The spec move reverts independently of that: restore the four `const *_CARD_SECTIONS`
definitions in their `sync-jira-*` scripts and drop the shared block.

The two phases are separable in either order, and the CI corpus tests — unchanged either way —
continue to catch the defect at the same point they do today.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 0.1 | Filed from a measured failure on PR #355: `task.99` reached CI without a Success Criteria block; the offline preflight that would have caught it runs in all three `review-*` skills and none of the three `create-*` skills. Second known occurrence of the class (task.2 was the first). | Claude |
| 2026-09-10 | 0.2 | Review passed (8/10) — READY TO IMPLEMENT. Four Important findings applied: § 3 claim 1 corrected (`create-epic` does not bundle `jira-sync.js`); § 4's `create-bug-report` rationale replaced (bug reports are not barred from cards — `sync-jira-bug` publishes them); scope widened to all **four** section specs so Success Criterion 4 is satisfiable; the unrecorded bug-layer gap (no preflight at authoring, review or CI) filed as a deferred follow-up. | review-task |
| 2026-09-10 |  | Status → ready-for-development | review-task |
| 2026-09-10 |  | Implemented: four card section specs consolidated into `shared/resources/jira-sync.js`; new tracker-neutral `card-preflight.js` called from all three `create-*` skills; 11 new tests, all mutation-proved. Status → ready-for-review | develop |
| 2026-09-10 |  | QA gate CONCERNS (90/100) — 9/9 success criteria verified by execution, 0 HIGH; 1 MEDIUM: `card-preflight.js` duplicates a frontmatter parse `jira-sync.js` already exports | qa-task |
| 2026-09-10 |  | qa-fix cycle 1: T102-001 + the LOW both fixed and mutation-proved; regression test corrected to compare resolved bodies, not verdicts. Gate CONCERNS → PASS (100/100) | qa-fix |
| 2026-09-10 |  | Step 5c `/review-pr` CONCERNS: 3 medium + 1 low. PC-1 (Files Summary omitted the deliverable), PC-3 (rollback stranded the new CLI) and CR-1 (the parity fix leaked the document body into `--json` — 94% of an 18.3 KB payload) all fixed; PC-2 (unticked success criteria) left for finalise | review-pr |
| 2026-09-10 | 0.3 | DoD verified 9/9 against code — accepted (PR #373). CI green on the final head; AGENTS.md gained an `## Authoring-Time Card Preflight` section indexing the new shared contract and engine | finalise |

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**QA Report**: `task.102.qa.1.authoring-time-card-preflight.md`
**Gate File**: `task.102.gate.1.authoring-time-card-preflight.yml` — ✅ **PASS**, 100/100
**PR Review** (Step 5c): `task.102.pr-review.1.authoring-time-card-preflight.md` — ⚠️ CONCERNS, 0 HIGH

Every Definition of Done criterion was verified in this step **against the code**, not inherited from
the QA report:

✅ **Success Criteria:** 9 of 9, each traced to a named file and a named test
✅ **Tests:** 14 assertions in `card-preflight.test.mjs` + 420 in the four `sync-jira-*` suites + the
   37-test corpus preflight. Fast gate: 3050 tests, 0 failures.
✅ **CI:** rollup **SUCCESS** — 5 of 5 jobs, polled to a decision rather than sampled once, and
   re-verified on the head that carries this acceptance rather than on an ancestor
✅ **PR:** #373 → `develop`, one QA cycle, three findings fixed in-review at Step 5c
✅ **Documentation:** new shared contract, AGENTS.md index section, Change Log current, § 9 and § 13
   rewritten to match what actually shipped
✅ **Security:** no new credential, network or auth surface. Evidence `reasoned`; probe mode did not
   fire because the deliverable is a reporter, not a boundary — a deliberate answer, not a skip.
⚠️ **Compliance:** NOT_APPLICABLE — internal tooling, no personal data, no user-facing surface. Every
   repository convention that *does* apply was checked and holds.

**What this run found that the task itself had wrong**, recorded because it is the useful part:

1. The task's § 3 claimed the checker was "already available at authoring time" with "no new install
   surface". `create-epic` did not bundle `jira-sync.js` — true for two of three skills.
2. § 4 excluded `create-bug-report` because "bug reports are barred from tracker cards". They are not;
   `sync-jira-bug` publishes them. The barred rule concerns the Change Log. Bug reports in fact have
   **no** preflight at authoring, in `review-bug`, or in CI — a wider gap, filed as a follow-up.
3. There were **four** section specs, not three. Success Criterion 4 was unsatisfiable without
   enumeration until the fourth moved too.
4. The QA fix for the duplicated frontmatter parse introduced a second defect — the parity field
   leaked the whole document into `--json` — caught by the post-gate review lens, not by the gate.

**Detailed Verification Log:** see `task.102.dod.1.authoring-time-card-preflight.md` for complete
evidence and citations.

**Task marked as ACCEPTED on:** 2026-09-10

---

## QA Testing Results

**QA Status**: PASS (CONCERNS → PASS after one fix cycle)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-10
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.102.qa.1.authoring-time-card-preflight.md](./task.102.qa.1.authoring-time-card-preflight.md)
- **Gate File**: [task.102.gate.1.authoring-time-card-preflight.yml](./task.102.gate.1.authoring-time-card-preflight.yml)
- **PR Review** (Step 5c): [task.102.pr-review.1.authoring-time-card-preflight.md](./task.102.pr-review.1.authoring-time-card-preflight.md) — **CONCERNS**, 3 of 4 findings fixed in-review

### Test Coverage Summary

- **Tests Executed**: 3049 (0 failures, 1 skipped)
- **Phases Verified**: 4/4
- **Success Criteria Verified**: 9/9 — each by execution, not by reading
- **Critical Issues**: 0
- **NFR Status**: Security: PASS (`reasoned`), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 1 found one MEDIUM (`T102-001`) and one LOW; **both fixed and mutation-proved in one cycle**.

`card-preflight.js` had hand-rolled a frontmatter parse that `jira-sync.js` already exports, and the
two diverged on leading whitespace and CRLF — the duplication class this task exists to remove, one
function down, in the file whose header says it defines nothing of its own for exactly that reason.
It now uses `lib.parseFrontmatter`.

Worth reading in the QA report: the regression test's **first version asserted the wrong invariant**.
It compared the two paths' verdicts, and the divergence produces identical verdicts on every shape
tested — so it would have passed while the two paths read different text. It now compares the
resolved body.

---

## Progress Tracking

All four phases complete — see `task.102.implementation.1.authoring-time-card-preflight.md`.

| Phase | Status | Landed |
| :--- | :--- | :--- |
| 1 — one definition | ✅ | Four specs + `CARD_SECTIONS_BY_KIND` moved into `shared/resources/jira-sync.js`; all four `sync-jira-*` scripts re-export. |
| 2 — the authoring call | ✅ | `shared/resources/card-preflight.js` (new, tracker-neutral CLI) called from `create-task` 4.6, `create-story` 6.2a, `create-epic`. Contract in `shared/resources/authoring-card-preflight.md`. |
| 3 — naming question | ✅ | Answered **tracker-agnostic**; see the implementation report § "The § 8 decision". |
| 4 — bundle | ✅ | `npm run bundle` run; regenerated `references/` committed. `create-epic` gained `jira-sync.js` for the first time, as predicted by the review. |

Tests: `shared/resources/tests/card-preflight.test.mjs` — 11 assertions, all four mutation-proved.
Fast gate (`npm run ci:fast`) green: 3047 tests, 0 failures.

## References

- `shared/resources/tests/jira-sync-card-summary.test.mjs` — the corpus preflight (task, story, epic)
  and the comment recording the task.2 occurrence
- `skills/sync-jira-task/SKILL.md` — the `--check-card` flag and its offline guarantee
- `shared/resources/jira-sync.js` — `checkCardSections`, already bundled into `create-task`
- `docs/reference/anti-patterns.md` § *Never fix N call sites without a population check* — the trap
  in § 7
- PR #355 — the run that surfaced this; PR #356 added the anti-patterns entry cited above

## Notes

The companion process failure is **not** part of this task and needs no fix: the session that pushed
`task.99` had not run `npm test` on that branch. That is an operator error, already corrected in the
same session, and a skill change would be the wrong response to it.

The value here is narrower and durable: **a check that is free to run belongs where the defect is
created, not where it is reviewed.** Cost is the only reason to defer a check, and this one has none.
