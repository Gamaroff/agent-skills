---
name: mutation-proving
description: How to establish that a test would actually fail if the behaviour it names regressed — revert the behaviour, re-run, confirm red, restore. Also what a held proof does NOT tell you (it is evidence about a test, not about coverage), and the three things an unheld proof can mean: a vacuous test, a redundant source, or a wrong premise. And the mirror: the four things a RED run can mean — a real kill, an environmental refusal, an invocation error, or the wrong thing mutated — with the probe-validation checks that tell them apart.
---

# Mutation-proving a test

> **A test you have read is a test you have assumed. Revert the behaviour it names
> and watch it go red — that is the only evidence it works.**

## The procedure

For each invariant a test claims to hold:

1. **Break exactly that invariant** in the source — one line, the smallest edit
   that makes the behaviour wrong.
2. **Confirm the mutation actually landed.** Diff the file against a pre-mutation
   copy and see the edit in the output. Do not skip this and do not assume it —
   an edit that silently did not apply produces a green run that reads exactly
   like a passing proof:

   ```bash
   cp path/to/source.ts /tmp/pre-mutation.ts   # before the edit
   # …make the edit…
   diff /tmp/pre-mutation.ts path/to/source.ts || echo "MUTATION APPLIED"
   # No diff output ⇒ the mutation never applied ⇒ the green below proves nothing.
   ```

   This is not hypothetical. One mutation was written with a literal `…` where the
   source had `...`; the string never matched, nothing changed, the suite stayed
   green, and the green was recorded as a pass. Two lines of `diff` close that
   class permanently.
3. **Re-run the suite.**
4. **Confirm the test that names it fails.** Not "some test fails" — *that* one.
5. **Restore the source.** Confirm green again.

## What a held proof does not tell you

A mutation proof falsifies **a check that exists**. Behaviour that no test names
has nothing to revert, so a proof run is silent about it — not reassuring, silent.

Task 67 measured the gap. **Nine proofs were recorded and four re-run
independently in QA; all four held — while thirteen fail-open routes sat in the
shipped classifier.** Every proof was honest: each reverted a real behaviour and
turned the right test red. Not one of them could have found the thirteen.

So after a proof run the open question is no longer *are these tests real?* — you
have just answered that. It is *what is not tested at all?*, and that takes a
different instrument: adversarial input generation against the real subject, not
more proofs.

> A held proof is evidence about a test. It is not evidence about coverage.

## When the proof does not go red

Three causes, and only the first is a defect in the test:

| The suite stayed green because | Signal | Response |
| ------------------------------ | ------ | -------- |
| the test cannot observe the behaviour | **vacuous test** | the six shapes below; fix the test |
| something else already enforces it | **redundant source** | the reverted code may be dead — decide whether to delete it, or make it defend a case nothing else covers |
| the behaviour was never what you thought | **wrong premise** | the finding or fix rests on a false mechanism — verify the mechanism before writing anything |

A vacuous test is the worst of the three: it passes whether the behaviour is
present or not, so it reports coverage that does not exist.

**An unheld proof is a finding, not a nuisance.** Investigate before strengthening
the test — strengthening first is how a wrong premise gets hard-coded into the
suite that then defends it. Both of task 67's unheld proofs were rows two and
three, and in both the vacuous-test response would have been the wrong one.

**Redundant source.** Disabling the `COMMAND_RUNNERS` check broke nothing: those
commands were already absent from the allow-list, so the set was dead code.

> A better test would have papered over that. The fix was a precedence test that
> made the set defend a plausible future edit.

**Wrong premise.** Removing `--timeout` validation broke nothing, because
`spawnSync` *throws* on `NaN` and on negative values — the finding's stated
mechanism was simply wrong. The real hole was `--timeout 0`.

> Strengthening the test would have hard-coded a fiction. Measure the mechanism
> first; the proof is what told you the story was false.

## When the proof goes red for the WRONG reason

The mirror of the section above, and the more dangerous half. A green run that
should have been red *announces itself* — you predicted red, you got green, you
go looking. A red run that should have been green announces nothing: red was the
prediction, red is what arrived, and the reading is recorded as a kill.

**A false RED is worse than a false GREEN, and the asymmetry is not about
frequency.** A false GREEN leaves one invariant unproven and the matrix says so —
the row is a survivor, and a survivor is a finding. A false RED writes `dead` into
a row nothing ever executed, so the matrix certifies coverage that was never
exercised, while looking exactly like diligence. The failure is silent on the side
that reports success.

> *"A red test isn't self-validating."*

Four causes, and only the first is a kill:

| The suite went red because | Signal | Response |
| -------------------------- | ------ | -------- |
| you broke the behaviour the named test observes | **a real kill** | the proof holds — restore, confirm green, record it |
| the suite never ran — a guard refused it, the runner was missing, the wrong interpreter was picked up | **environmental refusal** | nothing was measured. Fix the environment and re-run; the row is not a survivor either |
| the runner threw before or while loading the tests — a bad flag, an unresolvable import, a syntax error your edit introduced | **invocation error** | the red is about the harness, not the behaviour. Read the *first* error, not the summary line |
| the edit landed, but changed something other than the value under test | **wrong thing mutated** | the hardest one — see the judgement below. Re-read the mutation before believing the red |

