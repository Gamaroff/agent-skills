# Relationship-assertion lint — corpus and false-positive record

This directory holds the historical corpus for `tests/relationship-assertion-lint.test.js`, and the
measured false-positive record that success criterion 3 of task 89 asks for. The number below is
**measured, not assumed** — it was produced by running the analyser over the whole test suite and
triaging every finding by hand.

## The corpus

Six instances of one bug class, produced by task 77 across eleven independent gates. Each is
reconstructed with `git show <commit>` rather than retyped, and each is pinned to the gate finding
that named it. Two of the six were introduced by the fix for the previous instance.

| Fixture               | Gate finding  | Closed by | Caught by | The defect                                                             |
| --------------------- | ------------- | --------- | --------- | ---------------------------------------------------------------------- |
| `instance-1.fixture.js` | CY8-5       | `87e5bf9` | rule A    | `resume.includes(v)` over the whole file                               |
| `instance-2.fixture.js` | CY9-3       | `8293765` | rule A    | same `includes`, haystack narrowed to the table — the fix for #1       |
| `instance-3.fixture.js` | CY10-1      | `ef3a0c1` | rule A    | row-shaped regex; the action cell's own prose supplied the destination |
| `instance-4.fixture.js` | CY11-1      | `18dd5b5` | rule D    | 4 of 5 values enumerated; the omitted one was the loop's exit arm      |
| `instance-5.fixture.js` | CY11-2      | `18dd5b5` | rule C    | `indexOf(a) > indexOf(b)` sold as containment                          |
| `instance-6.fixture.js` | in #5's fix | `18dd5b5` | rule B    | `--stage ready-for-merge` is a PREFIX of `--stage ready-for-merge-X`   |

Two negative controls, both verified by gate 11 as real mapping checks:

| Fixture                | What it is                                                                       |
| ---------------------- | -------------------------------------------------------------------------------- |
| `survivor-1.fixture.js` | The parsed-row keying that closed instances 3 and 4 — nine structural attacks caught by name |
| `survivor-2.fixture.js` | `advance-pipeline-lock.test.sh`'s shape — it RUNS the script and asserts the resulting step |

The negative controls are the load-bearing half. Rule A's suggested replacement *is* survivor 1's
mechanism, so a lint that flagged it would punish the fix it recommends.

## False-positive measurement

Corpus: **2191 assertion call sites across 89 test files** at `de19e1c`, over the four roots the lint
walks (`evals/`, `tests/`, `shared/resources/tests/`, `skills/*/tests/`).

> **Every figure below names the commit it was measured at.** The triage columns were measured at
> `fe7f617`, when the corpus held 2188 call sites; the scanner fix at `183a19e` added nine assertions
> to this suite, taking it to 2191. Quoting a measurement without its commit is how a record starts
> describing a tree that no longer exists — and this is the lint that exists to stop assertions
> claiming more than they establish, so its own record is held to the same rule.

| Stage                                     | Findings | Rate   | Measured at |
| ----------------------------------------- | -------- | ------ | ----------- |
| First implementation (shape only)         | 61       | 2.8%   | `fe7f617` (2188 sites) |
| After narrowing (shape **and** claim)     | 11       | 0.50%  | `fe7f617` |
| After fixing the 6 true positives         | 4        | 0.18%  | `fe7f617` |
| Suppressed with a written reason          | 4        | —      | `fe7f617` |
| **Unsuppressed findings on a clean tree** | **0**    | **0%** | re-derived at `de19e1c` (2191 sites) |

### What the narrowing changed, and why

The first implementation required only the defective *shape*, and reported 52 rule-B findings —
ordinary presence checks like `/current_step/` and `/--dry-run/`. That is the rate at which, in this
repository's own words, "a guard that cries wolf gets disabled"
(`tests/mutation-call-site-coverage.test.js`). Three narrowings, each measured:

1. **Every rule now requires a conjunction**: the defective shape **and** a message claiming
   placement or a mapping. An unbounded token under "must sit inside 5c" is instance 6; the same
   token under "the hook must read `current_step`" is an honest presence check. 52 → 3.
2. **`assert.ok(!x.includes(y))` is a negative claim**, like `doesNotMatch`. A prefix match makes an
   absence claim *stricter*, so the shape is not a defect there.
3. **Rule D requires an actual collection** — the guarded variable must be keyed into with an array
   method in the loop body. Without it, `content.length > 200` (a string size check) paired with the
   next unrelated `for … of` loop and reported two findings that were not defects.

Two analyser bugs were found by the measurement rather than by review:

- `identifierRuns` required a leading letter, so `5b` — the destination in the defect this lint was
  built from — was not counted as an identifier and **instance 3 was invisible to rule A**. Character
  class contents were also being scanned as content; they are gap constructs and are now stripped.
- `owns?` matched the possessive "its **own** provenance header", costing one false finding. The verb
  now carries its `s`.

### True positives found on the first clean run — 6

The lint found six live instances of its own bug class on a tree everyone considered finished:

