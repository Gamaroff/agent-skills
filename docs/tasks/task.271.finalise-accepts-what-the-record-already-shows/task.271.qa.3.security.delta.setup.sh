#!/usr/bin/env bash
# Fixture for the finalise-delta.js rerun-eligible probe (cycle 3): a PR that changed src/a.js and added
# a symlink to an untouched test file, then a docs-only delta. HEAD~1 is the PR's last (green) commit.
set -e
git init -q -b main .
git config user.email t@example.com; git config user.name t; git config commit.gpgsign false
git config maintenance.auto false; git config gc.auto 0
mkdir -p src docs
echo a > src/a.js; echo t > src/other.test.js; git add -A; git commit -qm base
git checkout -q -b feature/x
echo a2 > src/a.js; ln -s other.test.js src/link.test.js; git add -A; git commit -qm pr
echo n > docs/n.md; git add docs; git commit -qm docs
