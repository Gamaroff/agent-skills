# Mirrors the toolchain of .github/workflows/test.yml (ubuntu-latest, Node 22, pyyaml,
# gawk, mawk, zsh), so a remote run executes the zsh and awk variants instead of skipping
# them. Built on the server on first use and tagged by a hash of this file.
#
# trixie, not bookworm: bookworm's jq 1.6 exits 0 on `jq -e` over empty input (so the
# zero-byte-lock cases in advance-pipeline-lock.test.sh fail there and pass on CI), and its
# git 2.39 cannot commit a bare gitlink the way ci-tree-equivalence.test.mjs does. trixie
# carries git 2.47 and jq 1.7.1, close to ubuntu-latest's.
FROM node:22-trixie

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3-yaml gawk mawk zsh jq git rsync shellcheck \
  && rm -rf /var/lib/apt/lists/*

# shellcheck: tests/ci-tool-skips.test.js fails under CI=true when a tool a suite skips without
# is missing, and ubuntu-latest ships shellcheck. A UTF-8 locale: zsh prints a non-ASCII
# character in a document under test as escapes without one, and a test that matches the text fails.
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

# A home the container user can write whatever UID it runs as (the route passes --user), and one
# outside /tmp: the observation-log tests refuse a workspace under a temporary directory.
RUN mkdir -p /home/node && chmod 1777 /home/node
