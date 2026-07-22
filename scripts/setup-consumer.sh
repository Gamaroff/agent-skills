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
#   8. Skills install             (latest release from github.com/Gamaroff/agent-skills)
#   9. Pipeline hook install      (.claude/settings.json via inline jq)
#
# Usage:
#   bash scripts/setup-consumer.sh               # full wizard
#   bash scripts/setup-consumer.sh --dry-run     # print actions, write nothing
#   bash scripts/setup-consumer.sh --update      # re-download skills only (skip wizard)
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
  record_step "Credentials" "ok" "$VCS + $TRACKER credentials collected"
}

# ── 4. .env files ────────────────────────────────────────────────────────────
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
    if [[ ! "${_ow_env:-N}" =~ ^[Yy]$ ]]; then
      info "Skipped .env — existing file kept"
      record_step "Env files" "ok" ".env kept (existing)"
      return
    fi
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
    record_step "Env files" "ok" ".env written"
  else
    info "Skipped .env — fill in .env.example manually"
    record_step "Env files" "ok" ".env.example only"
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

  local tracker_block=""
  if [[ "$TRACKER" == "jira" ]]; then
    tracker_block=$'\ntracker: jira\n\njira:\n  # devEstimateField: customfield_10594  # optional — Jira numeric custom field id for estimated dev hours\n  statusMap:                          # local document status -> your Jira workflow status name\n    draft: To Do\n    planned: To Do\n    ready-for-development: To Do\n    in-progress: In Progress\n    ready-for-review: In Review\n    accepted: Done\n    cancelled: Cancelled'
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
${tracker_block}"

  write_file "skills-config.yaml" "$config"
  ok "skills-config.yaml"
  record_step "skills-config" "ok" "written"
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
      record_step "Skills install" "ok" "${_version} (dry-run)"
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
      local _installed=0 _updated=0
      for _skill_dir in "$_tmpdir"/skills/*/; do
        [[ -f "${_skill_dir}SKILL.md" ]] || continue
        local _name; _name=$(basename "$_skill_dir")
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
      ok "Skills ${_version} installed into .agents/skills/ (${_installed} new, ${_updated} updated)"
      if [[ "$_unpinned" == true ]]; then
        record_step "Skills install" "warn" "${_version} unpinned (${_installed} new, ${_updated} updated)"
        record_warning "Skills pinned to main — set SKILLS_VERSION=<tag> once a release exists, then re-run --update"
      else
        record_step "Skills install" "ok" "${_version} (${_installed} new, ${_updated} updated)"
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
