# PR Review Report: PR #430 — fix(tracker-comment): cycle-scope the QA tracker comments so every QA cycle reaches the issue (task.121)

**Reviewed:** 2026-09-18
**PR:** [#430](https://github.com/Gamaroff/agent-skills/pull/430) — `feature/task.121.cycle-scoped-qa-tracker-comments` → `develop` (OPEN, not draft, CI 5/5 green at a8485b45; head ae6a9d79 is a docs-only commit on top)
**Work item:** [`task.121.cycle-scoped-qa-tracker-comments.md`](./task.121.cycle-scoped-qa-tracker-comments.md) — resolved via `branch-stem`
**Tracker:** [#421](https://github.com/Gamaroff/agent-skills/issues/421) — OPEN (expected before `/finalise`)
**Verdict:** ⚠️ CONCERNS

Scope note: the diff reviewed is `origin/develop...HEAD` with `*/references/*` excluded (60 auto-generated bundled copies, byte-identical to their `shared/resources/` sources and not named individually in the Files Summary); 35 source/doc files, +3539/−252. Effort `medium`, both lenses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.121.implementation.1.cycle-scoped-qa-tracker-comments-initial-run.md |
| Review report | ✅ | task.121.review.1.cycle-scoped-qa-tracker-comments.md (8/10, fixes applied) |
| QA reports | 5 | task.121.qa.1 … qa.5 |
| Gate | PASS | task.121.gate.5.cycle-scoped-qa-tracker-comments.yml (100) — empty queue; cycle-5 entry reads `Proceeding to 5c` |
| DoD | ❌ (expected) | status is `ready-for-review`; `/finalise` writes it at Step 7 |
| Sprint review | ❌ (expected) | same |
| Open bugs | 0 | bug.1 … bug.6 all `Closed` |
| Handover | ❌ | no `*.handover.*` — no deferred tracker actions (`access.tracker: full`) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| §9 Functional — every QA cycle's gate and fix comment reaches the tracker with a distinct marker | `tracker-comment.js` `CYCLE_SCOPED_STAGES` += `qa-gate`; six call sites `--stage "qa-gate-${QA_CYCLE}"` / `"qa-fix-${FIX_CYCLE}"`; `tracker-comment.test.mjs` "qa-gate-N is keyed per cycle"; live on #421: `qa-gate-1..5`, `qa-fix-1..4` | ✅ met |
| §9 Functional — a resumed cycle still returns `already` for its own suffixed stage | same test, `qa-gate-2` twice → `already` | ✅ met |
| §9 Functional — orchestrator `qa-cycle-{N}` / `qa-fix-{N}` blocks removed; develop-bug's `qa-cycle-{N}` unchanged and passes the guard | `develop-pipeline-step-5-6-qa-loop.md` (blocks replaced by pointers); `develop-bug-step-5-6-verify-loop.md` untouched; collected as a suffixed site (5 suffixed `SITES`) | ✅ met |
| §9 Performance — no change to comment latency | one list member ×2; one `bash` process per block | ✅ met |
| §9 Code Quality — `npm test` green; guard has a non-vacuity floor; mutation proof recorded | `ci:fast` green at a8485b45 (3438 pass); floors ≥4 / ≥4 / ≥6; 17 proofs across the loop in the implementation report | ✅ met |
| §9 Code Quality — `CYCLE_SCOPED_STAGES` remains the single definition | contract table describes it; `comment-slot-coverage.test.mjs` imports it | ✅ met |
| §9 Migration — contract documents the stage classes; observation #75 actioned with the PR number | `tracker-comment-contract.md` § "Once per issue, or once per cycle"; #75 closure belongs to `/finalise` | ⚠️ partial (finalise-owned) |
| §8 Consumer test — next ≥2-cycle run carries `qa-gate-N` / `qa-fix-N` per cycle in order | met on this PR's own issue #421 across five cycles | ✅ met (unticked in the document — PC-2) |

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — task.121 §3 Important Clarifications / §6 Phase 2 / §10 Medium Risk
  The plan sections still describe the original design ("derive it once, above both calls",
  "copy the qa-fix expression verbatim") while what shipped is a shared helper, qa-cycle.sh,
  called in every block; the supersession is recorded only in the Notes "QA fix cycle 2" paragraph.
  → Update §3, the §6 Phase 2 checkbox text and the §10 mitigation to name qa-cycle.sh and the
    derive-in-every-block rule (or add a "superseded — see Notes" pointer at each).

[PC-2] consistency · low · confidence: high — task.121 §8 Consumer Tests / §9 Functional / Progress Tracking
  The consumer criterion, §9's first Functional row and the Progress Tracking QA/Gate rows are
  unticked while the same document's Key Findings say the consumer criterion is met live on #421.
  → Tick them, citing #421 and qa.5/gate.5; leave only the finalise-owned items open.

[PC-3] consistency · low · confidence: high — task.121.cycle-scoped-qa-tracker-comments.md:375
  An orphaned empty `## Change Log` heading precedes `## QA Testing Results`; the real Change Log
  sits under a second heading inside the change-log markers (:398).
  → Delete the orphaned heading so the document carries one Change Log section.

[PC-4] scope · low · confidence: high — task.121 §7 Files Summary
  shared/resources/qa-cycle.sh and tests/qa-cycle.test.js (new), evals/shared/tests/
  transition-protocol-parity.test.mjs, shared/resources/stakeholder-summary.md and qa-story's
  naming/tree sections are in the diff but not in §7; each is justified in a closed bug or the
  implementation report.
  → Add them to §7 with a one-line reason each.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/qa-fix/SKILL.md:939
  develop-bug's verify loop runs /qa-fix on every FAIL cycle (develop-bug-step-5-6-verify-loop.md
  §5b), contradicting the new sentence at develop-pipeline-step-5-6-qa-loop.md:355 that develop-bug
  "never runs a QA skill"; in that mode qa-cycle.sh scans dirname($STORY_FILE) — for a general bug
  (docs/bugs/bug.N/, no gate files) it refuses and the qa-fix tracker comment is skipped every cycle
  (pre-PR the bare qa-fix posted once), and for a story/task bug it reads the parent's highest gate,
  keying every bug-fix cycle to one marker.
  → Correct the sentence ("never runs qa-task / qa-story") now; give the bug path its own cycle
    source (the develop-bug iteration number) as a follow-up task, with a qa-cycle.test.js case
    pinning what qa-fix posts from develop-bug.

[CR-2] cleanup · low · confidence: medium — skills/qa-fix/SKILL.md:923
  The new `[ -s .claude/state/comment-body.md ] || exit 1` guard hard-exits a block the surrounding
  prose calls non-blocking, and `-s` also accepts a stale body left by qa-task/qa-story (F1).
  → Use the ⚠️-and-skip shape the other branches use, and a qa-fix-specific body filename (F1).
```

Already-recorded advisory follow-ups from gate 5 (F1–F4) were excluded from the code lens by instruction and are not repeated here.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md §3 / §6 Phase 2 / §10"
    finding: "Plan sections still describe the original derive-once design while a shared helper called in every block shipped; the supersession is recorded only in Notes."
    suggested_action: "Update §3, §6 Phase 2 and §10 to name qa-cycle.sh and the derive-in-every-block rule, or add superseded pointers at each."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md §8 / §9 / Progress Tracking"
    finding: "Consumer criterion, §9 first Functional row and Progress Tracking QA/Gate rows are unticked although Key Findings states the criterion is met live on #421."
    suggested_action: "Tick them citing #421 and qa.5/gate.5; leave only finalise-owned items open."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md:375"
    finding: "An orphaned empty '## Change Log' heading precedes '## QA Testing Results'; the real table sits under a second heading at :398."
    suggested_action: "Delete the orphaned heading."
  - id: PC-4
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md §7 Files Summary"
    finding: "qa-cycle.sh, tests/qa-cycle.test.js, transition-protocol-parity.test.mjs, stakeholder-summary.md and qa-story's naming/tree sections are in the diff but absent from §7."
    suggested_action: "Add them to §7 with a one-line reason each."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/qa-fix/SKILL.md:939"
    finding: "develop-bug runs /qa-fix on FAIL cycles; the new qa-loop sentence says it never runs a QA skill, and in bug mode qa-cycle.sh either refuses (general bug, no gates — comment skipped every cycle) or reads the parent's gate (story/task bug — one marker for all cycles)."
    suggested_action: "Correct the sentence now; give the bug path its own cycle source in a follow-up task with a pinning test."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/qa-fix/SKILL.md:923"
    finding: "The -s body-file guard hard-exits a block documented as non-blocking and accepts a stale body from another skill."
    suggested_action: "Use the warn-and-skip shape and a qa-fix-specific body filename (F1)."
truncated_count: 0
```

## Recommended Actions

1. Before merge, in one docs commit: correct the develop-bug sentence in `develop-pipeline-step-5-6-qa-loop.md` (CR-1, prose half); fix the task document's PC-1 supersession pointers, PC-2 ticks, PC-3 orphaned heading and PC-4 Files Summary — all documentation, no behaviour change.
2. File a follow-up task for the develop-bug cycle source (CR-1, behaviour half) together with F1/CR-2 (qa-fix-specific body file, warn-and-skip) — a design change in develop-bug's verify loop, out of this task's scope.
3. `/finalise` closes observation #75 with PR #430.
