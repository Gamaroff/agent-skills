#!/usr/bin/env bash
# Fixture for the finalise-delta.js rerun-eligible probe (cycle 4): the PR changed tests/real.test.js and src/a.js; a symlink to the changed file and one to an untouched file exist; then a docs-only delta.
set -e
git init -q -b main .
git config user.email t@example.com; git config user.name t; git config commit.gpgsign false
git config maintenance.auto false; git config gc.auto 0
mkdir -p src docs tests
echo a > src/a.js; echo t > src/other.test.js; echo r > tests/real.test.js
ln -s tests/real.test.js link-real.test.js; ln -s src/other.test.js link-other.test.js
git add -A; git commit -qm base
git checkout -q -b feature/x
echo a2 > src/a.js; echo r2 > tests/real.test.js; git commit -qam pr
echo n > docs/n.md; git add docs; git commit -qm docs
