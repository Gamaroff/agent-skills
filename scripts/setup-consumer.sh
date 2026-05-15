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
#   6. docs/ scaffold             (docs/prd/, docs/architecture/concepts/, docs/tasks/)
#   7. Skills install             (latest release from github.com/Gamaroff/agent-skills)
#   8. Pipeline hook install      (.claude/settings.json via inline jq)
#
# Usage:
#   bash scripts/setup-consumer.sh               # full wizard
#   bash scripts/setup-consumer.sh --dry-run     # print actions, write nothing
#   bash scripts/setup-consumer.sh --update      # re-download skills only (skip wizard)
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
UPDATE_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)  DRY_RUN=true;    shift ;;
    --update)   UPDATE_ONLY=true; shift ;;
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
# Globals set by write_skills_config — consumed by scaffold_docs so it
# creates dirs at the *user-chosen* paths, not the hardcoded defaults.
PRD_DIR="docs/prd"
ARCH_DIR="docs/architecture"

# Extract a path value from an existing skills-config.yaml.
# Usage: _read_config_path prdShardedLocation
_read_config_path() {
  local _key="$1"
  [[ ! -f "skills-config.yaml" ]] && return
  grep -E "^[[:space:]]*${_key}:" skills-config.yaml 2>/dev/null \
    | head -1 | sed -E "s/^[[:space:]]*${_key}:[[:space:]]*//"
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

  local tracker_block=""
  if [[ "$TRACKER" == "jira" ]]; then
    tracker_block=$'\ntracker: jira'
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

# ── 6. docs scaffold ─────────────────────────────────────────────────────────
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
  fi
}

# ── 7. install skills ────────────────────────────────────────────────────────
SKILLS_REPO="https://github.com/Gamaroff/agent-skills"
SKILLS_API="https://api.github.com/repos/Gamaroff/agent-skills/releases/latest"

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
  if [[ "$_version" == "main" && -z "${SKILLS_VERSION:-}" ]]; then
    warn "No GitHub releases found — falling back to the main branch (unpinned, may change at any time)"
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
    else
      info "Downloading skills ${_version} ..."
      local _tmpdir; _tmpdir=$(mktemp -d)
      curl -fsSL "$_tarball" | tar -xz -C "$_tmpdir" --strip-components=1
      mkdir -p .agents/skills
      for _skill_dir in "$_tmpdir"/skills/*/; do
        [[ -f "${_skill_dir}SKILL.md" ]] || continue
        local _name; _name=$(basename "$_skill_dir")
        # Remove existing target so cp -r overwrites cleanly rather than
        # nesting (cp -r src dest copies *into* dest when dest exists)
        rm -rf ".agents/skills/${_name}"
        cp -r "$_skill_dir" ".agents/skills/${_name}"
      done
      rm -rf "$_tmpdir"
      ok "Skills ${_version} installed into .agents/skills/"
    fi
  else
    info "Skipped — run: SKILLS_VERSION=${_version} bash <(curl -fsSL ${SKILLS_REPO}/raw/main/scripts/setup-consumer.sh)"
  fi
}

# ── 7. pipeline hooks ────────────────────────────────────────────────────────

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
    if [[ -f "$_c/on-stop.sh" ]] && [[ -f "$_c/on-precompact.sh" ]] && [[ -f "$_c/on-skill-return.sh" ]]; then
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
    return
  fi

  if $claude_configured; then
    ask "Claude Code detected — update .claude/settings.json with pipeline hooks? [Y/n]:"
  else
    ask "Install Claude Code pipeline hooks into .claude/settings.json? [Y/n]:"
  fi
  read -r _hooks
  [[ ! "${_hooks:-Y}" =~ ^[Yy]$ ]] && { info "Skipped — run later: bash .agents/skills/develop-task/scripts/install-hooks.sh"; return; }

  # Ensure settings file exists and is valid JSON
  HOOKS_SETTINGS_FILE=".claude/settings.json"
  if [[ "$DRY_RUN" == false ]]; then
    mkdir -p .claude
    [[ ! -f "$HOOKS_SETTINGS_FILE" ]] && echo "{}" > "$HOOKS_SETTINGS_FILE"
    if ! jq -e . "$HOOKS_SETTINGS_FILE" >/dev/null 2>&1; then
      err "${HOOKS_SETTINGS_FILE} is not valid JSON — skipping hook install"
      info "Fix the file manually, then run: bash .agents/skills/develop-task/scripts/install-hooks.sh"
      return
    fi
  fi

  _patch_hook "PreCompact"  "bash ${base}/on-precompact.sh"
  _patch_hook "Stop"        "bash ${base}/on-stop.sh"
  _patch_hook "PostToolUse" "bash ${base}/on-skill-return.sh"
  [[ "$DRY_RUN" == false ]] && ok "Pipeline hooks registered in ${HOOKS_SETTINGS_FILE}"
}

# ── summary ──────────────────────────────────────────────────────────────────
print_summary() {
  heading "Done"
  echo ""
  if [[ "$UPDATE_ONLY" == false ]]; then
    echo "  Platform   $VCS + $TRACKER"
    echo "  Config     skills-config.yaml"
    echo "  Docs       docs/prd/  docs/architecture/concepts/  docs/tasks/"
    echo "  Registries docs/epic-registry.md"
    echo "             docs/tasks/task-registry.md"
  fi
  echo "  Skills     .agents/skills/  (from ${SKILLS_REPO} — tag resolved at install time)"
  echo ""
  echo -e "${BOLD}Verify the install:${NC}"
  echo "  ls .agents/skills/ | head                  # should list installed skills"
  echo "  cat .claude/settings.json | jq '.hooks'    # should show PreCompact / Stop / PostToolUse"
  [[ "$UPDATE_ONLY" == false ]] && \
  echo "  cat skills-config.yaml                     # should reflect the answers you gave"
  echo ""
  echo -e "${BOLD}Next steps:${NC}"
  if [[ "$UPDATE_ONLY" == true ]]; then
    echo "  1. Restart Claude Code to pick up the updated skills"
  else
    echo "  1. Fill in docs/architecture/concepts/*.md (or run /document-existing-project)"
    echo "  2. Restart Claude Code in this project directory"
    echo "  3. Run /create-task to verify skill loading"
    echo "  4. See docs/concepts/quickstart-task.md for a 10-minute walkthrough"
  fi
  echo ""
  echo -e "${BOLD}Something not working?${NC}  See docs/reference/troubleshooting.md"
  [[ "$DRY_RUN" == true ]] && echo "" && warn "Dry-run mode — no files were written."
  echo ""
}

# ── main ─────────────────────────────────────────────────────────────────────
main() {
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
  collect_env_vars
  write_env_files
  write_skills_config
  create_registries
  scaffold_docs
  install_skills
  install_hooks
  print_summary
}

main "$@"
