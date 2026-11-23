"use strict";
/**
 * task.305 — `superseded` is a valid terminal task status
 * (document-status-lifecycle.md), but the Jira status map had no key for it.
 * `mapStatusCandidates` then returned the raw word, so the sync looked for a
 * Jira transition literally named "Superseded"; and `superseded` sat in neither
 * terminal set, so the statusCategory=done fallback and the negative
 * resolution were both off.
 *
 * Option A (owner decision, task.305 § 3): a superseded task lands in the
 * `cancelled` family, as a negative terminal. The same states, so the same
 * list — never a second copy of it.
 *
 * Each case below fails when its one line is removed (mutation-proved in the
 * implementation report), and each asserts behaviour — what a function returns
 * for `superseded` — not that a string appears in a source file.
 *
 * Run: node --test shared/resources/tests/jira-sync-superseded-status.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");

const lib = require(join(__dirname, "..", "jira-sync.js"));
const gh = require(join(__dirname, "..", "gh-stage.js"));
const {
  DEFAULT_STATUS_MAP,
  mapStatusCandidates,
  isTerminalLocalStatus,
  isNegativeLocalStatus,
  resolveTransition,
} = lib;

// The candidate family `cancelled` has always resolved to. Written out here so
// a change to the list itself is a visible edit to this test, not a silent
// agreement between two reads of the same variable.
const CANCELLED_FAMILY = Object.freeze([
  "Cancelled",
  "Canceled",
  "Won't Do",
  "Rejected",
  "Closed",
]);

test("mapStatusCandidates('superseded') is the cancelled family, not the raw word", () => {
  const got = mapStatusCandidates("superseded");
  assert.deepEqual(got, CANCELLED_FAMILY);
  assert.deepEqual(got, mapStatusCandidates("cancelled"));
  // The failure being fixed: an unmapped key came back as itself.
  assert.notDeepEqual(got, ["superseded"]);
});

test("the lookup ignores case and a leading emoji, as it does for every status", () => {
  assert.deepEqual(mapStatusCandidates("Superseded"), CANCELLED_FAMILY);
  assert.deepEqual(mapStatusCandidates("⛔ superseded"), CANCELLED_FAMILY);
});

test("superseded is terminal and negative; the neighbours keep their own answers", () => {
  assert.equal(isTerminalLocalStatus("superseded"), true);
  assert.equal(isNegativeLocalStatus("superseded"), true);
  // Control cases: the sets were not widened to everything.
  assert.equal(isTerminalLocalStatus("planned"), false);
  assert.equal(isNegativeLocalStatus("planned"), false);
  assert.equal(isNegativeLocalStatus("accepted"), false); // terminal, but delivered
});

test("a board with only a done-category transition is reached through the terminal fallback", () => {
  // Before the change `superseded` was not terminal, so this board matched
  // nothing and the sync reported no transition.
  const transitions = [
    {
      id: "31",
      name: "Finish",
      to: { name: "Finished", statusCategory: { key: "done" } },
    },
  ];
  const r = resolveTransition({
    transitions,
    candidates: mapStatusCandidates("superseded"),
    currentStatus: "In Progress",
    terminal: isTerminalLocalStatus("superseded"),
  });
  assert.equal(r.match && r.match.id, "31");
  assert.match(r.rule, /statusCategory=done/);
});

test("a board that offers Won't Do lands a superseded task there", () => {
  const transitions = [
    { id: "11", name: "Done", to: { name: "Done" } },
    { id: "12", name: "Won't Do", to: { name: "Won't Do" } },
  ];
  const r = resolveTransition({
    transitions,
    candidates: mapStatusCandidates("superseded"),
    currentStatus: "To Do",
    terminal: isTerminalLocalStatus("superseded"),
  });
  assert.equal(r.match && r.match.id, "12");
});

test("each of the four sync scripts resolves superseded from the shared map", () => {
  // A script loads its own bundled copy of jira-sync.js (references/), so the
  // map is a different object from the one above; `npm run bundle:check` is
  // what holds the copy to its source. What this test holds is the value each
  // script actually reads: the same map, and superseded resolved in it.
  const scripts = [
    ["sync-jira-task", "sync-jira-task.js"],
    ["sync-jira-story", "sync-jira-story.js"],
    ["sync-jira-epic", "sync-jira-epic.js"],
    ["sync-jira-bug", "sync-jira-bug.js"],
  ];
  for (const [dir, file] of scripts) {
    const mod = require(join(ROOT, "skills", dir, "scripts", file));
    assert.deepEqual(
      mod.STATUS_MAP,
      DEFAULT_STATUS_MAP,
      `${dir} must read the shared map, not carry its own`,
    );
    assert.deepEqual(
      mapStatusCandidates("superseded", mod.STATUS_MAP),
      CANCELLED_FAMILY,
      `${dir} resolves superseded to the cancelled family`,
    );
  }
});

test("no extra transition lookups: accepted, cancelled and in-progress cost what they did before", () => {
  // The count is the number of `find` calls resolveTransition makes over the
  // transition list when nothing matches: two passes over the candidates. The
  // constants were measured on develop before this change (task.305); they
  // move only if a candidate list does.
  class Counting extends Array {
    static n = 0;
    find(...a) {
      Counting.n += 1;
      return super.find(...a);
    }
  }
  const lookups = (status) => {
    Counting.n = 0;
    resolveTransition({
      transitions: Counting.from([
        { name: "x", to: { name: "y", statusCategory: { key: "new" } } },
      ]),
      candidates: mapStatusCandidates(status),
      currentStatus: "Zed",
      terminal: isTerminalLocalStatus(status),
    });
    return Counting.n;
  };
  assert.equal(lookups("accepted"), 10);
  assert.equal(lookups("cancelled"), 10);
  assert.equal(lookups("in-progress"), 8);
});

test("the generated GitHub ladder carries superseded, aimed where cancelled is", () => {
  const out = gh.renderWorkflowFile(["Backlog", "In progress", "Done"], {});
  const target = (key) => {
    const m = out.match(new RegExp(`^  ${key}: (.*)$`, "m"));
    return m ? m[1] : null;
  };
  assert.notEqual(target("cancelled"), null, "control: cancelled is written");
  assert.equal(target("superseded"), target("cancelled"));
  // A third status on the ladder: both land on the last rung when no `done`
  // moment resolved.
  assert.equal(target("superseded"), JSON.stringify("Done"));
});
