#!/usr/bin/env bash
# task.229.qa.1.security.setup.sh <fixture-dir> — the --fixture-setup for the QA cycle 1 probe of
# scripts/lint-secrets.sh under security-probe's shell-argv: entry form.
#
# Builds, inside <fixture-dir> (the probe's cwd), a git repository with one clean committed file,
# then applies the plant spec the case's fixture wrote to ./PLANT — one `<mode>:<path>` per line:
#
#   tracked:<path>    a token in a committed file
#   staged:<path>     a token in a file that is staged but not committed
#   untracked:<path>  a token in a file git does not track (must not be scanned)
#   deleted:<path>    a token committed, then the file removed from the working tree
#   allow:<path>      a committed token whose line carries gitleaks:allow
#   message:<label>   a token in the message of a second commit (the case sets SECRET_SCAN_RANGE)
#
# The token is generated here, at run time, so no secret-shaped value is ever committed — the
# lane under test would flag a cases file that carried one. Shape: the script's own self-check
# plant. The sandbox HOME has no git identity, so every commit states one.
set -euo pipefail

cd "${1:?usage: task.229.qa.1.security.setup.sh <fixture-dir>}"
g() { git -c user.email=probe@example.invalid -c user.name=probe -c commit.gpgsign=false "$@"; }
# gitleaks' generic-api-key rule misses about 1 in 100 random values of this shape (3/300 measured
# in QA cycle 1), so a hostile case planted with an unlucky value would read as a pass. Keep only a
# value the scanner is shown to catch, so a case measures the script, not the draw.
token() {
  # A leak exits 99, never 1: gitleaks exits 1 on its own errors, which must not
  # read as a caught value (the script's own LEAK_RC rule).
  local t rc
  for _ in 1 2 3 4 5 6 7 8; do
    t=$(head -c 24 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=')
    rc=0
    printf "const api_key = '%s';\n" "$t" | gitleaks stdin --no-banner --exit-code 99 --log-level error >/dev/null 2>&1 || rc=$?
    if [ "$rc" -eq 99 ]; then
      printf '%s' "$t"
      return 0
    fi
  done
  echo "setup: no catchable token in 8 draws" >&2
  return 1
}

spec=""
if [ -f PLANT ]; then
  spec=$(cat PLANT)
  rm -f PLANT
fi

g init -q
echo "export const greeting = 'hello';" > clean.ts
g add -A
g commit -qm base

while IFS= read -r line; do
  [ -n "$line" ] || continue
  mode=${line%%:*}
  path=${line#*:}
  case "$mode" in
    tracked|deleted)
      mkdir -p -- "$(dirname -- "$path")"
      printf "const api_key = '%s';\n" "$(token)" > "$path"
      g add -- "$path"
      g commit -qm "add $mode"
      if [ "$mode" = deleted ]; then rm -f -- "$path"; fi
      ;;
    staged)
      mkdir -p -- "$(dirname -- "$path")"
      printf "const api_key = '%s';\n" "$(token)" > "$path"
      g add -- "$path"
      ;;
    untracked)
      mkdir -p -- "$(dirname -- "$path")"
      printf "const api_key = '%s';\n" "$(token)" > "$path"
      ;;
    allow)
      mkdir -p -- "$(dirname -- "$path")"
      printf "const api_key = '%s'; // gitleaks:allow probe fixture\n" "$(token)" > "$path"
      g add -- "$path"
      g commit -qm "add allowed"
      ;;
    message)
      echo "x" > note.txt
      g add note.txt
      g commit -qm "$(printf "chore: %s\n\nconst api_key = '%s';" "$path" "$(token)")"
      ;;
    *)
      echo "setup: unknown plant mode '$mode'" >&2
      exit 1
      ;;
  esac
done <<< "$spec"
