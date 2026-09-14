# Sprint Review Summary - The QA loop routes on the queue, gates on the evidence

**Story/Task ID:** task.116
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-14
**Completed By:** develop-task pipeline (operator-assisted after the cycle-5 escalation)
**Pull Request:** [#404](https://github.com/Gamaroff/agent-skills/pull/404)

---

## Summary

The QA loop in `/develop-task` and `/develop-story` now routes on what is actually open in a gate's queue rather than on its verdict token, refuses to write or publish a gate while its own diff review is still running, executes boundary deliverables instead of reading them, runs a platform-variance check, and has vocabulary for a subagent that never ran. Six observations from the 2026-09-12 review are closed by this change.

---

## What Was Delivered

### Success Criteria Met

- [x] SC1 — A `CONCERNS` gate with no open `top_issues[]` entry reaches §5c as **route 3**; 5b is entered only on an open finding (one definition of *open*; five exhaustive arms + a malformed HALT; the cycle entry's `**Action**` row is the mechanical record consumers read)
- [x] SC2 — `qa-task` / `qa-story` cannot write (Step 10 / Output 2) or publish (Step 13 / PR comment) a gate while a dispatched review is outstanding
- [x] SC3 — Step 3b executes candidates when the boundary rule fires and reports `probes_executed`
- [x] SC4 — Platform-variance check (`TMPDIR=/tmp node --test …`) in Step 3b/3c and the shared code-review prompt
- [x] SC5 — Autonomous-defaults §Subagents names unavailable / failed / slow with the substitute and the record required; "output-file size is not a liveness signal" at every dispatch site; `subagents.wallClockMinutes` configurable
- [ ] SC6 — Observations #17, #20, #44, #51, #56, #62 close naming this PR — **post-merge operator step** (the log lives outside the repository)

### Key Features Implemented

- **Route 3 + queue-based routing**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` Outcome branching and §5c; every consumer (resume contract, conformance prompt, ingester prompt, runbooks, review-pr) points at §5c rather than restating the set
- **Post-guard write rule**: the `**Action**` / `**PR Review**` rows are written when the route is known, with a closed three-value set and a named resolution for 5c, 5b and the Convergence-check trip
- **Gate/publish preconditions**: qa-task Step 3b post-condition, Step 10 and Step 13 preconditions; qa-story mirrors
- **Boundary execution + platform variance**: qa-task 3b items 3–4 / qa-story 1.6–1.7; `code-review-prompt.md` PLATFORM VARIANCE category
- **Subagent vocabulary**: `develop-pipeline-autonomous-defaults.md` §Subagents table + wall-clock budget; pointers from five dispatch sites

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — router arms, §5c routes, post-guard write, Convergence-trip resolution
- `shared/resources/develop-pipeline-autonomous-defaults.md` — §Subagents table, `subagents.wallClockMinutes`
- `shared/resources/code-review-prompt.md`, `pr-conformance-prompt.md`, `qa-findings-ingester-prompt.md`, `develop-pipeline-resume-contract.md`, `develop-pipeline-step-3-develop-loop.md` — platform-variance category; §5c pointers; Action-row reads
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md`, `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/review-pr/SKILL.md` — preconditions, boundary/platform items, dispatch-site pointers
- `evals/shared/tests/pr-review-loop-parity.test.mjs` (extended), `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` (new), `evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c/` (new replay fixture)
- `docs/runbooks/qa-flow.md`, `task-development.md`, `story-development.md`, `docs/reference/configuration.md`, `CHANGELOG.md`
- `skills/*/references/` — regenerated bundles

### Architecture/Design Decisions

- The accepting-route set is stated **once** (§5c) and consumers read the mechanical `**Action**` row rather than re-deriving it from the gate token — the paraphrase-forbidding test pins this.
- `CONCERNS` with an empty queue is a reservation, not a fix list; routing it to 5b produced the no-code-change HALT that ended task.105.

### Dependencies

None new.

---

## Testing & Quality Assurance

### Test Coverage

- `npm run ci:fast`: 3270 tests, 3269 pass, 0 fail, 1 skipped on `f5b8d94b`
- `pr-review-loop-parity` 30/30; `qa-gate-preconditions-parity` 8/8 — both in the per-PR lane
- Mutation proofs recorded on every fix cycle (`covered`)

### Code Review

- 6 QA cycles (gates CONCERNS 80 / FAIL 40 / CONCERNS 60 / FAIL 70 / FAIL 50 / **PASS 100**); the loop escalated at cycle 5 (Convergence check) and the operator applied the residue outside the loop and authorised cycle 6
- Step 5c `/review-pr --effort medium`: ⚠️ CONCERNS (advisory) — `task.116.pr-review.1.qa-loop-routes-and-preconditions.md`
- 7 bug reports filed across the loop; all closed

---

## Security & Compliance

### Security Review

✅ PASS — prose / prompt / test / fixture change set; no boundary delivered (`boundary: false`), no secrets, no `eval`/`exec`/`child_process`, no dependency change.

### Compliance Review

NOT_APPLICABLE — no data, payment, UI or health scope.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]` → `### Changed` (5 bullets)
- Runbooks: `qa-flow.md`, `task-development.md`, `story-development.md`
- `docs/reference/configuration.md` — `subagents.wallClockMinutes`

### Documentation Links

- Task: `docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.qa-loop-routes-and-preconditions.md`
- DoD: `task.116.dod.1.qa-loop-routes-and-preconditions.md`
- Implementation report: `task.116.implementation.1.qa-loop-routes-and-preconditions.md`

---

## Demo Notes

### How to Verify

1. `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs evals/shared/tests/qa-gate-preconditions-parity.test.mjs` → 38/38
2. Read `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §Outcome branching → five arms + malformed HALT; §5c → three routes
3. `grep -h -A8 '^### QA Cycle' docs/tasks/task.116.*/*.implementation.*.md | grep '^\*\*Action\*\*' | tail -1` → `**Action**: Proceeding to 5c (PR conformance review)`

---

## Impact & Value

### User Impact

Pipeline runs no longer HALT on a gate that says "fine, with reservations", and a gate can no longer be published before the review that would have contradicted it returns.

### Technical Impact

Six observations closed; one enumeration (the accepting-route set) instead of five drifting copies.

---

## Known Limitations & Future Work

### Current Limitations

- SC6 (observation closure) is performed after merge.
- Advisory residue from gate 6 / 5c: arm-5 sub-case wording in the post-guard rule; exact-vs-prefix `Action` row; route-2 edge missing from the qa-flow mermaid; glob order at ≥10 reports; `subagents|wallClockMinutes` not in `_CONFIG_GUARDED_KEYS`; conformance TRAIL bullet's two-value dichotomy.

### Suggested Follow-Up Stories

- One small follow-up task carrying the six advisory items above.
- Resume detector: the step-3 summary-gap rule fires on every healthy resume (observation #86); Phase 0b has no dirty-tree probe (observation #85).
