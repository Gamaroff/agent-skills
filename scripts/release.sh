#!/usr/bin/env bash
# release.sh — Cut a semver release of agent-skills.
#
# Usage:
#   bash scripts/release.sh --patch          # bug fixes, docs, catalog regen
#   bash scripts/release.sh --minor          # new skills, new shared resources
#   bash scripts/release.sh --major          # breaking changes
#   bash scripts/release.sh --dry-run --minor      # preview without writing
#   bash scripts/release.sh --retry [<tag>]        # re-run CI for an orphaned tag
#   bash scripts/release.sh --patch --no-sync-develop  # skip the develop sync step
#
# What it does (fresh release):
#   1. Confirms working tree is clean and on main
#   2. Runs pre-release checks (npm test, validate:all, generate-catalog, bundle)
#      — auto-commits stale catalog or bundled-reference files
#   3. Calculates next version from latest git tag
#   4. Moves CHANGELOG [Unreleased] → [vX.Y.Z] - DATE
#   5. Commits chore(release): vX.Y.Z
#   6. Creates annotated tag vX.Y.Z
#   7. Pushes main + tag  →  triggers .github/workflows/release.yml
#   8. Syncs develop with main (merge + push); skip with --no-sync-develop
#
# What --retry does:
#   Recovers from an "orphan tag" — a vX.Y.Z tag exists on origin but the
#   Release workflow failed before publishing the GitHub Release object.
#   Skips bump, CHANGELOG, and commit; deletes the tag locally + remote,
#   re-creates it at current main HEAD, re-pushes — triggers the workflow
#   afresh. Aborts if a published Release already exists for that tag.
#
# Requires: node >=22 (npm test uses node --test glob support), git, curl, sed (BSD or GNU both work)

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
RETRY=false
RETRY_TAG=""
SYNC_DEVELOP=true
REPO_SLUG="Gamaroff/agent-skills"

while [[ $# -gt 0 ]]; do
  case "$1" in
    # Quoted: `patch` is an external command on many systems, so an unquoted
    # `BUMP=patch` reads to shellcheck (SC2209) as a mistyped `BUMP=$(patch)`.
    # The whole arm set is quoted so the block stays uniform.
    --major) BUMP="major"; shift ;;
    --minor) BUMP="minor"; shift ;;
    --patch) BUMP="patch"; shift ;;
    --dry-run) DRY_RUN="true"; shift ;;
    --no-sync-develop) SYNC_DEVELOP="false"; shift ;;
    --retry)
      RETRY=true; shift
      # Optional positional tag argument — consume it only if it looks like a tag
      if [[ $# -gt 0 && "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        RETRY_TAG="$1"; shift
      fi
      ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ "$RETRY" == false && -z "$BUMP" ]]; then
  err "Specify a bump type or --retry"
  echo "Usage:"
  echo "  bash scripts/release.sh [--dry-run] --major|--minor|--patch"
  echo "  bash scripts/release.sh [--dry-run] --retry [<tag>]"
  exit 1
fi

if [[ "$RETRY" == true && -n "$BUMP" ]]; then
  err "--retry is mutually exclusive with --major/--minor/--patch"
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
  err "Local main is not in sync with origin/main"
  if git merge-base --is-ancestor "$REMOTE" "$LOCAL"; then
    # origin/main is an ancestor of local — local is ahead
    echo "Local is ahead of origin/main. Run: git push"
  elif git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
    # local is an ancestor of origin/main — local is behind
    echo "Local is behind origin/main. Run: git pull --rebase"
  else
    # Diverged — neither is an ancestor of the other
    echo "Local has diverged from origin/main. Reconcile manually (rebase / merge), then re-run."
  fi
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

info "Checking bundled references are current ..."
if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run: npm run bundle"
else
  npm run bundle
  if [[ -n "$(git status --porcelain -- skills/)" ]]; then
    warn "Bundled references were out of date — regenerated. Committing ..."
    git add skills/
    git commit -m "chore(bundle): sync references before release"
    ok "Bundle committed"
  else
    ok "Bundled references up to date"
  fi
fi

# ── 3. calculate next version (or resolve retry tag) ─────────────────────────
heading "Version"

LATEST_TAG=$(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)
if [[ -z "$LATEST_TAG" ]]; then
  LATEST_TAG="v0.0.0"
  info "No existing tags — starting from ${LATEST_TAG}"
fi
ok "Latest tag: ${LATEST_TAG}"

