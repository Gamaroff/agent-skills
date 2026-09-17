# Sprint Review Summary - Four authoring rules the corpus already obeys by accident

**Story/Task ID:** task.119
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-17
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#420](https://github.com/Gamaroff/agent-skills/pull/420)

---

## Summary

Four authoring rules that the skill corpus obeyed only by accident are now written down where authors read, and the two that can be checked mechanically are guarded by tests: a guard against shell positional-parameter tokens in a `SKILL.md`'s fenced bash (the harness substitutes them on invocation), and a bundler warning plus guard for `shared/resources/` paths that live only in a `.js` comment (the bundler follows them anyway).

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The guard runs under `npm test` and CI, has a floor (50 of 485 blocks), and every allowlist entry must carry a reason
- [x] `create-skill` states the three rules with their failure modes; `qa-task` Step 4b states its from-disk limit
- [x] `bundle_skill.py` warns on a comment-only origin; `tests/bundle-comment-origin.test.js` asserts the live tree has none
- [x] `create-task` gains §1.2 "One task or several?" with the three seams and the registry-note obligation
- [x] Observations #23, #24, #36, #39 closed naming PR #420

### Key Features Implemented

- **Phase 0 harness probes**: three throwaway skills established empirically that only the invoked `SKILL.md` is rendered (a Read-loaded reference arrives verbatim), that substitution is zero-indexed and leaves tokens past the argument count alone, that a backslash escape survives delivery but breaks on-disk awk, and that `${N}` / `$(N)` are safe in both places. The guard's scope and regex were derived from those findings, not guessed.
- **`tests/fenced-bash-positional-params.test.js`**: stack-based fence reader (nested template fences cannot hide a real block; fence-shaped lines inside a runnable block are content), per-opener line-level coverage assertion, reason-checked allowlist. 22 shipped hits across 12 skills rewritten to equivalent token-free forms, each verified under bash and zsh.
- **`bundle_skill.py` comment-origin warning** + `// bundle-dependency: shared/resources/X` declaration form; `tests/bundle-comment-origin.test.js` proves the warning fires on a fixture and that the live tree has no undeclared origin. 12 live comment sites resolved.
- **Rules where authors read**: `create-skill` § *Three Rules the Corpus Learned by Failing* (token-free, with the literal table in Read-loaded `references/runnable-prose.md`), `qa-task` 4b limit, `create-task` §1.2, coding-standards § Cross-skill resources.

---

## Technical Details

### Files Modified/Created

- `tests/fenced-bash-positional-params.test.js` - new guard (§1–§5)
- `tests/bundle-comment-origin.test.js` - new guard (§1a–§1c fixture, §2 live tree, §3 allowlist)
- `skills/create-skill/scripts/bundle_skill.py` - `comment_only_refs()`, `warn_comment_only_refs()`, per-origin dedupe
- `skills/create-skill/SKILL.md`, `skills/create-skill/references/runnable-prose.md` - the three rules and the evidence table
- `skills/create-task/SKILL.md` - §1.2 One Task or Several?
- `skills/qa-task/SKILL.md` - Step 4b from-disk limit
- 12 `SKILL.md` files (22 sites) - `awk '{print $(2)}'`, `${1}…${4}`, `$(dirname "${0}")`, `20 USD`
- `shared/resources/defer-mutation.js` - two `bundle-dependency:` declarations; 9 shared tests + 5 skill scripts/tests - comment paths → bare filenames
- `skills/develop-next/references/document-status-lifecycle.md` - removed (orphaned vendored copy)
- `docs/architecture/concepts/coding-standards.md`, `CHANGELOG.md`

### Architecture/Design Decisions

- The rule about positional tokens is written **without the tokens** in the rendered `SKILL.md`, because the file is rendered on invocation and a rule that spelled them out would be corrupted by the mechanism it describes; the literal table lives in a Read-loaded reference.
- Escaped tokens (`\$N`) are tolerated by the guard but not recommended: delivery-safe, disk-unsafe inside awk.
- Self-references (a file naming its own shared path) are excluded from the comment-origin rule by definition rather than allowlisted.
- The comment-origin guard scans a deliberate superset of the bundler's discovery scope (all of `shared/resources/**`), because a file the bundler does not read today becomes a live origin the day something references it.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none — consumers of `bundle_skill.py` see one new warning line per comment-only origin; nothing is refused

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 10 tests across the two new guard files; `npm run ci:fast` 3410 pass / 0 fail / 1 skipped
- **Mutation proofs:** reintroduced token → guard red naming the line; reintroduced commented path → guard red naming the line; original CommonMark-style reader reinstated → §5 red naming the unscanned lines; nested push restored → §4 red
- **Equivalence:** every rewritten shell/awk form executed against the original under bash and zsh with identical output

