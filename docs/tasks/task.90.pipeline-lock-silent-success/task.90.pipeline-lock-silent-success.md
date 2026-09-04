---
id: task.90
title: "[Task 90] advance-pipeline-lock.sh reports success for an advance that did not happen"
type: task
description: "A zero-byte lock file passes the jq guard — jq on empty input emits nothing and exits 0 — so the script prints 'step 0 → 5', exits 0, and leaves the lock empty. Success is reported for a state transition that never occurred, in the pipeline's own state machine. Second, lower-severity defect in the same script: the $LOCK.tmp redirect follows a pre-existing symlink on a predictable path."
tags: [pipeline, shell, silent-failure, state-machine]
category: infrastructure
status: draft
priority: High
risk_level: medium
created: 2026-09-04
updated: 2026-09-04
assignee: TBD
estimated_effort_hours: 3
---

# Technical Task: `advance-pipeline-lock.sh` reports success for an advance that did not happen

**Status:** Draft

---

## 1. Overview

Found by the DoD security probe on task 77 (3029 executed probes), and **verified byte-identical on
`origin/develop`** — pre-existing, not introduced by that task, and deliberately left out of scope
there because task 77 had already reached Loop Escalation.

**Defect 1 — silent success on a zero-byte lock.** With `$PIPELINE_LOCK` a zero-byte file:

```bash
PIPELINE_LOCK=$T/lk bash shared/resources/advance-pipeline-lock.sh 5   # $T/lk is zero bytes
# prints: advance-pipeline-lock: step 0 → 5
# exits:  0
# leaves: $T/lk still zero bytes
```

`jq` on empty input emits nothing and exits **0**, so the `if ! jq` guard does not fire and `mv`
installs the empty file. The caller is told the pipeline advanced. It did not.

**Defect 2 — symlink follow on a predictable path.** The `> "$LOCK.tmp"` redirect follows a
pre-existing symlink at that path, writing the JSON through to the target before `mv`. Low severity —
`.claude/state/` is same-trust-domain — but it is an insecure temp file on a guessable name.

## 2. Why defect 1 is High

The lock is the pipeline's state machine, and every `develop-*` orchestrator advances it as the last
action of each step. A silent no-op that reports success is the worst shape a state-machine bug can
take: the run believes it moved, the resume path reads a step that was never written, and nothing in
the output distinguishes it from a real advance.

It also fails **closed on every other malformed input** — 18 executed `current_step` values (`null`,
absent, `"abc"`, `-3`, `3.7`, `1e400`, malformed JSON, non-JSON) all correctly preserve the lock and
exit non-zero. The zero-byte case is the single hole in an otherwise well-behaved validator, which is
why it survived: every neighbouring case is right.

## 3. Scope

In scope:

- Treat an empty or whitespace-only lock file as malformed: fail closed, exit non-zero, leave the
  lock untouched — matching the existing behaviour for every other malformed input.
- Harden the temp write: `mktemp` in the lock's directory, or `set -o noclobber` / an `O_EXCL`
  create, so the redirect cannot follow a symlink.
- Extend `shared/resources/advance-pipeline-lock.test.sh` with both cases, run under **bash and zsh**
  as the suite already does.
- Re-bundle: the script has **10 bundled copies** across `skills/*/references/`.

Out of scope:

- The step allow-list and the `1..8` validator, both verified fail-closed under 144 executed probes.
- Any change to what the lock records or how orchestrators call it.

## 4. Success Criteria

- [ ] A zero-byte lock file exits non-zero, leaves the file untouched, and prints no success line.
- [ ] A whitespace-only lock file behaves identically.
- [ ] A pre-existing symlink at `$LOCK.tmp` does not receive the write.
- [ ] Both cases covered in `advance-pipeline-lock.test.sh`, green under bash **and** zsh.
- [ ] Mutation-proved: revert each fix, confirm the new test goes red, restore.
- [ ] All 10 bundled copies refreshed and verified **by content** (the bundler prints `in sync` for stale transitive copies — see task 86).
- [ ] `npm run ci` exits 0.

## 5. References

- `shared/resources/advance-pipeline-lock.sh` — the guard at `:94-104`, the temp write, the validator at `:120-126`
- `shared/resources/advance-pipeline-lock.test.sh` — 14 tests, bash and zsh
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.dod.3.review-pr-in-pipeline.md` — Step 3, both probes with their reproductions
- `docs/tasks/task.86.bundle-transitive-refresh/` — why the bundled copies need content verification

## Change Log

| Date       | Version | Description                                                      | Author      |
| ---------- | ------- | ---------------------------------------------------------------- | ----------- |
| 2026-09-04 | 1.0     | Filed from task 77's DoD security probe — pre-existing on develop, out of scope there | create-task |
