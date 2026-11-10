# Sprint Review Summary - QA snippet classifier allow-list

**Story/Task ID:** task.294
**Completed Date:** 2026-11-10
**Pull Request:** [#874](https://github.com/Gamaroff/agent-skills/pull/874)

---

## Summary

The QA snippet classifier now runs a shell block only when every non-literal word is on a closed list, which closes the three indirect-evaluation shapes task 293 left open. Five documentation blocks that used to run are now refused, and nothing newly runs.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The three residual shapes classify `mutating`, each shown to write under real bash first
- [x] The control table of ordinary safe blocks stays `runnable`
- [x] The differential run writes nothing (old engine 10 writes in 5000 residual blocks, new engine 0)
- [x] Docs-scan median within +10% (408 ms before, 393 ms after)
- [x] Differential slice under 10 s (median 4189 ms)
- [x] Suite, formatting and bundle check green (392 tests; `bundle:check` 0 problems)
- [x] Every change mutation-proven, with the red tests named
- [x] The two gate-9 cleanups done and proven
- [x] `CHANGELOG.md` cites `(task 294)`
- [x] Every newly refused documentation block listed with its reason (256 runnable before, 251 now, 0 newly runnable)

### Key Features Implemented

- **Allow-list layer**: `allowListViolation` is the last layer of `classifyBlock`; a word it cannot classify fails closed, with a reason of the form `not-allow-listed: <class>`.
- **One linear sweep**: the first draft was quadratic (a 20000-deep nest took 59 s); the final one takes 155 ms.
- **Differential `residual` atom set**: the old engine writes in 10 of 5000 blocks, the new one in none, so the instrument is no longer blind to these shapes.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` — the allow-list layer
- `shared/resources/tests/qa-execute-snippets.test.mjs` — residual table run under real bash, controls, mutation-held refusals
- `scripts/qa-snippets-differential.mjs` — the `residual` atom set
- `shared/resources/qa-runnable-prose-detection.md` — new §2a-iii
- `CHANGELOG.md`, and the regenerated `skills/*/references/` copies (bundler output)

### Architecture/Design Decisions

An allow-list of forms and commands, rather than an evaluator-scoped deny-list (which scored 236 of 256 but is the deny-list shape task 293 spent nine gates on). The plan's first design refused every stored command substitution and broke real shipped blocks; measured under real bash and zsh, `[` and `test` evaluate no operand and only `[[` does, so the final rule refuses non-digit text only where bash evaluates it.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** five documentation blocks now classify `mutating` (a refused block is never executed)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 392 pass, 0 fail in `shared/resources/tests/qa-execute-snippets.test.mjs`; `ci:fast` on the LAN server 8371 pass, 0 fail
- **Security probe:** 31 candidates executed against `isRunnableBlock`, 0 reproduced, 0 escaped

### Code Review

- **Reviewers:** the QA code reviewer (diff) and the PR conformance review
- **Approval Status:** QA gate PASS (95/100); PR review CONCERNS with three document-only findings, all closed
- **Review Comments Addressed:** all

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Boundary probe: 31 executed, 0 reproduced, 0 escaped
- [x] No hardcoded secrets or unsafe patterns introduced
- [x] No dependency changes

Compliance (GDPR, PCI-DSS, WCAG, HIPAA): not applicable, an internal classifier.

---

## Documentation Updates

- `shared/resources/qa-runnable-prose-detection.md` §2a-iii
- `CHANGELOG.md` entry `(task 294)`

---

## Known Limitations and Future Work

git evaluating a plain-literal `-c` or `GIT_*` string classifies `runnable` and writes under bash. It is identical on the base branch and outside this task's word-shape scope, and is recorded in the QA gate's `recommendations.future`. Fixing it means giving `git` a subcommand and option allow-list; measure the cost on the documentation corpus first, because `git -c core.quotePath=false diff` appears in shipped blocks.
