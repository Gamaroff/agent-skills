"use strict";
/**
 * Regression tests for bug.1 — the canonical lifecycle status
 * `ready-for-development` could not match a Jira column named
 * "Ready for Development".
 *
 * `DEFAULT_STATUS_MAP` bound both `"ready-for-development"` and its spelled-out
 * alias `"ready for development"` to NEW_CANDIDATES, which does not contain the
 * literal string "Ready for Development". The list that did — READY_CANDIDATES
 * — was reachable only from the `ready` alias, which is not a canonical
 * lifecycle status. A board whose column is named exactly like the status
 * therefore matched nothing and the transition was silently skipped.
 *
 * The fix APPENDS the dedicated "Ready*" names to the backlog names rather than
 * prepending them. That ordering is the entire safety argument, so the tests
 * below assert the ordering property directly and not merely the membership
 * one: a membership-only test would pass just as happily under a prepend, which
 * silently relocates cards on boards that work correctly today.
 *
 * Run: node --test shared/resources/tests/jira-ready-for-development-candidates.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const lib = require(join(__dirname, "..", "jira-sync.js"));
const { mapStatusCandidates, mapStatus, resolveTransition } = lib;

// The backlog names, in the order they have always resolved. Any board that
// exposes one of these must keep landing on the first one it exposes.
const BACKLOG_ORDER = Object.freeze([
  "To Do",
  "Backlog",
  "Open",
  "New",
  "Selected for Development",
]);

// Build the `transitions` payload shape resolveTransition consumes, from a list
// of column names a board exposes as destinations.
const board = (...names) =>
  names.map((n, i) => ({
    id: String(i + 1),
    name: `Move to ${n}`,
    to: { name: n, statusCategory: { key: "indeterminate" } },
  }));

// Where does `ready-for-development` actually land on a board exposing `names`?
function destination(...names) {
  const r = resolveTransition({
    transitions: board(...names),
    candidates: mapStatusCandidates("ready-for-development"),
    currentStatus: "Somewhere Else",
  });
  return r.match ? r.match.to.name : null;
}

// --- the defect itself -----------------------------------------------------

test("ready-for-development includes the literal 'Ready for Development'", () => {
  const list = mapStatusCandidates("ready-for-development");
  assert.ok(
    list.includes("Ready for Development"),
    `expected "Ready for Development" among candidates, got ${JSON.stringify(list)}`,
  );
});

test("a board whose ONLY column is 'Ready for Development' now matches", () => {
  // The reported case. Pre-fix this resolved to { match: null,
  // reason: "no-transition" } and the sync reported success while skipping.
  assert.equal(destination("Ready for Development"), "Ready for Development");
});

test("both spellings of the status resolve identically", () => {
  // Fixing only the canonical key would leave two spellings of one status
  // resolving differently — inconsistent rather than uniformly wrong.
  assert.deepEqual(
    mapStatusCandidates("ready-for-development"),
    mapStatusCandidates("ready for development"),
  );
});

// --- the ordering property (zero-regression guarantee) ---------------------

test("the backlog names keep their exact leading order", () => {
  // Appending is safe, prepending is not. This asserts the prefix rather than
  // membership, so a future prepend fails here loudly.
  const list = mapStatusCandidates("ready-for-development");
  assert.deepEqual(list.slice(0, BACKLOG_ORDER.length), [...BACKLOG_ORDER]);
});

test("mapStatus() primary candidate is unchanged", () => {
  // The exported single-name view must still return what it always did.
  assert.equal(mapStatus("ready-for-development"), "To Do");
  assert.equal(mapStatus("ready for development"), "To Do");
});

test("a board with BOTH 'To Do' and a Ready* column still lands in To Do", () => {
  // The decisive regression case: a To Do-only test cannot catch a prepend,
  // because a prepended list still resolves a To Do-only board to "To Do".
  // Only a board exposing both columns distinguishes append from prepend.
  assert.equal(destination("To Do", "Ready for Development"), "To Do");
  assert.equal(destination("Ready for Development", "To Do"), "To Do");
  assert.equal(destination("To Do", "Ready"), "To Do");
});

test("dedup does not promote 'Selected for Development' past 'To Do'", () => {
  // NEW_CANDIDATES and READY_CANDIDATES share "Selected for Development".
  // Deduping a PREPENDED union promotes it from position 5 to position 3,
  // flipping a board that exposes both it and "To Do". Guard that directly.
  const list = mapStatusCandidates("ready-for-development");
  assert.ok(
    list.indexOf("To Do") < list.indexOf("Selected for Development"),
    `"To Do" must precede "Selected for Development", got ${JSON.stringify(list)}`,
  );
  assert.equal(destination("Selected for Development", "To Do"), "To Do");
});

test("every backlog-only board keeps its exact pre-fix destination", () => {
  // Each backlog name, alone, must still resolve to itself.
  for (const name of BACKLOG_ORDER) {
    assert.equal(destination(name), name, `board exposing only "${name}"`);
  }
});

test("candidate list has no duplicates", () => {
  const list = mapStatusCandidates("ready-for-development");
  assert.equal(new Set(list).size, list.length, JSON.stringify(list));
});

// --- blast radius ----------------------------------------------------------

test("statuses sharing NEW_CANDIDATES are untouched", () => {
  // The fix must rebind only the two ready-for-development keys. `draft`,
  // `planned` and the backlog aliases share the same source list and must not
  // have acquired the Ready* names.
  for (const key of ["draft", "planned", "todo", "to do", "open", "backlog"]) {
    assert.deepEqual(
      mapStatusCandidates(key),
      [...BACKLOG_ORDER],
      `status "${key}" should still resolve to NEW_CANDIDATES verbatim`,
    );
  }
});

test("the `ready` alias is unchanged", () => {
  assert.deepEqual(mapStatusCandidates("ready"), [
    "Ready",
    "Ready for Development",
    "Selected for Development",
  ]);
});
