#!/usr/bin/env bash
# setup-consumer.sh — Interactive wizard to configure agent-skills in a consumer project.
#
# Documented in: docs/concepts/getting-started.md § "Quick setup (wizard)"
#
# Covers:
#   1. Prerequisite checks        (node, git, jq, curl)
#   2. Platform selection         (GitHub+Issues / GitHub+Jira / Bitbucket+Jira)
#   3. Credential collection      (.env / .env.example, gh auth check)
#   4. skills-config.yaml         (PRD path, story layout, coding-standards path)
#   5. Registry creation          (docs/epic-registry.md, docs/tasks/task-registry.md)
#   6. Skills install             (npx skills add --all)
#   7. Pipeline hook install      (.claude/settings.json via install-hooks.sh)
#
# Usage:
#   bash scripts/setup-consumer.sh
#   bash scripts/setup-consumer.sh --dry-run   # print actions, write nothing
#
# Requires: node ≥ 20, git, jq, curl

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
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

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
  grep -E "^${key}=" ".env" 2>/dev/null | head -1 | cut -d'=' -f2-
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
    exit 1
  fi
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
  if [[ "$VCS" == "bitbucket" ]]; then
    local BITBUCKET_USERNAME BITBUCKET_APP_PASSWORD
    prompt_plain   BITBUCKET_USERNAME    "BITBUCKET_USERNAME"
    prompt_secret  BITBUCKET_APP_PASSWORD "BITBUCKET_APP_PASSWORD"
    ENV_LINES+=("BITBUCKET_USERNAME=${BITBUCKET_USERNAME}")
    ENV_LINES+=("BITBUCKET_APP_PASSWORD=${BITBUCKET_APP_PASSWORD}")
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
}

