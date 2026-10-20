#!/usr/bin/env bash
# release.sh — Cut a semver release of agent-skills.
#
# A release runs in two halves, and neither one commits to main:
#
#   bash scripts/release.sh --prepare --patch   # on develop: bug fixes, docs, catalog regen
#   bash scripts/release.sh --prepare --minor   # on develop: new skills, new shared resources
#   bash scripts/release.sh --prepare --major   # on develop: breaking changes
#   # … merge the "Release prep — vX.Y.Z" PR into main, then:
#   bash scripts/release.sh --tag               # on main: tag the merged commit
#
#   bash scripts/release.sh --dry-run --prepare --minor   # preview either half without writing
#   bash scripts/release.sh --dry-run --tag
#   bash scripts/release.sh --tag --no-sync-develop       # skip the develop sync step
#   bash scripts/release.sh --tag --skip-ci-check         # tag without CI's verdict (see below)
#   bash scripts/release.sh --retry [<tag>]               # re-run CI for an orphaned tag
#
# Why two halves: main's branch protection requires a check that runs on pull_request only, so
# any push of a commit to main is refused unless an admin bypasses it. The release commit used to
# be made on main and pushed there — every release printed "Bypassed rule violations for
# refs/heads/main". Now the release commit travels to main inside the release-prep PR, and the
# script only ever pushes a tag to main's tip. Pinned by tests/release-ci-gate.test.js, whose
# scratch origin refuses every push to main.
#
# What --prepare does (on develop, or on a hotfix/* or release/* branch):
#   1. Confirms the working tree is clean and in sync with origin
#   2. Warns on branches carrying commits not on develop (advisory — finished
#      work that never merged is invisible to every other check and to CI)
#   3. Calculates the next version from the latest git tag + the bump type
#   4. Regenerates the skill catalog and bundled references — commits any diff
#   5. Moves CHANGELOG [Unreleased] → [vX.Y.Z] - DATE, commits chore(release): vX.Y.Z
#   6. Pushes the branch and opens the "Release prep — vX.Y.Z" PR into main
#      (or reuses the PR already open from this branch)
#
# What --tag does (on main, after that PR merged):
#   1. Confirms the working tree is clean and in sync with origin/main
#   2. Reads CI's verdict for HEAD (scripts/release-ci-verdict.mjs) and refuses
#      unless it is green — before the multi-minute local test. A local run is a
#      claim about one machine (obs #150). --skip-ci-check proceeds with a
#      warning; use it only when CI has been confirmed another way.
#   3. Reads the version from the newest [vX.Y.Z] heading in CHANGELOG.md, and refuses
#      when it is not newer than the latest tag, is already tagged, or [Unreleased] has entries
#   4. Runs npm run test:clean-checkout and validate:all, and checks — never regenerates — the
#      catalog and bundled references (a stale one is fixed on develop and promoted again)
#   5. Creates annotated tag vX.Y.Z at HEAD and pushes the tag alone
#      →  triggers .github/workflows/release.yml
#   6. Syncs develop with main (merge + push); skip with --no-sync-develop
#
# What --retry does:
#   Recovers from an "orphan tag" — a vX.Y.Z tag exists on origin but the
#   Release workflow failed before publishing the GitHub Release object.
#   Skips bump, CHANGELOG, and commit; deletes the tag locally + remote,
#   re-creates it at current main HEAD, re-pushes it — triggers the workflow
#   afresh. Aborts if a published Release already exists for that tag.
#
# Requires: node >=22 (npm test uses node --test glob support), git, curl, sed (BSD or GNU both work),
#           gh (authenticated) for --prepare's PR and --tag's CI check — not needed for --retry

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $*"; }
ok()      { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
err()     { echo -e "${RED}✗${NC} $*" >&2; }
heading() { echo -e "\n${BOLD}── $* ──────────────────────────────────────${NC}"; }

# ── flags ────────────────────────────────────────────────────────────────────
MODE=""
BUMP=""
DRY_RUN=false
RETRY_TAG=""
SYNC_DEVELOP=true
SKIP_CI_CHECK=false
CI_CERTIFIED=false
WOULD_REFUSE=""
REPO_SLUG="Gamaroff/agent-skills"

set_mode() {
  if [[ -n "$MODE" && "$MODE" != "$1" ]]; then
    err "--${MODE} and --$1 are mutually exclusive"
    exit 1
  fi
  MODE="$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    # Quoted: `patch` is an external command on many systems, so an unquoted
    # `BUMP=patch` reads to shellcheck (SC2209) as a mistyped `BUMP=$(patch)`.
    # The whole arm set is quoted so the block stays uniform.
    --major) BUMP="major"; shift ;;
    --minor) BUMP="minor"; shift ;;
    --patch) BUMP="patch"; shift ;;
    --prepare) set_mode "prepare"; shift ;;
    --tag) set_mode "tag"; shift ;;
    --dry-run) DRY_RUN="true"; shift ;;
    --no-sync-develop) SYNC_DEVELOP="false"; shift ;;
    --skip-ci-check) SKIP_CI_CHECK="true"; shift ;;
    --retry)
      set_mode "retry"; shift
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

