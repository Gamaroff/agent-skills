# QA Report: Task 81 - Ship `/review-security` (cycle 3)

**Task**: [Link to task document](./task.81.review-security-skill.md)
**Gate File**: [task.81.gate.3.review-security-skill.yml](./task.81.gate.3.review-security-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**Gate Status**: PASS

---

## Executive Summary

Both cycle-2 findings are fixed and were verified by direct measurement rather than from the fix
record. No new findings. Gate **PASS**, quality 100/100 under the deterministic formula (no NFR at
FAIL or CONCERNS).

Two advisory cleanups and two stated limits remain. They are named in `recommendations.future` and
repeated below, because a PASS that quietly carries residue is the reporting failure this whole task
is about.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools. Subagent dispatch barred in this session — recorded at every step, and the axes a
parallel agent would have covered were performed in the main context instead.

**Re-review scope: since gate 2 (default).** `PRIOR_GATES=2` and `SAFETY_REPROBE=false` — gate 2's
security axis was CONCERNS, not FAIL, so the safety carve-out does not fire and the narrowing applies.
Four files changed since gate 2: `engaged.mjs`, `review-security.test.js`, `SKILL.md`,
`skill-catalog.md`. All four were read as a diff.

**Third-strike check**: no HIGH finding has appeared in any gate (gate 1: 0, gate 2: 0, gate 3: 0), so
no file is under a strike and no replace-don't-patch constraint applies.

The reviewer is the author. Stated at every cycle; every finding raised across all three was
mechanically demonstrable rather than a judgement call, which is the only thing that makes this
defensible.

---

## Re-Review Context

| Previous issue | Status | How verified |
| --- | --- | --- |
| **TASK81-001** — nested fences corrupt prompt §4 | **FIXED** (cycle 2) | Block boundaries re-derived; three balanced top-level blocks in source and bundle |
| **TASK81-002** — probe specs imported by nothing | **FIXED** (cycle 2) | Export-rename mutation reds 3 tests; green before the fix |
| **TASK81-003** — loopback guard overclaims | **FIXED** | Direct call, 15 cases. `127.1`, `0177.0.0.1`, `2130706433`, `1.2.3.4.5` now refused; `8.8.8.8`, `172.32.0.1`, `db.internal.example.com`, `10.example.com`, `172.20.example.com` accepted. Mutation-proven twice |
| **TASK81-004** — description over the word guidance | **FIXED** | 149 → **98** words, under the ~100 ceiling in `coding-standards.md` |

All three bug reports are closed.

---

## New Findings This Cycle

**None.** Scope: the four files changed since gate 2, read as a diff.

What was examined and found sound: the fail-closed branch correctly classifies `...`, `8.8.8.8.` and
`1.2.3.4.5` as IP-literal attempts that do not parse and refuses them; the clean-quad path still
accepts public addresses; the new regression test asserts both directions and is mutation-proven in
two independent ways; the description trim did not break the two assertions that read it; and the
catalog was regenerated so the frontmatter-freshness test passes.

---

## Success Criteria Verification

| Criterion | Status |
| --- | --- |
| Inert Redis fixture reports `present-but-inert`, citing the dependency condition | PASS |
| Inert DB-URL fixture reports high | PASS |
| Engaged variants report no findings and state what was probed | PASS |
| Emits a gate-consumable block with `evidence:` and `probes_executed` | PASS |
| `full` mode reviews the surface regardless of what changed | PASS |
| No existing gate, schema or pipeline step changes | PASS |
| `npm run ci` green with the new suite confirmed to have **run** | PASS — confirmed from the gate log by test-count delta, not by reading the glob |
| Cannot emit a bare PASS — no PASS token in the schema | PASS |
| Zero executed probes → `unverifiable` | PASS |
| A verdict resting on reading is `reasoned`, never `measured` | PASS |

---

## NFR Assessment

All four **PASS**. Security is restored from CONCERNS: the guard now fails closed on any
digits-and-dots host that is not a clean four-octet quad, and — the part that matters for this
particular skill — the comment now states its own residual limit rather than implying completeness.

---

## Code Review

Cycle 3, scoped to the four files changed since gate 2.

**Correctness bugs (0).**

**Cleanups (2, both advisory and both carried forward rather than newly found):**
- `fixtures/db-url/engaged.mjs:27` — `encodeURIComponent` applied to compile-time constants.
- `review-security.test.js` — the loopback regression test hardcodes the fixture path a second time.
  Not a recurrence of TASK81-002: a move breaks it loudly with an import error rather than silently,
  which is the property that made TASK81-002 a defect. Deriving the path from the imported spec would
  still leave exactly one.

**mutation-proven**: yes — the loopback guard proven twice this cycle, and every earlier fix re-proven
at the cycle in which it was made.

---

## Residual, stated because PASS should not hide it

1. **`evidence: measured ⇒ probes_executed > 0` is enforced against the prompt's documented example**,
   not against an emitted report — v1 ships no emitter, so there is nothing else to validate. This is
   the strongest available form and the test is real, but it is weaker than the task's risk-mitigation
   wording implies. Wiring is `task.82`.
2. **The loopback guard does not resolve DNS.** A hostname that merely points at 127.0.0.1 still
   passes. Now stated in the fixture's own comment.
3. **Two advisory cleanups**, above.
4. **The suite reads the shared source, not the bundled copy** — deliberate; asserting against the
   bundled copy could mask source-vs-bundle drift.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (task.80) | PASS |
| Full hermetic suite (`npm run ci:fast`) | PASS — 2729 tests, 2728 pass, 0 fail, 1 skipped |
| Registration freshness (catalog, skill-deps, bundle) | PASS |

No regressions across three cycles.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Four findings raised across three cycles, all fixed, all verified independently, all
mutation-proven where a behaviour was involved. No new findings this cycle.
**Quality Score**: 100/100 — no NFR at FAIL or CONCERNS, per the deterministic formula. The residual
above is advisory and is listed rather than folded into the score.

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c — `/review-pr` (the QA loop's exit gate).
