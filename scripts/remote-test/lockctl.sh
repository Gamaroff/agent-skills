#!/usr/bin/env bash
# lockctl.sh — runs ON the test server. run.sh sends it over ssh stdin (`bash -s -- <op> ...`); it is
# never installed there. One file, so the staleness rule exists once and is testable here with a
# fake `docker` on PATH.
#
#   take    RUN_DIR TOKEN TIMEOUT_MIN OWNER_DESC   mkdir the run directory and its lock, write the owner file
#   release RUN_DIR TOKEN                          remove the lock, only if the owner file holds TOKEN
#   unlock  RUN_DIR MARGIN_MIN                     remove the lock, only if it is stale
#   prune   CURRENT_IMAGE                          remove old agent-skills-test image tags by explicit name
#
# The lock is the directory ~/RUN_DIR.lock; its `owner` file holds start (the SERVER's clock, so a
# skewed laptop cannot make a live lock look stale), the owner's own timeout_min, token and owner.
# Stale = no container of the run's name AND now > start + (timeout_min + MARGIN_MIN) minutes. An
# owner file that is missing or unreadable is never stale: a take interrupted between mkdir and the
# write leaves one, and guessing would risk removing a live run's lock.
#
# Exit codes — take: 0 taken, 10 held (owner on stdout), 11 owner write failed (lock removed),
# 12 could not create. release: 0 released or already gone, 20 held by another owner (left alone),
# 21 could not remove. unlock: 0 removed, 30 no lock, 32 not stale (live or unknown). prune: 0 done,
# 40 refused (a lock exists), 41 docker failed (nothing removed), 42 a tag could not be removed.
set -uo pipefail

op=${1:-}

now() { date +%s; }
lock_dir() { printf '%s/%s.lock' "$HOME" "$1"; }

# owner_field FILE KEY: the first value of KEY in the owner file, empty when absent or unreadable.
owner_field() { sed -n "s/^$2=//p" "$1" 2>/dev/null | head -n 1; }

# lock_state RUN_DIR MARGIN_MIN: prints live | stale | unknown.
lock_state() {
  local f start tmo c
  f="$(lock_dir "$1")/owner"
  start=$(owner_field "$f" start)
  tmo=$(owner_field "$f" timeout_min)
  case "$start" in '' | *[!0-9]*) echo unknown; return ;; esac
  case "$tmo" in '' | *[!0-9]*) echo unknown; return ;; esac
  # A failed docker call cannot tell a live run from a dead one, so it is not "stale".
  c=$(docker ps -a -q --filter "name=^/$1\$") || { echo unknown; return; }
  [ -n "$c" ] && { echo live; return; }
  if [ "$(now)" -gt $((start + (tmo + $2) * 60)) ]; then echo stale; else echo live; fi
}

# describe RUN_DIR MARGIN_MIN: the owner file, the age and the state, one key=value per line.
describe() {
  local d start
  d=$(lock_dir "$1")
  if [ -r "$d/owner" ]; then cat "$d/owner"; else echo "owner=(no owner file)"; fi
  start=$(owner_field "$d/owner" start)
  case "$start" in '' | *[!0-9]*) ;; *) echo "age_s=$(($(now) - start))" ;; esac
  echo "state=$(lock_state "$1" "$2")"
}

valid_run_dir() { [[ "$1" =~ ^agent-skills-test-[a-z0-9-]+$ ]]; }

case "$op" in
  take)
    run_dir=${2:-}; token=${3:-}; tmo=${4:-}; desc=${5:-}
    valid_run_dir "$run_dir" || { echo "bad run directory name '$run_dir'" >&2; exit 2; }
    [[ "$tmo" =~ ^[0-9]+$ ]] || { echo "bad timeout '$tmo'" >&2; exit 2; }
    mkdir -p "$HOME/$run_dir" || exit 12
    d=$(lock_dir "$run_dir")
    if mkdir "$d" 2>/dev/null; then
      if ! printf 'start=%s\ntimeout_min=%s\ntoken=%s\nowner=%s\n' "$(now)" "$tmo" "$token" "$desc" >"$d/owner"; then
        rm -rf -- "$d"
        exit 11
      fi
      exit 0
    fi
    [ -d "$d" ] || exit 12
    describe "$run_dir" "${LOCK_MARGIN_MIN:-10}"
    exit 10
    ;;
  release)
    run_dir=${2:-}; token=${3:-}
    valid_run_dir "$run_dir" || { echo "bad run directory name '$run_dir'" >&2; exit 2; }
    d=$(lock_dir "$run_dir")
    [ -d "$d" ] || exit 0
    held=$(owner_field "$d/owner" token)
    if [ -z "$token" ] || [ "$held" != "$token" ]; then
      echo "the lock $d is held by another owner; left in place"
      exit 20
    fi
    rm -rf -- "$d" || exit 21
    exit 0
    ;;
  unlock)
    run_dir=${2:-}; margin=${3:-}
    valid_run_dir "$run_dir" || { echo "bad run directory name '$run_dir'" >&2; exit 2; }
    [[ "$margin" =~ ^[0-9]+$ ]] || { echo "bad margin '$margin'" >&2; exit 2; }
    d=$(lock_dir "$run_dir")
    [ -d "$d" ] || { echo "no lock at $d"; exit 30; }
    state=$(lock_state "$run_dir" "$margin")
    describe "$run_dir" "$margin"
    if [ "$state" = stale ]; then
      rm -rf -- "$d" || exit 21
      echo "removed the stale lock $d"
      exit 0
    fi
    echo "not removed: the lock is $state (a run in its sync or build phase has no container yet, so only an expired lock is removed)"
    exit 32
    ;;
  prune)
    current=${2:-}
    [[ "$current" =~ ^agent-skills-test:[A-Za-z0-9._-]+$ ]] || { echo "bad image '$current'" >&2; exit 2; }
    locks=$(find "$HOME" -maxdepth 1 -type d -name 'agent-skills-test-*.lock' -print)
    if [ -n "$locks" ]; then
      echo "not pruning: a run holds a lock, and a run that has built its image but not yet started its container is not visible to docker:"
      printf '%s\n' "$locks"
      exit 40
    fi
    running=$(docker ps --format '{{.Image}}') || { echo "docker ps failed: not pruning, a tag in use could not be told from an old one" >&2; exit 41; }
    images=$(docker images --format '{{.Repository}}:{{.Tag}}' agent-skills-test) || { echo "docker images failed: not pruning" >&2; exit 41; }
    failed=0
    while IFS= read -r tag; do
      [ -n "$tag" ] || continue
      case "$tag" in
        agent-skills-test:'<none>') echo "skipped (untagged): $tag"; continue ;;
        agent-skills-test:*) ;;
        *) continue ;;
      esac
      if [ "$tag" = "$current" ]; then echo "kept (current): $tag"; continue; fi
      case $'\n'"$running"$'\n' in
        *$'\n'"$tag"$'\n'*) echo "kept (in use): $tag"; continue ;;
      esac
      if docker rmi "$tag" >/dev/null; then echo "removed: $tag"; else echo "could not remove: $tag" >&2; failed=1; fi
    done <<<"$images"
    [ "$failed" -eq 0 ] || exit 42
    exit 0
    ;;
  *)
    echo "usage: lockctl.sh take|release|unlock|prune ..." >&2
    exit 2
    ;;
esac
