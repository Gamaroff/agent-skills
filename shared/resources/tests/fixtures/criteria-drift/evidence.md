---
id: task.234
type: task
status: ready-for-review
---

# Technical Task: fixture — task.234 after develop ticked and noted the criteria (3cd1bc62)

## 9. Success Criteria

### Functional

- [x] Teardown never changes the mode of anything outside the sandbox.

### Performance

- [x] The suite's wall time grows by no more than the D tests' waits (about 0.6 s per spawn site).
      *(2026-10-31, load ~1.0–1.2: the 265 existing tests 25.86/25.90 s on develop vs 26.00/26.03 s
      on the branch, +0.14 s; the whole file grows ~1.3 s, the two 0.6 s D waits plus the A and B
      runs.)*

## 10. Risk Assessment

Nothing here is read by criteria-drift.

## QA Results

QA 1: CONCERNS.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-29 | 1.0     | Initial draft | create-task |
| 2026-10-31 |         | Implemented   | develop     |
