#!/usr/bin/env bash
# setup-consumer.sh — Interactive wizard to configure agent-skills in a consumer project.
#
# Documented in: docs/concepts/getting-started.md § "Quick setup (wizard)"
#
# Covers (numbering matches docs/concepts/getting-started.md § "What the wizard does"):
#   1. Prerequisite checks        (node, git, jq, curl)
#   2. Platform selection         (GitHub+Issues / GitHub+Jira / Bitbucket+Jira)
#   3. Credential collection      (gh auth check, Bitbucket/Jira API tokens)
#   4. .env files                 (.env.example always; .env optionally; gitignore)
#   5. skills-config.yaml         (PRD path, architecture path, coding-standards path)
#   6. Registry creation          (docs/development/epic-registry.md, docs/tasks/task-registry.md)
#   7. docs/ scaffold             (PRD root, architecture/concepts/ stubs)
#   8. Skills install             (latest release from github.com/Gamaroff/agent-skills;
#                                  skips the other tracker's skills — see --all-skills)
#   9. Pipeline hook install      (.claude/settings.json via inline jq)
#
# Usage:
#   bash scripts/setup-consumer.sh               # full wizard
#   bash scripts/setup-consumer.sh --dry-run     # print actions, write nothing
#   bash scripts/setup-consumer.sh --update      # re-download skills only (skip wizard)
#   bash scripts/setup-consumer.sh --all-skills  # install every skill, no platform filter
#
# Requires: node ≥ 22, git, jq, curl

set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $*"; }
ok()      { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
err()     { echo -e "${RED}✗${NC} $*" >&2; }
heading() { echo -e "\n${BOLD}── $* ──────────────────────────────────────${NC}"; }
ask()     { echo -en "${BOLD}$1${NC} "; }

# ── flags ────────────────────────────────────────────────────────────────────
DRY_RUN=false
UPDATE_ONLY=false
ALL_SKILLS=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)  DRY_RUN=true;    shift ;;
    --update)   UPDATE_ONLY=true; shift ;;
    --all-skills) ALL_SKILLS=true; shift ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── wizard status tracking ───────────────────────────────────────────────────
# Each entry: "label|status|detail" where status is ok|skipped|warn|fail
WIZARD_STEPS=()
WIZARD_WARNINGS=()
WIZARD_HAS_FAIL=false
SUMMARY_PRINTED=false

record_step() {
  WIZARD_STEPS+=("$1|$2|${3:-}")
  [[ "$2" == "fail" ]] && WIZARD_HAS_FAIL=true
  return 0
}
record_warning() { WIZARD_WARNINGS+=("$1"); }

write_file() {
  local path="$1"; local content="$2"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would write: $path"
  else
    mkdir -p "$(dirname "$path")"
    printf '%s' "$content" > "$path"
  fi
}

append_line() {
  local path="$1"; local line="$2"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would append to $path: $line"
  elif ! grep -qF "$line" "$path" 2>/dev/null; then
    # Terminate an unterminated last line first. Without this, appending
    # ".secrets/" to a .gitignore ending in "dist/" (no newline) yields
    # "dist/.secrets/" — a rule that ignores neither path, silently.
    # $( ) strips a trailing newline, so a non-empty result means the last
    # byte was not one.
    if [[ -s "$path" ]] && [[ -n "$(tail -c 1 "$path")" ]]; then
      echo "" >> "$path"
    fi
    echo "$line" >> "$path"
  fi
}

touch_file() {
  local path="$1"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would create: $path"
  else
    mkdir -p "$(dirname "$path")"
    touch "$path"
  fi
}

# ── .env parser ───────────────────────────────────────────────────────────────
# Read a key from an existing .env without sourcing it.
# Returns empty string if file absent or key not set.
env_get() {
  local key="$1"
  [[ ! -f ".env" ]] && return
  grep -E "^${key}=" ".env" 2>/dev/null | head -1 | cut -d'=' -f2- || true
}

# Prompt helper that shows an existing plain-text value as default.
# Usage: prompt_plain VAR_NAME "Prompt label" "hint for empty"
# Sets the named variable in the caller's scope.
prompt_plain() {
  local _var="$1" _label="$2" _hint="${3:-}"
  local _existing; _existing="$(env_get "$_var")"
  if [[ -n "$_existing" ]]; then
    ask "${_label} [${_existing}]:"
  elif [[ -n "$_hint" ]]; then
    ask "${_label}  (${_hint}):"
  else
    ask "${_label}:"
  fi
  read -r _input
  # Empty input → keep existing value (or empty if none)
  printf -v "$_var" '%s' "${_input:-${_existing}}"
}

# Prompt helper for sensitive values — shows [currently set] but never echoes.
# Usage: prompt_secret VAR_NAME "Prompt label"
# Sets the named variable in the caller's scope.
prompt_secret() {
  local _var="$1" _label="$2"
  local _existing; _existing="$(env_get "$_var")"
  if [[ -n "$_existing" ]]; then
    ask "${_label} [currently set — Enter to keep]:"
  else
    ask "${_label} (input hidden):"
  fi
  read -rs _input; echo
  printf -v "$_var" '%s' "${_input:-${_existing}}"
}

# ── 1. prerequisites ─────────────────────────────────────────────────────────
check_prereqs() {
  heading "Prerequisites"
  local missing=()

  for cmd in node git jq curl; do
    if command -v "$cmd" &>/dev/null; then
      ok "$cmd  ($(command -v "$cmd"))"
    else
      err "$cmd — not found"
      missing+=("$cmd")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo ""
    err "Missing tools: ${missing[*]}"
    echo "Install them, then re-run this script."
    record_step "Prerequisites" "fail" "missing: ${missing[*]}"
    exit 1
  fi
  record_step "Prerequisites" "ok"
}

# ── 2. platform ──────────────────────────────────────────────────────────────
select_platform() {
  heading "Platform"
  echo "  1) GitHub + GitHub Issues"
  echo "  2) GitHub + Jira"
  echo "  3) Bitbucket + Jira"
  echo ""
  ask "Choice [1/2/3] (default: 1):"
  read -r _choice
  _choice=${_choice:-1}

  case "$_choice" in
    1) VCS=github;    TRACKER=github ;;
    2) VCS=github;    TRACKER=jira   ;;
    3) VCS=bitbucket; TRACKER=jira   ;;
    *) err "Invalid choice: $_choice"; exit 1 ;;
  esac

  ok "Selected: $VCS + $TRACKER"
  record_step "Platform" "ok" "$VCS + $TRACKER"

  select_access
}

# ── 2a. skill install profile ────────────────────────────────────────────────
#
# Every installed skill's `description` sits in the agent's context permanently,
# on every request, before it reads a single instruction. That metadata tier —
# not disk — is the cost this prompt exists to control.
#
# Numbered `read -r`, matching select_platform above. Deliberately NOT a
# raw-mode arrow-key TUI: the wizard is commonly run as `bash <(curl …)`, where
# stdin is not a terminal and raw mode is not reliable.
select_skill_profile() {
  heading "Skill selection"

  # Counts are resolved, never hardcoded. An earlier draft of this feature
  # printed "all 119 skills"; the number was already wrong when it was written.
  echo "  Every installed skill's description stays in the agent's context"
  echo "  permanently. Install only what this project uses."
  echo ""
  echo "  1) full      — every skill. Today's behaviour."
  echo "  2) pipeline  — story/task/bug lifecycle: create → review → develop → QA → finalise."
  echo "  3) minimal   — branching, commits, PRs, code review only."
  echo ""
  echo "  A profile names seeds only; whatever those skills invoke is added"
  echo "  automatically, so a profile can never produce a half-installed pipeline."
  echo ""
  ask "Profile [1-3] (default: 1):"
  read -r _pchoice
  case "${_pchoice:-1}" in
    1) SKILLS_PROFILE="full" ;;
    2) SKILLS_PROFILE="pipeline" ;;
    3) SKILLS_PROFILE="minimal" ;;
    *) err "Invalid choice: $_pchoice"; exit 1 ;;
  esac

  SKILLS_INCLUDE=""
  if [[ "$SKILLS_PROFILE" != "full" ]]; then
    echo ""
    echo "  Add individual skills on top? Comma-separated names, or Enter to skip."
    echo "  Full list: docs/reference/skill-catalog.md"
    ask "Extra skills:"
    read -r SKILLS_INCLUDE
  fi

  ok "Profile: $SKILLS_PROFILE${SKILLS_INCLUDE:+ (+ ${SKILLS_INCLUDE})}"
  record_step "Skill profile" "ok" "${SKILLS_PROFILE}${SKILLS_INCLUDE:+ +includes}"
}

# ── 2b. tracker access level ─────────────────────────────────────────────────
# How much the locally running agent may do to the tracker. Separate from which
# tracker it is: a restricted run still needs the identity to emit the right
# URLs and field names. Defaults to `full`, and the block is written only when
# the answer is something else, so an existing generated config is unchanged.
select_access() {
  heading "Tracker access"
  echo "  How much access does the agent have to $TRACKER?"
  echo ""
  echo "  1) Full — the agent has write credentials and updates the tracker itself (default)"
  echo "  2) Read-only — the agent may read the tracker but not write to it"
  echo "  3) Approve — credentials present; writes are still handed over today (ask prompt is not shipped)"
  echo "  4) Command — the agent prints the commands; you run them"
  echo "  5) Manual — the agent prints instructions; you click through them"
  echo ""
  echo "  This is not Skip — docs only (a later per-run prompt on /create-*). Skip means no tracker."
  echo "  If you have a board but the agent must not hold a write token, pick 4 or 5."
  echo "  See docs/concepts/restricted-access.md and docs/concepts/which-access.md."
  echo ""
  ask "Choice [1-5] (default: 1):"
  read -r _achoice
  _achoice=${_achoice:-1}

  case "$_achoice" in
    1) ACCESS_TRACKER=full ;;
    2) ACCESS_TRACKER=read-only ;;
    3) ACCESS_TRACKER=approve ;;
    4) ACCESS_TRACKER=command ;;
    5) ACCESS_TRACKER=manual ;;
    *) err "Invalid choice: $_achoice"; exit 1 ;;
  esac

  ok "Tracker access: $ACCESS_TRACKER"
  record_step "Tracker access" "ok" "$ACCESS_TRACKER"
}

