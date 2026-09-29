// develop-loop-inline-branch.test.mjs — Step 3 states a legitimate inline route, with a checkable
// precondition and /develop's own post-conditions (task.147; obs #162).
//
// Both loop bodies said only "Invoke `/develop`". task.141 shipped a 599-line plan naming every
// hunk; its orchestrator implemented inline because `/develop` would only have re-read that plan,
// then did by hand the bookkeeping `/develop` owns — and nothing in the skill made that route
// legitimate. The loop audit passed only because the orchestrator remembered the bookkeeping.
//
// HONEST LIMIT: this holds the STATEMENT of the branch, not an orchestrator applying it. No eval
// layer runs a live orchestrator through Step 3. What it does hold mechanically:
//   - the precondition quotes the Decisions Log lines this document itself tells the step to
//     write, so renaming either log line turns this red instead of stranding the precondition;
//   - the obligation cites /develop's two checklists by labels that resolve in
//     skills/develop/SKILL.md, so a rename at either end turns this red;
//   - both loop bodies point at the branch, and the loop audit (item 2) is still there.

import test from "node:test";
import assert from "node:assert/strict";
import { readDoc } from "./lib/executed-prose.mjs";

const STEP3 = "shared/resources/develop-pipeline-step-3-develop-loop.md";
const DEVELOP = "skills/develop/SKILL.md";
const HEADING = "#### Inline implementation instead of `/develop`";

const md = readDoc(STEP3);

// Heading-bounded: from the sub-section heading to the next heading of any level ≤ 4.
function section(heading) {
  const start = md.indexOf(heading);
  assert.ok(start >= 0, `section ${JSON.stringify(heading)} not found`);
  const rest = md.slice(start + heading.length);
  const next = rest.search(/\n#{1,4} /);
  return heading + (next < 0 ? rest : rest.slice(0, next));
}

// Item N of a loop body: from `N. ` at column 0 to the next top-level numbered item.
function item(body, n) {
  const m = new RegExp(
    `^${n}\\. [\\s\\S]*?(?=^\\d+\\. |$(?![\\s\\S]))`,
    "m",
  ).exec(body);
  assert.ok(m, `item ${n} not found`);
  return m[0];
}

test("the inline sub-section states both precondition facts and the Decisions Log line", () => {
  const sec = section(HEADING);
  assert.match(sec, /Plan file found/);
  assert.match(sec, /Pre-develop surface map/);
  assert.match(sec, /Step 3 inline — \/develop not invoked/);
  assert.match(sec, /iteration 1 only/i);
  assert.match(sec, /loop audit\)? runs \*\*unchanged\*\*/);
});

test("each precondition quotes a Decisions Log line this document instructs the step to write", () => {
  const sec = section(HEADING);
  const quoted = [...sec.matchAll(/^\d\. `([^`]+)`/gm)].map((m) => m[1]);
  assert.equal(
    quoted.length,
    2,
    `expected two quoted precondition lines, found ${quoted.length}`,
  );
  const elsewhere = md.replace(sec, "");
  for (const q of quoted) {
    const stem = q.replace(/\s*…$/, "");
    assert.ok(
      elsewhere.includes(`"${stem}`),
      `precondition ${JSON.stringify(q)} is not a Decisions Log line Step 3 writes — it can never be satisfied`,
    );
  }
});

test("the obligation cites /develop's checklists by labels that resolve in skills/develop/SKILL.md", () => {
  const sec = section(HEADING);
  const develop = readDoc(DEVELOP);
  for (const label of [
    "Story Completion Checklist",
    "Task Completion Checklist",
  ]) {
    assert.ok(
      sec.includes(`**${label}**`),
      `the inline section does not cite ${label}`,
    );
    assert.ok(
      develop.includes(`**${label} — tick off each before halting:**`),
      `${DEVELOP} has no "${label}" heading line — the citation dangles`,
    );
  }
});

for (const kind of ["story", "task"]) {
  test(`the develop-${kind} loop body offers the branch at item 1 and keeps the audit at item 2`, () => {
    const body = section(`#### develop-${kind} loop body`);
    assert.match(item(body, 1), /Invoke `\/develop`/);
    assert.match(item(body, 1), /Inline implementation instead of `\/develop`/);
    assert.match(item(body, 1), /iteration 1 only/);
    assert.match(item(body, 2), /loop-audit-prompt\.md/);
  });
}

test("the Change Log paragraph assigns the one row to the inline path when /develop did not run", () => {
  const cl = section("#### Change Log");
  assert.match(cl, /On the inline path/);
  assert.match(cl, /still exactly one row/);
});
