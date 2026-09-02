# Sprint Review Summary — Task 67

**Task**: Make QA execute a prose skill, not only read it
**PR**: [#289](https://github.com/Gamaroff/agent-skills/pull/289)
**Status**: Accepted — 2026-09-01
**QA Gate**: PASS (90/100), 2 QA cycles

---

## Summary

QA read a skill's documented shell snippets and never ran them. It now runs them.

`qa-task` gains **Step 4b** and `qa-story` gains **Phase 1.7**: when a change set adds or modifies a
`SKILL.md` or a `shared/resources/*.md` prompt containing fenced ```bash blocks, the documented blocks
are extracted, classified, and executed under **both `bash` and `zsh`**, with disagreements reported as
findings.

## Why it exists — the evidence, not a hypothetical

Task 66 (`/review-pr`) shipped `accepted` after two QA cycles, a DoD gate and forty passing contract
tests, carrying a multi-glob `ls` that collects its entire paper trail. Under zsh — the default macOS
shell — a glob matching nothing aborts the whole command:

| Shell | stdout lines | exit |
| --- | --- | --- |
| bash | 6 | 1 |
| zsh | **0** | 1 |

The exit codes **agree**. Only stdout separates a working block from a broken one, which is why the
stdout comparison is the load-bearing signal and is mutation-proved as such.

## What was delivered

| Kind | Path |
| --- | --- |
| Added | `shared/resources/qa-execute-snippets.mjs` — extraction, fail-closed classification, dual-shell execution; library + CLI |
| Added | `shared/resources/qa-runnable-prose-detection.md` — the rule, stated once |
| Added | `shared/resources/tests/qa-execute-snippets.test.mjs` — 66 tests |
| Added | `evals/shared/tests/qa-execution-step-parity.test.mjs` — 10 contract tests holding the prose trigger |
| Modified | `skills/qa-task/SKILL.md` (Step 4b), `skills/qa-story/SKILL.md` (Phase 1.7) |
| Modified | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — cross-reference only |
| Modified | `CHANGELOG.md` |

`package.json` deliberately unchanged — the existing test glob already collects the new suite.

## Testing & QA

- **2075 tests, 0 failures**; module suite 66 tests
- **21 mutation proofs** across the run, all held
- **36 attack inputs → 0 reach `runnable`**; 18 legitimate patterns → 0 refused
- CI green on the final head: `test`, `validate`, `link-check`, branch policy

## The story worth telling at review

**Every gate in the pipeline caught something the previous one had missed, and each miss was the same
shape: asking again the question that had already been answered.**

| Gate | Found |
| --- | --- |
| Step 2 review | The plan omitted `npm run bundle`; CI would have gone red. Two more findings pointed at files and headings that don't exist |
| Dogfooding during develop | 5 engine defects the unit tests missed, incl. `git` resolved fail-open |
| QA cycle 1 | **13 fail-open holes**; containment disproved with a canary written outside the temp copy — while the suite was green |
| QA cycle 2 | Confirmed all 13 closed |
| **DoD gate** | Red CI the local suite couldn't see; two criteria whose only evidence was prose; **14 further fail-open routes**, including two deny-listed commands reached through quoted spellings |

The task's own thesis — *a passing test is evidence about the test, not about the behaviour* —
reproduced itself at every level, including inside its own fix. Twice a mutation proof came back
**UNHELD** and both times it was telling the truth: once about dead code, once about a finding whose
stated mechanism was wrong.

## Known limitations, recorded rather than hidden

- The sandbox sentinel watches the sandbox root only. It catches a block escaping *upward*; it does not
  see a write to an absolute path. **Classification is the primary boundary**; the sentinel is a second
  line beneath it, not a containment guarantee.
- `awk` is refused outright — its program is a quoted argument the scanner cannot see. `awk '{print $2}'`
  is harmless and gets skipped. Accepted fail-closed cost.
- A command name with embedded quotes (`l's'`) is refused even when the underlying command is safe.
- Eight tests, including the task-66 regression fixture, skip silently on a host without `zsh`. CI runs
  `ubuntu-latest`. **Recommended follow-up: make zsh a declared CI prerequisite.**
- `execution-failure` remains `confidence: high` exactly as specified, which means a documented snippet
  ending in `grep` can block a PR. Left as an open question for whoever owns this gate.
