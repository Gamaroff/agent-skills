# Bug Registry

**Purpose:** Central tracking for all general (cross-cutting) bug numbers in this repo.
**Last Updated:** 2026-08-04
**Next Available Bug Number:** **2**

## How to use

### Filing a new general bug

1. Read **Next Available Bug Number** above — that's your `bug.{N}`.
2. Run `/create-bug-report` (General Bug mode). It will create:
   - `docs/bugs/bug.{N}.{name}/bug.{N}.{name}.md`
3. Add a row to the table below for the new bug.
4. Increment **Next Available Bug Number**.
5. Commit the registry update **in the same commit** as the new bug files (atomic).

### Rules

- Bug numbers are globally unique. Never reuse a number, even for a closed/cancelled bug.
- If a merge conflict on the next-number occurs, the higher number wins; the loser bumps to the next free slot.
- General bugs have no parent story/task (that's what story/task bug reports are for).

---

## Registry

| #   | Title | Status | Severity | Priority | Created | Area |
| --- | ----- | ------ | -------- | -------- | ------- | ---- |
| 1 | [`ready-for-development` cannot match a Jira column named "Ready for Development"](bug.1.ready-for-development-candidates/bug.1.ready-for-development-candidates.md) | new | Minor | Medium | 2026-08-04 | jira-sync / status mapping |

---

## Notes

Registry bootstrapped 2026-08-04 alongside bug 1, the first general bug filed in this repo.
