---
id: task.326
title: "doc-id reads request and input records"
type: task
description: "Add request and input to doc-id's artifact vocabulary, so a question register or a filed source document beside a PRD, epic, story or task is read as an artifact and not reported as a badly named document."
tags: [doc-id, numbering, artifacts, review-prd]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-11-25
updated: 2026-11-25
estimated_effort_hours: 3
---

# Technical Task: doc-id reads request and input records

**Status:** Planned

---

## 1. Overview

`doc-id.js` owns the list of artifact words. A document named with a word outside the list is
`bad-artifact`. Two kinds of record that projects keep beside a document are not on it:

- `request`: questions put to somebody outside the work item, and their answers;
- `input`: a source document filed beside the work item as it was received.

**Scope**: one list, one exclusion in `finalise`'s admission rule, their tests and the naming standard.

**Key deliverables:**

- `doc-id.js parse` reads `{id}.request.{n}.{name}.md` and `{id}.input.{n}.{name}.md` as canonical
  artifacts, for every kind;
- `finalise` still refuses to edit either one;
- the naming standard lists both.

**Expected outcome**: `review-prd`'s numbering check and `doc-id.js check --corpus` report nothing for
such a file, and the migrator does not block on it.

---

## 2. Motivation

### Current Problems

1. **A legitimate record is a Critical finding.** `review-prd` grades every numbering finding Critical,
   so a PRD with a question register beside it cannot pass review.
2. **The library disagrees with itself.** `review-pr` and `finalise-preconditions.js` already name
   `.request.` as an artifact. `doc-id.js`, which calls its list the one vocabulary, does not.
3. **The migrator blocks.** It raises `unclassified-document` for the file, and a blocker stops a move.

### Benefits of Solution

1. A PRD can keep its questions and sources beside it.
2. The two readers that already accept `.request.` agree with the engine.

---

## 3. Technical Background

Every result below was run on 2026-11-25 at `eb0226de6`.

### Current Architecture

- **The list.** `shared/resources/doc-id.js:48` *(`const ARTIFACTS`)*: 14 words.
- **finalise follows it.** `shared/resources/finalise-fix-and-recheck.mjs:199`
  *(`WORK_ITEM_ARTIFACT_RE`)* is built from `docId.ARTIFACTS`, so there is one list to edit.
- **The admission rule.** `isCoLocatedArtifact` in the same file, `:241`, ends in
  `WORK_ITEM_ARTIFACT_RE.test(base) && !/\.bug\./.test(base)`. It decides which files beside a document
  `finalise` may edit. **A word added to the list is admitted by it.**
- **Lists that already hold `request`.** `shared/resources/finalise-preconditions.js:185`
  *(`const ARTIFACT`)* and `skills/review-pr/SKILL.md:471`.
- **The migrator.** `migrate-doc-numbering.mjs` raises `unclassified-document` for a loose `.md` in a
  PRD directory that its `classify` does not read.

### Target Architecture

`ARTIFACTS` gains `request` and `input`. `isCoLocatedArtifact` excludes both, beside `bug`.

**Tried** in a clean worktree, with only the two words added:

| Name | Today | After |
| :-- | :-- | :-- |
| `prd.6.request.1.vendor-questions.md` | `bad-artifact` | request, seq 1, canonical |
| `prd.6.shop.input.1.vendor-notes.md` | `bad-artifact` | input, seq 1, canonical, docSlug `shop` |
| `epic.1.2.request.1.x.md` | not run | request, seq 1, canonical |
| `story.1.2.3.request.1.vendor.md` | `bad-artifact` | request, seq 1, canonical |
| `task.9.request.1.vendor.md` | `bad-artifact` | request, seq 1, canonical |
| `prd.6.request.vendor-questions.md` | `bad-artifact` | request, not canonical |
| `task.5.request.md`, `prd.3.request.md` | not run | still a document, slug `request` |
| `prd.6.security-override.1.x.md` | `bad-artifact` | `bad-artifact` |

| Admission check | Today | After the two words alone |
| :-- | :-- | :-- |
| `isCoLocatedArtifact` of `task.9.request.1.v.md` beside `task.9.x.md` | `false` | **`true`** |
| `isWorkItemDocument` of the same file | `false` | `false` |

On a consumer's corpus, `check --corpus` went from four `bad-artifact` findings to one (a word this task
does not add).

Six suites (`doc-id`, `finalise-fix-and-recheck`, `doc-links`, `review-pr`,
`work-item-artifact-naming`, `migrate-doc-numbering`: 534 tests) pass both before and after. **So no
test holds this behaviour today, including the admission change.**

**Not exercised**: the migrator's `unclassified-document` on such a file, and the full suite.

### Important Clarifications

- **The admission must not widen.** A request or an input records what somebody else asked or sent.
  `finalise` must not rewrite it to clear a link fault.
- **The word is a whole dot segment.** A slug that contains it (`new-input-form`) is not affected.

---

## 4. Scope

### In Scope

✅ `ARTIFACTS` in `doc-id.js`

✅ The exclusion in `isCoLocatedArtifact`

✅ The naming standard

