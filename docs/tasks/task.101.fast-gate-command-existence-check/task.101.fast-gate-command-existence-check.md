---
id: task.101
title: "[Task 101] develop.fastGateCommand defaults to a script consumers need not have, and fails mid-loop when they don't"
type: task
description: "The develop loop's fast gate defaults to `npm run ci:fast`. A consumer without that script does not find out at startup — it finds out at the first gate invocation, mid-iteration, at which point a substitute gets invented under time pressure and the gate silently stops being reproducible between runs. Observed on a consumer where neither `ci:fast` nor prettier exists."
tags: [develop-pipeline, configuration, fail-fast]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-08
updated: 2026-09-10
github_issue: 370
assignee:
estimated_effort_hours: 2
---

# Technical Task: fail fast on a missing `fastGateCommand`

**Status:** Ready for Review
**GitHub Issue**: [#370](https://github.com/Gamaroff/agent-skills/issues/370)
**Review**: ✅ All review recommendations from `task.101.review.1.fast-gate-command-existence-check.md` implemented 2026-09-10

---

## 1. Overview

`shared/resources/develop-pipeline-step-3-develop-loop.md` documents `develop.fastGateCommand`,
defaulting to **`npm run ci:fast`** — "the project's cheap CI-equivalent: formatting plus the
hermetic suite".

On tinker-city, **`ci:fast` does not exist**. Neither does `ci`. There is also no prettier, so the
default's formatting half has nothing to run either.

## 2. Motivation

The problem is the **timing and the silence**, not the default value.

A consumer without the script does not learn this at startup. The loop reaches its first gate
invocation, mid-iteration, and dies with `Missing script: ci:fast`. What happens next is the real
cost: the operator invents a substitute under time pressure. On the observed run (tinker-city
task.103) the substitution was invented per-run, so **it differed from what the next run would have
used** — the gate quietly stopped being reproducible, and nothing recorded that it had.

A default cannot know a consumer's script names. It *can* refuse to start when it is wrong.

## 3. Technical Background

The fast gate is the per-iteration tier; the slow tier is `developNext.qualityGateCommand`, run once
at the merge gate. The split is deliberate and documented — paying the slow tier per iteration is
what makes a correct fix feel expensive enough to revert. None of that changes here.

## 4. Scope

**In scope**

- A precondition in the *"What the loop runs — the fast gate"* subsection of
  `shared/resources/develop-pipeline-step-3-develop-loop.md`, placed **above** the *"Output Capture
  Pattern"* block and run once, **before the loop's first iteration** — not inside the per-iteration
  capture block, which would re-run it on every pass.
- A HALT with an actionable message naming the config key.
- A documentation change: present `npm run ci:fast` as a **suggested value for required
  configuration**, not as a default that works everywhere.

**Out of scope**

- The fast/slow tier split.
- `developNext.qualityGateCommand`.
- Choosing a replacement value for any consumer — that is the consumer's decision, which is the
  whole point.

## 5. Breaking Changes

**Behavioural, and intended.** A consumer whose `fastGateCommand` does not resolve currently fails
mid-loop; after this it fails at startup with an instruction. Any consumer that was silently relying
on a hand-substitution each run will be told to write it down.

## 6. Implementation Plan

- [x] **Phase 1** — add the resolve check (draft below) to the fast-gate subsection.
- [x] **Phase 2** — reword the default's presentation from "defaults to" to "required; suggested
      value", and say why a default cannot be assumed to exist.
- [x] **Phase 3** — `npm run bundle`; commit regenerated `references/`.

Draft check:

```bash
# Bind the configured value to a shell variable FIRST. The surrounding document
# writes the gate as the placeholder `<fastGateCommand>`, which the agent substitutes;
# a bare `$fastGateCommand` is an UNSET variable, and an unset variable makes the
# extraction below yield nothing, which makes the check skip — a vacuous pass that
# looks identical to a correct one.
FAST_GATE_COMMAND="<fastGateCommand>"

# `npm run` with no arguments lists the scripts the consumer actually defines,
# each on its own line indented by two spaces.
GATE_SCRIPT=$(printf '%s' "$FAST_GATE_COMMAND" | sed -nE 's/^npm run ([A-Za-z0-9:_-]+).*/\1/p')
if [ -n "$GATE_SCRIPT" ] && ! npm run 2>/dev/null | grep -qE "^[[:space:]]+${GATE_SCRIPT}$"; then
  echo "HALT: develop.fastGateCommand runs '${GATE_SCRIPT}', which this project does not define."
  echo "      Set develop.fastGateCommand in skills-config.yaml to this project's cheap CI-equivalent."
  exit 1
fi
```

**What the extraction does and does not claim.** The `sed` matches only a command that *begins*
`npm run <script>`, and the character class deliberately excludes `.` and `/` so nothing that reaches
`grep -E` can be a regex metacharacter. Three consequences, all intended:

- `npm run ci:fast --silent` → extracts `ci:fast`; checked.
- `npm run ci:fast && npm run lint` → extracts `ci:fast`, the **first** script only; checked. The
  gate's first component is the one that must exist for the command to get off the ground.
- `prettier --check . && jest`, `make test`, `pnpm run ci:fast`, `npm test` → extract **nothing**;
  the check is skipped. Skipping is the correct answer for a command whose shape this check cannot
  reason about — guessing would HALT correct consumers.

**HALT rather than substitute.** Choosing a replacement gate is a project decision with a correctness
consequence — it decides what every iteration is checked against — and it belongs in
`skills-config.yaml`, where the next run reads the same value.

## 7. Files Summary

**Modified — authoring sources**

- `shared/resources/develop-pipeline-step-3-develop-loop.md` — the precondition (Phase 1) plus the
  reworded default (Phase 2)
- `docs/reference/configuration.md` — the `develop.fastGateCommand` yaml example and key-table row
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — qa-fix cycle, same key restated
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` — **skill-native, no shared
  source**; the verify cycle restates the key and would otherwise be the one site left saying
  "defaulting to"
- `skills/develop/SKILL.md` — the `/develop` skill's own copy of the fast-gate paragraph
- `skills/develop-next/SKILL.md` — the slow-tier note that names the fast tier's default

**Added**

- `evals/shared/tests/fast-gate-precondition.test.mjs` — extracts the fenced block from the loop
  document and executes it against fixture projects in `bash` and `zsh`

**Modified — repo guards the new content tripped**

- `tests/executable-instructions.test.js` — classified `lint` as consumer-provided (it appears only
  as the second half of an illustrative compound gate), and narrowed the `npm run` scanner so an
  all-digit token immediately followed by `>` is read as the fd redirect it is rather than as a
  script named `2`. New `isFdRedirect` unit test asserts both directions.

**Modified — regenerated by `npm run bundle` (Phase 3)**

- `skills/{develop-task,develop-story,develop-bug}/references/develop-pipeline-step-3-develop-loop.md`
- `skills/{develop-task,develop-story}/references/develop-pipeline-step-5-6-qa-loop.md`

> The five authoring sites beyond the two the original plan named were found by
> `git ls-files | grep -v '^skills/[^/]*/references/' | xargs grep -ln 'ci:fast'`. Rewording only
> the step-3 document would have left four live documents still calling `npm run ci:fast` a default,
> which is the drift this repository's own notes warn about: consumer-facing docs restate pipeline
> behaviour independently and diverge silently.

## 8. Testing Strategy

The snippet is runnable prose, so `qa-task` Step 4b will execute it under `bash` and `zsh`. Cases:

- a script that **exists** → no HALT (anti-vacuity: without this the check could reject everything)
- a script that **does not** → HALT, message naming the key
- a **non-npm** command (`prettier --check . && jest`, `make test`, `pnpm run ci:fast`, `npm test`) →
  the `sed` extracts nothing, so the check is skipped rather than guessing. Assert it does not HALT
- a **compound command that begins `npm run <script>`** (`npm run ci:fast && npm run lint`) → the
  `sed` extracts the **first** script and checks it. Assert it HALTs when that first script is
  missing and does not when it exists. This is deliberately *not* the "extracts nothing" case: the
  command does begin with a resolvable `npm run`, and skipping it would forfeit the check on the
  most common compound shape
- an **empty or unset** `FAST_GATE_COMMAND` → extracts nothing, skips. Assert this explicitly: it is
  the vacuous-pass shape, and a test suite that never binds the variable would pass every other case
  for the wrong reason
- `npm run` output format differs between npm majors — verify the `grep -E` against the installed npm
  before relying on it. Verified against npm 11.17.0: script names are listed one per line, indented
  by exactly two spaces, under a `Lifecycle scripts included in …:` / `available via \`npm run-script\`:`
  header, and `npm run` exits 0

## 9. Success Criteria

1. [x] A consumer with a missing `fastGateCommand` script HALTs **before** the first iteration.
2. [x] The HALT message names `develop.fastGateCommand` and `skills-config.yaml`.
3. [x] A compound or non-npm command is left alone, not guessed at.
4. [x] The document no longer implies `npm run ci:fast` exists everywhere.
5. [x] Both shells agree (Step 4b).

## 10. Risk Assessment

**Low**, with one named hazard: a check that mis-parses `npm run` output would HALT every consumer,
including correct ones. That is why the extraction is narrow (first `npm run <script>` token only)
and why "extracted nothing" means *skip*, not *fail*. The fail-safe direction here is the opposite of
the QA-loop exit's (task.99), and deliberately so: a false HALT is loud and instantly diagnosable,
whereas a false skip returns to today's silent mid-loop death.

## 11. Rollback Plan

Delete the check; `npm run bundle`.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-08 | 0.1 | Filed after a consumer run hit `Missing script: ci:fast` mid-loop and the substitution was invented per-run, so the fast gate silently differed between runs. | Claude |
| 2026-09-10 | 0.2 | Review passed (8/10) — linked GitHub issue #370; bound `FAST_GATE_COMMAND` explicitly in the draft check (a bare `$fastGateCommand` is unset and skips vacuously); corrected §8, which claimed a compound command extracts nothing when one beginning `npm run` extracts its first script; made the check's placement in the step-3 document concrete. | review-task |
| 2026-09-10 |  | Status → ready-for-development | review-task |
| 2026-09-10 |  | Implemented — 12 files, 10 tests | develop |

## Progress Tracking

**Complete — 2026-09-10.** All three phases done, all five success criteria met. Fast gate
(`npm run ci:fast`) **green**: 3033 passing, 0 failing.

The consumer that surfaced this had already set the key explicitly (tinker-city PR #830), so it no
longer depended on the fallback — this closes it for the next consumer.

### Implementation summary

The precondition is runnable prose in the develop loop's fast-gate subsection, placed above the
Output Capture Pattern so it runs once rather than per iteration. It extracts the script name from a
command beginning `npm run <script>`, checks it against `npm run`'s own listing of the project's
scripts, and HALTs naming `develop.fastGateCommand` and `skills-config.yaml` when it does not
resolve. Anything it cannot parse is **skipped**, never failed.

Two corrections were made to the drafted check during review, both material:

1. The draft dereferenced `$fastGateCommand`, which is bound nowhere. An unset variable extracts
   nothing, which skips the check — a pass indistinguishable from a correct one, in a snippet
   `qa-task` Step 4b executes. The block now binds `FAST_GATE_COMMAND="<fastGateCommand>"` first.
2. §8 claimed a compound command extracts nothing. Executed, `npm run ci:fast && npm run lint`
   extracts `ci:fast`. The snippet's behaviour is the better one — the first component must exist for
   the command to run at all — so §8 was corrected rather than the snippet.

### Testing results

`evals/shared/tests/fast-gate-precondition.test.mjs` — **10/10 passing**. It extracts the fenced
block from `shared/resources/develop-pipeline-step-3-develop-loop.md` and runs it against throwaway
fixture projects, so what is tested is behaviour rather than the presence of a string. Both shells
are covered, satisfying success criterion 5. The file lands under `evals/shared/tests/*.test.mjs`,
which `npm test` already globs — no `package.json` change was needed, and none was made.

**Mutation-proved.** Each mutation was applied to the document, the suite run, and the document
restored:

| Mutation | Expected red | Observed |
| --- | --- | --- |
| `exit 1` → `exit 0` (no HALT) | the HALT cases | 6 fail / 4 pass — skip cases correctly stayed green |
| `sed` pattern made unmatchable | the HALT cases | 5 fail / 5 pass |
| `[ -n "$GATE_SCRIPT" ]` guard removed | the **skip** cases only | 2 fail / 8 pass — the fail-safe inversion isolated exactly |
| `FAST_GATE_COMMAND="$fastGateCommand"` (the pre-review defect) | the HALT cases | 5 fail / 5 pass |

The fourth is the one worth keeping: it demonstrates that the review's variable-binding fix is
load-bearing, and that the drafted snippet would have passed vacuously.

## References

- `shared/resources/develop-pipeline-step-3-develop-loop.md` — the fast-gate subsection
- tinker-city `skills-config.yaml` — the explicit value, with the reasoning in a comment

## Notes

Companion findings from the same run: **task.99** (QA loop diminishing-returns exit) and
**task.100** (mutation-proving false RED).
