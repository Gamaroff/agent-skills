# Sprint Review Summary - migrate-doc-numbering: link, frontmatter and downstream safety nets

**Story/Task ID:** task.253
**Completed Date:** 2026-11-04
**Completed By:** Lorien Gamaroff (via the develop-task pipeline)
**Pull Request:** [#823](https://github.com/Gamaroff/agent-skills/pull/823)

---

## Summary

`migrate-doc-numbering` now catches the problems the tinker-city handoff reported: links split across lines, dead links left behind, a dirty or stale checkout, generated files, and scripts that still use the old names. It refuses to apply changes on a dirty tree or a branch behind its upstream.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A multi-line link resolves after `--apply`.
- [x] A dangling link left by the tool is printed with file and line.
- [x] The retired registry stub contains no link.
- [x] `--apply` refuses a dirty tree and a branch behind upstream.
- [x] A generated file is not edited, and is listed.
- [x] A tracked script with a legacy pattern is listed in the closing line.
- [x] The post-apply scans read each tracked file once, asserted by a read counter.
- [x] Tests, `npm test` and `npm run bundle:check` pass.
- [x] Each fix's test goes red when the fix is reverted.
- [x] `CHANGELOG.md` updated.
- [x] The gap that did not reproduce (frontmatter validation) is recorded as such.

### Key Features Implemented

- **Multi-line links**: the link scanner reports the line the target sits on, so the re-point edits the right line and leaves a fenced copy alone.
- **Post-apply scans**: dead links, old-path references and legacy-name scripts are found in one pass over the tracked files.
- **Repository-state guard**: a dirty tree or a branch behind upstream is a warning in a dry run and a blocker for `--apply`. A failed upstream check is reported as "could not verify", never as "level".
- **Generated files**: skipped and listed.

---

## Technical Details

### Files Modified/Created

- `shared/resources/migrate-doc-numbering.mjs` - the six changes
- `shared/resources/doc-links.js` - `targetLine` on scanned links
- `shared/resources/tests/migrate-doc-numbering.test.mjs`, `doc-links.test.mjs` - tests for each change and its controls
- `shared/resources/tests/fixtures/security-probe/migrate-doc-numbering-guard-setup.sh` - fixture for the security probe
- `skills/*/references/` - regenerated bundled copies

### Architecture/Design Decisions

The multi-line fix uses the target's own line from the scanner, not the opening line. The behind-upstream check runs `git fetch --quiet --prune`, which updates remote-tracking refs only.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** `--apply` now exits with a blocker on a dirty or behind checkout.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit and integration tests:** in `shared/resources/tests/migrate-doc-numbering.test.mjs` and `doc-links.test.mjs`, including real temporary git repositories with a second clone as the upstream.
- **Mutation proof:** every fix is reverted and a named test goes red (`task.253.review.2.mutation-proof.md`).

### Code Review

- **QA gates:** CONCERNS (90), CONCERNS (90), PASS (100)
- **PR review:** CONCERNS, no coverage finding
- **CI:** all six checks green on the pushed head

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] `--root` and `--name` containment probed (19 candidates, none reproduced)
- [x] `--apply` repository-state guard probed (3 candidates), mutation-proven
- [x] git spawned with argument arrays; fetch bounded by a timeout

### Compliance Review

Not applicable: an internal developer CLI with no personal data, payments or UI.

---

## Documentation

- [x] `CHANGELOG.md` updated
- [x] Script header documents the new warning codes

---

## Known Limitations & Future Work

- The `review-prd` SKILL.md prose does not yet mention the new `--apply` refusal.
- The fetch does not set `GIT_TERMINAL_PROMPT=0`.
- The read-once test does not exercise the post-apply link path.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
