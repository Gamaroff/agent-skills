# Sprint Review Summary - A session-handoff skill that writes the handoff and re-measures it on read

**Story/Task ID:** task.110
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-16
**Completed By:** Claude (`/develop-task` pipeline, operator-supervised)
**Pull Request:** [#408](https://github.com/Gamaroff/agent-skills/pull/408)

---

## Summary

A new `session-handoff` skill: write mode produces `.agents/handoff.md` in a fixed section order where every figure carries the command that produced it; read mode (`handoff-verify.mjs`) re-runs each command through a fail-closed read-only whitelist and reports every line as `confirmed`, `stale` (with the new value) or `unverifiable` (with why) — so a reader never has to trust the date at the top.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Read mode prints one verdict per figure; the annotated 2026-09-10 fixture reads `stale` on the frontier line and the change-log.js claim
- [x] `--json` follows the repo's `reason` / exit-code contract (`ok` / `stale` / `unverifiable` / `no-figures` / `missing` / `usage`)
- [x] Write mode emits the fixed section order; §5 Traps is a pointer to `docs/contributing/traps.md`, never content
- [x] Tests run under `npm test` and in CI (`test.yml`)
- [x] `quick_validate.py` passes; the catalog and dependency index regenerate to no diff (`validate.yml`)
- [x] `AGENTS.md` names the read mode and its command

### Key Features Implemented

- **Read mode that re-measures**: the first backticked span in a Command cell, or `<!-- cmd: …; expect: … -->` on prose, is parsed, run, and compared (whole-token or `/regex/` or `exit N`); output is one verdict per line, plus a `--json` object.
- **A read-only whitelist hardened by execution**: per-binary allow-lists (git, gh, npm, npx tools, node/python entry points, jq and the plain readers); the identity principle (runnable code is named by identity, never by shape); flag values held by kind (data file) or closed set (reporters); every value flag consumes exactly what its tool's parser consumes; no shell, detached process group, forced `CI=1`, timeout and output cap with kill. 23 QA bugs found by executing hostile spellings in a consumer-shaped project — all closed, each one a refused-list test and a mutation proof.
- **Write mode template** with half-life labels per section; `.agents/handoff.md` rewritten in the shape and verified by read mode before commit.

---

## Technical Details

### Files Modified/Created

- `skills/session-handoff/SKILL.md` — write / read modes, the whitelist table, the `expect:` forms, the refused-by-construction list
- `skills/session-handoff/scripts/handoff-verify.mjs` — parser, whitelist, runner, comparator, CLI (~2,100 lines)
- `skills/session-handoff/assets/handoff.template.md` — the fixed section order
- `skills/session-handoff/tests/handoff-verify.test.js` + `tests/fixtures/handoff-2026-09-10.txt` — 33 tests with an injectable runner; the historical handoff as an annotated regression fixture
- `package.json` — test glob; `AGENTS.md` — read-mode pointer; `.agents/handoff.md` — rewritten
- `docs/reference/skill-catalog.md`, `shared/resources/skill-dependencies.json` (+ bundled copy), `docs/reference/commands.md`, `docs/reference/activation-phrases.md`, `CHANGELOG.md`

### Architecture/Design Decisions

- **Fail closed, judged before running**: the argv that runs is exactly the argv the whitelist approved (one exception, `npx --no-install`, which removes a capability). A deny-list was tried in cycle 1 and replaced by per-binary allow-lists after it failed a fresh enumeration (bug.4).
- **Identity, not shape**: a module named on a loader flag (`--config=x.mjs`, `-R ./x.js`) executed through read mode in a consumer-shaped project (bug.14, bug.17, bug.21) — so loader values are held to data-file kinds and closed reporter sets, and "in-repo code is trusted" was retired as a boundary.
- **The tool's grammar is the model**: greedy yargs arrays, tsc's response files and value-consuming `-p`, ci-info's `CI=false` — each one a QA cycle, each fixed by declaring the flag as its parser reads it.

### Dependencies

- **New Dependencies Added:** none (`node:fs`, `node:path`, `node:child_process`, `node:url` only)
- **Breaking Changes:** none

---

## Testing & Quality Assurance

### Test Coverage

- **Unit / integration:** 33 tests in `skills/session-handoff/tests/handoff-verify.test.js` (parser, comparator, whitelist allowed/refused shapes, runner cap and timeout, CLI contract, template order)
- **Regression:** the 2026-09-10 handoff fixture reads `stale` on both annotated lines with an injected runner
- **Mutation:** every whitelist mechanism mutation-proven red across 19 QA cycles
- **Executed boundary probes:** ~3,650 in-process spellings re-run every cycle; hostile spellings executed end-to-end through a clone of the branch against a consumer-shaped project under a stripped environment with a local listener (zero requests)

### QA Results

- **Gate:** `task.110.gate.19.session-handoff-skill.yml` — PASS 100/100; bugs 1–23 closed; NFR all PASS
- **QA cycles:** 19 (the 5-cycle budget and the strike halt were waived by the operator for this run)
- **PR review (5c):** `task.110.pr-review.2.session-handoff-skill.md` — CONCERNS, non-blocking

### Code Review

- **Reviewers:** no human reviewer on this repository; Step 5c `/review-pr` twice (REQUEST CHANGES → fixed → CONCERNS)
- **Approval Status:** unverified by human review; CI green on the accepted head
- **Review Comments Addressed:** `pr-review.1` CR-1..6 and PC-1..4 fixed; `pr-review.2` PC-1..3 and CR-2 fixed; CR-1/3/4/5 (LOW) recorded for follow-up

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** (`task.110.dod.1.session-handoff-skill.md` Step 3)

- [x] No hardcoded secrets; no eval/exec/shell; child runs with no shell, forced `CI=1`, detached group, timeout and output cap
- [x] Whitelist fail-closed and prototype-safe (`Object.hasOwn` lookups)
- [x] Egress and code-load surfaces closed (gh api URLs, `--repo` hosts, `git remote show`, `npm view` specs, loader flags)
- [x] Boundary probed: 85 candidates executed against `isAllowed`, held on every hostile input; one documented residual (absolute paths for the plain readers)

### Compliance Review

⚠️ **Not applicable** — no personal, payment, UI or health data in scope.

---

## Documentation

### Updated Documentation

- [x] `skills/session-handoff/SKILL.md` (new)
- [x] `CHANGELOG.md` `[Unreleased]` → Added (task 110)
- [x] Skill catalog, dependency index, `commands.md`, `activation-phrases.md`, `AGENTS.md` pointer
- [x] `.agents/handoff.md` rewritten in the new shape

### Documentation Links

- `skills/session-handoff/SKILL.md`
- `docs/reference/skill-catalog.md` (Skill Tooling → `session-handoff`)

---

## Demo Notes

### How to Verify

1. `command node skills/session-handoff/scripts/handoff-verify.mjs .agents/handoff.md` — every figure prints `confirmed`, `stale: moved: …` or `unverifiable: …`
2. `command node skills/session-handoff/scripts/handoff-verify.mjs tests/fixtures/handoff-2026-09-10.txt` (from `skills/session-handoff/`) — the two annotated lines read `stale`
3. `command node --test skills/session-handoff/tests/handoff-verify.test.js` — 33/33

### Screenshots/Visuals

_Not applicable (CLI)._

---

## Impact & Value

### User Impact

Whoever picks up work here reads a handoff whose every figure has just been re-measured, with the stale ones named — instead of a file whose date says "yesterday" and whose claims were false by the morning.

### Technical Impact

A reusable, executed-not-inspected model for a read-only command boundary: the whitelist's design principles (identity, kinds, closed sets, parser-faithful value flags) and the 23 bug reports document the classes a deny-list or a shape-based rule cannot hold against.

---

## Known Limitations & Future Work

### Current Limitations

- Absolute paths are admitted for the plain readers (`cat`, `head`, `wc`, `grep -c`) — a local read into the reader's own stdout; the report is never posted anywhere by the skill
- A data config whose whole content is a module specifier is a code load under prettier; a repository `tsconfig.json` with `incremental` writes `*.tsbuildinfo` under `--noEmit` — both documented in-repo-config residuals
- npm resolves a tool's name against the registry before `--no-install` declines (one manifest GET, no code)

### Future Work

- Scrubbed child environment (retires the measured-echo class); quoted-glob tokenising
- `pr-review.2` CR-1 (mid-token `~`), CR-3 (a table row carrying a trailing comment ends the table), CR-4/CR-5 cleanups
- README skills badge 126 → 128 (pre-existing drift)
