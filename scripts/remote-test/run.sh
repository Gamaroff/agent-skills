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
      # An option with no value would make `shift 2` fail and the loop spin forever.
      [ $# -ge 2 ] || usage_error "--host needs a USER@HOST value"
      HOST="$2"
      shift 2
      ;;
    --timeout-min)
      [ $# -ge 2 ] || usage_error "--timeout-min needs a number of minutes"
      TIMEOUT_MIN="$2"
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
# At most four digits, and base 10: a leading zero ("08") is invalid octal to bash arithmetic.
[[ "$TIMEOUT_MIN" =~ ^[0-9]{1,4}$ && "$((10#$TIMEOUT_MIN))" -gt 0 ]] || usage_error "timeout '$TIMEOUT_MIN' must be a positive whole number of minutes (1 to 9999)"
TIMEOUT_MIN=$((10#$TIMEOUT_MIN))

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
  # A directory with a running container of the same name is skipped. A run touches its directory
  # at start, because `rsync -a` copies the local repo root's mtime onto it.
  ssh -o BatchMode=yes "$HOST" bash -s -- "$REAP_DAYS" <<'REAP_SCRIPT'
days=$1
running=$(docker ps --format '{{.Names}}') || { echo "docker ps failed: not reaping, a live run could not be told from a stale directory" >&2; exit 1; }
find "$HOME" -maxdepth 1 -type d -name 'agent-skills-test-*' -mtime +"$days" -print | while IFS= read -r d; do
  case $'\n'"$running"$'\n' in
    *$'\n'"${d##*/}"$'\n'*) echo "skipped (a container is running): $d"; continue ;;
  esac
  echo "$d"
  rm -rf -- "$d"
done
REAP_SCRIPT
  STATUS=$?
  exit "$STATUS"
fi

# --- per-branch directory ---------------------------------------------------------------------
# The key is a readable slug plus a hash of the full identity, so "feature/foo" and "feature-foo",
# or two long names with one 50-character prefix, never share a directory. A detached HEAD prints
# the literal "HEAD" with exit 0, so it is keyed on the commit instead.
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)
if [ "$BRANCH" = "HEAD" ] || [ "$BRANCH" = "detached" ]; then
  BRANCH="detached-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo unknown)"
fi
SLUG=$(printf '%s' "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40)
BRANCH_HASH=$(printf '%s' "$BRANCH" | sha256sum | cut -c1-8)
RUN_DIR="agent-skills-test-${SLUG:-run}-${BRANCH_HASH}"

echo "▶ $HOST:~/$RUN_DIR  scripts: ${SCRIPTS[*]}  (timeout ${TIMEOUT_MIN}m)"

# A best-effort guard, not a lock. The container is named after the run directory, and a container
# of that name means a run is executing in it (or one was left behind), so the sync is refused
# here: `rsync --delete` would rewrite the tree under it. The guard has a window that lasts from
# this check until the container exists: the whole sync and, on first use, the image build, so
# minutes. A second run started inside it is not stopped; the run that reaches `docker run` second
# fails on the name, and its sync may already have rewritten the tree under the first run. A per-run
# lock (an atomic mkdir on the run directory) is listed in the task's Future Improvements.
EXISTING=$(ssh -o BatchMode=yes "$HOST" "docker ps -a -q --filter name=^/${RUN_DIR}\$") || {
  echo "✗ could not check $HOST for a running or stale container named $RUN_DIR" >&2
  exit 1
}
if [ -n "$EXISTING" ]; then
  {
    echo "✗ a container named $RUN_DIR already exists on $HOST: another run is using ~/$RUN_DIR, or one was left behind."
    echo "  Wait for it, or remove a stale one with: ssh $HOST docker rm -f $RUN_DIR"
  } >&2
  exit 1
fi
echo "▶ server load before the run:"
ssh -o BatchMode=yes "$HOST" 'uptime; docker ps --format "  {{.Names}} {{.Status}}"'

# --- sync: the tree as git sees it ------------------------------------------------------------
# `--files-from` does not delete stale remote files, so the tree is synced with --delete and an
# exclude list built from git's own ignore rules. A plain --exclude (never --delete-excluded)
# protects the remote node_modules and its lockfile hash from --delete.
EXCLUDES=$(mktemp)
trap 'rm -f "$EXCLUDES"' EXIT
# Each path is anchored with a leading `/`: git prints paths relative to the root, and an unanchored
# rsync pattern matches at ANY depth, so `.claude/state/` also dropped the tracked eval fixture
# evals/**/replay/.claude/state/ and the 01-create-branch replay went red on the server only.
git -C "$REPO_ROOT" ls-files -z --others --ignored --exclude-standard --directory | tr '\0' '\n' | sed 's#^#/#' >"$EXCLUDES"

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

# .git travels separately, so the history-backed replay test runs.
if [ -d "$REPO_ROOT/.git" ]; then
  rsync -a --delete "$REPO_ROOT/.git/" "$HOST:$RUN_DIR/.git/" || {
    echo "✗ rsync of .git failed" >&2
    exit 1
  }
elif [ -f "$REPO_ROOT/.git" ]; then
  # A linked worktree: .git is a file ("gitdir: <common>/worktrees/<name>"), so there is nothing to
  # sync under that name, and the server's `npm ci` then ran `prepare` (`git config core.hooksPath`)
  # in a tree with no .git, which exits 128. The server gets a real .git instead: the repository's
  # common git directory, which holds the objects and refs, with the two files that are per worktree
  # laid over it. The common directory's own HEAD and index belong to the main checkout, so a copy
  # of it alone would read the wrong commit. `worktrees/` is left out: it is the other worktrees'
  # administrative state, and nothing on the server needs it.
  WT_GIT_DIR=$(git -C "$REPO_ROOT" rev-parse --absolute-git-dir 2>/dev/null) || WT_GIT_DIR=""
  COMMON_REL=$(git -C "$REPO_ROOT" rev-parse --git-common-dir 2>/dev/null) || COMMON_REL=""
  # --git-common-dir prints a path relative to the directory git ran in when it is not absolute.
  GIT_COMMON=""
  if [ -n "$COMMON_REL" ]; then
    case "$COMMON_REL" in
      /*) GIT_COMMON=$(cd "$COMMON_REL" 2>/dev/null && pwd -P) ;;
      *) GIT_COMMON=$(cd "$REPO_ROOT/$COMMON_REL" 2>/dev/null && pwd -P) ;;
    esac
  fi
  if [ -z "$WT_GIT_DIR" ] || [ ! -f "$WT_GIT_DIR/HEAD" ] || [ -z "$GIT_COMMON" ] || [ ! -d "$GIT_COMMON/objects" ]; then
    echo "✗ $REPO_ROOT/.git is a file (a linked worktree) but its git directories could not be resolved; not syncing" >&2
    exit 1
  fi
  rsync -a --delete --exclude=/worktrees/ --exclude=/HEAD --exclude=/index \
    "$GIT_COMMON/" "$HOST:$RUN_DIR/.git/" || {
    echo "✗ rsync of the common git directory failed" >&2
    exit 1
  }
  # A new worktree has an index once its checkout finishes; a half-made one has none yet.
  WT_FILES=("$WT_GIT_DIR/HEAD")
  [ -f "$WT_GIT_DIR/index" ] && WT_FILES+=("$WT_GIT_DIR/index")
  rsync -a "${WT_FILES[@]}" "$HOST:$RUN_DIR/.git/" || {
    echo "✗ rsync of the worktree's HEAD and index failed" >&2
    exit 1
  }
  echo "▶ linked worktree: synced the common git directory with this worktree's HEAD and index"
else
  echo "⚠ $REPO_ROOT has no .git: history is not synced, so history-backed tests may fail or skip remotely."
fi

# --- image: built on the server on first use, tagged by a hash of the Dockerfile --------------
IMAGE="agent-skills-test:$(sha256sum "$REPO_ROOT/scripts/remote-test/Dockerfile" | cut -c1-12)"
ssh -o BatchMode=yes "$HOST" "touch \"\$HOME/$RUN_DIR\" && { docker image inspect $IMAGE >/dev/null 2>&1 || docker build -q -t $IMAGE \"\$HOME/$RUN_DIR/scripts/remote-test\" >/dev/null; }" || {
  echo "✗ could not build the test image $IMAGE on $HOST" >&2
  exit 1
}

# --- run --------------------------------------------------------------------------------------
# Only validated script names, the sanitised directory slug and a hex tag are spliced below.
#
# The bound is enforced on the server, in the container: `timeout` runs the scripts there (and
# kills their process group), `--init` reaps what they leave behind, and the container is named
# after the run directory. The name backs the guard above: a second run on the same directory is
# refused before its sync when the container exists, and fails here on the name otherwise. The local
# `timeout` below is a backstop one minute later: it only stops the ssh client, so on expiry, a
# dropped session (255) or Ctrl-C the named container is killed explicitly.
REMOTE_CMD="cd \"\$HOME/$RUN_DIR\" && touch . && docker run --rm --init --name $RUN_DIR --user \"\$(id -u):\$(id -g)\" --cpu-shares 128 -v \"\$PWD:/work\" -w /work -e HOME=/home/node -e CI=true -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' $IMAGE timeout -k 30s ${TIMEOUT_MIN}m bash scripts/remote-test/container.sh ${SCRIPTS[*]}"

kill_remote_container() {
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "docker kill $RUN_DIR" >/dev/null 2>&1 || true
}
trap 'kill_remote_container; rm -f "$EXCLUDES"; exit 130' INT TERM

timeout --foreground -k 1m "$((TIMEOUT_MIN + 1))m" ssh -o BatchMode=yes "$HOST" "$REMOTE_CMD"
STATUS=$?
# 124 and 137 are the limit or a kill, 255 is a dropped ssh session; none of them says the remote
# container stopped. 125 (docker could not start it, e.g. the name is taken) is left alone: the
# container by that name belongs to another run.
if [ "$STATUS" -eq 124 ] || [ "$STATUS" -eq 137 ] || [ "$STATUS" -eq 255 ]; then
  echo "✗ the run ended with status $STATUS (its ${TIMEOUT_MIN}-minute limit, a kill, or a dropped ssh session); stopping container $RUN_DIR on $HOST" >&2
  kill_remote_container
fi
exit "$STATUS"
