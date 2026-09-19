# Sprint Review Summary - The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Story/Task ID:** task.123
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-19
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#435](https://github.com/Gamaroff/agent-skills/pull/435)

---

## Summary

The develop pipelines' QA loop gained two new exits — a Cosmetic-residue exit for a PASS gate whose only open findings are LOW, and a Gate-the-last-fix half-cycle for a converging medium-only loop at the budget — plus a `qa_phase` lock field so the loop's sub-steps no longer fight the monotonic lock helper, and a re-entry contract (`grant-qa-cycles.sh`) so an operator can grant more cycles after a loop-limit halt without the pipeline losing count of gates run outside it. The run that delivered it exited through its own new route 2b on its last budgeted cycle.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A `PASS` gate with LOW-only residue after two HIGH-0 cycles hands to 5c without a `/qa-fix` cycle (route 2b)
- [x] A HIGH-0, MEDIUM-falling loop at the budget gets one gated half-cycle; a clean gate hands to 5c (route 2c)
- [x] `current_step` stays `5` throughout the loop; `qa_phase` (`5a|5b|5c`) names the sub-step; no hand-rolled `jq` on `current_step`
- [x] Re-invocation after a loop-limit halt offers a grant, reconstructs the cycle count from gates on disk, back-fills report entries for cycles run outside the loop
- [x] Route 2c costs at most half a cycle (no 5b, no suite re-run beyond the gate's own)
- [x] Every new route has a replay fixture on both pipeline sides and a recorded mutation proof
- [x] The accepting-route set is stated once (§5c) and every restater is population-checked
- [x] Observations #72, #77, #95, #100, #112 closed `actioned` naming PR #435

### Key Features Implemented

- **`classifyLoopRoute` / `describeLoopRoute`** (`shared/resources/qa-diminishing-returns.js`): one classifier returns `diminishing-returns | cosmetic-residue | gate-the-last-fix | continue` with a reason and the carried ids; `countRaised` and id-carrying `readTopIssues` feed it
- **`set-qa-phase.sh`**: the only writer of `qa_phase`; never touches `current_step`; mktemp+mv
- **`grant-qa-cycles.sh`**: base = max(highest gate on disk, report entries); never lowers an existing budget; restores the lock from the halt snapshot with a canonical-path ownership check; atomic write of `extra_cycles_granted` / `qa_max_cycles` / `qa_phase: 5a`
- **`qa_phase`-aware Stop hook**: per-sub-step completion sentences for 5a/5b/5c
- **Step 5–6 loop doc**: five accepting routes in §5c, route 2b On-exit (LOWs carried by id to `recommendations.future`), route 2c half-cycle, Action-only loop-limit write; resume contract re-entry section; Phase 0b grant prompt in both SKILL.md files

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-diminishing-returns.js` — route classifier and helpers
- `shared/resources/set-qa-phase.sh`, `shared/resources/grant-qa-cycles.sh` — new lock writers (+ `.test.sh` suites, 19 and 41 tests, listed in `package.json` `test`)
- `shared/resources/develop-pipeline-on-stop.sh` — `case 5)` reads `qa_phase` (+ test, 27)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-resume-contract.md`, `develop-pipeline-hooks.md`, `develop-pipeline-pause.md`, `pipeline-lock-cooperation.md`, `pipeline-resume-detector-prompt.md`, `pr-conformance-prompt.md`, `qa-findings-ingester-prompt.md` — contract and step docs
- `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/review-pr/SKILL.md` — lock-position note, grant prompt, five routes
- `shared/resources/tests/qa-loop-route.test.mjs` (30) + six gate fixtures; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (5); `evals/shared/tests/pr-review-loop-parity.test.mjs` (extended to 31)
- Replay fixtures `10-qa-pass-low-only-cosmetic-residue-routes-to-5c`, `11-qa-budget-spent-gate-the-last-fix-half-cycle`, `12-qa-reentry-after-loop-limit-with-grant` on both `evals/develop-task/` and `evals/develop-story/`
- `docs/runbooks/{qa-flow,story-development,task-development}.md`, `CHANGELOG.md`, `package.json`; bundled `references/` copies regenerated (52 files)

### Architecture/Design Decisions

- **Option B lock position**: `current_step` stays `5` for the whole loop; the sub-step lives in `qa_phase`. `advance-pipeline-lock.sh` stays monotonic — the loop never needed it to go backwards, it needed a second field.
- **Route 2b is PASS-only**; a CONCERNS with LOW-only residue still goes to 5b, because a CONCERNS token is a reservation 5c must see raised. Route 2 (diminishing returns) handles CONCERNS residue that is pure test machinery.
- **Grant base is `max(gate, report)`** and never lowers, so a cycle the operator ran by hand and a cycle the report knows about both count; the guard runs before any restore so a refusal writes nothing.
- **Action-only loop-limit write**: escalation overwrites the cycle's `**Action**` row and nothing else, so a real `REQUEST CHANGES` on the `**PR Review**` row survives.

### Dependencies

