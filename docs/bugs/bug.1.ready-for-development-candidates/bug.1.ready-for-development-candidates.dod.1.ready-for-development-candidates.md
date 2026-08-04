---
type: dod-verification
status: complete
bug: 'bug.1.ready-for-development-candidates'
created: 2026-08-04
description: 'Definition of Done verification for bug.1 — ready-for-development cannot match a Jira column named "Ready for Development".'
tags: [dod, bug, jira-sync, status-mapping]
---

# Definition of Done Verification

**Bug:** `bug.1.ready-for-development-candidates`
**Verification Date:** 2026-08-04
**Verified by:** `/develop-bug` Step 7
**PR:** [#192](https://github.com/Gamaroff/agent-skills/pull/192)
**Status:** COMPLETED — ACCEPTED

---

## Method note (read this first)

`/finalise` was invoked as Step 7 Part A requires. Its documented workflow is built around **story and
task** documents: it verifies numbered Acceptance Criteria, reads `pr_number` frontmatter, generates a
`sprint-review-summary.md`, and drives the document to `status: accepted`. A bug document has none of
those — it has reproduction steps and a fix record rather than acceptance criteria, and its terminal
state is `closed`, not `accepted`. Its DoD phase also fans out four Explore subagents, which this
session's operating instructions preclude.

Step 7's own reference anticipates this case and specifies the fallback:

> If `/finalise` cannot process the bug document type in your install, fall back to the equivalent
> inline DoD checklist (fix present ✓, regression test fails-without/passes-with ✓, suite + lint
> green ✓, no new security surface ✓), record it in the report, and continue.

That inline checklist is what follows. The one `/finalise` gate that **is** bug-applicable — the CI
status gate — was executed in full using its exact rollup query, not skipped or assumed.

---

## DoD Checklist

### 1. Fix present ✅

The root cause is addressed at its source, not its symptom. `shared/resources/jira-sync.js` binds both
`"ready-for-development"` and the spelled-out alias `"ready for development"` to
`READY_FOR_DEVELOPMENT_CANDIDATES`, resolving to:

```
["To Do","Backlog","Open","New","Selected for Development","Ready","Ready for Development"]
```

Evidence: `shared/resources/jira-sync.js:1327` (definition), `:1443` and `:1453` (both bindings).

### 2. Regression test — fails-without / passes-with ✅

`shared/resources/tests/jira-ready-for-development-candidates.test.mjs` — 11 tests, all passing.

The fails-without property was **proven, not assumed**: `jira-sync.js` was reverted via `git stash`
and the suite re-run. Result:

- 2 defect-encoding tests **failed** on pre-fix code (`includes the literal 'Ready for Development'`;
  the `Ready for Development`-only board resolving to `null`)
- 9 zero-regression guards **passed both before and after** — correct, since they assert behaviour
  that must not change

The suite was added as a **new file** rather than an edit to the existing Jira suites, which keeps
"existing suites pass unchanged" a meaningful verification signal.

### 3. Test suite + validation green ✅

| Gate | Result |
|---|---|
| New regression suite | **11/11 pass** |
| `jira-stage.test.mjs` + `jira-stage-fixtures.test.mjs` | **30/30 pass, unchanged** |
| Full `npm test` | **734/734 pass, 0 fail** |
| `npm run validate:all` | **113 skills passed, 0 failed** |

There is no `lint` script in this repo; `validate:all` is its equivalent structural gate and was
relevant because three `SKILL.md` files were edited.

The 30/30 unchanged result is load-bearing rather than incidental: under the chosen fix option
(append), the existing Jira suites are *expected* to be untouched, so a diff there would have
indicated a bug in the fix.

### 4. CI status gate ✅

Executed with `/finalise`'s exact `statusCheckRollup` query (the one that correctly distinguishes a
running `CheckRun` from a finished one, rather than rounding an empty `conclusion` up to green).

**`CI_ROLLUP = SUCCESS`**

| Job | Status | Conclusion |
|---|---|---|
| `link-check` | COMPLETED | SUCCESS |
| `test` | COMPLETED | SUCCESS |
| `validate` | COMPLETED | SUCCESS |

Verified green on the **exact head commit**, not an ancestor:
PR head `cd43e48e8c9c0c5f61f2fa5ec17ce1e0804fcc14` == local HEAD `cd43e48e8c9c0c5f61f2fa5ec17ce1e0804fcc14`.

