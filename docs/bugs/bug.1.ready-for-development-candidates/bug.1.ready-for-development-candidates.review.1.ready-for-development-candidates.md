---
type: review
status: complete
created: 2026-08-04
related: 'bug.1.ready-for-development-candidates'
description: 'review-bug fix-readiness review of bug.1 — 9/10, READY TO FIX; no duplicate, defect confirmed present, five scope/accuracy gaps applied to the report.'
tags: [review, bug, jira-sync, status-mapping]
---

# Bug Review — `bug.1.ready-for-development-candidates`

**Reviewed**: 2026-08-04 · **Mode**: interactive · **Reviewer**: Claude (`/review-bug`)
**Bug mode**: general · **Bug file**: [`bug.1.ready-for-development-candidates.md`](bug.1.ready-for-development-candidates.md)
**Tracker**: GitHub [#191](https://github.com/Gamaroff/agent-skills/issues/191)

---

## Executive Summary

| | |
|---|---|
| **Fix-readiness** | **9 / 10** |
| **Recommendation** | ✅ **READY TO FIX** |
| **Critical** | 0 |
| **Important** | 5 (all applied) |
| **Optional** | 2 |
| **Duplicate** | none |
| **Reproduces** | likely (high confidence) |

This is a well-built bug report. Every factual claim it makes was independently verified and holds
exactly — the cited line numbers are accurate, the one-line reproduction reproduces verbatim, and the
`mapStatusCandidates` export it relies on exists. The severity/priority pairing is defensible and
explicitly justified in the report itself. Registry and tracker linkage are both correct.

The findings are therefore not about whether the bug is real — it is — but about the **fix guidance**.
The most significant one: the report's recommended fix option carried a safety claim that the report
itself contradicted two lines later, in a way that would likely have led an implementer to ship a
silent destination change believing it inert.

### Score breakdown

| Dimension | Score | Note |
|---|---|---|
| Completeness | 8 / 10 | All template sections present; fix checklist was missing the bundle step, the alias key, and 3 of 4 doc targets (now applied) |
| Reproducibility | 10 / 10 | Exact, self-contained, library-level repro that needs no Jira board; confirmed verbatim by independent scan |
| Classification | 9 / 10 | `Minor`/`Medium` correct against the create-bug-report guidelines, and the report pre-empts the challenge |
| Linkage | 9 / 10 | Registry row + GitHub issue + task.36 relationship all correct; task.37/38 adjacency was unrecorded (now applied) |

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/bug.1.ready-for-development-candidates
  - Base:       develop
  - Epic branch: N/A
  - Auto-skip:  false
```

**User decisions**

1. *Fix options* → **Correct the false claim and add append-only option 4.** Keeps the section
   non-prescriptive (now four options, honest risk on each, none chosen) while removing the
   misleading recommendation.
2. *Apply fixes* → **Apply all critical + important.** Bug lifecycle `status` left at `new` — this
   skill never mutates it.

---

## Pre-pass Results

### Agent A — Duplicate scan → `duplicate: none`

bug.1 is the only bug in the repo; the registry lists just `#1`, there are no story/task
`*.bug.*.md` files, and no deleted bug files in git history. No existing work item owns this fix:
task.36 (accepted) explicitly excluded resolution-behaviour changes, and task.37/38 (both `planned`)
add an optional consumer `tracker-workflow.yaml` whose built-in default reproduces today's behaviour
rather than owning the default itself.

### Agent B — Already-fixed / stale scan → `reproduces: likely` (confidence: high)

Decisive path `shared/resources/jira-sync.js:1421`. The live reproduction returns
`['To Do','Backlog','Open','New','Selected for Development']`, matching the report verbatim.
No rescue mechanism exists anywhere in the resolution path:

- `eqName` (L2142) is exact lowercase equality — no fuzzy or substring matching;
- `resolveTransition` (L2151) is documented as "never fuzzy";
- the `statusCategory` fallback is terminal-only, and `ready-for-development` is not in
  `TERMINAL_LOCAL_STATUSES` (L1452);
- the spelled-out alias `"ready for development"` (L1427) maps to `NEW_CANDIDATES` as well.

All 11 bundled `skills/*/references/jira-sync.js` copies carry the identical binding — no drift, no
already-fixed copy. (`.claude/skills/` is a symlink to `skills/`, so the report's count of **eleven**
bundled copies is correct.)

---

## Findings

### Critical — none

No blocker to starting the fix.

---

### Important

#### I1 — Recommended fix option carried a false safety claim *(applied)*

The report recommended option 3 (`[...READY_CANDIDATES, ...NEW_CANDIDATES]`) as "additive, and no
board that works today stops working" — then stated two lines later that "appending is safe,
prepending is not… Option 3 prepends deliberately". Both cannot be true.

Deduped, option 3 resolves to
`["Ready","Ready for Development","Selected for Development","To Do","Backlog","Open","New"]`, so:

- a board with both `Ready` and `To Do` flips from `To Do` → `Ready`;
- a board with both `Selected for Development` and `To Do` flips from `To Do` →
  `Selected for Development` — dedup promotes that entry from position 5 to position 3.

Both are silent destination changes on boards that work correctly today. Given the bug being fixed
*is* a silent status-transition failure, shipping a second one under a "no regression" banner is the
sharpest risk in the report.

**Applied**: replaced the claim with an explicit correction block naming both regression cases;
reframed option 3 as a deliberate semantics change rather than an inert one.

#### I2 — No zero-regression option was offered *(applied)*

The report's own ordering rule ("appending is safe") points at a fourth option that it never listed:
`[...NEW_CANDIDATES, "Ready", "Ready for Development"]`. This is the only variant with the property
option 3 falsely claimed — every existing board keeps its exact destination, and a board with *only*
a `Ready for Development` column starts working.

**Applied**: added as option 4, with its real cost stated (a board with both columns keeps landing in
`To Do`, which some would call wrong for this stage). Added a framing line identifying the single
axis that actually decides the choice, so the four options read as a decision rather than a menu.

#### I3 — The `"ready for development"` alias key was unmentioned *(applied)*

`DEFAULT_STATUS_MAP` binds the spelled-out alias `"ready for development"` (L1427) to
`NEW_CANDIDATES` as well. The report described `READY_CANDIDATES` as reachable "only via the alias
key `ready`", which is true but understates the surface: **no** spelling of this stage reaches
`READY_CANDIDATES`.

This doubles the fix surface from one key to two. Fixing only the canonical key would make two
spellings of the same status resolve differently — worse than the current state, because it is
inconsistent rather than uniformly wrong.

**Applied**: added to Summary, to the Actual-Behaviour code block, to Related Files, and as an
explicit "apply to both keys" checklist item. Also added the stronger framing this enables —
`READY_CANDIDATES` is currently unreachable from any canonical status, so the fix is "wire up an
orphaned list", not "widen a list".

#### I4 — Fix checklist omitted `npm run bundle` *(applied)*

The Scope section correctly notes the map is "mirrored into eleven bundled skill copies", but the
actionable checklist never said to regenerate them. Editing `shared/resources/jira-sync.js` alone
leaves all 11 installed skill copies unfixed; editing a bundled copy directly is silently reverted by
the next bundle run. This repo has a recorded history of exactly this drift.

**Applied**: added an explicit "edit `shared/resources/` only, then run `npm run bundle`, and commit
the result" checklist item.

#### I5 — Documentation target list was incomplete *(applied)*

The report named only `docs/reference/configuration.md`. The identical incorrect table also appears
in three skill docs, all of which will contradict the code after the fix:

| File | Line |
|---|---|
| `docs/reference/configuration.md` | ~229 |
| `skills/sync-jira-task/SKILL.md` | 192 |
| `skills/sync-jira-story/SKILL.md` | 193 |
| `skills/sync-jira-epic/SKILL.md` | 198 |

**Applied**: all four listed in Related Files under a "must be updated together" heading. Also
recorded the two files that look like targets but are **not**:
`shared/resources/jira-transition-protocol.md` documents resolution *order*, not candidate lists, and
`shared/resources/document-status-lifecycle.md` mentions the name only as prose.

---

### Also applied

- **Test guidance strengthened.** The prescribed test — "a `To Do`-only board is unaffected" — is
  necessary but cannot catch either flip in I1. Replaced with three assertions, including a board
  exposing **both** `To Do` and a `Ready*` column, and a check that both status spellings return
  identical lists. Confirmed the target suites live at `shared/resources/tests/*.test.mjs`, which the
  `package.json` test glob already covers — so a new test there needs no wiring (a real orphan risk
  in this repo, checked and cleared).
- **Expected-diff guidance split by option.** Options 2 and 3 *should* move the existing Jira suites;
  options 1 and 4 should not, and a diff there indicates a bug in the fix. The original text implied
  diffs were expected regardless.
- **task.37 / task.38 coordination note.** Neither owns this defect — an explicit consumer config is
  a different path from the zero-config default — but whichever lands second must carry the same
  binding or the defect reappears through the other path.

---

### Optional (not applied)

- **O1 — Evidence section omits the template's `**Logs and Stack Traces**` sub-heading.** The command
  output is folded into *Screenshots/Videos/Test Output* instead. Cosmetic template drift; the
  content is present and readable, and a second code fence would add nothing.
- **O2 — `--probe-workflow` is not referenced.** `configuration.md` tells users to run it before
  writing a `statusMap`. Mentioning it in Reproduction Steps would give a reader a way to confirm
  their own board is affected, but the library-level one-liner already proves the defect more
  cheaply.

---

## Dimension Detail

### Step 2 — Template & frontmatter compliance ✅

All required body sections present, with the mode-correct **Scope & Impact** heading for a general
bug. Frontmatter carries `type: bug` (OKF's one hard requirement), plus `status`, `severity`,
`priority`, `created`, `related`, `description`, `tags`, `github_issue` — all well-formed and within
their allowed value sets. Identity is consistent: filename stem, directory stem, body `Bug ID`, and
`MODE_KIND=general` all agree. Body `**Status:** 🆕 New` matches frontmatter `status: new`.

### Step 3 — Reproducibility ✅ (the core gate)

The strongest dimension. Reproduction is numbered, concrete, and self-contained, and — unusually —
the report supplies a **board-free** library-level reproduction that runs in one line and needs no
Jira credentials. Expected and Actual are both explicit, with the actual candidate list quoted
literally. Environment, Frequency (`Always`), and Reproducible (`Yes`) are all set. Evidence is real
command output, not a description of it.

Independent verification confirmed the output matches the report verbatim and that every cited line
number is accurate — including that `mapStatusCandidates` is genuinely exported (L3227), which the
reproduction depends on.

### Step 4 — Severity / priority ✅

`Minor` / `Medium` is correct. Against the `create-bug-report` guidelines, `Minor` is carried by
"easy workaround available" — a one-line `statusMap` override fixes any affected project — and
`Medium` by "Minor severity usually / can be worked around". `Major` ("integration failure") is
arguable, but the workaround is genuinely trivial, and the report pre-empts the challenge by
justifying the choice in-line. No change recommended.

### Step 5 — Mode & linkage ✅

General-bug mode is correct: `DEFAULT_STATUS_MAP` is shared infrastructure read by all three
`sync-jira-*` skills, with no single story or task owner, and the report explains why. Registry row
`#1` exists in `docs/bugs/bug-registry.md` with `status: new`, consistent with frontmatter. GitHub
issue #191 is linked in both frontmatter and body. The relationship to task.36 is accurately
characterised — that task's contract test asserts the Jira suites pass *unchanged*, which is exactly
why this fix could not ride along with it.

---

## Next Steps

1. **Pick a fix option.** The report is deliberately non-prescriptive and stays that way. The
   decision reduces to one question: on a board with both a `To Do` and a `Ready*` column, should
   `ready-for-development` land in `To Do` (options 1, 4) or the `Ready*` column (options 2, 3)?
2. **Run `/develop-bug`** on the bug file, or fix manually. The bug is ready either way — nothing
   here requires further human input to start.
3. **Apply to both status keys**, update all four doc tables, and run `npm run bundle` before
   committing.
4. **Watch task.37** when it moves off `planned` — its built-in default must not reintroduce this.

---

## Files Modified by This Review

- `bug.1.ready-for-development-candidates.md` — Summary, Actual Behaviour code block, Related Files,
  Scope & Impact, Suggested Fix (rewritten), Status History.
- Bug lifecycle `status` **unchanged** (`new`) — `/develop-bug` Step 3 owns that transition.
- No codebase files were modified.
