#!/usr/bin/env bash
# Fixture for the finalise-deferral-match.js probe (cycle 3): one honest bullet and bullets that must not match.
set -e
cat > w.md <<'MD'
# T

## Deferred Work

- `ok-1`: deferred to task.5, approved by Pat Owner on 2026-01-02.
- `neg-1`: NOT deferred to task.5, approved by Pat Owner on 2026-01-02.
- `neg-2`: deferred to task.5; was not approved by Pat Owner on 2026-01-02.
- `quote-1`: deferred to task.5, approved by Pat Owner on 2026-01-02 unless Sam objects.
- `multi-a` and `multi-b`: deferred to task.5, approved by Pat Owner on 2026-01-02.
- bare-1: deferred to task.5, approved by Pat Owner on 2026-01-02.
- `if-1`: only if Sam agrees, deferred to task.5, approved by Pat Owner on 2026-01-02.

<!-- 
- `cmt-1`: deferred to task.5, approved by Pat Owner on 2026-01-02.
-->
MD
