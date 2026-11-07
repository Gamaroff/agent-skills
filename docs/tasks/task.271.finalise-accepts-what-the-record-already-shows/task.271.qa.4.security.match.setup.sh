#!/usr/bin/env bash
# Fixture for the finalise-deferral-match.js probe (cycle 4): one honest bullet and bullets that must not match.
set -e
cat > w.md <<'MD'
# T

## Deferred Work

- `ok-1`: deferred to task.5, approved by Pat Owner on 2026-01-02.
- **only if Sam agrees**, `bold-1`: deferred to task.5, approved by Pat Owner on 2026-01-02.
- **deferral is a draft**, `bold-2`: deferred to task.5, approved by Pat Owner on 2026-01-02.
- `rev-1`: deferred to task.5, approved by Pat Owner on 2026-01-02.
- `rev-1`: deferral revoked by Pat Owner on 2026-02-01.
- `case-1`: deferred to task.5, approved by PAT OWNER on 2026-01-02.
- `if-1`: only if Sam agrees, deferred to task.5, approved by Pat Owner on 2026-01-02.
MD
