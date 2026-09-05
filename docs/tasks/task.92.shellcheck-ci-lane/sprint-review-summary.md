# Sprint Review Summary — Task 92

**Task:** Add a shellcheck CI lane for the repo's shell scripts
**PR:** [#322](https://github.com/Gamaroff/agent-skills/pull/322) · **Issue:** [#321](https://github.com/Gamaroff/agent-skills/issues/321)
**Accepted:** 2026-09-05 · **Gate:** PASS 96/100 · **QA cycles:** 3

---

## Summary

Shell was the least-gated language in this repo. `npm run ci` runs `prettier --check` over everything
and `node --test` over the suite — and nine of those suites *are* shell scripts executed by `bash` —
but nothing statically analysed shell. A quoting bug could ship on any path the tests do not take.

The gap had already cost a cycle. Task 83 carried a `shellcheck scripts/setup-consumer.sh` success
criterion through three QA cycles, a gate and a DoD, and no automated step could evaluate it; it was
settled by hand with a container. A criterion no gate can evaluate is one that gets waived by accident
the next time nobody runs the container.

This adds the lane, resolves all 26 pre-existing warning-tier findings, and documents how to run the
same check locally.

## Acceptance Criteria Met

All 11. The three that carry weight, and how each is evidenced:

| Criterion | Evidence |
| --- | --- |
| Job green on the current tree | `shellcheck` job SUCCESS in real CI on four successive heads |
| Job **observed failing** on a deliberate finding | Three mutation proofs, the primary one sited outside `validate.yml`'s path filter |
| `npm run ci` still green | CI `test` job SUCCESS — that job runs `eval:all`, which was never run locally |

## Key Changes

- **`.github/workflows/shellcheck.yml`** — one job, unfiltered triggers, ShellCheck **pinned to
  v0.11.0** and printed, `--severity=warning`, sources-only file list (56 files, not 247) with a count
  assertion and an empty-list guard.
- **26 findings resolved** — **9 by a real fix**, **17 by a `# shellcheck disable` with a stated
  reason**. Zero bare suppressions remain across all 56 source scripts.
- **Docs** — CHANGELOG `### Changed`; the local invocation in *both* copies of the pre-PR gate list
  (`CONTRIBUTING.md` and `coding-standards.md`) so they cannot drift; and `tech-stack.md`
  § Infrastructure and CI, which was already stale before this task.

## The decision that shaped the task

The task recommended adding a job to `validate.yml`. **That would not have worked, and it would have
looked like it had.** `validate.yml` is path-filtered to `skills/**` and `shared/resources/**`, which
excludes `scripts/setup-consumer.sh`, `scripts/release.sh` and `.agents/scripts/backfill-story-issues.sh`
— all three of which carried a warning, and the first of which is *the script that motivated the task*.
A lane there would never have fired for the change that caused it to be written, and would have reported
green while being structurally incapable of failing.

`test.yml` is unfiltered but is guarded by `ci-gate-parity.test.mjs`, which asserts set equality between
that job and the `npm run ci` composite. Hence a separate one-job workflow.

## Two things worth saying at review

**Every one of the five findings was in code this task itself introduced.** The inherited tree was clean
at `error`. The sharpest was a guard that reported a failure and then continued into the exact hang its
own comment claimed to prevent — the `task.90` shape, introduced in the task whose purpose is catching
that shape. It was unreachable, so the suite stayed green throughout and would have stayed green
forever. It was found by mutation-proving the guard, not by running the tests. **A green suite was
never evidence here.**

**No independent review ran.** Three Explore subagents — the QA cycle-2 refute pass and both Step 5c
lenses — hung without output and were terminated. Those steps were conducted in-line by the agent that
wrote the change. Self-review found four of the five findings, but the mechanism meant to catch what
self-review misses was never exercised. **A human read of the 28-file reviewable surface is the
outstanding mitigation**; the other 137 files are generated and isolated in commit `d383fa90`.

## Impact

- A shell-script criterion is now checkable by the same gate that checks everything else.
- The false-positive families this repo's idioms provoke are annotated **once**, in the code, with
  reasons — instead of being rediscovered by each person who runs shellcheck by hand.
- **Migration consequence:** the lane fails any PR that adds a new warning-tier finding, including in a
  file the author did not know was being watched. Announced in the CHANGELOG rather than discovered.

## Known Limitations / Future Work

- **Gated at `warning`, not `info`.** The `info` tier adds 53 further findings dominated by SC2016 and
  SC2015, both overwhelmingly deliberate here; gating there would need a blanket exclude list that makes
  the lane weaker than gating at `warning` honestly. Task §4 scopes it out; file separately if wanted.
- **The pin needs maintaining.** Bumping `SHELLCHECK_VERSION` should be its own commit so the bump and
  its fallout are reviewable together. The workflow says so at the pin.
- **The Explore subagent failure** that blocked independent review is worth investigating in its own
  right — it affected three dispatches across one session.
