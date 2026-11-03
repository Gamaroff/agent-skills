# Sprint Review Summary: Task 250

**Task:** Security-probe tests write no scratch files into the repository
**PR:** [#813](https://github.com/Gamaroff/agent-skills/pull/813) → `develop`
**Accepted:** 2026-11-03 · **Gate:** CONCERNS 90/100, residual accepted by the user · **QA cycles:** 5

---

## Summary

`security-probe.test.mjs` created 13 scratch directories, files and symlinks inside the live repository. A parallel suite that walks the tree could see a half-deleted file and fail at random. That is the flake behind obs #145. Every one of these sites now builds a disposable temp root under `tmpdir()` and passes it to the engine as `repoRoot`. A guard test fails the suite if anyone writes into the repository again.

## Success Criteria Met

All 9 criteria are met. Criterion #4 (runtime) was re-measured on the PR head during `/finalise`: −0.5% (base 31.35 s, head 31.18 s). Criterion #7 was graded from CI, which was green on `38aa837b` across 6 checks.

## Key Features

- **One root builder.** `fenceRoot` was generalised (copy, prefix, build), and `t140Libs` and `saRoot` are thin wrappers around it. `fenceRoot` refuses a root inside the repository and removes its root when the build throws.
- **The guard has a runtime half and a static half.**
  - Runtime: the `fenceRoot` refusal.
  - Static: a code-only scan of the test file for any write call whose path is built from `REPO_ROOT`.
  - The scan fails loudly when it cannot parse a call, and it pins every name it hides to an exact allow-list.
- **The dead `.t140-*` `.gitignore` rule is removed**, now that nothing writes there.

## Testing & QA

- 277/277 tests pass. Hosted CI is green on the acceptance-decision head.
- The watched run (`inotifywait` on the test and fixture trees) saw 61 create events before the change and **0** after.
- A before/after `git status --porcelain --untracked-files=all --ignored` was calibrated on a planted file, then came back identical across a full suite run.
- Every QA fix was mutation-proven, and the guard went red on the pre-change file and on a one-site mutation.

## Security

Not a boundary. The predicates read this test file's own source or their own `mkdtemp` result, and no caller chooses their input. No secrets, no unsafe exec/eval, no dependency change.

## Impact

Parallel test runs no longer race against security-probe scratch files. `tests/fixtures/shell-fn/` and the repository root stay clean during and after a run.

## Known Limitations

1. **The static guard is a heuristic tokenizer, not a parser.** Two misreads remain. The user accepted both as known limits, and both are recorded in `t250CodeOnly`'s doc comment:
   - a nested template literal (TASK-250-CR5-1);
   - a phantom regex holding a quote (TASK-250-CR5-2).

   Neither shape is in the file. The fix that closes the class is a parser-backed scan (`acorn`), which is follow-up work.
2. **The QA loop hit its 5-gate limit.** Each cycle found the next construct the tokenizer misread, which is why a heuristic guard of this kind should be built on a parser from the start.
3. **5 pre-existing create-before-`try` sites on `develop`** can leak a temp root on a throw. They are out of scope and were noted in gates 2–5.
4. **zsh is not installed on the development laptop**, so `ci-tool-skips` fails locally under `CI=true`. Hosted CI installs zsh.
