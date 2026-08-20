# Sprint Review Summary — Task 51

**Task:** [Task 51] Declare tracker access level in config, and reject an unrecognised one loudly
**Status:** Accepted (conditional) · **Date:** 2026-08-18
**PR:** [#246](https://github.com/Gamaroff/agent-skills/pull/246) · **Issue:** [#225](https://github.com/Gamaroff/agent-skills/issues/225)

## Summary

`skills-config.yaml` gains an `access:` block declaring how much access the agent has to each system
— `full | read-only | approve | command | manual` — resolved into `ACCESS_TRACKER` / `ACCESS_VCS` by
`resolve-platform.sh` alongside the existing `TRACKER` / `VCS`.

The design point worth demoing is that **identity and access are separate axes**. Knowing the tracker
is Jira is exactly what lets a restricted run still emit *"move RAPP-605 to In Review"* with the right
URL and field names. So `manual` is a value of `access.tracker`, never of `tracker`.

The two resolvers deliberately differ. Identity uses config → env → detect, because picking the wrong
tracker is a *mistake*. Access reads config and env independently and takes the **more restrictive**,
because picking the wrong access is an *escalation*. A CI job can lock itself down without editing
committed config; nothing in the environment can loosen a config that restricts.

## What shipped

- `access:` block, five modes, per-key strict enum validation
- Most-restrictive-wins resolution across config and env
- **Closes a pre-existing silent fall-through** on the existing `tracker:` / `vcs:` keys — an
  unrecognised value used to be ignored
- Fail-closed handling for a config that is malformed, unreadable, or redirected at nothing
- `|| exit 1` on all 20 resolver sourcing lines, so a rejection actually halts a run
- `read-config.sh` extracted as the one shared two-tier reader (python+pyyaml, then awk)
- 285-assertion test suite, from 61 at first implementation

## Files

5 shared sources · 15 `SKILL.md` call sites · 4 docs · setup wizard · `package.json` · 36 bundled
reference trees.

## Testing & QA

285 tracker-access assertions · 1287 node · 6 resolver · 35 bitbucket-auth · 3 + 13 pipeline hooks ·
9 push-state · `validate:all` 115/115 · Prettier clean · bundle idempotent. Verified under bash and
zsh and on a genuine awk-only host.

**Seven QA cycles** — gates: FAIL 40 → 55 → 55 → 60 → 70 → 20 → **CONCERNS 80**.

## Demo notes — the honest version

This task is worth demoing for what it cost, not only for what it shipped. Six consecutive cycles
ended with the round's own fixes introducing at least one new defect. Cycle 6 was an independent
adversarial pass that returned FAIL 20/100 with 10 HIGH, including a code-execution vector and a
regression from cycle 5.

Cycle 7 was scoped deliberately: fix what is worth fixing regardless of any redesign, and **record**
the rest rather than patch it. It closed six defects, then found two more that its own fixes had
introduced — and closed those too, inside the same cycle. That is the first time in this task's
history the round's regressions did not surface in the next gate.

The mutation numbers are the clearest signal: gate 6 found **11 surviving mutations** behind a green
166/166 suite. Cycle 7 tried 9 and caught 9, including two invariants that had survived gate 6.

## Known limitations

- **LIMIT-1 (medium, open).** The awk tier reads only the canonical spelling of `access:`. A merge
  key, a quoted key, or a mapping-valued child resolves to `full` at exit 0. Tier 2 is the *default*
  tier on a stock macOS host (`/usr/bin/python3` ships without pyyaml). Deferred because closing it
  means giving the tier a grammar, not more regexes.
- **LIMIT-2 (low, open).** The parse-failure reason is not surfaced; the halt enumerates the shapes
  it rejects instead.
- Only macOS BWK awk exercised — gawk/mawk untested.

## Future work

1. Close LIMIT-1 **before** task.52 gates a mutation on `ACCESS_TRACKER`. Three options costed in the
   task document; the cheapest is restricting tier 2 to a documented strict subset that *refuses*
   anything outside it.
2. Carry the parse-failure reason across the record format.
3. Run the fixture matrix under gawk/mawk.

## Impact

Nothing consumes `ACCESS_TRACKER` yet — this is the vocabulary and the resolver that tasks 52–58
build on. The immediately useful part is the pre-existing silent fall-through on `tracker:`/`vcs:`
being closed, and 20 call sites that now halt on a bad value instead of carrying on with a default.
