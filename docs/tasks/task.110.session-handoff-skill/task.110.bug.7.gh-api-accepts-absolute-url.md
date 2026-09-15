# Bug Report: Task 110 - `gh api` accepts an absolute URL and sends a request to any host

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

`ghRule` checks the `api` endpoint with `isSafePositional(path0, POS.PATHS, { allowAbsolute: true })`,
which refuses only a `..` segment. `gh api https://evil.example/x` passes, and `gh` treats an
endpoint containing `://` as a full request URL. Cycle 2 refused `--hostname` so a handoff could
not aim the reader's `gh` at another host; the URL form reaches the same outcome.

**Executed** (QA cycle 6): a local listener on `127.0.0.1` received `GET /probe-path` from
`GitHub CLI 2.94.0` when the verifier ran `gh api http://127.0.0.1:<port>/probe-path`; the request
carried **no** `Authorization` header (gh scopes its token to the configured host), so this is
egress and not a credential leak.

## Steps to Reproduce

```bash
python3 -m http.server 8099 &   # any listener
node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(m.isAllowed("gh api http://127.0.0.1:8099/x")))'
# → { ok: true, argv: [...] }; running it hits the listener
```

## Expected Behavior

The `api` endpoint is a path on the authenticated GitHub host: refuse any token containing
`://` (or, stricter, anything not matching `^[A-Za-z0-9_./-]+$` — `graphql` and REST paths need no
more).

## Actual Behavior

An absolute URL is forwarded and requested.

## Impact

Read mode becomes a beacon to an arbitrary host, and on a cloud runner
`gh api http://169.254.169.254/latest/meta-data/…` lands the first two lines of the response in
the verdict table that the reader then copies into a report or PR comment. No mutation, no token,
but a network reach the contract explicitly closed for `--hostname`.

## Recommendation

Refuse `://` in the endpoint (and `//` at the start); add `gh api https://evil.example/x` and the
`http://127.0.0.1/` form to the refused-list test.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 6)

**Root Cause**: `ghRule` validated the `api` endpoint as a path with `allowAbsolute: true` (so `/user` works), and the path rule only refuses a `..` segment. `gh` treats an endpoint containing `://` as a full request URL, so the host check that `--hostname` was refused for had a second spelling.

**Fix**: the endpoint is refused when it contains `://` or starts with `//`, before the path rule runs. `/user`, `graphql` and query strings (`?per_page=100`) are unaffected. SKILL.md's `gh` row and refused-by-construction list state the rule.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `ghRule`
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `gh api https://evil.example/x`, `gh api http://127.0.0.1:8099/probe-path`, `gh api //evil.example/x`, the URL with a trailing `--jq .`; allowed: `gh api repos/x/y/milestones?per_page=100`
- `skills/session-handoff/SKILL.md`

**Testing**: 28/28; the bug's reproduction line in a scratch handoff → `unverifiable: not on whitelist: gh`, no request made. Mutation-proved: removing the `://` check → `whitelist: mutating shapes … are refused` red.

**Verification Steps for QA**:
1. `isAllowed("gh api http://127.0.0.1:8099/x").ok === false` with a listener up — it receives nothing.
2. `isAllowed("gh api /user").ok === true` and `isAllowed("gh api repos/x/y/milestones --jq .[0].title").ok === true`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | QA cycle 6 — executed against a local listener |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `://` and leading `//` refused in the api endpoint |
| 2026-09-15 | Closed | QA Engineer | QA cycle 7 — refused-list spellings verified; mechanism mutation-proven (`covered`) |
