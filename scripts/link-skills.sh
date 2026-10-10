#!/usr/bin/env bash
# link-skills.sh — create the gitignored skill-directory symlinks in a
# contributor checkout:
#
#   .agents/skills -> ../skills
#   .claude/skills -> ../.agents/skills
#
# Run by the `prepare` npm script, so a fresh clone gets them from `npm install`.
#
# Skipped when CI is set. CI's checkout deliberately has no links: a test that
# reaches `.agents/skills/…` from the repository root must fail there, not pass
# on a link only a developer's tree carries (obs #149;
# docs/contributing/traps.md). `npm ci` runs `prepare` too, so without this
# guard CI would grow the links and hide exactly that class of failure.
#
# Never replaces anything already at a path: a correct link is left alone, and
# anything else (a directory, a file, a link elsewhere) is reported and kept.
# Always exits 0 — a missing convenience link must not fail `npm install`.
set -euo pipefail

if [[ -n "${CI:-}" ]]; then
  echo "link-skills: CI is set — skipping (CI's checkout must not carry the links)"
  exit 0
fi

cd "$(dirname "${BASH_SOURCE[0]}")/.."

link() {
  local path=$1 target=$2
  if [[ -L "$path" && "$(readlink "$path")" == "$target" ]]; then
    return 0
  fi
  if [[ -e "$path" || -L "$path" ]]; then
    echo "link-skills: $path exists and is not a link to $target — left alone" >&2
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  ln -s "$target" "$path"
  echo "link-skills: created $path -> $target"
}

link .agents/skills ../skills
link .claude/skills ../.agents/skills
