#!/usr/bin/env bash
# lint-secrets.sh — the local twin of .github/workflows/secret-scan.yml (task 229).
#
# Usage:
#   npm run lint:secrets          # via package.json, part of `npm run ci`
#   bash scripts/lint-secrets.sh  # directly
#
# Runs gitleaks over the TRACKED files and over the PR's own text (its commit
# messages and, in CI, its body). The workflow's scan step calls this script, so
# the file set is defined once, here — there is no second copy to keep in step.
#
# When the `gitleaks` binary is absent the lane is SKIPPED LOUDLY and exits 0,
# as lint-shell.sh does for shellcheck: CI installs a pinned binary regardless,
# and a contributor without one still gets every other lane of `npm run ci`.
# CI's pin is the authority; a local binary of another version may disagree.
#
# A green result is never the scanner's silence. Before the real scan a token
# generated at runtime is planted in a scratch file and must be caught; if it
# is not, the lane fails whatever the real scan would have said. The value is
# never committed, so the repository never holds a string the lane would flag.
#
# PR text scan inputs, read from the environment so CI and this twin run the
# same code (the workflow sets them through step `env:`, never `${{ }}` in
# `run:` — a PR body is untrusted text):
#   SECRET_SCAN_RANGE    <base>..<head> whose commit messages are scanned. Unset:
#                        the merge-base with origin/develop up to HEAD, or skipped
#                        when origin/develop does not resolve. A base of all
#                        zeros (a new-branch push) has no range and is skipped.
#   SECRET_SCAN_PR_BODY  the PR body; scanned when non-empty.
#
# History is NOT scanned (`gitleaks git` would find values task 228 removed):
# the lane guards the tree and the PR in front of it, not the past.
#
# Every gitleaks call carries --redact, and hits are reported by file, line and
# rule only: a matched value is never printed.
set -euo pipefail

# Run from the repo root regardless of cwd — `git ls-files` is relative to it.
root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "error: not inside a git work tree — the scan would check nothing." >&2
  exit 1
}
cd "$root"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not installed — lane skipped (CI runs the pinned binary)"
  exit 0
fi
echo "gitleaks $(gitleaks version)"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Hits as `file:line rule`, never the value. The template is gitleaks' own
# report format; File is empty for a stdin scan.
printf '{{range .}}  {{.File}}:{{.StartLine}} {{.RuleID}}\n{{end}}' >"$tmp/report.tmpl"
GL_FLAGS=(--no-banner --redact --exit-code 1 --log-level error
  --report-format template --report-template "$tmp/report.tmpl" --report-path -)

# ── Self-check: a planted runtime token must be caught ──────────────────────
mkdir "$tmp/selfcheck"
plant=$(head -c 24 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=')
printf "const api_key = '%s';\n" "$plant" >"$tmp/selfcheck/plant.ts"
if gitleaks dir "$tmp/selfcheck" "${GL_FLAGS[@]}" >/dev/null 2>&1; then
  echo "error: self-check failed: the scanner caught nothing in a planted token — the lane would pass anything." >&2
  exit 1
fi
echo "self-check: planted token caught"

fail=0

# ── Tracked files ───────────────────────────────────────────────────────────
# A copy of the tracked set, never `gitleaks dir .`: on a contributor's machine
# that also reads untracked and gitignored files (.claude/state/, node_modules/).
# Copying the working-tree files includes uncommitted edits to tracked files. A
# tracked file deleted in the working tree is dropped — it holds nothing to scan,
# and `tar` would fail on it; CI's checkout never has one.
FILES=()
while IFS= read -r -d '' f; do
  if [ -e "$f" ] || [ -L "$f" ]; then FILES+=("$f"); fi
done < <(git ls-files -z)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "error: no tracked files — the scan would check nothing." >&2
  exit 1
fi

mkdir "$tmp/tree"
printf '%s\0' "${FILES[@]}" | tar --null -T - -cf - | tar -xf - -C "$tmp/tree"
echo "scanning ${#FILES[@]} tracked files"

if ! hits=$(gitleaks dir "$tmp/tree" "${GL_FLAGS[@]}" 2>&1); then
  echo "error: gitleaks found a secret-shaped string in a tracked file:" >&2
  printf '%s\n' "$hits" | sed "s|$tmp/tree/||" >&2
  echo "A placeholder: reword it, or add 'gitleaks:allow' with a reason on the same line (see task 228). A real secret: remove it and rotate it." >&2
  fail=1
fi

# ── PR text: commit messages ────────────────────────────────────────────────
range=${SECRET_SCAN_RANGE:-}
if [ -z "$range" ] && base=$(git merge-base origin/develop HEAD 2>/dev/null); then
  range="$base..HEAD"
fi
range_base=${range%%..*}
if [ -z "$range" ]; then
  echo "commit-message scan skipped — no range (set SECRET_SCAN_RANGE, or fetch origin/develop)"
elif [ -z "${range_base//0/}" ]; then
  echo "commit-message scan skipped — $range has no base commit (a new-branch push)"
else
  msgs=$(git log --format=%B "$range") || {
    echo "error: cannot read the commit range $range (a shallow clone? the workflow checks out with fetch-depth: 0)" >&2
    exit 1
  }
  echo "scanning the commit messages of $range"
  if ! hits=$(printf '%s' "$msgs" | gitleaks stdin "${GL_FLAGS[@]}" 2>&1); then
    echo "error: gitleaks found a secret-shaped string in the PR's commit messages (line numbers count from the first message of $range):" >&2
    printf '%s\n' "$hits" >&2
    fail=1
  fi
fi

# ── PR text: body ───────────────────────────────────────────────────────────
if [ -n "${SECRET_SCAN_PR_BODY:-}" ]; then
  echo "scanning the PR body"
  if ! hits=$(printf '%s' "$SECRET_SCAN_PR_BODY" | gitleaks stdin "${GL_FLAGS[@]}" 2>&1); then
    echo "error: gitleaks found a secret-shaped string in the PR body:" >&2
    printf '%s\n' "$hits" >&2
    fail=1
  fi
fi

if [ "$fail" -ne 0 ]; then
  exit 1
fi
echo "gitleaks: clean"
