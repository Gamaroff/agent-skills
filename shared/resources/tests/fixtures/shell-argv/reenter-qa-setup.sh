#!/usr/bin/env bash
# reenter-qa-setup.sh <fixture-dir> — the --fixture-setup for the task.181 proof run of
# reenter-qa-after-finalise.sh under security-probe's shell-argv: entry form.
#
# Builds, inside <fixture-dir> (the probe's cwd), the repository a finalise DoD-gaps re-entry
# needs: a code commit, a work item whose gate's `head:` is that commit and whose newest DoD
# reads GAPS, a step-7 halt snapshot for it, and a second code commit outside the work item so
# code has moved. Then the directories the hostile cases name, so each reaches the script's own
# refusals rather than its usage line: another work item, and directories whose NAMES are
# hostile (a command substitution, a space, a leading dash).
#
# Shape lifted from reenter-qa-after-finalise.test.sh's mkrepo. The probe's sandbox HOME has no
# git identity, so every commit states one.
set -euo pipefail

cd "${1:?usage: reenter-qa-setup.sh <fixture-dir>}"
DOC=docs/tasks/task.42.example
g() { git -c user.email=probe@example.invalid -c user.name=probe -c commit.gpgsign=false "$@"; }

mkdir -p "$DOC" src .claude/state
g init -q
printf '.claude/\n' > .gitignore
echo one > src/code.sh
echo "# task" > "$DOC/task.42.example.md"
printf '# report\n### QA Cycle 1\n### QA Cycle 2\n' > "$DOC/report.md"
g add -A
g commit -qm code
head=$(git rev-parse HEAD)
printf 'schema: 2\nhead: %s\ngate: PASS\n' "$head" > "$DOC/task.42.gate.2.example.yml"
: > "$DOC/task.42.gate.1.example.yml"
printf '# DoD\n\n## Verification Complete\n\n**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED\n' \
  > "$DOC/task.42.dod.1.example.md"
g add -A
g commit -qm "gate + dod"
printf '{"skill":"develop-task","current_step":7,"task_or_story_directory":"%s","branch":"feature/x","qa_max_cycles":5,"halted_at":"2026-10-01T00:00:00Z","halt_reason":"finalise DoD gaps","halt_step":"7"}\n' \
  "$DOC" > .claude/state/develop-pipeline.last-halt.json
echo two > src/code.sh
g commit -qam "code fix"

# The hostile cases' targets: real directories, so `[ -d ]` passes and the script's own
# refusals answer. Each is tracked, so none reads as uncommitted work.
mkdir -p docs/tasks/task.99.other 'docs/tasks/$(touch PWNED)' 'docs/tasks/a b' -- -n
for d in docs/tasks/task.99.other 'docs/tasks/$(touch PWNED)' 'docs/tasks/a b' -n; do
  : > "$d/.keep"
done
g add -A
g commit -qm "other directories"
