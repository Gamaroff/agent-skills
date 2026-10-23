---
id: task.229.plan
title: "Implementation Plan: Secret-scan CI lane over tracked files"
type: plan
task-ref: task.229.secret-scan-ci-lane.md
---

# Implementation Plan: Secret-scan CI lane over tracked files

> Requirements and success criteria: [task.229.secret-scan-ci-lane.md](task.229.secret-scan-ci-lane.md)

## Overview

Copy the ShellCheck lane's shape: a pinned binary in CI, one script that defines the file set and
is also the local twin, and a parity-test entry. Add one thing ShellCheck lacks, a planted-token
self-check, so a green result is never the scanner's silence.

## Phase-by-Phase Implementation Guide

### Phase 1: `scripts/lint-secrets.sh`

Header comment in the style of `scripts/lint-shell.sh`: what it twins, and why the binary is
skipped locally but pinned in CI. Body outline:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not installed — lane skipped (CI runs the pinned binary)"
  exit 0
fi
gitleaks version

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Self-check: the value is generated here and never committed.
mkdir "$tmp/selfcheck"
plant=$(head -c 24 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=')
printf "const api_key = '%s';\n" "$plant" > "$tmp/selfcheck/plant.ts"
if gitleaks dir "$tmp/selfcheck" --no-banner --redact --exit-code 1 >/dev/null 2>&1; then
  echo "::error::self-check failed: gitleaks caught nothing in a planted token — the lane would pass anything."
  exit 1
fi

# Tracked files only, including uncommitted edits to them.
mkdir "$tmp/tree"
count=$(git ls-files | wc -l)
if [ "$count" -eq 0 ]; then echo "::error::no tracked files — the scan would check nothing."; exit 1; fi
git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$tmp/tree"
echo "scanning $count tracked files"

if ! gitleaks dir "$tmp/tree" --no-banner --redact --exit-code 1; then
  echo "::error::gitleaks found a secret-shaped string in a tracked file."
  echo "A placeholder: reword it (see task 228). A real secret: remove it and rotate it."
  exit 1
fi
```

Verify before relying on it:

- **`rm -rf` in the trap.** The repo's Step 8 lesson (task 227) concerns removals in agent-run
  checklist blocks, not scripts. Still confirm with `lint:shell` and keep the target a `mktemp -d`
  path only.
- **`tar --null -T -`** on the owner's machine (GNU tar) and in CI (ubuntu). A deleted-but-tracked
  file makes `tar` fail; decide whether to filter it out with `git ls-files -z --deduplicate` and a
  `-e` test, or let the lane fail, and document the choice.
- **The self-check's exit code**: run it once with the plant replaced by `'test-token'`. The `if`
  branch must fire.

### Phase 2: `.github/workflows/secret-scan.yml`

```yaml
name: Secret scan
# Header comment: why this is its own unfiltered workflow (same two reasons as shellcheck.yml),
# why the binary is pinned, and that scripts/lint-secrets.sh is the single file-set definition.
on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Install gitleaks (pinned)
        env:
          GITLEAKS_VERSION: 8.30.1   # match the owner's local version; bump in its own commit
        run: |
          set -euo pipefail
          url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
          curl -fsSL "$url" | tar -xzf - -C /usr/local/bin gitleaks
          gitleaks version
      - name: Scan tracked files for secrets
        run: npm run lint:secrets
```

Before committing the pin, confirm that the release asset name exists for that version.

`npm run lint:secrets` needs no `npm ci`, because the script uses no Node. Check that the parity
test does not require a `setup-node` step for an `npm run` call. If it does, use
`bash scripts/lint-secrets.sh` plus a `LANE_TWINS` entry.

Add `"Install gitleaks (pinned)"` to `SETUP_STEPS` in `ci-gate-parity.test.mjs`, beside
`"Install ShellCheck (pinned)"`.

### Phase 3: Docs

- `CONTRIBUTING.md` § "Before you open a PR": the `npm run ci` comment lists lanes. Add `lint:secrets`.
- `docs/contributing/releases.md`: the "`npm run ci` is the local form…" paragraph and the CI
  checklist (beside the `ShellCheck` box).
- `CHANGELOG.md` `### Added`: one entry citing task 229.

## Testing Approach

The five script outcomes in the task's Testing Strategy, each run by hand and recorded in the
implementation report with its exit code. Any scratch token used for the "planted tracked token"
case is generated at runtime, staged only, and unstaged and deleted afterwards. It is never
committed.
