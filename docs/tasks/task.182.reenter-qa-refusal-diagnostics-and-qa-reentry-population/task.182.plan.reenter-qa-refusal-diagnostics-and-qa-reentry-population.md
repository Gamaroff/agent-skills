---
id: task.182.plan
title: "Implementation Plan: reenter-qa refusal diagnostics and the qa_reentry reader population"
type: plan
task-ref: task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md
---

# Implementation Plan: reenter-qa refusal diagnostics and the `qa_reentry` reader population

> Requirements and success criteria: [task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md](task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)

## Overview

This plan makes two small edits to `reenter-qa-after-finalise.sh`. Both copy patterns the script already uses. It then adds `qa_reentry` to the two readers that were missed, and pins it in the lock-fields parity test. Tests come first.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests (red)

**`shared/resources/reenter-qa-after-finalise.test.sh`.** Add a case for each `no-gate` cause beside the existing `expect_refusal "no gate" no-gate` (line ~100). Each case builds its fixture and asserts two things: exit 1 with `refused (no-gate)`, and a stable fragment of `qa-cycle.sh`'s reason on stderr.

| Cause | Fixture | Fragment (from `qa-cycle.sh`) |
|---|---|---|
| no gate file | no `*.gate.*.yml` | `no gate file in` (`:102`) |
| unnumbered gate | `task.42.gate.example.yml` only | `carry no cycle number` (`:100`) |
| two gates, one cycle | `task.42.gate.3.a.yml` + `task.42.gate.3.b.yml` | `claim cycle 3` (`:125`) |

The existing `expect_refusal` helper may compare only the reason. If so, capture stderr in the case itself: `ERR=$( … 2>&1 >/dev/null )`, then `case "$ERR" in *"$frag"*) pass …`.

**The `git-unreadable` case.** Use a PATH stub that fails only on `status` and passes everything else through to the real git. That keeps the earlier `git` calls in the script working. The technique is the same as the failed-write case's `jq` stub at line ~283:

```bash
REAL_GIT=$(command -v git)
cat > "$STUB/git" <<EOF
#!/usr/bin/env bash
for a in "\$@"; do [ "\$a" = status ] && { echo "fatal: simulated" >&2; exit 128; }; done
exec "$REAL_GIT" "\$@"
EOF
chmod +x "$STUB/git"
```

Assert three things: exit 1 with `refused (git-unreadable)`; the lock is not lowered (no lock file, or the step-7 lock unchanged); the snapshot still exists.

**`evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.**
- Add `reenterScript: "shared/resources/reenter-qa-after-finalise.sh"` to `FILES` (line 46) if it is not already present.
- Add a test that every reader names `qa_reentry`: `resumeContract`, `pauseDoc`, `hooksDoc`, `detectorPrompt`, `taskSkill`, `storySkill`, and the writer.
- Add a non-vacuity floor: the reader list is not empty.

### Phase 2: The script

The `no-gate` block is at lines 161–164. Copy the `no-snapshot` pattern at lines 121–126:

```bash
GATE_ERR=$(mktemp) || exit 1
GATE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" --path gate 2>>"$GATE_ERR") || GATE=""
BASE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" 2>>"$GATE_ERR") || BASE=""
WHY=$(sort -u "$GATE_ERR"); rm -f "$GATE_ERR"
case "$BASE" in ''|*[!0-9]*) BASE="" ;; esac
if ! { [ -n "$GATE" ] && [ -f "$GATE" ] && [ -n "$BASE" ]; }; then
  [ -n "$WHY" ] && printf '%s\n' "$WHY" | sed 's/^⚠️  qa-cycle:/reenter-qa:/' >&2
  refuse no-gate "qa-cycle.sh found no single current gate in '$DOC_DIR'"
fi
```

`sort -u` removes the duplicate line when both calls refuse for the same reason ("no gate file"). The `sed` must match `qa-cycle.sh`'s actual prefix, `⚠️  qa-cycle:`. Check it against `qa-cycle.sh:102` before relying on it.

The uncommitted-fix read is at line 169:

```bash
DIRTY=$(git status --porcelain --untracked-files=no -- . ":(exclude)$DOC_DIR" ":(exclude).claude/state") \
  || refuse git-unreadable "git status failed in '$PWD' — the tree cannot be read, so a re-entry cannot be judged; fix the repository and run this script again (do NOT resume at step 7)"
```

The `2>/dev/null` is dropped, so git's own error reaches the operator.

Then:
- **Script header.** Add the line `#        git-unreadable       git status failed — the tree cannot be read` to the refusal list (lines 14–21).
- **Contract.** Add a bullet between the `<!-- reenter-qa-refusals -->` markers: `` `git-unreadable` — `git status` exited non-zero, so the movement measure cannot run. **Route:** back to the operator — repair the repository and run the script again; **never** step 7. ``
- Run `npm run bundle`.

### Phase 3: The reader population

1. Re-run the population command in the task's §3. Classify every path into one of four kinds: writer, reader that must name `qa_reentry`, reader that need not (state why), or eval fixture.
2. **`develop-pipeline-hooks.md:86`.** Replace "written together at a resume after a loop-limit halt" with wording that names both writers:
   - `grant-qa-cycles.sh`: a resume after a loop-limit halt.
   - `reenter-qa-after-finalise.sh`: a QA re-entry after a finalise DoD-gaps halt. It also writes `qa_reentry`, which the hook does not read.
3. **`pipeline-resume-detector-prompt.md`.** After line 117, add a line:
   - `qa_reentry` (object) records a 7 → 5 QA re-entry after a finalise DoD-gaps halt.
   - Report it in `deltas_since_pause` as `{ "path": null, "concern": "qa_reentry: from_step {n}; gate_head {sha12}" }`, so the operator sees the run as a re-entry rather than a loop in progress.
4. **CHANGELOG `[Unreleased]` › Fixed.** One entry citing task 182.

## Key Patterns and References

- Stderr pass-through: the `no-snapshot` block, `reenter-qa-after-finalise.sh:121-126`.
- PATH stub that fails one operation: the failed-write case, `reenter-qa-after-finalise.test.sh:283-299`.
- Field-spelling parity: `qa-loop-lock-fields-parity.test.mjs`, the `FILES` table at line 46.

## Testing Approach

- Run the suite under bash 5 and macOS `/bin/bash` 3.2. Run both parity tests. Run `npm run ci:fast` and `npm run bundle:check`.
- Mutation proofs:
  - Drop the stderr pass-through: the three cause cases go red.
  - Drop `|| refuse git-unreadable`: the stub case goes red.
  - Delete `qa_reentry` from the detector prompt: the parity test goes red.
