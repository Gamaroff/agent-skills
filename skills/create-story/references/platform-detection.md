<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/platform-detection.md. Regenerate via `npm run bundle`. -->
# Platform Detection (canonical)

> **Setting up a project? Skip this doc.** Run the [setup wizard](../../docs/concepts/getting-started.md#quick-setup-wizard) — it picks the platform interactively and writes the right `skills-config.yaml` for you. This document is the resolver-internals reference for skill authors and for cases where you need to override auto-detection.

This file is the single source of truth for how skills determine the active tracker and VCS platform. Skills reference this via the explicit path `references/platform-detection.md`. At package time, `scripts/package_skill.py` bundles this file under `references/` and rewrites the path so installed skills are self-contained.

## Canonical helper

The resolver is implemented as a sourceable bash helper: `references/resolve-platform.sh`.

```bash
# In any skill — source once before the first platform branch:
source references/resolve-platform.sh
# TRACKER = jira | github
# VCS     = github | bitbucket
```

`package_skill.py` auto-bundles and rewrites this path into `references/resolve-platform.sh` inside each skill's zip. Installed skills are self-contained.

Its companion for the Bitbucket branch is `references/bitbucket-auth.sh`, which resolves the REST credential and the auth scheme — see [The Bitbucket credential](#the-bitbucket-credential).

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
- `BITBUCKET_ACCESS_TOKEN` — auth for Bitbucket REST via **Bearer**, for a repository, project or
  workspace access token. Optional; when set it **replaces** the username/token pair below rather
  than supplementing it.
- `BITBUCKET_USERNAME`, `BITBUCKET_API_TOKEN` — auth for Bitbucket REST via **Basic**. The default.
  `BITBUCKET_APP_PASSWORD` is still honoured as a fallback; see below.
- `gh` CLI — assumed authenticated for GitHub paths

### The Bitbucket credential

**Two credential types are supported, and the scheme differs between them.** Never hand-roll the
selection — source the helper and use the argument vector it sets:

```bash
source references/bitbucket-auth.sh || exit 1   # or HALT, per the calling skill
curl -sf "${BB_CURL_AUTH[@]}" "https://api.bitbucket.org/2.0/..."
```

| Set | Scheme | What the helper emits |
| --- | ------ | --------------------- |
| `BITBUCKET_ACCESS_TOKEN` | Bearer | `--header "Authorization: Bearer …"` |
| `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN` (or `BITBUCKET_APP_PASSWORD`) | Basic | `--user "user:token"` |
| Neither | — | nothing, and a **non-zero status** |

It also sets `BB_AUTH_SCHEME` (`bearer` | `basic` | `none`) for diagnostics. `package_skill.py` and
`bundle_skill.py` bundle `references/bitbucket-auth.sh` into `references/` alongside this
document, so an installed skill sources `references/bitbucket-auth.sh`.

Five things about this credential are easy to get wrong:

- **An Atlassian API token (`ATATT…`) is Basic; an access token is Bearer.** Atlassian removed app
  passwords on **2026-07-28**; only the older variable _name_ survives, as a fallback for `.env`
  files written before the rename. Create an API token at
  [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens),
  or a repository/project/workspace access token from the corresponding Bitbucket settings page.
- **The API token needs Bitbucket scopes ticked.** A scopeless token authenticates against Jira and
  fails against Bitbucket, which reads as a Bitbucket outage rather than a permissions problem.
- **The scheme is chosen by variable _name_, never by inspecting the token's value.** Do not sniff
  for an `ATATT` prefix to guess. Atlassian's credential formats have already changed once inside
  this project's lifetime, and a prefix heuristic silently mis-authenticates the day they change
  again. A variable name is a decision the operator made; a prefix is a guess about a vendor. Bearer
  wins when both are set, so an explicit opt-in is not overridden by stale Basic vars left in a
  `.env`.
- **A Bearer access token has no username.** That is the real structural difference between the two
  credential types, and it is why `BITBUCKET_USERNAME` belongs only on the Basic branch. Setting a
  username alongside an access token does nothing.
- **An unauthenticated — or wrongly-schemed — call returns 404, not 401.** Bitbucket hides private
  repositories from anonymous callers, so a missing credential, an empty one, or Bearer sent where
  Basic was expected all surface as an _empty result_ rather than an error, and are
  indistinguishable from each other. **Read the status code, never the length of the list.** Never
  treat an empty listing as evidence of absence until a repo-root probe has returned 200. This is
  also why the helper fails loudly instead of emitting a half-formed credential: `--user user:` and
  an empty `Authorization: Bearer` are both syntactically valid and authenticate nothing.

## Edge cases

- **Mirror repo** (BB primary, GH read-only): set `tracker: jira` and `vcs: bitbucket` in `skills-config.yaml` to override what `git remote` would detect.
- **Migration in progress** (moving between platforms): use explicit config override during the migration window; revert to `auto` when complete.
- **CI without git remote**: env-var-only path works (`JIRA_URL` set → `tracker: jira`); VCS falls back to `github` default if no remote available.

## Skills migrated to the helper

All 8 leaf skills now source `resolve-platform.sh`:

- `create-pr`, `create-task`, `finalise`, `review-story`, `review-task`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`

Skills that are platform-agnostic (no resolver needed):

- `create-branch`, `commit-changes`, `create-story` (docs-only), `qa-review`, `qa-gate`
