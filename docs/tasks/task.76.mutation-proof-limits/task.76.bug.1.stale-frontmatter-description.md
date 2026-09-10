# Bug Report: Task 76 — Frontmatter `description` still describes a one-question document

**Task**: [task.76.mutation-proof-limits.md](./task.76.mutation-proof-limits.md)
**Bug ID**: TASK-76-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (qa-task cycle 1)
**Date Found**: 2026-09-02

## Description

`shared/resources/mutation-proving.md` grew by 39% in this change set and now answers three questions
where it previously answered one. Its frontmatter `description` — untouched by the diff — still
describes only the original one:

```yaml
description: How to establish that a test would actually fail if the behaviour it names regressed.
  Revert the behaviour, re-run, confirm red, restore. Reading a test does not tell you whether it can
  fail.
```

Every sentence of that is still true. None of it mentions the two questions the change set added:

- **what a suite of proven-real tests still fails to cover** (`## What a held proof does not tell you`)
- **what an unheld proof actually means** (`## When the proof does not go red` — three causes, only one
  of which is a defect in the test)

## Why this matters more than a stale line usually would

This repository's own `docs/architecture/concepts/coding-standards.md` is explicit about what the field
is for:

> Keep `description` under ~100 words. It is the most-read line of any skill — write it for the
> **matching agent**, not for humans skimming a catalog.

The description *is* the discovery mechanism. An agent — or a person — arriving with the question *"my
mutation proof didn't go red, what does that mean?"* has no signal that this file answers it. That is
precisely the moment the new content exists to serve, and it is the moment the document is now hardest
to find.

There is a second-order cost. Task 76's whole argument is that a held proof gets over-read while an
unheld one gets under-read. A description that still frames the document as *"is this test real?"*
reinforces exactly the framing §2 Motivation identifies as the problem: "framing the whole exercise in
the vocabulary of coverage, then never stating the limit."

## Steps to Reproduce

```bash
git diff origin/develop...HEAD -- shared/resources/mutation-proving.md | grep -E '^[+-]description'
# → no output: the description was not touched
sed -n '3p' shared/resources/mutation-proving.md
# → the original one-question description, against a 194-line three-question document
```

## Expected Behavior

The description names what the document now covers, so the matching agent can find it from any of its
three questions.

## Actual Behavior

The description covers one of three. The other two are undiscoverable by description match.

## Impact

Discoverability only — no behaviour changes, nothing breaks, no gate fails. Bounded, but it lands on
the field the project singles out as the highest-leverage line in the file, and it partly undercuts the
change's own purpose.

## Recommendation

One-line edit to `shared/resources/mutation-proving.md` frontmatter, then `npm run bundle` to propagate
to the three consuming copies. Suggested:

```yaml
description:
  How to establish that a test would actually fail if the behaviour it names regressed — revert the
  behaviour, re-run, confirm red, restore. Also: what a held proof does NOT tell you (it is evidence
  about a test, not about coverage), and the three things an unheld proof can mean — vacuous test,
  redundant source, or wrong premise.
```

Keep it under ~100 words per the coding standard. The exact wording is the author's call; the
requirement is that all three questions are reachable from it.

## Notes

Not a regression — the description was correct for the document that existed before this change, and
the task's §4 Scope did not name frontmatter either way. It became stale *because* of this change, so
it belongs to this change.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-02
**Developer**: qa-fix (develop-task pipeline, Step 6, cycle 1)

**Investigation Notes**

The finding is accurate and the root cause is uncomplicated: the task's §4 Scope enumerated three
body sections and a re-bundle, and frontmatter appeared in neither the In Scope nor the Out of Scope
list. Nothing in the plan pointed at the `description` field, so nothing updated it. `git diff` on
the source file confirms the line was untouched by the original change.

**Root Cause Analysis**

A scope written as a list of *additions* does not prompt anyone to ask what the additions
**invalidate**. The description was true before this change and became incomplete because of it —
the class of staleness that a diff never shows you, because the stale line is the one that did not
move.

**Proposed Fix**

Rewrite the `description` so all three questions are reachable from it, keeping it under the ~100-word
cap `docs/architecture/concepts/coding-standards.md` sets, then re-bundle.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-02

**Root Cause**: the change added two questions to the document and left the field that advertises them
describing only the first.

