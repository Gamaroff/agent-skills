# Platform Detection (canonical)

> **Setting up a project? Skip this doc.** Run the [setup wizard](../../docs/concepts/getting-started.md#quick-setup-wizard) — it picks the platform interactively and writes the right `skills-config.yaml` for you. This document is the resolver-internals reference for skill authors and for cases where you need to override auto-detection.

This file is the single source of truth for how skills determine the active tracker and VCS platform. Skills reference this via the explicit path `shared/resources/platform-detection.md`. At package time, `scripts/package_skill.py` bundles this file under `references/` and rewrites the path so installed skills are self-contained.

## Canonical helper

The resolver is implemented as a sourceable bash helper: `shared/resources/resolve-platform.sh`.

```bash
# In any skill — source once before the first platform branch:
source shared/resources/resolve-platform.sh
# TRACKER = jira | github
# VCS     = github | bitbucket
```

`package_skill.py` auto-bundles and rewrites this path into `references/resolve-platform.sh` inside each skill's zip. Installed skills are self-contained.

## Resolver (reference copy)

```bash
read_config_key() {
  local key="$1" val=""
  # Tier 1: python+pyyaml (full YAML)
  val=$(python -c "
import yaml
try:
    with open('skills-config.yaml') as f:
        v = yaml.safe_load(f).get('$key', 'auto')
        print(v if v is not None else 'auto')
except Exception:
    print('auto')
" 2>/dev/null) || val=""
  # Tier 2: awk fallback when pyyaml unavailable
  if [ -z "$val" ] || [ "$val" = "auto" ]; then
    val=$(awk -F': *' "/^${key}:/{gsub(/[[:space:]]+$/, \"\", \$2); print \$2; exit}" \
      skills-config.yaml 2>/dev/null)
    [ -z "$val" ] && val="auto"
  fi
  echo "$val"
}

TRACKER=$(read_config_key tracker)
[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)

VCS=$(read_config_key vcs)
[ "$VCS" = "auto" ] && VCS=$(git remote get-url origin 2>/dev/null | grep -qi bitbucket.org && echo bitbucket || echo github)
```

## Env vars

- `JIRA_URL` — Jira base URL (e.g. `https://example.atlassian.net`)
- `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` — auth for Jira REST
- `BITBUCKET_USERNAME`, `BITBUCKET_API_TOKEN` — auth for Bitbucket REST.
  `BITBUCKET_APP_PASSWORD` is still honoured as a fallback; see below.
- `gh` CLI — assumed authenticated for GitHub paths

### The Bitbucket credential

Resolve it once, and prefer the new name:

```bash
BB_TOKEN="${BITBUCKET_API_TOKEN:-$BITBUCKET_APP_PASSWORD}"
curl -u "$BITBUCKET_USERNAME:$BB_TOKEN" https://api.bitbucket.org/2.0/...
```

Four things about this credential are easy to get wrong:

- **It is an Atlassian API token (`ATATT…`), not an app password.** Atlassian removed app passwords
  on **2026-07-28**; only the older variable _name_ survives, as a fallback for `.env` files written
  before the rename. Create the token at
  [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
- **The token needs Bitbucket scopes ticked.** A scopeless token authenticates against Jira and
  fails against Bitbucket, which reads as a Bitbucket outage rather than a permissions problem.
- **Bitbucket uses Basic auth (`curl -u`), never Bearer.** Bearer belongs to repository and workspace
  access tokens — a different credential type in a different context.
- **An unauthenticated call returns 404, not 401.** Bitbucket hides private repositories from
  anonymous callers, so a missing or wrong credential surfaces as an _empty result_, not an error.
  Never treat an empty listing as evidence of absence until a repo-root probe has returned 200.

## Edge cases

- **Mirror repo** (BB primary, GH read-only): set `tracker: jira` and `vcs: bitbucket` in `skills-config.yaml` to override what `git remote` would detect.
- **Migration in progress** (moving between platforms): use explicit config override during the migration window; revert to `auto` when complete.
- **CI without git remote**: env-var-only path works (`JIRA_URL` set → `tracker: jira`); VCS falls back to `github` default if no remote available.

## Skills migrated to the helper

All 8 leaf skills now source `resolve-platform.sh`:

- `create-pr`, `create-task`, `finalise`, `review-story`, `review-task`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`

Skills that are platform-agnostic (no resolver needed):

- `create-branch`, `commit-changes`, `create-story` (docs-only), `qa-review`, `qa-gate`
