#!/usr/bin/env bash
# run.sh — run root npm scripts on the shared LAN server instead of this machine.
#
# Usage (via package.json):
#   npm run test:remote                          # ci:fast on the server
#   npm run test:remote -- --run eval:all        # any root script; --run repeats
#   TEST_LOCAL=1 npm run test:remote             # the same scripts, on this machine
#   npm run test:remote -- --reap 7              # remove stale per-branch directories (days)
#   npm run test:remote -- --unlock              # remove this branch's lock, only when it is stale
#   npm run test:remote -- --prune-images        # remove old agent-skills-test image tags
#
# Options: --run SCRIPT   --host USER@HOST   --timeout-min N   --reap DAYS   --unlock
#          --prune-images   -h|--help
# Environment: TEST_REMOTE_HOST (default ci@192.168.1.249), TEST_REMOTE_TIMEOUT_MIN (default 30),
#              TEST_REMOTE_LOCK_MARGIN_MIN (default 10), TEST_LOCAL=1 (run here; the only way to
#              run locally).
#
# A run takes a lock on the server (~/<run dir>.lock) before it syncs, so two runs on one branch
# cannot overlap. A lock whose run died is stale once its run's timeout plus the margin has passed;
# a run refuses and names --unlock, which removes only a stale lock.
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
UNLOCK=0
PRUNE_IMAGES=0
LOCK_MARGIN_MIN="${TEST_REMOTE_LOCK_MARGIN_MIN:-10}"

usage_error() {
  echo "✗ $1" >&2
  echo "  usage: test:remote [--run SCRIPT]... [--host USER@HOST] [--timeout-min N] [--reap DAYS | --unlock | --prune-images]" >&2
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
    --unlock)
      UNLOCK=1
      shift
      ;;
    --prune-images)
      PRUNE_IMAGES=1
      shift
      ;;
    -h | --help)
      # The header is every comment line after the shebang, up to the first line that is not one.
      awk 'NR > 1 { if ($0 !~ /^#/) exit; print }' "${BASH_SOURCE[0]}"
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
[[ "$LOCK_MARGIN_MIN" =~ ^[0-9]{1,4}$ ]] || usage_error "TEST_REMOTE_LOCK_MARGIN_MIN '$LOCK_MARGIN_MIN' must be a whole number of minutes (0 to 9999)"
LOCK_MARGIN_MIN=$((10#$LOCK_MARGIN_MIN))

# --unlock and --prune-images each stand alone: with each other, with --reap and with --run. (--reap
# with --run is as it always was: the reap runs and the scripts are ignored.)
MODES=0
[ "$UNLOCK" = 1 ] && MODES=$((MODES + 1))
[ "$PRUNE_IMAGES" = 1 ] && MODES=$((MODES + 1))
if [ "$MODES" -gt 0 ]; then
  [ "$MODES" -eq 1 ] || usage_error "--unlock and --prune-images cannot be combined"
  [ -z "$REAP_DAYS" ] || usage_error "--unlock and --prune-images cannot be combined with --reap"
  [ "${#SCRIPTS[@]}" -eq 0 ] || usage_error "--unlock and --prune-images cannot be combined with --run"
fi

[ "${#SCRIPTS[@]}" -gt 0 ] || SCRIPTS=("ci:fast")

# The current image tag names the Dockerfile's content, so a changed Dockerfile builds a new tag.
IMAGE="agent-skills-test:$(sha256sum "$REPO_ROOT/scripts/remote-test/Dockerfile" | cut -c1-12)"
LOCKCTL="$REPO_ROOT/scripts/remote-test/lockctl.sh"

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
  # at start, because `rsync -a` copies the local repo root's mtime onto it. A `*.lock` directory is
  # never reaped: it is a run's live record, and only --unlock removes a stale one.
  ssh -o BatchMode=yes "$HOST" bash -s -- "$REAP_DAYS" <<'REAP_SCRIPT'
days=$1
running=$(docker ps --format '{{.Names}}') || { echo "docker ps failed: not reaping, a live run could not be told from a stale directory" >&2; exit 1; }
find "$HOME" -maxdepth 1 -type d -name 'agent-skills-test-*' ! -name '*.lock' -mtime +"$days" -print | while IFS= read -r d; do
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

# --- --unlock and --prune-images: one lockctl call on the server, then done --------------------
# lockctl.sh travels on ssh stdin (`bash -s -- <op> ...`). Its exit codes are listed in its header.
if [ "$UNLOCK" = 1 ]; then
  echo "▶ $HOST:~/$RUN_DIR.lock  --unlock (a margin of ${LOCK_MARGIN_MIN}m after the owner's own timeout)"
  ssh -o BatchMode=yes "$HOST" bash -s -- unlock "$RUN_DIR" "$LOCK_MARGIN_MIN" <"$LOCKCTL"
  STATUS=$?
  case "$STATUS" in
    0) ;;
    30) echo "  nothing to unlock for this branch." >&2 ;;
    32) echo "✗ the lock was not removed. A live run's lock is never removed; wait for it, or if its owner file is missing remove it by hand: ssh $HOST rm -rf '~/$RUN_DIR.lock'" >&2 ;;
    *) echo "✗ --unlock failed (status $STATUS)" >&2 ;;
  esac
  exit "$STATUS"
fi
if [ "$PRUNE_IMAGES" = 1 ]; then
  echo "▶ $HOST: removing agent-skills-test image tags other than $IMAGE and those a running container uses"
  ssh -o BatchMode=yes "$HOST" bash -s -- prune "$IMAGE" <"$LOCKCTL"
  STATUS=$?
  exit "$STATUS"
fi

