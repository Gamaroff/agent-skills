#!/usr/bin/env bash
# QA cycle 5 probe fixture for fast-gate-outcome.sh: builds, in "$1" only, a git checkout whose
# origin is a local bare repository, with a PR head commit of its own (a base that already contains
# HEAD is refused since cycle 4's CR-6 fix), and a red gate log naming one failing node --test test.
# At the base: t.test.mjs fails test "a"; o.test.mjs passes its own test "a" (the shared-name case).
set -eu
cd "$1"
G() { git -c user.name=qa -c user.email=qa@example.invalid "$@"; }
G init -q -b develop .
printf 'import test from "node:test";\nimport assert from "node:assert/strict";\ntest("a", () => assert.fail("a"));\n' >t.test.mjs
printf 'import test from "node:test";\ntest("a", () => {});\n' >o.test.mjs
G add t.test.mjs o.test.mjs
G commit -q -m base
G init -q --bare .origin.git
G remote add origin "$1/.origin.git"
G push -q origin develop
G checkout -q -b feature/x
printf 'the change\n' >head.txt
G add head.txt
G commit -q -m "the change"
mkdir -p .claude/state
printf '%s\n' '✖ failing tests:' '' 'test at t.test.mjs:3:1' '✖ a (1.2ms)' >.claude/state/gate.log
