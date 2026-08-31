---
name: qa-runnable-prose-detection
description: The detection rule that decides when a QA review must EXECUTE a skill's documented shell snippets rather than only read them. Stated once here and referenced by qa-task (Step 4b) and qa-story (Phase 1.7); the orchestrator's step 5-6 doc cross-references it. Covers what counts as runnable prose, block classification (runnable / placeholder / mutating), the fail-closed safety boundary, dual-shell comparison, and how results map onto existing QA finding shapes.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-runnable-prose-detection.md. Regenerate via `npm run bundle`. -->

# QA — Runnable-prose detection rule

## Why this exists

A skill's deliverable is often **runnable prose**: fenced shell snippets and CLI invocations that an
agent will copy out of the markdown and execute verbatim. QA reads that prose. Until this rule existed,
nothing ran it.

That gap has a measured cost. Task 66 (`review-pr`) passed two QA cycles, a DoD gate and eleven mutation
proofs while its Step 3 artifact-collection block used a multi-glob `ls`. Under **zsh** — the default
macOS shell — a glob that matches nothing aborts the entire command, so one absent artifact kind
suppressed every kind that was present:

| Shell | stdout lines | exit |
| ----- | ------------ | ---- |
| bash  | 6            | 1    |
| zsh   | **0** (`no matches found: …/*.bug.*.md`) | 1 |

Note the exit codes. **They agree.** Only the *stdout* comparison separates a working block from a
broken one, which is why stdout is the load-bearing signal in this rule and exit status is not
sufficient on its own.

Contract tests could not have caught it. Forty of them passed. They assert what the prose *says*; this
rule asserts what it *does*.

---

## 1. When the rule fires

A work item is **runnable prose** when its diff adds or modifies at least one file that is

- a `SKILL.md`, **or**
- a `shared/resources/*.md` prompt or protocol document

**and** that file contains at least one fenced ` ```bash ` block.

Anything else skips the step. The skip is **recorded, never silent** — see §5.

> Only ` ```bash ` fences are in scope. ` ```sh `, ` ```shell `, ` ```console ` and language-less fences
> are out of scope for now: widening the net widens what gets executed, and the fence label is the only
> declaration of intent available. A file that means its snippets to be run should label them `bash`.

---

## 2. Block classification

Every fenced `bash` block in a changed in-scope file is classified into exactly one of three buckets.

| Class         | Meaning                                                         | Executed? |
| ------------- | --------------------------------------------------------------- | --------- |
| `runnable`    | Every command is on the safe-command allow-list, and every variable it reads is bound | ✅ yes |
| `placeholder` | Contains `{…}` / `<…>` template slots, or reads a variable nothing binds | ❌ no |
| `mutating`    | Matches the deny-list, **or** contains any command not on the allow-list | ❌ no |

### 2a. The safety boundary fails closed

This is the part that must not be softened. Classification is driven by an **allow-list of read-only
commands**, not by the deny-list. The deny-list exists only to produce a precise reason for the cases
worth naming (`git push`, `gh pr comment`, `curl -X POST`, `rm -rf`, …).

**Anything unrecognised is `mutating` and is never executed.** A novel command the allow-list has not
heard of is treated as dangerous, not as safe-by-default. A deny-list alone fails *open*: every command
nobody thought to forbid runs.

The practical consequence, and it is intentional: `gh` and `curl` are **not** on the allow-list in any
form. Read-only `gh pr view` and `curl -sf` are skipped along with the mutating ones. Executing a
network call from inside a QA gate is a side effect QA should not have, and the execution environment
is built from a minimal allow-list (`PATH`, `HOME`, `LANG`, `TERM`, `TMPDIR`) plus the caller's
bindings — the parent process's credentials are never passed through.

Three further rules fall out of the same principle, each added after a review found the boundary open:

- **A write redirection makes any command mutating**, allow-listed or not. `echo x > /tmp/f` writes a
  file, and an absolute or `~`-relative target ignores the working directory entirely, so the sandbox
  is no defence. Redirection to `/dev/null`, `/dev/stdout` or `/dev/stderr` persists nothing and is
  exempt, as is file-descriptor duplication (`2>&1`) — without that exemption the guard in §3a below
  is itself unrunnable.
- **Command runners are refused outright** — `env`, `command`, `time`, `xargs`, `sudo`, `nohup`,
  `eval`, `exec`, and `awk`. Their blast radius is whatever follows, and only the leading word is
  scanned. `awk` belongs here for a different reason: its program is a quoted argument, so
  `awk 'BEGIN{system("…")}'` is arbitrary shell the scanner cannot see. The one exception is
  `command -v` / `command -V`, which print a path and run nothing.
  *This costs real coverage — `awk '{print $2}'` is harmless and gets skipped. That is the fail-closed
  trade accepted deliberately: recognising a safe `awk` program means parsing `awk`.*
- **An unreadable command position is unsafe, not absent.** A leading token that cannot be parsed as a
  command name — a variable command `$CMD`, a quoted one — classifies `mutating`. Treating it as "no
  command here" is how a fail-closed rule fails open.

### 2b. Unbound variables are placeholders, not failures

The caller supplies a binding set (`DOC_FILE`, `D`, `PR_NUMBER`, …). A block that reads a variable which
is neither bound by the caller nor assigned inside the block itself is reclassified `placeholder` — it
was written to be run in a context this gate cannot reconstruct. That is a skip with a reason, not a
defect.

---

## 3. Dual-shell execution

Each `runnable` block is executed under **`bash -c`** and **`zsh -c`**, in a temporary working
directory, with a timeout. stdout, stderr and exit status are captured per shell.

A finding is raised when either of these holds:

| Condition                        | Finding                | `confidence` |
| -------------------------------- | ---------------------- | ------------ |
| Either shell exits non-zero      | `execution-failure`    | `high`       |
| The two shells disagree on stdout | `shell-disagreement`  | `medium`     |

`medium` on disagreement is deliberate: some blocks legitimately differ between shells, and a check that
cries wolf is a check reviewers learn to skip.

### 3aa. Defence in depth — the sandbox sentinel

Classification is the first line, and it has been wrong: a single review found **thirteen** inputs that
reached `runnable`, one of which wrote a file outside the working copy. So the runner keeps a second,
independent line that does not consult the classifier at all.

Each block runs in `work/` inside a private temp root. Before and after the run, the runner snapshots
the temp root **excluding `work/`** — writes inside the copy are expected — and reports any difference
as an `escaped-sandbox` finding at `confidence: high`.

The sandbox root is passed explicitly by the caller. Deriving it from the working directory (`cwd/..`)
was tried and is wrong: `runBlock` accepts any `cwd`, so a bare temp directory made the sentinel walk
the whole of `/tmp` twice per block. **A safety net that guesses its own boundary is not a safety net.**

### 3a. The zsh arm is guarded

`zsh` is not guaranteed to exist — CI runs on `ubuntu-latest`. Guard it the way this repository already
guards its one hand-written parity suite (the `tracker-access` shell test suite, §12 "zsh parity"):

```bash
if command -v zsh >/dev/null 2>&1; then
  : # run both arms
