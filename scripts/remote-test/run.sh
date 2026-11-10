#!/usr/bin/env bash
# run.sh — run root npm scripts on the shared LAN server instead of this machine.
#
# Usage (via package.json):
#   npm run test:remote                          # ci:fast on the server
#   npm run test:remote -- --run eval:all        # any root script; --run repeats
#   TEST_LOCAL=1 npm run test:remote             # the same scripts, on this machine
#   npm run test:remote -- --reap 7              # remove stale per-branch directories (days)
#
# Options: --run SCRIPT   --host USER@HOST   --timeout-min N   --reap DAYS   -h|--help
# Environment: TEST_REMOTE_HOST (default ci@192.168.1.249), TEST_REMOTE_TIMEOUT_MIN (default 30),
#              TEST_LOCAL=1 (run here; the only way to run locally).
#
# Exit status is the run's own: 0 green, the failing script's code on red, 2 on a usage error,
# 1 when the server is unreachable (never a silent fall back to local), 124 on the timeout.
#
# The server is shared and also a gaming PC. The container runs at a low CPU weight, every path
# stays under the SSH user's home, and nothing is pruned globally.
#
# STATUS is captured on the line after the ssh call. Never put a trailing `echo`, an `|| true`,
# a pipe into tail or grep, or a `&&` chain in a case arm between the run and the final exit.
set -uo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
# shellcheck source=scripts/remote-test/server-lib.sh
source "$REPO_ROOT/scripts/remote-test/server-lib.sh"

HOST="${TEST_REMOTE_HOST:-ci@192.168.1.249}"
TIMEOUT_MIN="${TEST_REMOTE_TIMEOUT_MIN:-30}"
SCRIPTS=()
REAP_DAYS=""

usage_error() {
  echo "✗ $1" >&2
  echo "  usage: test:remote [--run SCRIPT]... [--host USER@HOST] [--timeout-min N] [--reap DAYS]" >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      # The name is spliced into a remote shell command, so only a plain script name passes.
      [[ "${2:-}" =~ ^[A-Za-z0-9:._-]+$ ]] || usage_error "--run needs an npm script name, got '${2:-}'"
      [[ "$2" != -* ]] || usage_error "--run name must not start with '-', got '$2'"
      SCRIPTS+=("$2")
      shift 2
      ;;
    --host)
      HOST="${2:-}"
      shift 2
      ;;
    --timeout-min)
      TIMEOUT_MIN="${2:-}"
      shift 2
      ;;
    --reap)
      REAP_DAYS="${2:-}"
      [[ "$REAP_DAYS" =~ ^[0-9]+$ ]] || usage_error "--reap needs a whole number of days, got '$REAP_DAYS'"
      shift 2
      ;;
    -h | --help)
      sed -n '2,19p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *)
      usage_error "unknown argument '$1'"
      ;;
  esac
done

[[ "$HOST" =~ ^[A-Za-z0-9._@:-]+$ && "$HOST" != -* ]] || usage_error "host '$HOST' is not a plain USER@HOST"
[[ "$TIMEOUT_MIN" =~ ^[0-9]+$ && "$TIMEOUT_MIN" -gt 0 ]] || usage_error "timeout '$TIMEOUT_MIN' must be a positive whole number of minutes"

[ "${#SCRIPTS[@]}" -gt 0 ] || SCRIPTS=("ci:fast")

# --- local escape ---------------------------------------------------------------------------
if [ "${TEST_LOCAL:-}" = "1" ]; then
  echo "▶ TEST_LOCAL=1: running on this machine: ${SCRIPTS[*]}"
  cd "$REPO_ROOT" || exit 1
  for s in "${SCRIPTS[@]}"; do
    npm run "$s"
    STATUS=$?
    if [ "$STATUS" -ne 0 ]; then
      echo "✗ npm run $s failed (exit $STATUS)" >&2
      exit "$STATUS"
    fi
  done
  exit 0
fi

