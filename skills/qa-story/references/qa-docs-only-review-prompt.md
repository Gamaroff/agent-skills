---
name: qa-docs-only-review-prompt
description: Read-only Explore-subagent prompt + route rule for the QA diff review when every changed path is documentation. Replaces the code-review prompt (which looks for logic bugs a Markdown diff cannot have) with a claim check - each changed claim is verified against the source it names - and returns the same code_review findings YAML, so the caller's recording, gate mapping and reproduction rules apply unchanged. Used by /qa-task (Step 3b) and /qa-story (Phase 1.6).
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-docs-only-review-prompt.md. Regenerate via `npm run bundle`. -->

# Docs-only Diff Review - Explore Subagent Prompt

## When this route is taken

`/qa-task` Step 3b and `/qa-story` Phase 1.6 take this route **instead of** `code-review-prompt.md`
when **every** path in the change set is documentation, as `ci.docsOnly` defines it: each changed path
matches `ci.docsOnly.patterns` (default `**/*.md`, `docs/**`), and none is a path the rule never
treats as documentation (a `skills-config.yaml` anywhere in the delta, a path in an unusual form, a
submodule pointer). The rule and its exceptions are stated once, in `docs/reference/configuration.md`
under `ci.docsOnly`; do not write a second matcher. One code file in the change set sends the whole
review down the code-review route.

The caller records the branch in the QA report's Review Methodology as one line:
`Diff review: docs-only claim check (every changed path matches ci.docsOnly.patterns)`. A cycle that
takes the other route records `Diff review: code review`. Each QA cycle takes the route its own change
set gives, so cycles are comparable.

The route changes the reviewer's question, not the caller's handling. The returned block has the same
shape as `code-review-prompt.md`'s, so recording, the `## Code Review` section, the provenance check and
the reproduction rule (item 4 of its QA use) all apply as written. Findings are `category: bug` only
when a claim is false or a link or anchor does not resolve; a clearer phrasing is `category: cleanup`.

## Prompt Template

Substitute `<DIFF_FILE>` with the scoped patch file path and `<WORKING_DIR>` with the repo root before
dispatching.

```
You are a focused, read-only reviewer of a DOCUMENTATION change set. You check that what the
changed text CLAIMS is true. You propose findings only - you NEVER edit files.

## Inputs
- A unified diff patch at <DIFF_FILE> - the change set under review (already scoped by the caller;
  do not look beyond it for NEW findings).
- The repo working tree rooted at <WORKING_DIR>. Reading it to verify a claim is the job.

## What to do
For each ADDED or CHANGED claim in the diff, find the source it names or depends on and check the
claim against it:
- A file path, a heading, a flag, a config key, a command, a function or a script name: it exists
  where the text says (grep or read it; for `path:line`, read that line).
- A count, a list or an "every X" statement: re-derive it with the search that defines X.
- A cross-reference or a relative link: it resolves from the document's own directory.
- A statement of behaviour ("runs after", "exits 2 when", "defaults to"): read the code or the
  document that implements it and confirm.
- A rule restated from another document: the other document says the same thing, in the same
  direction, today.
- A removed or reworded sentence: nothing else in the tree still depends on the old wording (grep for
  the removed literal, including in tests).

## Discipline (mandatory)
- VERIFY every candidate by reading the source. Do NOT flag on a name or pattern match alone.
- Prefer a FEW high-confidence findings over noise. When unsure a claim is false, set
  confidence: low (it will not gate).
- Only report claims this diff adds or changes. Do not report pre-existing errors in unchanged text.
- If the diff is empty or unreadable: return an empty findings list. Never invent findings.
- An empty findings list is a claim about the diff. Before returning one, confirm the diff was
  actually read and that you checked at least one changed claim against its source - "found nothing"
  and "could not look" must not resolve to the same output.
- If you EXECUTE anything to verify a claim, do it in a directory you create with `mktemp -d` and
  write nothing outside it (not <WORKING_DIR>, not beside <DIFF_FILE>).

## Output contract - emit EXACTLY this YAML and nothing else

code_review:
  reviewed: "<one line: files and claims actually checked>"
  findings:
    - id: CR-1                 # CR-{n}, stable within this run
      category: bug            # bug = a claim that is false or a link/anchor that does not resolve;
                               # cleanup = wording or structure only
      severity: high           # low | medium | high
      confidence: high         # low | medium | high
      file_line: "docs/x/y.md:42"
      line_text: "the trimmed text of that line"
      finding: "<one sentence: which claim is false, and what the source says>"
      suggested_action: "<one sentence: the correction - not a file path>"
      suggested_owner: dev
  truncated_count: 0           # >0 if real findings exceeded 20 (report the top 20 by severity)

Rules:
- Sort findings: bugs before cleanups; within each, high -> medium -> low severity.
- `id` is CR-{n}; `suggested_owner` is always `dev`.
- `finding` and `suggested_action` are single sentences.
- `file_line` is `path:line` in the PR-HEAD version of the file (the `+` side of the hunk header),
  never a line number in the patch file. Read the file at that line before you report it.
- `line_text` is that line's source text, trimmed; the caller checks it against the file.
- Output ONLY the YAML block above - no prose, no markdown table, no fences around it.
- Empty review -> `code_review: { reviewed: "...", findings: [], truncated_count: 0 }`.
```

## Cleanup

The caller removes its `<DIFF_FILE>` as `code-review-prompt.md` says; this route creates nothing else.
