# Continuation — {work item id, or slug} — {YYYY-MM-DD}

**Goal:** {1–3 sentences: what this piece of work is for, and what "done" means}. Work item:
[{work item doc}]({link relative to this file}) · branch `{branch}`

<!-- This file hands ONE piece of in-flight work to a fresh context. Its path came from
     `continuation.mjs --json`; do not choose it by hand.
     Every figure in the table below was measured in the session that wrote this file and carries the
     command that produced it. The FIRST backticked span in Command is what the verifier runs
     (read-only whitelist); the **bold** spans in Result are what it compares — write them as tokens
     that appear verbatim in the command's output (`**exit 0**` is compared against the exit code).
     Figure forms the unchanged verifier accepts (task.156 review.1, each run, not read):
       - Targeted test: `node --test --test-name-pattern=<pattern>` with **pass N**, never
         **exit 0** — a pattern that matches no test exits 0 and would confirm. The whitelist refuses a
         file positional after `--test`. In a large repo this row may read `unverifiable: timeout`;
         that is accepted, the reader can run it.
       - Uncommitted files, when the tree is dirty: `git status --porcelain` with each file name
         bold. When it is clean, replace the row with `git diff --quiet HEAD` → **exit 0** (tracked
         files only). A **clean** figure against `git status --porcelain` reads `stale`; an empty
         Result cell reads `unverifiable: no figure`.
       - Branch tip: committing THIS file moves HEAD, so the row then reads `stale` by that commit.
         If you commit it, re-measure the tip and re-run the verifier afterwards.
     A claim in §1–§6 that states project state goes in this table, or carries a trailing cmd
     comment (SKILL.md, Read). Narrative with no command is not state. -->

| Check | Command | Result |
| --- | --- | --- |
| Branch | `git rev-parse --abbrev-ref HEAD` | **{branch}** |
| Branch tip | `git rev-parse --short HEAD` | **{short-sha}** |
| Uncommitted files | `git status --porcelain` | **{file-a}** **{file-b}** |
| Targeted test | `command node --test --test-name-pattern={pattern}` | **pass {N}** |

---

## 1. Next step

<!-- ONE concrete action, and how to tell it is done. Not a list. -->

{The single next action.} **Done when:** {the observable result}.

---

## 2. Done this session

<!-- Commits by short SHA, not narrative. `none` if nothing was committed. -->

- `{short-sha}` {subject}

---

## 3. Decisions taken

<!-- Decision — why — where it is recorded (doc, report, PR, commit). -->

- {decision} — {why} — {where recorded}

---

## 4. Ruled out

<!-- MANDATORY. Approaches tried or considered and rejected, and why. Write `none` if nothing was
     ruled out — never omit the section: an absent section and an empty one read the same. -->

- {approach} — {why it was rejected}

---

## 5. Files that matter

<!-- Paths and a one-line role. NEVER file contents. -->

```
{path}    {role}
```

---

## 6. Open questions

<!-- MANDATORY. Questions for the user, or `none`. -->

- {question}

---

## Pipeline pointer

<!-- CONDITIONAL — keep this section only when `.claude/state/develop-pipeline.lock` or
     `.claude/state/develop-pipeline.last-halt.json` exists, and delete it otherwise. Point at the
     file and at the pipeline's own resume; do NOT restate pipeline step state, which lives in the
     lock and the implementation report and goes stale here the moment the pipeline moves. -->

A develop pipeline run holds `{.claude/state/develop-pipeline.lock or .last-halt.json}`. Resume it with
`/{develop-task|develop-story} {work item path}`; its Phase 0b reads that file and the implementation
report.

---

## Resume prompt

<!-- Paste `resumePrompt` from `continuation.mjs --json` verbatim. The fence keeps the verifier from
     reading it as figures. -->

```
{resumePrompt}
```
