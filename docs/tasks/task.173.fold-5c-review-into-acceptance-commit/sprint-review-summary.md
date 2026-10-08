# Sprint Review Summary - Fold the 5c review and its doc-only fixes into the acceptance commit

**Story/Task ID:** task.173
**Completed Date:** 2026-10-08
**Completed By:** develop-task pipeline (operator: gamaroff)
**Pull Request:** [#613](https://github.com/Gamaroff/agent-skills/pull/613)

---

## Summary

The develop pipelines' Step 5c PR review no longer gets its own pushed commit. On `APPROVE` or
`CONCERNS`, the review report is staged rather than committed, and so are any doc-only fixes the
review asked for. `/finalise`'s acceptance commit (6a) then carries them. A run pushes one commit
fewer and starts one CI run fewer. The two other commits on the path to acceptance, `/finalise` 8a's
fix commit and the PreCompact pause commit, now commit only their own paths, so they cannot sweep
the staged set into the wrong commit.

## What Was Delivered

### Acceptance Criteria Met

- [x] A doc-only `CONCERNS` run pushes no commit between the last QA push and 6a (AC1, AC6, AC7)
- [x] The 6a commit carries the review report and doc fixes, and its message says so (`; 5c review carried`) (AC2)
- [x] 8a commits only `touched` and leaves the 5c set staged; `--git-base` still licenses the push (AC3)
- [x] The PreCompact pause commits only the implementation report (AC4)
- [x] A non-doc `CONCERNS` finding is recorded, not fixed (AC5)
- [x] Mutation outcomes are recorded for every behaviour and fix, in the task's Mutation-proof ledger (AC8)
- [x] CI green, validate and bundle clean, CHANGELOG entry present, doc-only rule stated once (AC9–AC11)

### Key Features Implemented

- **5c carry**: a classify block, then a stage block, in `develop-pipeline-step-5-6-qa-loop.md` §5c. A
  finding's `ref` may be fixed at 5c only when it names exactly one tracked, clean documentation
  file, read literally.
- **Path-limited commits**: 8a uses `git commit -- <touched>`, and the pause hook uses
  `git commit -- <report>`.
- **Resume**: the working-tree probe sets the staged 5c set aside instead of halting on it.
- **Hardening found by QA and the DoD**: control characters are never documentation (`isDocsPath`).
  Every git call in the 5c blocks is `--literal-pathspecs`. Untrusted output is printed with
  `printf`. The resume probe matches git's own spelling of a path.

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/finalise/SKILL.md`,
  `shared/resources/develop-pipeline-on-precompact.sh` (and its test),
  `develop-pipeline-{step-7-finalise,step-8-commit,hooks,pause,resume-contract}.md`
- `shared/resources/ci-tree-equivalence.js` and its test (the control-character guard),
  `docs/reference/configuration.md`, `CHANGELOG.md`
- New: `shared/resources/tests/acceptance-commit-carries-5c.test.mjs` (48 cases under bash and zsh)
- Bundled copies regenerated under `skills/*/references/`

### Architecture/Design Decisions

- **Staged, not committed.** A local commit at 5c would move `HEAD` past the pushed head that
  `/finalise` CI reading 1 is taken against.
- **An allow-list, not deny rules.** A `ref` clears only when it names exactly one literal tracked
  file. This closed the predicate-versus-git disagreements (NUL, pathspec magic, globs) as one class.

### Dependencies

- Reuses task.172's `readConfig` and `isDocsPath` for the one definition of "documentation".

## Testing & Quality Assurance

### Test Coverage

- 48 committed cases in `acceptance-commit-carries-5c.test.mjs`, plus SEC-5 in `ci-tree-equivalence.test.mjs` and precompact scenario 17
- Final fast gate: 5,560 pass, 0 fail. CI is green on the acceptance head.

### Code Review

- 10 QA cycles (gate 10: PASS 100) and two 5c PR reviews (CONCERNS, then APPROVE)
- DoD runs 1–4 found gaps, each resolved. Run 5 accepted.

## Security & Compliance

### Security Review

- PASS. `isDocsPath` was probed by the engine (104 cases; persisted cases file). The 5c fenced git-state arms are beyond any engine form, and were accepted by recorded human override citing the 48-case suite.
- One pre-existing LOW (`isDocsPath` accepts a `.git` segment) predates this task, as `origin/develop` shows. It fails closed in the 5c path, and goes to a follow-up.

### Compliance Review

- NOT_APPLICABLE: no personal, payment, UI or health data.

## Documentation

### Updated Documentation

- The step-5-6 §5c carry subsection, finalise 6a/8a, the hooks, pause, resume-contract, step-7 and step-8 docs, `configuration.md`, and the CHANGELOG `[Unreleased]` entries (two Changed, two Fixed)

### Documentation Links

- [Task document](./task.173.fold-5c-review-into-acceptance-commit.md)
- [DoD run 5](./task.173.dod.5.fold-5c-review-into-acceptance-commit.md)

## Demo Notes

### How to Verify

1. Run `command node --test shared/resources/tests/acceptance-commit-carries-5c.test.mjs` (48/48)
2. On the next develop run with a doc-only `CONCERNS` verdict, the acceptance commit's message ends `; 5c review carried`, and no separate 5c commit exists

## Impact & Value

### User Impact

- One fewer pushed commit and one fewer CI run per work item that reaches 5c

### Technical Impact

- The 5c carry treats a review `ref` as untrusted input, by allow-list

## Known Limitations & Future Work

### Current Limitations

- CI installs no zsh, so the zsh-only regression pins run only locally (CR10-3)

### Suggested Follow-Up Stories

- Install zsh in `test.yml` (CR10-3)
- `isDocsPath`: refuse a `.git` path segment (pre-existing LOW)
- Advisory: CR9-1 (read patterns at `HEAD`), CR9-3 (index-aware clean test), CR10-1 and CR10-2 (resume-probe edge cases), CR8-2 (symlinks)
- Pipeline rules: obs #297–#300 (multi-file refs, the QA/DoD boundary disagreement, persisted probe cases, route 2c at MEDIUM 0)
