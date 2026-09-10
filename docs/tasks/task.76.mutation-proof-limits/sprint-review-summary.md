# Sprint Review Summary — Task 76

**Task:** State what a mutation proof does not tell you
**Status:** ✅ Accepted · **Date:** 2026-09-02
**PR:** [#304](https://github.com/Gamaroff/agent-skills/pull/304) → `develop`
**QA Gate:** PASS (100/100), 2 cycles

---

## Summary

`shared/resources/mutation-proving.md` answered one question thoroughly — *is this test real?* — and
was silent on the adjacent one: **what does a suite of proven-real tests still fail to cover?** It also
gave an unheld proof a single diagnosis when there are three, two of which are discoveries rather than
defects.

Task 67 is where both gaps cost something measurable. Nine proofs were recorded and four re-run
independently in QA; all four held — while **thirteen fail-open routes sat in the shipped classifier**.
The proofs were honest. They simply could not speak about behaviour no test named.

## Success Criteria Met — 10/10

**Functional**

- A held proof is stated as evidence about a test, not about the input space
- The task-67 number is carried **with its provenance**, not as a bare "nine held"
- An unheld proof has three named causes with distinct responses
- "Investigate before strengthening the test" is stated explicitly
- *When to do it* has a boundary row requiring both directions

**Regression** — the procedure, all five shapes, *Recording it* and *Do not claim it* unchanged; no
`SKILL.md` modified; bundle fresh; Prettier clean; every link resolves in the tracked tree.

**Quality** — both task-67 unheld cases appear as worked examples in the voice of the five shapes;
54 lines added against a ~55-line budget.

## What was delivered

Three sections in one file, plus its three generated copies:

1. **`## What a held proof does not tell you`** — a mutation proof falsifies a check that *exists*;
   behaviour no test names has nothing to revert, so a proof run is silent about it rather than
   reassuring. Ends on the line that does the work: *a held proof is evidence about a test, not about
   coverage.*
2. **`## When the proof does not go red`** — replaces the old single "the test is vacuous" conclusion
   with a three-cause diagnosis table (vacuous test · redundant source · wrong premise), the rule that
   an unheld proof is a finding, and both task-67 cases as worked examples.
3. **A fifth row in `## When to do it`** — a boundary fix must be proved in both directions, because
   an over-strict boundary fails as silently as a permeable one.

**Files:** `shared/resources/mutation-proving.md` (140 → 194 lines) and
`skills/{develop,qa-task,qa-story}/references/mutation-proving.md` (regenerated).

## Testing & QA

- `npm run ci:fast` (format:check + full hermetic suite) — exit 0, zero failures
- CI on the final head: `test`, `validate`, `link-check`, branch check — all green
- 2 QA cycles: CONCERNS (90) → PASS (100). One MEDIUM raised and closed
- **Mutation proving: n/a** — no behaviour to revert. Recorded honestly rather than fabricated, which
  is what the changed document itself requires

## Demo notes

The change is best shown by the failure it prevents. Open the document at *When the proof does not go
red* and read the three-row table: before this change, an unheld proof had one prescribed response —
*strengthen the test* — and on task 67 that response would have been wrong **both** times it fired. It
would have papered over dead code in one case and hard-coded a factually false mechanism in the other.

## Known limitations / follow-ups

Two LOW observations, both pre-existing and deliberately out of scope:

1. The file's own fenced `bash` block cannot be executed by qa-task's runnable-prose step, because
   `cp` is not on the fail-closed safe-command allow-list. The mutation-proving procedure's own worked
   example is the one snippet QA cannot verify.
2. `skills/develop/SKILL.md` still says "the four shapes this takes" against a five-shape document.

Both are recorded in `task.76.gate.2.mutation-proof-limits.yml` → `recommendations.future`.

## Impact

Guidance only — no consumer behaviour changes unless a human acts on it. What it buys is the
prevention of a confident wrong conclusion: "nine proofs held" read as "the boundary is covered."
Reaches `develop`, `qa-task` and `qa-story` by reference, so no skill needed editing.
