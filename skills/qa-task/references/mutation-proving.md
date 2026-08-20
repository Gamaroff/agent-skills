---
name: mutation-proving
description: How to establish that a test would actually fail if the behaviour it names regressed. Revert the behaviour, re-run, confirm red, restore. Reading a test does not tell you whether it can fail.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/mutation-proving.md. Regenerate via `npm run bundle`. -->

# Mutation-proving a test

> **A test you have read is a test you have assumed. Revert the behaviour it names
> and watch it go red — that is the only evidence it works.**

## The procedure

For each invariant a test claims to hold:

1. **Break exactly that invariant** in the source — one line, the smallest edit
   that makes the behaviour wrong.
2. **Re-run the suite.**
3. **Confirm the test that names it fails.** Not "some test fails" — *that* one.
4. **Restore the source.** Confirm green again.

If the suite stays green, the test is **vacuous**: it passes whether the
behaviour is present or not, and it is worse than no test, because it reports
coverage that does not exist.

## When to do it

| Moment | Scope |
| ------ | ----- |
| Writing a test for a new invariant | That invariant, before you call it done |
| A QA cycle that fixes a defect | The test guarding the fix — a fix without a red-going test is unwatched |
| A guard whose failure mode is silence | Always. These are the ones that rot unnoticed |
| Reviewing someone else's test | The one or two it would hurt most to have wrong |

Not every assertion needs this. The ones that do are the ones whose absence would
be **silent** — where the wrong behaviour reports success.

## The four shapes vacuity takes

Each of these was found in one task's test suite, and every one was caught by
reverting rather than by reading.

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