Rows two and three are the ones that record a whole matrix as complete having
executed **zero** tests. Both were measured: a harness driven from a `subprocess`
inherited a different Node major and the repository's own node-major guard
**refused the run** — the guard working exactly as designed is what made the
reading convincing; and a `--reporter=basic` that did not exist in that Vitest made
the runner throw while loading it. Four dead mutants each, none of them executed.

### Validate the probe before you trust the matrix

Three mechanical checks, then one judgement. **A matrix collected before them
proves nothing in either direction** — not that the dead mutants died, and not
that the survivors survived.

1. **Baseline GREEN, with the exact command the matrix will use.** Not a similar
   command, not the one in your shell history — the same string, from the same
   working directory, through the same runner. This is what catches a refusing
   guard and a bad flag, because both fail here before any mutation exists to
   blame.
2. **One known-bad mutation goes RED, and is killed by its named case.** Break
   something you are certain is covered and confirm *that* test fails — not "some
   test fails". A suite that cannot go red on a certainty will not go red on a
   subtlety, and one that goes red in the wrong test is measuring something else.
3. **The mutation is asserted applied** — the `diff` from step 2 of the procedure.

```bash
# 1. baseline — the exact command, unmutated
<the matrix command>            # must be GREEN before anything is mutated

# 2. a certainty — break it, confirm the NAMED test is the one that fails
<the matrix command> 2>&1 | grep '<the test that names it>'

# 3. applied — from step 2 of the procedure
diff /tmp/pre-mutation.ts path/to/source.ts || echo "MUTATION APPLIED"
```

**The three cost two more runs of the matrix command, plus a diff.** Not a fixed
number of seconds — checks 1 and 2 each run that command, so their cost is whatever
it costs, which is why this is stated as a multiple rather than a constant. Measure
it once for your suite if you want the wall-clock figure; on the repository this
document ships in, one run is 0.3 s scoped to a file and 54 s across the whole
suite, so a constant would have been wrong either way.

What makes that cheap is the comparison, not the seconds. The procedure above
already runs the suite **twice per invariant** — once mutated at step 3, once
restored at step 5 — so a matrix of any size is paying two runs per mutation
before you validate anything. Adding two more is **roughly one extra mutation's
worth, at any N**, and it buys you out of recording all N as evidence when none of
them executed. Keep it cheap anyway: a validation step expensive enough to feel
like a detour is one that gets skipped on the run where it mattered.

4. **The judgement — the mutation must change the VALUE under test, not merely
   produce a diff.** Re-read the edit and confirm it expresses the behaviour you
   meant to break.

**This fourth check is a judgement, and it is stated as one because nothing
external can perform it.** It carries no time estimate and no command. Each of the
three mechanical checks compares an observation against an expectation; this one
compares an edit against an *intent*, which exists only in your head.

Here is why it cannot be dropped. A mutation once mangled a shell variable rather
than changing its value:

```bash
# intended: change the value the test asserts on
-STATUS="ready"
+STATUS="blocked"

# what actually landed: the variable is now broken, not different
-STATUS="ready"
+STATU S="ready"
```

**That edit passes the applied-check.** There is a real diff, so step 2 of the
procedure is satisfied; the suite goes red, which is what was predicted; every
mechanical signal agrees — and the proof is void, because the script broke rather
than the behaviour changing. The applied-check closes the *"nothing happened"*
case. It does not close this one, and a reader who takes "confirm it applied" as
the whole rule will record this reading as a kill.

That is what separates this from a mutation that never applied at all. **No diff and
an unexpected green** is the false-GREEN case above. **A diff, an expected red, and
the wrong thing changed** is this one, and only re-reading the mutation catches it.

## When to do it

| Moment | Scope |
| ------ | ----- |
| Writing a test for a new invariant | That invariant, before you call it done |
| A QA cycle that fixes a defect | The test guarding the fix — a fix without a red-going test is unwatched |
| A guard whose failure mode is silence | Always. These are the ones that rot unnoticed |
| Reviewing someone else's test | The one or two it would hurt most to have wrong |
| A fix to a boundary — validator, classifier, allow/deny-list, authorisation check | **Both directions**: that the refusal fires, *and* that legitimate input still passes |

Not every assertion needs this. The ones that do are the ones whose absence would
be **silent** — where the wrong behaviour reports success.

**Both directions** is not symmetry for its own sake. Proving that the refusal
fires says nothing about whether legitimate input still gets through, and an
over-strict boundary is as broken as a permeable one — it fails just as silently,
on the inputs nobody thinks to check. Two of task 67's fixes regressed exactly
there: an arithmetic placeholder `0` was read as a command name, and splitting on
`&` left the file descriptor in `2>&1` sitting in command position. No proof
caught either. A separately maintained set of legitimate patterns did — and
nothing above asks you to keep one.

## The six shapes vacuity takes

