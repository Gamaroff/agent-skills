# Sprint Review Summary — Task 89

**Task:** Lint for prose-matching assertions that claim a relationship but test only co-occurrence
**PR:** [#312](https://github.com/Gamaroff/agent-skills/pull/312) · **Accepted:** 2026-09-04
**Gate:** PASS 100/100 · **QA cycles:** 2

---

## Summary

Task 77 hit the same bug six times across eleven independent gates: an assertion claiming a
*relationship* — X routes to Y, X fires at Y, X owns Y — while establishing only that both names
appear in the same slice of prose. Every one passed against the mutation it was written to catch, and
**two of the six were written inside the fix for the previous one**, because widening the regex is the
natural repair and is also the defect. Each was found by a human reviewer, one at a time, over roughly
a dozen cycles.

This makes the class a CI failure instead of a reviewer's lucky catch.

## What shipped

- **A four-rule static analyser** (`tests/lib/relationship-assertion-lint.js`), structural rather than
  textual — it scans with a state machine that understands strings, regex literals and comments, then
  reasons about each assertion's *pattern* and *message* separately. A lint against co-occurrence
  matching implemented as a co-occurrence match would be self-defeating.
- **Every rule requires a conjunction**: the defective shape **and** a message claiming placement or a
  mapping. That is what makes it usable rather than noisy.
- **The historical corpus as fixtures** — all six instances reconstructed with `git show` from the
  commits that closed them, plus two negative controls that survived adversarial attack.
- **A reachability guard** that appends a bait assertion to every corpus file, so the analyser can
  never go blind quietly.
- Wired into CI **by placement** — no `package.json` change to keep in step.

## Impact

**It found six live instances of its own bug class on its first run**, on a tree everyone considered
finished. Three were residual copies of the very assertions task 77 spent eleven gates fixing, still
standing beside their own replacements — harmless in effect, but a reader auditing that file found an
assertion whose message said it checked the row when it did not. All six were fixed.

## Quality highlights

- **9 mutation proofs.** M13 is the one that matters: it proves the corpus reachability sweep can fail
  *at all*, which is what separates a live guard from one that merely happens to pass.
- **False-positive rate driven from 61 to 0** across three measured narrowings, every figure anchored
  to the commit it was taken at.
- **Three self-catches, all disclosed rather than quietly corrected**: a false mutation proof (shell
  escaping had swallowed the substitution); two analyser bugs found by measuring rather than reading;
  and a defect in the fix's *own* guard, caught by mutation-proving that guard.

## Known limitations

The lint models the six shapes that happened. A seventh in an unmodelled shape will pass — stated in
`mutation-proving.md` beside the lint it points at. One LOW carried knowingly (property access spelled
like a keyword: 0 occurrences, bounded, and non-silent because the guard names it).

## Demo notes

`npm test` — the lint runs as `tests/relationship-assertion-lint.test.js`. To see it work, add
`assert.match(doc, /ALPHA[^|]*BRAVO/, "ALPHA must route to BRAVO")` to any test file and re-run.