# --- reachability: loud, never a silent fall back ---------------------------------------------
if ! server_ready "$HOST" rsync; then
  {
    echo "✗ test server $HOST is unreachable, or lacks rsync or a working docker."
    echo "  Not running locally. Set TEST_LOCAL=1 to run on this machine, or TEST_REMOTE_HOST to use another server."
  } >&2
  exit 1
fi

# --- reap -------------------------------------------------------------------------------------
if [ -n "$REAP_DAYS" ]; then
  echo "▶ removing agent-skills-test-* directories under $HOST:~ untouched for $REAP_DAYS day(s)"
  ssh -o BatchMode=yes "$HOST" "find \"\$HOME\" -maxdepth 1 -type d -name 'agent-skills-test-*' -mtime +$REAP_DAYS -print -exec rm -rf {} +"
  STATUS=$?
  exit "$STATUS"
fi

# --- per-branch directory ---------------------------------------------------------------------
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)
SLUG=$(printf '%s' "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-50)
RUN_DIR="agent-skills-test-${SLUG:-detached}"

echo "▶ $HOST:~/$RUN_DIR  scripts: ${SCRIPTS[*]}  (timeout ${TIMEOUT_MIN}m)"
echo "▶ server load before the run:"
ssh -o BatchMode=yes "$HOST" 'uptime; docker ps --format "  {{.Names}} {{.Status}}"'

# --- sync: the tree as git sees it ------------------------------------------------------------
# `--files-from` does not delete stale remote files, so the tree is synced with --delete and an
# exclude list built from git's own ignore rules. A plain --exclude (never --delete-excluded)
# protects the remote node_modules and its lockfile hash from --delete.
EXCLUDES=$(mktemp)
trap 'rm -f "$EXCLUDES"' EXIT
git -C "$REPO_ROOT" ls-files -z --others --ignored --exclude-standard --directory | tr '\0' '\n' >"$EXCLUDES"

ssh -o BatchMode=yes "$HOST" "mkdir -p \"\$HOME/$RUN_DIR\"" || {
  echo "✗ could not create ~/$RUN_DIR on $HOST" >&2
  exit 1
}

rsync -a --delete --exclude-from="$EXCLUDES" \
  --exclude=/.git --exclude=/.env --exclude=/.secrets/ --exclude=node_modules/ \
  "$REPO_ROOT/" "$HOST:$RUN_DIR/" || {
  echo "✗ rsync of the working tree failed" >&2
  exit 1
}

# .git travels separately, so the history-backed replay test runs. In a linked worktree .git is a
# file pointing outside the tree, so it cannot be synced.
if [ -d "$REPO_ROOT/.git" ]; then
  rsync -a --delete "$REPO_ROOT/.git/" "$HOST:$RUN_DIR/.git/" || {
    echo "✗ rsync of .git failed" >&2
    exit 1
  }
else
  echo "⚠ .git is not a directory here (linked worktree): history is not synced, so history-backed tests may fail or skip remotely."
fi

# --- image: built on the server on first use, tagged by a hash of the Dockerfile --------------
IMAGE="agent-skills-test:$(sha256sum "$REPO_ROOT/scripts/remote-test/Dockerfile" | cut -c1-12)"
ssh -o BatchMode=yes "$HOST" "docker image inspect $IMAGE >/dev/null 2>&1 || docker build -q -t $IMAGE \"\$HOME/$RUN_DIR/scripts/remote-test\" >/dev/null" || {
  echo "✗ could not build the test image $IMAGE on $HOST" >&2
  exit 1
}

# --- run --------------------------------------------------------------------------------------
# Only validated script names, the sanitised directory slug and a hex tag are spliced below.
REMOTE_CMD="cd \"\$HOME/$RUN_DIR\" && docker run --rm --user \"\$(id -u):\$(id -g)\" --cpu-shares 128 -v \"\$PWD:/work\" -w /work -e HOME=/home/node -e CI=true -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' $IMAGE bash scripts/remote-test/container.sh ${SCRIPTS[*]}"

timeout --foreground -k 1m "${TIMEOUT_MIN}m" ssh -o BatchMode=yes "$HOST" "$REMOTE_CMD"
STATUS=$?
exit "$STATUS"
