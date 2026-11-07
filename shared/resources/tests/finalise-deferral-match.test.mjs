/**
 * Behavioural tests for `finalise-deferral-match.js` (task 271, Arm 3). Each test runs the CLI
 * against throwaway gate and work-item files and asserts its exit code and `reason`.
 *
 * The matching case is held beside an unmatched control for every refusal the arm makes (no
 * approver, an approver who is not the owner, a different case id, no task, no date, no approver
 * configured), because a matcher that only ever accepts cannot be told from one that accepts
 * everything.
 *
 * Fixture names here are placeholders ("Pat Owner", "task.901"): the banned-name guard
 * (tests/no-consumer-names.test.js) scans shipped files, and these are shipped.
 *
 * Run via: CI=true node --test shared/resources/tests/finalise-deferral-match.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "finalise-deferral-match.js");
const require_ = (await import("node:module")).createRequire(import.meta.url);
const eng = require_(CLI);

const CASE = "oc10-second-findings-cut-short";
const OWNER = "Pat Owner";

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "fin-defer-"));
  const paths = {};
  for (const [name, body] of Object.entries(files)) {
    paths[name] = join(dir, name);
    writeFileSync(paths[name], body);
  }
  return { dir, paths };
}
const cleanup = (dir) =>
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

function run(args) {
  const r = spawnSync("node", [CLI, ...args, "--json"], { encoding: "utf8" });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* exit 2 prints usage on stderr */
  }
  return { status: r.status, json, stderr: r.stderr };
}

const gate = (entry) =>
  `schema: 1\ngate: PASS\nrecommendations:\n  immediate: []\n  future:\n${entry}`;

const GOOD_GATE_ENTRY = [
  `    - action: 'Deferred: ${CASE} reproduces; replace the awk with a parser'`,
  `      deferred_to: task.901`,
  `      approved_by: ${OWNER}`,
  `      approved_on: 2026-10-28`,
  ``,
].join("\n");

const workItem = (bullet) =>
  `# T\n\n## Deferred Work\n\n${bullet}\n\n## Change Log\n`;
const GOOD_BULLET = `- **CR10-1**, reproduced by \`${CASE}\`: deferred to task.901, approved by ${OWNER} on 2026-10-28.`;

// ── the matching cases ────────────────────────────────────────────────────

