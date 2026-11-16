# Recipe: TokenEconomizer with micro-skills in a repository

Goal: a repository where Claude Code learns the repo's own facts (test command, build order, env vars)
and stops rediscovering them each session. Source: `https://github.com/microsoft/TokenEconomizer`
(README and `plugin/README.md`). Commands below are the ones those docs give, plus the output seen
when this recipe was first run on 2026-11-15.

Lines starting with `/` go into the Claude Code prompt. Lines in `sh` blocks go into a shell.

## Once per machine

1. Clone it somewhere permanent. The installed plugin runs from the clone, so never move or delete it.
   Keep the clone outside any repository you commit to, or add it to that repository's
   `.git/info/exclude`.

   ```sh
   git clone https://github.com/microsoft/TokenEconomizer.git ~/tools/TokenEconomizer
   ```

2. Install the plugin. Needs Python 3.10 or newer on `PATH`. No API key is needed.

   ```sh
   claude plugin marketplace add ~/tools/TokenEconomizer
   claude plugin install tokeneconomizer@tokeneconomizer
   claude plugin list      # tokeneconomizer@tokeneconomizer ... enabled
   ```

3. Start `claude` in any repository, trust the folder, and run `/tokeneconomizer:status`. Allow the
   plugin's script when asked. It must print a status block, not an error.

4. Record the tool list. It uses no model call.

   ```text
   /tokeneconomizer:toolprune refresh-catalog
   ```

   Repeat after every Claude Code update. Expect "N tools recorded in ~/.tokeneconomizer/hosts/claude/catalog.json".

## Per repository

Run these inside the repository, from its root. The setting is stored per repository, found through
its `origin` remote, so the working directory decides which repository you change.

1. Turn micro-skills on for this repository only:

   ```text
   /tokeneconomizer:config set microskills=on
   ```

   The terminal form costs no model turn:

   ```sh
   ~/.tokeneconomizer/bin/te --host claude config set microskills=on
   ```

   Expected output ends with `{"microskills": "envfacts+distiller"}`. That means facts learned from
   repeated failures, plus a model review every 3 sessions, charged to your session cost.

2. Check it: `/tokeneconomizer:status` shows `microskills=envfacts+distiller`.

3. Work normally for about 5 sessions. A fact is injected at session start only after 3 sessions
   confirm it, and dropped when later sessions contradict it.

4. Review: `/tokeneconomizer:status`. Look at the folded sessions, the facts injected and the
   plugin overhead. Keep it on if the overhead is small and facts appear. Turn it off if not.

## Choices

| Want | Command |
|---|---|
| No extra model calls | `config set microskills=envfacts` |
| Propose facts less often (every 5 sessions) | `config set microskills_propose_every=5` |
| Every repository on this machine | add `--global` to `config set` |
| Turn off here | `config set microskills=off` |
| Review each tool-prune list yourself | `config set toolprune=propose`, then `/tokeneconomizer:toolprune apply` |

Start with one repository. Go global only after the status looks worthwhile: a repository you rarely
open pays for the fact-proposing calls and may never earn them back.

## Check list before you trust it

- [ ] `claude plugin list` shows the plugin enabled.
- [ ] `/tokeneconomizer:status` names this repository (the `origin` remote) and `microskills=` is not `off`.
- [ ] `refresh-catalog` ran on this Claude Code version.
- [ ] You started a new session after installing. Plugins load at session start.

## Traps

- **Wrong repository.** If the shell is in another folder (for example the plugin clone), `config set`
  changes that folder's repository. `cd` to the target repository first.
- **Messages are hidden.** Claude Code shows the plugin's one-line messages only in the detailed
  transcript (Ctrl+O).
- **Tool pruning is on (`auto`) by default.** Undo with `/tokeneconomizer:toolprune restore`. Its deny
  rules go into `.claude/settings.local.json`, which the plugin keeps out of git.
- **Learning is slow.** Nothing changes until sessions have been folded. Zero sessions means nothing learned yet.
- **`microskills=envfacts` on Claude Code.** The docs name it for other agents. Check that
  `/tokeneconomizer:status` shows it after you set it.

## Update and uninstall

- Update: `git pull` in the clone, then start a new session. If status still shows old behaviour:
  `claude plugin update tokeneconomizer@tokeneconomizer`.
- Uninstall: run `/tokeneconomizer:toolprune restore` in each repository, then
  `claude plugin uninstall tokeneconomizer@tokeneconomizer` and
  `claude plugin marketplace remove tokeneconomizer`. Optionally `rm -rf ~/.tokeneconomizer` to delete
  what it learned.
