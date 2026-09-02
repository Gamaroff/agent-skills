---
type: review-report
status: complete
bug: 'bug.4.snippet-engine-symlink-noop'
mode: 'general'
reviewer: 'review-bug (validate-and-apply)'
created: '2026-09-01'
updated: '2026-09-01'
description: 'Fix-readiness review of bug.4 (snippet engine no-ops through a symlinked path). Verdict READY TO FIX, 10/10. Two Critical template gaps found and auto-applied; duplicate scan clean; defect confirmed live in the working tree.'
---

# Bug Review Report — bug.4.snippet-engine-symlink-noop

**Mode**: validate-and-apply (`MODE=validate`, `APPLY=true`) — invoked as `/develop-bug` Step 2
**Bug file**: `docs/bugs/bug.4.snippet-engine-symlink-noop/bug.4.snippet-engine-symlink-noop.md`
**Kind**: general (cross-cutting)

---

## Executive Summary

```
Bug: bug.4.snippet-engine-symlink-noop (general)
Fix-readiness: 10/10 — ✅ READY TO FIX
Critical: 2 (both auto-fixed)  Important: 0  Optional: 1
Duplicate: none   Reproduces: likely
Top blockers: none
```

**Score breakdown** (post-apply): Completeness 9/10 · Reproducibility 10/10 · Classification 10/10 · Linkage 10/10 → average 9.75, rounded **10**.

The two Critical findings were both missing template *stubs* — structural, not informational. Both were auto-applied under `APPLY=true`, so nothing remains that requires a human. The report's substance was already exemplary: it names the exact file and line, quotes the defective guard, quotes the correct reference implementation that already exists elsewhere in the repo, scopes the blast radius against every sibling CLI, and gives a two-command reproduction whose output was verified verbatim during this review.

---

## Pre-pass Results

### Agent A — Duplicate scan → `duplicate: none`

Twenty-plus filed bugs examined (all of `docs/bugs/`, plus story/task bugs across `docs/tasks/`). Two near-neighbours were checked closely and both are **related-but-distinct**:

| Candidate | Why it is not this bug |
| --- | --- |
| `bug.3.stdout-truncation-on-exit` (closed) | Also concerns silently-absent CLI output, and its instance 3 is the same *file*. But the mechanism is `process.exit()` firing before an async pipe write drains; its fix (`process.exitCode` + return) never touches the entrypoint guard and would not fix it. |
| `task.67.bug.1` / `task.67.bug.2` (closed) | Also in `qa-execute-snippets.mjs` — but in the classifier and fence-extraction paths, which only run *after* `main()` is entered. bug.4 is precisely that `main()` is never entered. |

No filed bug shares the root cause (an ESM entrypoint guard failing to realpath-resolve `argv[1]`).

### Agent B — Already-fixed / stale scan → `reproduces: likely`

`found_at`: `shared/resources/qa-execute-snippets.mjs:996`, plus four auto-generated bundled copies at `skills/{qa-task,qa-story,develop-task,develop-story}/references/qa-execute-snippets.mjs:997`.

The reproduction was executed during this review and matches the report exactly:

| Invocation | Exit | stdout |
| --- | --- | --- |
| `.agents/skills/qa-task/references/qa-execute-snippets.mjs` (documented path) | **0** | none — completely silent |
| `skills/qa-task/references/qa-execute-snippets.mjs` (real path) | **1** | full JSON report incl. `zero-blocks-executed` finding |

Both `.agents/skills` and `.claude/skills` confirmed as symlinks to `../skills`.

**Corrected scope figure.** The report's own scan table lists the naive guard in the source plus its bundled copies, and three sibling CLIs as already-resolved. This review confirms that table and pins the line numbers:

| File | Guard | Classification |
| --- | --- | --- |
| `shared/resources/qa-execute-snippets.mjs:996` | raw `pathToFileURL(process.argv[1] ?? "").href` comparison | **naive** ← the only real source |
| `skills/qa-task/references/qa-execute-snippets.mjs:997` | bundled copy | naive (generated) |
| `skills/qa-story/references/qa-execute-snippets.mjs:997` | bundled copy | naive (generated) |
| `skills/develop-task/references/qa-execute-snippets.mjs:997` | bundled copy | naive (generated) |
| `skills/develop-story/references/qa-execute-snippets.mjs:997` | bundled copy | naive (generated) |
| `skills/develop-next/scripts/select-next.mjs:1492` | `isInvokedDirectly()`, realpath both sides + catch fallback | resolved ✅ |
| `skills/loop-supervisor/scripts/run-loop.mjs:1578` | same pattern | resolved ✅ |
| `skills/develop-batch/scripts/schedule.mjs:627` | same pattern | resolved ✅ |

No other ESM entrypoint guard exists in the repo — every remaining `import.meta.url` hit is a `__dirname` shim in a test file. The report's "an outlier, not a pattern" framing is accurate.

---

## Findings by Dimension

### Step 2 — Template & Frontmatter Compliance

| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | **Critical** | `## Developer Fix Cycle` absent. Required by `create-bug-report/assets/bug-report-template.md`; it is the section Step 3 writes Investigation and Fix Implementation into, so develop-bug would have had no anchor. | ✅ **Fixed** — template stub inserted before `## Status History`, including the `### Iteration 1` scaffold with its three sub-headings. |
| 2 | **Critical** | `## Resolution Summary` absent. Required by the template; it is what Step 7 writes to close the bug. | ✅ **Fixed** — template stub appended at end of file. |
| 3 | Optional | `## Suggested Fix` is an extra section not in the template, sitting between `## Scope & Impact` and `## Developer Fix Cycle`. | ⏭ **Left as-is** — it is high-value content (it is where the four-part fix plan and the mutation-proof instruction live), and the template does not forbid additions. |