Each of the first four was found in one task's test suite, and every one was caught
by reverting rather than by reading. The fifth was found in another, and is the one
that costs whole cycles rather than single tests. The sixth is the one with a lint —
it recurred six times in a single task before anyone named the class.

**1. Asserting the wrong channel.** A CLI's contract was that stdout carries the
value a caller binds with `$( )`. The test passed `--json` and asserted the
returned *payload* instead. Deleting the line that wrote to stdout left every
caller's capture empty, with the suite green.

> Assert the channel the caller actually uses, through the interface it uses —
> a subprocess, not an in-process return value.

**2. A stub too permissive to see the change.** A test named "a title containing
a quote does not break the lookup", but the stub returned its canned response
regardless of the query it was passed. Reverting the fix — re-interpolating the
title into the query — changed nothing the stub could observe.

> A stub that ignores its input cannot witness a change to the input.

**3. Swallowed errors hiding an attempt.** A test asserted "no network call under
a restricted mode" using a *throwing* transport. The code caught its own errors,
so the call happened, the throw was swallowed, and every assertion held.

> Count the **attempt**, not the outcome. A recorder beats a thrower whenever the
> code under test has a `catch`.

**4. Matching prose that describes the behaviour rather than implements it.** A
guard asserted a skill retained a step, using a regex that also matched the
skill's YAML frontmatter *description* of that step. Deleting the actual step
left it green.

> Strip frontmatter, comments and narrative before matching. Anchor on the thing,
> not on a sentence about the thing.

**5. A textual rule standing in for a semantic property.** Whether a spec is
meaningful, un-narrowed, or actually executes is not a property of its source text.
One guard tried to prove it by pattern-matching and was defeated **nine times across
four QA cycles** — a `scope:` argument, a scope passed via a variable, a computed
key, `sourceEntries.filter(...)`, a spread, an aliased import, a call inside a fake
block comment, required titles satisfied by a **dead string**, and
`describe.skipIf(true)` switching off nine tests while the pin vouched for them. Its
own docblock claimed skip/only/todo was "a closed vocabulary, which is why this one
IS reliably checkable by text". False: Vitest also has `skipIf`/`runIf`, and property
access is not a vocabulary at all. A whole cycle went on discovering that.

> Each defeating spelling is evidence the **class** is undecidable — not that the
> rule needed one more case. Counting the spellings you have closed tells you
> nothing about the ones you have not.

Two things work instead.

- **Execute and observe.** Run the thing and read what it did, rather than reading
  what it says. But **respect the lane contract**: spawning `vitest` from a lane
  contractually specified as textual-only is what turned CI red on the cycle that
  tried it. If the guard's lane may not execute, the guard does not belong in that
  lane.
- **Make the subject its own witness.** Stop using synthetic probe files. Make the
  probe every real file, byte-for-byte, with one comment prepended — so no property
  distinguishes a probe from the file it came from, and there is no spelling for an
  author to land on that the probe does not already have.

**6. A mention standing in for a mapping.** An assertion claimed a *relationship* —
`REQUEST CHANGES` routes to `5b`, `ready-for-merge` fires at `5c`, this row owns
that action — while establishing only that both names occur in the same slice of
prose. Task 77 produced **six instances across eleven gates**, and **two of the six
were written inside the fix for the previous one**: widening the regex is the
natural repair and is the defect. The sharpest needed a negative lookahead —
`--stage ready-for-merge` is a strict PREFIX of `--stage ready-for-merge-RELOCATED`,
so a renamed call satisfied the match.

> The property under test is a MAPPING; co-occurrence is not one. Parse the
> structure and read the destination off the row that carries it — a value named
> anywhere else, including inside another row's prose, must not satisfy the
> assertion.

This shape is the one that is mechanically checkable, and **`tests/relationship-assertion-lint.test.js`
now checks it** — four rules over every test file in the repository, validated against all six
historical instances and against the two mechanisms that survived adversarial attack. It runs in
`npm run ci`. Its corpus, its measured false-positive rate and its own mutation proofs are in
[`tests/fixtures/relationship-assertion/README.md`](../../tests/fixtures/relationship-assertion/README.md).

Do not read the lint as coverage of the class. It models the six shapes that
happened; a seventh in a shape none of its rules models will pass, and shape 5's
warning applies to the lint itself — counting the spellings it closes tells you
nothing about the ones it does not.

## Recording it

State it where the claim is made, in the words of what you reverted:

```markdown
**Mutation-prove:** write a placeholder key on defer → the frontmatter test → red ·
drop `dependsOn` → the ordering test → red · unwrap one call site → the guard → red.
```

A test comment carrying the same note is worth more than the commit message,
because it survives where the next reader will meet it:

```js
// Demonstrated by reverting the line: the payload assertion held while every
// caller's capture came back empty.
```

## Do not claim it unless you did it

"Every invariant mutation-proven" is a factual claim about work performed. It has
been written in a commit message and been **false** — one guard in that commit had
never been reverted, and a later review found that disabling it left the whole
suite green.

If you proved four of five, say four of five.
