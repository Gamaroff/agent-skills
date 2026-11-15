# Sprint Review Summary: Task 275 — Gates say what they know

**Status:** Accepted 2026-11-15 · **PR:** #911 · **QA gate:** PASS 95/100

## What changed

A PASS gate comment used to say the checks "found no problems" even when the gate listed open minor points. The lead now says "The checks passed, with N minor point(s) recorded below." A new helper counts the open entries, the five QA comment sites feed it, and a test guard fails any site that does not. Gate recommendations also gain a `remedy: verified|unverified` field, so a fix nobody ran is no longer read as proven.

## Evidence

- 86 tests pass across the three affected suites; mutation proofs for the count branch, the feed guard and the closed-status set.
- Helper cross-checked against a YAML parser over 997 committed gates: 0 mismatches.
- Bundle check: 0 problems. CI green on the PR.

## Decision for the owner

The wall-time criterion was amended, approved by Lorien Gamaroff, from ten full-suite runs to the measured evidence (0.4 s added tests against a 685 s suite).

## Known limits

QA planning also writes gates and does not yet carry the `remedy:` field; it was scoped out.
