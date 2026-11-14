---
id: task.900
title: "Review-pr smoke test: slugify helper"
type: task
description: "THROWAWAY test fixture for exercising /review-pr. Adds a small slugify helper with unit tests. Not registered; never merge."
tags: [smoke-test, review-pr]
category: refactoring
status: in-progress
priority: Low
created: 2026-10-07
updated: 2026-10-07
---

# Technical Task: Review-pr smoke test — slugify helper

**Status:** In Progress

> ⚠️ Throwaway fixture for testing `/review-pr`. Do not merge.

## 1. Overview

Add `scripts/smoke/slugify.js`, a pure helper that turns a title into a URL slug, with unit tests.

## 4. Scope

**In scope:** the helper and its tests. **Out of scope:** any other file.

## 7. Files Summary

| File | Change |
|---|---|
| `scripts/smoke/slugify.js` | new — the helper |
| `scripts/smoke/slugify.test.js` | new — `node:test` unit tests |

## 9. Success Criteria

- **AC-1** `slugify(s)` lowercases the input.
- **AC-2** Every run of non-alphanumeric characters becomes a single `-`.
- **AC-3** Leading and trailing `-` are trimmed (`"  Hello, World!  "` → `"hello-world"`).
- **AC-4** `slugify(null)` and `slugify(undefined)` return `""` rather than throwing.
- **AC-5** Unit tests cover AC-1 to AC-4, one test per criterion.
