# Sprint Review Summary — Task 42: Canonical Change Log spec and shared engine

**Task**: `task.42.change-log-spec-and-engine`
**Status**: ✅ Accepted
**Accepted**: 2026-08-12
**PR**: [#209](https://github.com/Gamaroff/agent-skills/pull/209) → `develop`
**Issue**: [#201](https://github.com/Gamaroff/agent-skills/issues/201)

---

## Summary

Every PRD, epic, story and task document is supposed to carry a history of what changed about it.
One already existed — in **four incompatible table shapes**, written by nine skills that disagreed
about the format, with code on only the Jira path and prose the model re-implemented per skill on
the GitHub path. There was no definition of it anywhere in `docs/standards/`.

This task establishes **one canonical definition and one engine that implements it**. Deliberately,
it changes no skill's behaviour: `jira-sync.js` keeps every old export as a wrapper, so all three
`sync-jira-*` scripts are untouched. It is the foundation tasks 43–45 build against.

---

## What was delivered

| Deliverable | What it is |
|---|---|
| `shared/resources/document-change-log.md` | The canonical spec — four columns, append-only, heading tolerance, marker pair, the `updated:` rule, the moment table, and the two exclusions |
| `shared/resources/change-log.js` | The engine — pure, tracker-agnostic, dependency-free |
| `shared/resources/tests/change-log.test.mjs` | 40 tests, grouped A–G by the defect class each guards |
| Standards sweep | All five `docs/standards/*-documents.md`, plus `configuration.md`, `AGENTS.md`, `CHANGELOG.md` |

**The design decision worth demoing**: four columns, because two audiences read one table. Humans
authoring and reviewing care about the document `Version` (`1.0` → `1.1` after a review changes the
acceptance criteria); machines syncing and gating care about the moment and leave `Version` blank.
That single convention is what avoids a human log and a machine log that disagree about what
happened.

---

## Defects removed

Three that existed before, plus one guard that is new:

| Defect | Before | After |
|---|---|---|
| H2-only heading match | `/^## Change Log/m` could not see the `### Change Log` the epic and story templates actually emit, so the update-in-place branch never fired and a **second** block was inserted above the Epic Goal | H2/H3 with optional numbering; the level found is preserved |
| Block-extent overrun | The end-scan looked only for `/^## /m`, so an H3 log ran to the next H2 and swallowed its sibling subsections | Ends at the next heading of the same or shallower level |
| Top-of-body fallback | "Insert before the first `##`" — how a Change Log ended up above the Epic Goal | Doc-type anchor, falling back to EOF. Never the top. |
| **New guard** — examples aren't sections | — | A marker pair or heading inside a fenced block **or an inline code span** is a picture of a Change Log, not one |

The new guard is not tidiness. Documentation about a Change Log necessarily contains examples of
one: the task documents specifying this engine hold eleven fenced headings and two complete fenced
marker pairs, and the spec's own checklist names both markers in adjacent backticks. Unguarded,
running the engine over its own specification appends live rows into a code fence and migrates an
illustrative row into real history. **The inline-code half was found exactly that way** — by
pointing the finished engine at the document that specified it.

---

## Quality

| Metric | Result |
|---|---|
| QA gate | ✅ PASS, 100/100 (3 cycles, 2 fix cycles) |
| CI | ✅ SUCCESS on the exact final commit `b90017c` |
| Tests | **1144 passing, 0 failing** (baseline 1104) |
| Bugs found & closed | 2 HIGH, 1 MEDIUM, 3 LOW |
| Bundle | Idempotent; `change-log.js` distributed to all 14 vendoring skills transitively |

### The finding worth carrying into tasks 43–45

**All three QA-found defects had the same shape**: a rule stated correctly in the spec, then
applied to a subset of the places it governs.

- The fence guard covered a block's **start** but not its **end**.
- Block selection used **declaration order** rather than **document order**.
- The collapse sweep was scoped to **superseded pairs** rather than **every pair that can carry a
  Change Log**.

Each fix widened an existing rule rather than adding a new one — none required rethinking the
design. A reviewer of the follow-on tasks should ask, of every rule this spec states, *"and
everywhere it applies?"*

---

## Honest notes

Two items are recorded as deviations rather than quietly satisfied:

1. **"No pre-existing test modified except the `ROW` fixture" was not met, and could not be.** Four
   further tests assert the before-first-`##` fallback and the old marker identity — exactly what
   Breaking Changes 1–2 remove. All four were rewritten to assert the same properties against the
   new documented behaviour; none was weakened. The behaviour-preservation oracle still holds:
   `jira-sync-sections` and `jira-sync-card-summary` pass completely untouched.
2. **`CL_START`/`CL_END` now name the unified markers**, where the plan kept the legacy strings.
   Nothing writes the old strings any more, so exporting them under those names would mislead.

The review also corrected two factual errors in the task document itself: the vendoring count
(twelve → **fourteen**; `develop-batch` and `develop-next` were missing, and both run unattended),
and a verification claim in Breaking Change 2 whose stated evidence did not support its — correct —
conclusion.

---

## Impact and what's next

**No behaviour changes yet.** This task is deliberately inert: the spec exists, the engine exists,
and nothing calls it differently. That is the point — it is the foundation for:

- **task.43** — templates and creation skills
- **task.44** — review and edit skills
- **task.45** — pipeline and the six sync skills

Adoption is additive and going-forward only. No document is backfilled, matching how sign-off and
OKF v0.1 were adopted.

**Known limitation, by design**: the `jira-sync.js` shim passes the interim author `sync-jira`
rather than the precise `sync-jira-story` / `-task` / `-epic`. Task.45 supplies the precise value
when it rewires those scripts to call the engine directly.
