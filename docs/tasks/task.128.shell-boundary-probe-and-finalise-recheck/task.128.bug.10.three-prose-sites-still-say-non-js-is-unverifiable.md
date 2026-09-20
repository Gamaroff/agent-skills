# Bug Report: Task 128 - three prose sites still instruct "non-JS entry points are unverifiable in v1"

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md) · **Bug ID**: TASK-128-BUG-10 · **Severity**: MEDIUM · **Priority**: P2 · **Status**: ✅ Closed · **Found By**: QA (cycle-3 review CR-4, verified by grep) · **Date Found**: 2026-09-20

## Description
Phase 2 rewrote the rule at four sites, but `shared/resources/security-review-prompt.md:97` ("A real, importable ES module export. Non-JS entry points are a stated v1 limit — report unverifiable"), `:235` and `skills/review-security/SKILL.md:155` ("Non-JS entry points are `unverifiable` in v1") still say the opposite. A `review-security` reader of a bash boundary is told to record the task.121 zero. The contract test cannot see these: it keys on sites that name the JS form, and these name neither form.

## Recommendation
Route the three sites to `shell:`; extend the contract test with a zero-match grep for the old phrasing across every SKILL.md and shared prompt (non-vacuity: the grep must find the new phrasing somewhere).

## Developer Fix Cycle — Iteration 1
**Fix**: `security-review-prompt.md` §3 entry requirements and §5 item 3, and `skills/review-security/SKILL.md` item 3 now route a non-JS entry to `--entry 'shell:<path>'`, naming what remains declined (stdin, two positionals, network). Contract test gained a zero-match grep for the old phrasing over every `SKILL.md` and shared prompt, with a floor of ≥3 sites carrying the routing.
**Mutation proof**: old sentence restored at one site → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | three sites rerouted + population grep |
| 2026-09-20 | Closed | QA Engineer | Verified fixed at cycle 4 (execution) |
