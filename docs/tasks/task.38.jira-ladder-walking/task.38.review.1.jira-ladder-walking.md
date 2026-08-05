---
id: task.38.review.1
title: "Task Review Report: Task 38 — Jira ladder walking"
type: review
description: "Standard-depth review of task.38: five critical API/evidence defects, seven important gaps, all verified against the shipped task.37 engine and the RAPP fixtures."
tags: [review, task.38, jira, tracker-workflow]
task-ref: task.38.jira-ladder-walking.md
created: 2026-08-05
updated: 2026-08-05
---

# Task Review Report: Task 38 — Jira: walk the status ladder

**Reviewed:** 2026-08-05
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT

> **Implementation Status**: ✅ All 12 critical + important recommendations implemented — 2026-08-05.
> Optional items 1 (effort re-estimated to 22h) and 4 (fixture precondition) were also applied;
> optional 2 (result-contract flowchart) and 3 (a task.37-tests-unchanged criterion, covered by the
> broader §9 criterion) were not.

---

## Executive Summary

The task is exceptionally well-structured — template compliance is clean, the risk assessment and
rollback plan are among the better ones in this repo, and the core insight (transitions are
position-dependent, so re-fetch after every hop) is correct and clearly argued. The problem is
underneath: the task and its plan were written against a **pre-merge mental model of task.37's
API**, and three of the functions they call either do not exist or return a different shape than
assumed. One headline piece of evidence — "both hops already exist in the captured RAPP payloads"
— is factually wrong. A stated benefit has no phase implementing it.

None of this is structural. Every defect is a correction to a named line, and the design underneath
survives all of them intact.

**Critical Issues:** 5 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1 — Fixture gap: hop 2 is not in the captured data

- **Decision**: **Capture the fixture.** Correct the claim, add `rapp-story-ready-for-showcase.json`
  under a new "Files to Add" section, and make capturing it an explicit Phase 5 prerequisite.
- **Impact**: §6 Phase 5 and §8 Integration Tests are rewritten; §7 gains a "Files to Add"
  subsection; §9 gains a criterion gating on the capture. Phase 5 acquires an external dependency
  (an issue parked in READY FOR SHOWCASE on the real board) that must be visible in the plan.

### Q2 — The bespoke-column guard benefit is claimed but unimplemented

- **Decision**: **Add it to Phase 2.** Thread a ladder-derived rank into `transitionToStatus`
  (ladder first, JSON record second, `DEFAULT_STATUS_RANK` last).
- **Impact**: Phase 2 gains a change item and its risk profile rises — it now edits the guard every
  other caller of `transitionToStatus` shares. §2 Benefit 4 becomes true rather than aspirational.

### Q3 — `--print-plan` can never return more than one hop

- **Decision**: **Add `--from <status>`.** New flag threaded into `planMove`; the MCP fallback reads
  the card's status via its connector and passes it.
- **Impact**: Phase 3 gains the flag plus `USAGE` and header-block updates; Phase 4's bail-out rule
  becomes reachable; the parity test in §8 must exercise both the `--from` and no-`--from` shapes.

### Q4 — `namesFor` does not exist; last-rung is computed against the wrong ladder

- **Decision**: **Extend `resolveMoment`** to also return `isLastRung`, computed against the
  resolved ladder. Drop `namesFor` in favour of the existing `targets` / `planMove(...).names`.
- **Impact**: `shared/resources/tracker-workflow.js` enters scope — it appears in no phase, in no
  Files Summary entry, and §4 does not exclude it. §7 gains it, Phase 1 is rewritten, and
  task.37's snapshot/unit tests for `resolveMoment` need extending.

---

## 1. Template Structure Compliance

**Status:** PASS

All required sections present. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere in either file.
Filename convention correct (`task.38.jira-ladder-walking.md` — dots as structural separators,
hyphens within the descriptive name). Plan is co-located in the task directory per
`docs/standards/plan-file-locations.md`.

**OKF frontmatter conformance**: `type: task` present and non-empty ✓; `description` present ✓;
`tags` a valid YAML list ✓; `updated` present ✓. Fully conformant.