if [[ "$RETRY" == true ]]; then
  # Default to latest tag if no explicit tag passed
  if [[ -z "$RETRY_TAG" ]]; then
    RETRY_TAG="$LATEST_TAG"
    info "No tag passed — defaulting to latest: ${RETRY_TAG}"
  fi
  if [[ "$RETRY_TAG" == "v0.0.0" ]]; then
    err "No real tag to retry. Cut a fresh release with --patch/--minor/--major."
    exit 1
  fi
  # Safety check: refuse if a published Release already exists for this tag
  info "Checking GitHub Release status for ${RETRY_TAG} ..."
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.github.com/repos/${REPO_SLUG}/releases/tags/${RETRY_TAG}")
  if [[ "$HTTP" == "200" ]]; then
    err "Release ${RETRY_TAG} is already published on GitHub — nothing to retry."
    echo "If you want to ship a new release, use --patch/--minor/--major."
    exit 1
  elif [[ "$HTTP" != "404" ]]; then
    warn "Unexpected response from GitHub API (HTTP ${HTTP}) — proceeding anyway."
  fi
  ok "No published Release for ${RETRY_TAG} — safe to retry"
  NEXT_VERSION="$RETRY_TAG"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would delete and re-push tag ${RETRY_TAG}"
  fi
else
  NEXT_VERSION=$(bump_version "$LATEST_TAG" "$BUMP")
  ok "Next version: ${NEXT_VERSION}  (${BUMP} bump)"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would create tag ${NEXT_VERSION} and push"
  fi
fi

# ── 4. update CHANGELOG (skip for --retry) ───────────────────────────────────
if [[ "$RETRY" == true ]]; then
  info "Skipping CHANGELOG update — retry reuses existing tag"
else

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

fi  # end "skip CHANGELOG for --retry"

# ── 5. commit + tag + push ────────────────────────────────────────────────────
heading "Commit, tag, push"

if [[ "$RETRY" == true ]]; then
  # Retry path: delete + recreate + re-push the tag at current main HEAD
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run:"
    echo "  git tag -d ${NEXT_VERSION}"
    echo "  git push origin :refs/tags/${NEXT_VERSION}"
    echo "  git tag -a ${NEXT_VERSION} -m 'Release ${NEXT_VERSION}'"
    echo "  git push origin main ${NEXT_VERSION}"
  else
    # Local delete is best-effort — the tag may already be gone
    git tag -d "${NEXT_VERSION}" 2>/dev/null || true
    git push origin ":refs/tags/${NEXT_VERSION}"
    git tag -a "${NEXT_VERSION}" -m "Release ${NEXT_VERSION}"
    git push origin main "${NEXT_VERSION}"
    ok "Re-pushed tag ${NEXT_VERSION}"
  fi
elif [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run:"
  echo "  git add CHANGELOG.md"
  echo "  git commit -m 'chore(release): ${NEXT_VERSION}'"
  echo "  git tag -a ${NEXT_VERSION} -m 'Release ${NEXT_VERSION}'"
  echo "  git push origin main ${NEXT_VERSION}"
else
  git add "$CHANGELOG"
  # Only commit if there are staged changes (catalog/bundle auto-commits may have already committed)
  if [[ -n "$(git diff --cached --name-only)" ]]; then
    git commit -m "chore(release): ${NEXT_VERSION}"
  fi
  git tag -a "${NEXT_VERSION}" -m "Release ${NEXT_VERSION}"
  git push origin main "${NEXT_VERSION}"
  ok "Pushed main + tag ${NEXT_VERSION}"
fi

# ── 6. sync develop ───────────────────────────────────────────────────────────
if [[ "$RETRY" == false && "$SYNC_DEVELOP" == true ]]; then
  heading "Sync develop"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run:"
    echo "  git checkout develop"
    echo "  git pull --rebase"
    echo "  git merge main"
    echo "  git push"
    echo "  git checkout main"
  else
    git checkout develop
    git pull --rebase
    git merge main
    git push
    git checkout main
    ok "develop synced with main"
  fi
fi

# ── summary ───────────────────────────────────────────────────────────────────
heading "Done"
echo ""
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry-run — nothing written or pushed."
  if [[ "$RETRY" == true ]]; then
    echo "  Would have retried: ${NEXT_VERSION}"
  else
    echo "  Would have released: ${NEXT_VERSION}"
    if [[ "$SYNC_DEVELOP" == true ]]; then
      echo "  Would have synced develop with main"
    fi
  fi
else
  if [[ "$RETRY" == true ]]; then
    ok "Retried ${NEXT_VERSION}"
  else
    ok "Released ${NEXT_VERSION}"
  fi
  echo ""
  echo "  GitHub Actions will now:"
  echo "    1. Validate all skills"
  echo "    2. Create the GitHub release with auto-generated notes"
  echo "    3. Attach the source tarball (consumers will pick it up automatically)"
  echo ""
  echo "  Monitor: https://github.com/${REPO_SLUG}/actions"
fi
echo ""
