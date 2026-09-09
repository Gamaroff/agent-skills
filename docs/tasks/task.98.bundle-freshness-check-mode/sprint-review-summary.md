# Sprint Review Summary — Task 98

**Task:** A per-file bundle-freshness assertion the regenerate-and-diff check cannot provide
**Status:** ✅ Accepted · **PR:** [#367](https://github.com/Gamaroff/agent-skills/pull/367) · **Issue:** [#366](https://github.com/Gamaroff/agent-skills/issues/366)
**Accepted:** 2026-09-09 · **Quality:** gate 3 PASS, 100/100

---

## Summary

CI asserted bundle freshness by running the bundler and diffing the tree. That is effective for
everything the bundler *writes*, and structurally blind to everything it does not — because when the
bundler correctly declines to write a file, there is no diff to see.

This task adds `bundle_skill.py --check`: a read-only, per-file freshness assertion covering seven
problem classes, wired into `validate.yml` alongside the existing step.

## The result that matters

**It found a live defect on its first run.** `skills/create-skill/references/skill-dependencies.json`
was 44 bytes behind its source and had been for some time — missing the
`observe-work → create-skill` dependency edge. `.json` carries no provenance banner and the copy was
no longer byte-identical to its source, so the bundler could not prove the copy was its own output; it
skipped the file, and CI stayed green over it.

The task document predicted *"none has a live instance in the tree today"*. That was true of the four
classes it enumerated, and false of this one.

## What was built

| Class | Regenerable? | Regenerate-and-diff sees it? |
|---|---|---|
| `STALE` · `MISSING` · `WRONG MODE` | ✅ `npm run bundle` | ✅ yes |
| `ORPHANED` — source deleted | ❌ | ❌ no |
| `SYMLINK` — bundler refuses to write through a link | ❌ | ❌ no |
| `AMBIGUOUS` — authored file sharing a name | ❌ | ❌ no |
| `MISDECLARED` — banner names another path | ❌ | ❌ no |
| `UNREADABLE` — the instrument could not look | ❌ | ❌ no |

Built on `expected_bytes` and the writer's own discovery, so the check **cannot drift from the
bundler** — the property the task named as the one that matters.

**Remedies are verified in both directions.** Each regenerable class is dirtied and cleared by a
bundle run; each non-regenerable class is confirmed to *survive* one. Printing "run `npm run bundle`"
for a class the bundler cannot clear would leave CI permanently red under an instruction that does
nothing.

## Quality

29 tests · **18 mutation proofs** · 6 executed security probes · `ci:fast` green (3022/0) · CI 5/5
green on the final head.

Three QA cycles: CONCERNS 90 → **FAIL 80** → PASS 100.

## What the process caught

- **The refute pass found a HIGH defect in the pipeline's own fix.** Cycle 1's correction was correct
  but incomplete; cycles 2 and 3 found the same conflation — *a failed read presented as a clean
  result* — at two further sites in the same function. Each lived in code the previous fix's diff
  never touched, so a narrowed re-review would have missed both.
- **Two mutations proved nothing, and both were useful.** Each was treated as a finding about the
  tests rather than quietly patched, and each drove a new test.
- **The fast gate caught what the test run could not** — twice: a `prettier --check` failure, and an
  unbounded assertion flagged by the repo's own relationship-assertion lint.

## Known limitations, recorded not hidden

- A stale **headerless** copy (`.json`) reports `AMBIGUOUS` rather than `STALE` — nothing in such a
  file distinguishes a stale bundled copy from an authored one. The detail now names the case and
  points at the right fix.
- A **binary orphan** cannot be reported: no banner can be read from it. Documented as residual 6.
- An unreadable `references/` **directory itself** crashes with a raw traceback — pre-existing (the
  bundler crashes identically) and **fails safe**: loud, non-zero, CI red.
- **Pass 3** (the in-place rewrite of a skill's own files) is deliberately not asserted: asserting it
  would *compel* a rewrite that is an ungated blind regex. This is why the new check **supplements**
  regenerate-and-diff rather than replacing it.

## Demo

```bash
npm run bundle:check     # 126 skills, 0 problems
```

Break it and watch it report: delete a `shared/resources/` file that has a bundled copy, and the
copy is reported `ORPHANED` — where `npm run bundle` followed by `git diff` shows nothing at all.