**Metadata**: `status: planned` / `**Status:** Planned` agree across frontmatter and body ✓.
`priority: High` ✓. `estimated_effort_hours: 16` ✓. `github_issue: 186` ✓.

**Tracker linkage**: `TRACKER=github` (remote `git@github.com:Gamaroff/agent-skills.git`, no
`JIRA_URL`). Issue [#186](https://github.com/Gamaroff/agent-skills/issues/186) verified OPEN, title
matches. Body cross-reference link present at line 21 and consistent with frontmatter ✓.

No issues.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 2 (one invented function, one invented return field)

### Critical

#### C1 — `resolveMoment` returns `targets` (plural array), not `target`

- **Location:** §3 Target Architecture (task L86-88); plan Phase 2 L79-102, Phase 3 L142-156
- **Issue:** The task calls `moment.target` / `m.target` in five places. `resolveMoment`
  (`tracker-workflow.js:583`) returns through `describeTarget` (`:645`), which returns
  `{ targets: [...], rank, offLadder }` — there is no `target` key on either branch (`:667`, `:669`).
- **Evidence:** `resolveMoment`'s own docstring (`tracker-workflow.js:576-582`) is explicit, and
  names this task as the consumer:

  > "`targets` is PLURAL and carries the rung's full name list in preference order. Returning
  > `names[0]` instead would make every alternative unreachable as a move target: a board whose
  > column is 'Waiting for Review' would be moved to 'In Review', which is exactly the behaviour
  > change the default ladder exists to prevent. **Task.38/39 try the candidates in order**, as
  > resolveTransition already does."

  Implementing as written re-introduces the precise regression task.37 built `targets` to prevent.
- **Recommendation:** Replace every `moment.target` / `m.target` with `moment.targets`, and pass the
  array straight to `resolveTransition`'s `candidates` — which already accepts an ordered list.

#### C2 — `namesFor()` does not exist

- **Location:** plan Phase 2 L102 (`namesFor(rung, workflow)`), L115; Phase 3 L144
  (`tw.namesFor(moment.target, workflow)`)
- **Issue:** No such function in `tracker-workflow.js`. The module exports (`:841-856`) are
  `loadWorkflow`, `clearWorkflowCache`, `buildWorkflow`, `rankOf`, `resolveMoment`, `planMove`,
  `resolveDocumentStatus`, `validateWorkflow`, `normalizeRung`, `stripStatusEmoji`, `eqName`,
  `MOMENTS`, `DEFAULT_LADDER`, `DEFAULT_PIPELINE`, `DEFAULT_WORKFLOW_PATH`. It is not defined
  privately either.
- **Recommendation:** Per Q4 — delete it. The names are already in hand: `moment.targets` for the
  final rung, and `planMove(...)` elements carry `.names` for every intermediate one.

#### C3 — The `hops` array mixes two incompatible shapes

- **Location:** plan Phase 2 L84 (`const hops = [...planMove(from, target, workflow), target]`)
- **Issue:** `planMove` returns rung **objects** — `ladder.slice(a+1, b).map(r => ({ names: r.names.slice() }))`
  (`tracker-workflow.js:681-690`). The plan appends a bare `target` to that list, then applies
  `norm(rung)` and `namesFor(rung, workflow)` uniformly across both shapes. Two further problems in
  the same expression:
  - `norm` is undefined — there is no `norm` export. The name-level helpers are `stripStatusEmoji`
    and `eqName`; `normalizeRung` operates on raw rung shapes, not names.
  - `current = res.to || rung` (L108) assigns a rung **object** to `current` whenever
    `transitionToStatus` returns no `to`, and `current` is then passed as `currentStatus` on the
    next hop and returned as `landed`.
- **Recommendation:**
  ```js
  const hops = [...planMove(from, target, workflow, { issueType }).map((r) => r.names),
                moment.targets];   // uniform: an array of name-arrays
  ```
  and `current = res.to || rung[0]`, with visited-set membership keyed on
  `stripStatusEmoji(name).toLowerCase()`.

#### C4 — Last-rung detection reads the wrong ladder, via an unexported helper

- **Location:** plan Phase 1 L50-51 —
  `rankOf(target, workflow) === workflow.ladder.length - 1`
- **Issue:** Two defects in one line.
  1. `workflow.ladder` is the **base** ladder from `buildWorkflow` (`:381`). The ladder actually in
     play is `ladderFor(workflow, issueType)` (`:523`), which a `byIssueType` overlay may replace
     wholesale with a ladder of different length. On such a board `terminal` is computed against a
     length that does not apply — the exact class of confident-wrong-answer this phase exists to
     eliminate.
  2. `rankOf(status, workflow, opts)` (`:567`) resolves through `ladderFor(workflow, opts.issueType)`.
     Called without `opts`, it ranks against the base ladder while the walk runs against the
     overlay. The two sides of the `===` can be measured against different ladders.

  `ladderFor` is not exported, so the comparison cannot be written correctly at the jira-sync call
  site with today's API.
- **Recommendation:** Per Q4 — have `resolveMoment` return `isLastRung`, computed inside
  `tracker-workflow.js` against `ctx().ladder`, the ladder it has already resolved. Overlay-correct
  by construction, no new exports, and no second place that can disagree.

#### C5 — The fixture evidence is wrong; hop 2 is unproven

- **Location:** §6 Phase 5 L256-257; §8 Integration Tests L316; §References L515-516
- **Issue:** The task asserts *"both hops already exist in the captured RAPP payloads (ids 21 and
  151), so this is assertable against real data."* Verified against the fixtures:

  | Transition | Lives in | Direction | Serves |
  | --- | --- | --- | --- |
  | `id=21 "Ready for Showcase"` | `rapp-story-in-progress.json` | In Progress → READY FOR SHOWCASE | hop 1 ✓ |
  | `id=151 "Ready for Showcase"` | `rapp-story-waiting-for-review.json` | Waiting for Review → READY FOR SHOWCASE | **neither** ✗ |

  `id=151` is a transition **from** Waiting for Review — the wrong source column, and pointing the
  wrong way along the intended walk. Hop 2 needs the transitions available **from** READY FOR
  SHOWCASE, and no `rapp-story-ready-for-showcase.json` exists. Whether that column offers any route
  to Waiting for Review is currently unknown.
