---
id: task.168.plan
title: "Implementation Plan: Harden task.135's gate-head scoping"
type: plan
task-ref: task.168.gate-head-scoping-hardening.md
---

# Implementation Plan: Harden task.135's gate-head scoping

> Requirements and success criteria: [task.168.gate-head-scoping-hardening.md](task.168.gate-head-scoping-hardening.md)

## Overview

Six small changes to blocks task.135 shipped. One of them (clause 1) is a move rather than an edit: the probe leaves its fenced block for a bundled script, the way the gate cycle number left for `qa-cycle.sh`. Every change lands with an executed test in the `qa-scope-from-head.test.mjs` pattern (cut the fence with `extractBlocks`, run it in a scratch repo under bash and `zsh -f`) and a mutation proof.

## Phase-by-Phase Implementation Guide

### Phase 1: Trigger validates its head; helper rebinds read rc

**`skills/qa-task/SKILL.md` Phase 0 step 3** — between the `GATE_HEAD=$(grep …)` line and `CODE_MOVED=$(git rev-list …)`:

```bash
if [ -n "$GATE_HEAD" ]; then
  # A head the trigger cannot vouch for fails toward re-review, never toward "nothing moved"
  # (task.168 CR4-1): `head: HEAD` or an off-branch head made rev-list count 0 forever.
  if ! printf '%s' "$GATE_HEAD" | grep -qE '^[0-9a-f]{40}$' \
     || ! git cat-file -e "${GATE_HEAD}^{commit}" 2>/dev/null \
     || ! git merge-base --is-ancestor "$GATE_HEAD" HEAD 2>/dev/null; then
    echo "trigger: gate head '$GATE_HEAD' is not a 40-hex commit on this branch — re-reviewing"
    CODE_MOVED=1; DOC_MOVED=1
  else
    … the existing CODE_MOVED / DOC_MOVED block …
  fi
else
  CODE_MOVED=1; DOC_MOVED=1
fi
```

**Rebinds** — `qa-task/SKILL.md` Phase 0 steps 2 (`:177`) and 5 (`:291`); `qa-story/SKILL.md` steps 2 (`:254`) and 5 (`:495`). Replace the one-line `[ -n "${LATEST_GATE:-}" ] || LATEST_GATE=$(… --path gate 2>/dev/null)` with Step 1's two-call pattern (copy it from `qa-task/SKILL.md` Phase 0 step 1, do not re-derive it):

```bash
if [ -z "${LATEST_GATE:-}" ]; then
  CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR"); rc=$?
  [ "$rc" -le 1 ] || { echo "HALT: qa-cycle.sh not runnable (rc=$rc)"; exit 1; }
  if [ -n "$CYCLE" ]; then
    LATEST_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate); rc=$?
    [ "$rc" -eq 0 ] || { echo "HALT: qa-cycle.sh refused cycle $CYCLE (see its line above) — resolve the gate files"; exit 1; }
  fi
fi
```

Tests (in `qa-scope-from-head.test.mjs`): `head: HEAD` → `CODE_MOVED=1`; head on a side branch → `CODE_MOVED=1`; two files `task.9.gate.2.a.yml` + `task.9.gate.2.b.yml` → step 5 exits 1 with the HALT, and its stdout carries no `SAFETY_REPROBE=false`.

### Phase 2: One clause-1 script

**🆕 `shared/resources/qa-safety-clause1.sh`**:

```bash
#!/usr/bin/env bash
# qa-safety-clause1.sh <gate-file> — prints true|false for SAFETY_REPROBE clause 1 (exit 0).
# Exit 2 on usage. An empty or unreadable <gate-file> prints false (the status half fails closed);
# a security block with no evidence: key prints true (the evidence half fails open).
# The awk program below is the one that lived in qa-re-review-scope.md's clause-1 block, moved
# byte-for-byte — its three transit constraints still hold (no whole-record variable, no
# apostrophe, no GNU-only escape).
```

Move the `awk '…' "$LATEST_GATE" </dev/null` program and the `case "$SECURITY_AXIS"` mapping into it; print `true`/`false`.

**Shared rule** (`qa-re-review-scope.md` clause-1 block, `:107`): the block keeps its `SAFETY_REPROBE=false` line (so `extractProbe()` still finds exactly one block) and becomes:

```bash
SAFETY_REPROBE=false
if [ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
  SAFETY_REPROBE=$(bash references/qa-safety-clause1.sh "$LATEST_GATE") || exit 1
fi
```

The two skills' step-5 blocks call `.agents/skills/{qa-task|qa-story}/references/qa-safety-clause1.sh` (the bundler follows the literal).

**Step 3b preambles** (both skills), after the `LATEST_GATE` binding:

