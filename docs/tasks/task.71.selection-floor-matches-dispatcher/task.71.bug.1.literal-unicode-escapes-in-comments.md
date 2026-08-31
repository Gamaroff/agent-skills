# Bug Report: Task 71 - Literal `⊆` / `—` escape sequences in test-file comments

**Task**: [Link](./task.71.selection-floor-matches-dispatcher.md)
**Bug ID**: TASK-71-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (qa-task cycle 1)
**Date Found**: 2026-08-31

## Description

Twelve `//` comment lines in `evals/develop-next/unit/select-next.test.mjs` contain the literal
character sequences `⊆`, `—` and `→` where the intended characters were `⊆`, `—` and
`→`. In a JavaScript **comment** these are not escape sequences — they are inert text — so the
comments render as, for example:

```
// ── H1: eligibility floor vs dispatcher — `===` for tasks, `⊆` for bugs ───────
// The relation was `⊆` on both axes until task.71.
```

**Root cause**: the comments were authored through a Python heredoc in which `\\u2286` was written
inside a non-raw string. Python collapsed `\\u` to a literal backslash + `u`, emitting the six
characters `⊆` into the file rather than the single character `⊆`.

## Affected Lines

`evals/develop-next/unit/select-next.test.mjs` — 1818, 1823, 1826, 1828, 1829, 1831, 1833, 1901,
1913, 1916, 1939, 1947.

## Expected Behavior

Comments read `⊆`, `—`, `→` — matching `select-next.mjs` and `roadmap-selection.md`, which carry the
real characters and are correct.

## Actual Behavior

Comments read `⊆`, `—`, `→`.

## Impact

**No runtime impact, and this is worth stating precisely rather than assuming either way.** Three
occurrences (lines 1929, 1932, 1934) sit inside a JavaScript **template literal**, where `→` *is*
a valid unicode escape — those render correctly, as confirmed by the mutation-2 failure output during
development, which printed a real `→`. Only the `//` comment occurrences are inert text.

The impact is on **maintainability**, and it is not merely cosmetic here. The garbled lines include
the H1 section header — the first thing a future author reads when asking why the floor is what it is
— and this task's own Success Criterion D1 is that the rule's rationale reads correctly. A change
whose stated purpose is that six prose sites state the rule accurately should not garble the prose in
its primary test file.

## Recommendation

Replace the literal sequences with the real characters in the twelve comment lines. Optionally
normalise the three template-literal occurrences to real characters too, for consistency with the
rest of the file — behaviour-neutral.

Re-run `node --test 'evals/develop-next/unit/*.test.mjs'` and `prettier --check` afterwards. No test
assertion depends on these characters, so the change is text-only; the guard against regression is
a repo-wide grep for `\\u[0-9a-f]{4}` outside template literals.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-31
**Developer**: qa-fix

**Root Cause Analysis**

Confirmed by counting the literal sequences in the file before any edit:

```
before: {'\\u2286': 7, '\\u2014': 9, '\\u2192': 2}
```

Eighteen occurrences, not the twelve the report estimated — the QA count was of affected *lines*, and
several lines carried two. The cause is as diagnosed: during Step 3 the comments were authored inside
a Python heredoc using `'''...\\u2286...'''`. In a non-raw Python string `\\u` is an escaped
backslash followed by `u`, so Python emitted the six characters `\u2286` rather than the single
character `⊆`.

Confirmed the runtime split the report predicted: the two `\u2192` occurrences and one `\u2014` sit
inside a JavaScript **template literal**, where they *are* valid escapes and already rendered
correctly. The rest are inert text in `//` comments.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-31

**Fix Description**

Replaced all 18 literal sequences with the characters they denote. Behaviour-neutral in both
contexts: inert text in comments, and an identical string in the template literal (JS resolves
`\u2192` to `→` at parse time, so the replacement produces the same value).

Also applied the QA LOW recommendation in the same pass — `assert.deepEqual` → `assert.deepStrictEqual`
at what is now line 1924. Both sides are arrays of strings, so today's behaviour is identical; strict
is the documented recommendation and removes a loose-equality footgun if the compared shape changes.

**Files Modified**

- `evals/develop-next/unit/select-next.test.mjs` — 18 character replacements; one assertion helper

**Testing**

- `node --test 'evals/develop-next/unit/*.test.mjs'` → 123 pass, 0 fail
- Full `npm test` → 1999 tests, 0 fail
- `prettier --check` → clean (file unchanged by the formatter)
- Repo-wide guard: `grep -c '\\u[0-9a-f]\{4\}'` over the file → **0**; no literal escape remains

**Adversarial verification of the fix itself**

The `deepStrictEqual` swap is a real semantic change to the assertion that guards this task's central
invariant, so it was not accepted on a green suite alone. Mutation 2 (adding `accepted` to the floor)
was re-applied and the guard still fails correctly, with the message rendering a real arrow:

```
✖ 16/H1: the task eligibility floor EQUALS what develop-task proceeds on
    only in floor:      accepted
        → the frontier would nominate work the dispatcher refuses; an
```

Source restored and confirmed clean afterwards. This also re-proves that the character replacement did
not damage the failure message — the one place these characters have observable behaviour.

**Verification Steps for QA**

1. `grep -c '\\u[0-9a-f]\{4\}' evals/develop-next/unit/select-next.test.mjs` → expect `0`
2. `sed -n '1818p' evals/develop-next/unit/select-next.test.mjs` → header reads `⊆`, not `\u2286`
3. `node --test 'evals/develop-next/unit/*.test.mjs'` → 123 pass

## Status History

| Date       | Status       | Changed By | Notes                                          |
| ---------- | ------------ | ---------- | ---------------------------------------------- |
| 2026-08-31 | New          | qa-task    | Found in QA cycle 1                            |
| 2026-08-31 | In Progress  | qa-fix     | Investigation started; 18 occurrences confirmed |
| 2026-08-31 | Ready for QA | qa-fix     | All 18 replaced; LOW recommendation also applied |
