/**
 * Behavioural tests for `finalise-deferral-match.js` (task 271, Arm 3). Each test runs the CLI
 * against throwaway deferral-record files and asserts its exit code and `reason`.
 *
 * The matching case is held beside an unmatched control for every refusal the arm makes (no
 * approver, an approver who is not the owner, a different case id, no task, no date, no approver
 * configured), because a matcher that only ever accepts cannot be told from one that accepts
 * everything.
 *
 * The record is a JSON file read with JSON.parse. Two earlier readers (a Markdown section, then a
 * QA gate's YAML through a hand-rolled parser) each lost to a spelling the reader and a real reader
 * disagreed on, sixteen gates running; JSON has one grammar, so the tests here pin the shape rules
 * (repeated keys, unknown fields, wrong types) rather than a list of spellings. The retired
 * `--gate` and `--work-item` flags exit 2.
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

const entry = (over = {}) => ({
  case: CASE,
  deferred_to: "task.901",
  approved_by: OWNER,
  approved_on: "2026-10-28",
  ...over,
});
const record = (...entries) => JSON.stringify({ deferrals: entries });

/** Run the CLI on a set of named record files; returns a function name -> reason. */
function reasons(files) {
  const { dir, paths } = fixture(files);
  const go = (f, id = CASE) =>
    run(["--case", id, "--record", paths[f], "--approver", OWNER]).json.reason;
  return { go, dir, paths };
}

// ── the matching case ─────────────────────────────────────────────────────

test("record: id, task, owner approver and date match (exit 0) and render the DoD line", () => {
  const { dir, paths } = fixture({ "r.json": record(entry()) });
  try {
    const r = run([
      "--case",
      CASE,
      "--record",
      paths["r.json"],
      "--approver",
      OWNER,
    ]);
    assert.equal(r.status, 0);
    assert.equal(r.json.reason, "matched");
    assert.equal(
      r.json.rendered,
      "deferred (owner Pat Owner, 2026-10-28, task.901)",
    );
    assert.match(r.json.source, /deferrals\[0\]/);
  } finally {
    cleanup(dir);
  }
});

// ── the unmatched controls ────────────────────────────────────────────────

