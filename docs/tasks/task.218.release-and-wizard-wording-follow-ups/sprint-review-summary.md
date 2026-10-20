# Sprint Review Summary - Release runbook and setup wizard wording follow-ups

**Story/Task ID:** task.218
**Completed Date:** 2026-10-20
**Completed By:** Lorien Gamaroff
**Pull Request:** [#707](https://github.com/Gamaroff/agent-skills/pull/707)

---

## Summary

This task fixed the five low-severity wording defects that task.199's QA gate 4 left for later. They were in the release runbook's develop-sync section, the setup wizard's summary text and section banners, and the restricted-access guide. None of them changes behaviour; each one could have sent a reader to the wrong place.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Release runbook §4 now opens with its condition ("Run this step only if you passed `--no-sync-develop`") instead of a dangling "Otherwise".
- [x] §4's manual block and both recovery bullets end with `git checkout main`, so the operator is not left on `develop`.
- [x] The wizard's `approve` and `command` summaries name the `*.handover.*.md` checklist that `/tracker-reconcile` ticks. A new per-PR test holds this.
- [x] Every numbered banner in `setup-consumer.sh` uses a step number from its header, and the header lists `2b. Skill install profile`.
- [x] `restricted-access.md` says that `approve` also falls back to `command` in an autonomous run, both in the Limits list and in the mode table.

### Key Features Implemented

- **Runbook §4 wording**: The condition comes first, and every exit path returns the operator to `main`.
- **Wizard summary line**: The `/tracker-reconcile` line now names the file it ticks.
- **Banner numbering**: The section comments match the header's step list.
- **Restricted-access fallback**: The guide names both cases where `approve` falls back to `command`: no tty, and an autonomous run.

---

## Technical Details

### Files Modified/Created

- `docs/runbooks/release-and-install.md`: §4 opening sentence, and `git checkout main` at the end of the manual block and both recoveries
- `docs/concepts/restricted-access.md`: Limits item 2 and the `approve` table row
- `scripts/setup-consumer.sh`: header line `2b`, renumbered banners, and one `echo` reworded in `print_summary`
- `shared/resources/tests/setup-consumer-config.test.mjs`: a new test that renders the summary under `approve` and `command`
- `CHANGELOG.md`: an `[Unreleased]` › Fixed entry citing `(task 218)`

### Architecture/Design Decisions

The change was bounded on purpose. Only two non-comment lines changed in `setup-consumer.sh`: the old and new `echo`. No flag, exit code, output file or config key changed.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 1 new test in `shared/resources/tests/setup-consumer-config.test.mjs`. It was mutation-proven: two mutations of the summary `echo` both turned it red.
- **Integration Tests:** The full `npm run ci` ran, along with the PR lanes test, validate, shellcheck and link-check.
- **Test Coverage:** Both behaviour criteria are held by a per-PR test.

### Code Review

- **Reviewers:** QA diff reviewer (0 findings) and the `/review-pr` conformance lens (0 findings)
- **Approval Status:** ✅ Approved. QA gate.1 passed at 100/100, and the 5c review was APPROVE.
- **Review Comments Addressed:** None were raised.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets
- [x] No new unsafe execution patterns
- [x] No dependency changes
- [x] Not a boundary deliverable, so no probe ran

### Compliance Review

✅ **Compliance Requirements Met**

- [x] GDPR, PCI-DSS, WCAG and HIPAA do not apply. The change touches no personal, payment or health data, and its only UI is one line of terminal text.

---

## Documentation

### Updated Documentation

- [x] Release runbook §4
- [x] Restricted-access concept guide
- [x] CHANGELOG `[Unreleased]` entry

### Documentation Links

- [Release and install runbook](../../runbooks/release-and-install.md)
- [Restricted tracker access](../../concepts/restricted-access.md)

---

## Demo Notes

### How to Verify

1. Open `docs/runbooks/release-and-install.md` §4. It opens with its condition, and every path ends on `main`.
2. Run `node --test shared/resources/tests/setup-consumer-config.test.mjs`. The rendered-summary test passes.
3. Expected outcome: the `approve` and `command` wizard summaries name `*.handover.*.md` in their `/tracker-reconcile` line.

---

## Impact & Value

### User Impact

Release operators finish §4 on the correct branch. Consumers setting up restricted access learn which file `/tracker-reconcile` maintains, and that `approve` falls back to `command` in an autonomous run.

### Technical Impact

The wizard's section banners now match its header, so a maintainer can find a step by its number.

---

## Known Limitations & Future Work

### Current Limitations

- None

### Suggested Follow-Up Stories

- task.219, filed alongside this task from the same gate's follow-ups

---

## Metrics _(if applicable)_

- **Time to Complete:** 1 day
- **Lines of Code Changed:** 5 non-pipeline files, 1 new test

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
