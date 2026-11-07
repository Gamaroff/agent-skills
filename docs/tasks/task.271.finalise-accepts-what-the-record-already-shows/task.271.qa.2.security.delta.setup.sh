#!/usr/bin/env bash
# Fixture for the finalise-delta.js rerun-eligible probe: a PR that changed src/a.js, then a docs-only delta.
set -e
git init -q -b main .
git config user.email t@example.com; git config user.name t; git config commit.gpgsign false
git config maintenance.auto false; git config gc.auto 0
mkdir -p src docs
echo a > src/a.js; echo t > src/other.test.js; git add -A; git commit -qm base
git checkout -q -b feature/x
echo a2 > src/a.js; git commit -qam pr
git rev-parse HEAD > .green
echo n > docs/n.md; git add docs; git commit -qm docs
