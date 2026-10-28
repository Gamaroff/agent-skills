#!/usr/bin/env bash
# QA cycle 2 probe fixture for fast-gate-outcome.sh (task.238 bug.3): builds, in "$1" only, a git
# checkout whose origin is a local bare repository — the transport on which `git fetch origin
# --upload-pack=<cmd>` runs <cmd> — and a red gate log naming one failing node --test test.
set -eu
cd "$1"
G() { git -c user.name=qa -c user.email=qa@example.invalid "$@"; }
G init -q -b develop .
printf 'import test from "node:test";\nimport assert from "node:assert/strict";\ntest("a", () => assert.fail("a"));\n' >t.test.mjs
G add t.test.mjs
G commit -q -m base
G init -q --bare .origin.git
G remote add origin "$1/.origin.git"
G push -q origin develop
mkdir -p .claude/state
printf '%s\n' '✖ failing tests:' '' 'test at t.test.mjs:3:1' '✖ a (1.2ms)' >.claude/state/gate.log