### Code Review

- **Reviewers:** three QA cycles (`/qa-task` with `code_review_blocking`), cycle 2 a full-diff refute pass; Step 5c `/review-pr --effort medium`
- **Approval Status:** ✅ APPROVE (5 low findings; three reconciled in `9dfc8586`, two follow-ups)
- **Review Comments Addressed:** cycle 1 CR-1/2/3 and cycle 2 CR-4/5/6 all fixed and independently verified

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets introduced (grep over all 49 changed files)
- [x] No new unsafe patterns (`execFileSync` with an argv array on test-owned constants only)
- [x] No security TODOs/FIXMEs
- [x] No dependency changes
- [x] Boundary decision recorded: `boundary: false` — no accept/reject function on a probe sink

### Compliance Review

⚠️ **NOT_APPLICABLE** — no data collection, payments, UI or healthcare surface.

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` Unreleased → Added (task 119)
- [x] `create-skill`, `create-task`, `qa-task` SKILL.md; `create-skill/references/runnable-prose.md`
- [x] `docs/architecture/concepts/coding-standards.md` § Cross-skill resources
- [ ] README — not applicable (no command or flag changed)

### Documentation Links

- `docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md`
- `skills/create-skill/references/runnable-prose.md`

---

## Demo Notes

### How to Verify

1. `node --test tests/fenced-bash-positional-params.test.js` — 5 pass; add `$2` inside any fenced bash block of a `skills/*/SKILL.md` and re-run: §2 names the file and line.
2. `node --test tests/bundle-comment-origin.test.js` — 5 pass; change a `// bundle-dependency: shared/resources/x` line in `shared/resources/defer-mutation.js` to `// see shared/resources/x` and run `python3 skills/create-skill/scripts/bundle_skill.py --check`: one `⚠️ comment-only reference` line; the guard's §2 names it.
3. Read `skills/create-skill/SKILL.md` § *Three Rules the Corpus Learned by Failing* and `skills/create-task/SKILL.md` §1.2.

### Screenshots/Visuals

n/a

---

## Impact & Value

### User Impact

A skill author can no longer ship a fenced block that the harness will corrupt on delivery, or move a commented constant into a widely bundled file without being told what it drags along — and the "one task or several?" decision that three authors had each re-derived into the registry is now made where the task document is written.

### Technical Impact

Two hazards that every existing gate was blind to (render-time corruption; comment-born bundle churn) become authoring-time test failures. Bundle graph unchanged by the comment rewrites; one orphaned vendored copy removed.

---

## Known Limitations & Future Work

### Current Limitations

- The comment-origin classifier treats only lines that *begin* with a comment marker as comment-only; a trailing `code; // see shared/resources/x` or an asterisk-less `/* */` interior line is followed by discovery without a warning (5c CR-1, low).
- The comment-origin guard re-implements the Python classifier in JavaScript and nothing asserts the two agree (5c CR-2, low).
- §5's opener regex ends in `\b`, so a `bash-x`-style info string would count as runnable while `runnableLines()` does not — latent, no live instance (QA cycle 3).

### Suggested Follow-Up Stories

- Extend the comment-origin classifier to trailing and block-interior comments; prove JS/Python parity over one fixture.
- 12 skills carry bundled `references/` copies that no discovery rule reaches (kept alive by `source_backed_on_disk()`); `--check` has no UNREACHED class — file as an observation.
- Optional: cross-reference the comment-path rule from `AGENTS.md` § Shared Resources.

---

## Metrics _(if applicable)_

- **Story Points:** — (estimated 5 h)
- **Time to Complete:** 1 session, 3 QA cycles
- **Lines of Code Changed:** +2,583 / −544 (59 of 94 files are regenerated bundle copies)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
