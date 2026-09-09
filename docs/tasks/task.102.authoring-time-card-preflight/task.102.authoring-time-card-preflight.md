---
id: task.102
title: "[Task 102] The card preflight runs in every review-* skill and no create-* skill"
type: task
description: "`--check-card` is an offline preflight — no auth, no network, no writes — that reports whether a document will publish a complete tracker card or a thin one. All three review-* skills run it; none of the three create-* skills do. So a free check runs one step after the moment the defect is introduced, and a document that is filed but not yet reviewed reaches CI unchecked. Move the section specs into the shared library and call the checker at authoring time."
tags: [authoring-skills, tracker-cards, fail-fast, shared-resources]
category: infrastructure
status: draft
priority: Medium
risk_level: low
created: 2026-09-09
updated: 2026-09-09
assignee:
estimated_effort_hours: 3
---

# Technical Task: run the card preflight where the defect is created

**Status:** Draft

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

1. **The checker is already available at authoring time.** `create-task` bundles
   `references/jira-sync.js`, which exports `checkCardSections` and `buildCardSections`. No new
   dependency and no new install surface.
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

- Move `TASK_CARD_SECTIONS`, and the story and epic equivalents, into `shared/resources/jira-sync.js`
  as the single definition; `sync-jira-*` import from there.
- Call `checkCardSections` at the end of `create-task`, `create-story` and `create-epic`, on the
  document just written, printing findings inline with their fixes.
- **Advisory at authoring, blocking at review.** That split already exists in the family and should
  be preserved.

**Out of scope**

- The corpus CI tests in `shared/resources/tests/jira-sync-card-summary.test.mjs`. They stay as the
  backstop; this task keeps them from being the *first* line of defence.
- `create-bug-report`. Bug reports are barred from tracker cards by the comment contract, so no
  preflight applies.
- Changing which sections are required. Any change to the spec's content is a separate decision.

## 5. Breaking Changes

None expected. Moving a constant behind an import is internal, and the new call is advisory. The one
risk to watch is import-cycle or bundling fallout — see § 10.

## 6. Implementation Plan

- [ ] **Phase 1 — one definition.** Move the three section specs into `shared/resources/jira-sync.js`
      and re-export from `sync-jira-{task,story,epic}.js` so existing callers and their tests are
      unchanged. **Do not duplicate the spec into `create-*`** — see § 7.
- [ ] **Phase 2 — the authoring call.** Add the preflight step to the three `create-*` skills.
- [ ] **Phase 3 — decide the naming question** in § 8 and apply whichever answer is chosen.
- [ ] **Phase 4 — `npm run bundle`** and commit the regenerated `references/`.

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

- `shared/resources/jira-sync.js` — the three section specs, moved here
- `skills/sync-jira-{task,story,epic}/scripts/sync-jira-*.js` — import instead of define
- `skills/create-{task,story,epic}/SKILL.md` — the authoring-time preflight step
- `skills/*/references/jira-sync.js` — regenerated by `npm run bundle`

## 10. Testing Strategy

- **Anti-vacuity, and the point of the task:** a fixture document missing `Success Criteria` must
  make the authoring check report a finding. If it does not, the call is present and inert — the
  `present-but-inert` verdict, which is worse than absent because it looks guarded.
- The spec move is behaviour-preserving: `sync-jira-{task,story,epic}` test suites must be green
  **unchanged**, and `TASK_CARD_SECTIONS` must still be exported from each `sync-jira-*` module (an
  existing test asserts its shape directly).
- **One definition, asserted:** a check that the section specs are defined in exactly one place, with
  a non-vacuity floor so it fails rather than passing on zero matches if the pattern drifts.
- The corpus preflight tests for task, story and epic cards stay green.
- A consumer without `sync-jira-*` installed must still get the authoring check — exercise the
  `create-*` path with the Jira sync skill absent.

## 11. Success Criteria

1. [ ] `create-task`, `create-story` and `create-epic` each run the preflight on the document just
       written and print findings with their fixes.
2. [ ] The check is **advisory** at authoring — a document legitimately in progress is not blocked,
       and no author is pushed toward writing filler to satisfy a gate.
3. [ ] `review-*` remains the blocking gate; the family's advise-then-gate split is unchanged.
4. [ ] The section specs are defined in **exactly one** place, and a test asserts that, with a
       non-vacuity floor.
5. [ ] A document missing `Success Criteria` produces a finding at authoring time — demonstrated on a
       fixture, not asserted in prose.
6. [ ] `sync-jira-{task,story,epic}` suites pass **unchanged**; `TASK_CARD_SECTIONS` is still
       exported from each.
7. [ ] The authoring check works for a consumer that does not have `sync-jira-*` installed.
8. [ ] The § 8 naming question is answered in the implementation report, and the module placement
       follows the answer.
9. [ ] `npm run bundle` has been run and the regenerated `references/` copies are committed.

## 12. Risk Assessment

**Low.** The check is offline and advisory, and the spec move is behaviour-preserving.

| Risk | Mitigation |
| :--- | :--- |
| The authoring call is added but never fires (present-but-inert) | The anti-vacuity fixture in § 10 is the primary test, not an afterthought |
| The spec is duplicated rather than moved, and the two drift | § 7; plus the one-definition assertion in Success Criterion 4 |
| A blocking check at authoring pushes authors to write filler | Advisory-only at authoring (Success Criterion 2) — filler is worse than a thin card, because it looks deliberate |
| Moving the constant creates an import cycle or bundling churn | Phase 1 keeps re-exports in place so existing callers are untouched; `npm run bundle` runs in Phase 4 |

## 13. Rollback Plan

Remove the authoring-time call; leave or revert the spec move independently. The two phases are
separable, and the CI corpus tests — which are unchanged either way — continue to catch the defect at
the same point they do today.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 0.1 | Filed from a measured failure on PR #355: `task.99` reached CI without a Success Criteria block; the offline preflight that would have caught it runs in all three `review-*` skills and none of the three `create-*` skills. Second known occurrence of the class (task.2 was the first). | Claude |

## Progress Tracking

Not started.

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