echo "▶ $HOST:~/$RUN_DIR  scripts: ${SCRIPTS[*]}  (timeout ${TIMEOUT_MIN}m)"

# Two layers keep two runs off one branch. The lock (taken below, before the sync) is the one that
# covers the whole window; this container-name check is the second layer. The container is named
# after the run directory, so a container of that name means a run is executing in it, or one was
# left behind by a crash, and the sync is refused: `rsync --delete` would rewrite the tree under it.
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

# --- the lock: taken before the sync, released by one cleanup on every exit path ----------------
# The take also creates the run directory. It returns its own verdict by exit status, in this one
# call: 0 taken, 10 held (the owner on stdout), 11 the owner file could not be written, 12 the
# directory could not be created; anything else (255: ssh failed) is "could not take the lock",
# which is neither "held" nor "free".
EXCLUDES=""
LOCK_TOKEN="$(hostname -s 2>/dev/null | tr -c 'A-Za-z0-9._-' '-')-$$-$(date +%s)"
LOCK_HELD=0
RUN_STARTED=0
SIGNALLED=0

release_lock() {
  [ "$LOCK_HELD" = 1 ] || return 0
  LOCK_HELD=0
  local out rc
  out=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" bash -s -- release "$RUN_DIR" "$LOCK_TOKEN" <"$LOCKCTL" 2>&1)
  rc=$?
  if [ "$rc" -ne 0 ]; then
    # Reported, never swallowed, but the run's exit status is left alone: a green run is not turned
    # red by a leaked lock, which goes stale and is cleared by --unlock.
    {
      echo "⚠ could not release the lock ~/$RUN_DIR.lock on $HOST (status $rc)${out:+: $out}"
      echo "  It goes stale after the run's timeout plus ${LOCK_MARGIN_MIN}m; clear it with: npm run test:remote -- --unlock"
    } >&2
  fi
  return 0
}

kill_remote_container() {
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "docker kill $RUN_DIR" >/dev/null 2>&1 || true
}

# One cleanup, installed once: a second `trap` on the same signal replaces the first. It runs after a
# normal exit, a failure and Ctrl-C or a TERM (the signal handler below turns those into `exit 130`).
cleanup() {
  [ -z "$EXCLUDES" ] || rm -f "$EXCLUDES"
  if [ "$SIGNALLED" = 1 ] && [ "$RUN_STARTED" = 1 ]; then kill_remote_container; fi
  release_lock
}

# Every argument is one word: ssh joins its arguments with spaces and the server's shell splits them
# again, so a space in the owner description would shift the arguments after it.
LOCK_OUT=$(ssh -o BatchMode=yes "$HOST" bash -s -- take "$RUN_DIR" "$LOCK_TOKEN" "$TIMEOUT_MIN" "$(hostname -s 2>/dev/null | tr -c 'A-Za-z0-9._-' '-')/pid-$$" "$LOCK_MARGIN_MIN" <"$LOCKCTL")
LOCK_STATUS=$?
case "$LOCK_STATUS" in
  0) ;;
  10)
    # Parsed here, never printed raw: the owner file is the other run's data.
    LOCK_AGE=$(printf '%s\n' "$LOCK_OUT" | sed -n 's/^age_s=//p' | head -n 1)
    LOCK_STATE=$(printf '%s\n' "$LOCK_OUT" | sed -n 's/^state=//p' | head -n 1)
    LOCK_WHO=$(printf '%s\n' "$LOCK_OUT" | sed -n 's/^owner=//p' | head -n 1)
    LOCK_AGE_TXT=unknown
    [[ "$LOCK_AGE" =~ ^[0-9]+$ ]] && LOCK_AGE_TXT="$((LOCK_AGE / 60))m"
    {
      echo "✗ another run holds the lock ~/$RUN_DIR.lock on $HOST: owner ${LOCK_WHO:-unknown}, age $LOCK_AGE_TXT."
      if [ "$LOCK_STATE" = stale ]; then
        echo "  Its run is gone (no container, past its timeout plus ${LOCK_MARGIN_MIN}m). Clear it with: npm run test:remote -- --unlock"
      else
        echo "  Wait for it to finish. A lock whose run died becomes stale after that run's timeout plus ${LOCK_MARGIN_MIN}m; then --unlock clears it."
      fi
    } >&2
    exit 1
    ;;
  11) echo "✗ took the lock on $HOST but could not write its owner file; the lock was removed. Retry." >&2; exit 1 ;;
  12) echo "✗ could not create ~/$RUN_DIR on $HOST" >&2; exit 1 ;;
  *) echo "✗ could not take the lock on $HOST (status $LOCK_STATUS); not a held lock, the server did not answer as expected" >&2; exit 1 ;;
esac
# Armed only now: a run refused above never reaches this line, so it can never release another
# run's lock.
LOCK_HELD=1
trap cleanup EXIT
trap 'SIGNALLED=1; exit 130' INT TERM

# --- sync: the tree as git sees it ------------------------------------------------------------
# `--files-from` does not delete stale remote files, so the tree is synced with --delete and an
# exclude list built from git's own ignore rules. A plain --exclude (never --delete-excluded)
# protects the remote node_modules and its lockfile hash from --delete.
EXCLUDES=$(mktemp)
# Each path is anchored with a leading `/`: git prints paths relative to the root, and an unanchored
# rsync pattern matches at ANY depth, so `.claude/state/` also dropped the tracked eval fixture
# evals/**/replay/.claude/state/ and the 01-create-branch replay went red on the server only.
git -C "$REPO_ROOT" ls-files -z --others --ignored --exclude-standard --directory | tr '\0' '\n' | sed 's#^#/#' >"$EXCLUDES"


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

RUN_STARTED=1
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
