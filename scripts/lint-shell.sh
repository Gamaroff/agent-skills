#!/usr/bin/env bash
# lint-shell.sh — the local twin of .github/workflows/shellcheck.yml.
#
# Usage:
#   npm run lint:shell          # via package.json
#   bash scripts/lint-shell.sh  # directly
#
# Runs ShellCheck over the tracked shell SOURCES — `git ls-files '*.sh'` minus
# the bundled copies under skills/*/references/ — at the same severity the CI
# lane uses, with the same two guards. The file-list expression, the severity
# and the guard thresholds are copied from the workflow deliberately: this
# script exists so a contributor can run the lane before pushing, and a lane
# that lints a different set of files at a different tier predicts nothing.
# When one changes, change the other in the same commit.
#
# When the `shellcheck` binary is absent the lane is SKIPPED LOUDLY and exits 0:
# a contributor without the binary still gets every other lane of `npm run ci`,
# CI runs the pinned binary regardless, and a message nobody can miss is the
# difference between "skipped" and "silently passed". CONTRIBUTING.md documents
# the container form for hosts without a native binary.
set -euo pipefail

# Run from the repo root regardless of cwd — `git ls-files` is relative to it.
cd "$(git rev-parse --show-toplevel)"

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck not installed — lane skipped (CI runs it; container form in CONTRIBUTING.md 'Before you open a PR')"
  exit 0
fi

# SOURCES ONLY — see shellcheck.yml for why the grep must not be dropped: each
# shared script is bundled into four or five skills, so linting the copies
# reports every finding once per copy and points the fix at a file the bundler
# overwrites.
FILES=()
while IFS= read -r f; do
  FILES+=("$f")
done < <(git ls-files '*.sh' | grep -v '^skills/[^/]*/references/')

echo "linting ${#FILES[@]} source shell scripts ($(shellcheck --version | sed -n 's/^version: //p'))"

# Same assertions as the workflow, against the two most likely misconfigurations:
# the grep above widened (bundled copies leak in) or the list empty (the lane
# checked nothing and would report success).
if [ "${#FILES[@]}" -ge 200 ]; then
  echo "error: file list includes bundled copies (${#FILES[@]} files, expected well under 200)." >&2
  echo "The grep excluding 'skills/*/references/' has been dropped or widened." >&2
  exit 1
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "error: no shell scripts matched — the file list is empty, so this lane checked nothing." >&2
  exit 1
fi

if ! shellcheck --severity=warning "${FILES[@]}"; then
  echo "error: ShellCheck found warning-tier issues." >&2
  echo "A genuine false positive takes '# shellcheck disable=SCxxxx' WITH a stated reason on the same line." >&2
  exit 1
fi

echo "shellcheck: clean"
