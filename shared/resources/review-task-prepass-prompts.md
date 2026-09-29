---
name: review-task-prepass-prompts
description: Two read-only Explore subagent prompts for the review-task Phase 1.5 pre-pass. Agent B checks architecture alignment, Agent C checks whether the deliverables are already implemented in the codebase. Each returns a fixed YAML summary (≤5 findings, ≤200 words). Forked from review-story-prepass-prompts.md — Agent A (epic alignment) is dropped as tasks have no parent epic.
---

# Review Task Pre-Pass Prompts

Used by `skills/review-task/SKILL.md` Phase 1.5. Both agents are dispatched in a **single parallel message** (one `Agent` tool call block with two invocations). Each prompt returns a YAML block only — no prose, no explanations outside the schema.

> **Sibling file**: `shared/resources/review-story-prepass-prompts.md` (Agents A, B, C for stories).
> When fixing bugs in Agent B or C prompts, apply the same fix to both files.

---

## Agent B — Architecture Alignment

**Subagent type**: Explore (read-only)

**Prompt template** (substitute `{task_path}`, `{arch_location}`, `{arch_domains}` and `{arch_axes}` before dispatching — the last two come from `prepass-axes.js`, see Variable substitution):

```
Read the task file at {task_path}. Extract: the tech stack references, service/module names, library names, and API patterns mentioned in the Implementation Plan and Technical Background sections.

Search for architecture documents under {arch_location} that cover the task's domain. Candidate domains: {arch_domains}. Pick the most relevant. Read at most 2 architecture files.

Compare the task's technical claims against the architecture documents on these axes:
1. Libraries: does the task reference libraries not in the architecture docs or tech-stack.md?
2. Patterns: for each of these standards that the task touches — {arch_axes} — does the task deviate from what the architecture docs say about it?
3. Contracts: are interfaces the architecture docs define (endpoints, CLI flags, exit codes, output schemas — whichever they define) used consistently with those docs?
4. Security: does the task handle auth, crypto, or sensitive data in a way that contradicts architecture guidance?

Return ONLY this YAML block (no other text):

alignment: aligned | drift | conflict
axes_checked: [<each axis name from step 2 you actually compared against>]
findings:
  - area: <one of: library | pattern | api-contract | security>
    severity: low | medium | high
    note: <one line, max 15 words>
# cap: 5 findings maximum. Omit findings array entirely if alignment is "aligned" with no issues.
```

**Fallback**: if no architecture documents can be found under `{arch_location}`, return:
```yaml
alignment: unknown
axes_checked: []
findings:
  - area: arch-not-found
    severity: low
    note: No architecture documents found — skipping architecture alignment check
```

---

## Agent C — Codebase Already-Implemented Scan

**Subagent type**: Explore (read-only)

**Prompt template** (substitute `{task_path}` before dispatching):

```
Read the task file at {task_path}. Extract the key symbols, function names, file paths, module names, and feature names mentioned in the Technical Background, Implementation Plan, and Files Summary sections.

For each extracted symbol or feature name, grep the codebase (excluding docs/, node_modules/, .git/, dist/, build/) to check whether it already exists.

Assess whether the task's core deliverable appears to already be implemented, partially implemented, or not yet present.

If the task enumerates call sites of one of this repository's engines (tracker-comment.js, stakeholder-summary-cli.js, gh-stage.js, jira-stage.js, tracker-issue.js) — it lists them, counts them, or says "all call sites of" — do not confirm the names it gives one by one: a grep for a named site cannot see an unnamed one. Run, from the repository root, `command node .agents/skills/review-task/references/call-sites.js --engine <engine> --json` and list every site it returns that the task does not name. If it answers `reason: no-roots`, this tree cannot be measured: omit population_diff and add a finding with symbol `call-sites`, found_at `not found`, note `no-roots — population not measurable here`.

Return ONLY this YAML block (no other text):

implementation_status: not-implemented | partial | fully-implemented
findings:
  - symbol: <name searched>
    found_at: <file path, or "not found">
    note: <one line, max 15 words>
population_diff:
  - <file>:<line> of a collector site the task does not name
# cap: 5 findings maximum. If nothing is implemented, return implementation_status: not-implemented with an empty findings array.
# population_diff: omit it when the task enumerates no call sites; an empty list means it names every site.
```

**Fallback**: if grep tooling is unavailable, return:
```yaml
implementation_status: unknown
findings:
  - symbol: scan-unavailable
    found_at: not found
    note: Grep unavailable — codebase scan skipped
```

---

## Dispatch Instructions

### How to dispatch (in `review-task` Phase 1.5)

Send both agents in a **single message** with two `Agent` tool calls:

```
Agent B: subagent_type="Explore", prompt=<Agent B prompt with task_path and arch_location substituted>
Agent C: subagent_type="Explore", prompt=<Agent C prompt with task_path substituted>
```

Do NOT send them sequentially — both must be in the same tool-call block to run in parallel.

### Variable substitution

| Variable | Source |
|----------|--------|
| `{task_path}` | Resolved in Input Resolution / Step 1 |
| `{arch_location}` | `skills-config.yaml` → `architecture.architectureShardedLocation`, default: `docs/architecture` |
| `{arch_domains}` | `prepass-axes.js --arch {arch_location} --json` → `domains`, joined with `, ` |
| `{arch_axes}` | the same call → `axes`, joined with `; ` |

`prepass-axes.js` reads the H2 headings of `concepts/tech-stack.md` (domains) and
`concepts/coding-standards.md` (axes) under `{arch_location}`. A half counts only when its file
exists **and** has a non-empty `## ` heading — an empty half falls back like a missing file. Its
`source` is `architecture` when both halves count, `partial` when one does, and `fallback` when
neither does. The fallback supplies the former web-stack lists as **candidates**, which is why the
template calls the slots candidates rather than this repository's own. A file that exists but cannot
be read exits 1 with nothing on stdout: treat that as a failed pre-pass, never substitute an empty
slot. Record `source` beside the summary and in the review report: an `aligned` measured against
fallback axes is a weaker result than one measured against the repository's own standards (obs #130).

### Handling agent failures

If one agent times out or returns malformed output:
- Log a warning: `⚠️ Pre-pass Agent {B/C} failed — proceeding without {architecture/codebase} summary`
- Continue with the summary from the remaining agent
- Do NOT re-run or retry the failed agent — the Q&A phase handles the gap

### Summary schema validation

Before passing summaries to the Q&A phase, validate each returned block has the expected top-level key (`alignment` for B; `implementation_status` for C). If the key is missing, treat the agent as failed and apply the failure rule above.

**Agent B also needs `axes_checked`.** An `alignment: aligned` whose `axes_checked` is missing or empty is
a **failed** agent — apply the failure rule above and perform the pass inline. An `aligned` that names
nothing it was aligned against is not a result: it is the answer a web-stack prompt gave a shell/Node
repository (obs #130). `drift` and `conflict` without it are accepted, because their findings
already name the areas; `unknown` carries `axes_checked: []`.
