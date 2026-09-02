---
name: mutation-proving
description: How to establish that a test would actually fail if the behaviour it names regressed. Revert the behaviour, re-run, confirm red, restore. Reading a test does not tell you whether it can fail.
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

## The five shapes vacuity takes

Each of the first four was found in one task's test suite, and every one was caught
by reverting rather than by reading. The fifth was found in another, and is the one
that costs whole cycles rather than single tests.

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
