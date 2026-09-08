---
id: task.101
title: "[Task 101] develop.fastGateCommand defaults to a script consumers need not have, and fails mid-loop when they don't"
type: task
description: "The develop loop's fast gate defaults to `npm run ci:fast`. A consumer without that script does not find out at startup — it finds out at the first gate invocation, mid-iteration, at which point a substitute gets invented under time pressure and the gate silently stops being reproducible between runs. Observed on a consumer where neither `ci:fast` nor prettier exists."
tags: [develop-pipeline, configuration, fail-fast]
category: infrastructure
status: draft
priority: Medium
risk_level: low
created: 2026-09-08
updated: 2026-09-08
assignee:
estimated_effort_hours: 2
---

# Technical Task: fail fast on a missing `fastGateCommand`

**Status:** Draft

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

- A precondition in the *"What the loop runs — the fast gate"* subsection, checked **before the first
  iteration**.
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

- [ ] **Phase 1** — add the resolve check (draft below) to the fast-gate subsection.
- [ ] **Phase 2** — reword the default's presentation from "defaults to" to "required; suggested
      value", and say why a default cannot be assumed to exist.
- [ ] **Phase 3** — `npm run bundle`; commit regenerated `references/`.

Draft check:

```bash
# `npm run` with no arguments lists the scripts the consumer actually defines.
GATE_SCRIPT=$(printf '%s' "$fastGateCommand" | sed -nE 's/^npm run ([A-Za-z0-9:_-]+).*/\1/p')
if [ -n "$GATE_SCRIPT" ] && ! npm run 2>/dev/null | grep -qE "^[[:space:]]+${GATE_SCRIPT}$"; then
  echo "HALT: develop.fastGateCommand runs '${GATE_SCRIPT}', which this project does not define."
  echo "      Set develop.fastGateCommand in skills-config.yaml to this project's cheap CI-equivalent."
  exit 1
fi
```

**HALT rather than substitute.** Choosing a replacement gate is a project decision with a correctness
consequence — it decides what every iteration is checked against — and it belongs in
`skills-config.yaml`, where the next run reads the same value.

## 7. Files Summary

- `shared/resources/develop-pipeline-step-3-develop-loop.md`
- `docs/reference/configuration.md` — the `develop.fastGateCommand` entry
- `skills/*/references/develop-pipeline-step-3-develop-loop.md` — regenerated

## 8. Testing Strategy

The snippet is runnable prose, so `qa-task` Step 4b will execute it under `bash` and `zsh`. Cases:

- a script that **exists** → no HALT (anti-vacuity: without this the check could reject everything)
- a script that **does not** → HALT, message naming the key
- a **compound** command (`a && b`) and a **non-npm** command → the `sed` extracts nothing, so the
  check is skipped rather than guessing. Assert it does not HALT on either
- `npm run` output format differs between npm majors — verify the `grep -E` against the installed npm
  before relying on it

## 9. Success Criteria

1. [ ] A consumer with a missing `fastGateCommand` script HALTs **before** the first iteration.
2. [ ] The HALT message names `develop.fastGateCommand` and `skills-config.yaml`.
3. [ ] A compound or non-npm command is left alone, not guessed at.
4. [ ] The document no longer implies `npm run ci:fast` exists everywhere.
5. [ ] Both shells agree (Step 4b).

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

## Progress Tracking

Not started. The consumer that surfaced this has since set the key explicitly (tinker-city PR #830),
so it no longer depends on the default — but the next consumer will.

## References

- `shared/resources/develop-pipeline-step-3-develop-loop.md` — the fast-gate subsection
- tinker-city `skills-config.yaml` — the explicit value, with the reasoning in a comment

## Notes

Companion findings from the same run: **task.99** (QA loop diminishing-returns exit) and
**task.100** (mutation-proving false RED).