Frontmatter: `type: bug` ✅ · `status: new` ✅ (in lifecycle) · `severity: Major` ✅ (valid enum) · `priority: High` ✅ (valid enum) · `created` ✅ · `updated` ✅ · `related` ✅ · `description` ✅. No issues.

Identity consistency: filename stem `bug.4.snippet-engine-symlink-noop` = body **Bug ID** = directory stem, and the general-bug heading `## Scope & Impact` is the mode-correct violation heading. ✅

### Step 3 — Reproducibility Clarity (the core gate)

No findings. This is the strongest axis of the report:

- **Reproduction Steps** — two numbered, copy-pasteable shell commands with the expected exit code and output annotated inline, plus a comparison table. Self-contained: the reader needs nothing but the repo.
- **Environment** — macOS Darwin 25.5.0, Node v24.13.1, with the correct note that the defect is platform-independent (Node module resolution + a symlink, not OS behaviour).
- **Expected vs Actual** — both explicit and specific. Actual is stated as the thing that makes this dangerous: *"Exit 0, no stdout, no stderr. Indistinguishable from a clean run with nothing to report."*
- **Frequency** / **Reproducible** — both set (Always / Yes — deterministic).
- **Evidence** — exceeds what is asked of a Major bug: it quotes the already-correct sibling implementation with its explanatory comment, scans every ESM CLI in the repo into a table, and records provenance (found during `/qa-task` cycle 1 of task 75).

Verified independently: the reproduction produces exactly the documented result on the current tree.

### Step 4 — Severity / Priority Correctness

`severity: Major` / `priority: High` — **confirmed correct, no change**.

Reasoning against the `create-bug-report` guidelines: this is not a `Blocker` — the report itself is careful to say the blast radius "does not affect merged code correctness — it affects whether the evidence behind a QA verdict exists," and nothing is prevented from shipping. It is well above `Minor`, because a QA gate that reports success without executing is a false negative in the safety net itself: every `qa-task` / `qa-story` run since task 67 that reached Step 4b through the documented path recorded a pass for a check that did not run. `Major` / `High` is the right pair.

### Step 5 — Mode & Linkage Correctness

General-bug linkage is complete and consistent:

- `docs/bugs/bug-registry.md` row 4 exists, links the correct relative path, and carries `new` / `Major` / `High` — consistent with the bug's frontmatter on all three fields. ✅
- **Next Available Bug Number** is `6`, correctly past both bug.4 and bug.5. ✅
- `related: 'none — cross-cutting (no single owner)'` is the correct value for general mode, and the report justifies it explicitly (the engine is shared machinery bundled into four skills, owned by no story or task). ✅
- The roadmap carries B4 as a live row in PHASE 5 pointing at this file. ✅

---

## Fixes Applied

```
✅ Fixed: missing ## Developer Fix Cycle section — template stub inserted (with ### Iteration 1 scaffold)
✅ Fixed: missing ## Resolution Summary section — template stub appended
⏭ Skipped: none
```

No severity or priority correction was made, so no `## Status History` row was added — that table records transitions and field corrections, and this review made neither. The bug lifecycle `status` remains `new`; `/develop-bug` Step 3 moves it to `in-progress`.

---

## Notes for the Fix (Step 3)

Carried forward from the pre-pass so the fix does not have to re-derive them:

1. **Edit `shared/resources/qa-execute-snippets.mjs` only.** The four `skills/*/references/` copies are bundle output — editing them directly is silently reverted by the next `npm run bundle`. Fix the source, then run `npm run bundle` to propagate.
2. **Lift `isInvokedDirectly()` from `skills/develop-next/scripts/select-next.mjs:1492`** verbatim, comment included, keeping its `catch` fallback to a plain `path.resolve` comparison for a deleted or unreadable path. Three sibling CLIs already carry this exact function; a fourth identical copy is the consistent outcome.
3. **The behavioural test has a precedent to mirror**: `evals/develop-next/unit/select-next.test.mjs:369` — `"CLI: runs when invoked through a symlinked path"` — builds a temp dir, `symlinkSync`s the script, invokes through the link with `execFileSync`, and parses the output (which throws if the guard silently no-opped). The same shape applies directly here.
4. **No existing test covers this file's guard.** `shared/resources/tests/qa-execute-snippets.test.mjs` (1108 lines) tests the engine's internals in-process and never spawns it as a subprocess, so the module-level guard is entirely unexercised. This is a genuine coverage gap, not a redundant test.
5. **Two guards are warranted**, per the report's own Suggested Fix — a behavioural test (holds this bug) and a structural scan over every ESM CLI (stops the class returning in a new file). The report's caution is well-founded: this repo has already shipped a structural guard that passed under mutation on the exact bug it named (bug.3).

---

## Recommendation

✅ **READY TO FIX** — proceed to `/develop-bug` Step 3.

The bug is real and confirmed present in the working tree, is not a duplicate, is correctly classified, is correctly linked, and after the two auto-applied stubs is fully template-compliant. The report additionally supplies a verified reproduction, a precise fix location, a reference implementation to copy, and a test precedent — there is nothing a human needs to add before work starts.