# ── 3. credentials ───────────────────────────────────────────────────────────
collect_env_vars() {
  heading "Credentials"
  ENV_LINES=()
  JIRA_URL=""   # global — consumed by write_skills_config

  # GitHub — check gh CLI auth
  if [[ "$VCS" == "github" ]]; then
    if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
      ok "gh CLI authenticated"
    else
      warn "gh CLI not authenticated (or not installed)."
      echo "  Run:  gh auth login"
      echo "  Then re-run this script, or continue and auth later."
    fi
  fi

  # Bitbucket creds
  #
  # The value is an Atlassian API token (ATATT…) with Bitbucket scopes ticked —
  # NOT an app password. Atlassian removed app passwords on 2026-07-28; only the
  # older variable NAME survives. We write the token under BOTH names on purpose:
  # BITBUCKET_API_TOKEN is the honest one for everything written from here on,
  # and BITBUCKET_APP_PASSWORD keeps the skills' existing references resolving.
  # Dropping either name silently breaks callers — and Bitbucket answers an
  # unauthenticated request with 404 rather than 401, so the breakage reads as
  # "no results" instead of "no credentials".
  if [[ "$VCS" == "bitbucket" ]]; then
    local BITBUCKET_USERNAME BITBUCKET_API_TOKEN
    prompt_plain   BITBUCKET_USERNAME  "BITBUCKET_USERNAME"
    prompt_secret  BITBUCKET_API_TOKEN "BITBUCKET_API_TOKEN"
    ENV_LINES+=("BITBUCKET_USERNAME=${BITBUCKET_USERNAME}")
    ENV_LINES+=("BITBUCKET_API_TOKEN=${BITBUCKET_API_TOKEN}")
    # Same token again, under the legacy name the vendored skills still read.
    # NOTE: every ENV_LINES entry must be `KEY=value`. The .env.example generator
    # emits "${line%%=*}=" per entry, so a bare comment pushed in here would come
    # out as "# ...text...=" — a malformed line in a file meant for humans.
    ENV_LINES+=("BITBUCKET_APP_PASSWORD=${BITBUCKET_API_TOKEN}")
    # The Bearer alternative is deliberately not prompted for. It REPLACES the
    # pair above rather than adding to it, so offering it as a third prompt
    # invites setting both; and writing an empty BITBUCKET_ACCESS_TOKEN= line
    # would put the exact shape that produces a valid-looking empty Bearer
    # header into every consumer's .env. Mention it, let them add it by hand.
    info "Bearer alternative: set BITBUCKET_ACCESS_TOKEN (a repository/project/workspace"
    info "  access token) by hand instead of the pair above — it replaces them, and wins"
    info "  if both are set. See docs/reference/configuration.md#bitbucket."
  fi

  # Jira creds
  if [[ "$TRACKER" == "jira" ]]; then
    local JIRA_USER_EMAIL="" JIRA_API_TOKEN="" JIRA_PROJECT_KEY="" JIRA_BOARD_ID=""
    prompt_plain   JIRA_URL          "JIRA_URL"          "e.g. https://yourorg.atlassian.net"
    prompt_plain   JIRA_USER_EMAIL   "JIRA_USER_EMAIL"
    prompt_secret  JIRA_API_TOKEN    "JIRA_API_TOKEN"
    prompt_plain   JIRA_PROJECT_KEY  "JIRA_PROJECT_KEY"  "e.g. MYPROJ"
    prompt_plain   JIRA_BOARD_ID     "JIRA_BOARD_ID"     "Scrum boards only — Enter to skip"

    ENV_LINES+=("JIRA_URL=${JIRA_URL}")
    ENV_LINES+=("JIRA_USER_EMAIL=${JIRA_USER_EMAIL}")
    ENV_LINES+=("JIRA_API_TOKEN=${JIRA_API_TOKEN}")
    ENV_LINES+=("JIRA_PROJECT_KEY=${JIRA_PROJECT_KEY}")
    [[ -n "${JIRA_BOARD_ID:-}" ]] && ENV_LINES+=("JIRA_BOARD_ID=${JIRA_BOARD_ID}")
  else
    JIRA_URL=""
  fi
  record_step "Credentials" "ok" "$VCS + $TRACKER credentials collected"
}

# ── 4. Credential files ──────────────────────────────────────────────────────
# Credentials are written to .secrets/tooling.env, NOT the repo-root .env.
#
# Nx loads workspace `.env` files into the environment of EVERY task it runs, so
# tooling tokens kept in a root .env sit in process.env of every application
# process started or tested through Nx, before any application code executes. It
# is not fixable application-side: NX_LOAD_DOT_ENV_FILES=false loads the file
# into the CLI's own process before the flag is consulted, and @nestjs/config has
# no skipProcessEnv. A different PATH is the fix; a flag is not. `.secrets/` sits
# outside the `.env.*` / `.*.env` names Nx generates from target and configuration
# names, so it is never auto-loaded.
#
# v0.40.0 taught both loaders to search .secrets/tooling.env first and .env
# second. `.env` is still READ, so an unmigrated consumer keeps working — what
# changes here is only where a NEW consumer's credentials land. Until this, the
# wizard taught every new consumer the location that release exists to move away
# from.
CRED_FILE=".secrets/tooling.env"

# Credentials in a legacy repo-root .env: report, and never move the file.
#
# It holds live credentials, and a wizard that relocates one under the user's
# feet is one bad path expansion away from destroying the only copy. Nothing is
# broken either — the loaders still read .env, second — so this is advice, not
# repair. Print the command; let a human run it.
_report_env_migration() {
  [[ ! -f ".env" ]] && return 0
  local keys="JIRA_URL|JIRA_API_TOKEN|BITBUCKET_API_TOKEN|BITBUCKET_APP_PASSWORD|BITBUCKET_ACCESS_TOKEN|GH_TOKEN"
  grep -qE "^[[:space:]]*(${keys})=" .env 2>/dev/null || return 0

  warn "A repo-root .env holds tooling credentials."
  info "  Nothing is broken — the loaders read ${CRED_FILE} first and .env second."
  info "  But an Nx workspace loads a root .env into every task it runs, which is"
  info "  why the preferred location moved. To migrate, by hand:"
  info "    mkdir -p .secrets && mv .env ${CRED_FILE}"
  record_warning "Credentials found in a repo-root .env — consider moving them to ${CRED_FILE}"
}

