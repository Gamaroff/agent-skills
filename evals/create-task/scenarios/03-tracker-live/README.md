# 03-tracker-live

**Live tracker scenario** — actually creates an issue in a real Jira project or GitHub repo, asserts the receipt, then deletes/closes the issue. Not part of the hermetic CI gate.

## When this runs

| Driver | Behaviour |
| --- | --- |
| `replay` (default) | Cleanly skipped — receipt cannot be synthesised |
| `claude-cli` | Runs if `claude` is on PATH; auth via the cli's existing config |
| `claude-sdk` | Runs if SDK installed + `ANTHROPIC_API_KEY` set |

CI invokes this only on `workflow_dispatch` (manual trigger), gated on `JIRA_TOKEN` or `GH_TOKEN` being non-empty in repo secrets. See `.github/workflows/test.yml#live-tracker`.

## Required env

The skill itself reads these via `shared/resources/resolve-platform.sh`. The runner doesn't validate them — if they're missing, the skill HALTs and assertions catch it.

### Jira
```
JIRA_URL=https://your-org.atlassian.net
JIRA_USER=automation@your-org.com
JIRA_TOKEN=…                   # API token, NOT password
JIRA_PROJECT=EVAL              # project key the eval will create issues under
```

### GitHub
```
GH_TOKEN=ghp_…                 # PAT or app token with repo:issues scope
GH_REPO=owner/repo             # repo to create eval issues in
```

## Required receipt shape

After the skill runs, it MUST write `.eval/tracker-receipt.json` with:

```json
{
  "createdInRealTracker": true,
  "platform": "jira" | "github",
  "issueKey": "PROJ-123" | "42",
  "repo": "owner/name"          // github only
}
```

The runner's cleanup helper (`evals/shared/lib/tracker-cleanup.mjs`) reads this receipt and:

- Jira: `jira issue delete <KEY> --force`
- GitHub: `gh issue close <N> -R <repo>` + `gh issue lock` (GitHub does not permit issue deletion)

Cleanup runs even when assertions fail, so a botched eval cannot leak a live issue. Cleanup failure is logged but does not change the exit code — assertion results dominate.

## Safety notes

- Set `JIRA_PROJECT` / `GH_REPO` to a **dedicated eval project/repo**. Do not point this at production trackers.
- Cleanup uses `jira` / `gh` cli binaries; ensure they're installed on the runner.
- The receipt-driven cleanup means even an ad-hoc local run with `EVAL_CLEANUP=1` is reversible.
- A failing cleanup logs `tracker-cleanup: WARN …`; periodically audit the eval project for orphans.