else
  : # bash only; record zsh-unavailable
fi
```

When zsh is absent, run the bash arm alone and record `zsh-unavailable` as **information**. It must not
raise a finding, and it must not trip the zero-executed rule in §4 — a missing interpreter is not a
defect in the work item under review.

---

## 4. A run where zero blocks executed is itself a finding

If an in-scope file has fenced `bash` blocks and **none** of them classified `runnable`, that is
reported as a finding, not as a pass.

This is the rule's own failure mode, so it is stated explicitly rather than left to good sense: an
over-broad `placeholder` or `mutating` classification would make the step quietly do nothing, which is
precisely the silent-skip shape the step exists to eliminate. A gate that cannot fail is not a gate.

Its `confidence` is **`medium`**, unlike the two findings in §3. It is a statement about *coverage* —
this gate did nothing here — not a defect in the work item, and `confidence: high` on a `category: bug`
is what makes a finding gate-blocking. A skill whose every snippet reads a caller variable would
otherwise block its own pull request for needing bindings the run did not supply. Measured: `qa-task`
and `qa-story` both classify **0 runnable** without bindings, so at `high` this step would have blocked
the very change that introduced it.

The finding still appears in the QA report, which is what "a finding, not a pass" asks for. When it
fires with a non-zero `placeholder` count, the fix is usually to pass the missing values with `--bind`,
and the detail says so.

---

## 5. Reporting

The QA report records, for the file under review:

- how many blocks were found, and the count in each class
- **every skipped block with its line number and reason** — a silent skip recreates the problem
- which shells actually ran (and `zsh-unavailable` when applicable)
- each finding, mapped onto the existing `code_review` finding shape: `category: bug`, with `severity`
  and `confidence` per the table in §3

No new report or gate schema. An execution failure is eligible for `top_issues[]` under
`code_review_blocking` exactly like any other `category: bug` finding.

---

## 6. Engine

`references/qa-execute-snippets.mjs` implements extraction, classification and dual-shell
execution. It is a library plus a CLI:

```bash
node references/qa-execute-snippets.mjs --file <path.md> --json
```

Exit codes follow the repository convention: `0` clean, `1` findings, `2` hard error.

Bind caller values with repeated `--bind NAME=VALUE`, seed the temp working directory from a real
directory with `--copy <dir>`, and set the per-block timeout with `--timeout <ms>`.
