# Sprint Review Summary — Task 52

**Task:** [One deferred-mutation record, four renderings of it](./task.52.deferred-mutation-record-and-renderers.md)
**Status:** ✅ Accepted · 2026-08-18
**PR:** [#249](https://github.com/Gamaroff/agent-skills/pull/249) · **Issue:** [#230](https://github.com/Gamaroff/agent-skills/issues/230)
**QA Gate:** PASS 92/100 (2 cycles) · **CI:** green

---

## Summary

Second of seven tasks (51–57) building restricted tracker access. It establishes the data contract
for the whole sequence and every output built from it, driven entirely by fixture journals so the
contract could be finished and proven *before* any call site depends on it.

The surface is 20 tracker mutation kinds × 5 access models. Treated naively that is 100 behaviours.
The organising idea that makes it tractable — and what this task delivers:

> **One planned-mutation record. The access mode decides only who executes it and how it is rendered.**

## What a consumer gets today

Setting `access.tracker: read-only` (or `manual`, `command`, `approve`) now changes real behaviour
for the first time since task 51 introduced the key:

- Both stage CLIs decline the board move they are not permitted to make — exit 0,
  `reason: "deferred"`, **no network call attempted**
- The intent is recorded to an append-only journal
- A run-end checklist names the card and its target column

Previously that same consumer either 401'd mid-pipeline or handed over a token they did not want to
give.

## Delivered

| Component | What it is |
| --------- | ---------- |
| `tracker-access-record.md` | The canonical schema **and** the roster of all 20 kinds, each grounded in a real call site in this repo |
| `defer-mutation.js` | The single writer — CLI *and* `require`-able. Parses the roster from the schema doc and refuses an unknown kind |
| `handover-render.js` | Four output formats (`md`, `sh`, `json`, `summary`), each a pure function of the record list |
| `jira-stage.js` / `gh-stage.js` | Gated on `ACCESS_TRACKER`, positioned ahead of the first credential read |
| Registries | `handover` in `file-naming.md` (story + task) and `pipeline-artifacts.md`; `## Tracker Actions Required` in both report templates |

## Testing & QA

- **1352 node + 394 shell tests**, 0 failed. 65 new.
- **Every invariant mutation-proven** — 23 mutations across two cycles, each watched red then restored.
- QA cycle 1: **FAIL 25/100** — 7 HIGH, 9 MEDIUM. Cycle 2: **PASS 92/100**.

## What the quality gates actually caught

Worth reviewing, because the failures were not marginal:

1. **Two arbitrary-command-execution paths** in the *committed*, "dry-run-by-default" shell script —
   both firing during the dry run. Found by the diff code review, confirmed by execution.
2. **A record-identity collision** that silently dropped a wanted action: two comments to one issue
   shared their argv, so `computeId` collapsed them. That is the exact invisible-drift failure this
   task exists to remove, and worse than the behaviour it replaces.
3. **Redaction that corrupted real content** — commit SHAs, base64 assets, URLs and the branch name
   all became `«redacted»`.
4. **A defect in cycle 1's own fix**, found by cycle 2.
5. **A red PR** the local signals never showed: CI runs `prettier --check` alongside `npm test`.

The common thread: **all seven HIGH defects sat in code the suite already covered.** Each fixture
happened not to contain the triggering shape. The regressions added now assert *counts and
byte-equality* rather than presence and relative order.

## Known limitations / follow-up

Deliberately out of scope, recorded in gate 2 as `future` actions naming the exact files:

- **BUG-7** — `handover-render.js` is not yet invoked by a pipeline step or shipped in the bundle, so
  a bundled run records but does not render. Wiring it up is interception work (tasks 53–57).
- **BUG-15** — the gate defers without the permitted board read, so a record is an unverified request
  rather than a confirmed delta. Task 57's reconcile work.
- `topoSort` recursion is unbounded — unreachable at run scale.

## Impact

Nothing calls the new modules yet, by design. The two stage-CLI gates are the only change on a live
path and are inert under `full`, which is every consumer today — asserted byte-identical, with 160
pre-existing stage-CLI tests unchanged.

The value delivered now is that tasks 53–57 inherit a finished, mutation-proven contract instead of
negotiating with a schema that is already load-bearing in three places.
