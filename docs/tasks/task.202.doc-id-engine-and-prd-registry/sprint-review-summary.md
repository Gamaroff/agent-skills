# Sprint Review Summary - Doc-id engine and PRD registry

**Story/Task ID:** task.202
**Epic:** n/a (standalone task; Phase 11 of the project completion roadmap)
**Completed Date:** 2026-10-15
**Completed By:** Lorien Gamaroff (pipeline: /develop-next → /develop-task)
**Pull Request:** [#667](https://github.com/Gamaroff/agent-skills/pull/667)

---

## Summary

A single shared engine now parses, formats, allocates and checks hierarchical document ids (`prd.P`, `epic.P.E`, `story.P.E.S`). A new PRD registry standard defines how `P` is allocated. No existing skill calls the engine yet: tasks 203–207 migrate the callers.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] parse/format round-trip every generated name, for every kind, sub-story and artifact shape
- [x] `matchesEpic` matches by numbers, never by prefix (`epic.1.2` ≠ `epic.12.1` ≠ `epic.1.21`)
- [x] `nextNumber` allocates highest + 1 and never refills a gap
- [x] `check --corpus` reports one finding per seeded defect, with its reason, and `ok` on a valid chain
- [x] `parseRegistry(…, "prd", …)` reads a PRD registry row; a roadmap line linking a PRD is still not a work item
- [x] `check --corpus` over `docs/prd` finishes in under 1 s (0.027–0.037 s)
- [x] No new runtime dependency; `npm test` green with the `.agents/skills` symlink moved aside
- [x] Every `check` reason has a test that goes red when the reason is broken
- [x] `bundle:check` clean; the standards carry dated interim notes; `prd-registry.md` and `epic-registry.md` updated

### Key Features Implemented

- **`shared/resources/doc-id.js`**: the parser, formatter, allocator and corpus checker, plus a CLI (`parse`, `next`, `check`, `check --corpus`) with the usual `--json` `reason` and exit-code contract
- **PRD registry standard**: location, columns, counter, never-reuse rule and allocation procedure
- **select-next `prd` kind**: the roadmap selector reads a PRD registry by the same rules as its bug and task registries

---

## Technical Details

### Files Modified/Created

- `shared/resources/doc-id.js` — new engine and CLI
- `shared/resources/tests/doc-id.test.mjs` and `shared/resources/tests/fixtures/doc-id/**` — tests and fixture trees, one per check reason
- `skills/develop-next/scripts/select-next.mjs` and `evals/develop-next/unit/select-next.test.mjs` — `prd` registry kind
- `docs/standards/prd-registry.md` (new); `file-naming`, `prd-documents`, `epic-documents`, `story-documents`, `epic-registry`, `README`; `docs/architecture/concepts/coding-standards.md`; `docs/contributing/traps.md`; `CHANGELOG.md`

### Architecture/Design Decisions

- The registry reader is the selector's own `parseRegistry`, and a parity test pins the two together, so "what is a row" has a single definition.
- An unreadable directory is reported as `unreadable` and never as an empty tree.
- Epic and story numbers are allocated as highest + 1 with no counter. A gap is never refilled; only `P` is never reused.

### Dependencies

- **New Dependencies Added:** None (Node built-ins `fs` and `path` only)
- **Breaking Changes:** None at runtime. The standards describe the new scheme, with dated interim notes until tasks 203–206 migrate

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 55 doc-id tests plus 4 select-next tests, run per PR by `npm test`
- **Integration Tests:** the CLI is tested as a spawned process
- **Test Coverage:** every `check` reason has a test proven by mutation

### Code Review

- **Reviewers:** an independent diff reviewer in each QA cycle (7 cycles, final gate PASS 100/100), and `/review-pr` at Step 5c (APPROVE twice)
- **Approval Status:** ✅ Approved
- **Review Comments Addressed:** all resolved

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Input validation: `parse` refuses anything malformed (anchored patterns, safe-integer guard); the probe ran 30 cases and reproduced 0
- [x] Authentication/authorization: not applicable
- [x] No sensitive data exposure: the engine only reads files; it does not write, run a shell or use the network
- [x] Dependencies: unchanged

### Compliance Review

✅ **Compliance Requirements Met** — not applicable (internal developer tooling)

---

## Documentation

### Updated Documentation

- [x] New standard: `docs/standards/prd-registry.md`
- [x] Standards and `coding-standards.md` § Registries updated, each with a dated interim note
- [x] `CHANGELOG.md` `[Unreleased]` entry

### Documentation Links

- [PRD registry standard](../../standards/prd-registry.md)
- [File naming](../../standards/file-naming.md)

---

## Demo Notes

### How to Verify

1. `node shared/resources/doc-id.js parse story.1.2.3.my-story --json` returns the parts
2. `node shared/resources/doc-id.js check --corpus --json` checks the `docs/prd` tree and reports one finding per defect
3. `node --test shared/resources/tests/doc-id.test.mjs` passes

---

## Impact & Value

### User Impact

None yet. This is the foundation for per-PRD epic and story numbering, which tasks 203–207 roll out.

### Technical Impact

Id parsing, allocation and checking now live in one engine, so the migrations that follow have one parser to call.

---

## Known Limitations & Future Work

### Current Limitations

- No skill calls the engine yet. The legacy shapes stay in force until tasks 203–206 migrate.
- 7 legacy `story.*.validate.<date>.md` files in `docs/prd` don't parse, because `validate` is not an artifact word. Task 203 should handle them.

### Suggested Follow-Up Stories

- Tasks 203–207 (migration, bundling, create-epic/create-story wiring)

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
