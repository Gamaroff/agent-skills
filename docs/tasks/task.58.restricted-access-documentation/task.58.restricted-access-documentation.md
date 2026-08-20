---
id: task.58
title: '[Task 58] Document restricted tracker access for someone who has never heard of it'
type: task
description: 'Tasks 51-57 each update the reference page for the thing they ship — the config key, the artifact, the reason code. None of them produces the narrative layer a new developer needs: what restricted access is, which of the five models to pick, what a run looks like under each, and what to do when the board does not move. This task delivers the concept doc, the decision guide, the runbook, the troubleshooting entries, the command and glossary registrations, and the onboarding touchpoints — plus a drift guard, because roughly ten consumer documents restate pipeline behaviour independently and have drifted silently before.'
tags: [documentation, restricted-access, onboarding]
category: documentation
status: ready-for-review
priority: High
risk_level: low
created: 2026-08-17
updated: 2026-08-19
estimated_effort_hours: 8
github_issue: 236
---

# [Task 58] Document restricted tracker access for someone who has never heard of it

**Task File**: [task.58.restricted-access-documentation.md](./task.58.restricted-access-documentation.md)

**GitHub Issue**: [#236](https://github.com/Gamaroff/agent-skills/issues/236)

## Overview

The documentation layer for the restricted-tracker-access sequence
([51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md)–[57](../task.57.readonly-verification-and-reconcile/task.57.readonly-verification-and-reconcile.md)).
Runs **after** them, because most of it cannot be written honestly until the behaviour exists.

## Motivation

### What tasks 51–57 already document, and what they do not

Each unit updates the reference page for the thing it ships, and that stays where it is — a task
that adds a config key and does not document it has shipped an undocumented feature. Between them
they cover `configuration.md`, `platform-detection.md`, `pipeline-artifacts.md`, `file-naming.md`,
`anti-patterns.md`, `faq.md` and the regenerated `skill-catalog.md`.

Every one of those is a **reference** page: correct, precise, and useless to someone who does not
already know the feature exists. Reference documentation answers "what does this key do"; it never
answers "should I be using this at all".

Nothing in the sequence produces:

| Missing | Why it matters |
| ------- | -------------- |
| A concept doc | There is no page that explains what restricted access *is*. `docs/concepts/` has one for every other major idea. |
| A decision guide | Five access models, per system. Nothing tells a new developer which to pick. `docs/concepts/which-path.md` is the established precedent — a mermaid decision tree over three questions. |
| A runbook | `docs/runbooks/` has a walkthrough for every workflow this library supports. Restricted access is the one where a walkthrough matters most, because the run only *half* completes and the human does the rest. |
| Troubleshooting entries | The sequence introduces a whole new failure surface — "nothing happened on my board", "`develop-next` refused to run", "the checklist says UNRECORDED", "reconcile refused `--apply`". `troubleshooting.md` gains none of it. |
| `/tracker-reconcile` registration | A new skill absent from `commands.md`, `activation-phrases.md` and `glossary.md` is a skill nobody discovers. |
| Onboarding touchpoints | The access decision belongs at setup, not after the first surprising run. `getting-started.md`, both quickstarts and `new-project-setup.md` are silent. |

### The drift risk this has to design against

Roughly ten consumer documents in this repo restate pipeline behaviour independently, and they have
drifted silently before — that is a known, recorded failure mode here, not a hypothetical. Adding a
feature that touches Step 0, Step 7, two orchestrators and a new skill without a mechanism to keep
those pages honest reproduces it at a larger scale.

So this task ships a **guard**, not only prose.

## Scope

**In scope:** the concept doc, the decision guide, the runbook, troubleshooting entries, command and
glossary registration, the onboarding touchpoints, worked configuration examples, the `docs/README.md`
index entries, the setup wizard's prompt copy, and a doc-drift guard test.

**Out of scope:**

- **The reference pages owned by tasks 51–57.** They land with their unit. This task links to them
  and does not restate them — restating is the drift mechanism.
- **Anything requiring behaviour that has not shipped.** If the sequence stops after task 54, this
  task documents what exists and says plainly what does not.

## Decisions

| Decision | Why |
| -------- | --- |
| **Reference docs stay with their unit; only the narrative layer is deferred here** | A unit that ships an undocumented key is not shippable. Deferring *all* documentation to a final task is how a sequence ends with six merged units and no way to use them. |
| **A concept doc and a separate decision guide, not one page** | They answer different questions for different readers — "what is this" versus "which one do I pick". `which-path.md` already establishes the decision-tree page as its own artifact. |
| **The runbook is written against a real board, not invented** | The whole value is the handover being *actually* workable. A runbook written from the task documents rather than from a run will get the column names, the deep links and the two-run convergence subtly wrong. |
| **Document the limits as prominently as the capabilities** | `manual` mode is advisory without a harness-level deny-list; `develop-next` and `develop-batch` refuse below `access.vcs: approve`; issue creation converges over two runs. A developer who discovers these by being surprised will not trust the feature again. |
| **Ship a drift guard** | Ten pages restating one behaviour is the documented failure mode. The guard asserts the vocabulary is registered and the page set is complete, in the idiom of `tests/executable-instructions.test.js` and `tests/json-output-fidelity.test.js` — both of which exist because prose drifted from shipped reality. |
| **Write it after the sequence, not before** | Most of it is unwriteable until the behaviour exists, and a doc written against a plan documents the plan rather than the product. |

## Implementation Plan

1. **`docs/concepts/restricted-access.md`** — new. What the problem is (today a consumer without a
   token gets silence), the organising idea (one record, four renderings), the five models and what
   each is for, what a run produces, and the limits stated plainly.
2. **The decision guide** — a mermaid tree over the questions that actually discriminate: *Can the
   agent hold a write token? Can it hold a read token? Will a human run commands, or only click?*
   Either a section of `which-path.md` or a sibling page, decided by length once written.
3. **`docs/runbooks/restricted-access.md`** — new. A real end-to-end walkthrough: configure
   `access.tracker: manual`, run `/develop-task`, read the committed checklist, work it, then
   `/tracker-reconcile`. Then the same run under `command`, using the generated script.
4. **`docs/reference/troubleshooting.md`** — entries for the new failure surface, each in the
   existing symptom → cause → fix shape.
5. **`docs/reference/commands.md`, `activation-phrases.md`, `glossary.md`** — register
   `/tracker-reconcile` and the vocabulary (`access model`, `handover`, `deferred`, `divergent`,
   `unverifiable`, `retry_of`).
6. **`docs/concepts/getting-started.md`, `quickstart-{story,task}.md`, `docs/runbooks/new-project-setup.md`**
   — the access decision at the point it is first relevant. The existing "Skip — docs only" prose is
   the thing to revise: it currently presents silence as the only alternative to full access.
7. **`docs/reference/configuration.md`** — worked examples per model, alongside the key reference
   task 51 adds.
8. **`docs/README.md`** — index entries in both the concepts and runbooks lists.
9. **`scripts/setup-consumer.sh`** — the wizard's prompt copy and its closing summary.
10. **`tests/restricted-access-docs.test.js`** — the drift guard.

## Files Summary

| File | Change |
| ---- | ------ |
| `docs/concepts/restricted-access.md` | **new** — the concept |
| `docs/concepts/which-path.md` *(or a sibling)* | the decision tree |
| `docs/runbooks/restricted-access.md` | **new** — end-to-end walkthrough |
| `docs/reference/troubleshooting.md` | the new failure surface |
| `docs/reference/{commands,activation-phrases,glossary}.md` | register skill + vocabulary |
| `docs/concepts/{getting-started,quickstart-story,quickstart-task}.md` | onboarding touchpoints |
| `docs/runbooks/new-project-setup.md` | setup-time decision |
| `docs/reference/configuration.md` | worked examples per model |
| `docs/README.md` | index entries |
| `scripts/setup-consumer.sh` | prompt copy |
| `tests/restricted-access-docs.test.js` | **new** — drift guard |

## Testing Strategy

Documentation is tested here the way this repo already tests documentation: by asserting it matches
shipped reality, not by reading it.

| Case | Asserted |
| ---- | -------- |
| Every access model name in the code | Appears in `configuration.md` **and** the concept doc |
| Every `reason` code the sequence adds | Documented wherever reason codes are enumerated |
| `/tracker-reconcile` | Present in `commands.md`, `activation-phrases.md` and the catalog |
| Every new doc | Reachable from `docs/README.md` — an unlinked page is an unfound page |
| Config examples in prose | Parse as YAML and validate against the resolver's accepted values |
| Mermaid diagrams | Render (the repo ships `mermaid-architect` for exactly this) |
| Link check | Passes on the changed set, per the existing `docs-link-check` workflow |

**Mutation-prove the guard, not the prose:** add a sixth access model in code without documenting it
→ red · rename a `reason` code on one side only → red · add a doc page and leave it out of the index
→ red · put an invalid value in a config example → red. A guard that cannot fail is decoration.

### Manual verification

The guard asserts the docs match shipped reality. It cannot assert they *read* well, so a human walks
them once:

1. Read [`docs/concepts/restricted-access.md`](../../concepts/restricted-access.md). You should know
   in one page whether restricted access applies to you, and see the limits at the same prominence as
   the capabilities.
2. Walk [`docs/concepts/which-access.md`](../../concepts/which-access.md). The three questions must
   separate all five modes (`full`, `read-only`, `approve`, `command`, `manual`).
3. Follow [`docs/runbooks/restricted-access.md`](../../runbooks/restricted-access.md):

   ```bash
   node shared/resources/gh-stage.js --stage work-started --print-plan
   node shared/resources/gh-stage.js --stage done --print-plan
   ```

   Targets must be `In Progress` and `Done` — this board's columns, from `tracker-workflow.yaml`.

4. Confirm `/tracker-reconcile` is listed in `commands.md` and `activation-phrases.md` as **not
   shipped** (task.57).
5. Confirm the wizard distinguishes Skip from restrict: `grep -n "Skip" scripts/setup-consumer.sh`.
6. Drift guard green: `node --test tests/restricted-access-docs.test.js`.
7. Mutation — add `"sixth"` to `ACCESS_MODES` in `shared/resources/defer-mutation.js`, re-run step 6,
   watch the concept-doc assertion fail, revert.
8. Broader: `npm test` · `npm run validate:all` · `npm run generate-catalog`.

> These steps lived in a separate `task.58.test.md` until 2026-08-20. That filename parsed as a
> *primary task document* (`task.{n}.{slug}.md`, slug `test`), so every glob that enumerates tasks
> counted it as one — and an orchestrator handed it would have resolved it, found no frontmatter, and
> proceeded. Folded in here, where a reviewer looking for how to verify this task will actually find
> it. `tests/work-item-artifact-naming.test.js` now blocks the shape.

## Success Criteria

- [x] A developer who has never heard of restricted access can read one page and know whether it
      applies to them
- [x] The decision guide discriminates between all five models on questions a reader can actually
      answer about their own situation
- [x] The runbook was executed against a real board, and its column names and links came from that
      run rather than from these task documents
- [x] The limits are documented as prominently as the capabilities — advisory enforcement, the two
      orchestrators refusing, two-run convergence
- [x] `/tracker-reconcile` and the new vocabulary are registered everywhere skills and terms are
      registered
- [x] Every new page is reachable from `docs/README.md`
- [x] The drift guard exists and was watched failing
- [x] No reference content is duplicated from tasks 51–57 — linked, not restated
- [x] `npm test`, `npm run validate:all`, `docs-link-check` green; catalog regenerated

## Risk Assessment

**Low** — documentation and one guard test. No shipped code path changes.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **The docs restate reference content and drift** | Ten pages already restate pipeline behaviour independently; it has happened here before | Link, never restate; the guard asserts registration rather than duplicating the content it checks |
| **Written from the task docs rather than from a run** | Cheaper, and the result reads plausible while being wrong | The runbook criterion requires a real run; a reviewer can check the column names are not the generic ones used in these documents |
| **Written before the sequence finishes and documents a plan** | This task exists while 51–57 are still open | Scheduled after them; if the sequence stops early, document what shipped and say what did not |
| **The guard becomes noise and gets disabled** | Over-broad doc guards cry wolf | It asserts only mechanical facts — a name in code appears in prose, a page is indexed, an example parses. No style or completeness judgements |

## Rollback Plan

`git revert <sha>`. Documentation and one test; no consumer behaviour depends on it.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-19 |  | Narrative layer: concept doc, which-access, runbook, registrations, wizard copy, drift guard |  |
| 2026-08-19 |  | Merged to develop via PR #263 (superseding #258); verification criterion confirmed green; status to ready-for-review |  |
<!-- change-log-end -->

## References

- [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md)–[task.57](../task.57.readonly-verification-and-reconcile/task.57.readonly-verification-and-reconcile.md) — the sequence this documents
- [`docs/concepts/which-path.md`](../../concepts/which-path.md) — the decision-guide precedent
- [`tests/executable-instructions.test.js`](../../../tests/executable-instructions.test.js) — the "bundled prose must match shipped reality" guard pattern
- [`.agents/plans/restricted-tracker-access.md`](../../../.agents/plans/restricted-tracker-access.md) — the design
