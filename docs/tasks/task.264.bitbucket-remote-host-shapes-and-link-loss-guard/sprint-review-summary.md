# Sprint Review Summary - Bitbucket remote host shapes and link-loss guard

**Task ID:** task.264
**Completed Date:** 2026-11-05
**Pull Request:** [#847](https://github.com/Gamaroff/agent-skills/pull/847)

---

## Summary

The `sync-jira-*` scripts now read the Bitbucket repo base from every remote shape Bitbucket serves. An update that cannot find a base now stops before writing, instead of silently dropping the card's Source Documents links.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Seven remote shapes derive the base; look-alike and unknown hosts return null.
- [x] An update with no base exits non-zero and writes nothing, in all four scripts (dry-run included).
- [x] A create with no base still warns and exits 0.
- [x] No added subprocess or network call per run; new suite runs in 0.19 s.
- [x] CHANGELOG, four SKILL.md files and bundled copies updated; bundle checks clean.

### Key Features Implemented

- **`parseBitbucketRemote`**: exact host set (`bitbucket.org`, `ssh.bitbucket.org`, `altssh.bitbucket.org`) over scp-style, `ssh://` and `https://` forms; drops userinfo and port.
- **Update guard**: shared `missingBitbucketBaseMessage` (redacts userinfo) used by all four scripts.

---

## Technical Details

### Files Modified/Created

- `shared/resources/jira-sync.js` - parser, base lookup, message helper
- `skills/sync-jira-{task,story,epic,bug}/scripts/*.js` - guard
- `shared/resources/tests/jira-sync-bitbucket-remote.test.mjs` - 29 parser tests
- `skills/sync-jira-*/tests/end-to-end.test.js` - 3 guard tests each
- `skills/sync-jira-*/SKILL.md`, `CHANGELOG.md` - documentation

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** an update on an unparseable remote now exits 1 until `BITBUCKET_REPO_URL` is set.

---

## Testing & Quality Assurance

- **Unit and end-to-end:** 71 tests pass across the five files.
- **QA gate:** PASS 95/100, one cycle. **PR review:** APPROVE.
- **Mutation proof:** guard removal turned 2 tests red per script; excluding `ssh.bitbucket.org` turned 5 parser tests red.
- **Security probe:** 9 executed, 0 reproduced, 0 escaped.

## Known Limitations and Future Work

- The error message suggests a `BITBUCKET_REPO_URL` line even for non-Bitbucket remotes (LOW).
- The stock `url-authority` probe sink has no allow-list form (LOW).