| Site                                          | Rule | What was wrong                                                                 |
| --------------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| `pr-review-loop-parity.test.mjs:238`          | A    | The *live copy of instance 3*, still standing beside the `verdictRow()` fix     |
| `pr-review-loop-parity.test.mjs:246`          | A    | Same shape — "the row must point at the invocation"                            |
| `pr-review-loop-parity.test.mjs:268`          | A    | Same shape — "the APPROVE ROW must exit the loop"                              |
| `transition-protocol-parity.test.mjs:273`     | B    | `--stage pr-merged` unbounded inside a containment claim — instance 6 exactly  |
| `setup-consumer-config.test.mjs:90`           | B    | `--probe-workflow` unbounded                                                    |
| `review-code.test.js:154`                     | A    | `/finalise\/SKILL\.md.*Step 7/s` — the two halves could sit anywhere in the doc |

The first three are the sharpest result here: three residual assertions of the class that took task 77
eleven gates to find, in the same file, *left behind by the fixes themselves*. They were harmless
because the strong `verdictRow()` assertions stand beside them — but a reader auditing that file finds
an assertion that says it checks the row. All six were fixed rather than suppressed, using the
mechanism each file already carried.

### The four suppressions, and why each is not a defect

A suppression must carry a reason on the comment block above the assertion. A bare
`// relationship-assertion-lint: allow` is rejected, and that is mutation-proved (M6 below).

| Site                                       | Rule | Why it is not a defect                                                                                       |
| ------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------ |
| `pr-review-loop-parity.test.mjs` (position) | A   | The needle is a whole constructed instruction line and the haystack is the bounded 5c slice — containment of a full distinctive line IS the mapping |
| `pr-review-loop-parity.test.mjs` (row)      | A   | `row` is a single table row already keyed on the loop name — row-scoped keying is the replacement this lint suggests |
| `remaining-work-banner-parity.test.mjs`     | A   | "points at the canonical spec" means "names the spec path"; presence is the complete test of that claim       |
| `access-config-parity.test.mjs`             | D   | The 14 names are a deliberate, documented subset of 25+; the aliasing family is named individually so deleting one is visible |

Rule D cannot distinguish "deliberate subset" from "forgot one" — no static rule can. The suppression
is the outlet, and it makes the deliberate subset explicit, which is an improvement over silence.

## Mutation proofs

Per `shared/resources/mutation-proving.md`. **Nine proofs.** M1–M6 were taken at `fe7f617` against a
22-test baseline; M11–M13 at `de19e1c` against the current **31-test** baseline, after the scanner fix
added the value-position guards.

| # | Mutation                                                   | Result       | Proves                                    |
| - | ---------------------------------------------------------- | ------------ | ----------------------------------------- |
| 1 | `ruleA` returns null                                       | 18 / 4 fail  | Rule A carries instances 1, 2, 3          |
| 2 | `ruleB` returns null                                       | 20 / 2 fail  | Rule B carries instance 6                 |
| 3 | `ruleC` returns null                                       | 20 / 2 fail  | Rule C carries instance 5                 |
| 4 | `ruleD` returns `[]`                                       | 20 / 2 fail  | Rule D carries instance 4                 |
| 5 | Drop `(?![-\w])` from the `pr-merged` fix                  | 21 / 1 fail  | The live gate is live, not decorative     |
| 6 | Strip the REASON from a suppression, leaving a bare marker | 21 / 1 fail  | A bare suppression does not suppress      |

### M11–M13 — the scanner fix (gate 1, finding CY1-1)

| #   | Mutation                                                                   | Result       | Proves                                             |
| --- | -------------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| 11  | Revert `>` from the value-position set                                     | 26 / 5 fail  | the `=>`, `>`, backtick and escaped-slash arms      |
| 12  | Revert the keyword arm (`return`, `typeof`, `case`, …)                     | 28 / 3 fail  | the keyword arms                                    |
| 13  | Revert `>` **and** inject a real odd-quote line into a live corpus file    | 25 / 6 fail  | **the corpus reachability sweep is a live guard**   |

M13 is the one that matters. M11 and M12 only show the *isolated* probes fire; the corpus-wide sweep
passes today because no live file carries the shape — which is exactly what a guard that could never
fire would also look like. M13 distinguishes them, and it names the offending file when it fails.

> **The first version of the M11/M12 guard was itself vacuous.** All seven value-position shapes were
> put in one probe file, where the apostrophe in `return /it's/` was closed by the apostrophe in a
> *later* line, re-syncing the mask — so reverting the keyword arm left the suite green and that arm
> was vouched for by nothing. That is instance 2 and instance 6 of this corpus, one level down, inside
> the fix for the finding that named the class. The shapes are now asserted one at a time.

> **M5 first reported GREEN, and that was a false proof.** The `perl` substitution had been swallowed
> by shell escaping and the file was unchanged, so the "mutation" tested nothing. It was caught by
> checking the file's contents rather than trusting the result. Recorded here because
> `mutation-proving.md` exists for exactly this failure, and a proof table that hides its own
> near-miss is worth less than one that does not.

### What these proofs do NOT establish

- That the four rules cover the bug class. They cover the six instances that happened. A seventh
  instance in a shape none of these rules models will pass.
- That the 0% rate holds as the suite grows. It is a measurement of this tree at this commit.
- That the suppressed four are correct. Four humans could reasonably disagree with the reasons above;
  the reasons are written down so that disagreement is possible.
