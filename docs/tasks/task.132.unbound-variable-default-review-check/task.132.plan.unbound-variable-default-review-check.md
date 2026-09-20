---
id: task.132.plan
title: "Implementation Plan: who binds every ${VAR:-default} and ${VAR:?} in executed prose"
type: plan
task-ref: task.132.unbound-variable-default-review-check.md
---

# Implementation Plan: the unbound-default reviewer check and population test

> Requirements and success criteria: [task.132.unbound-variable-default-review-check.md](task.132.unbound-variable-default-review-check.md)

## Overview

One paragraph in the shared reviewer prompt, one derived-population test, and the bindings the test finds.

## Phase-by-Phase Implementation Guide

### Phase 1: the reviewer check

**Files to modify:**
- `shared/resources/code-review-prompt.md` — inside the fenced Prompt Template, § A after PLATFORM VARIANCE:

```
   - UNBOUND DEFAULT (category: bug, prefix the finding with "unbound-default:"):
     a `${NAME:-default}`, `${NAME:=default}` or `${NAME:?msg}` the diff ADDS inside a fenced
     block or a script. Name the WRITER — the assignment, `read`, `for`, or documented caller
     binding that sets NAME before this block on EVERY path that reaches it (a resume path that
     skips earlier blocks included; each fenced block is its own shell). No writer ⇒ bug:
     `:-` with no writer is a constant wearing a variable's name; `:?` with no writer is a
     guaranteed failure on the path nobody tested. confidence: high when
     `grep -rn 'NAME=' <bundle set>` is empty. Name the variable, the read site and the grep.
```

- `npm run bundle` regenerates the four consumers' copies; `tests/bundled-links.test.js` and the bundle check cover parity.

### Phase 2: the population test

**Files to modify:**
- New `shared/resources/tests/executed-prose-bindings.test.mjs`:

```js
// Population: every ```bash fence in shared/resources/develop-pipeline-*.md, shared/resources/*-contract.md,
// skills/*/SKILL.md (skip AUTO-GENERATED copies under references/). Per file, walk fences in order.
// READ  = /\$\{([A-Z][A-Z0-9_]*):[-=?]/g
// WRITE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=|^\s*read\s+(?:-r\s+)?(?:[A-Z_]+\s+)*([A-Z][A-Z0-9_]*)|^\s*for\s+([A-Z][A-Z0-9_]*)\s+in/m
// A read is bound if a WRITE for the same name appears in the SAME fence before it, or the file's
// prose documents a caller binding ("bound in Step 0", "from the lock") on a line within 5 of the fence,
// or the name is in ALLOW with a reason. Cross-fence writes do NOT count (TASK-121-BUG-2).
const ALLOW = {
  FINALISE_CI_MAX_WAIT: "operator environment; documented in develop-pipeline-autonomous-defaults.md",
  IMPLEMENTATION_REPORT: ":? by contract — the orchestrator binds it from the lock's report_path (step-8 says 'must be set from lock or context')",
  // …each with a reason; the test prints the allow-list size beside the count
};
// Floor: assert(names.size >= 10, `population shrank to ${names.size}`); print `${reads} reads, ${names.size} names, ${unbound.length} unbound`.
```

- Fixture directory `shared/resources/tests/fixtures/executed-prose-bindings/` with five files (bound; unbound `:-`; unbound `:?`; allow-listed; cross-fence) and a unit test over it before the real-tree run.
- `package.json`: confirm `shared/resources/tests/*.test.mjs` is in the `test` glob (it is, per task.124) — otherwise add.

### Phase 3: bind what the test finds

**Files to modify:**
- `shared/resources/develop-pipeline-step-8-commit.md` (search anchor: `verify-push-state.sh --base "${BASE_BRANCH:?}"`): precede with the three-line derivation task.130 adds to the probe (`gh pr view --json baseRefName` → report row → HALT), cited as "the same binding the resume contract's probe uses"; keep `:?` after it as the contract.
- Every other name the real-tree run reports: either a writer in the same fence (the helper re-call pattern, e.g. `QA_CYCLE=$(bash …/qa-cycle.sh "$DIR")`) or an `ALLOW` entry with a reason.
- `docs/reference/anti-patterns.md`: "A default in executed prose is a claim about a writer — review the writer, not the read".

## Key Patterns and References

- Derived populations: `qa-loop-lock-fields-parity.test.mjs`; allow-list + floor: `tests/mutation-call-site-coverage.test.js`.
- Block-per-shell: `qa-task/SKILL.md` Step 13 comments (TASK-121-BUG-2/4/6).
- Mutation proving: `shared/resources/mutation-proving.md`.

## Testing Approach

- Fixture unit test first (five verdicts), then the real tree; the mutant is the unbound-`:-` fixture.
- Consumer test: dispatch the updated reviewer over task.124's cycle-1 diff and assert an `unbound-default:` finding for `BASE_BRANCH` — the regression the check exists for.