write_env_files() {
  [[ ${#ENV_LINES[@]} -eq 0 ]] && return

  heading "Writing credential files"

  # .env.example — keys only, no values.
  #
  # It stays at the repo ROOT rather than moving inside .secrets/. It is a
  # TRACKED file describing an untracked one, and the .gitignore rule written
  # below ignores `.secrets/` wholesale — an example living in there would be
  # swallowed by the very rule that protects the real file.
  local example_content="# agent-skills environment variables\n"
  example_content+="# Copy to ${CRED_FILE} and fill in real values.\n"
  example_content+="# A repo-root .env is still read as a fallback, second, so an existing\n"
  example_content+="# .env keeps working — see docs/reference/configuration.md.\n"
  for line in "${ENV_LINES[@]}"; do
    example_content+="${line%%=*}=\n"
  done
  if [[ -f ".env.example" ]] && [[ "$DRY_RUN" == false ]]; then
    info ".env.example already exists — skipped"
    # An example written by an older wizard still says "Copy to .env". Say so
    # rather than overwriting a file the consumer may have customised.
    if grep -q "Copy to \.env and" .env.example 2>/dev/null; then
      record_warning ".env.example names the old credential location — update its header to ${CRED_FILE}"
    fi
  else
    write_file ".env.example" "$(printf '%b' "$example_content")"
    ok ".env.example"
  fi

  _report_env_migration

  if [[ -f "$CRED_FILE" ]]; then
    warn "$CRED_FILE already exists."
    ask "Overwrite? [y/N]:"
    read -r _ow_env
    if [[ ! "${_ow_env:-N}" =~ ^[Yy]$ ]]; then
      info "Skipped $CRED_FILE — existing file kept"
      record_step "Credential files" "ok" "$CRED_FILE kept (existing)"
      return
    fi
  fi

  ask "Write live credentials to ${CRED_FILE}? [Y/n]:"
  read -r _write_env
  if [[ "${_write_env:-Y}" =~ ^[Yy]$ ]]; then
    local env_content=""
    for line in "${ENV_LINES[@]}"; do
      env_content+="${line}\n"
    done
    write_file "$CRED_FILE" "$(printf '%b' "$env_content")"
    ok "$CRED_FILE written"

    # .gitignore — BOTH names, and this is not optional.
    #
    # `.secrets/` is where credentials now land; writing them to a path with no
    # ignore rule would be strictly worse than leaving them in .env, which is
    # exactly why this and the path change had to ship together. `.env` stays
    # because the loaders still read it and a migrating consumer may still have
    # one.
    # Create-then-append rather than a separate write branch. `write_file` uses
    # printf '%s', so the old `write_file ".gitignore" ".env\n"` wrote the two
    # characters backslash-n and produced a one-line file reading `.env\n` —
    # which ignores nothing. append_line terminates its own lines correctly.
    [[ -f ".gitignore" ]] || touch_file ".gitignore"
    append_line ".gitignore" ".secrets/"
    append_line ".gitignore" ".env"
    ok ".secrets/ and .env added to .gitignore"
    record_step "Credential files" "ok" "$CRED_FILE written"
  else
    info "Skipped $CRED_FILE — fill in .env.example manually"
    record_step "Credential files" "ok" ".env.example only"
  fi
}

# ── 5. skills-config.yaml ────────────────────────────────────────────────────
# Globals set by write_skills_config — consumed by scaffold_docs so it
# creates dirs at the *user-chosen* paths, not the hardcoded defaults.
PRD_DIR="docs/prd"
ARCH_DIR="docs/architecture"

# Extract a path value from an existing skills-config.yaml.
# Usage: _read_config_path prdShardedLocation
# Strips: key prefix, trailing comments (# ...), and surrounding quotes
# so hand-edited skills-config.yaml values parse correctly.
_read_config_path() {
  local _key="$1"
  [[ ! -f "skills-config.yaml" ]] && return
  grep -E "^[[:space:]]*${_key}:" skills-config.yaml 2>/dev/null \
    | head -1 \
    | sed -E "s/^[[:space:]]*${_key}:[[:space:]]*//" \
    | sed -E 's/[[:space:]]*#.*$//' \
    | sed -E 's/^"//; s/"$//; s/^'\''//; s/'\''$//' \
    | sed -E 's/[[:space:]]+$//' \
    || true
}

write_skills_config() {
  heading "skills-config.yaml"

  if [[ -f "skills-config.yaml" ]]; then
    warn "skills-config.yaml already exists."
    ask "Overwrite? [y/N]:"
    read -r _ow
    if [[ ! "${_ow:-N}" =~ ^[Yy]$ ]]; then
      info "Skipped — reading existing PRD/architecture paths for scaffold step"
      PRD_DIR=$(_read_config_path prdShardedLocation)
      PRD_DIR=${PRD_DIR:-docs/prd}
      ARCH_DIR=$(_read_config_path architectureShardedLocation)
      ARCH_DIR=${ARCH_DIR:-docs/architecture}
      record_step "skills-config" "ok" "kept (existing)"
      return
    fi
  fi

  ask "PRD directory  (default: docs/prd):"
  read -r _prd_loc; _prd_loc=${_prd_loc:-docs/prd}

  ask "Architecture directory  (default: docs/architecture):"
  read -r _arch_loc; _arch_loc=${_arch_loc:-docs/architecture}

  ask "Coding-standards path  (default: ${_arch_loc}/concepts/coding-standards.md):"
  read -r _cs_path; _cs_path=${_cs_path:-${_arch_loc}/concepts/coding-standards.md}

  # Export to globals for scaffold_docs to consume
  PRD_DIR="$_prd_loc"
  ARCH_DIR="$_arch_loc"

  # Written only when the answer is not `full`, so a config generated before this
  # prompt existed stays byte-identical. Absent means `full`.
  local access_block=""
  if [[ -n "${ACCESS_TRACKER:-}" && "${ACCESS_TRACKER}" != "full" ]]; then
    access_block=$'\n# How much access the agent has to each system. Absent means `full`.\n# Values: full | read-only | approve | command | manual. An unrecognised value\n# halts the run rather than falling through to a default.\n# Env override AGENT_SKILLS_ACCESS_TRACKER is combined most-restrictive-wins,\n# so it can lock a run down further but never loosen this setting.\naccess:\n  tracker: '"${ACCESS_TRACKER}"$'\n'
  fi

  # Written only when the profile is not `full`, so a config generated before
  # this prompt existed stays byte-identical. An absent block means `full`,
  # which is exactly the pre-task-84 behaviour.
  local skills_block=""
  if [[ -n "${SKILLS_PROFILE:-}" && "${SKILLS_PROFILE}" != "full" ]]; then
    local _inc_yaml="[]"
    if [[ -n "${SKILLS_INCLUDE:-}" ]]; then
      _inc_yaml="[$(tr -d '[:space:]' <<<"$SKILLS_INCLUDE" | sed 's/,/, /g')]"
    fi
    skills_block=$'\n# Which skills to install. An absent block means `profile: full` (every skill).\n# Read by setup-consumer.sh on --update, so the choice survives an update.\n#\n# A profile names SEEDS; whatever those skills invoke is resolved and added\n# automatically, so this can never yield a half-installed pipeline. A skill\n# listed in `exclude` that a chosen skill requires is REPORTED as a conflict\n# and left out — never silently re-added, and never silently dropped.\nskills:\n  profile: '"${SKILLS_PROFILE}"$'  # full | pipeline | minimal\n  include: '"${_inc_yaml}"$'  # extra skills on top of the profile\n  exclude: []  # skills to leave out\n'
  fi

  # Written for BOTH trackers. GitHub used to be the implicit default and was
  # written as nothing at all, which left a GitHub consumer's config unable to
  # state its own platform — install_skills' resolver then had nothing to read
  # on the --update path. A config that names its tracker is self-describing.
  local tracker_block=$'\ntracker: github\n'
  if [[ "$TRACKER" == "jira" ]]; then
    tracker_block=$'\ntracker: jira\n\njira:\n  # devEstimateField: customfield_10594  # optional — Jira numeric custom field id for estimated dev hours\n  # defaultAssignee: 712020:00000000-0000-0000-0000-000000000000  # optional — Jira accountId every card is assigned to. Frontmatter assignee overrides. Unset = leave Jira alone.\n  #\n  # statusMap — local document status -> your Jira workflow status name(s).\n  # MOST PROJECTS NEED NONE. The built-in candidate lists already cover the\n  # common vocabularies (In Review / Code Review / Waiting for Review / ...).\n  # An override REPLACES the candidate list for that status, so adding one\n  # NARROWS matching. Run --probe-workflow first and add only the statuses it\n  # shows being skipped — as ordered lists, not single names:\n  #\n  # statusMap:\n  #   ready-for-review: [Waiting for Review, In Review]'
  fi

  local config
  config="# agent-skills configuration — generated by setup-consumer.sh
# Full schema: docs/reference/configuration.md
#
# PRD and architecture roots are configurable. The *nested* structure under
# each root is fixed:
#   \${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/
#   \${ARCH_ROOT}/concepts/{coding-standards,tech-stack,source-tree}.md

prd:
  prdShardedLocation: ${_prd_loc}

architecture:
  architectureShardedLocation: ${_arch_loc}

devLoadAlwaysFiles:
  - ${_cs_path}
  - ${_arch_loc}/concepts/tech-stack.md
  - ${_arch_loc}/concepts/source-tree.md
${access_block}${skills_block}${tracker_block}"

  write_file "skills-config.yaml" "$config"
  ok "skills-config.yaml"
  record_step "skills-config" "ok" "written"
}

# ── 5b. tracker-workflow.yaml ────────────────────────────────────────────────
# The consumer-owned status ladder. Unlike skills-config.yaml above, this one
# NEVER offers to overwrite: the file encodes a board's real column names, which
# a consumer has hand-tuned against a live board and the wizard cannot re-derive
# from answers to its prompts. Losing it is silent — the pipelines keep running
# and simply stop moving cards. So the only two outcomes here are "written" and
# "kept (existing)".
#
# Runs AFTER install_skills, not with the other config steps: the live-probe path
# below invokes a CLI that install_skills puts on disk. With no skills installed
# there is nothing to probe with, and the generic template is all we could write.
write_tracker_workflow() {
  heading "tracker-workflow.yaml"

  if [[ -f "tracker-workflow.yaml" ]]; then
    info "tracker-workflow.yaml already exists — kept untouched"
    record_step "tracker-workflow" "ok" "kept (existing)"
    return
  fi

  # Prefer the real board over a generic ladder. Both CLIs refuse to overwrite
  # without --force, so this is safe even if the file appeared since the check.
  #
  # Tracker wins over VCS: a Bitbucket repo tracked in Jira must probe Jira.
  local _cli=""
  if [[ "${TRACKER:-github}" == "jira" ]]; then
    _cli=".agents/skills/develop-task/references/jira-stage.js"
  elif [[ "${VCS:-github}" == "github" ]]; then
    _cli=".agents/skills/develop-task/references/gh-stage.js"
  fi

  # NEVER infer "the file was written" from the exit code.
  #
  # Every mode in this CLI family except --check exits 0 on a documented skip —
  # `no-credentials` (gh not authenticated, which this wizard does not require),
  # `no-repo-context` (no origin remote yet), `stage-disabled`, and so on. Each
  # of those writes nothing. Gating on `&& node ... ` therefore reported
  # "generated from your live board" and returned early over an empty directory,
  # so the fallback below never ran and the consumer ended up with NO workflow
  # file while the summary claimed success (TASK-41-BUG-1).
  #
  # Test the artifact instead. That is correct for both CLIs and for every
  # present and future exit-0 skip reason, which an exit-code check can never be.
  if [[ "$DRY_RUN" != true && -n "$_cli" && -f "$_cli" ]]; then
    local _out
    _out=$(node "$_cli" --init-workflow --json 2>/dev/null) || true
    if [[ -f "tracker-workflow.yaml" ]]; then
      # `fromRecord` distinguishes a board/record-derived file from the CLI's own
      # generic fallback. Reporting both as "generated from board" hid a generic
      # ladder behind a provenance claim, and the redirect above swallowed the
      # CLI's own loud warning about it (TASK-41-BUG-2).
      local _from_record=""
      _from_record=$(printf '%s' "$_out" | jq -r '.fromRecord // empty' 2>/dev/null) || true
      if [[ "$_from_record" == "true" ]]; then
        ok "tracker-workflow.yaml — generated from your live board"
        record_step "tracker-workflow" "ok" "generated from board"
      else
        ok "tracker-workflow.yaml"
        warn "The CLI wrote a GENERIC ladder — your board's real columns are almost certainly different."
        warn "A ladder that does not match the board resolves nothing, and fails SILENTLY."
        warn "Edit it before your first pipeline run, or regenerate from the live board:"
        warn "  node ${_cli} --init-workflow --force"
        record_warning "tracker-workflow.yaml is a generic ladder — edit it to match your board before the first pipeline run"
        record_step "tracker-workflow" "ok" "template (edit before first run)"
      fi
      return
    fi
    # Nothing written — fall through to the heredoc below. This is the ordinary
    # outcome on GitHub, where --init-workflow needs an --issue to reach a board
    # and the wizard has none to give.
  fi

  # Fallback: a generic ladder. Say so LOUDLY. A template whose columns do not
  # match the board resolves nothing, and the failure mode is silence — the
  # pipelines run, report success, and move no cards.
  write_file "tracker-workflow.yaml" "$(cat <<'TRACKER_WORKFLOW_EOF'
# tracker-workflow.yaml — GENERATED FROM A TEMPLATE, NOT FROM YOUR BOARD.
#
# Full reference:   docs/reference/tracker-workflow.md
# Annotated sample: docs/examples/tracker-workflow.default.yaml
#
# Edit `statuses:` to your board's columns, IN BOARD ORDER, then point each
# moment at the column it should move a card to. Check your work with:
#
#   node .agents/skills/develop-task/references/gh-stage.js --probe-board
#   node .agents/skills/develop-task/references/jira-stage.js --print-plan --stage work-started
#   node .agents/skills/develop-task/references/gh-stage.js --check      # in CI

# The ladder, in board order. Order IS the workflow: a rung's index is its rank,
# and the rungs between two positions are the path from one to the other.
statuses:
  - Backlog
  - In Progress
  - In Review
  - Done

# Which status each pipeline moment targets. Omit a moment to disable it —
# omission is the only way to switch one off. A status named here but absent
# from `statuses:` above is an off-ladder side-state, entered directly.
pipeline:
  work-started: In Progress
  in-review: In Review
  done: Done
  # in-qa: ...              # ← add the column and the line together
  # ready-for-merge: ...
  # blocked: Blocked        # ← off-ladder side-state
  # changes-requested: ...  # ← fires once per QA fix cycle; keep it OFF `statuses:`
  # pr-merged: ...          # ← fires after the PR merges, from /develop-next

# Local document status -> board status, for the /sync-* skills.
documentStatus:
  draft: Backlog
  planned: Backlog
  ready-for-development: Backlog
  in-progress: In Progress
  ready-for-review: In Review
  accepted: Done
  cancelled: Done
TRACKER_WORKFLOW_EOF
)
"
  ok "tracker-workflow.yaml"
  warn "Wrote a GENERIC ladder — your board's real columns are almost certainly different."
  warn "A ladder that does not match the board resolves nothing, and fails SILENTLY."
  warn "Edit it before your first pipeline run, or regenerate from the live board:"
  warn "  node .agents/skills/develop-task/references/gh-stage.js --init-workflow --force"
  record_warning "tracker-workflow.yaml is a generic template — edit it to match your board before the first pipeline run"
  record_step "tracker-workflow" "ok" "template (edit before first run)"
}

# ── 6. registries ────────────────────────────────────────────────────────────
create_registries() {
  heading "Registries"

  local _created=0 _kept=0

  if [[ -f "docs/development/epic-registry.md" ]]; then
    info "docs/development/epic-registry.md exists — skipped"
    (( _kept++ )) || true
  else
    touch_file "docs/development/epic-registry.md"
    ok "docs/development/epic-registry.md"
    (( _created++ )) || true
  fi

  if [[ -f "docs/tasks/task-registry.md" ]]; then
    info "docs/tasks/task-registry.md exists — skipped"
    (( _kept++ )) || true
  else
    touch_file "docs/tasks/task-registry.md"
    ok "docs/tasks/task-registry.md"
    (( _created++ )) || true
  fi

  if (( _created == 0 )); then
    record_step "Registries" "ok" "already present"
  elif (( _kept == 0 )); then
    record_step "Registries" "ok" "${_created} created"
  else
    record_step "Registries" "ok" "${_created} created, ${_kept} kept"
  fi
}

# ── 7. docs scaffold ─────────────────────────────────────────────────────────
scaffold_docs() {
  heading "Docs scaffold"
  info "Using PRD_DIR=${PRD_DIR} ARCH_DIR=${ARCH_DIR} (from skills-config.yaml)"

  # ${PRD_DIR}/
  if [[ -d "${PRD_DIR}" ]]; then
    info "${PRD_DIR}/ exists — skipped"
  else
    if [[ "$DRY_RUN" == true ]]; then
      echo -e "${YELLOW}[dry-run]${NC} would create ${PRD_DIR}/"
    else
      mkdir -p "${PRD_DIR}"
      ok "${PRD_DIR}/"
    fi
  fi

  # ${ARCH_DIR}/concepts/ — three required always-loaded files
  local _arch_created=false
  for _file in \
    "${ARCH_DIR}/index.md" \
    "${ARCH_DIR}/concepts/coding-standards.md" \
    "${ARCH_DIR}/concepts/tech-stack.md" \
    "${ARCH_DIR}/concepts/source-tree.md"
  do
    if [[ -f "$_file" ]]; then
      info "$_file exists — skipped"
      continue
    fi
    local _name; _name=$(basename "$_file" .md)
    local _content
    case "$_name" in
      index)
        _content="# Architecture\n\nProject architecture overview. See [concepts/](concepts/) for always-loaded context files.\n\n## Sections\n\n- [Coding standards](concepts/coding-standards.md)\n- [Tech stack](concepts/tech-stack.md)\n- [Source tree](concepts/source-tree.md)\n"
        ;;
      coding-standards)
        _content="# Coding Standards\n\n> Fill in: naming conventions, formatting rules, lint config, language idioms, do-not-do patterns.\n\n## Naming\n\n## Formatting\n\n## Linting\n\n## Patterns to avoid\n"
        ;;
      tech-stack)
        _content="# Tech Stack\n\n> Fill in: runtime versions, package managers, build tooling, framework versions, infrastructure targets.\n\n## Runtime\n\n## Languages\n\n## Frameworks\n\n## Infrastructure\n"
        ;;
      source-tree)
        _content="# Source Tree\n\n> Fill in: top-level directory map, monorepo workspace layout, where domain code / infra / docs / tests live.\n\n\`\`\`\n.\n├── # fill in your project structure\n\`\`\`\n"
        ;;
    esac
    if [[ "$DRY_RUN" == true ]]; then
      echo -e "${YELLOW}[dry-run]${NC} would create $_file"
    else
      mkdir -p "$(dirname "$_file")"
      printf '%b' "$_content" > "$_file"
      ok "$_file"
      _arch_created=true
    fi
  done

  if [[ "$_arch_created" == true ]]; then
    warn "Architecture stubs created — fill them in before running /develop-story or /develop-task"
    info "Tip: run /document-existing-project to auto-generate from your codebase"
    record_step "Docs scaffold" "ok" "architecture stubs created"
    record_warning "Fill in ${ARCH_DIR}/concepts/*.md before running /develop-story or /develop-task (or run /document-existing-project)"
  else
    record_step "Docs scaffold" "ok" "already present"
  fi
}

