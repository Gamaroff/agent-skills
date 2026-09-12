---
id: task.108.plan
title: "Implementation Plan: the bundler re-relativises links"
type: plan
task-ref: task.108.bundler-rewrites-relative-links.md
---

# Implementation Plan: the bundler re-relativises links

> Requirements and success criteria: [task.108.bundler-rewrites-relative-links.md](task.108.bundler-rewrites-relative-links.md)

## Overview

Two scripts share one rewrite pass; one new checker precedes both changes so every step is measured.

## Phase-by-Phase Implementation Guide

### Phase 1: the checker (measure before touching)

- `tests/bundled-links.test.js`: walk `git ls-files 'skills/**/*.md' 'shared/resources/**/*.md'`;
  strip fenced blocks and inline code; extract `[..](target)` where target is not `http(s):`,
  `mailto:`, `#…`, or a placeholder (`url`, `path`, `…`, `{…}`); resolve against the file's dir;
  assert the target (sans `#anchor`) is in `git ls-files`.
- Floor: `files ≥ 200 && links ≥ 1000`, else fail with `scan-broken`-style message.
- Run once; record the count in the implementation report.

### Phase 2: bundler rewrite

- In `bundle_skill.py`, after the existing `shared/resources/` → `references/` substitution, run a
  link pass: for each relative Markdown link in a bundled `.md`, `os.path.normpath(join(src_dir,
  target))` → if the result is **inside the destination skill directory**: emit
  `os.path.relpath(abs, dst_dir)`; **otherwise** (docs/, AGENTS.md, an unbundled shared sibling,
  anything): emit `UPSTREAM_BASE + repo_relative_path`. One rule, one constant.
- One constant `UPSTREAM_BASE = "https://github.com/Gamaroff/agent-skills/blob/develop/"`.
- Skip fenced/inline code with the same rules as the checker — line-based fence tracking, not a
  whole-text regex (duplicate deliberately across Python and JS with a comment naming the twin).
- `package_skill.py` **imports** the pass (`from bundle_skill import rewrite_links`) — it already
  duplicates the three `shared/resources/` regexes and must not gain a fourth copy.
- `npm run bundle` → checker → 0. `npm run bundle` again → `git status` clean.

### Phase 3: package path + guard + docs

- Same pass in `package_skill.py`; verify inside an extracted zip.
- Confirm `tests/bundled-links.test.js` runs under the existing `npm test` glob; no workflow edit.
- Mutation-prove; write it up; CHANGELOG.

## Key Patterns and References

- `assert_sourced_siblings_landed()` in `bundle_skill.py` — the existing pattern for a build-time
  assertion with an independent matcher and a floor.
- `docs/reference/anti-patterns.md` — "Never fix N call sites without a population check".

## Testing Approach

Fixture tree under `tests/fixtures/bundled-links/` with known-good and known-bad links; the checker
unit-tested against it; the bundler pass unit-tested on a 3-file synthetic skill.
