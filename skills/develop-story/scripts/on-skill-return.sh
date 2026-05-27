#!/usr/bin/env bash
# Wrapper — real implementation lives at shared/resources/develop-pipeline-on-skill-return.sh
# and is bundled into ../references/ via `npm run bundle`. Edit the canonical, not this.
exec "$(dirname "$0")/../references/develop-pipeline-on-skill-return.sh" "$@"
