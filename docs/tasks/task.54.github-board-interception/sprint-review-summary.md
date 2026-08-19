# Sprint Review Summary — Task 54

**Task**: [Intercept GitHub board mutations, and give `gh-stage.js` the credential-free plan its sibling already has](./task.54.github-board-interception.md)
**Issue**: [#232](https://github.com/Gamaroff/agent-skills/issues/232) · **PR**: [#255](https://github.com/Gamaroff/agent-skills/pull/255)
**Accepted**: 2026-08-19 · **Gate**: PASS 95/100 · **QA cycles**: 2

---

## Summary

Restricted tracker access is now real on the GitHub side. Before this task, an operator who set
`access.tracker: manual` got a normal-looking run and could reasonably conclude they were protected —
while board fields, issue comments and PR comments all wrote as usual. Task 53 had closed the Jira
half and the board *Status* field; this closes the rest.

## What shipped

**`gh-stage.js --print-plan`** — the twin of the Jira flag, and the piece that makes the rest usable.
It resolves which board column a pipeline moment names by reading `tracker-workflow.yaml` alone, with
no credentials and no network, and runs *above* the `gh auth` check. That placement is the feature:
the consumer who needs it most has no `gh` auth by definition, and their handover checklist still has
to say *"move the card to **Ready for Review**"* using their board's real column name.

**Everything else on the GitHub surface, gated:**

- The two board-field helpers (`Priority`, `Estimate`), which call `gh api graphql` directly and were
  never covered by `gh-stage.js`'s gate.
- `tracker_call_with_retry` → **`tracker_write`**, with the mode check prepended to the retry
  wrapper — one check covering ~38 `gh` mutations across 11 files with **zero call-site edits**. The
  old name survives as a tested alias.
- Two gaps closed in task 53's gate: the deferred record now names the board *add*, and its
  `verify.cmd` no longer requires credentials the deferring host lacks.
- `finalise` treats `deferred` as a recorded outcome and escalates via the existing path.

## What we chose not to do, and why

- **No fifth copy of the access-mode table.** The two shell guards ask `defer-mutation.js
  --resolve-access` rather than re-implementing the contract. There were already four copies.
- **No fail-open under `full`** when the deferred-mutation writer is missing, despite that being
  raised as an option. It would trade a real fail-closed property for a convenience.
- **The bundler still has no rule** for a shell script invoking a sibling `.js`. That is the root
  cause of the HIGH defect below, and it stays open — guarded by a test, not by the tool.

## Honest limits

Named in the runtime banner and in four docs, so nobody infers more protection than exists: Jira
writes issued as raw `curl` or through the Atlassian MCP tools, and the GitHub calls whose stdout a
caller captures (`gh issue create`, sub-issue links), still proceed normally. Wrapping the latter
would hand the caller an empty capture; they get a purpose-built CLI in task 56 instead.

## Quality

QA ran two cycles and the first one failed — usefully.

| Defect | Why it mattered |
| ------ | --------------- |
| **[HIGH]** `defer-mutation.js` not bundled beside the three shell files that now invoke it | Board writes silently stopped **under `full`** in 11 installed skills — a regression in capability predating this task. Every test was green, because every test runs against `shared/resources/` and the defect existed only in `skills/*/references/`. |
| **[MEDIUM]** `--print-plan` bypassed `--stage` validation under `--probe-board`/`--check` | A typo returned the same payload as a deliberately disabled moment, so it would silently drop a board move from a checklist — the exact failure the mode exists to prevent. |

Both fixed and verified by re-executing each bug report's own steps rather than by reading the diff.
The HIGH fix is **comments only** — the runtime logic was never wrong, only its dependency
declaration.

**Verification:** 33 new tests; **9 invariants each watched failing**; `npm test` 1448/0, shell
416/0, `validate:all` 115/0, prettier clean, bundle warning-free; CI green on the final head.

Three further defects were caught by tooling rather than review during the run — two zsh-vs-bash
portability bugs (in both, the write was correctly refused but the audit trail was silently empty)
and one self-inflicted bundler warning. All three now have permanent guards.

## Demo notes

```bash
# The headline: which column, with no credentials and no network
node .agents/skills/develop-task/references/gh-stage.js --stage done --print-plan

# The interception, with a gh stub that fails on any write verb
AGENT_SKILLS_ACCESS_TRACKER=manual bash shared/resources/set-github-project-priority.sh 232 high
#   ⏸️  access.tracker=manual — not setting Priority on issue #232; recorded as <id>.
```

## Impact

Consumers can declare `access.tracker` and have it mean something on GitHub. The deferred-mutation
journal now captures the board and issue writes a restricted run declined, so the handover checklist
is complete rather than quietly short — which was the whole point of the 51–57 sequence.

## Follow-up

- **[LOW]** `--probe-board --print-plan` with no `--stage` reports `unknown moment ""` rather than
  `--stage is required`.
- **[design]** A bundler rule for `node "$(dirname …)/x.js"` in shell files.
- **task.56** — the GitHub issue lifecycle (create/close/comment/sub-issue), which needs a CLI rather
  than a wrapper.