# ── 8. install skills ────────────────────────────────────────────────────────
SKILLS_REPO="https://github.com/Gamaroff/agent-skills"
SKILLS_API="https://api.github.com/repos/Gamaroff/agent-skills/releases/latest"

# ── platform-scoped skills ───────────────────────────────────────────────────
# Skills that exist only for one tracker. Installing the other tracker's set is
# not merely wasted disk: both siblings carry near-identical `description`
# fields, and description text is what drives skill auto-activation, so the
# wrong-platform sibling is a live mis-selection risk.
#
# MAINTENANCE: setup-consumer-skill-exclusion.test.mjs asserts every
# skills/*jira* and skills/*github* directory appears in exactly one list.
# A new tracker skill fails CI until it is classified here.
#
# Do NOT add anything here on the `vcs:` axis. `create-pr`, `create-branch` and
# `create-issue` serve GitHub *and* Bitbucket from one skill by sourcing
# resolve-platform.sh internally — there is no per-VCS sibling to exclude, and
# excluding on vcs would remove a skill the consumer needs.
SKILLS_JIRA_ONLY="ensure-epic-jira-issue
ensure-story-jira-issue
ensure-task-jira-issue
sync-jira-epic
sync-jira-story
sync-jira-task
jira-epic-creator
jira-sprint-manager
jira-sprint-retrospective
jira-sprint-review-prep
jira-standup-auditor"

SKILLS_GITHUB_ONLY="ensure-epic-github-issue
ensure-story-github-issue
ensure-task-github-issue
sync-github-epic
sync-github-story
sync-github-task"