- **New Dependencies Added:** none (`package.json` changed only its `test` script)
- **Breaking Changes:** none — absent `qa_phase` / `qa_max_cycles` fall back to today's behaviour (5a, 5)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 30 (`qa-loop-route.test.mjs`) + 19 + 41 + 27 (bash suites) + 5 + 31 (parity) — all in per-PR lanes (`npm test`, `eval:all`)
- **Integration Tests:** replay fixtures 10/11/12 × 2 pipeline sides under `eval:all`
- **Test Coverage:** every new route, both directions; 17+ mutation proofs recorded across five QA cycles
- **Dogfooding:** this run used `set-qa-phase.sh`, the `qa_phase`-aware Stop hook and `classifyLoopRoute` on every cycle, and exited via route 2b on cycle 5 — and survived a PreCompact pause mid-cycle

### Code Review

- **Reviewers:** QA (five cycles, `code_review_blocking=true`, one refute pass); Step 5c `/review-pr` (code + conformance lenses)
- **Approval Status:** ⚠️ CONCERNS (advisory — CR-1 medium recorded as follow-up; no formal GitHub review decision on this single-maintainer repository)
- **Review Comments Addressed:** 14 bugs Closed across cycles 1–4; four LOWs carried by route 2b; PR-review CR-1..4 and PC-1 recorded under Deferred Work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets introduced
- [x] No eval/exec/child_process; argv reaches jq only via `--arg`/`--argjson` after shell-side validation
- [x] Atomic writes (mktemp+mv) with rollback in both lock writers
- [x] No new dependencies; no security TODO/FIXME
- [x] `boundary: false` recorded explicitly — the classifier and the grant script are predicates but decide none of the probe engine's sinks

### Compliance Review

⚠️ **NOT_APPLICABLE** — internal pipeline refactor; no personal data, payments, UI or PHI in scope.

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` — `(task 123)` entry under `[Unreleased]`
- [x] Step 5–6 loop doc, resume contract, hooks / pause / lock-cooperation / detector docs
- [x] `develop-task`, `develop-story`, `review-pr` SKILL.md
- [x] Runbooks `qa-flow` (table + mermaid), `story-development`, `task-development`
- [x] Bundled `references/` copies regenerated; catalog unchanged (no `description:` edits)

### Documentation Links

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5c, "Cosmetic-residue exit", "Gate-the-last-fix half-cycle"
- `shared/resources/develop-pipeline-resume-contract.md` "Re-entry after a QA loop escalation"
- `docs/runbooks/qa-flow.md`

---

## Demo Notes

### How to Verify

1. `command node --test shared/resources/tests/qa-loop-route.test.mjs` — 30 passing; the fixture table names each route and its negative case
2. `bash shared/resources/grant-qa-cycles.test.sh` — 41 passing (never-lower, refusal leaves no lock, canonical-path ownership, octal `k` refused)
3. `npm run eval:all` — replay fixtures 10/11/12 on both pipeline sides
4. Read this task's own implementation report: cycle 5's `**Loop exit**` row carries `describeLoopRoute` verbatim (`Cosmetic-residue exit taken — …`) and its `**Action**` reads `Proceeding to 5c` with no 5b run

### Screenshots/Visuals

`docs/runbooks/qa-flow.md` mermaid diagram (routes 2b / 2c edges).

---

## Impact & Value

### User Impact

Pipeline runs stop burning full fix cycles on nits (task.110 cycles 12–13), stop escalating ungated fixes on converging loops (task.117), and can be re-entered cleanly after a loop-limit halt with the operator's own cycles counted.

### Technical Impact

The loop's lock position is now a documented invariant with a single writer; the accepting-route set is enumerated once with a population check; two new exits are pure-function decisions with fixture tables rather than prose judgement.

---

## Known Limitations & Future Work

### Current Limitations

- **PR-review CR-1**: after the route-2c half-cycle (cycle `N+1`), a 5c `REQUEST CHANGES` re-enters 5b and every loop-limit trigger tests *equality* with `QA_MAX_CYCLES`, so that path is unbounded until a gate clears or the Convergence check trips. Fix: `>=` on every trigger, an explicit escalation arm, a route-2c eval branch.
- Gate 5 LOWs C5-CR-1..4 on `grant-qa-cycles.sh` (refusal-message clause on the snapshot path; ownership check after `read_budget`; `./` doc-dir under bash 5; `CDPATH` in `canon()`) and cleanups C5-CR-5..7; PR-review CR-2..4, PC-1.
- No resume path other than the grant restores the lock after a PreCompact pause (pre-existing gap, recorded in the pause doc; this run restored it by hand and said so).
- The banner catalogue's `cycle {CYCLE}/5` literal is unchanged; Loop Setup states the `5` reads `QA_MAX_CYCLES` on a granted re-entry.

### Suggested Follow-Up Stories

- Close CR-1 (loop budget on the 2c → 5c → REQUEST CHANGES path) with a route-2c eval branch
- Apply the seven gate-5 `recommendations.future` items to `grant-qa-cycles.sh`
- A resume path that restores the lock from the PreCompact snapshot

---

## Metrics _(if applicable)_

- **Estimated Effort:** 8 h
- **Time to Complete:** 2026-09-18 → 2026-09-19 (one pipeline run, one PreCompact pause)
- **Lines of Code Changed:** +12,961 / −523 (210 files incl. 52 bundled copies)
- **QA Cycles:** 5 (FAIL 50 → FAIL 50 → CONCERNS 80 → CONCERNS 60 → PASS 100); HIGH 1, 1, 0, 0, 0

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