test("gate record: id, task, owner approver and date match (exit 0) and render the DoD line", () => {
  const { dir, paths } = fixture({ "g.yml": gate(GOOD_GATE_ENTRY) });
  try {
    const r = run([
      "--case",
      CASE,
      "--gate",
      paths["g.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 0);
    assert.equal(r.json.reason, "matched");
    assert.equal(
      r.json.rendered,
      "deferred (owner Pat Owner, 2026-10-28, task.901)",
    );
    assert.match(r.json.source, /recommendations\.future\[0\]/);
  } finally {
    cleanup(dir);
  }
});

test("work-item record: a Deferred Work bullet with task, approver and date matches", () => {
  const { dir, paths } = fixture({ "w.md": workItem(GOOD_BULLET) });
  try {
    const r = run([
      "--case",
      CASE,
      "--work-item",
      paths["w.md"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 0);
    assert.equal(r.json.reason, "matched");
    assert.equal(r.json.task, "task.901");
  } finally {
    cleanup(dir);
  }
});

test("a continuation line of the bullet is read as part of it", () => {
  const bullet = `- **CR10-1**, reproduced by \`${CASE}\`:\n  deferred to task.901,\n  approved by ${OWNER} on 2026-10-28.`;
  const { dir, paths } = fixture({ "w.md": workItem(bullet) });
  try {
    const r = run([
      "--case",
      CASE,
      "--work-item",
      paths["w.md"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.json.reason, "matched");
  } finally {
    cleanup(dir);
  }
});

test("either source suffices: the gate holds nothing, the work item holds the record", () => {
  const { dir, paths } = fixture({
    "g.yml": gate("    - action: 'unrelated'\n      refs: []\n"),
    "w.md": workItem(GOOD_BULLET),
  });
  try {
    const r = run([
      "--case",
      CASE,
      "--gate",
      paths["g.yml"],
      "--work-item",
      paths["w.md"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.json.reason, "matched");
    assert.match(r.json.source, /work item/);
  } finally {
    cleanup(dir);
  }
});

// ── the unmatched controls ────────────────────────────────────────────────

test("control: no approver recorded is unapproved (exit 1)", () => {
  const entry = `    - action: '${CASE} reproduces'\n      deferred_to: task.901\n      approved_on: 2026-10-28\n`;
  const { dir, paths } = fixture({ "g.yml": gate(entry) });
  try {
    const r = run([
      "--case",
      CASE,
      "--gate",
      paths["g.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "unapproved");
    assert.match(r.json.detail, /no approver named/);
  } finally {
    cleanup(dir);
  }
});

test("control: an approver who is not the owner is unapproved", () => {
  const { dir, paths } = fixture({
    "g.yml": gate(GOOD_GATE_ENTRY.replace(OWNER, "Sam Agent")),
  });
  try {
    const r = run([
      "--case",
      CASE,
      "--gate",
      paths["g.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "unapproved");
    assert.match(r.json.detail, /not on the owner list/);
  } finally {
    cleanup(dir);
  }
});

test("control: a different case id is no-match, even when another case is deferred and approved", () => {
  const { dir, paths } = fixture({ "g.yml": gate(GOOD_GATE_ENTRY) });
  try {
    const r = run([
      "--case",
      "oc10-some-other-case",
      "--gate",
      paths["g.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "no-match");
  } finally {
    cleanup(dir);
  }
});

test("control: the id is matched as a whole token, never as a prefix or substring of a longer id", () => {
  const { dir, paths } = fixture({ "g.yml": gate(GOOD_GATE_ENTRY) });
  try {
    // The record names oc10-second-findings-cut-short; neither a prefix nor an extension may match it.
    for (const id of [
      "oc10-second",
      "oc10-second-findings-cut-short-2",
      "second-findings-cut-short",
    ]) {
      const r = run([
        "--case",
        id,
        "--gate",
        paths["g.yml"],
        "--approver",
        OWNER,
      ]);
      assert.equal(r.json.reason, "no-match", id);
    }
  } finally {
    cleanup(dir);
  }
});

test("control: a record with no follow-up task, or a malformed date, is unapproved", () => {
  const noTask = gate(
    GOOD_GATE_ENTRY.replace("deferred_to: task.901", "deferred_to: later"),
  );
  const badDate = gate(GOOD_GATE_ENTRY.replace("2026-10-28", "28 Oct"));
  const { dir, paths } = fixture({ "a.yml": noTask, "b.yml": badDate });
  try {
    const a = run([
      "--case",
      CASE,
      "--gate",
      paths["a.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(a.json.reason, "unapproved");
    assert.match(a.json.detail, /no follow-up task/);
    const b = run([
      "--case",
      CASE,
      "--gate",
      paths["b.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(b.json.reason, "unapproved");
    assert.match(b.json.detail, /no approval date/);
  } finally {
    cleanup(dir);
  }
});

test("control: an impossible, rolled-over or future approval date is unapproved (T271-QA-3)", () => {
  const tomorrow = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 10);
  const dates = ["2026-13-45", "0000-00-00", "2026-02-31", tomorrow];
  const files = {};
  dates.forEach((d, i) => {
    files[`d${i}.yml`] = gate(GOOD_GATE_ENTRY.replace("2026-10-28", d));
  });
  files["ok.yml"] = gate(GOOD_GATE_ENTRY);
  const { dir, paths } = fixture(files);
  try {
    dates.forEach((d, i) => {
      const r = run([
        "--case",
        CASE,
        "--gate",
        paths[`d${i}.yml`],
        "--approver",
        OWNER,
      ]);
      assert.equal(r.json.reason, "unapproved", `date ${d}`);
      assert.match(r.json.detail, /no approval date/, `date ${d}`);
    });
    const ok = run([
      "--case",
      CASE,
      "--gate",
      paths["ok.yml"],
      "--approver",
      OWNER,
    ]);
    assert.equal(ok.json.reason, "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: a follow-up task must be a positive integer without leading zeros or a glued suffix", () => {
  for (const t of ["task.0", "task.007", "task.9999999999"]) {
    assert.equal(
      eng.judge({ task: t, owner: OWNER, date: "2026-10-28" }, [OWNER]).ok,
      false,
      t,
    );
  }
  assert.equal(
    eng.judge({ task: "task.240", owner: OWNER, date: "2026-10-28" }, [OWNER])
      .ok,
    true,
  );
  const bullet = `- **CR10-1**, reproduced by \`${CASE}\`: deferred to task.240abc, approved by ${OWNER} on 2026-10-28.`;
  const { dir, paths } = fixture({ "w.md": workItem(bullet) });
  try {
    const r = run([
      "--case",
      CASE,
      "--work-item",
      paths["w.md"],
      "--approver",
      OWNER,
    ]);
    assert.notEqual(r.json.reason, "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: a bullet that is not the one accepted form never matches (T271-QA-5, T271-QA-6)", () => {
  const ok = "approved by " + OWNER + " on 2026-10-28.";
  const bullets = {
    negated: `- \`${CASE}\`: NOT deferred to task.901; was not approved by ${OWNER} on 2026-10-28.`,
    "negated, contiguous": `- \`${CASE}\`: NOT deferred to task.901, ${ok}`,
    "quoted approval": `- \`${CASE}\`: deferred to task.901; the approval by ${OWNER} on 2026-10-28 was a quote from Sam.`,
    "second clause": `- \`${CASE}\`: deferred to task.901, ${ok} Later: deferred to task.902, ${ok}`,
    "two case ids": `- \`${CASE}\` and \`other-case\`: deferred to task.901, ${ok}`,
    "bare id, no backticks": `- ${CASE}: deferred to task.901, ${ok}`,
    "text after the date": `- \`${CASE}\`: deferred to task.901, approved by ${OWNER} on 2026-10-28 unless Sam objects.`,
  };
  const files = {};
  Object.entries(bullets).forEach(([k, b], i) => {
    files[`b${i}.md`] = workItem(b);
  });
  files["comment.md"] =
    `# T\n\n## Deferred Work\n\n<!--\n${GOOD_BULLET}\n-->\n`;
  files["unterminated.md"] = `# T\n\n## Deferred Work\n\n<!-- ${GOOD_BULLET}\n`;
  files["good.md"] = workItem(GOOD_BULLET);
  // A closed comment hides only itself: the honest bullet after it still counts.
  files["after-comment.md"] =
    `# T\n\n## Deferred Work\n\n<!-- a note -->\n${GOOD_BULLET}\n`;
  const { dir, paths } = fixture(files);
  try {
    Object.keys(bullets).forEach((k, i) => {
      const r = run([
        "--case",
        CASE,
        "--work-item",
        paths[`b${i}.md`],
        "--approver",
        OWNER,
      ]);
      assert.notEqual(r.json.reason, "matched", k);
      assert.equal(r.status, 1, k);
    });
    for (const f of ["comment.md", "unterminated.md"]) {
      const r = run([
        "--case",
        CASE,
        "--work-item",
        paths[f],
        "--approver",
        OWNER,
      ]);
      assert.equal(r.json.reason, "no-match", f);
    }
    const after = run([
      "--case",
      CASE,
      "--work-item",
      paths["after-comment.md"],
      "--approver",
      OWNER,
    ]);
    assert.equal(after.json.reason, "matched");
    // The unmatched control: the one accepted form still matches.
    const ok2 = run([
      "--case",
      CASE,
      "--work-item",
      paths["good.md"],
      "--approver",
      OWNER,
    ]);
    assert.equal(ok2.json.reason, "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: a work-item bullet outside the Deferred Work H2 is not read", () => {
  const doc = `# T\n\n## Notes\n\n${GOOD_BULLET}\n\n## Deferred Work\n\n- nothing here\n`;
  const { dir, paths } = fixture({ "w.md": doc });
  try {
    const r = run([
      "--case",
      CASE,
      "--work-item",
      paths["w.md"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 1);
    assert.equal(r.json.reason, "no-match");
  } finally {
    cleanup(dir);
  }
});

test("control: with no owner configured nothing matches, even a fully recorded deferral", () => {
  const { dir, paths } = fixture({ "g.yml": gate(GOOD_GATE_ENTRY) });
  try {
    const none = run(["--case", CASE, "--gate", paths["g.yml"]]);
    assert.equal(none.status, 1);
    assert.equal(none.json.reason, "no-approver-configured");
    const blank = run([
      "--case",
      CASE,
      "--gate",
      paths["g.yml"],
      "--approver",
      "  ",
    ]);
    assert.equal(blank.json.reason, "no-approver-configured");
  } finally {
    cleanup(dir);
  }
});

test("control: an unreadable source is unverifiable (exit 1), never a pass", () => {
  const r = run([
    "--case",
    CASE,
    "--gate",
    "/nonexistent/gate.yml",
    "--approver",
    OWNER,
  ]);
  assert.equal(r.status, 1);
  assert.equal(r.json.reason, "unverifiable");
});

test("usage: a missing case, a missing source and a bad id exit 2", () => {
  assert.equal(run(["--gate", "x", "--approver", OWNER]).status, 2);
  assert.equal(run(["--case", CASE, "--approver", OWNER]).status, 2);
  assert.equal(
    run(["--case", "bad id!", "--gate", "x", "--approver", OWNER]).status,
    2,
  );
});

test("an approver name compares exactly, not by prefix", () => {
  assert.equal(
    eng.judge({ task: "task.1", owner: "Pat Owner Jr", date: "2026-01-01" }, [
      OWNER,
    ]).ok,
    false,
  );
  assert.equal(
    eng.judge({ task: "task.1", owner: "pat owner", date: "2026-01-01" }, [
      OWNER,
    ]).ok,
    true,
  );
});