**Post-close confirmation.** The Step 8 terminal commit `315254c` (this DoD file, the implementation
report, and the registry row — documentation only, no code) moved the PR head afterwards. Its rollup
was re-sampled rather than assumed, and resolved `PENDING → SUCCESS` with all three jobs green. So
the PR is green on its final head as well as on the commit that carried the code.

### 5. No new security surface ✅ (NOT_APPLICABLE in substance)

The change adds string literals to an in-memory candidate list. No new input parsing, no network
surface, no credential handling, no filesystem access, no dependency added. The only behavioural
consequence is which existing Jira transition is selected — and the selection mechanism
(`resolveTransition`) is unchanged.

### 6. Documentation updated ✅

All four tables carrying the incorrect grouping were updated in the same commit:

| File | Updated |
|---|---|
| `docs/reference/configuration.md` | ✅ |
| `skills/sync-jira-task/SKILL.md` | ✅ |
| `skills/sync-jira-story/SKILL.md` | ✅ |
| `skills/sync-jira-epic/SKILL.md` | ✅ |

Files that *look* like targets but are correctly **not** changed, each verified individually rather
than inherited from the review's claim:

- `shared/resources/document-status-lifecycle.md` — its column is **Default Jira status** (singular:
  the *primary* candidate). `mapStatus("ready-for-development")` still returns `To Do`, which the new
  suite pins. Its "Selected for Development" mention is prose.
- `CHANGELOG.md` — a historical release record; rewriting history would be wrong.
- `scripts/setup-consumer.sh` — emits no `ready-for-development` binding (task.36 removed the
  generated `statusMap`; its only commented example uses `ready-for-review`).
- `jira-sync.js` `loadStatusMap` comments — YAML-syntax examples, not claims about defaults.
- `sync-github-*/SKILL.md` — map to GitHub `open`/`closed`; unrelated vocabulary.

### 7. Distribution integrity ✅

All **11** bundled `skills/*/references/jira-sync.js` copies regenerated via `npm run bundle`. Each
differs from the source by exactly one line — the bundler's `AUTO-GENERATED` header — with the fix
region and both key bindings byte-identical. A pre-commit hook independently re-ran the bundler and
reported every skill in sync.

---

## Blast-radius verification

Checks performed to confirm the rebinding cannot reach beyond its intended scope:

- **No identity or enumeration dependence.** Grepped for `=== NEW_CANDIDATES`,
  `Object.values/entries/keys(DEFAULT_STATUS_MAP)` — none exist. No consumer relies on the map's
  values by reference or by iteration.
- **Rank guard untouched.** `DEFAULT_STATUS_RANK` derives from `NEW_CANDIDATES` and
  `DEFAULT_STAGE_MAP`, **not** from `DEFAULT_STATUS_MAP`, so the backwards-transition guard is
  provably unaffected.
- **Sibling statuses unchanged.** `draft`, `planned`, `todo`, `to do`, `open`, `backlog` all still
  resolve to `NEW_CANDIDATES` verbatim — asserted by test, not just inspection.
- **Ordering asserted as a prefix**, not by membership, so a future prepend fails loudly.
- **Dedup flip guarded.** `To Do` is asserted to precede `Selected for Development`, pinning the
  specific promotion a prepended union would have caused.

---

## Decision

**✅ ACCEPTED**

| Criterion | Result |
|---|---|
| Fix present | ✅ PASS |
| Regression test (fails-without/passes-with) | ✅ PASS |
| Test suite + validation green | ✅ PASS |
| CI status gate | ✅ PASS (SUCCESS on head) |
| Security surface | ✅ PASS (no new surface) |
| Documentation | ✅ PASS (4/4 tables) |
| Distribution integrity | ✅ PASS (11/11 copies) |

All Definition of Done criteria are satisfied. The bug is cleared to close.

---

## Known follow-ups (non-blocking, recorded not lost)

1. **task.37 coordination** (`planned`) — introduces a consumer `tracker-workflow.yaml` whose
   built-in default reproduces today's behaviour. Whichever of the two lands second must carry this
   same binding for **both** keys, or the defect returns through the config path.
2. **Unranked `Ready*` statuses** — `Ready` and `Ready for Development` have no `DEFAULT_STATUS_RANK`
   entry, so a card landing there sits at an unranked status and is let through the
   backwards-transition guard. Pre-existing (it already applied to the `ready` alias) and unchanged
   by this fix; addressing it would be scope creep into rank semantics.
