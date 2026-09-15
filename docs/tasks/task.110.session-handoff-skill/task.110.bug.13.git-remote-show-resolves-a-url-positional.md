# Bug Report: Task 110 - `git remote show <url>` treats an unconfigured name as a URL and queries it

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (reviewer CR-1, confirmed by execution)
**Date Found**: 2026-09-15

## Description

`gitRule` admits `git remote show <name>` with `POS.ANY` positionals — the comment beside
`ls-remote` explains why *that* subcommand's positional is anchored ("a handoff must not point the
reader's SSH agent at an arbitrary host — gate 3, PRB-8"), but `remote show` was left on the
unanchored policy. Git resolves a name that is not a configured remote as a URL alias
(`remote.c: add_url_alias`) and then queries it, so the anchor that closed PRB-8 on `ls-remote` is
one subcommand away from being bypassed.

**Executed** (QA cycle 8) through read mode in a scratch clone, against a local listener on
127.0.0.1:8099:

- `git remote show http://127.0.0.1:8099/x.git` → listener received
  `GET /x.git/info/refs?service=git-upload-pack`; line read `command failed (exit 128)`
  (`repository … not found` — the request was made).
- `git remote show 127.0.0.1:8099/x.git` (the scp form) → `ssh: connect to host 127.0.0.1 port 22:
  Connection refused` — git invoked the reader's ssh, with the reader's keys and agent, against a
  host the handoff named.
- `git remote get-url http://…` → `No such remote` (get-url does not alias; unaffected).
- `isAllowed("git remote show git@evil.example:x.git").ok === true`;
  `isAllowed("git remote show https://evil.example/x.git").ok === true`.

## Steps to Reproduce

```bash
printf -- '- x <!-- cmd: git remote show http://127.0.0.1:8099/x.git; expect: /./ -->\n' > /tmp/p.md
command node skills/session-handoff/scripts/handoff-verify.mjs /tmp/p.md --json | jq '.lines[0].measured'
# with a listener on 8099: GET /x.git/info/refs?service=git-upload-pack
```

## Expected Behavior

A `remote show` positional is a configured remote **name** — the same anchor `ls-remote` uses (no
`:`, no `@`, no scheme, no leading `/` or `.`) — or `remote show` is dropped from the arm: `git
remote -v` and `git remote get-url <name>` answer every question a handoff records without a
network round-trip.

## Actual Behavior

Any URL, including the scp form that spawns ssh, is admitted as a "remote name" and contacted.

## Impact

Egress to a host of the document's choosing; the scp form presents the reader's ssh identity to it.
Same class and severity as bug.9 (`gh -R <host>`, `npm view <url>`), through git.

## Recommendation

Apply `ls-remote`'s `positionalPattern` to `remote show` (and `get-url`, for symmetry), or remove
`remote show`; refused-list tests for the http, https and scp spellings; allowed test for `git
remote show origin`.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 8)

**Root Cause**: `remote show` positionals were `POS.ANY` while `ls-remote` was anchored against exactly this — git resolves an unconfigured name as a URL alias and queries it.

**Fix**: `remote show` removed from the arm — a deletion: `git remote -v` and `git remote get-url <name>` answer every question a handoff records without a round-trip. `get-url`'s positional is held to the `ls-remote` anchor (`POS.PATHS` + `positionalPattern`), so a URL there is refused too even though `get-url` does not alias.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `gitRule`: `show` branch removed; `get-url` spec anchored
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `remote show origin`, the http, scp and `git@` forms, `get-url https://…`, `get-url git@…`; allowed: `remote get-url origin`, `--push origin`, `--all origin` (the `remote show origin` allowed entry replaced)
- `skills/session-handoff/SKILL.md` — `git` row and refused list

**Testing**: 30/30. Executed through the fixed verifier with the listener up: the http and scp spellings read `unverifiable: not on whitelist` and the listener received nothing; `git remote get-url origin` read `confirmed`. Mutation-proved: `show` re-admitted → refused list red; `get-url` anchor removed → red.

**Verification Steps for QA**:
1. `isAllowed("git remote show origin").ok === false`; `isAllowed("git remote get-url origin").ok === true`.
2. The listener reproduction in this report receives no request through read mode.

## Status History

| Date       | Status | Changed By  | Notes                                                                                             |
| ---------- | ------ | ----------- | ------------------------------------------------------------------------------------------------- |
| 2026-09-15 | New    | QA Engineer | QA cycle 8 — reviewer CR-1; executed: http form reached the listener, scp form invoked ssh        |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `remote show` removed; `get-url` name anchored |
| 2026-09-15 | Closed | QA Engineer | QA cycle 9 — with a listener on 127.0.0.1:8099: `git remote show http://127.0.0.1:8099/x.git`, `git remote show 127.0.0.1:8099/x.git` and `git remote get-url http://127.0.0.1:8099/x.git` through the CLI all `unverifiable: not on whitelist: git`; no request logged, no ssh. `git remote -v` / `get-url origin` / `get-url --push origin` admitted. Re-admitting `show` and dropping the `get-url` anchor each turned the refused-list test red — `covered` ×2 |
