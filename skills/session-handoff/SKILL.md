---
name: session-handoff
description: Write and re-read the project's session handoff — the "read this first if you are picking up work here" file at .agents/handoff.md. Write mode records project state in a fixed section order where every figure carries the command that produced it, keeping fast-decaying state apart from durable traps. Read mode RE-MEASURES every figure by re-running its command through a read-only whitelist and reports each line as confirmed / stale / unverifiable, so a reader never has to trust the date at the top. Use when starting work in a repo that has a handoff, when ending a session that should hand off, or when the user says "write a handoff", "refresh the handoff", "is the handoff still accurate?", or "what should I pick up".
---

# Session Handoff

> Adapted from a proposal staged by an `observe-work` review (observation #6, 2026-09-08). The
> contract below is the proposal's; the verifier, the parse rule, the whitelist and the tests are
> task.110's.

## Why this exists

A `.agents/handoff.md` opening with *"Read this first if you are picking up work here"* failed at
exactly that job three times, and every failure was structural rather than authorial:

1. **It decayed within a day and nothing said so.** The 2026-09-10 handoff named T107 as next and
   "the frontier is not empty"; T107 merged the next morning and the frontier was empty. The
   author had measured every figure and listed every command — the failure was a snapshot with no
   expiry and no re-measure step.
2. **It was written by hand with no procedure**, reconstructed from scratch each time.
3. **The durable half was interleaved with the decaying half.** Traps true for months sat beside
   state true for hours, so the half that decayed discredited the half that did not.
4. **Carried follow-ups were carried, not re-verified.** "Engine touched since" was written on
   09-10 about a file last touched 08-17.

Two ends fix this, and **the read end is what makes the write end worth doing**: a handoff whose
figures are re-measured on arrival cannot mislead about the frontier, the tip, or the counters.

## Read — re-measure before trusting

```bash
command node .agents/skills/session-handoff/scripts/handoff-verify.mjs            # table
command node .agents/skills/session-handoff/scripts/handoff-verify.mjs --json     # machine form
command node .agents/skills/session-handoff/scripts/handoff-verify.mjs path/to/handoff.md --timeout 120
```

Always `command node`, never bare `node` — see `docs/contributing/traps.md`. The verifier itself
runs every command through `command` for the same reason.

The script **never writes the handoff**. It parses the figures, re-runs each figure's command, and
prints one verdict per line:

| Verdict        | Meaning                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `confirmed`    | the command ran and every figure on the line still holds                                       |
| `stale`        | the command ran and a figure has moved — **both** values are reported                          |
| `unverifiable` | the figure could not be checked here, and the `detail` says why (table below) — never a tick   |

`unverifiable` is a verdict, not an error. "The figure holds" and "I could not check" are the same
tick to a reader shown only a tick, and the reassuring reading is the one that gets taken. A Jira
check in a GitHub-tracked repo, a command the whitelist refuses, a suite that exceeds the timeout —
each is `unverifiable` with its reason, and none of them fails the run.

| `detail`                    | Cause                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `no command`                | the Command cell has no backticked span (prose such as "inspect the catalog")          |
| `no figure`                 | a `cmd:` comment on a line with no bold span and no `expect:`                          |
| `not on whitelist: <bin>`   | the first token is not a read-only shape (see below) — **not executed**                |
| `shell operator`            | the command contains `;` `&&` `\|` `>` `<` `$(` or a backtick — **not executed**       |
| `timeout (Ns)`              | exceeded `--timeout` (default 60 s). Expected for `npm test`; the read is a preflight  |
| `command failed (exit N)`   | non-zero exit on a line whose figure is not an `exit N` figure                         |
| `could not run: …`          | the runner threw (binary missing, cwd unreadable)                                      |

### Where the verifier finds a figure's command

- **The header table** `| Check | Command | Result |`: the **first backticked span** in the
  Command cell is the command. The **bold** spans in the Result cell are the figures; a Result cell
  with no bold span is compared as a whole.
- **A prose line** ending in `<!-- cmd: <command> -->`: the command for that line; the figures are
  the bold spans on the line. `<!-- cmd: <command>; expect: <figure> -->` overrides the figures with
  one explicit one — plain text, or `/regex/` for a range (`expect: /2026-09-(0[8-9]|[1-3][0-9])/`).
- Fenced code blocks are skipped entirely.

### How a figure is compared

- `**exit N**` is compared against the exit code.
- Any other figure is normalised (emphasis stripped, lower-cased, punctuation removed) and **every
  token must appear as a whole token in the command's output** — `b13` is not satisfied by `b130`.
  It is a token-subset match, not equality, because a recorded figure is a paraphrase of output.

**This is the write-side discipline the comparison imposes:** write bold figures as tokens that
appear verbatim in the output. `**0 failures**` against a runner that prints `0 failures` holds;
`**not re-run this session**` is prose, matches nothing, and will read `stale` the moment the
command runs — which is the correct verdict for a figure nobody measured.

### The whitelist

Commands run only through a read-only whitelist, fail-closed: a first token the list does not
recognise is `unverifiable`, never run. The `command ` prefix is stripped before matching.

| First token      | Allowed shapes                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `git`            | `log` `show` `status` `rev-parse` `branch` `tag` `describe` `ls-files` `ls-remote` `diff` `remote` `rev-list` `cat-file` `blame` `shortlog` |
| `gh`             | `pr`/`issue`/`repo`/`run`/`release` + `list`/`view`/`status`/`checks`; `api` with no method or field flags (a GET) |
| `node`           | any script — scripts under `skills/*/scripts/` are read-only by convention                      |
| `npm`            | `test`; `run` of `ci`, `ci:fast`, `eval:*`, `validate:*`, `lint:*`, `format:check`, `bundle:check`, `test:*`; any `run` carrying `--check` (`npm run bundle -- --check`); `ls`, `view` |
| `npx`            | only with `--check`, `--list-different` or `--dry-run`                                          |
| `python3`, `shellcheck`, `grep`, `ls`, `wc`, `cat`, `head`, `tail`, `jq`, `stat`, `date`, `test` | any |
| `find`           | without `-delete`, `-exec`, `-execdir`, `-ok`                                                    |

`npm run generate-catalog`, `npm run bundle` (no `--check`), `npx prettier --write`, `git push`,
`gh pr merge`, `rm` — refused. The whitelist lives in the script (`WHITELIST`) and its tests; change
both together.

### `--json`

One object on stdout: `{ reason, file, counts: {confirmed, stale, unverifiable}, lines: […], exitCode }`.
Each line carries `line`, `check`, `command`, `recorded`, `verdict`, `detail`, `measured`.

| `reason`       | When                                                                | Exit |
| -------------- | ------------------------------------------------------------------- | ---- |
| `ok`           | every figure confirmed                                              | 0    |
| `stale`        | at least one figure moved — information, not failure                | 0    |
| `unverifiable` | nothing stale, at least one figure could not be checked             | 0 — **1 when nothing at all could be checked**, which is a claim about the instrument, not the handoff |
| `no-figures`   | the file parsed but carries no figure                               | 1    |
| `missing`      | the file does not exist                                             | 1    |
| `usage`        | bad arguments (`--help` prints usage with exit 0)                   | 2    |

Read `reason`, not just the exit code.

## Write — the fixed section order

Write mode is a procedure the agent follows with [`assets/handoff.template.md`](assets/handoff.template.md);
the verifier never writes. Steps:

1. **Measure first.** Run every command in the template's header table and record the figures as
   bold tokens that appear verbatim in the output. Add rows for anything else this session leaves
   worth checking, each with its command.
2. **Fill the sections in this order** — the split between the last two is the point of the format:

   | Section                       | Half-life      | Rule                                                                     |
   | ----------------------------- | -------------- | ------------------------------------------------------------------------ |
   | Header table (project state)  | hours to days  | every figure carries the command that produced it, inline                |
   | 1. What to pick up            | days           | re-verify at write time; **never carry forward** from the previous file  |
   | 2. Standing decisions         | long           | decisions taken and deliberately not revisited                           |
   | 3. Carried follow-ups         | days           | status **re-measured**, not copied; each carries its command             |
   | 4. Tolerated drift            | long           | known-wrong things deliberately not being fixed                          |
   | 5. Traps                      | durable        | **a pointer only** to `docs/contributing/traps.md` — never content       |
   | 6. Where the artifacts are    | medium         | paths, not descriptions                                                  |

3. **Never carry a figure forward.** A handoff that quotes its predecessor has an age that is
   unbounded and unstated. If a figure was not re-measured this session, say so in the cell and
   accept that read mode will report it `stale`.
4. **Keep the traps out.** A trap that has cost a session twice goes to `docs/contributing/traps.md`;
   §5 stays one paragraph pointing there.
5. **Prove it before committing**: run read mode on the file you just wrote. Every table row should
   be `confirmed`; `unverifiable` rows should each have a reason you accept (`timeout` on the full
   suite is fine — the reader can run it).

## Discoverability

The handoff must be linked from the always-loaded agent file (`AGENTS.md` / `CLAUDE.md`), and that
line must name read mode as the way to consume it. Without the link a new reader never reaches the
document; without the read-mode pointer they trust the date.

## Related

- `docs/contributing/traps.md` — where the durable half lives.
- `tracker-reconcile` — the same check-then-report shape (`satisfied / divergent / unverifiable`)
  applied to a committed tracker handover against a live board.
- `observe-work` — where the proposal for this skill came from.
