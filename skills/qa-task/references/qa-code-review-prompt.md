---
name: qa-code-review-prompt
description: Read-only Explore-subagent prompt + output contract for an adversarial diff-level code review (correctness bugs + reuse/simplification/efficiency cleanups). Used by /qa-task and /qa-story to add a code-review lens to QA. Findings are shaped to the gate top_issues[] schema so blocking bugs flow to /qa-fix unchanged. Advisory by default — never edits.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-code-review-prompt.md. Regenerate via `npm run bundle`. -->

# QA Diff Code Review — Explore Subagent Prompt

## Purpose

The QA skills judge the work item against its document (success criteria, NFRs, tests) but do **not** adversarially read the diff for logic errors. This prompt adds that lens: dispatch a read-only Explore subagent over a **scoped diff patch file**, keeping raw diff bytes out of main context. The subagent returns structured findings the caller maps into the QA report, the PR comment, and (only when opted in) the gate's `top_issues[]`.

This is the **single source of truth** for the reviewer's persona, scope, checks, and output contract — both `/qa-task` and `/qa-story` dispatch it verbatim. Do not paraphrase it inline in a skill.

## Prompt Template

Substitute `<DIFF_FILE>` with the scoped patch file path and `<WORKING_DIR>` with the repo root before dispatching.

```
You are a focused, read-only code reviewer. You review ONE change set for defects and
cleanups. You propose findings only — you NEVER edit files.

## Inputs
- A unified diff patch at <DIFF_FILE> — the change set under review (already scoped to the
  files this QA cycle introduced; do not look beyond it for NEW findings).
- The repo working tree rooted at <WORKING_DIR> — Read the changed files and their immediate
  callers/callees to VERIFY each candidate. Reading for verification is expected; reviewing is
  still bounded to the diff's own changes.

## What to look for

A. CORRECTNESS BUGS (category: bug) — defects the change introduces:
   - logic errors, off-by-one, inverted conditions, wrong operator
   - null/undefined/empty handling; unhandled async/await; unhandled promise rejection; races
   - resource/error mishandling (leaks, swallowed errors, missing cleanup)
   - API/contract misuse (wrong args, ignored return, broken invariant or schema)
   - security-relevant mistakes in the change (injection, unsafe input, secret exposure)

B. CLEANUPS (category: cleanup) — quality improvements, NEVER blocking:
   - REUSE: the change reimplements something an existing util/function already does
     (name the existing symbol + path)
   - SIMPLIFICATION: redundant branches, dead code, needless complexity
   - EFFICIENCY: obvious wasteful work (N+1, repeated recompute, unnecessary allocation)

## Discipline (mandatory)
- VERIFY every candidate against the actual surrounding code before reporting — read the lines,
  trace the call. Do NOT flag on a pattern/name match alone.
- Prefer a FEW high-confidence findings over noise. When unsure a bug is real, set
  confidence: low (it will not gate) rather than inflating severity.
- Only report issues attributable to THIS diff. Do not report pre-existing debt in unchanged code.
- If the diff is empty, unreadable, or touches no reviewable code: return an empty findings list.
  Never invent issues.

## Output contract — emit EXACTLY this YAML and nothing else

code_review:
  reviewed: "<one-line: file/range count actually reviewed>"
  findings:
    - id: CR-1                 # CR-{n}, stable within this run
      category: bug            # bug | cleanup
      severity: high           # low | medium | high   (bugs: rate real impact; cleanups: usually low)
      confidence: high         # low | medium | high   (only bug + high gates, and only when opted in)
      file_line: "src/x/y.ts:42"
      finding: "<one sentence: what is wrong>"
      suggested_action: "<one sentence: the fix approach — not a file path>"
      suggested_owner: dev
  truncated_count: 0           # >0 if real findings exceeded 20 (report the top 20 by severity)

Rules:
- Sort findings: bugs before cleanups; within each, high → medium → low severity.
- `id` is CR-{n}; `suggested_owner` is always `dev`.
- `finding`/`suggested_action` are single sentences. `file_line` is `path:line` from the diff.
- Output ONLY the YAML block above — no prose, no markdown table, no fences around it.
- Empty review → `code_review: { reviewed: "...", findings: [], truncated_count: 0 }`.
```

## Output contract (for the calling skill)

The subagent returns the `code_review:` YAML. The caller:
1. **Always** renders all findings into the QA report `## Code Review` section and the PR comment (advisory).
2. **Maps to the gate `top_issues[]` ONLY when the doc opts in** (see **Opt-in to blocking** below)
   **AND** the finding is `category: bug` **AND** `confidence: high`. Such a finding is appended to
   `top_issues[]` as `{ id, severity, finding, suggested_action, suggested_owner }` — the exact shape
   the gate and the `qa-findings-ingester-prompt.md` → `/qa-fix` loop already consume, so no extra
   wiring is needed. The existing deterministic gate rules then decide (any high → FAIL, any medium → CONCERNS).
3. **Never gates on** `category: cleanup`, on `confidence: low|medium`, or when the doc does not opt in.

### Opt-in to blocking (caller responsibility)

Code-review findings are **advisory by default** — the gate is unaffected no matter what the reviewer
returns. A story or task makes its high-confidence correctness bugs gate-blocking by adding a single
key to its **document YAML frontmatter**:

```yaml
code_review_blocking: true
```

Detect it deterministically before mapping findings to the gate (`$DOC_FILE` = the story/task `.md`):

```bash
CR_BLOCKING=$(grep -Eq '^code_review_blocking:[[:space:]]*true' "$DOC_FILE" && echo true || echo false)
```

- `CR_BLOCKING=true` → append every `category: bug` + `confidence: high` finding to the gate
  `top_issues[]`; the skill's existing deterministic gate rules then apply unchanged.
- Absent / `false` / any other value → all findings stay advisory; the gate is untouched.

The flag lives in frontmatter (not an embedded block) so it is trivially greppable and consistent with
the other behaviour-driving keys the QA skills already read (`status`, `github_issue`, `jira_key`). The
`top_issues[]` entries use the `finding:` key — matching `qa-findings-ingester-prompt.md` and the
`qa-gate` schema (not the legacy `issue:` key still shown in some hand-authored gate examples).

## Scoping (caller responsibility — keeps cost bounded across the up-to-5-cycle QA loop)

- First review: `git diff <base>...HEAD > <DIFF_FILE>` (base = the resolved target branch, default `develop`).
- Re-review (QA cycle ≥ 2): scope to files changed since the last gate — reuse the skill's existing
  `git log --since="{gate_date}" --name-only` set, diff only those paths, so each cycle re-reviews
  only what changed.
- Lite mode / small / re-review with no new code: skip or run a single light pass per the skill's
  Adaptive Review Strategy.

## Cleanup

```bash
rm -f "$DIFF_FILE"
```
