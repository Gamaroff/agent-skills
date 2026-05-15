#!/usr/bin/env bash
# release.sh — Cut a semver release of agent-skills.
#
# Usage:
#   bash scripts/release.sh --patch   # bug fixes, docs, catalog regen
#   bash scripts/release.sh --minor   # new skills, new shared resources
#   bash scripts/release.sh --major   # breaking changes
#   bash scripts/release.sh --dry-run --minor   # preview without writing
#
# What it does:
#   1. Confirms working tree is clean and on main
#   2. Runs pre-release checks (npm test, validate:all, generate-catalog)
#   3. Calculates next version from latest git tag
#   4. Moves CHANGELOG [Unreleased] → [vX.Y.Z] - DATE
#   5. Commits chore(release): vX.Y.Z
#   6. Creates annotated tag vX.Y.Z
#   7. Pushes main + tag  →  triggers .github/workflows/release.yml
#
# Requires: node >=20, git, sed (BSD or GNU both work)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $*"; }
ok()      { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
err()     { echo -e "${RED}✗${NC} $*" >&2; }
heading() { echo -e "\n${BOLD}── $* ──────────────────────────────────────${NC}"; }

# ── flags ────────────────────────────────────────────────────────────────────
BUMP=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --major) BUMP=major; shift ;;
    --minor) BUMP=minor; shift ;;
    --patch) BUMP=patch; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ -z "$BUMP" ]]; then
  err "Specify a bump type: --major, --minor, or --patch"
  echo "Usage: bash scripts/release.sh [--dry-run] --major|--minor|--patch"
  exit 1
fi

# ── helpers ──────────────────────────────────────────────────────────────────
bump_version() {
  local current="$1" bump="$2"
  local major minor patch
  # Strip leading 'v'
  current="${current#v}"
  IFS='.' read -r major minor patch <<< "$current"
  case "$bump" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
  esac
  echo "v${major}.${minor}.${patch}"
}

run_or_dry() {
  local label="$1"; shift
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run: $*"
  else
    info "$label"
    "$@"
  fi
}

# ── 1. pre-flight ─────────────────────────────────────────────────────────────
heading "Pre-flight"

# Must be on main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  err "Must be on main (currently on ${CURRENT_BRANCH})"
  echo "Merge your changes to main first, then re-run."
  exit 1
fi
ok "On branch main"

# Must be clean
if [[ -n "$(git status --porcelain)" ]]; then
  err "Working tree is not clean"
  git status --short
  exit 1
fi
ok "Working tree clean"

# Up to date with origin
git fetch --quiet origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" != "$REMOTE" ]]; then
  err "Local main is not up to date with origin/main"
  echo "Run: git pull --rebase"
  exit 1
fi
ok "Up to date with origin/main"

# ── 2. pre-release checks ─────────────────────────────────────────────────────
heading "Pre-release checks"

info "Running npm test ..."
if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run: npm test"
else
  npm test
fi
ok "Tests passed"

info "Validating all skills ..."
if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run: npm run validate:all"
else
  npm run validate:all
fi
ok "Skills valid"

info "Checking skill catalog is current ..."
if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run: npm run generate-catalog"
else
  npm run generate-catalog
  if [[ -n "$(git status --porcelain docs/reference/skill-catalog.md)" ]]; then
    warn "Skill catalog was out of date — regenerated. Committing ..."
    git add docs/reference/skill-catalog.md
    git commit -m "chore(catalog): regenerate before release"
    ok "Catalog committed"
  else
    ok "Catalog up to date"
  fi
fi

# ── 3. calculate next version ─────────────────────────────────────────────────
heading "Version"

LATEST_TAG=$(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)
if [[ -z "$LATEST_TAG" ]]; then
  LATEST_TAG="v0.0.0"
  info "No existing tags — starting from ${LATEST_TAG}"
fi
ok "Latest tag: ${LATEST_TAG}"

NEXT_VERSION=$(bump_version "$LATEST_TAG" "$BUMP")
ok "Next version: ${NEXT_VERSION}  (${BUMP} bump)"

if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would create tag ${NEXT_VERSION} and push"
fi

# ── 4. update CHANGELOG ───────────────────────────────────────────────────────
heading "CHANGELOG"

CHANGELOG="CHANGELOG.md"
TODAY=$(date +%Y-%m-%d)

if [[ ! -f "$CHANGELOG" ]]; then
  err "CHANGELOG.md not found"
  exit 1
fi

if ! grep -q '## \[Unreleased\]' "$CHANGELOG"; then
  warn "No [Unreleased] section found in CHANGELOG.md — skipping CHANGELOG update"
else
  # Verify [Unreleased] has at least one non-blank, non-heading content line
  # before the next `## [` heading. An empty section means there's nothing
  # worth releasing.
  _unreleased_content=$(awk '
    /^## \[Unreleased\]/ { in_section=1; next }
    /^## \[/ && in_section { exit }
    in_section && NF > 0 && !/^### / { print; exit }
  ' "$CHANGELOG")
  if [[ -z "$_unreleased_content" ]]; then
    err "[Unreleased] section in ${CHANGELOG} is empty"
    echo "Add entries describing what's changing, then re-run."
    exit 1
  fi
  ok "[Unreleased] has content"

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would replace '## [Unreleased]' with '## [${NEXT_VERSION}] - ${TODAY}' in ${CHANGELOG}"
  else
    # Insert a fresh [Unreleased] section above the new versioned entry.
    # BSD sed (macOS) does NOT interpret \n in replacement strings, so use
    # awk for portable multi-line replacement.
    _tmp=$(mktemp)
    awk -v ver="${NEXT_VERSION}" -v date="${TODAY}" '
      /^## \[Unreleased\]/ && !done {
        print "## [Unreleased]"
        print ""
        print "## [" ver "] - " date
        done = 1
        next
      }
      { print }
    ' "$CHANGELOG" > "$_tmp"
    mv "$_tmp" "$CHANGELOG"
    ok "CHANGELOG updated — [${NEXT_VERSION}] - ${TODAY}"
  fi
fi

# ── 5. commit + tag + push ────────────────────────────────────────────────────
heading "Commit, tag, push"

if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run:"
  echo "  git add CHANGELOG.md"
  echo "  git commit -m 'chore(release): ${NEXT_VERSION}'"
  echo "  git tag -a ${NEXT_VERSION} -m 'Release ${NEXT_VERSION}'"
  echo "  git push origin main ${NEXT_VERSION}"
else
  git add "$CHANGELOG"
  # Only commit if there are staged changes (catalog update may have already committed)
  if [[ -n "$(git diff --cached --name-only)" ]]; then
    git commit -m "chore(release): ${NEXT_VERSION}"
  fi
  git tag -a "${NEXT_VERSION}" -m "Release ${NEXT_VERSION}"
  git push origin main "${NEXT_VERSION}"
  ok "Pushed main + tag ${NEXT_VERSION}"
fi

# ── summary ───────────────────────────────────────────────────────────────────
heading "Done"
echo ""
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry-run — nothing written or pushed."
  echo "  Would have released: ${NEXT_VERSION}"
else
  ok "Released ${NEXT_VERSION}"
  echo ""
  echo "  GitHub Actions will now:"
  echo "    1. Validate all skills"
  echo "    2. Create the GitHub release with auto-generated notes"
  echo "    3. Attach the source tarball (consumers will pick it up automatically)"
  echo ""
  echo "  Monitor: https://github.com/Gamaroff/agent-skills/actions"
fi
echo ""
