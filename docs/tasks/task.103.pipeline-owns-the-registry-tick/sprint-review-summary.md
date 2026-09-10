# Sprint Review Summary — Task 103

**Task:** Nothing updates the task-registry row after a task is accepted
**PR:** [#375](https://github.com/Gamaroff/agent-skills/pull/375)
**Issue:** [#374](https://github.com/Gamaroff/agent-skills/issues/374)
**Accepted:** 2026-09-10
**Final Gate:** PASS (96/100)

---

## Summary

`docs/tasks/task-registry.md` carries a Status column per task, and nothing wrote it after creation.
Seventeen rows were finished, accepted and merged and never ticked; the registry reported 22 open
tasks when 5 were, and it was wrong for weeks. It survived because **nothing failed on it** — the
roadmap selector judges eligibility on each document's own frontmatter, never on the row, so a stale
row cannot cause a finished task to be re-selected. The whole cost fell on human readers.

This task gives the write an owner **and** makes its absence loud.

## What shipped

| Piece | What it does |
| :--- | :--- |
| `evals/shared/tests/task-registry-drift.test.mjs` | Fails CI when a document and its row disagree about acceptance, **or when a document has no row at all**. Imports the registry parser and lifecycle vocabulary rather than restating them. Two independent non-vacuity floors |
| `shared/resources/registry-tick.js` | The writer, called from `/finalise` at the moment it already sets `status: accepted`. One event, one writer — the two cannot disagree by construction |
| `skills/finalise/SKILL.md` | Acceptance step 4, with the full `reason` table and an explicit lite-mode statement |
| `docs/standards/task-registry.md` | Names the real owner; explains why a pre-merge tick is right for the Status column; documents the `/develop-batch` consequence |

## Impact

- **A silent cost became a loud one.** The registry answers "how much is left?" — the question it was
  wrong about for weeks, with nothing failing.
- **Two live defects found in passing.** Task 97 was accepted, merged under PR #350, and absent from
  the registry since creation — invisible to every check that existed, including the one written
  earlier in this task. Epic 3's row was stale and was corrected.
- **The manual step is gone**, and its absence is now detectable rather than assumed.

## Testing

20 committed tests. 13 mutations across three QA cycles, each checked against which test *and* which
assertion went red. Two mutants survived during the loop and both were closed with new tests. Security
boundary probed with 9 adversarial candidates, none reproduced. CI green on the final head.

## Known limitations / follow-ups

1. The registry's **notes** column is still hand-written — `registry-tick.js` writes only Status.
2. **No epic drift check.** Epic documents carry `status: "✅ Accepted"` against a lifecycle spec
   requiring `lowercase-kebab-case`; settling that is its own change.
3. **Bug reports have no card preflight** at any layer — carried forward from task.102.
4. `/develop-batch` batches of **adjacent-numbered** tasks will now conflict on one registry row.
   Documented; resolution is always "keep both rows".

## Demo note

The mechanism's first live use was on this task: `/finalise` ticked task 103's own row (`draft` →
`accepted`), and the drift check confirmed agreement in the same run.
