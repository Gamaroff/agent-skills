# Sprint Review Summary — Task 85

**Task:** Give `/review-pr` a machine-readable findings block
**Status:** ✅ Accepted · **PR:** [#363](https://github.com/Gamaroff/agent-skills/pull/363) · **Date:** 2026-09-09

---

## Summary

On the develop pipelines' Step 5c, a `REQUEST CHANGES` verdict sends the run back to `/qa-fix` — and
because 5c only runs once a QA gate already reads `PASS`, the PR review report is the **only** artifact
carrying that cycle's findings. Until now those findings were recovered by an agent matching a rendered
three-line text shape described in a different file. A parse miss was silent: qa-fix would ingest
nothing, change nothing, and the loop would halt reporting the findings as *unfixable* when they had
never been delivered.

This puts the fields on disk. `/review-pr` now writes a `## Machine-Readable Findings` section — one
`yaml` fence carrying both lenses' findings — and the ingester reads it, falling back to the rendered
text only for reports written before the block existed.

## Success Criteria Met

10 of 10, each with a code or test citation. See the DoD summary for the evidence table.

## Key Changes

- **Emitter** — `skills/review-pr/SKILL.md`: the Step 7 report template gains the block; Step 6 states
  a normalisation the "deliberately parallel" field list had been hiding (`pr_conformance` emits `ref:`,
  `code_review` emits `file_line:`, the block carries `ref` for both).
- **Consumer** — `shared/resources/qa-findings-ingester-prompt.md`: prefers the block, keeps the
  rendered parse as a named fallback, and maps every block field through an explicit 8-row table.
- **Contract** — `evals/shared/tests/pr-review-loop-parity.test.mjs`: 3 new tests. The old assertion
  required a sentence this change makes false, and would have stayed green on it.

## Testing & QA

| | |
|---|---|
| QA cycles | 2 — FAIL 70/100 → PASS **95/100** |
| Step 5c `/review-pr` | ⚠️ CONCERNS (non-blocking); all 3 findings fixed |
| Tests | 2965 passing, 0 failures |
| Mutation proofs | **17**, all shown red, each with a before/after occurrence count |
| CI | ✅ SUCCESS on the final head — sampled `PENDING` first and the run waited |
| Full `npm run ci` | exit 0, including the `eval:all` slow tier |

## Demo Notes

The most direct demonstration is that **this task's own PR review report is the first artifact in the
repo to carry the new block**, and its block exercises both `ref` shapes at once: a `path:line`
normalised from a code finding's `file_line`, and a non-path ref from a conformance finding. The
polymorphism the task is about is visible end to end rather than only asserted.

## Impact

The `REQUEST CHANGES` path stops depending on an LLM matching a text format described elsewhere. The
existing text-shape assertion between the two prose files remains as the fallback's guard, but it is no
longer the only thing standing between a finding and silence.

## Known Limitations

- **TASK85-004 (LOW, open):** `truncated_count` is carried across on the block path and dropped on the
  legacy fallback. Pre-existing; the remedy needs a stable text shape for the rendered omitted-count
  note, which §4 Out of Scope forbids changing here.
- No test executes a real `/review-pr` run end to end. The contract remains prose-to-prose — the
  pre-existing limit of every test in that file, neither widened nor narrowed.
- The task carries **no tracker issue**. Flagged Important at review and deliberately not created: a
  remote issue is never created unprompted, and an autonomous run cannot prompt.

## Follow-up

1. TASK85-004 — resolve the `truncated_count` asymmetry on the fallback path.
2. Consider a success criterion requiring the field mapping to be unambiguous. The current ten could be
   fully satisfied by the contradictory mapping QA cycle 1 found, which is how it reached QA at all.
