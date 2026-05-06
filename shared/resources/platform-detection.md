# Platform Detection (canonical)

This file is the single source of truth for how skills determine the active tracker and VCS platform. Skills reference this via the explicit path `shared/resources/platform-detection.md`. At package time, `scripts/package_skill.py` bundles this file under `references/` and rewrites the path so installed skills are self-contained.

## Resolver

```bash
# Helper: read a top-level key from skills-config.yaml using python (project standard).
# Returns "auto" if file or key is missing.
read_config_key() {
  python -c "
import yaml, sys
try:
    with open('skills-config.yaml') as f:
        print(yaml.safe_load(f).get('$1', 'auto'))
except Exception:
    print('auto')
" 2>/dev/null
}

# Tracker
TRACKER=$(read_config_key tracker)
if [ "$TRACKER" = "auto" ]; then
  if [ -n "$JIRA_URL" ]; then TRACKER="jira"; else TRACKER="github"; fi
fi

# VCS
VCS=$(read_config_key vcs)
if [ "$VCS" = "auto" ]; then
  REMOTE_URL=$(git remote get-url origin)
  if echo "$REMOTE_URL" | grep -qi "github\.com"; then VCS="github"
  elif echo "$REMOTE_URL" | grep -qi "bitbucket\.org"; then VCS="bitbucket"
  else VCS="github"; fi
fi
```

## Env vars

- `JIRA_URL` — Jira base URL (e.g. `https://example.atlassian.net`)
- `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` — auth for Jira REST
- `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD` — auth for Bitbucket REST
- `gh` CLI — assumed authenticated for GitHub paths

## Edge cases

- **Mirror repo** (BB primary, GH read-only): set `tracker: jira` and `vcs: bitbucket` in `skills-config.yaml` to override what `git remote` would detect.
- **Migration in progress** (moving between platforms): use explicit config override during the migration window; revert to `auto` when complete.
- **CI without git remote**: env-var-only path works (`JIRA_URL` set → `tracker: jira`); VCS falls back to `github` default if no remote available.

## Skills using implicit detection today

The following skills currently use the implicit detection pattern (env var + git remote) directly. Reading `tracker:`/`vcs:` from `skills-config.yaml` is a follow-up migration per-skill:

- `create-pr`, `create-task`, `finalise`, `review-story`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`

Skills that are platform-agnostic (no resolver needed):

- `create-branch`, `commit-changes`, `create-story` (docs-only), `qa-review`, `qa-gate`
