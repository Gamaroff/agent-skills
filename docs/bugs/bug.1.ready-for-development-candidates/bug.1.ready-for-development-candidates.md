---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: 2026-08-04
related: 'none — cross-cutting (no single owner)'
description: 'The canonical local status ready-for-development resolves to NEW_CANDIDATES, which omits the literal string "Ready for Development" — so a board with that column silently skips.'
tags: [jira, status-mapping, jira-sync, defaults]
github_issue: 191
---

**Bug ID**: bug.1
**GitHub Issue**: [#191](https://github.com/Gamaroff/agent-skills/issues/191)
**Related**: none — cross-cutting (no single owner)
**Status**: ✅ Closed
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-08-04
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: The canonical lifecycle status `ready-for-development` maps to `NEW_CANDIDATES`, which
does not contain the literal string `"Ready for Development"`. The candidate list that *does* contain
it — `READY_CANDIDATES` — is only reachable via the alias key `ready`, which is not a canonical
lifecycle status. A Jira board whose column is named exactly "Ready for Development" therefore never
matches, and the status change is silently skipped.

The spelled-out alias `"ready for development"` (jira-sync.js:1427) is bound to `NEW_CANDIDATES`
too, so **both** spellings of the status fail identically — there is no spelling of this stage that
reaches `READY_CANDIDATES`. Put the other way round: `READY_CANDIDATES` is currently unreachable
from any canonical lifecycle status. The fix is less "widen a list" than "wire up an orphaned one".

**Expected Behavior**: A document at `status: ready-for-development` syncs to a Jira column named
"Ready for Development" with no configuration. That is the most literal possible spelling of the
status, and the built-in candidate lists exist precisely so that the common vocabularies work
without a `statusMap`.

**Actual Behavior**: The candidates tried are `To Do`, `Backlog`, `Open`, `New`,
`Selected for Development`. "Ready for Development" is not among them, so the transition is skipped.

```
local ready-for-development   → ["To Do","Backlog","Open","New","Selected for Development"]
alias "ready for development" → ["To Do","Backlog","Open","New","Selected for Development"]
alias  ready                  → ["Ready","Ready for Development","Selected for Development"]
```

**Impact**: Silent, and easy to misread as correct behaviour. The sync reports success overall and
logs a skip, so a team whose board uses this wording concludes the card simply doesn't move at that
stage. Severity is Minor rather than Major because a one-line `statusMap` override fixes it in any
affected project, and because `ready-for-development` is a short-lived stage — but it is exactly the
class of silent-default failure that `2e14043` introduced candidate lists to eliminate.

Sharpened by task.36 (#184), which removed the generated `statusMap` and now tells consumers
**"MOST PROJECTS NEED NONE"**. That guidance is right in general and wrong for this column name, so
the change makes it likelier someone trusts the defaults here and is bitten.

---

## Reproduction Steps

**Environment**: any consumer with `tracker: jira`, `shared/resources/jira-sync.js` at `54e754e` or
earlier. No `jira.statusMap` in `skills-config.yaml`.

**Steps to Reproduce**:

1. On a Jira board with a workflow column named exactly `Ready for Development`, ensure the project
   has no `jira.statusMap` override.
2. Set a task or story document's frontmatter to `status: ready-for-development`.
3. Run `node .agents/skills/sync-jira-task/scripts/sync-jira-task.js --file <doc>`.
4. Observe the status is not transitioned; the run still reports success.

Reproducible without a board, directly against the library:

```bash
node -e 'console.log(require("./shared/resources/jira-sync.js").mapStatusCandidates("ready-for-development"))'
# → [ 'To Do', 'Backlog', 'Open', 'New', 'Selected for Development' ]
```

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Screenshots/Videos/Test Output**:

```
$ node -e '
const j = require("./shared/resources/jira-sync.js");
console.log("ready-for-development →", j.mapStatusCandidates("ready-for-development"));
console.log("ready                 →", j.mapStatusCandidates("ready"));
'
ready-for-development → [ 'To Do', 'Backlog', 'Open', 'New', 'Selected for Development' ]
ready                 → [ 'Ready', 'Ready for Development', 'Selected for Development' ]
```

**Related Files**:

- `shared/resources/jira-sync.js` — `NEW_CANDIDATES` (L1278), `READY_CANDIDATES` (L1322),
  `DEFAULT_STATUS_MAP` (L1417), the canonical key (L1421) and the `"ready for development"` alias
  (L1427). `mapStatusCandidates` is exported at L3227.
- `shared/resources/tests/jira-stage.test.mjs`, `shared/resources/tests/jira-stage-fixtures.test.mjs`
  — the existing Jira stage suites; already covered by the `shared/resources/tests/*.test.mjs` glob
  in `package.json`, so a regression test added here needs no `npm test` wiring.
- **Docs carrying the same incorrect grouping — all four must be updated together:**
  - `docs/reference/configuration.md` (L~229) — the "Built-in defaults" table under *Jira status mapping*
  - `skills/sync-jira-task/SKILL.md` (L192)
  - `skills/sync-jira-story/SKILL.md` (L193)
  - `skills/sync-jira-epic/SKILL.md` (L198)

Not affected: `shared/resources/jira-transition-protocol.md` documents the resolution *order*, not
the candidate lists, and needs no change. `shared/resources/document-status-lifecycle.md` mentions
"Selected for Development" only as prose example.

---

## Scope & Impact

**Reference**: `DEFAULT_STATUS_MAP` — the shared default consumed by every `sync-jira-*` skill.

**How It Failed**: `DEFAULT_STATUS_MAP` assigns `"ready-for-development": NEW_CANDIDATES` while the
purpose-built `READY_CANDIDATES` list is bound only to the `ready` alias. The two were plausibly
intended the other way round, or intended to be merged.

**Why it has no single owner**: `DEFAULT_STATUS_MAP` is shared infrastructure read by
`sync-jira-story`, `sync-jira-task` and `sync-jira-epic`, and mirrored into eleven bundled skill
copies. No one story or task owns it.

**Deliberately excluded from task.36** (#184): that task's scope forbade altering resolution
behaviour, and its contract test asserts the existing Jira suites pass **unchanged**. This fix
changes what a given local status resolves to, so it needs its own change with its own verification.

**Coordination with task.37 / task.38** (both `planned`): task.37 introduces a consumer-supplied
`tracker-workflow.yaml` whose built-in default reproduces today's behaviour. It does not own this
defect — an explicit consumer config is a different path from the zero-config default — but whichever
of the two lands second must carry the same binding, or the defect reappears through the other path.
Check task.37's built-in default when this bug is picked up.

---

## Suggested Fix

Not prescriptive — the choice between these is a judgment call for whoever picks it up. The single
axis that decides it: **on a board that has both a `To Do` column and a `Ready*` column, which one
should `ready-for-development` land in?** Options 2 and 3 say the `Ready*` column and accept a
destination change for existing boards; options 1 and 4 say `To Do` and change nothing that works today.

1. **Widen `NEW_CANDIDATES` for this key**: bind `"ready-for-development"` to a list that includes
   both the vanilla backlog names and `Ready for Development`. Lowest-risk, but leaves two lists
   that overlap confusingly.
2. **Rebind the key to `READY_CANDIDATES`**: most literal reading of the status name. Riskiest —
   a board with both a `To Do` and a `Ready` column would change destination, and `To Do` would no
   longer be tried at all for this status.
3. **Prepend**: `"ready-for-development": [...READY_CANDIDATES, ...NEW_CANDIDATES]` deduped, so the
   literal name wins on boards that have it while `To Do` is still tried as a fallback. Nothing is
   *removed*, but this **does** change destinations — see the regression cases below. Choose it only
   if the `Ready*`-column-wins semantics are what you want.
4. **Append**: `"ready-for-development": [...NEW_CANDIDATES, "Ready", "Ready for Development"]`.
   The only variant that is genuinely zero-regression: every board keeps the exact destination it
   resolves to today, and a board that has *only* a `Ready for Development` column — the reported
   case — starts working. The cost is that a board with both columns keeps landing in `To Do`, which
   some would call the wrong answer for this stage.

> **Correction to an earlier draft of this section**: option 3 was described as additive with "no
> board that works today stops working". That is false and contradicted the ordering rule stated
> below. Deduped, option 3 resolves to
> `["Ready","Ready for Development","Selected for Development","To Do","Backlog","Open","New"]`, so:
>
> - a board with both `Ready` and `To Do` flips from `To Do` → `Ready`;
> - a board with both `Selected for Development` and `To Do` flips from `To Do` →
>   `Selected for Development`, because dedup promotes that entry from position 5 to position 3.
>
> Both are silent destination changes on boards that work correctly today.

Whichever is chosen:

- The ordered nature of candidate matching means **appending is safe, prepending is not** — anything
  placed before `To Do` changes where existing boards land. Option 4 is the only option that
  respects this rule; options 2 and 3 break it by design and must own that trade-off explicitly.
- **Apply the same binding to both keys**: the canonical `"ready-for-development"` (L1421) *and* the
  spelled-out alias `"ready for development"` (L1427). Fixing only one makes the two spellings of
  the same status resolve differently — a worse failure than the current one, because it is
  inconsistent rather than merely wrong.
- Update **all four** documentation tables listed in *Related Files* in the same commit, not just
  `docs/reference/configuration.md`.
- Edit `shared/resources/jira-sync.js` only, then run **`npm run bundle`** to propagate into the
  eleven bundled `skills/*/references/jira-sync.js` copies, and commit the result. Editing a bundled
  copy directly is silently reverted by the next bundle run.
- Add regression tests asserting:
  - `mapStatusCandidates("ready-for-development")` contains `"Ready for Development"`;
  - `mapStatusCandidates("ready for development")` returns the identical list;
  - a board exposing **both** `To Do` and a `Ready*` column resolves to the intended destination.
    A `To Do`-only board test is necessary but **not sufficient** — it cannot catch either flip
    described in the correction above.
- Re-run `jira-stage.test.mjs` / `jira-stage-fixtures.test.mjs` and expect **deliberate** diffs under
  options 2 and 3; unlike task.36 this change is *supposed* to move resolution. Under options 1 and 4
  the existing suites should pass unchanged — a diff there is a bug in the fix.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-04
**Developer**: Claude (`/develop-bug`)

**Reproduction**: Reproduced verbatim at the library level, exactly as the report specifies — no Jira
board required:

```
ready-for-development → ["To Do","Backlog","Open","New","Selected for Development"]
ready for development → ["To Do","Backlog","Open","New","Selected for Development"]
ready                 → ["Ready","Ready for Development","Selected for Development"]

contains "Ready for Development"? false
```

**Root Cause Analysis**: `shared/resources/jira-sync.js` — `DEFAULT_STATUS_MAP` bound the canonical
key `"ready-for-development"` (L1421) and its spelled-out alias `"ready for development"` (L1427) to
`NEW_CANDIDATES` (L1278), which does not contain the literal string `"Ready for Development"`. The
purpose-built `READY_CANDIDATES` (L1322) was referenced exactly once, by the non-canonical `ready`
alias (L1437) — confirmed by grep: only two references in the whole file, the definition and that one
binding. So `READY_CANDIDATES` was unreachable from any canonical lifecycle status, and no spelling
of this stage could match a column named after it.

Nothing downstream rescues the miss. `eqName` (L2142) is exact lowercase equality, `resolveTransition`
(L2169) is exact at every step, and its `statusCategory` fallback is gated on `terminal` — which
`ready-for-development` is not. The result is `{ match: null, reason: "no-transition" }`: a silent
skip that still reports overall success.

Blast-radius check before touching anything: `DEFAULT_STATUS_RANK` (L1403) derives from
`NEW_CANDIDATES` and `DEFAULT_STAGE_MAP`, **not** from `DEFAULT_STATUS_MAP`, so rebinding these two
keys cannot perturb the backwards-transition rank guard.

**Proposed Fix**: Option 4 (append) — bind both keys to `NEW_CANDIDATES` followed by the dedicated
`Ready*` names, deduped.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-04

**Root Cause**: Both spellings of the `ready-for-development` stage were bound to a candidate list
that omits the stage's own name, while the list containing that name was orphaned behind a
non-canonical alias.

**Fix Description**:

- Added `READY_FOR_DEVELOPMENT_CANDIDATES`, derived as the deduped union
  `[...new Set([...NEW_CANDIDATES, ...READY_CANDIDATES])]` →
  `["To Do","Backlog","Open","New","Selected for Development","Ready","Ready for Development"]`.
  Derived rather than hand-written so a future edit to either source list propagates, and so
  `READY_CANDIDATES` is no longer orphaned.
- Rebound **both** `"ready-for-development"` and `"ready for development"` to it, with an inline
  comment on the alias explaining that the two must never diverge.
- **Ordering is the whole safety argument** and is documented as such at the definition: the
  dedicated names are *appended*, never prepended. Because candidate matching is ordered and exact,
  every board that resolves to `To Do`/`Backlog`/`Open`/`New` today keeps that exact destination;
  only a board exposing none of them reaches the `Ready*` names. Dedup keeps the first occurrence, so
  `Selected for Development` stays at position 5 rather than being promoted to position 3 — the
  specific flip the report's correction block warns about.

**Files Modified**:

- `shared/resources/jira-sync.js` — new `READY_FOR_DEVELOPMENT_CANDIDATES` const; both
  `DEFAULT_STATUS_MAP` keys rebound to it.
- `shared/resources/tests/jira-ready-for-development-candidates.test.mjs` — **new** regression suite
  (11 tests). Added as a new file rather than editing the existing Jira suites, so "existing suites
  pass unchanged" remains a meaningful verification signal. Already covered by the
  `shared/resources/tests/*.test.mjs` glob in `package.json` — no test wiring needed.
- `docs/reference/configuration.md`, `skills/sync-jira-task/SKILL.md`,
  `skills/sync-jira-story/SKILL.md`, `skills/sync-jira-epic/SKILL.md` — all four defaults tables
  split `ready-for-development` onto its own row with the seven-name list.
- `skills/*/references/jira-sync.js` — all **11** bundled copies regenerated via `npm run bundle`
  (verified present in every one).

**Testing**:

- **Fails-without verified explicitly**: with `jira-sync.js` reverted via `git stash`, the two tests
  encoding the defect fail (`includes the literal 'Ready for Development'`, and the
  `Ready for Development`-only board resolving to `null`); the 9 zero-regression guards pass both
  before and after the fix, which is exactly what a no-regression guarantee should look like.
- New suite post-fix: **11/11 pass**.
- `jira-stage.test.mjs` + `jira-stage-fixtures.test.mjs`: **30/30 pass, unchanged** — the signal
  option 4 predicts. A diff here would have indicated a bug in the fix.
- Full `npm test`: **734/734 pass, 0 fail**.
- Ordering is asserted as a *prefix* rather than by membership, so a future prepend fails loudly. The
  decisive case — a board exposing **both** `To Do` and a `Ready*` column — is tested in both column
  orders, since a `To Do`-only test cannot distinguish append from prepend.

**Verification Steps for QA**:

1. `node -e 'console.log(require("./shared/resources/jira-sync.js").mapStatusCandidates("ready-for-development"))'`
   → must include `Ready for Development` and start with `To Do`.
2. Confirm both spellings return identical lists.
3. `node --test shared/resources/tests/jira-ready-for-development-candidates.test.mjs` → 11/11.
4. `node --test shared/resources/tests/jira-stage.test.mjs shared/resources/tests/jira-stage-fixtures.test.mjs`
   → 30/30, unchanged.
5. Confirm all 11 `skills/*/references/jira-sync.js` copies contain `READY_FOR_DEVELOPMENT_CANDIDATES`.
6. Confirm all four doc tables list the seven-name list for `ready-for-development`.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-08-04
**Verified by**: develop-bug (Verify Cycle 1)

**Verification Result**: ✅ Fixed

**Notes**: All three verification signals green on the first cycle.

1. **Regression test** — `jira-ready-for-development-candidates.test.mjs` 11/11 pass. The
   fails-without property was established in Step 3 by reverting `jira-sync.js` and re-running: the
   two defect-encoding tests fail on pre-fix code, the nine zero-regression guards pass either way.
2. **Suite + validation** — full `npm test` 734/734, 0 fail. `npm run validate:all` 113 skills
   passed, 0 failed (relevant because three `SKILL.md` files were edited). No `lint` script exists in
   this repo; `validate:all` is its equivalent gate.
3. **Diff code review** — no blocking correctness findings. Verified: declaration order is safe
   (`READY_FOR_DEVELOPMENT_CANDIDATES` follows both source lists); `Set` dedup preserves insertion
   order and collapses the shared `Selected for Development` entry; **no identity (`===`) or
   enumeration dependence on `DEFAULT_STATUS_MAP` values exists anywhere in the file**, so rebinding
   is safe; `DEFAULT_STATUS_RANK` derives from `NEW_CANDIDATES`/`DEFAULT_STAGE_MAP` and is untouched;
   all 11 bundled copies differ from source by exactly one line — the bundler's `AUTO-GENERATED`
   header — with the fix region and both key bindings byte-identical.

Documentation completeness was re-checked rather than trusted. The review's "not affected" list holds:
`shared/resources/document-status-lifecycle.md` maps to a **Default Jira status** (singular, the
primary candidate `To Do`), which the fix leaves unchanged and which the test suite asserts; its
"Selected for Development" mention is prose. `CHANGELOG.md` is a historical record and correctly
untouched. `scripts/setup-consumer.sh` emits no `ready-for-development` binding (task.36 removed the
generated `statusMap`). The `loadStatusMap` comment blocks are YAML-syntax examples, not claims about
defaults. `--probe-workflow` picks up the corrected list automatically via `mapStatusCandidates`.

The reported failure no longer reproduces: a board whose only column is `Ready for Development` now
resolves to it, while every board that resolves to `To Do`/`Backlog`/`Open`/`New` today keeps that
exact destination.

**Decision**: Closed (finalised in Step 7)

---

## Status History

| Date       | Status | Changed By | Notes                                            |
| ---------- | ------ | ---------- | ------------------------------------------------ |
| 2026-08-04 | New    | Claude     | Found while verifying task.36 (#184); filed after |
| 2026-08-04 | New    | Claude     | `/review-bug` — 9/10, READY TO FIX; no duplicate, defect confirmed present. Corrected option 3's safety claim, added option 4, added alias key + `npm run bundle` + full doc list to scope |
| 2026-08-04 | In Progress | develop-bug | Reproduced at library level; investigation started |
| 2026-08-04 | Ready for QA | develop-bug | Fix implemented (option 4, append) + 11-test regression suite; 734/734 npm test |
| 2026-08-04 | Ready for QA | develop-bug | Fix verified — bug scenario gone; all 3 signals green on cycle 1 |
| 2026-08-04 | Closed | develop-bug | Fix verified and accepted; DoD satisfied, CI green on head. PR #192 |

---

## Resolution Summary

**Final Status**: ✅ Closed — Fixed

**Total Iterations**: 1 (no reopen; verification passed on the first cycle)

**Time to Resolution**: Same day — filed and closed 2026-08-04

**Final Fix Details**: `DEFAULT_STATUS_MAP` bound both the canonical `"ready-for-development"` key
and its spelled-out alias `"ready for development"` to `NEW_CANDIDATES`, a list that omits the
stage's own name; the list that contained it, `READY_CANDIDATES`, was reachable only from the
non-canonical `ready` alias and so was unreachable from any lifecycle status. Both keys now bind to
`READY_FOR_DEVELOPMENT_CANDIDATES` — the deduped union of the two lists, with the dedicated `Ready*`
names **appended rather than prepended**. Because candidate matching is ordered and exact, every
board keeps the exact destination it resolves to today, and a board whose column is named
`Ready for Development` starts matching. Shipped with an 11-test regression suite, all four
documentation tables corrected, and the 11 bundled skill copies regenerated.

**Lessons Learned**:

1. **An ordered candidate list has two independent failure modes, and only one is obvious.** The
   filed defect was *membership* — a missing name. The likelier defect while fixing it was *ordering*
   — silently relocating cards on boards that already work. A membership-only test passes just as
   happily under a prepend, so the regression suite asserts the backlog names as a **prefix** and
   exercises a board exposing both `To Do` and a `Ready*` column. A `To Do`-only test, which is the
   natural thing to write, cannot distinguish append from prepend at all.

2. **Dedup is an ordering operation, not just a tidiness one.** `NEW_CANDIDATES` and
   `READY_CANDIDATES` share `Selected for Development`. Deduping a *prepended* union would have
   promoted that entry from position 5 to position 3 and flipped any board exposing both it and
   `To Do` — a regression with no new name involved anywhere, invisible to a reader checking only
   which names were added.

3. **The review's most valuable output was catching a self-contradiction, not a gap.** The report
   originally recommended an option as "no board that works today stops working" while stating the
   opposing ordering rule two lines later. Both could not be true, and the plausible-sounding one
   would have shipped a second silent transition failure while fixing the first.

4. **A "not affected" list deserves the same verification as an "affected" one.** Four of the five
   files the review declared unaffected were re-checked here rather than trusted; all four held, but
   the check is cheap and a wrong exclusion leaves documentation silently contradicting code.

5. **Deriving a list beats hand-writing it.** `[...new Set([...NEW_CANDIDATES, ...READY_CANDIDATES])]`
   yields the same seven names as a literal would, but propagates future edits to either source list
   and retires `READY_CANDIDATES`'s orphan status — the underlying condition that allowed this bug.

6. **Zero-regression is a testable claim, so test it.** Under the chosen option the pre-existing Jira
   suites must pass **unchanged**; that turns 30/30 from a routine green into evidence about this
   specific decision. Adding the new tests to a separate file, rather than editing those suites, is
   what preserved that signal.
