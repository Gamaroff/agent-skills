# Bug Registry

**Purpose:** Central tracking for all general (cross-cutting) bug numbers in this repo.
**Last Updated:** 2026-09-06
**Next Available Bug Number:** **11**

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
| 1 | [`ready-for-development` cannot match a Jira column named "Ready for Development"](bug.1.ready-for-development-candidates/bug.1.ready-for-development-candidates.md) | closed | Minor | Medium | 2026-08-04 | jira-sync / status mapping |
| 2 | [`npm test` runs `node --test` unbounded, so spawn-heavy suites time out for environmental reasons](bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md) | closed | Major | High | 2026-08-29 | test harness / CI |
| 3 | [Three CLIs call `process.exit()` after an async stdout write, truncating piped output at ~64KB](bug.3.stdout-truncation-on-exit/bug.3.stdout-truncation-on-exit.md) | closed | Major | Critical | 2026-09-01 | CLI output / test harness |
| 4 | [Snippet engine silently no-ops when invoked through a symlinked path](bug.4.snippet-engine-symlink-noop/bug.4.snippet-engine-symlink-noop.md) | closed | Major | High | 2026-09-01 | qa-task / Step 4b snippet engine |
| 5 | [access-config parity JS probe records a timeout as a real answer](bug.5.access-parity-js-probe-conflates-timeout/bug.5.access-parity-js-probe-conflates-timeout.md) | closed | Major | High | 2026-09-01 | test harness / config reader |
| 6 | [Ten more fail-open routes past the snippet classifier, plus two over-refusals](bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md) | closed | Major | High | 2026-09-02 | qa-execute-snippets / classifier |
| 7 | [`zero-blocks-executed` fires on skills whose every documented command is correctly refused](bug.7.zero-blocks-executed-fires-on-correct-refusal/bug.7.zero-blocks-executed-fires-on-correct-refusal.md) | new | Minor | Medium | 2026-09-02 | qa-task Step 4b / snippet engine |
| 8 | [A bug status outside the lifecycle is silently invisible to selection](bug.8.bug-status-outside-lifecycle-is-invisible/bug.8.bug-status-outside-lifecycle-is-invisible.md) | closed | Major | High | 2026-09-02 | selection / bug authoring / validation |
| 9 | [The registry frontier ignores the `Depends on` column, so it can nominate work whose prerequisite is unbuilt](bug.9.registry-frontier-ignores-depends-on/bug.9.registry-frontier-ignores-depends-on.md) | closed | Major | High | 2026-09-02 | selection / task registry |
| 10 | [sed's `w` write flag is only caught when a space follows it, leaving seven glued forms fail-open](bug.10.sed-w-glued-filename/bug.10.sed-w-glued-filename.md) | closed | Major | High | 2026-09-05 | qa-execute-snippets / classifier |

---

## Notes

Registry bootstrapped 2026-08-04 alongside bug 1, the first general bug filed in this repo.