# Resolve which tracker this install targets.
#
# This MIRRORS shared/resources/resolve-platform.sh — the resolver every skill
# sources at runtime — deliberately, so install time and run time cannot
# disagree about what platform this repo is. It does not *source* that script:
# resolve-platform.sh validates and can `exit 1` on an unrecognised value, which
# would abort an install over a key the installer only wants a hint from.
#
# Because it re-implements rather than sources, the VALUE PARSING has to mirror
# too, not just the order. It did not, once: `print $2` returned the raw token,
# so `tracker: "jira"`, `tracker: 'jira'` and a CRLF line ending all missed the
# case arm below and fell through to the github default — while the runtime
# reader parses them all as `jira`. A Jira repo then installed with none of its
# eleven Jira skills, silently, and the failure surfaced days later inside a
# pipeline step. Quoting a YAML scalar is idiomatic and CRLF arrives with any
# Windows or WSL checkout; neither is exotic. Hence the normalisation below.
#
# Order matters and is asserted by test:
#
#   1. skills-config.yaml `tracker:` — FIRST because main() calls install_skills
#      on the --update path and returns before select_platform ever runs, so on
#      the path consumers use most $TRACKER is unset. A resolver that trusted
#      $TRACKER first would be silently inert exactly where it is needed.
#   2. $TRACKER, when select_platform has run in this process.
#   3. JIRA_URL (environment or .env) implies jira. LAST of the positive probes
#      because a stale JIRA_URL outlives the setup that wrote it, and trusting
#      it over an explicit `tracker: github` would exclude the six GitHub-sync
#      skills the consumer actually uses.
#   4. Otherwise `github` — the same default resolve-platform.sh applies.
#
# ONE DELIBERATE ASYMMETRY, in step 3: this reads `.env` as well as the
# environment; resolve-platform.sh reads only the environment. That is not an
# oversight and must not be "corrected" by deleting the probe. The installer
# runs once, often in a plain shell; the skills run later in a shell that has
# JIRA_URL because they need it. Dropping the probe would make the installer
# resolve github for a Jira consumer whose JIRA_URL lives in .env — trading a
# rare disagreement for a common one. Closing it properly means teaching
# resolve-platform.sh to read .env, which changes every skill's resolution and
# belongs in its own task. Pinned by test so the choice stays visible.
#
# The github default is load-bearing, not a convenience. write_skills_config
# writes a `tracker:` key only for Jira consumers, so before this default
# existed a GitHub consumer running --update missed every probe and resolved to
# nothing — leaving the filter inert on its own headline path. Defaulting to
# github cannot disagree with runtime, because runtime defaults to github too:
# a repo where this guesses github is a repo where every Jira skill already
# fails when invoked. The grandfather rule and --all-skills remain the net.
_resolve_install_tracker() {
  local _t=""

  # 1. skills-config.yaml scalar `tracker:`. The map form (`tracker:` with a
  #    nested workflowFile:) carries no platform identity — the pattern requires
  #    a value on the same line, so the map form correctly does not match.
  #
  #    The pattern is `[^[:space:]]`, NOT `[a-z]`: a quoted value starts with a
  #    quote character, and `[a-z]` refused to match it at all. Take the rest of
  #    the line rather than $2 so a missing space (`tracker:jira`) and a trailing
  #    `# comment` are both handled in one place.
  if [[ -f skills-config.yaml ]]; then
    _t=$(awk '/^tracker:[[:space:]]*[^[:space:]]/ {
                v = $0
                sub(/^tracker:[[:space:]]*/, "", v)
                sub(/[[:space:]]+#.*$/, "", v)
                sub(/[[:space:]]+$/, "", v)
                print v; exit
              }' skills-config.yaml 2>/dev/null || true)
  fi

  # Normalise the way the runtime YAML reader does: a CRLF checkout leaves a
  # trailing carriage return, and a quoted scalar arrives with its quotes. Strip
  # a matched surrounding pair only — a lone quote is a malformed value and
  # should fall through to the default rather than be silently repaired.
  _t=${_t%$'\r'}
  case "$_t" in
    '"'*'"') _t=${_t#'"'}; _t=${_t%'"'} ;;
    "'"*"'") _t=${_t#\'}; _t=${_t%\'} ;;
  esac

  # 2. wizard answer, when select_platform has run in this process
  [[ -z "$_t" ]] && _t="${TRACKER:-}"

  # 3 + 4. `auto`, unset, or an unrecognised value resolves the way
  #        resolve-platform.sh does: a JIRA_URL implies jira, otherwise github.
  case "$_t" in
    jira|github) : ;;
    *)
      if [[ -n "${JIRA_URL:-}" ]] \
        || { [[ -f .env ]] && grep -qE '^JIRA_URL=.+' .env 2>/dev/null; }; then
        _t="jira"
      else
        _t="github"
      fi
      ;;
  esac

  printf '%s' "$_t"
}

# Return 0 (excluded) when skill $1 cannot fire under tracker $2.
#
# `grep -qxF` matches a whole line, fixed-string — so `sync-jira-epic` never
# matches a hypothetical `sync-jira-epic-v2`.
_skill_excluded_for_tracker() {
  local _name="$1" _tracker="${2:-}"
  [[ "${ALL_SKILLS:-false}" == true ]] && return 1
  case "$_tracker" in
    github) grep -qxF "$_name" <<<"$SKILLS_JIRA_ONLY"   && return 0 ;;
    jira)   grep -qxF "$_name" <<<"$SKILLS_GITHUB_ONLY" && return 0 ;;
  esac
  return 1
}

