# Sprint Review Summary - Test infrastructure hygiene

**Story/Task ID:** task.231
**Completed Date:** 2026-10-26
**Completed By:** Lorien Gamaroff
**Pull Request:** [#752](https://github.com/Gamaroff/agent-skills/pull/752)

---

## Summary

`npm test` now runs in its own temporary directory, removes it on every exit, and fails when a test leaks a new kind of temp entry. The link checker now catches dead `#section` links, the observation-log tests pass inside a linked worktree, and a parity test no longer rejects a block that marks its own wait.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1: no per-run directory remains after `npm test`, pass or fail
- [x] SC-2: a new or over-count leak prefix fails `npm test` and names the prefix
- [x] SC-3: the four fixed prefixes are gone from the ratchet; the leftover count fell (608 → 442)
- [x] SC-4: `observation-log.test.mjs` passes from a linked worktree
- [x] SC-5: `doc-links.js` reports `other.md#nope` as `[no-anchor]` and accepts every listed anchor shape
- [x] SC-6: the docs link-check workflow runs `doc-links.js` on each changed Markdown file
- [x] SC-7: the parity test accepts a block-owned wait mark and still fails an unmarked dispatch

### Key Features Implemented

1. **Per-run TMPDIR wrapper** (`scripts/test-tmpdir.mjs`). It runs the suite in its own process group, forwards INT, TERM, HUP and QUIT and job control, reaps leftover processes, then removes the directory.
2. **Leak ratchet** (`tests/tmp-leak-ratchet.json`). Each temp-entry prefix has a ceiling. A new prefix or a higher count fails the run and is named.
3. **Anchor checking** in `shared/resources/doc-links.js`, wired into `docs-link-check.yml`. It covers headings, duplicates, explicit `<a id>` anchors, same-file `#x` links and tracked symlinks.
4. **Worktree-safe scratch root** for the observation-log tests, plus fixes to leaking test helpers.

---

## Technical Details

### Files Modified/Created

22 authored files, plus the bundled `references/` copies of `doc-links.js` and `qa-read-back.js`. The main ones are `scripts/test-tmpdir.mjs` (new), `tests/test-tmpdir.test.js` (new, 23 tests), `tests/tmp-leak-ratchet.json` (new), `shared/resources/doc-links.js`, `shared/resources/tests/doc-links.test.mjs`, `shared/resources/tests/observation-log.test.mjs`, `.github/workflows/docs-link-check.yml` and `package.json` (`test` → wrapper, `test:suite` → the suite).

### Architecture/Design Decisions

- The suite is spawned `detached`, so the wrapper can signal and reap the whole process group. Terminal signals and Ctrl-Z are forwarded by hand, because a detached group no longer receives them from the terminal.
- Ratchet keys are folded by producer (`eval-` inner suffixes), so the same leak keeps the same name across runs.
- A healed ratchet entry is a notice, not a failure, because leak counts vary between hosts (zsh present or absent).

### Dependencies

None added. The workflow adds `actions/setup-node@v7`.

---

## Testing & Quality Assurance

### Test Coverage

- **New tests:** 23 wrapper tests, plus anchor, parity, worktree and qa-read-back cases.
- **Mutation proofs:** five red-then-green proofs, plus one per QA fix.
- **Full suite:** 6,373 tests, 0 failures locally. CI is green.

### Code Review

- **QA:** 5 cycles. Gates 1–4 were CONCERNS and each finding was fixed. Gate 5 was **PASS (95/100)**.
- **PR review (Step 5c):** APPROVE, with 2 low conformance findings, both resolved at acceptance.

---

## Security & Compliance

### Security Review

- [x] No secrets; argv-only `spawnSync`, no shell
- [x] Symlink follow bounded to normalised in-repo paths
- [x] `compareRatchet` boundary probed: 8 cases executed, 0 reproduced, 0 escaped (`task.231.dod.1.security.run.json`)

### Compliance Review

Not applicable. The change is test and link-check infrastructure only.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` [Unreleased]: three entries cite task 231
- `docs/contributing/traps.md`: the `df -i /tmp` triage trap, and the suite-list trap now names `test:suite`
- `docs/architecture/concepts/tech-stack.md`: the link-check description covers anchors

### Documentation Links

- DoD: `task.231.dod.1.test-infrastructure-hygiene.md`
- Implementation report: `task.231.implementation.1.test-infrastructure-hygiene-initial-run.md`

---

## Demo Notes

### How to Verify

1. `npm test`: on exit, no `agent-skills-test-*` directory remains in `/tmp`, and the ratchet line reads ok.
2. `node shared/resources/doc-links.js --file <a .md with a dead #fragment>` prints `[no-anchor]` and exits 1.
3. Send Ctrl-C to `npm test` midway: the suite's whole process group ends and the directory is removed.

---

## Impact & Value

### User Impact

None directly. This is developer and CI tooling.

### Technical Impact

`/tmp` no longer fills with leaked test directories (a past cause of inode exhaustion and mass test failures). New leaks fail CI by name, and dead section links are caught before merge.

---

## Known Limitations & Future Work

### Current Limitations

- No unit test pins the docs link-check workflow step; its evidence is a CI run.

### Suggested Follow-Up Stories

- Gate 5 advisory: CR5-1 (assert captured pids are positive integers) and CR5-2 (treat a zombie as gone under a non-reaping PID 1)
- Carried: CR2-4 (quadratic heading matchers), CR2-5 (Step 12b prose omits `no-anchor`), CR2-6 (Bitbucket slugs), gate-1 CR-2 (empty anchor step on engine-only PRs)
