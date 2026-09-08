# Sprint Review Summary — Task 93: Observation-log engine, workspace resolver and contract

**Task**: [task.93.observation-log-engine.md](./task.93.observation-log-engine.md)
**PR**: [#353](https://github.com/Gamaroff/agent-skills/pull/353) · **Issue**: [#339](https://github.com/Gamaroff/agent-skills/issues/339)
**Status**: ✅ Accepted — 2026-09-08 · **Gate**: PASS 96/100

---

## Summary

Ships the mechanism a forthcoming `observe-work` meta-skill will stand on: a durable, cross-session
record of moments where an agent's behaviour could have been better, written at the time rather than
reconstructed later. **No skill ships here** — the engine is independently usable and independently
testable, which is why it is separated from task 94.

Adapted from [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all)
(CC BY 4.0, Eoghan Henn). The methodology is kept; the mechanism is a rewrite.

## What shipped

| File | Lines | What |
|---|---|---|
| `shared/resources/observation-log.js` | ~1,470 | the engine — ten subcommands, `--json` `reason` contract |
| `shared/resources/resolve-observation-workspace.sh` | ~200 | guarded, sourced workspace resolver |
| `shared/resources/observation-log-contract.md` | 401 | canonical storage spec + CC BY 4.0 attribution |
| `shared/resources/tests/observation-log.test.mjs` | ~1,700 | 48 tests, every guard mutation-proven |
| `shared/resources/read-config.sh` | +2 | registers `observations.workspace` (+48 bundled copies) |
| `AGENTS.md`, `CHANGELOG.md` | — | contract section, release note |

## Four defect classes closed by construction

- **The octal bug is impossible.** Upstream feeds zero-padded prefixes into shell arithmetic, where
  `$(( 0105 + 1 ))` reads as octal (70) and `0108` is not valid octal at all. `parseInt(s, 10)` has
  no such reading — the class does not exist rather than being mitigated.
- **An empty result is a claim about the instrument.** `empty` and `scan-broken` are separate
  `reason` values, and both `scan` and `next-id` carry an independent count check that trips rather
  than returning a clean, believable zero.
- **Archival cannot be skipped.** The stale sweep is folded *inside* `next-id`, so no write path can
  reach an id without having swept.
- **`[ABSOLUTE PATH]` substitution disappears.** One resolver, three sources, one answer — and an
  ephemeral anchor is refused with a non-zero exit rather than accepted.

## Quality

- **4 QA cycles**, 7 findings raised, **7 closed**. HIGH by cycle: `1, 2, 0, 0` — converging.
- **23 mutation proofs** — every guard reverted, its named test confirmed red, then restored.
- **Security probe mode fired**: the resolver is an allow/deny predicate. 11 candidates executed,
  **0 reproduced**, including near-miss negatives a naive prefix match would wrongly refuse.
- **CI green** on the accepted head across all five jobs.

## The lesson worth carrying

> **The cheap version of a check reports success.**

It held six times on this task, and each was caught only by constructing the input that could
actually fail:

1. A single-offset UTF-8 probe passed; the defect reproduced at all eight alignments.
2. A `cd`-based worktree test would have passed; only a **real** linked worktree reproduced it.
3. A one-directional fork test *did* pass — and let a HIGH finding through.
4. A test that cleaned up after itself still wrote into the developer's home directory.
5. The first encoder-parity test passed while exercising **neither** shipped encoder.
6. The whole suite passed 48/48 on macOS and failed **30 tests** on Linux CI.

Two of those came from outside the automated loop: the operator stopped an unsafe verification
script, and the Step 7 CI gate caught the platform split. Both are the process working.

## Known limitations

- Nothing consumes the engine yet — task 94 is the first consumer. The `reason` vocabulary and exit
  codes are a contract from this commit forward.
- The `observations:` config schema is documented in task 95.
- A non-Latin title slugifies to the literal `observation`; ids keep such files unique.

## Demo

```bash
source shared/resources/resolve-observation-workspace.sh || exit 1
command node shared/resources/observation-log.js init --json
command node shared/resources/observation-log.js doctor --json
```
