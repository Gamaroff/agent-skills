# Sprint Review Summary — Task 107

**Task:** [The bug-fix runbook documents a pipeline that has been superseded twice](./task.107.bug-runbook-rewrite.md)
**PR:** [#387](https://github.com/Gamaroff/agent-skills/pull/387) · **Issue:** [#386](https://github.com/Gamaroff/agent-skills/issues/386)
**Accepted:** 2026-09-11 · **QA Gate:** PASS 95/100 · **QA Cycles:** 2

---

## Summary

`docs/runbooks/bug-fix.md` is the page a reader reaches first when something is broken, and it had
been overtaken twice without being revisited. It documented a four-step manual loop —
`qa-story → create-bug-report → [developer fixes] → qa-story → commit-changes` — that predates the
bug pipeline entirely. A reader following it did the orchestrator's job by hand and never learned
`/develop-bug` existed.

It also mentioned **no tracker at all** — `grep -c 'tracker\|jira\|github_issue'` returned **0**,
five releases after `sync-{jira,github}-bug` and `ensure-bug-{jira,github}-issue` shipped — and
listed two of the three bug modes, so a reader with a cross-cutting defect found no route at all.

The cost was never that the documented loop failed. It works, and produces an untracked fix. It is
that the page terminated before the capability started.

## What shipped

**`docs/runbooks/bug-fix.md` — rewritten, 68 → 200 lines**

- The `/develop-bug` 8-step pipeline with its `/review-bug` fix-readiness gate and both branch models
- All three bug modes, each with filename pattern, directory and numbering rule — including the
  general-bug route through `docs/bugs/` and its registry, absent entirely before
- The tracker-sync step on **both** `TRACKER` arms, naming the skill on each and the real asymmetry
  between them: the Jira arm delegates to `sync-jira-bug`, the GitHub arm creates the issue itself
- The artifacts a run leaves on disk, and a verification block of real runnable commands
- A pitfall for the rule a rewrite is most likely to break: bug reports carry `## Status History`,
  never a `## Change Log`, and the wrong call appends the forbidden table *silently*

Held inside the ~200-line satellite budget `docs/runbooks/README.md` sets for the page — the anchor
runbooks' section shape, not their length.

**`docs/concepts/which-path.md` — the bug branch, in all three representations**

The decision tree had none: a reported bug reached `/create-story`, a cross-cutting one reached
`/create-task`. Neither produces a bug document, so the reproduction record, Status History and
registry row were all lost at the first question. A defect check is now **Question 1** —
deliberately ahead of "is it user-facing?", so non-user-facing defects are caught too.

**Also:** `docs/runbooks/README.md` one-liner re-checked; two `CHANGELOG.md` entries.

## Testing & QA

| Gate | Result |
|---|---|
| `npm run ci:fast` | 3155 pass / 0 fail / 1 skipped |
| CI (`test`, `link-check`, `shellcheck`, branch-policy) | all green on head `2cabae01` |
| Links | 38 added, resolved against the **tracked** tree, 0 dead |
| Mermaid | both flowcharts validate |
| The page's own verification block | executed verbatim; output matches its comments exactly |

**QA cycle 1 — FAIL, 70/100.** Caught the page naming `sync-github-bug` as the GitHub arm's
mechanism when `ensure-bug-github-issue` never references it (Success Criterion 3 failing), and
caught the verification block not producing the output its comments claimed.

**QA cycle 2 — PASS, 95/100.** The refute pass caught one more of the same class: an artifact-naming
shape asserted from inference, with zero instances in a 62-file corpus.

**Step 5c `/review-pr` — REQUEST CHANGES, then APPROVE.** Five findings no QA gate could see, because
they were in the paper trail rather than the deliverable; then four more on the re-run. All nine fixed.

## What this run demonstrated about the pipeline

The most valuable finding of the whole run was invisible to every automated gate. A structural
corruption of the task document — an entire section spliced into the middle of a sentence by an
unanchored string replace — passed `prettier`, `markdown-link-check`, `ci:fast` and both QA cycles,
because the file remained *valid markdown* while meaning something other than it said. Only the
Step 5c conformance lens, which reads the work item as a document rather than as a gate input, saw it.

That is a concrete argument for 5c existing, from an instance rather than from the design doc.

## Known limitations and follow-ups

- **`docs/reference/pipeline-artifacts.md` has zero bug rows** (`grep -c 'bug'` → 0), so the artifacts
  a `/develop-bug` run writes are documented only in this runbook. Out of task 107's declared scope.
- **Neither `file-naming.md` nor `bug-documents.md` specifies the companion artifacts a general bug
  accumulates**, though bugs 1, 2, 3, 11 and 12 all carry them. The standard trails the corpus.
- **No story or task bug in this repo has been through `/develop-bug`**, so its companion-artifact
  naming is unestablished by example. The page now says so rather than inferring a shape.
- **No formal GitHub review exists on PR #387** — structural, since `/review-pr` is advisory by design.
- **Parts of this run were verified by one reader where the pipeline intends two** — three subagents
  hung and one was killed in error. Detailed in the DoD summary.

## Demo notes

Open `docs/concepts/which-path.md`, answer "yes" to Question 1, and follow it through to
`docs/runbooks/bug-fix.md`. Before this change that path did not exist.
