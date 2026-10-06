---
id: task.186.plan
title: "Implementation Plan: Eval harness hardening and task.185 leftovers"
type: plan
task-ref: task.186.eval-harness-hardening-and-leftovers.md
---

# Implementation Plan: Eval harness hardening and task.185 leftovers

> Requirements and success criteria: [task.186.eval-harness-hardening-and-leftovers.md](task.186.eval-harness-hardening-and-leftovers.md)

## Overview

There are four independent phases, one commit each. Every fix starts with a test that is red on
`develop` and ends with a mutation proof.

## Phase-by-Phase Implementation Guide

### Phase 1: Runner and repeat verdicts

**`evals/shared/runner.mjs`**

- A1: the first statement of `main()` (`runner.mjs:236`) sets
  `process.exitCode = optInExit("EVAL_DRIVER_ERROR_EXIT", 1)`, or a dedicated "not judged" code.
  The explicit `process.exit(agg.ok ? 0 : …)` at line 413 stays the only path to 0.
  - Red test (`runner-setup.test.mjs`): a setup module that exports
    `() => new Promise(() => {})` with no timers. Today the runner exits 0; after the fix it must
    not.
- A2: before `makeSandbox`, collect `fn` across `scenario.assertions` and `scenario.liveAssertions`.
  Compare against the names `runAssertions` dispatches (`runner.mjs:113`; derive the set from
  the switch once, as an exported constant, so the check cannot drift from the dispatcher). On an
  unknown name, `die()` with a usage-class status, so `repeat.mjs`'s pre-run validation can also
  read the constant and refuse before spending a live run.

**`evals/shared/repeat.mjs`**

- A3: `SKIP_EXIT`, `DRIVER_ERROR_EXIT` and `FAIL_EXIT` at lines 44–46 move to three values in
  64–113 (e.g. 73, 74, 75). The README § Repeat runner table changes in the same commit.
  `optInExit` already accepts 3–125.
- A4: in the plan loop (`repeat.mjs:101`), an empty `assertions` array is a usage error (exit 2).
- A5: a missing `jq` cannot be scored. Either `installFakeGh` checks for `jq` and the runner treats
  its absence as a skip, or the runner maps the fake's `unhandled: "jq not available…"` entry to a
  non-verdict. The first is simpler: one check at setup.

**`evals/shared/drivers/claude-cli.mjs`**

- A6: at line 100, when `res.status === null`, add `res.error?.code` and `res.signal` to the
  message (`ETIMEDOUT`, `SIGTERM`).

### Phase 2: Fake gh residue

`evals/shared/lib/fake-gh.mjs`:

- `refusal` reason: two refusal sites. The write list / `api` allow-list gets `refusal: "write"`;
  `servedShape` / READS gets `refusal: "not-a-served-read"`.
- `--version`: the check at line 298 becomes
  `argv.length === 1 && (argv[0] === "--version" || argv[0] === "version")`.
- Remove `-R`/`--repo` from `API_READ_FLAGS` (lines 101–102). Keep them in `VALUE_FLAGS` and in
  `servedShape`'s pre-group allowance for `pr`/`issue`.
- `pick()` (line 220): compute the requested keys missing from the fixture object. When any are
  missing, the caller marks the entry `unhandled` and names the fields.
- Fixture lookup (line 345): `Object.hasOwn(table, key) ? table[key] : undefined`. Apply the same
  to `fixtures[kind]` (line 321).
- Tests: extend `fake-gh.test.mjs`. Add a log-line floor to the unhandled test.

### Phase 3: Inline comments read with GET

`shared/resources/pr-inline-comment.js:455–462`: insert `"-X", "GET"` before `"-f"`. In
`pr-inline-comment.test.mjs`, assert that every `gh api` argv the module builds with `-f`/`-F`
also carries `-X GET`. Then run `npm run bundle` (copies in `skills/review-pr/references/` and
`skills/review-code/references/`).

### Phase 4: One next-number rule

**Decision first**:

- **Option 1**: extend `shared/resources/newest-numbered.sh` with `next_number <dir> <kind> -name <pattern>`. It reuses the by-number ordering already defined there.
- **Option 2**: move `skills/review-pr/scripts/next-report-number.sh` to `shared/resources/` and give it a `<kind>` argument.

Option 1 keeps one definition of "the numbered series". Its cost is that `newest-numbered.sh` is
sourced, not executed, so call sites `source` it. Option 2 keeps the executable contract
`/review-pr` Step 7 already uses. Record the choice and its reason in the implementation report.

Call sites (grep hits, 2026-10-06):

- `skills/review-pr/SKILL.md` Step 7 (`next-report-number.sh` call)
- `skills/qa-planning/SKILL.md:649` (`{num}` starts at 1 and increments …)
- `skills/review-bug/SKILL.md:121` (`N starts at 1, increments on re-review`)
- `skills/review-epic/SKILL.md:535` (`[n]` … starts …)
- `skills/review-task/SKILL.md:2130` (the review report numbering)

Re-run the population probe before editing, in case a sixth site appeared:
`git grep -n -i -e 'starts at 1' -e 'increments on re-' -- 'skills/*/SKILL.md' 'shared/resources/*.md'`

## Key Patterns and References

- **Exit-code contract**: `evals/shared/README.md` § Repeat runner.
- **Call-line tests**: the `step7CallLine` / `nextNumber` helpers in `skills/review-pr/tests/review-pr.test.js` run the skill's own fenced call line under bash and zsh. Reuse that pattern for each skill.
- **Probe sets for Phase 2**: task.185 `qa.5`–`qa.8` and `dod.3` list the forms.

## Testing Approach

- Each phase starts with a red test and ends with a mutation proof.
- Each phase closes with `npm run ci:fast` and `npm run eval:all`.
- After Phase 1, one `eval:review-pr:cli --runs 1` pass.
