# Sprint Review Summary — Task 79

**Task:** [Write down the inputs that defeat each sink, once](./task.79.security-input-corpus.md)
**PR:** [#332](https://github.com/Gamaroff/agent-skills/pull/332)
**Status:** ✅ Accepted — 2026-09-07

---

## Summary

Every security check in this repository used to generate its own candidate inputs from scratch, in
prose, at the moment it ran. Two runs of the same probe against the same boundary could test
different inputs and reach different verdicts, and nothing recorded which inputs were tried —
`probes_executed: 12` does not say *which* twelve.

This ships the corpus those candidates should come from: **73 cases across five sinks**, stated once,
in a readable document and a machine-readable module. The DoD security prompt now references it and
deliberately does not restate it.

## Success Criteria Met

All 8, each verified by execution rather than inspection:

- Five sinks (`url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`), each with
  **hostile and legitimate** cases
- Every case states **why** it is dangerous and **what a correct implementation does to it** — the
  field that lets an engine compute a verdict instead of asking an agent to judge one
- Importable and deeply frozen; a typo'd sink **throws** rather than yielding a zero-case probe
- The DoD prompt references the corpus rather than restating its inputs
- `finalise`'s returned `security_review` YAML shape unchanged
- `npm run ci` green, with the new suites confirmed to have **run**, not merely be registered
- Inputs only — nothing executes on import
- Every hostile case names the sink it targets

## Key Features

- **`shared/resources/security-input-corpus.md`** — what a sink is; the method ordering, strongest
  first (execute against a hostile input > read the dependency's source > mutate > grep, because
  grep establishes presence and presence is the thing that misleads); generated per-sink case tables.
- **`shared/resources/security-input-corpus.mjs`** — `SINKS`, `corpusFor(sink)`, `allCases()`, plus
  the renderer the document is generated from, so the two cannot drift.
- **`shared/resources/tests/security-input-corpus.test.mjs`** — 19 tests: frozen shape, both
  directions per sink, per-sink floors, unknown-sink-throws, call-shape purity, doc parity.
- **27 measured `shell-exec` cases** — 14 from `task.67.bug.3`, 13 from `bug.6`, and bug.6's **2
  over-refusals** seeding the accept direction with real data rather than invented examples.

## Testing & QA

| | |
|---|---|
| QA cycles | 3 — FAIL → CONCERNS → PASS |
| Findings closed | 21 |
| Mutation proofs | 9, all held |
| Final gate | PASS, 100/100, `top_issues: []` |
| PR conformance review | APPROVE |
| Tests | 2537 pass / 0 fail; `eval:all` exit 0 |
| CI | 5/5 green on the final head `8ed8737c` |
| Security probes | 28 executed, 0 reproduced |

## The interesting part

The corpus was sound from cycle 1. What took three QA cycles was the **guard** meant to protect it.

Phase 4's stated mitigation for the task's own top risk was *"the non-restatement guard is a test"*.
That test was written, was green — and, run against the exact document it was named for, reported
**zero findings**. Real restatement is fragmentary: the deleted axis table quoted `cu'r'l`, `g\h` and
`--output`, each a *piece* of a corpus input, and the guard required whole-input containment.

Rebuilding it on fragments was not enough either. The second version still missed the Flag-forms row,
because `--output` is not a whole token of any input (the token is `--output=/tmp/x`) and `-o` fell
under the length floor — and the fixture did not notice, because its *other* rows carried code spans
a different scan caught. A fixture passing for the wrong reason.

Both were found by **executing** the guard against a real restatement rather than reading it. The
guard now fails on three distinct restatement shapes, each with its own must-fail fixture.

## Impact

- The DoD security probe stops re-inventing its candidate set every run.
- `task.80` (the probe engine) and `task.81` (`/review-security`) have the substrate they need.
- Knowledge from two measured defects is retained somewhere every probe can reach, instead of living
  in one classifier's replay test.

## Known Limitations

1. Three claims (`mustache-interpolation`, `homoglyph-quote`, `attribute-breakout`) are **cited
   rather than executed** — no template engine or Windows codepage was available. They are qualified
   in the corpus text; execute them before `task.80` treats them as an oracle.
2. `path.symlink-escape` needs filesystem setup to discriminate; the required fixture is stated in
   the case but the corpus has no `fixture` field yet. `task.80` will want one.
3. `BUNDLED_REFS` lacks an `isFile()` guard — benign today (0 subdirectories).

## Follow-ups

- `task.80` — the engine that executes the corpus
- `task.81` — `/review-security`
- `task.82` — the QA gate evidence field
- A bug report for the `review-pr` `sed` delimiter defect found during this run