usage() {
  echo "Usage:"
  echo "  bash scripts/release.sh [--dry-run] --prepare --major|--minor|--patch   # on develop"
  echo "  bash scripts/release.sh [--dry-run] --tag                               # on main, after the PR merged"
  echo "  bash scripts/release.sh [--dry-run] --retry [<tag>]                     # on main"
}

if [[ -z "$MODE" && -n "$BUMP" ]]; then
  # The pre-split interface: `--minor` on main committed the release there and pushed it.
  err "--${BUMP} now goes with --prepare, run on develop"
  echo "  The release commit no longer lands on main directly — it travels in the release-prep PR."
  echo "  1. On develop:            bash scripts/release.sh --prepare --${BUMP}"
  echo "  2. Merge the PR into main, then on main:  bash scripts/release.sh --tag"
  exit 1
fi
if [[ -z "$MODE" ]]; then
  err "Specify --prepare with a bump type, --tag, or --retry"
  usage
  exit 1
fi
if [[ "$MODE" == "prepare" && -z "$BUMP" ]]; then
  err "--prepare needs a bump type: --major, --minor or --patch"
  exit 1
fi
if [[ "$MODE" != "prepare" && -n "$BUMP" ]]; then
  err "--${MODE} is mutually exclusive with --major/--minor/--patch"
  echo "  The version was chosen at --prepare time; --${MODE} reads it rather than bumping again."
  exit 1
fi
if [[ "$MODE" != "tag" && ( "$SKIP_CI_CHECK" == true || "$SYNC_DEVELOP" == false ) ]]; then
  err "--skip-ci-check and --no-sync-develop apply to --tag only"
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

# The first content line of CHANGELOG's [Unreleased] section, or nothing. A blank line or a
# `### ` sub-heading is not content.
unreleased_content() {
  awk '
    /^## \[Unreleased\]/ { in_section=1; next }
    /^## \[/ && in_section { exit }
    in_section && NF > 0 && !/^### / { print; exit }
  ' "$1"
}

latest_tag() {
  local t
  t=$(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)
  echo "${t:-v0.0.0}"
}

CHANGELOG="CHANGELOG.md"

