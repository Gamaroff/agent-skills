// render-task-issue-body.test.mjs — the GitHub issue body for a task keeps effort and absolute links
// (task.283; obs #34). The task.202 shape: a description spanning lines after an empty-valued key.
// The old ad-hoc `\s*` pattern crossed the newline and dropped `estimated_effort_hours`.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderTaskIssueBody,
  absolutizeLinks,
} from "../render-task-issue-body.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "render-task-issue-body.js");
const URL_ =
  "https://github.com/o/r/blob/develop/docs/tasks/task.9.x/task.9.x.md";

const doc = (criteria) =>
  [
    "---",
    "title: x",
    "description:",
    "  spans two lines",
    "priority: High",
    "estimated_effort_hours: 12",
    "category: refactoring",
    "depends_on: []",
    "---",
    "",
    "## Overview",
    "",
    "A summary with a [link](../../../README.md) and an [anchor](#top).",
    "",
    "## Success Criteria",
    "",
    ...criteria.map((c) => `- ${c}`),
    "",
  ].join("\n");

const render = (criteria) =>
  renderTaskIssueBody({
    content: doc(criteria),
    docUrl: URL_,
    relPath: "docs/tasks/task.9.x/task.9.x.md",
  });

test("keeps effort and metadata when the description spans lines (task.202 shape)", () => {
  const { reason, body } = render(["a", "b"]);
  assert.equal(reason, "ok");
  assert.match(body, /\| Effort \| 12h \|/);
  assert.match(body, /\| Priority \| High \|/);
  assert.match(body, /\| Category \| refactoring \|/);
  assert.match(body, /\| Depends on \| — \|/);
});

test("control: the old `\\s*` pattern drops the effort on the same document", () => {
  const m = /description:\s*\n[\s\S]*?estimated_effort_hours:\s*(\d+)/.exec(
    doc(["a"]),
  );
  // The shape the old script used: `key:\s*(\S*)` matched across the newline after an empty value.
  const old = /^description:\s*(\S+)/m.exec(doc(["a"]));
  assert.equal(
    old[1],
    "spans",
    "the old pattern read the next line as the value",
  );
  assert.ok(
    m,
    "document carries the effort, so the renderer losing it would be the defect",
  );
});

test("relative links become absolute against the document URL; anchors are kept", () => {
  const { body } = render(["a"]);
  assert.match(
    body,
    /\[link\]\(https:\/\/github\.com\/o\/r\/blob\/develop\/README\.md\)/,
  );
  assert.match(body, /\[anchor\]\(#top\)/);
  assert.equal(
    absolutizeLinks("[x](https://e.com/a) [m](mailto:a@b.c)", URL_),
    "[x](https://e.com/a) [m](mailto:a@b.c)",
  );
});

test('"+N more" is exact for 8 criteria and absent for 5', () => {
  const eight = render(Array.from({ length: 8 }, (_, i) => `crit ${i}`)).body;
  assert.match(eight, /\+3 more in the \[task document\]/);
  const five = render(Array.from({ length: 5 }, (_, i) => `crit ${i}`)).body;
  assert.doesNotMatch(five, /Success Criteria[\s\S]*\+\d+ more/);
  assert.match(five, /- \[ \] crit 4/);
});

test("a section's closing rule is not counted as an omitted block", () => {
  const content = doc(["a"]).replace(
    "## Success Criteria",
    "## Breaking Changes\n\nNone.\n\n---\n\n## Success Criteria",
  );
  const { body, omitted } = renderTaskIssueBody({
    content,
    docUrl: URL_,
    relPath: "p",
  });
  assert.match(body, /## Breaking Changes\n\nNone\./);
  assert.equal(omitted["Breaking Changes"], undefined);
});

test("CLI: prints the body, exit 1 with no sections, exit 2 on usage", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rtib-"));
  try {
    const f = path.join(dir, "t.md");
    fs.writeFileSync(f, doc(["a"]));
    const ok = spawnSync(
      "node",
      [SCRIPT, "--file", f, "--doc-url", URL_, "--rel-path", "p"],
      { encoding: "utf8" },
    );
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /^## Summary/);
    fs.writeFileSync(f, "---\ntitle: x\n---\n\n## Other\n\ntext\n");
    const none = spawnSync(
      "node",
      [SCRIPT, "--file", f, "--doc-url", URL_, "--rel-path", "p"],
      { encoding: "utf8" },
    );
    assert.equal(none.status, 1);
    assert.equal(spawnSync("node", [SCRIPT], { encoding: "utf8" }).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
