#!/usr/bin/env bash
# migrate-doc-numbering-guard-setup.sh <fixture-dir> — the --fixture-setup for the task.253 proof
# run of shared/resources/migrate-doc-numbering.mjs under security-probe's cli: entry form.
#
# Builds, inside <fixture-dir> (the probe's cwd), a git repository holding a small legacy PRD tree
# under docs/prd, so `--apply` has real work and reaches its repository-state guard (dirty tree,
# behind upstream). When the case wrote a `make-behind.flag` file, the branch is also given an
# upstream, held in <fixture-dir>/.upstream.git, that has one commit the local branch lacks.
# A `make-dirty.flag` file leaves one untracked file behind.
#
# Everything stays inside <fixture-dir>: the upstream and the second clone are excluded from the
# repository through .git/info/exclude, so they do not make the tree dirty. The probe's sandbox
# HOME has no git identity, so every commit states one.
set -euo pipefail

cd "${1:?usage: migrate-doc-numbering-guard-setup.sh <fixture-dir>}"
g() { git -c user.email=probe@example.invalid -c user.name=probe -c commit.gpgsign=false "$@"; }

BEHIND=0; DIRTY=0
[ -f make-behind.flag ] && { BEHIND=1; rm -f make-behind.flag; }
[ -f make-dirty.flag ] && { DIRTY=1; rm -f make-dirty.flag; }

R=docs/prd
E=$R/onb/epics/epic.1.alpha
S=$E/stories/story.1.1.first
mkdir -p "$S"
printf -- '---\nname: prd.onb\ntitle: Onboarding\nstatus: draft\ncreated: 2026-01-01\n---\n# PRD\n' > "$R/onb/prd.onb.md"
printf -- '---\nepic_number: 1\ntitle: "Alpha"\nprd_source: "docs/prd/onb/prd.onb.md"\n---\n# [Epic 1] Alpha\n' > "$E/epic.1.alpha.md"
printf -- '---\nid: story.1.1.first\ntitle: "[Story 1.1] First"\nstatus: accepted\nepic: 1\nepic_file: ../../epic.1.alpha.md\nprd_source: docs/prd/onb/prd.onb.md\n---\n# [Story 1.1] First\n' > "$S/story.1.1.first.md"

g init -q
printf '.upstream.git/\n.other/\n' >> .git/info/exclude
g add -A
g commit -qm "legacy tree"

if [ "$BEHIND" = 1 ]; then
  branch=$(g branch --show-current)
  g init -q --bare .upstream.git
  g remote add origin "$PWD/.upstream.git"
  g push -q -u origin "$branch"
  g clone -q "$PWD/.upstream.git" .other
  echo ahead > .other/upstream-only.txt
  g -C .other add -A
  g -C .other commit -qm "ahead"
  g -C .other push -q origin "$branch"
  rm -rf .other
fi

# The path-sink corpus's legitimate names, as empty directories: --root refuses a directory that
# does not exist, which is a usage refusal about the fixture and not about the name. Empty
# directories are invisible to git, so they leave the tree clean.
mkdir -p reports/2026/q1.csv archive..2026.tar.gz .gitkeep

[ "$DIRTY" = 1 ] && echo stray > stray-untracked.txt
exit 0
