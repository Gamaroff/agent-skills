# evals/review-pr — end-to-end eval of `/review-pr`

Four scenarios that run `/review-pr` against a hermetic sandbox and check what it writes. No
network, no real PR, no outward-facing call.

```bash
npm run eval:review-pr                              # replay — CI, every push (part of eval:all)
env -u ANTHROPIC_API_KEY npm run eval:review-pr:cli # live — N runs per scenario, a pass rate
EVAL_RUNS=1 KEEP_SANDBOX=1 DRIVER=claude-cli node evals/shared/runner.mjs evals/review-pr/scenarios/01-happy
```

## What a green run means — and what it does not

**Replay is not a verdict on the skill.** Under `DRIVER=replay` no agent runs: the runner builds the
sandbox, copies the scenario's `replay/` golden output over it, and asserts. A green replay proves
the setup hook, the fixtures and the assertions fit together. Only the **live** layer judges
`/review-pr`, and only as a pass rate — one live run is one sample.

## The sandbox

[`setup.mjs`](setup.mjs) is the one setup hook all four scenarios share (`scenario.json` →
`"setup": "../../setup.mjs"`). In the runner's sandbox it builds:

- a local bare origin at `.eval/origin.git` and a working clone at the sandbox root, `develop` plus
  the scenario's PR branch pushed — so the skill's `git fetch origin` and
  `git diff origin/develop...origin/<branch>` work offline;
- `skills-config.yaml` pinning `tracker: github` / `vcs: github`, and blank `JIRA_URL`, `TRACKER`,
  `VCS` in the env, so a developer's Jira setup cannot change the platform;
- the work item `task.901.widget-age-gate` (a number no real task in this repo can reach) with its
  full trail — implementation report, review, QA report, gate (`PASS`), DoD, sprint-review summary;
- the skill at `.agents/skills/review-pr`, the path its snippets address (the claude-cli driver
  installs the `.claude/skills/review-pr` copy it needs for discovery, from `scenario.skill`);
- the fake `gh` ([`evals/shared/lib/fake-gh.mjs`](../shared/lib/fake-gh.mjs)) serving PR 901 (or
  902) from fixtures derived from the **same** `git diff`, so the git path and the API fallback
  agree byte for byte. Every `gh` call is logged to `.eval/gh-calls.jsonl`; every write is refused.

`fixture.variant` picks the change set: `happy` (`age >= 18`, tests at 17/18/30), `planted-bug`
(`age > 18`, tests at 17/30 only), `unanchored` (a README tidy on `chore/tidy`).

## Scenarios

| Scenario | The guarantee it checks | Assertions | Live `minPass` |
| --- | --- | --- | --- |
| `01-happy` | A clean PR with a complete trail is approved, and the report lands where the standard puts it | `task.901.pr-review.1.…md` exists; `**Verdict:**` reads APPROVE; `## Machine-Readable Findings` present | 4/5 |
| `02-renumber-gap` | The report number is highest + 1, never count + 1 (obs #272) | `.4.` exists beside `.1.` and `.3.`; `.2.` absent; both earlier reports keep their sentinel line | 5/5 |
| `03-unanchored` | No work item → no file | no `.pr-review.` file anywhere under `docs/` | 5/5 |
| `04-planted-bug` | An off-by-one the trail calls tested is caught | verdict is **not** APPROVE; a `CR-` finding cites `src/age.js` | 4/5 |

Every scenario also asserts that `.eval/gh-calls.jsonl` has no `"refused":true` and no
`"unhandled":true` line — "never posts without asking", and "no read the fixtures did not
anticipate". A `liveAssertions` entry requires a `pr view` line in the log, so a live run that
reached the real `gh` instead of the fake fails.

Verdict scenarios (01, 04) carry a 4/5 floor because a model's judgement varies run to run; the
mechanical ones (02, 03) must pass every run. A noisy scenario gets a tighter fixture or a lower
floor **with a stated reason** — never a deleted assertion.

## Live runs

- **Auth.** `claude -p` uses the shell's auth, and `ANTHROPIC_API_KEY` beats a claude.ai login. If
  that key's account cannot pay, every run fails in seconds with `Credit balance is too low`; unset
  it for the run (`env -u ANTHROPIC_API_KEY …`).
- **Permissions.** Each scenario passes a scoped `--allowedTools` list in `cliArgs`
  (`Bash Read Grep Glob Write Edit Agent Skill`). `/review-pr` is mostly Bash, and `claude -p` with no
  permission flag cannot run it. Permissions are never bypassed wholesale.
- **Time.** A run is two read-only lenses plus resolution. Measured durations are in the task.185
  implementation report; raise `EVAL_TIMEOUT_MS` (default 5 minutes) if a run is cut off, and say why
  here.
- **Not hermetic about you.** The nested `claude` loads your user-level `~/.claude` settings,
  `CLAUDE.md` and MCP servers. The sandbox isolates git and GitHub, not your agent configuration.

## Replay golden output

Each `replay/` tree holds only what a passing live run writes — the one report (nothing, for 03) —
trimmed to a minimal valid report so it does not pin model wording. Regenerate from a passing
`KEEP_SANDBOX=1` live run when the report template changes. The trees are git-tracked through the
`.gitignore` replay negation block.
