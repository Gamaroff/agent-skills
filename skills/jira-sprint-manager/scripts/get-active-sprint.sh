#!/bin/bash
# Thin wrapper: emit active sprint(s) for a board. Empty array → none.
# Delegates to list-sprints.sh.
set -euo pipefail

BOARD_ID=${1:-}
if [ -z "$BOARD_ID" ]; then
  echo "Usage: $0 <board_id>" >&2
  exit 1
fi

exec "$(dirname "$0")/list-sprints.sh" "$BOARD_ID" active