write_env_files() {
  [[ ${#ENV_LINES[@]} -eq 0 ]] && return

  heading "Writing .env files"

  # .env.example — keys only, no values
  local example_content="# agent-skills environment variables\n# Copy to .env and fill in real values\n"
  for line in "${ENV_LINES[@]}"; do
    example_content+="${line%%=*}=\n"
  done
  if [[ -f ".env.example" ]] && [[ "$DRY_RUN" == false ]]; then
    info ".env.example already exists — skipped"
  else
    write_file ".env.example" "$(printf '%b' "$example_content")"
    ok ".env.example"
  fi

  if [[ -f ".env" ]]; then
    warn ".env already exists."
    ask "Overwrite? [y/N]:"
    read -r _ow_env
    [[ ! "${_ow_env:-N}" =~ ^[Yy]$ ]] && { info "Skipped .env — existing file kept"; return; }
  fi

  ask "Write live credentials to .env? [Y/n]:"
  read -r _write_env
  if [[ "${_write_env:-Y}" =~ ^[Yy]$ ]]; then
    local env_content=""
    for line in "${ENV_LINES[@]}"; do
      env_content+="${line}\n"
    done
    write_file ".env" "$(printf '%b' "$env_content")"
    ok ".env written"

    # .gitignore
    if [[ -f ".gitignore" ]] || [[ "$DRY_RUN" == true ]]; then
      append_line ".gitignore" ".env"
      ok ".env added to .gitignore"
    else
      write_file ".gitignore" ".env\n"
      ok ".gitignore created with .env"
    fi
  else
    info "Skipped .env — fill in .env.example manually"
  fi
}

# ── 4. skills-config.yaml ────────────────────────────────────────────────────
write_skills_config() {
  heading "skills-config.yaml"

  if [[ -f "skills-config.yaml" ]]; then
    warn "skills-config.yaml already exists."
    ask "Overwrite? [y/N]:"
    read -r _ow
    if [[ ! "${_ow:-N}" =~ ^[Yy]$ ]]; then
      info "Skipped"
      return
    fi
  fi

  ask "PRD location  (default: docs/prd):"
  read -r _prd_loc; _prd_loc=${_prd_loc:-docs/prd}

  echo "  Story location options:"
  echo "    nested — stories live inside their epic directory  (recommended)"
  echo "    flat   — stories in a shared stories/ directory"
  ask "Story location [nested/flat] (default: nested):"
  read -r _story_loc; _story_loc=${_story_loc:-nested}

  ask "Coding-standards path  (default: docs/architecture/concepts/coding-standards.md):"
  read -r _cs_path; _cs_path=${_cs_path:-docs/architecture/concepts/coding-standards.md}

  local tracker_block=""
  if [[ "$TRACKER" == "jira" ]]; then
    tracker_block=$'\ntracker: jira'
  fi

  local config
  config="# agent-skills configuration — generated by setup-consumer.sh
# Full schema: docs/reference/configuration.md

prd:
  prdSharded: true
  prdShardedLocation: ${_prd_loc}
  epicFilePattern: \"*/epics/epic.{n}.*.md\"

devStoryLocation: ${_story_loc}

devLoadAlwaysFiles:
  - ${_cs_path}
${tracker_block}"

  write_file "skills-config.yaml" "$config"
  ok "skills-config.yaml"
}

# ── 5. registries ────────────────────────────────────────────────────────────
create_registries() {
  heading "Registries"

  if [[ -f "docs/epic-registry.md" ]]; then
    info "docs/epic-registry.md exists — skipped"
  else
    touch_file "docs/epic-registry.md"
    ok "docs/epic-registry.md"
  fi

  if [[ -f "docs/tasks/task-registry.md" ]]; then
    info "docs/tasks/task-registry.md exists — skipped"
  else
    touch_file "docs/tasks/task-registry.md"
    ok "docs/tasks/task-registry.md"
  fi
}

# ── 6. install skills ────────────────────────────────────────────────────────
install_skills() {
  heading "Install skills"

  ask "Install all skills now? (npx skills add --all) [Y/n]:"
  read -r _install
  if [[ "${_install:-Y}" =~ ^[Yy]$ ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      echo -e "${YELLOW}[dry-run]${NC} would run: npx skills add --all"
    else
      npx skills add --all
      ok "Skills installed into .agents/skills/"
    fi
  else
    info "Skipped — run 'npx skills add --all' later"
  fi
}

# ── 7. pipeline hooks ────────────────────────────────────────────────────────
install_hooks() {
  heading "Pipeline hooks"

  local hook_script=".agents/skills/develop-task/scripts/install-hooks.sh"

  if [[ ! -f "$hook_script" ]] && [[ "$DRY_RUN" == false ]]; then
    warn "Hook script not found (skills not installed?) — skipping"
    info "Run later: bash $hook_script"
    return
  fi

  ask "Install Claude Code pipeline hooks? [Y/n]:"
  read -r _hooks
  if [[ "${_hooks:-Y}" =~ ^[Yy]$ ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      echo -e "${YELLOW}[dry-run]${NC} would run: bash $hook_script"
    else
      bash "$hook_script"
      ok "Hooks installed"
    fi
  else
    info "Skipped — run later: bash $hook_script"
  fi
}

# ── summary ──────────────────────────────────────────────────────────────────
print_summary() {
  heading "Done"
  echo ""
  echo "  Platform   $VCS + $TRACKER"
  echo "  Config     skills-config.yaml"
  echo "  Skills     .agents/skills/"
  echo "  Registries docs/epic-registry.md"
  echo "             docs/tasks/task-registry.md"
  echo ""
  echo -e "${BOLD}Verify the install:${NC}"
  echo "  ls .agents/skills/ | head           # should list installed skills"
  echo "  cat .claude/settings.json | jq '.hooks'   # should show PreCompact / Stop / PostToolUse"
  echo "  cat skills-config.yaml              # should reflect the answers you gave"
  echo ""
  echo -e "${BOLD}Next steps:${NC}"
  echo "  1. Restart Claude Code in this project directory"
  echo "  2. Run /create-task to verify skill loading"
  echo "  3. See docs/concepts/quickstart-task.md for a 10-minute walkthrough"
  echo ""
  echo -e "${BOLD}Something not working?${NC}  See docs/reference/troubleshooting.md"
  [[ "$DRY_RUN" == true ]] && echo ""  && warn "Dry-run mode — no files were written."
  echo ""
}

# ── main ─────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BOLD}agent-skills setup wizard${NC}"
  [[ "$DRY_RUN" == true ]] && echo -e "${YELLOW}dry-run mode — no files will be written${NC}"
  echo ""

  check_prereqs
  select_platform
  collect_env_vars
  write_env_files
  write_skills_config
  create_registries
  install_skills
  install_hooks
  print_summary
}

main "$@"