# ── 1. pre-flight ─────────────────────────────────────────────────────────────
heading "Pre-flight"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$MODE" == "prepare" ]]; then
  # The branches main's Branch Policy admits a PR from — the PR this run opens has to get in.
  case "$CURRENT_BRANCH" in
    develop|hotfix/*|release/*) ;;
    *)
      err "--prepare runs on develop, hotfix/* or release/* (currently on ${CURRENT_BRANCH})"
      echo "Those are the only branches main accepts a pull request from."
      exit 1 ;;
  esac
else
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    err "--${MODE} runs on main (currently on ${CURRENT_BRANCH})"
    if [[ "$MODE" == "tag" ]]; then
      echo "Prepare on develop (--prepare), merge the release-prep PR into main, then re-run on main."
    fi
    exit 1
  fi
fi
ok "On branch ${CURRENT_BRANCH}"

# Must be clean
if [[ -n "$(git status --porcelain)" ]]; then
  err "Working tree is not clean"
  git status --short
  exit 1
fi
ok "Working tree clean"

# Up to date with origin
git fetch --quiet origin "$CURRENT_BRANCH"
git fetch --quiet --tags origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/${CURRENT_BRANCH}")
if [[ "$LOCAL" != "$REMOTE" ]]; then
  err "Local ${CURRENT_BRANCH} is not in sync with origin/${CURRENT_BRANCH}"
  if git merge-base --is-ancestor "$REMOTE" "$LOCAL"; then
    # origin is an ancestor of local — local is ahead
    if [[ "$MODE" == "prepare" ]]; then
      echo "Local is ahead of origin/${CURRENT_BRANCH}. Run: git push"
    else
      echo "Local is ahead of origin/main — main only moves by pull request. Reset it to origin/main."
    fi
  elif git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
    # local is an ancestor of origin — local is behind
    echo "Local is behind origin/${CURRENT_BRANCH}. Run: git pull --rebase"
  else
    # Diverged — neither is an ancestor of the other
    echo "Local has diverged from origin/${CURRENT_BRANCH}. Reconcile manually (rebase / merge), then re-run."
  fi
  exit 1
fi
ok "Up to date with origin/${CURRENT_BRANCH}"

LATEST_TAG=$(latest_tag)

# ══ --prepare: the release commit, on develop, and the PR that carries it to main ══════════════
if [[ "$MODE" == "prepare" ]]; then
  heading "Pre-release checks"

  # Finished work that never landed. Every other check here asks whether what IS
  # on the branch is sound; none asks what is missing from it. A branch whose work
  # is complete but was never merged passes every gate in this script and every
  # lane in CI, because neither ever looks at it — and it then misses every
  # subsequent release in silence. Three such branches were found by hand at the
  # v0.51.0 cut, one of them thirteen days old and one commit from done.
  #
  # Warn, never block: a deliberately parked branch is a legitimate state, and
  # refusing to release over one would trade a visible omission for a stuck
  # pipeline. Same temperament as the catalog/bundle steps below — surface it,
  # keep going.
  info "Checking for unmerged branches ..."
  UNMERGED=$(git branch --no-merged develop --format='%(refname:short)' 2>/dev/null \
    | grep -vE "^(main|${CURRENT_BRANCH})\$" || true)
  if [[ -n "$UNMERGED" ]]; then
    warn "Branches with commits not on develop — is any of this meant to ship?"
    while IFS= read -r b; do
      [[ -z "$b" ]] && continue
      last=$(git log -1 --format='%cs' "$b" 2>/dev/null || echo '?')
      n=$(git rev-list --count "develop..$b" 2>/dev/null || echo '?')
      echo "      $b  (${n} commit(s), last ${last})"
    done <<< "$UNMERGED"
    echo "      Merge what belongs in this release, or ignore if deliberately parked."
  else
    ok "No unmerged branches"
  fi

  heading "Version"
  ok "Latest tag: ${LATEST_TAG}"
  NEXT_VERSION=$(bump_version "$LATEST_TAG" "$BUMP")
  ok "Next version: ${NEXT_VERSION}  (${BUMP} bump)"

  heading "CHANGELOG"
  TODAY=$(date +%Y-%m-%d)
  if [[ ! -f "$CHANGELOG" ]] || ! grep -q '^## \[Unreleased\]' "$CHANGELOG"; then
    err "${CHANGELOG} has no ## [Unreleased] section — nothing to release"
    exit 1
  fi
  if grep -qF "## [${NEXT_VERSION}]" "$CHANGELOG"; then
    err "${CHANGELOG} already has a [${NEXT_VERSION}] section — this release is already prepared"
    echo "  Merge its release-prep PR, then run --tag on main."
    exit 1
  fi
  # An empty section means there's nothing worth releasing.
  if [[ -z "$(unreleased_content "$CHANGELOG")" ]]; then
    err "[Unreleased] section in ${CHANGELOG} is empty"
    echo "Add entries describing what's changing, then re-run."
    exit 1
  fi
  ok "[Unreleased] has content"

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run: npm run generate-catalog, npm run bundle (committing any diff)"
    echo -e "${YELLOW}[dry-run]${NC} would replace '## [Unreleased]' with '## [${NEXT_VERSION}] - ${TODAY}' in ${CHANGELOG}"
    echo -e "${YELLOW}[dry-run]${NC} would run:"
    echo "  git commit -m 'chore(release): ${NEXT_VERSION}'"
    echo "  git push origin ${CURRENT_BRANCH}"
    echo "  gh pr create --base main --head ${CURRENT_BRANCH} --title 'Release prep — ${NEXT_VERSION}'"
  else
    info "Checking skill catalog is current ..."
    npm run generate-catalog
    if [[ -n "$(git status --porcelain docs/reference/skill-catalog.md)" ]]; then
      warn "Skill catalog was out of date — regenerated. Committing ..."
      git add docs/reference/skill-catalog.md
      git commit -m "chore(catalog): regenerate before release"
      ok "Catalog committed"
    else
      ok "Catalog up to date"
    fi

    info "Checking bundled references are current ..."
    npm run bundle
    if [[ -n "$(git status --porcelain -- skills/)" ]]; then
      warn "Bundled references were out of date — regenerated. Committing ..."
      git add skills/
      git commit -m "chore(bundle): sync references before release"
      ok "Bundle committed"
    else
      ok "Bundled references up to date"
    fi

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

    git add "$CHANGELOG"
    git commit -m "chore(release): ${NEXT_VERSION}"
    git push origin "$CURRENT_BRANCH"
    ok "Pushed ${CURRENT_BRANCH} with chore(release): ${NEXT_VERSION}"

    heading "Release-prep PR"
    PR_CREATE=(gh pr create -R "$REPO_SLUG" --base main --head "$CURRENT_BRANCH"
      --title "Release prep — ${NEXT_VERSION}"
      --body "Promoting ${CURRENT_BRANCH} to main for ${NEXT_VERSION}. After it merges: \`bash scripts/release.sh --tag\` on main.")
    PR_URL=""
    if PR_URL=$(gh pr list -R "$REPO_SLUG" --base main --head "$CURRENT_BRANCH" --state open \
        --json url --jq '.[0].url // ""') && [[ -n "$PR_URL" ]]; then
      ok "Release-prep PR already open — it now carries the release commit: ${PR_URL}"
    elif PR_URL=$("${PR_CREATE[@]}"); then
      ok "Opened ${PR_URL}"
    else
      err "Could not open the release-prep PR — the release commit is pushed, so open it by hand:"
      printf '  %q' "${PR_CREATE[@]}"; echo
      exit 1
    fi
  fi

  heading "Done"
  echo ""
  if [[ "$DRY_RUN" == true ]]; then
    warn "Dry-run — nothing written or pushed."
    echo "  Would have prepared: ${NEXT_VERSION}"
  else
    ok "Prepared ${NEXT_VERSION}"
    echo ""
    echo "  Next: merge the release-prep PR into main (a merge commit), then on main:"
    echo "    git checkout main && git pull --rebase && bash scripts/release.sh --tag"
  fi
  echo ""
  exit 0
fi

# ══ --tag / --retry: main is only ever tagged, never committed to ══════════════════════════════

# ── 1b. CI verdict for the commit being released ─────────────────────────────
# A local test run is a claim about this machine. The release is certified by the
# verdict CI recorded for this SHA — obs #150: the local suite was green through
# five consecutive red Test runs on develop (2026-09-21). It runs BEFORE the local
# test so a red CI refuses in seconds, not minutes. $LOCAL is the SHA the block
# above just proved equal to origin/main. --retry re-tags an existing release and
# keeps its own guard, so it skips this one. Pinned by tests/release-ci-gate.test.js.
if [[ "$MODE" == "tag" ]]; then
  heading "CI verdict"
  # One spawn: --tsv prints ONE line, "<reason><TAB><detail>". Fails closed on everything else:
  # empty output, a line with no TAB (a bare "green" split to "green" before this — QA cycle 4,
  # CR4-1), more than one line, an unknown reason, and a "green" whose module exit was not 0.
  CI_EXIT=0
  CI_LINE=$(command node "$(dirname "$0")/release-ci-verdict.mjs" --sha "$LOCAL" --repo "$REPO_SLUG" --tsv) || CI_EXIT=$?
  CI_REASON=""
  CI_DETAIL=""
  case "$CI_LINE" in
    "") CI_DETAIL="release-ci-verdict.mjs printed nothing (exit $CI_EXIT)" ;;
    *$'\n'*) CI_DETAIL="release-ci-verdict.mjs printed more than one line" ;;
    *$'\t'*)
      CI_REASON=${CI_LINE%%$'\t'*}
      CI_DETAIL=${CI_LINE#*$'\t'}
      case "$CI_REASON" in
        green) [[ "$CI_EXIT" -eq 0 ]] || { CI_REASON=""; CI_DETAIL="release-ci-verdict.mjs said green but exited $CI_EXIT"; } ;;
        red|pending|unverifiable) ;;
        *) CI_DETAIL="release-ci-verdict.mjs printed an unrecognised verdict: ${CI_LINE}"; CI_REASON="" ;;
      esac ;;
    *) CI_DETAIL="release-ci-verdict.mjs printed a line with no TAB: ${CI_LINE}" ;;
  esac
  [[ -n "$CI_REASON" ]] || CI_REASON="unverifiable"
  if [[ "$CI_REASON" == "green" ]]; then
    ok "CI green for ${LOCAL:0:8} — ${CI_DETAIL}"
    CI_CERTIFIED=true
  elif [[ "$SKIP_CI_CHECK" == true ]]; then
    warn "CI is ${CI_REASON} for ${LOCAL:0:8} — ${CI_DETAIL}"
    warn "Proceeding UNVERIFIED against CI (--skip-ci-check)"
  elif [[ "$DRY_RUN" == true ]]; then
    warn "CI is ${CI_REASON} for ${LOCAL:0:8} — ${CI_DETAIL}"
    warn "A real run would refuse here. Pass --skip-ci-check only if CI is confirmed another way."
    WOULD_REFUSE="CI ${CI_REASON} for ${LOCAL:0:8}"
  else
    err "CI is ${CI_REASON} for ${LOCAL:0:8} — refusing to release"
    echo "  ${CI_DETAIL}"
    if [[ "$CI_REASON" == "pending" ]]; then
      echo "  CI is still running for ${LOCAL:0:8} — re-run when it finishes."
    else
      echo "  Wait for CI to finish green, or pass --skip-ci-check if you have confirmed it another way."
    fi
    exit 1
  fi
fi

# ── 2. version: read from CHANGELOG (or resolve the retry tag) ───────────────
# Before the local test, so a release that was never prepared refuses in seconds.
heading "Version"
ok "Latest tag: ${LATEST_TAG}"

if [[ "$MODE" == "retry" ]]; then
  # Default to latest tag if no explicit tag passed
  if [[ -z "$RETRY_TAG" ]]; then
    RETRY_TAG="$LATEST_TAG"
    info "No tag passed — defaulting to latest: ${RETRY_TAG}"
  fi
  if [[ "$RETRY_TAG" == "v0.0.0" ]]; then
    err "No real tag to retry. Prepare a fresh release with --prepare."
    exit 1
  fi
  # Safety check: refuse if a published Release already exists for this tag
  info "Checking GitHub Release status for ${RETRY_TAG} ..."
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.github.com/repos/${REPO_SLUG}/releases/tags/${RETRY_TAG}")
  if [[ "$HTTP" == "200" ]]; then
    err "Release ${RETRY_TAG} is already published on GitHub — nothing to retry."
    echo "If you want to ship a new release, use --prepare."
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
  if [[ ! -f "$CHANGELOG" ]]; then
    err "CHANGELOG.md not found"
    exit 1
  fi
  NEXT_VERSION=$(grep -oE '^## \[v[0-9]+\.[0-9]+\.[0-9]+\]' "$CHANGELOG" | head -1 \
    | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || true)
  NOT_PREPARED="Run --prepare on develop and merge its release-prep PR first."
  if [[ -z "$NEXT_VERSION" ]]; then
    err "${CHANGELOG} has no [vX.Y.Z] section — this release was not prepared"
    echo "  ${NOT_PREPARED}"
    exit 1
  fi
  if [[ "$NEXT_VERSION" == "$LATEST_TAG" ]] \
    || [[ "$(printf '%s\n%s\n' "$LATEST_TAG" "$NEXT_VERSION" | sort -V | tail -1)" != "$NEXT_VERSION" ]]; then
    err "The newest CHANGELOG section is [${NEXT_VERSION}], which is not newer than ${LATEST_TAG}"
    echo "  ${NOT_PREPARED}"
    exit 1
  fi
  if git rev-parse -q --verify "refs/tags/${NEXT_VERSION}" >/dev/null \
    || [[ -n "$(git ls-remote --tags origin "refs/tags/${NEXT_VERSION}")" ]]; then
    err "Tag ${NEXT_VERSION} already exists — to re-run its release workflow use --retry ${NEXT_VERSION}"
    exit 1
  fi
  # The tag's tarball ships whatever is on main. An entry still under [Unreleased] there would
  # ship in vX.Y.Z while its CHANGELOG says otherwise — it landed on develop after --prepare.
  _late=$(unreleased_content "$CHANGELOG")
  if [[ -n "$_late" ]]; then
    err "[Unreleased] on main has entries that would ship in ${NEXT_VERSION} unlisted:"
    echo "  ${_late}"
    echo "  Move them under [${NEXT_VERSION}] on develop and promote again, then re-run."
    exit 1
  fi
  ok "Releasing: ${NEXT_VERSION}  (from ${CHANGELOG})"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would create tag ${NEXT_VERSION} and push it"
  fi
fi

# ── 3. pre-release checks (read-only: main is not committed to) ──────────────
if [[ "$MODE" == "tag" ]]; then
  heading "Pre-release checks"

  # In a clean clone of HEAD, not in place: the in-place tree carries the
  # gitignored `.agents/skills` symlink, which CI's checkout does not, so an
  # in-place green can hide a CI red (obs #149, task 154). CLEAN_CHECKOUT_CMD is
  # the runner's test hook: a value left in the shell would replace `npm test`
  # with anything at all, so the release clears it. Pinned by
  # tests/test-clean-checkout.test.js.
  info "Running npm run test:clean-checkout ..."
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run: npm run test:clean-checkout"
  else
    # A red here is either a real failure or a load-timing one; the failure text
    # says which (obs #157). Print the rule at the moment it is needed.
    # Whole-file time budgets (fileBudgetMs in spawn-budget.mjs) measure contention in a full
    # local run, not the file's speed: on 2026-10-07 two files took 10-47 s here and 7-8.5 s
    # alone, and blocked v0.53.0 four times. CI's green Test run on this SHA (step 1b) already
    # enforced them, so a certified release relaxes them. --skip-ci-check means nothing
    # enforced them, so the normal budget stays.
    GATE_ENV=(-u CLEAN_CHECKOUT_CMD)
    if [[ "$CI_CERTIFIED" == true ]]; then
      GATE_ENV+=(TEST_FILE_BUDGET_MS=600000)
    fi
    if ! env "${GATE_ENV[@]}" npm run test:clean-checkout; then
      err "npm run test:clean-checkout failed."
      echo "  If the failing assertion says LOAD-SENSITIVE, re-run that file alone"
      echo "  (command node --test <file>). If it passes alone, re-run the release —"
      echo "  do not investigate it. Anything without the marker is a real red."
      echo "  List: docs/contributing/traps.md § Load-sensitive tests"
      exit 1
    fi
  fi
  ok "Tests passed"

  info "Validating all skills ..."
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run: npm run validate:all"
  else
    npm run validate:all
  fi
  ok "Skills valid"

  # Checked, never regenerated: a regenerated file would need a commit on main, which is the
  # bypass this script no longer makes. --prepare regenerates them on develop.
  info "Checking generated files and bundled references are current ..."
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run: npm run check:generated, npm run bundle:check"
  else
    if ! npm run check:generated || ! npm run bundle:check; then
      # check:generated rewrites before it diffs; put main's tree back as pre-flight found it.
      git checkout -- .
      err "Generated files or bundled references on main are stale — refusing to tag"
      echo "  On develop: npm run generate-catalog && npm run generate-skill-deps && npm run bundle,"
      echo "  commit, promote to main again, then re-run --tag."
      exit 1
    fi
  fi
  ok "Generated files and bundled references current"
fi

# ── 4. tag + push the tag (never main) ───────────────────────────────────────
heading "Tag, push"

if [[ "$DRY_RUN" == true ]]; then
  echo -e "${YELLOW}[dry-run]${NC} would run:"
  if [[ "$MODE" == "retry" ]]; then
    echo "  git tag -d ${NEXT_VERSION}"
    echo "  git push origin :refs/tags/${NEXT_VERSION}"
  fi
  echo "  git tag -a ${NEXT_VERSION} -m 'Release ${NEXT_VERSION}'"
  echo "  git push origin refs/tags/${NEXT_VERSION}"
else
  if [[ "$MODE" == "retry" ]]; then
    # Retry path: delete + recreate + re-push the tag at current main HEAD.
    # Local delete is best-effort — the tag may already be gone
    git tag -d "${NEXT_VERSION}" 2>/dev/null || true
    git push origin ":refs/tags/${NEXT_VERSION}"
  fi
  git tag -a "${NEXT_VERSION}" -m "Release ${NEXT_VERSION}"
  git push origin "refs/tags/${NEXT_VERSION}"
  ok "Pushed tag ${NEXT_VERSION} at ${LOCAL:0:8}"
fi

# ── 5. sync develop ───────────────────────────────────────────────────────────
if [[ "$MODE" == "tag" && "$SYNC_DEVELOP" == true ]]; then
  heading "Sync develop"
  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[dry-run]${NC} would run:"
    echo "  git checkout develop"
    echo "  git pull --rebase"
    echo "  git merge main"
    echo "  git push origin develop"
    echo "  git checkout main"
  else
    git checkout develop
    git pull --rebase
    git merge main
    git push origin develop
    git checkout main
    ok "develop synced with main"
  fi
fi

# ── summary ───────────────────────────────────────────────────────────────────
heading "Done"
echo ""
if [[ "$DRY_RUN" == true ]]; then
  warn "Dry-run — nothing written or pushed."
  if [[ "$MODE" == "retry" ]]; then
    echo "  Would have retried: ${NEXT_VERSION}"
  else
    echo "  Would have released: ${NEXT_VERSION}"
    if [[ -n "$WOULD_REFUSE" ]]; then
      echo "  Would have REFUSED: ${WOULD_REFUSE} (pass --skip-ci-check to override)"
    fi
    if [[ "$SYNC_DEVELOP" == true ]]; then
      echo "  Would have synced develop with main"
    fi
  fi
else
  if [[ "$MODE" == "retry" ]]; then
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