### Out of Scope

❌ **Other words** (`research`, `security-override`). Each needs its own case.

❌ **The hand-kept lists** in `bug-doc.js`, `tracker-reconcile.js` and `finalise-preconditions.js`.
Making them read `ARTIFACTS` is a separate change with its own risk.

❌ **A template or a skill** that writes either record.

---

## 5. Breaking Changes

### Breaking Change 1: a document whose second segment is one of the words

**What Changed**: `prd.3.x.request.1.y.md` is an artifact. Before, it was `bad-artifact`.

**Impact**: none on a valid name, because such a name was already refused. `prd.3.request.md` keeps
reading as a document.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.326.plan.request-and-input-records.md](task.326.plan.request-and-input-records.md)

### Phase 1: The vocabulary

**Risk Level**: Low

**Files**:
- `shared/resources/doc-id.js`
- `shared/resources/tests/doc-id.test.mjs`

**Changes**:
- [ ] Write the failing cases first (§ 8)
- [ ] Add `request` and `input`

**Dependencies**: none

### Phase 2: The admission rule

**Risk Level**: Low

**Files**:
- `shared/resources/finalise-fix-and-recheck.mjs`
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs`

**Changes**:
- [ ] Exclude both words in `isCoLocatedArtifact`, and say so in its comment
- [ ] Assert both are refused

**Dependencies**: Phase 1, in the same commit

### Phase 3: The migrator, records and bundle

**Risk Level**: Low

**Files**:
- `shared/resources/tests/migrate-doc-numbering.test.mjs`
- `docs/standards/file-naming.md`
- `CHANGELOG.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [ ] Assert the migrator raises no blocker for either record in a PRD directory
- [ ] List both records in the naming standard, for PRD, epic, story and task
- [ ] Write the CHANGELOG entry
- [ ] Run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 and 2

---

## 7. Files Summary

### Files to Create

None.

### Files to Modify (Core Implementation)

1. `shared/resources/doc-id.js` - the list
2. `shared/resources/finalise-fix-and-recheck.mjs` - the exclusion

### Files to Modify (Tests)

3. `shared/resources/tests/doc-id.test.mjs`
4. `shared/resources/tests/finalise-fix-and-recheck.test.mjs`
5. `shared/resources/tests/migrate-doc-numbering.test.mjs`

### Files to Modify (Documentation)

6. `docs/standards/file-naming.md`
7. `CHANGELOG.md`

### Generated

8. `skills/*/references/` copies of 1 and 2, by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Today | After |
| :-- | :-- | :-- |
| each row of the first § 3 table | as there | as there |
| `isCoLocatedArtifact` on a request and on an input | `false` | `false` |
| `isWorkItemDocument` on a request and on an input | `false` | `false` |
| the migrator's check on a PRD directory that holds each record | blocker (to confirm) | no blocker |
| a slug that contains the word (`prd.1.new-input-form`) | document | document |

**Command**: `command node --test shared/resources/tests/doc-id.test.mjs shared/resources/tests/finalise-fix-and-recheck.test.mjs shared/resources/tests/migrate-doc-numbering.test.mjs`

### Mutation Tests

Each alone turns a named test red: `request` removed; `input` removed; the admission exclusion removed
for `request`; the same for `input`.

### Consumer Tests

`npm run test:remote` runs the whole suite.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] Every row of the § 8 table holds in a test
- [ ] `isCoLocatedArtifact` refuses both records

### Performance

- [ ] Not applicable: no bound is claimed

### Code Quality

- [ ] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [ ] `npm run test:remote` and `npm run bundle:check` pass

### Migration

- [ ] The naming standard lists both records
- [ ] `CHANGELOG.md` `[Unreleased]` names both words, and that `finalise` does not edit them

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

#### 1. finalise gains the right to edit a record

**Risk**: the words land without the exclusion
**Probability**: Low
**Impact**: Medium
**Mitigation**: both phases in one commit, and a mutation for each word

### Low Risk Areas

#### 1. A reader with its own list still disagrees

**Risk**: `bug-doc.js` or `tracker-reconcile.js` reads a record as a document
**Probability**: Low
**Impact**: Low
**Mitigation**: same as today. Named in § 4 as separate work

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a document read as an artifact

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: the command of § 8

### Partial Rollback (1-2 hours)

Either word can be removed alone.

### Forward Fix (< 4 hours)

Wording of the standard.

### Rollback Triggers

**Critical**: `finalise` edits a request or an input

**Non-critical**: wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-11-25 | 1.0     | Initial draft — cut from a consumer's PRD numbering findings | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The vocabulary

- [ ] Failing cases
- [ ] Two words

### Phase 2: The admission rule

- [ ] Exclusion and tests

### Phase 3: The migrator, records and bundle

- [ ] Migrator case
- [ ] Standard
- [ ] CHANGELOG
- [ ] Bundle

---

## References

- [File naming standards](../../standards/file-naming.md)
- [Task 202](../task.202.doc-id-engine-and-prd-registry/task.202.doc-id-engine-and-prd-registry.md), which set the artifact vocabulary

---

## Notes

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