```bash
# Clause 1 is mechanical: recompute it here rather than trust the bound value (task.168 CR3-4).
# A bound true (clauses 2–3, judgement) still stands; a computed true overrides a bound false.
[ -n "${LATEST_GATE:-}" ] && [ "$(bash .agents/skills/qa-task/references/qa-safety-clause1.sh "$LATEST_GATE")" = true ] && SAFETY_REPROBE=true
```

**Parity test** (`evals/shared/tests/qa-re-review-scope-parity.test.mjs`): `extractProbe()` (`:341`) keeps finding the block; the replay tests (`task.67.gate.1` security FAIL, etc.) execute it, which now executes the script — point `clause1()`'s working directory so `references/qa-safety-clause1.sh` resolves (copy the script beside the extracted block, as `qa-scope-from-head.test.mjs` F9 copies `qa-cycle.sh`). Move the transit-constraint tests ("no whole-record variable", "no apostrophe", "no GNU-only escapes") to read the script's text. "both skills carry the clause-1 probe verbatim" becomes "both skills call the script".

**🆕 `shared/resources/tests/qa-safety-clause1.test.mjs`**: the script under bash and zsh against a security-FAIL gate (true), `PASS measured` (false), `PASS reasoned` (false), no `evidence:` (true), no security block (false), empty path (false), usage (exit 2).

Test (in `qa-scope-from-head.test.mjs`): a gate with `nfr_validation.security.status: FAIL`, `PRIOR_GATES=2`, `SAFETY_REPROBE=false` bound → Step 3b's fence (run whole, with a stub `gh` as J4 does) produces the whole-branch patch.

### Phase 3: Scope block — literal paths, uncommitted fix; `field()`

**Scope block** (edit `qa-re-review-scope.md` first, then paste into both Step 3b fences — test E enforces identity):

```bash
git --literal-pathspecs diff "$BASE...HEAD" -- "${FILES[@]}" > "$DIFF_FILE"
```

and, inside the cycle-3+ arm before `LAST_GATE_HEAD` is used:

```bash
# The scope reads committed history; a fix still in the working tree would be reviewed as absent
# (task.168 CR3-7). $WORK_ITEM_DIR is bound by the caller's preamble — the QA cycle writes its own
# report and gate there before this block runs.
DIRTY=$(git status --porcelain -- . ":(exclude)$WORK_ITEM_DIR")
[ -z "$DIRTY" ] || { echo "HALT: uncommitted changes outside the work item — commit the fix before re-review:"; printf '%s\n' "$DIRTY"; exit 1; }
```

Preambles: `WORK_ITEM_DIR="$TASK_DIR"` (qa-task), `WORK_ITEM_DIR="$STORY_DIR"` (qa-story). The shared block refuses an empty `$WORK_ITEM_DIR` the way it refuses an unbound `$SAFETY_REPROBE`.

**`gate-head-freshness.test.mjs` `field()`** (`:48`):

```js
return m[1]
  .replace(/\s+#.*$/, "")
  .trim()
  .replace(/^['"]|['"]$/g, "")
  .trim();
```

Tests: `skills/:colon.sh` changed after the head stays in the patch (bash + zsh); an uncommitted edit to `skills/b.sh` HALTs; `field()` on `head: '<sha>'  ` returns the SHA, and on `head: '<sha>'  # c` too.

## Key Patterns and References

- `qa-scope-from-head.test.mjs` — `block()` + `dedent()` extraction, `withoutUnset()` for unset inputs, the stub-`gh` fence run (J4), the helper copy (F9).
- `qa-cycle.sh` — the one-definition precedent, and the two-call pattern in `qa-task/SKILL.md` Phase 0 step 1.
- `qa-re-review-scope.md` § "Transit constraints" — why the awk move must be byte-for-byte.
- **Bundling closure** (`skills/create-skill/SKILL.md` § "Cite or depend"): `qa-re-review-scope.md` is bundled into eight skills (`review-code`, `review-pr`, `review-security`, `develop-*` …). A script invoked from its clause-1 block is a dependency of every one of them, not only `qa-task`/`qa-story`. Decide deliberately — either accept the eight copies (check `npm run bundle` closure deltas) or have the shared block name the script in the `{qa-task|qa-story}` invocation form so only the two QA skills bundle it. `bundle:check` reports an unreached copy as `UNREACHED`.

## Testing Approach

Per phase: the executed tests above, then one mutation per finding (the list in the task's § 8). Throughout: `npm run ci:fast`, `npm run eval:develop-task`, `npm run eval:develop-story`, `npm run bundle:check`, `npm run validate -- skills/qa-task/` and `skills/qa-story/`.