# ── 8b. install profiles (task 84) ───────────────────────────────────────────
#
# A profile is a SEED list; the concrete install set is the seeds' transitive
# closure over the skill call graph, with the tracker filter above applied AFTER
# the closure. The graph work happens in Node — resolve-skill-set-cli.mjs, out
# of the extracted tarball — because it is a cyclic-graph traversal with a
# conflict report, and neither is something bash should be doing.
#
# Config-first, exactly like _resolve_install_tracker and for the same reason:
# `--update` short-circuits in main() before select_platform ever runs, so on
# that path the wizard variables do not exist and the config file is the only
# source. Reading $SKILLS_PROFILE first would make --update silently reinstall
# everything, which is the failure this whole feature exists to prevent.
_config_skills_profile() {
  local _p=""
  if [[ -f skills-config.yaml ]]; then
    # The header rule tolerates a trailing comment (`skills:  # which skills`),
    # and the close rule EXCLUDES the header line itself. Without the `!/^skills:/`
    # guard the close rule matches the very line that opened the block — so any
    # trailing content made the whole block invisible, silently, and the installer
    # fell back to `full` without even reaching the "could not resolve" warning.
    _p=$(awk '
      /^skills:[[:space:]]*(#.*)?$/ { inblock=1; next }
      !/^skills:/ && /^[^[:space:]#]/ { inblock=0 }
      inblock && /^[[:space:]]+profile:/ {
        v = $0
        sub(/^[[:space:]]+profile:[[:space:]]*/, "", v)
        sub(/[[:space:]]+#.*$/, "", v)
        sub(/[[:space:]]+$/, "", v)
        print v; exit
      }
    ' skills-config.yaml 2>/dev/null || true)
  fi
  # Normalise the way _resolve_install_tracker does: CRLF checkouts leave a
  # carriage return, and a quoted scalar arrives with its quotes.
  _p=${_p%$'\r'}
  case "$_p" in
    '"'*'"') _p=${_p#'"'}; _p=${_p%'"'} ;;
    "'"*"'") _p=${_p#\'}; _p=${_p%\'} ;;
  esac
  [[ -z "$_p" && -n "${SKILLS_PROFILE:-}" ]] && _p="$SKILLS_PROFILE"
  printf '%s' "${_p:-full}"
}

# Read `skills.include` / `skills.exclude`, which are inline YAML flow lists
# (`include: [a, b]`) — the only form write_skills_config emits. Returns a
# comma-separated string for the CLI.
_config_skills_list() {
  local _key="$1" _v=""
  if [[ -f skills-config.yaml ]]; then
    # Same header/close handling as _config_skills_profile — see the note there.
    # `found` is printed as a sentinel prefix so the caller can tell an explicit
    # `include: []` from an absent key: they are different instructions, and
    # treating them alike let a stale env var override an explicit empty list.
    _v=$(awk -v key="$_key" '
      /^skills:[[:space:]]*(#.*)?$/ { inblock=1; next }
      !/^skills:/ && /^[^[:space:]#]/ { inblock=0 }
      inblock && $0 ~ "^[[:space:]]+" key ":" {
        v = $0
        sub("^[[:space:]]+" key ":[[:space:]]*", "", v)
        sub(/[[:space:]]+#.*$/, "", v)
        gsub(/[][]/, "", v)
        gsub(/[[:space:]]/, "", v)
        gsub(/["'"'"']/, "", v)
        print "found:" v; exit
      }
    ' skills-config.yaml 2>/dev/null || true)
  fi
  _v=${_v%$'\r'}
  # An explicit key (even an empty list) suppresses the env fallback.
  if [[ "$_v" == found:* ]]; then
    printf '%s' "${_v#found:}"
    return
  fi
  if [[ -z "$_v" ]]; then
    case "$_key" in
      include) _v="${SKILLS_INCLUDE:-}" ;;
      exclude) _v="${SKILLS_EXCLUDE:-}" ;;
    esac
    # The wizard collects a free-text answer; strip spaces so the CLI sees a
    # clean comma list.
    _v=$(tr -d '[:space:]' <<<"$_v")
  fi
  printf '%s' "$_v"
}

# Resolve the concrete skill list. Prints one name per line on stdout; the
# closure/conflict report goes to stderr and is shown to the user as-is.
#
# Exit codes, which the caller MUST distinguish:
#   0  — authoritative. The printed set is what to install, EVEN IF EMPTY (every
#        seed excluded is a legitimate answer, not a failure).
#   2  — user-input error, already named on stderr by the CLI (unknown skill in
#        `include`, unknown profile). The config is wrong; node is fine.
#   *  — environment failure (node missing, CLI absent, malformed output).
#
# For 2 and anything else the caller installs the UNFILTERED set rather than an
# empty one — an unfiltered install is recoverable, an empty one leaves the
# consumer with no skills at all. For 0-with-empty-output the caller honours it
# but warns first, because "you asked for nothing" and "something went wrong"
# look identical in a summary line.
# CALL THIS INSIDE A CONDITION. It returns non-zero on a resolver failure, which
# is a normal outcome the caller handles by installing the unfiltered set — but
# under `set -e` a BARE call would abort the whole wizard instead. `install_skills`
# calls it as `if _RESOLVED_SET=$(_resolve_skill_set …); then`, which suppresses
# errexit for the call. Verified both ways; keep it that way.
_resolve_skill_set() {
  local _tracker="$1" _tmpdir="$2"
  local _cli="${_tmpdir}/shared/resources/resolve-skill-set-cli.mjs"
  [[ -f "$_cli" ]] || return 1
  local _args=(--profile "$(_config_skills_profile)" --tracker "$_tracker"
               --skills-dir "${_tmpdir}/skills"
               --profiles "${_tmpdir}/shared/resources/skill-profiles.json"
               --graph    "${_tmpdir}/shared/resources/skill-dependencies.json")
  local _inc _exc
  _inc=$(_config_skills_list include); [[ -n "$_inc" ]] && _args+=(--include "$_inc")
  _exc=$(_config_skills_list exclude); [[ -n "$_exc" ]] && _args+=(--exclude "$_exc")
  [[ "${ALL_SKILLS:-false}" == true ]] && _args+=(--all-skills)

  # Discriminate on the EXIT CODE, not on emptiness. The CLI exits 0 for a
  # legitimately-empty set (every seed excluded, say) and 2 for a data-file or
  # resolution failure. Treating empty output as failure inverted the user's
  # intent in the worst possible direction: `--exclude` every seed asked for
  # almost nothing and installed everything.
  local _out _rc
  _out=$(node "$_cli" "${_args[@]}"); _rc=$?
  # PROPAGATE the CLI's code, do not collapse it. Exit 2 is a user-input error
  # the CLI has already named on stderr (an unknown skill in `include`, an
  # unknown profile); anything else is an environment failure. Collapsing both
  # to 1 made install_skills advise "check that node is on PATH" for a typo in
  # skills-config.yaml — the very mis-blaming the include validation was added
  # to stop.
  [[ $_rc -eq 0 ]] || return $_rc

  # Validate the shape before trusting it. A zero exit is NOT enough: `node` can
  # be shadowed by a shell function (nvm defines one) that prints help text and
  # exits 0, in which case this captured ~100 lines of prose and every real
  # skill then looked "outside profile" — a near-empty install, reported as
  # success. Observed while testing this very function. Skill names are
  # lowercase-kebab and nothing else, so a single bad line rejects the batch and
  # the caller falls back to the unfiltered install.
  # An empty set is a legitimate answer and is returned as such — the caller
  # distinguishes it from failure by this function's own exit code.
  if [[ -z "$_out" ]]; then
    printf ''
    return 0
  fi

  local _line
  while IFS= read -r _line; do
    [[ "$_line" =~ ^[a-z0-9][a-z0-9-]*$ ]] || return 1
  done <<<"$_out"

  printf '%s\n' "$_out"
}

_resolve_skills_version() {
  # Honour explicit override first
  if [[ -n "${SKILLS_VERSION:-}" ]]; then
    echo "$SKILLS_VERSION"
    return
  fi
  # Try latest GitHub release tag; fall back to main
  local _tag
  _tag=$(curl -fsSL "$SKILLS_API" 2>/dev/null \
    | grep '"tag_name"' | head -1 \
    | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
  echo "${_tag:-main}"
}

_version_tarball() {
  local _v="$1"
  if [[ "$_v" == "main" ]]; then
    echo "${SKILLS_REPO}/archive/refs/heads/main.tar.gz"
  else
    echo "${SKILLS_REPO}/archive/refs/tags/${_v}.tar.gz"
  fi
}

install_skills() {
  heading "Install skills"

  local _version; _version=$(_resolve_skills_version)
  local _tarball; _tarball=$(_version_tarball "$_version")

  # Warn loudly when falling back to main — consumers should pin to a tag
  # once releases exist
  local _unpinned=false
  if [[ "$_version" == "main" && -z "${SKILLS_VERSION:-}" ]]; then
    warn "No GitHub releases found — falling back to the main branch (unpinned, may change at any time)"
    _unpinned=true
  fi

  # --update bypasses install_hooks; warn if hooks may need refreshing
  if [[ "$UPDATE_ONLY" == true ]]; then
    info "--update skips hook installation. If hook scripts have moved, re-run without --update."
  fi

  ask "Install skills ${_version} from ${SKILLS_REPO}? [Y/n]:"
  read -r _install
  if [[ "${_install:-Y}" =~ ^[Yy]$ ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      echo -e "${YELLOW}[dry-run]${NC} would download ${_tarball} and extract into .agents/skills/"
      # Report the filter decision, not per-skill counts. This branch never
      # downloads the tarball, so it has no skill list to count — and making it
      # download one would put a network request in a dry run and break the
      # "one request, whole archive" property the real path relies on.
      local _dry_tracker; _dry_tracker=$(_resolve_install_tracker)
      local _dry_detail="${_version} (dry-run)"
      if [[ "$ALL_SKILLS" == true ]]; then
        echo -e "${YELLOW}[dry-run]${NC} --all-skills: no platform filter would be applied"
        _dry_detail="${_dry_detail}, no filter (--all-skills)"
      else
        case "$_dry_tracker" in
          github) echo -e "${YELLOW}[dry-run]${NC} tracker resolves to 'github' — would skip the $(grep -c . <<<"$SKILLS_JIRA_ONLY") Jira-only skills (kept if already installed)" ;;
          jira)   echo -e "${YELLOW}[dry-run]${NC} tracker resolves to 'jira' — would skip the $(grep -c . <<<"$SKILLS_GITHUB_ONLY") GitHub-only skills (kept if already installed)" ;;
        esac
        _dry_detail="${_dry_detail}, tracker ${_dry_tracker}"
      fi
      # Profile counts ARE computable here, without the network: both data
      # files are committed and travel in this repo. What is NOT computable is
      # a count against the tarball's own skill list, because this branch
      # deliberately never downloads it — so the count below is "what the
      # profile resolves to", and is labelled as such rather than implying it
      # counted the release.
      local _dry_profile _dry_n _dry_inc _dry_exc
      _dry_profile=$(_config_skills_profile)
      _dry_inc=$(_config_skills_list include)
      _dry_exc=$(_config_skills_list exclude)
      if [[ "$_dry_profile" != "full" || -n "$_dry_exc" ]]; then
        local _dry_cli="$(dirname "${BASH_SOURCE[0]}")/../shared/resources/resolve-skill-set-cli.mjs"
        # Pass include/exclude too — a dry run that previews a different set than
        # the real run would install defeats the point of previewing.
        local _dry_args=(--profile "$_dry_profile" --tracker "$_dry_tracker" --count)
        [[ -n "$_dry_inc" ]] && _dry_args+=(--include "$_dry_inc")
        [[ -n "$_dry_exc" ]] && _dry_args+=(--exclude "$_dry_exc")
        # --all-skills too, or the preview applies a tracker filter the real run
        # would not: 35 previewed against 41 actually installed.
        [[ "$ALL_SKILLS" == true ]] && _dry_args+=(--all-skills)
        if [[ -f "$_dry_cli" ]] && _dry_n=$(node "$_dry_cli" "${_dry_args[@]}" 2>/dev/null); then
          echo -e "${YELLOW}[dry-run]${NC} profile '${_dry_profile}' resolves to ${_dry_n} skills (closure computed offline; not counted against the release tarball)"
          _dry_detail="${_dry_detail}, profile ${_dry_profile} (${_dry_n})"
        else
          echo -e "${YELLOW}[dry-run]${NC} profile '${_dry_profile}' — resolver unavailable locally, count not computed"
          _dry_detail="${_dry_detail}, profile ${_dry_profile}"
        fi
      fi
      record_step "Skills install" "ok" "$_dry_detail"
    else
      info "Downloading skills ${_version} ..."
      local _tmpdir; _tmpdir=$(mktemp -d)
      local _archive="${_tmpdir}/skills.tar.gz"
      # Download to file first so we can report failures clearly. Piping
      # curl into tar with `set -euo pipefail` kills the script silently
      # on 404, which is the common failure mode (invalid SKILLS_VERSION).
      if ! curl -fsSL "$_tarball" -o "$_archive"; then
        err "Download failed: $_tarball"
        err "If you set SKILLS_VERSION, verify the tag exists:"
        err "  gh release list -R Gamaroff/agent-skills"
        err "  curl -fsSL ${SKILLS_API}"
        rm -rf "$_tmpdir"
        record_step "Skills install" "fail" "download failed (${_tarball})"
        record_warning "Skills download failed — re-run the wizard or run 'bash .agents/skills/develop-task/scripts/install-hooks.sh' after manual install"
        return 1
      fi
      tar -xzf "$_archive" -C "$_tmpdir" --strip-components=1
      mkdir -p .agents/skills
      local _tracker; _tracker=$(_resolve_install_tracker)
      local _installed=0 _updated=0 _skipped=0 _kept=0 _outside=0 _not_in_profile=0

      if [[ "$ALL_SKILLS" == true ]]; then
        info "--all-skills: installing every skill, no platform filter"
      elif [[ -n "$_tracker" ]]; then
        info "Filtering skills for tracker: ${_tracker}"
      fi

      # Resolve the profile to a concrete set. The CLI prints names on stdout
      # and its closure/conflict report on stderr, which goes straight to the
      # user's terminal — that report is how they see the closure working and
      # how they learn about an exclude conflict.
      #
      # FAILURE MEANS "NO FILTER", NOT "NO SKILLS". An empty _RESOLVED_SET would
      # make the membership test below reject every skill and produce an empty
      # install. Falling back to the unfiltered set keeps a broken data file or
      # a missing node from bricking the install.
      local _profile; _profile=$(_config_skills_profile)
      local _RESOLVED_SET="" _have_set=false _resolve_rc=0
      if [[ "$_profile" != "full" || -n "$(_config_skills_list exclude)" ]]; then
        _RESOLVED_SET=$(_resolve_skill_set "$_tracker" "$_tmpdir"); _resolve_rc=$?
        if [[ $_resolve_rc -eq 0 ]]; then
          _have_set=true
          # An empty-but-successful resolution is honoured — but never quietly.
          # "You excluded everything" and "something broke" produce the same
          # `0 new, 0 updated` summary otherwise.
          if [[ -z "$_RESOLVED_SET" ]]; then
            warn "Profile '${_profile}' resolved to ZERO skills — check your skills.exclude list"
            record_warning "Profile '${_profile}' resolved to zero skills, so nothing was installed. This is what the config asks for (every seed is excluded); if it is not what you meant, fix skills.exclude and re-run --update."
          fi
        elif [[ $_resolve_rc -eq 2 ]]; then
          # The CLI has already printed the specific problem to stderr.
          warn "skills-config.yaml names something that does not exist (see above) — installing the unfiltered set"
          record_warning "Your skills-config.yaml 'skills:' block names a skill or profile that does not exist; the message above says which. Every applicable skill was installed instead. Fix the config and re-run --update — this is a config error, not a node/PATH problem."
        else
          warn "Could not resolve skill profile '${_profile}' — installing the unfiltered set"
          record_warning "Skill profile '${_profile}' could not be resolved; every applicable skill was installed instead. Re-run --update after checking that node is on PATH."
        fi
      fi

      for _skill_dir in "$_tmpdir"/skills/*/; do
        [[ -f "${_skill_dir}SKILL.md" ]] || continue
        local _name; _name=$(basename "$_skill_dir")

        # ORDER: the tracker test comes FIRST, and it must. The resolver has
        # already removed tracker-excluded skills from _RESOLVED_SET, so a
        # profile-first check consumed every one of them — _kept was always 0,
        # Jira-only skills were reported as "outside profile", and the tracker
        # grandfather warning (which carries the --all-skills and prune advice)
        # was unreachable whenever a profile was active.
        #
        # PROFILE GRANDFATHER: a skill outside the resolved set that is ALREADY
        # on disk is KEPT, never deleted — the same guarantee task 83 makes for
        # the tracker filter, and for the same reason: pruning a working install
        # breaks the consumer's workflow days later and far from the cause.
        # The `continue` is what protects it; removing it drops through to the
        # rm -rf below.
        if ! _skill_excluded_for_tracker "$_name" "$_tracker" \
           && [[ "$_have_set" == true ]] \
           && ! grep -qxF "$_name" <<<"$_RESOLVED_SET"; then
          if [[ -d ".agents/skills/${_name}" ]]; then
            info "  kept     ${_name} (already installed; outside profile '${_profile}')"
            (( _outside++ )) || true
          else
            # Counted separately from _skipped: the summary attributes _skipped
            # to the tracker, and folding profile skips into it reported ~85
            # skills as "not applicable to github" when ~11 were.
            (( _not_in_profile++ )) || true
          fi
          continue
        fi

        if _skill_excluded_for_tracker "$_name" "$_tracker"; then
          # GRANDFATHER: an excluded skill that is already installed is KEPT.
          # This branch must be evaluated BEFORE the rm -rf below — reordering
          # it, or dropping the `continue`, silently deletes a skill from a
          # working install, which is the one outcome this must never produce.
          if [[ -d ".agents/skills/${_name}" ]]; then
            info "  kept     ${_name} (already installed; not pruned)"
            (( _kept++ )) || true
          else
            (( _skipped++ )) || true
          fi
          continue
        fi

        if [[ -d ".agents/skills/${_name}" ]]; then
          rm -rf ".agents/skills/${_name}"
          cp -r "$_skill_dir" ".agents/skills/${_name}"
          info "  updated  ${_name}"
          (( _updated++ )) || true
        else
          cp -r "$_skill_dir" ".agents/skills/${_name}"
          info "  new      ${_name}"
          (( _installed++ )) || true
        fi
      done
      # Vendor the PRD epic-index generator to the consumer's canonical
      # scripts/ path so the CI script (docs:epic-index) and the epic skills'
      # bundled logic are the SAME file, kept in sync on every --update.
      # Sourced from the release's shared/resources/ (clean source, no bundler
      # header). This file is vendor-managed — do NOT hand-edit it downstream;
      # change it in agent-skills' shared/resources/ and re-run --update.
      local _gen_src="${_tmpdir}/shared/resources/generate-prd-epic-index.mjs"
      if [[ -f "$_gen_src" ]]; then
        mkdir -p scripts
        cp "$_gen_src" scripts/generate-prd-epic-index.mjs
        info "  vendored scripts/generate-prd-epic-index.mjs (vendor-managed — do not hand-edit)"
      fi
      rm -rf "$_tmpdir"
      local _detail="${_installed} new, ${_updated} updated"
      (( _skipped > 0 )) && _detail="${_detail}, ${_skipped} skipped (${_tracker})"
      (( _kept > 0 ))    && _detail="${_detail}, ${_kept} kept"
      (( _outside > 0 )) && _detail="${_detail}, ${_outside} kept outside profile"
      (( _not_in_profile > 0 )) && _detail="${_detail}, ${_not_in_profile} not in profile '${_profile}'"
      ok "Skills ${_version} installed into .agents/skills/ (${_detail})"
      if (( _kept > 0 )); then
        record_warning "${_kept} skill(s) do not apply to tracker '${_tracker}' but were kept because they are already installed. Delete .agents/skills/ and re-run the wizard to prune, or pass --all-skills to disable the filter entirely."
      fi
      # State the divergence plainly. This is the EXPECTED state for every
      # existing consumer adopting a profile — config says `pipeline`, disk
      # holds more — so it is reported as normal, with the prune recipe, rather
      # than flagged as an error.
      if (( _outside > 0 )); then
        record_warning "${_outside} skill(s) are outside profile '${_profile}' but were kept because they are already installed. Your skills-config.yaml and .agents/skills/ therefore disagree, which is expected after adopting a profile — nothing is ever pruned on your behalf. To make disk match config: rm -rf .agents/skills && re-run with --update."
      fi
      if [[ "$_unpinned" == true ]]; then
        record_step "Skills install" "warn" "${_version} unpinned (${_detail})"
        record_warning "Skills pinned to main — set SKILLS_VERSION=<tag> once a release exists, then re-run --update"
      else
        record_step "Skills install" "ok" "${_version} (${_detail})"
      fi
    fi
  else
    info "Skipped — run: SKILLS_VERSION=${_version} bash <(curl -fsSL ${SKILLS_REPO}/raw/main/scripts/setup-consumer.sh)"
    record_step "Skills install" "skipped" "user declined"
    record_warning "Skills not installed — re-run the wizard or download manually before using the pipeline"
  fi
}

# ── 9. pipeline hooks ────────────────────────────────────────────────────────

# Patch a single hook event into SETTINGS_FILE. Idempotent.
_patch_hook() {
  local event="$1" cmd="$2"
  local already
  already=$(jq --arg event "$event" --arg cmd "$cmd" \
    '[.hooks[$event][]?.hooks[]?.command] | index($cmd)' \
    "$HOOKS_SETTINGS_FILE")
  if [[ "$already" != "null" ]]; then
    info "  ${event}: already registered"
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC}   ${event}: would add (${cmd})"
    return 0
  fi
  local tmp; tmp=$(mktemp)
  jq --arg event "$event" --arg cmd "$cmd" \
    '.hooks //= {}
     | .hooks[$event] //= []
     | .hooks[$event] += [{matcher: "*", hooks: [{type: "command", command: $cmd}]}]' \
    "$HOOKS_SETTINGS_FILE" > "$tmp"
  mv "$tmp" "$HOOKS_SETTINGS_FILE"
  ok "  ${event}: registered"
}

# Remove any hook entry under `event` whose command matches `pattern` (jq regex),
# pruning the event array if it becomes empty. Idempotent — heals older installs
# of the obsolete on-skill-return.sh PostToolUse hook (fired at skill-load, not
# skill-completion). Lock advancement now uses sub-skill self-advance + Stop hook.
_unpatch_hook() {
  local event="$1" pattern="$2"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC}   ${event}: would remove obsolete hook if present (${pattern})"
    return 0
  fi
  [[ -f "$HOOKS_SETTINGS_FILE" ]] || return 0
  local present
  present=$(jq --arg event "$event" --arg pat "$pattern" \
    '[.hooks[$event][]? | select(any(.hooks[]?; .command | test($pat)))] | length' \
    "$HOOKS_SETTINGS_FILE" 2>/dev/null || echo 0)
  [[ "${present:-0}" == "0" ]] && return 0
  local tmp; tmp=$(mktemp)
  jq --arg event "$event" --arg pat "$pattern" \
    '(.hooks[$event]) |= map(select(any(.hooks[]?; .command | test($pat)) | not))
     | if (.hooks[$event] | length) == 0 then del(.hooks[$event]) else . end' \
    "$HOOKS_SETTINGS_FILE" > "$tmp"
  mv "$tmp" "$HOOKS_SETTINGS_FILE"
  ok "  ${event}: removed obsolete on-skill-return.sh hook"
}

# Removes any hook entry under `event` whose command exactly equals `cmd` (no
# regex, so no escaping needed for literal path strings). Idempotent — heals
# installs from the pre-CLAUDE_PROJECT_DIR bare-relative-path commands, which
# would otherwise sit alongside the fixed entry and keep firing.
_unpatch_hook_exact() {
  local event="$1" cmd="$2"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC}   ${event}: would remove legacy hook if present (${cmd})"
    return 0
  fi
  [[ -f "$HOOKS_SETTINGS_FILE" ]] || return 0
  local present
  present=$(jq --arg event "$event" --arg cmd "$cmd" \
    '[.hooks[$event][]? | select(any(.hooks[]?; .command == $cmd))] | length' \
    "$HOOKS_SETTINGS_FILE" 2>/dev/null || echo 0)
  [[ "${present:-0}" == "0" ]] && return 0
  local tmp; tmp=$(mktemp)
  jq --arg event "$event" --arg cmd "$cmd" \
    '(.hooks[$event]) |= map(select(any(.hooks[]?; .command == $cmd) | not))
     | if (.hooks[$event] | length) == 0 then del(.hooks[$event]) else . end' \
    "$HOOKS_SETTINGS_FILE" > "$tmp"
  mv "$tmp" "$HOOKS_SETTINGS_FILE"
  ok "  ${event}: removed legacy pre-CLAUDE_PROJECT_DIR hook"
}

install_hooks() {
  heading "Pipeline hooks"

  # Detect whether Claude Code is already configured in this project
  local claude_configured=false
  [[ -f ".claude/settings.json" ]] && claude_configured=true

  # Find the hook scripts base directory (same candidate order as install-hooks.sh)
  local base=""
  local _candidates=(
    ".agents/skills/develop-story/scripts"
    ".agents/skills/develop-task/scripts"
    ".claude/skills/develop-story/scripts"
    ".claude/skills/develop-task/scripts"
  )
  for _c in "${_candidates[@]}"; do
    if [[ -f "$_c/on-stop.sh" ]] && [[ -f "$_c/on-precompact.sh" ]]; then
      base="$_c"
      break
    fi
  done

  if [[ -z "$base" ]] && [[ "$DRY_RUN" == false ]]; then
    if $claude_configured; then
      warn "Claude Code detected (.claude/settings.json) but hook scripts not found — install skills first"
    else
      warn "Hook scripts not found (skills not installed?) — skipping"
    fi
    info "Run later: bash .agents/skills/develop-task/scripts/install-hooks.sh"
    record_step "Pipeline hooks" "warn" "hook scripts not found"
    record_warning "Hooks not installed — run 'bash .agents/skills/develop-task/scripts/install-hooks.sh' after skills are in place"
    return
  fi

  if $claude_configured; then
    ask "Claude Code detected — update .claude/settings.json with pipeline hooks? [Y/n]:"
  else
    ask "Install Claude Code pipeline hooks into .claude/settings.json? [Y/n]:"
  fi
  read -r _hooks
  if [[ ! "${_hooks:-Y}" =~ ^[Yy]$ ]]; then
    info "Skipped — run later: bash .agents/skills/develop-task/scripts/install-hooks.sh"
    record_step "Pipeline hooks" "skipped" "user declined"
    record_warning "Pipeline hooks not installed — run 'bash .agents/skills/develop-task/scripts/install-hooks.sh' to enable develop-story/develop-task automation"
    return
  fi

  # Ensure settings file exists and is valid JSON
  HOOKS_SETTINGS_FILE=".claude/settings.json"
  if [[ "$DRY_RUN" == false ]]; then
    mkdir -p .claude
    [[ ! -f "$HOOKS_SETTINGS_FILE" ]] && echo "{}" > "$HOOKS_SETTINGS_FILE"
    if ! jq -e . "$HOOKS_SETTINGS_FILE" >/dev/null 2>&1; then
      err "${HOOKS_SETTINGS_FILE} is not valid JSON — skipping hook install"
      info "Fix the file manually, then run: bash .agents/skills/develop-task/scripts/install-hooks.sh"
      record_step "Pipeline hooks" "fail" "${HOOKS_SETTINGS_FILE} is not valid JSON"
      record_warning "Fix ${HOOKS_SETTINGS_FILE} (invalid JSON), then run 'bash .agents/skills/develop-task/scripts/install-hooks.sh'"
      return
    fi
  fi

  # Migration: strip legacy bare-relative-path hook commands (pre-CLAUDE_PROJECT_DIR
  # fix) for every candidate base, so re-running this installer replaces the old
  # broken entry instead of adding a second one that keeps erroring alongside it.
  for _c in "${_candidates[@]}"; do
    _unpatch_hook_exact "PreCompact" "bash ${_c}/on-precompact.sh"
    _unpatch_hook_exact "Stop"       "bash ${_c}/on-stop.sh"
  done

  # ${CLAUDE_PROJECT_DIR} is kept literal here (escaped) so Claude Code expands
  # it at hook-fire time, resolving to the project root regardless of cwd.
  _patch_hook "PreCompact"  "bash \"\${CLAUDE_PROJECT_DIR}/${base}/on-precompact.sh\""
  _patch_hook "Stop"        "bash \"\${CLAUDE_PROJECT_DIR}/${base}/on-stop.sh\""
  # Migration: strip the obsolete PostToolUse/on-skill-return.sh hook from older installs.
  _unpatch_hook "PostToolUse" "on-skill-return\\.sh"
  if [[ "$DRY_RUN" == false ]]; then
    ok "Pipeline hooks registered in ${HOOKS_SETTINGS_FILE}"
    record_step "Pipeline hooks" "ok" "2 hooks registered"
  else
    record_step "Pipeline hooks" "ok" "dry-run"
  fi
}

# ── summary ──────────────────────────────────────────────────────────────────

# Coloured status badge for the status table
_status_badge() {
  case "$1" in
    ok)      echo -e "${GREEN}ok${NC}     " ;;
    skipped) echo -e "${BLUE}skipped${NC}" ;;
    warn)    echo -e "${YELLOW}warn${NC}   " ;;
    fail)    echo -e "${RED}fail${NC}   " ;;
    *)       echo -e "$1     " ;;
  esac
}

print_summary() {
  SUMMARY_PRINTED=true

  local banner_color banner_icon banner_text
  if $WIZARD_HAS_FAIL; then
    banner_color="$RED"; banner_icon="✗"; banner_text="Setup failed"
  elif [[ ${#WIZARD_WARNINGS[@]} -gt 0 ]]; then
    banner_color="$YELLOW"; banner_icon="⚠"; banner_text="Setup completed with warnings"
  else
    banner_color="$GREEN"; banner_icon="✓"; banner_text="Setup complete"
  fi

  echo ""
  echo -e "${banner_color}════════════════════════════════════════════════════════════${NC}"
  echo -e "${banner_color}${BOLD}  ${banner_icon} ${banner_text}${NC}"
  echo -e "${banner_color}════════════════════════════════════════════════════════════${NC}"
  echo ""

  # Status table
  for entry in "${WIZARD_STEPS[@]}"; do
    local label="${entry%%|*}"; local rest="${entry#*|}"
    local status="${rest%%|*}"; local detail="${rest#*|}"
    [[ "$detail" == "$rest" ]] && detail=""
    printf "  %-18s %b  %s\n" "$label" "$(_status_badge "$status")" "$detail"
  done
  echo ""

  # Warnings block — only if there are any
  if [[ ${#WIZARD_WARNINGS[@]} -gt 0 ]]; then
    echo -e "${BOLD}${YELLOW}Warnings (${#WIZARD_WARNINGS[@]}):${NC}"
    for w in "${WIZARD_WARNINGS[@]}"; do
      echo -e "  ${YELLOW}⚠${NC} $w"
    done
    echo ""
  fi

  # Verify block
  echo -e "${BOLD}Verify the install:${NC}"
  echo "  ls .agents/skills/ | head                  # should list installed skills"
  echo "  cat .claude/settings.json | jq '.hooks'    # should show PreCompact / Stop"
  [[ "$UPDATE_ONLY" == false ]] && \
  echo "  cat skills-config.yaml                     # should reflect the answers you gave"
  echo ""

  # Next steps
  echo -e "${BOLD}Next steps:${NC}"
  if [[ "$UPDATE_ONLY" == true ]]; then
    echo "  1. Restart Claude Code to pick up the updated skills"
  else
    echo "  1. Fill in docs/architecture/concepts/*.md (or run /document-existing-project)"
    echo "  2. Restart Claude Code in this project directory"
    echo "  3. Run /create-task to verify skill loading"
    echo "  4. See docs/concepts/quickstart-task.md for a 10-minute walkthrough"
    if [[ "${ACCESS_TRACKER:-full}" != "full" ]]; then
      echo ""
      echo -e "${BOLD}Tracker access is ${ACCESS_TRACKER}:${NC}"
      echo "  Pipeline runs still complete. Tracker writes are recorded, not performed."
      echo "  After a run, work the committed *.handover.*.md checklist (or *.sh under command)."
      echo "  /tracker-reconcile is not shipped yet (task.57) — re-check the board by hand."
      echo "  Limits: enforcement is partial; /develop-next still needs VCS write."
      echo "  Guide: docs/concepts/restricted-access.md"
    fi
  fi
  echo ""
  echo -e "${BOLD}Something not working?${NC}  See docs/reference/troubleshooting.md"
  [[ "$DRY_RUN" == true ]] && echo "" && warn "Dry-run mode — no files were written."
  echo ""
}

# Ensure summary runs even on premature exit (e.g. set -e from a sub-step).
_on_exit() {
  local rc=$?
  trap - EXIT
  [[ "$SUMMARY_PRINTED" == true ]] && exit $rc
  # Skip summary if nothing of substance ran (e.g. --help, prereq fail before recording)
  [[ ${#WIZARD_STEPS[@]} -eq 0 ]] && exit $rc
  if (( rc != 0 )); then
    WIZARD_HAS_FAIL=true
    record_step "Wizard" "fail" "exited prematurely (code $rc)"
  fi
  print_summary
  exit $rc
}

# ── main ─────────────────────────────────────────────────────────────────────
main() {
  trap '_on_exit' EXIT

  echo ""
  if [[ "$UPDATE_ONLY" == true ]]; then
    echo -e "${BOLD}agent-skills — update skills${NC}"
  else
    echo -e "${BOLD}agent-skills setup wizard${NC}"
  fi
  [[ "$DRY_RUN" == true ]] && echo -e "${YELLOW}dry-run mode — no files will be written${NC}"
  echo ""

  check_prereqs

  if [[ "$UPDATE_ONLY" == true ]]; then
    install_skills
    print_summary
    return
  fi

  select_platform
  select_skill_profile
  collect_env_vars
  write_env_files
  write_skills_config
  create_registries
  scaffold_docs
  install_skills
  # After install_skills on purpose — it prefers probing the live board with a
  # CLI that install_skills is what puts on disk.
  write_tracker_workflow
  install_hooks
  print_summary
}

# Sourcing with SETUP_CONSUMER_NO_MAIN=1 loads the function definitions without
# running the wizard, so tests can exercise write_skills_config directly.
[[ -n "${SETUP_CONSUMER_NO_MAIN:-}" ]] || main "$@"
