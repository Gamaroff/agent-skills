#!/usr/bin/env bash
# Fixture for the finalise-deferral-match.js probe: a work item whose Deferred Work holds one honest bullet and four that must not match.
set -e
cat > w.md <<'MD'
# T

## Deferred Work

- ok-1: deferred to task.5, approved by Pat Owner on 2026-01-02.
- neg-1: NOT deferred to task.5; was not approved by Pat Owner on 2026-01-02.
- multi-a and multi-b: deferred to task.5, approved by Pat Owner on 2026-01-02.

<!--
- cmt-1: deferred to task.5, approved by Pat Owner on 2026-01-02.
-->
MD
