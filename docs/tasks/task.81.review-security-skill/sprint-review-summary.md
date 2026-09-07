# Sprint Review Summary — Task 81

**Task:** Ship `/review-security` — prove a control engages, not that it is present
**Status:** ✅ Accepted · **PR:** [#347](https://github.com/Gamaroff/agent-skills/pull/347) · **Accepted:** 2026-09-07

---

## Summary

Ships a review skill that establishes whether a security control **engages** — by executing it
against adversarial input — rather than whether it is *present* in the source.

The gap it closes: a control can be present and inert, and every existing instrument passes it. The
motivating defect is `...(isTls ? { tls: {} } : {})` — a grep for `tls` hits, a citation exists, the
presence checklist returns PASS, a unit test asserts `toBeDefined()` and stays green, and the
connection is plaintext.

## Acceptance Criteria Met

10/10, each re-verified live at acceptance by running the code:

- Both inert fixtures report `present-but-inert`; both engaged report `engages` — verdicts computed
  by the engine, not asserted by an agent
- Zero executed probes render `unverifiable`, never a pass
- No PASS token exists in the schema, so a bare pass is unrepresentable
- `full` mode reviews a work item's security surface regardless of what changed
- No existing gate, schema or pipeline step changed

## Key Features

- **The agent cannot write the verdict.** It produces a probe *spec*; `security-probe.mjs` runs it
  and computes the outcome. An agent that executed nothing has no field to forge.
- **`present-but-inert` is rated high, above `absent`** — an inert control has already been read,
  reviewed and believed, so it carries a control's credibility with none of its protection.
- **Falsifiable in CI.** Four fixtures, two engaged and two inert, modelling both measured defects.
  Each inert variant deliberately carries the literal tokens a grep reviewer accepts, so tidying it
  into an `absent` case fails the suite instead of quietly proving nothing.

## Technical Details

**Files:** `skills/review-security/` (SKILL.md, 4 fixtures, 2 probe specs, 28-test suite),
`shared/resources/security-review-prompt.md`, plus registration across `package.json`,
`generate_catalog.py`, four `docs/reference/` files, `CHANGELOG.md` and `skill-dependencies.json`.

**Tests:** 28 in this skill; 2729 in the full gate, 0 failures. CI 5/5 green.

## Testing & QA

3 QA cycles, 2 fix cycles, 4 findings — all fixed, closed and mutation-proven:

| Finding | Severity | Found by |
| --- | --- | --- |
| Nested fences corrupted the prompt's Output Contract | medium | Step 4b anomaly — the snippet engine reported 0 blocks for a file that visibly had one |
| The six `probe.mjs` specs were imported by nothing | medium | `grep` for importers |
| The loopback guard accepted `127.1`, `0177.0.0.1`, `2130706433` while claiming otherwise | medium | the cycle-2 refute pass |
| Description 149 words vs the ~100 guidance | low | word count |

**Every mutation proof reds only its own assertion** — the `present-but-inert` branch (2 red), the
grep decoys (1), zero-case vacuity (1), the test glob (gate log 2726 → 2701), the spec import (3, two
ways), the loopback guard (1, two ways).

## Demo Notes

The most demonstrable moment is the third finding. The *engaged* fixture — the artifact a reader
consults to see what a correct control looks like — contained a loopback guard that accepted three
standard spellings of 127.0.0.1 while its comment claimed to refuse loopback. A miniature
`present-but-inert` inside the instrument built to name `present-but-inert`. Every corpus case still
passed, so the steady-state suite could not see it; only the refute pass, which asks which claim is
*false*, found it.

## Known Limitations

1. **No independent review.** Author, QA reviewer and DoD verifier were the same agent, and subagent
   dispatch was unavailable, so the pipeline's independent-lens mechanisms never ran. Read the trail
   as thorough self-assurance, which is not the same as review.
2. `evidence: measured ⇒ probes_executed > 0` is enforced against the prompt's documented example,
   not an emitted report — v1 ships no emitter.
3. The loopback guard does not resolve DNS.
4. Non-JS entry points are `unverifiable` — a stated v1 limit.

## Future Work

- `task.82` — wire the skill into `nfr_validation.security` and enforce the evidence invariant
  against emitted reports.
- Three advisory cleanups in `gate.3` `recommendations.future`.