**Fix Description**

Replaced the `description` in `shared/resources/mutation-proving.md` with one that names all three:

```yaml
description:
  How to establish that a test would actually fail if the behaviour it names regressed — revert the
  behaviour, re-run, confirm red, restore. Also what a held proof does NOT tell you (it is evidence
  about a test, not about coverage), and the three things an unheld proof can mean: a vacuous test, a
  redundant source, or a wrong premise.
```

**60 words** — comfortably inside the ~100-word cap, and it keeps the original procedure sentence
first so an agent matching on the document's primary purpose still matches on the same words it did
before. The three new signal phrases — *held proof*, *not about coverage*, *unheld proof* — are the
ones a reader arriving with the new questions would actually use.

**Files Modified**

- `shared/resources/mutation-proving.md` — the `description` line (source of truth)
- `skills/develop/references/mutation-proving.md` — regenerated by `npm run bundle`
- `skills/qa-task/references/mutation-proving.md` — regenerated by `npm run bundle`
- `skills/qa-story/references/mutation-proving.md` — regenerated by `npm run bundle`

The three copies were **not** hand-edited. They carry `AUTO-GENERATED — DO NOT EDIT` and a hand-edit
would be silently reverted by the next bundle.

**Testing**

- `git diff --stat shared/resources/mutation-proving.md` → **1 insertion, 1 deletion**. The three new
  sections, the procedure, the five shapes, *Recording it* and *Do not claim it* are all untouched —
  they passed QA at 10/10 and nothing here disturbs them.
- All three generated copies confirmed to carry the new text.
- `npx prettier --check` on all four files — clean.
- `npm run ci:fast` (format:check + full hermetic suite) — exit 0, zero failures.

**Verification Steps for QA**

1. `sed -n '3p' shared/resources/mutation-proving.md` — the description names all three questions.
2. `git diff origin/develop...HEAD --stat -- shared/resources/mutation-proving.md` — confirm the only
   change since the last gate is the single description line.
3. `grep -l 'three things an unheld proof can mean' skills/*/references/mutation-proving.md` — all
   three copies.

#### Scope note — the two LOW findings were deliberately not actioned

Neither was introduced by this change set, and one is explicitly forbidden here:

- The file's own `bash` block cannot be executed by qa-task Step 4b (`cp` is off the fail-closed
  allow-list). Pre-existing, and the boundary is behaving correctly.
- `skills/develop/SKILL.md` says "the four shapes this takes" against a five-shape document. The count
  went stale when the fifth shape landed, before task 76, and the task's §4 Out of Scope forbids any
  SKILL.md edit.

Both are carried in the gate's `recommendations.future` as follow-up tasks. Fixing either here would
be scope the QA cycle did not ask for.

---

## Status History

| Date       | Status       | Changed By | Notes                                                     |
| ---------- | ------------ | ---------- | --------------------------------------------------------- |
| 2026-09-02 | New          | qa-task    | Found in QA cycle 1 (gate CONCERNS, 90/100)               |
| 2026-09-02 | In Progress  | qa-fix     | Investigation started                                     |
| 2026-09-02 | Ready for QA | qa-fix     | Description rewritten (60 words) and re-bundled; gate green |
| 2026-09-02 | Closed       | qa-task    | Verified in QA cycle 2 — all three questions named, 1 insertion / 1 deletion, all three copies propagated. Gate 2 PASS. |

---

## QA Verification (cycle 2)

**Date**: 2026-09-02
**Verdict**: ✅ **Verified — closed**

| Verification step | Result |
| --- | --- |
| `sed -n '3p' shared/resources/mutation-proving.md` | Names all three questions; 60 words, under the ~100-word cap |
| `git diff --stat` on the source file | **1 insertion, 1 deletion** — the fix touched nothing else |
| `grep -l 'three things an unheld proof can mean' skills/*/references/mutation-proving.md` | All three copies |
| `AUTO-GENERATED` banners in the copies | Intact — the copies were regenerated, not hand-edited |
| `npm run ci:fast` | exit 0, zero failures |

The fix keeps the original procedure sentence first, so every match the previous description attracted
still lands; the two new signal phrases are appended rather than substituted. That is the right shape
for this field — a rewrite that displaced the original wording would have traded one discoverability
gap for another.
