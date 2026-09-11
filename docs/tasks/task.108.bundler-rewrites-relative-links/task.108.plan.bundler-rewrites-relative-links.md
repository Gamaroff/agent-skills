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
  target))` → if under `docs/`: emit `UPSTREAM_BASE + path`; else `os.path.relpath(abs, dst_dir)`.
- One constant `UPSTREAM_BASE = "https://github.com/Gamaroff/agent-skills/blob/develop/"`.
- Skip fenced/inline code with the same rules as the checker (share a tiny regex module or
  duplicate deliberately with a comment naming the twin).
- `npm run bundle` → checker → 0. `npm run bundle` again → `git status` clean.

### Phase 3: package path + guard + docs

- Same pass in `package_skill.py`; verify inside an extracted zip.
- `validate.yml` step + `package.json` `validate:all`.
- Mutation-prove; write it up; CHANGELOG.

## Key Patterns and References

- `assert_sourced_siblings_landed()` in `bundle_skill.py` — the existing pattern for a build-time
  assertion with an independent matcher and a floor.
- `docs/reference/anti-patterns.md` — "Never fix N call sites without a population check".

## Testing Approach

Fixture tree under `tests/fixtures/bundled-links/` with known-good and known-bad links; the checker
unit-tested against it; the bundler pass unit-tested on a 3-file synthetic skill.
