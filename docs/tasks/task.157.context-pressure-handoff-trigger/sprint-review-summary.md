# Sprint Review Summary - Context-pressure trigger: recommend a continuation handoff before the context fills

**Story/Task ID:** task.157
**Completed Date:** 2026-10-02
**Completed By:** Claude (develop-next → develop-task pipeline)
**Pull Request:** [#549](https://github.com/Gamaroff/agent-skills/pull/549)

## Summary

The model cannot see how full its context window is — Claude Code gives that figure only to the
status line. This task turns the status line's own measurement into a nudge: a wrapper records
`context_window.used_percentage` per session, and a `UserPromptSubmit` hook tells the agent, past
about 60% and again past 75%, to recommend a `session-handoff` continuation at the next natural
boundary. It is opt-in, user-level, and works in every repository.

## What Was Delivered

### Acceptance Criteria Met

- Soft note once on entering 60%, firm note on entering 75%, firm repeated every 5 prompts
- Silent on a stale, missing or corrupt reading; every hook path exits 0 (never blocks a prompt)
- The user's status line output and exit code are unchanged, byte for byte
- Install then uninstall round-trips `settings.json`; a second install changes nothing
- An invalid session id never writes outside the state directory
- `check` p95 113 ms (< 150); status line overhead +16–21 ms (< 50)

### Key Features Implemented

- `context-pressure.mjs` — `record`, `check`, and a `settings` sub-command holding the installer's JSON edits
- `context-pressure-statusline.sh` — records in the background, then runs the original status line
- `context-pressure-install.sh` — `--dry-run`, `--uninstall`, `--settings`; atomic write with `.bak`; keeps the file's mode; `ACTION NEEDED` (exit 1) for anything it will not touch

## Technical Details

### Files Modified/Created

- `shared/resources/context-pressure.mjs`, `context-pressure-statusline.sh`, `context-pressure-install.sh` (new)
- `shared/resources/tests/context-pressure.test.mjs`, `context-pressure-statusline.test.mjs`, `context-pressure-install.test.mjs` (new)
- `skills/session-handoff/SKILL.md` (new section) and its bundled `references/` copies
- `CHANGELOG.md`

### Architecture/Design Decisions

- The hook and the wrap are recognised by parsing commands into POSIX shell words — the exact inverse of the installer's own quoting — after three QA cycles each found a form a regex missed
- Installer outcomes are one set (`changed` / `unchanged` / `needs-manual`), so "nothing to do" and "needs you" never share an exit code
- The record/check race is accepted rather than locked: a lock that could not be taken would hang a hook that runs on every prompt

### Dependencies

None added — Node built-ins only.

## Testing & Quality Assurance

### Test Coverage

51 tests; every QA fix across five cycles carries a test its mutation turns red. The cycle-5 review fuzzed 200,000 quoting round-trips and compared against bash 5.3 with no failures.

### Code Review

QA: 5 cycles (CONCERNS ×4 → PASS 100). PR conformance review: APPROVE.

## Security & Compliance

### Security Review

PASS — the session-id gate was probed with 20 hostile and legitimate inputs (traversal, NUL, newline, unicode slash, over-length): engages, 0 reproduced.

### Compliance Review

Not applicable — local developer tooling, no personal data.

## Documentation

### Updated Documentation

- `skills/session-handoff/SKILL.md` § Context-pressure trigger (Claude Code)
- `CHANGELOG.md` `[Unreleased]`

## Demo Notes

### How to Verify

1. `sh ~/.agents/skills/session-handoff/references/context-pressure-install.sh --dry-run` and review the diff
2. Install without `--dry-run`, restart Claude Code with `CONTEXT_PRESSURE_SOFT=1`, send two prompts — the note appears on the second
3. `--uninstall` restores the original `statusLine.command`

## Impact & Value

### User Impact

The handoff recommendation arrives on evidence, early enough to write a good continuation file, without anyone having to notice the context filling first.

### Technical Impact

A measured trigger replaces a self-assessment that is least reliable exactly when it matters.

## Known Limitations & Future Work

### Current Limitations

- Claude Code only — other agents have no status-line feed
- A pause longer than the 15-minute freshness window suppresses the next note (PR review CR-1)
- Hand-written `$'…'` commands with byte escapes read differently from bash (QA5-CR-1)

### Suggested Follow-Up Stories

- Measure freshness against activity rather than wall-clock time
- Scale thresholds by `context_window_size`

---

**Status:** ✅ **ACCEPTED**