test("control: no approver recorded is unapproved (exit 1)", () => {
  const e = entry();
  delete e.approved_by;
  const { dir, paths } = fixture({ "r.json": record(e) });
  try {
    const r = run([
      "--case",
      CASE,
      "--record",
      paths["r.json"],
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
  const { go, dir } = reasons({
    "r.json": record(entry({ approved_by: "Sam Agent" })),
  });
  try {
    assert.equal(go("r.json"), "unapproved");
  } finally {
    cleanup(dir);
  }
});

test("control: a different case id is no-match, even when another case is deferred and approved", () => {
  const { go, dir } = reasons({ "r.json": record(entry()) });
  try {
    assert.equal(go("r.json", "oc10-some-other-case"), "no-match");
  } finally {
    cleanup(dir);
  }
});

test("control: the id is matched exactly, never as a prefix or substring of a longer id", () => {
  const { go, dir } = reasons({ "r.json": record(entry()) });
  try {
    for (const id of [
      "oc10-second",
      "oc10-second-findings-cut-short-2",
      "second-findings-cut-short",
      "OC10-SECOND-FINDINGS-CUT-SHORT",
    ]) {
      assert.equal(go("r.json", id), "no-match", id);
    }
  } finally {
    cleanup(dir);
  }
});

test("control: a record with no follow-up task, or a malformed date, is unapproved", () => {
  const { go, dir, paths } = reasons({
    "a.json": record(entry({ deferred_to: "later" })),
    "b.json": record(entry({ approved_on: "28 Oct" })),
  });
  try {
    assert.equal(go("a.json"), "unapproved");
    assert.match(
      run(["--case", CASE, "--record", paths["a.json"], "--approver", OWNER])
        .json.detail,
      /no follow-up task/,
    );
    assert.equal(go("b.json"), "unapproved");
    assert.match(
      run(["--case", CASE, "--record", paths["b.json"], "--approver", OWNER])
        .json.detail,
      /no approval date/,
    );
  } finally {
    cleanup(dir);
  }
});

test("control: an impossible, rolled-over or future approval date is unapproved (T271-QA-3)", () => {
  const tomorrow = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 10);
  const dates = ["2026-13-45", "0000-00-00", "2026-02-31", tomorrow];
  const files = { "ok.json": record(entry()) };
  dates.forEach((d, i) => {
    files[`d${i}.json`] = record(entry({ approved_on: d }));
  });
  const { go, dir } = reasons(files);
  try {
    dates.forEach((d, i) => assert.equal(go(`d${i}.json`), "unapproved", d));
    assert.equal(go("ok.json"), "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: a follow-up task must be a positive integer without leading zeros or a glued suffix", () => {
  for (const t of ["task.0", "task.007", "task.9999999999", "task.240abc"]) {
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
});

test("control: with no owner configured nothing matches, even a fully recorded deferral", () => {
  const { dir, paths } = fixture({ "r.json": record(entry()) });
  try {
    const none = run(["--case", CASE, "--record", paths["r.json"]]);
    assert.equal(none.status, 1);
    assert.equal(none.json.reason, "no-approver-configured");
    const blank = run([
      "--case",
      CASE,
      "--record",
      paths["r.json"],
      "--approver",
      "  ",
    ]);
    assert.equal(blank.json.reason, "no-approver-configured");
  } finally {
    cleanup(dir);
  }
});

test("control: an unreadable record is unverifiable (exit 1), never a pass", () => {
  const r = run([
    "--case",
    CASE,
    "--record",
    "/nonexistent/deferrals.json",
    "--approver",
    OWNER,
  ]);
  assert.equal(r.status, 1);
  assert.equal(r.json.reason, "unverifiable");
});

test("usage: a missing case, a missing record, a bad id and the retired --gate and --work-item flags exit 2", () => {
  assert.equal(run(["--record", "x", "--approver", OWNER]).status, 2);
  assert.equal(run(["--case", CASE, "--approver", OWNER]).status, 2);
  assert.equal(
    run(["--case", "bad id!", "--record", "x", "--approver", OWNER]).status,
    2,
  );
  const { dir, paths } = fixture({ "r.json": record(entry()) });
  try {
    for (const flag of ["--gate", "--work-item"]) {
      const r = run([
        "--case",
        CASE,
        "--record",
        paths["r.json"],
        flag,
        paths["r.json"],
        "--approver",
        OWNER,
      ]);
      assert.equal(r.status, 2, flag);
      assert.match(r.stderr, /unknown argument/, flag);
    }
    // Control: without a retired flag the same record matches.
    assert.equal(
      run(["--case", CASE, "--record", paths["r.json"], "--approver", OWNER])
        .status,
      0,
    );
  } finally {
    cleanup(dir);
  }
});

// ── the approver compares exactly ─────────────────────────────────────────

test("the record's approver compares exactly - no prefix, case, whitespace, wrapper or Unicode folding", () => {
  const ok = (owner) =>
    eng.judge({ task: "task.1", owner, date: "2026-01-01" }, [OWNER]).ok;
  assert.equal(ok("Pat Owner"), true);
  for (const name of [
    "Pat Owner Jr",
    "pat owner",
    "PAT OWNER",
    "Pat Owner ",
    " Pat Owner",
    "`Pat Owner`",
    '"Pat Owner"',
    "'Pat Owner'",
    "Pat Owner_",
    "Pat Owner*",
    "_Pat Owner",
    "**Pat Owner",
    "Pat Owner",
  ]) {
    assert.equal(ok(name), false, JSON.stringify(name));
  }
  // The Kelvin sign (U+212A) folds onto "K": a lookalike is not the owner.
  assert.equal(
    eng.judge({ task: "task.1", owner: "Ken Owner", date: "2026-01-01" }, [
      "Ken Owner",
    ]).ok,
    false,
  );
  // Control: the CONFIGURED list may be written with one wrapper pair, as before.
  assert.equal(
    eng.judge({ task: "task.1", owner: OWNER, date: "2026-01-01" }, [
      "`Pat Owner`",
    ]).ok,
    true,
  );
});

// ── every record that names the case must approve it ──────────────────────

test("control: every record for the case must approve it and agree on the task; a stray mention blocks (T271-QA-12)", () => {
  const { go, dir, paths } = reasons({
    "mention.json": record(
      entry(),
      entry({ case: "other", approved_by: `withdraw ${CASE}` }),
    ),
    "tasks.json": record(entry(), entry({ deferred_to: "task.902" })),
    "twice.json": record(entry(), entry({ approved_on: "2026-10-29" })),
    "unapproved-twin.json": record(entry(), entry({ approved_by: "Eve" })),
    "good.json": record(entry()),
    "other-case.json": record(entry(), entry({ case: "other" })),
    "longer.json": record(entry(), entry({ case: `${CASE}-2` })),
  });
  try {
    assert.equal(go("mention.json"), "unapproved");
    assert.equal(go("tasks.json"), "unapproved");
    assert.match(
      run([
        "--case",
        CASE,
        "--record",
        paths["tasks.json"],
        "--approver",
        OWNER,
      ]).json.detail,
      /disagree/,
    );
    assert.equal(go("unapproved-twin.json"), "unapproved");
    // Controls: two agreeing records, one record, an unrelated entry and a longer id still match.
    for (const f of ["twice", "good", "other-case", "longer"])
      assert.equal(go(`${f}.json`), "matched", f);
  } finally {
    cleanup(dir);
  }
});

test("a deferral is withdrawn by removing or editing its entry - the file is the only record read", () => {
  const { go, dir } = reasons({
    "present.json": record(entry()),
    "removed.json": record(entry({ case: "other" })),
    "empty.json": record(),
    "edited.json": record(entry({ approved_by: "Sam Agent" })),
  });
  try {
    assert.equal(go("present.json"), "matched");
    assert.equal(go("removed.json"), "no-match");
    assert.equal(go("empty.json"), "no-match");
    assert.equal(go("edited.json"), "unapproved");
  } finally {
    cleanup(dir);
  }
});

// ── the shape rules: what is not the accepted shape is unverifiable ───────

test("control: a file that is not the accepted shape is unverifiable, never a match", () => {
  const good = record(entry());
  const { go, dir } = reasons({
    "empty.json": "",
    "notjson.json": "deferrals: []",
    "trailing.json": `${good}x`,
    "bom.json": `﻿${good}`,
    "array-root.json": "[]",
    "extra-root.json": JSON.stringify({ deferrals: [entry()], note: "x" }),
    "not-list.json": JSON.stringify({ deferrals: entry() }),
    "entry-string.json": JSON.stringify({ deferrals: ["x"] }),
    "unknown-field.json": record(entry({ note: "withdrawn" })),
    "proto.json": `{"deferrals":[{"case":"${CASE}","deferred_to":"task.901","approved_by":"${OWNER}","approved_on":"2026-10-28","__proto__":"x"}]}`,
    "number.json": record(entry({ deferred_to: 901 })),
    "null.json": record(entry({ approved_by: null })),
    // Control: the accepted shape, once.
    "good.json": good,
  });
  try {
    for (const f of [
      "empty",
      "notjson",
      "trailing",
      "bom",
      "array-root",
      "extra-root",
      "not-list",
      "entry-string",
      "unknown-field",
      "proto",
      "number",
      "null",
    ])
      assert.equal(go(`${f}.json`), "unverifiable", f);
    assert.equal(go("good.json"), "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: a repeated key is ambiguous - JSON.parse keeps the last, other readers the first - and is unverifiable (T271-QA-28)", () => {
  const e = (a, b) =>
    `{"deferrals":[{"case":"${CASE}","deferred_to":"task.901",${a}"approved_by":"${OWNER}",${b}"approved_on":"2026-10-28"}]}`;
  const { go, dir } = reasons({
    "by.json": e('"approved_by":"Eve",', ""),
    "by-escaped.json": e('"approved_\\u0062y":"Eve",', ""),
    "task.json": `{"deferrals":[{"case":"${CASE}","deferred_to":"task.5","deferred_to":"task.901","approved_by":"${OWNER}","approved_on":"2026-10-28"}]}`,
    "root.json": `{"deferrals":[],"deferrals":[{"case":"${CASE}","deferred_to":"task.901","approved_by":"${OWNER}","approved_on":"2026-10-28"}]}`,
    // Controls: the same key in different objects is not a repeat; a key text inside a string is not a key.
    "ok.json": record(entry(), entry({ case: "other" })),
    "in-string.json": record(
      entry({ approved_by: OWNER }),
      entry({ case: "other", approved_by: '"approved_by":' }),
    ),
  });
  try {
    for (const f of ["by", "by-escaped", "task", "root"])
      assert.equal(go(`${f}.json`), "unverifiable", f);
    assert.equal(go("ok.json"), "matched");
    assert.equal(go("in-string.json"), "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: an escape in a value is decoded before the id is compared, so it cannot hide a record (T271-QA-34)", () => {
  // "oc-1" is oc-1 to every JSON reader.
  const { go, dir } = reasons({
    "esc-case.json": `{"deferrals":[{"case":"oc10\\u002dx","deferred_to":"task.901","approved_by":"${OWNER}","approved_on":"2026-10-28"},{"case":"other","deferred_to":"task.9","approved_by":"Eve oc10\\u002dx","approved_on":"2026-10-28"}]}`,
    "esc-ok.json": `{"deferrals":[{"case":"oc10\\u002dx","deferred_to":"task.901","approved_by":"${OWNER}","approved_on":"2026-10-28"}]}`,
  });
  try {
    assert.equal(go("esc-case.json", "oc10-x"), "unapproved");
    // Control: the escaped spelling of the case id alone matches the plain id.
    assert.equal(go("esc-ok.json", "oc10-x"), "matched");
  } finally {
    cleanup(dir);
  }
});

test("findDuplicateKey reads keys, not strings: braces, colons and quotes inside a string are not structure", () => {
  assert.equal(eng.findDuplicateKey('{"a":"{\\"a\\":1}","b":1}'), null);
  assert.equal(
    eng.findDuplicateKey('{"a":[{"a":1},{"a":2}],"b":{"a":3}}'),
    null,
  );
  assert.equal(eng.findDuplicateKey('{"a":1,"b":{"c":1,"c":2}}'), "c");
  assert.equal(eng.findDuplicateKey('{ "a" : 1 , "a" : 2 }'), "a");
});
