# Platform Detection (canonical)

> **Setting up a project? Skip this doc.** Run the [setup wizard](../../docs/concepts/getting-started.md#quick-setup-wizard) — it picks the platform interactively and writes the right `skills-config.yaml` for you. This document is the resolver-internals reference for skill authors and for cases where you need to override auto-detection.

This file is the single source of truth for how skills determine the active tracker and VCS platform, and how much access the agent has to each. Skills reference this via the explicit path `shared/resources/platform-detection.md`. At package time, `skills/create-skill/scripts/package_skill.py` (zip) and `bundle_skill.py` (in-tree) bundle this file under `references/` and rewrite the path so installed skills are self-contained.

## Canonical helper

The resolver is implemented as a sourceable bash helper: `shared/resources/resolve-platform.sh`.

```bash
# In any skill — source once before the first platform branch:
source shared/resources/resolve-platform.sh || exit 1
# TRACKER        = jira | github
# VCS            = github | bitbucket
# ACCESS_TRACKER = full | read-only | approve | command | manual
# ACCESS_VCS     = full
```

> **Copy the `|| exit 1`.** The resolver rejects an unrecognised value on any of the four keys by
> writing to stderr and returning non-zero. A caller that sources it bare prints the message and
> carries straight on with a default — which for an access control is the exact silent-permissive
> outcome the validation exists to prevent. Every call site in this repository uses the guarded
> form; a new skill that copies the snippet gets it for free.

`package_skill.py` auto-bundles and rewrites this path into `references/resolve-platform.sh` inside each skill's zip. Installed skills are self-contained.

## Identity vs access

Two independent axes, deliberately not collapsed into one key:

| Axis         | Keys                            | Question it answers                |
| ------------ | ------------------------------- | ---------------------------------- |
| **Identity** | `tracker:` / `vcs:`             | *Which* system is this project on? |
| **Access**   | `access.tracker` / `access.vcs` | *How much* may the agent do to it? |

A restricted run still needs the identity: emitting "move RAPP-605 to In Review" with the right URL
and field names is only possible if the agent knows the tracker is Jira. So `manual` is a value of
`access.tracker`, never of `tracker`.

The five access modes, ordered least to most permissive:

| Mode        | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| `manual`    | Agent emits UI instructions; a human performs them         |
| `command`   | Agent emits commands; a human runs them                    |
| `approve`   | Agent holds credentials but must ask before each mutation  |
| `read-only` | Agent may read the tracker, not write to it                |
| `full`      | Today's behaviour. The default when the key is absent      |

`access.vcs` is accepted and validated so the schema is stable, but only `full` is supported today —
VCS write is a hard requirement for the pipelines (`/create-pr` returns a PR URL later steps consume,
`/develop-next` gates on `gh pr merge`). Any other value is rejected with a message naming the reason
rather than being silently ignored.

### Precedence — and why access differs from identity

**Identity** resolves config → env → git remote → default. First match wins.

**Access** does not. Config and env (`AGENT_SKILLS_ACCESS_TRACKER`, `AGENT_SKILLS_ACCESS_VCS`) are
read *independently*, and the **more restrictive** of the two wins, against the permissiveness order
`manual < command < approve < read-only < full`.

The asymmetry is deliberate: picking the wrong *tracker* is a mistake, whereas picking the wrong
*access* is an escalation. Most-restrictive-wins lets a single run or a CI environment lock itself
down without editing committed config, while making it impossible for a stray env var to loosen a
config that deliberately restricts.

| `access.tracker` | `AGENT_SKILLS_ACCESS_TRACKER` | Resolved   |
| ---------------- | ----------------------------- | ---------- |
| absent           | absent                        | `full`     |
| `full`           | `manual`                      | `manual`   |
| `manual`         | `full`                        | `manual`   |
| `read-only`      | `approve`                     | `approve`  |
| absent           | `command`                     | `command`  |

Both tiers are validated — an env var that bypassed validation would be a hole straight through the
check, since it is the tier a CI environment can set most easily.

### Unrecognised values are fatal

Legal sets are **per key**, never shared:

| Key              | Legal values                                     |
| ---------------- | ------------------------------------------------ |
| `tracker`        | `jira` · `github` · `auto` (or absent)           |
| `vcs`            | `github` · `bitbucket` · `auto` (or absent)      |
| `access.tracker` | `manual` · `command` · `approve` · `read-only` · `full` |
| `access.vcs`     | `full`                                           |

One shared set across `tracker` and `vcs` would accept `tracker: bitbucket` and `vcs: jira` —
misconfigurations of exactly the class this closes. `tracker: jria` used to resolve silently to
`github`; it now halts.

A **mapping-valued** `tracker:` is the documented [`tracker.workflowFile`](../../docs/reference/tracker-workflow.md)
form, not a typo. It resolves to `auto` (i.e. detect) rather than being graded as a scalar override.

### Malformed `skills-config.yaml`

| File state                          | Behaviour                                                  |
| ----------------------------------- | ---------------------------------------------------------- |
| Missing                             | Detect, as always                                          |
| Unparseable, **no** `access:` line  | Warn, degrade to detection — as always                     |
| Unparseable, **with** `access:` line| **Halt.** "access is configured but unreadable"            |

The blanket degrade rule is right for identity, where the default is *detect*. For access the
default is `full`, so the same rule would silently re-grant credentials on a truncated file.
Grepping for an `access:` line separates the two cases: a consumer who never opted in is never
locked out, and one who did is never silently unlocked.

Its companion for the Bitbucket branch is `shared/resources/bitbucket-auth.sh`, which resolves the REST credential and the auth scheme — see [The Bitbucket credential](#the-bitbucket-credential).

## Resolver (shape, not a copy)

The implementation is [`resolve-platform.sh`](resolve-platform.sh), which reads
`skills-config.yaml` through the shared two-tier reader in [`read-config.sh`](read-config.sh)
(python+pyyaml, then awk). **Read those files for the real thing** — what follows is the shape of
the resolution, kept short precisely so it cannot silently drift out of step with the code the way
a verbatim duplicate does.

```bash
# Identity — first match wins, then validate against a per-key legal set.
TRACKER=$(read_config_key tracker)             # "__MAP__" ⇒ tracker.workflowFile form
[ "$TRACKER" = "__MAP__" ] && TRACKER="auto"
validate_enum tracker "$TRACKER" jira github auto || return 1
[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)

VCS=$(read_config_key vcs)
validate_enum vcs "$VCS" github bitbucket auto || return 1
[ "$VCS" = "auto" ] && VCS=$(git remote get-url origin 2>/dev/null \
  | grep -qi bitbucket.org && echo bitbucket || echo github)

# Access — both tiers read and validated, then the MORE RESTRICTIVE wins.
ACCESS_TRACKER=$(resolve_access tracker) || return 1   # manual<command<approve<read-only<full
ACCESS_VCS=$(resolve_access vcs) || return 1           # rejected unless `full`
```

Two tiers, and they are not interchangeable: only python+pyyaml can tell a mapping from a scalar or
a parse failure from an absent key. The tier-1 probe tries `python3` then `python` — it used to
invoke a bare `python`, which macOS has not shipped since 12.3, so tier 1 was dead on most machines
and awk was silently the only tier. Any test covering tier-sensitive behaviour must force each tier
explicitly (`AGENT_SKILLS_CONFIG_TIER=python|awk`) rather than take whichever the host provides.

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
source shared/resources/bitbucket-auth.sh || exit 1   # or HALT, per the calling skill
curl -sf "${BB_CURL_AUTH[@]}" "https://api.bitbucket.org/2.0/..."
```

| Set | Scheme | What the helper emits |
| --- | ------ | --------------------- |
| `BITBUCKET_ACCESS_TOKEN` | Bearer | `--header "Authorization: Bearer …"` |
| `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN` (or `BITBUCKET_APP_PASSWORD`) | Basic | `--user "user:token"` |
| Neither | — | nothing, and a **non-zero status** |

It also sets `BB_AUTH_SCHEME` (`bearer` | `basic` | `none`) for diagnostics. `package_skill.py` and
`bundle_skill.py` bundle `shared/resources/bitbucket-auth.sh` into `references/` alongside this
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

Fifteen skills source `resolve-platform.sh`, across sixteen call sites (`create-epic` has two).
All sixteen use the guarded `|| exit 1` form.

- `create-epic` (×2), `create-pr`, `create-story`, `create-task`, `develop-next`, `qa-fix`,
  `qa-story`, `qa-task`, `review-bug`, `review-epic`, `review-story`, `review-task`,
  `sync-github-epic`, `sync-github-story`, `sync-github-task`

This list is hand-maintained and has drifted before (it read "All 8 leaf skills" long after it was
15). Re-derive it rather than trusting it:

```bash
grep -rn 'resolve-platform\.sh' --include='SKILL.md' skills/ | grep -E '(source|\. )' 
```

Skills that are platform-agnostic (no resolver needed):

- `create-branch`, `commit-changes`, `qa-gate`, and the docs-only authoring skills