- **Consistency note:** the plan already knows this (L200-204: *"One new fixture is needed
  (`rapp-story-ready-for-showcase.json`) for the transitions available from the showcase column"*).
  The task body contradicts its own plan, and §7 has no "Files to Add" section listing the capture.
- **Recommendation:** Per Q1 — correct the claim to name hop 1 only as pre-captured, add the fixture
  to a new §7 "Files to Add", make the capture an explicit Phase 5 prerequisite with its board
  precondition stated, and gate §9 on it.

### Important

#### I1 — All `jira-sync.js` line references are stale by ~130 lines

`jira-sync.js` grew when task.37 landed. Every citation into it is now wrong; every citation into
`jira-stage.js` is still correct.

| Cited as | Actual | Where cited |
| --- | --- | --- |
| `resolveStage` — `:1855` | **`:1987`** | task §3 |
| `resolveStage` ends `L1896` | **`:2028`** | plan Phase 1 |
| `resolveTransition` — `:2062`, range `2062-2095` | **`:2194`**, range `2194-2252` | task §3, §References; plan |
| `transitionToStatus` — `:2174` | **`:2306`** | task §3, §References; plan |
| monotonicity guard — `:2241`, range `2241-2256` | **`:2373`**, range `2373-2390` | task §3, §References; plan |
| `TERMINAL_LOCAL_STATUSES` — `L1452` | **`:1478`** | plan Phase 1 |
| resolver comment — `L2085-2092` | **`~:2185-2192`** | plan Phase 1 |

Correct: `jira-stage.js:249` (`localStatus`), `:87-110` (`describeAlternatives`), `:196-239`
(`--dry-run`), `:19-27` (exit codes) — all verified accurate.

#### I2 — `terminal` is undefined on the ladder path

Phase 1 computes `spec.terminal && isLastRung`, but when the target comes from `resolveMoment` there
is no `spec` and the moment result carries no terminal field. Phase 3's snippet writes it as a
literal unfilled ellipsis (`terminal: …`, plan L145). The answer is available —
`DEFAULT_STAGE_MAP` (`jira-sync.js:1409-1414`) sets `terminal: true` on `done` and nothing else — but
the task must state it rather than leave a developer to infer it: **base terminality is
`moment === "done"`**.

#### I3 — `transitionToStatus` has no `transitions` parameter, and the walk both fetches and passes one

The signature (`:2306-2323`) accepts no `transitions`; it calls `getTransitions` internally at
`:2388`. `walkLadder` as drafted calls `getTransitions` itself (plan L94) **and** passes the result
through (L104), where it is silently dropped — producing two GETs per hop, i.e. `1 + 3n`, against
the `1 + 2n` §8 Performance asserts. The plan notes the missing parameter (L128-130); Phase 2's
change list does not include adding it. It must.

#### I4 — The cycle guard reports a successful walk

§3 and §6 Phase 2 both require that a blocked hop "stop, report landed + remaining". The plan's
cycle guard is `if (visited.has(norm(rung))) break;` (L90), which falls out of the loop into
`return { transitioned: current !== from, reason: "walked", ... }` (L122) — no `remaining`, reason
`"walked"`. A cycle abort becomes indistinguishable from a completed walk, which is exactly the
three-states-three-messages rule §Notes L528 sets down. It must `return` the `walk-incomplete`
shape.

#### I5 — Benefit 4 has no phase implementing it *(resolved by Q2 → add to Phase 2)*

§2 Problem 4 and Benefit 4 claim bespoke columns become guarded once the ladder gives them a rank.
The guard (`:2373-2386`) derives `currentRank` from `resolveStatusRank(current, workflowRecord)`
(`:2035`), which consults the JSON record's `statusRank` then `DEFAULT_STATUS_RANK` — and that
constant's own comment (`:1421-1423`) names the exact column in question:

> "A status the board uses but no stage names (e.g. **"READY FOR SHOWCASE"**) is unranked, and the
> guard lets it through rather than blocking on a status it has no opinion about."

Nothing in Phases 1-5 makes the guard consult the ladder, so the benefit as written does not ship.

#### I6 — `--print-plan` cannot return more than one hop *(resolved by Q3 → add `--from`)*

Phase 4 branches on "if `--print-plan` returns more than one hop", but `planMove` requires a `from`,
`--print-plan` is defined as credential-free and network-free so it cannot read the card's status,
and `parseArgs` (`jira-stage.js:34-43`) has no `--from`. The plan's snippet passes `args.from || ""`
→ `rankIn(ladder, "")` is null → `planMove` returns `[]` → hops is always `[target]`. Phase 4's rule
is unreachable as specified, and the §8 parity test would lock the single-hop shape in.

#### I7 — No re-bundle step

Every shared resource this task touches has bundled copies that go stale on edit:

| Source | Bundled copies |
| --- | --- |
| `shared/resources/jira-sync.js` | 11 skills |
| `shared/resources/jira-stage.js` | 6 skills |
| `shared/resources/jira-transition-protocol.md` | 6 skills |
| `shared/resources/tracker-workflow.js` | **0** — new transitive dep once `jira-stage.js` requires it |

`bundle_skill.py`'s `JS_SIBLING_RE` follows `require("./x.js")` inside bundled shared JS, so
`tracker-workflow.js` will be picked up automatically — **but only if `npm run bundle` is run**.
Neither §7 nor §9 mentions it. AGENTS.md makes it mandatory before commit, and this repo has a
recorded instance of exactly this drift silently reverting a fix.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Phase structure, risk levels, dependency chain and per-phase file lists are all present and
specific — this is above the bar. The gaps are the ones already itemised: Phase 1 rests on C4 and
I2, Phase 2 on C1/C2/C3, I3 and I4, Phase 3 on I6, Phase 5 on C5.

Two additional scope omissions:

- **`shared/resources/tracker-workflow.js` is in scope but named nowhere** — not in any phase, not
  in §7, and §4 Out of Scope does not exclude it. Per Q4 it now needs `resolveMoment` to return
  `isLastRung`, plus extensions to task.37's `resolveMoment` unit and snapshot tests.
- **§7 has no "Files to Add" subsection.** Both the new fixture (Q1) and any new test file need one.

**Effort estimate**: `estimated_effort_hours: 16`. Rubric against the current document — 5 phases,
13 success criteria, one High-risk phase — lands at 14-18h, so 16 is well-calibrated *as written*.
The Q2 and Q4 decisions add a guard change plus a `tracker-workflow.js` change with its own test
updates, and Q1 adds a live-board capture. Re-estimating at **20-24h** would be honest. Non-blocking.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

- **Task contradicts its own plan on the fixtures** (C5). The task says the data is already there;
  the plan says a capture is needed. A developer reading only §6 would skip the capture and find out
  in Phase 5.
- **§8 Performance baseline is unreachable as drafted** (I3): `1 + 2n` is asserted, `1 + 3n` is what
  the code produces without the `transitions` parameter.
- **§3's three-outcome contract is not honoured by the plan's cycle path** (I4).
- Internal consistency is otherwise good: §7 Files Summary matches the per-phase file lists; §9
  Success Criteria map cleanly onto §2 Benefits; the rollback plan covers every phase and correctly
  identifies Phase 1 as independently revertible.

**Testing completeness**: unit / integration / contract / performance / consumer layers all present
and specific. The exit-code contract tests are a genuine strength — `walk-incomplete` at exit 0 (1
under `--strict`) matches `jira-stage.js:290`'s actual behaviour ✓, and "an unhandled throw still
exits 0" matches `:296-300` ✓.

**Scope and complexity**: 5 phases, one High-risk, a clean linear dependency chain, ~2 source files
plus tests. Appropriately sized for one task. **No split recommended.**

---

## 5. Mermaid Diagram Validation

**Status:** PASS WITH NOTES — no diagrams present, none required.

§3's ASCII call-tree conveys the current-vs-target shape adequately and the walk itself is a linear
loop. The one place a diagram would earn its keep is the three-outcome result contract
(`walked` / `already` / `walk-incomplete`), which §3 "Important Clarifications" and §Notes currently
carry in prose across two separated sections. A small `flowchart` in §3 would consolidate it.
Optional — the prose is not wrong, only distributed.

---

## 6. Risk & Rollback Assessment

**Status:** ADEQUATE

Genuinely strong, and better than most in this repo. Risk 1 ("a walk moves a card somewhere nobody
intended") correctly identifies that walking multiplies the blast radius of a wrong ladder and that
transitions are not reliably reversible; the mitigation chain (only declared rungs, only forwards,
entry monotonicity, no revisiting, one hop per rung, `--dry-run`/`--print-plan` first) is
proportionate. Risk 2 correctly classifies a parked card as *intended* behaviour rather than a
failure. The partial-rollback boundary (revert Phases 2-3, keep Phase 1) is accurate — Phase 1 is
genuinely independent.

One addition needed from Q2: promoting the guard-ranking change into Phase 2 makes that phase edit
`transitionToStatus`'s monotonicity guard, which **every other caller shares** — document sync,
epic sync, story sync. That is a wider blast radius than "walking" implies and warrants its own
Medium risk entry with the regression signal named (existing guard tests passing unchanged).

---

## Summary of Recommendations

### Must Fix (Critical) — 5

1. **C1** — `moment.target` → `moment.targets` everywhere (5 sites). Pass the array to
   `resolveTransition`'s `candidates`.
2. **C2** — Delete every `namesFor()` call; use `moment.targets` and `planMove(...).names`.
3. **C3** — Make `hops` a uniform array of name-arrays; replace `norm` with
   `stripStatusEmoji(...).toLowerCase()`; `current = res.to || rung[0]`.
4. **C4** — Add `isLastRung` to `resolveMoment`'s return, computed against the resolved ladder.
   Bring `tracker-workflow.js` into §7 and the phase list. *(Per Q4)*
5. **C5** — Correct the fixture claim; add `rapp-story-ready-for-showcase.json` to a new §7 "Files
   to Add" and make the capture a Phase 5 prerequisite. *(Per Q1)*

### Should Fix (Important) — 7

1. **I1** — Correct all seven stale `jira-sync.js` line references.
2. **I2** — State that base terminality is `moment === "done"`; fill the `terminal: …` ellipsis.
3. **I3** — Add "optional `transitions` param on `transitionToStatus`" to Phase 2's change list.
4. **I4** — Cycle guard must `return` the `walk-incomplete` shape, not `break` into success.
5. **I5** — Add ladder-aware rank resolution to Phase 2, with its own risk entry. *(Per Q2)*
6. **I6** — Add `--from <status>` to Phase 3, plus `USAGE` and header-block updates. *(Per Q3)*
7. **I7** — Add `npm run bundle` to §7 and a §9 Migration criterion.

### Consider (Optional) — 4

1. Re-estimate `estimated_effort_hours` to 20-24 given the Q1/Q2/Q4 scope additions.
2. Add a `flowchart` to §3 for the three-outcome result contract.
3. Add a §9 criterion asserting `resolveMoment`'s existing task.37 tests pass unchanged.
4. Note in §6 Phase 5 that the fixture capture needs an issue parked in READY FOR SHOWCASE — an
   external precondition that can block the phase.

---

## Implementation Readiness Assessment

**Score:** 7/10

| Dimension | Score | Note |
| --- | --- | --- |
| Template Compliance | 10/10 | Clean; fully OKF-conformant; tracker linkage verified |
| Technical Accuracy | 4/10 | 2 invented APIs, 1 wrong return shape, 1 wrong ladder, 7 stale refs, 1 false evidence claim |
| Implementation Clarity | 7/10 | Phases specific and well-sequenced; two scope omissions |
| Consistency | 5/10 | Task contradicts its own plan on fixtures; a benefit ships in no phase |
| Risk Management | 9/10 | Strong, proportionate, correct rollback boundary |

**Confidence Level for Successful Implementation:** Medium — high once the corrections land.

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** The design is sound and the risk work is above standard, but a developer
following §6 and the plan verbatim would call two functions that do not exist, read a field that is
not returned, compute terminality against the wrong ladder, and reach Phase 5 expecting a fixture
that was never captured. All five are localised corrections, not rework.

---

## Next Steps

Address before implementation:

1. Apply C1-C5 (the API corrections and the fixture claim).
2. Apply I1-I7, of which I5/I6 and the C4 `tracker-workflow.js` entry expand scope per the Q2/Q3/Q4
   decisions.
3. Capture `rapp-story-ready-for-showcase.json` from the real board — this is the only item with an
   external dependency and should be started early, since Phase 5 blocks on it.
4. Re-run `/review-task` once revised, then `/develop-task`.

---

## Review Metadata

- **Reviewer:** Claude (review-task, standard depth)
- **Review Date:** 2026-08-05
- **Task File:** `docs/tasks/task.38.jira-ladder-walking/task.38.jira-ladder-walking.md`
- **Plan File:** `docs/tasks/task.38.jira-ladder-walking/task.38.plan.jira-ladder-walking.md`
- **Sources Consulted:** `shared/resources/tracker-workflow.js`, `shared/resources/jira-sync.js`,
  `shared/resources/jira-stage.js`, `shared/resources/tests/fixtures/rapp-story-*.json`,
  `skills/create-skill/scripts/bundle_skill.py`, `docs/reference/tracker-workflow.md`, `AGENTS.md`
- **Verification method:** direct source reading — every line reference, export list, return shape
  and fixture payload in this report was checked against the file, not inferred
