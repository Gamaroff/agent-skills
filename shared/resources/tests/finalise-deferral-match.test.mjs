/**
 * Behavioural tests for `finalise-deferral-match.js` (task 271, Arm 3). Each test runs the CLI
 * against throwaway gate files and asserts its exit code and `reason`.
 *
 * The matching case is held beside an unmatched control for every refusal the arm makes (no
 * approver, an approver who is not the owner, a different case id, no task, no date, no approver
 * configured), because a matcher that only ever accepts cannot be told from one that accepts
 * everything.
 *
 * Arm 3 reads the structured QA gate only. A work item's prose is not read: QA gates 4-12 each found
 * another Markdown spelling of the section that the matcher missed, so the free-text source was
 * dropped, and `--work-item` is refused (exit 2) so a stale caller learns the contract changed.
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
  `      case: ${CASE}`,
  `      deferred_to: task.901`,
  `      approved_by: ${OWNER}`,
  `      approved_on: 2026-10-28`,
  ``,
].join("\n");

/** Run the CLI on a set of named gate files; returns a function name -> reason. */
function reasons(files) {
  const { dir, paths } = fixture(files);
  const go = (f, id = CASE) =>
    run(["--case", id, "--gate", paths[f], "--approver", OWNER]).json.reason;
  return { go, dir, paths };
}

// ── the matching case ─────────────────────────────────────────────────────

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

// ── the unmatched controls ────────────────────────────────────────────────

test("control: no approver recorded is unapproved (exit 1)", () => {
  const entry = `    - action: '${CASE} reproduces'\n      case: ${CASE}\n      deferred_to: task.901\n      approved_on: 2026-10-28\n`;
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
  const files = { "ok.yml": gate(GOOD_GATE_ENTRY) };
  dates.forEach((d, i) => {
    files[`d${i}.yml`] = gate(GOOD_GATE_ENTRY.replace("2026-10-28", d));
  });
  const { go, dir } = reasons(files);
  try {
    dates.forEach((d, i) => assert.equal(go(`d${i}.yml`), "unapproved", d));
    assert.equal(go("ok.yml"), "matched");
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
  const { go, dir } = reasons({
    "suffix.yml": gate(
      GOOD_GATE_ENTRY.replace(
        "deferred_to: task.901",
        "deferred_to: task.240abc",
      ),
    ),
  });
  try {
    assert.equal(go("suffix.yml"), "unapproved");
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

test("control: an unreadable gate is unverifiable (exit 1), never a pass", () => {
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

test("usage: a missing case, a missing gate, a bad id and the retired --work-item flag exit 2", () => {
  assert.equal(run(["--gate", "x", "--approver", OWNER]).status, 2);
  assert.equal(run(["--case", CASE, "--approver", OWNER]).status, 2);
  assert.equal(
    run(["--case", "bad id!", "--gate", "x", "--approver", OWNER]).status,
    2,
  );
  // A work item is no longer a source: a caller still passing it must fail loudly, not be ignored,
  // and a work item carrying a perfect bullet must not turn a no-match into a deferral.
  const { dir, paths } = fixture({
    "w.md": `# T\n\n## Deferred Work\n\n- \`${CASE}\`: deferred to task.901, approved by ${OWNER} on 2026-10-28.\n`,
    "g.yml": gate("    - action: unrelated\n"),
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
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown argument "--work-item"/);
    assert.equal(
      run(["--case", CASE, "--work-item", paths["w.md"], "--approver", OWNER])
        .status,
      2,
    );
    // Control: the gate alone, with no record, is a plain no-match.
    assert.equal(
      run(["--case", CASE, "--gate", paths["g.yml"], "--approver", OWNER]).json
        .reason,
      "no-match",
    );
  } finally {
    cleanup(dir);
  }
});

test("an approver name compares exactly, not by prefix", () => {
  assert.equal(
    eng.judge({ task: "task.1", owner: "Pat Owner Jr", date: "2026-01-01" }, [
      OWNER,
    ]).ok,
    false,
  );
  for (const name of ["pat owner", "PAT OWNER", "Pat Owner "]) {
    assert.equal(
      eng.judge({ task: "task.1", owner: name, date: "2026-01-01" }, [OWNER])
        .ok,
      name === "Pat Owner ",
      JSON.stringify(name),
    );
  }
  assert.equal(
    // The Kelvin sign (U+212A) folds onto "K": a lookalike is not the owner.
    eng.judge({ task: "task.1", owner: "Ken Owner", date: "2026-01-01" }, [
      "Ken Owner",
    ]).ok,
    false,
  );
});

test("control: an approver is never matched by stripping trailing markup characters (T271-QA-14)", () => {
  for (const n of ["Pat Owner_", "Pat Owner*", "_Pat Owner", "**Pat Owner"]) {
    assert.equal(
      eng.judge({ task: "task.1", owner: n, date: "2026-01-01" }, [OWNER]).ok,
      false,
      n,
    );
  }
  for (const n of ["`Pat Owner`", '"Pat Owner"', "'Pat Owner'", "Pat Owner"]) {
    assert.equal(
      eng.judge({ task: "task.1", owner: n, date: "2026-01-01" }, [OWNER]).ok,
      true,
      n,
    );
  }
});

// ── every record that names the case must approve it ──────────────────────

test("control: every record that names the case must approve it - a prose mention and a task disagreement block (T271-QA-12)", () => {
  const mentionOnly = gate(
    GOOD_GATE_ENTRY +
      `    - action: 'Do NOT defer ${CASE}; fix it now'\n      deferred_to: task.901\n      approved_by: ${OWNER}\n      approved_on: 2026-10-28\n`,
  );
  const otherTask = gate(
    GOOD_GATE_ENTRY +
      `    - action: second\n      case: ${CASE}\n      deferred_to: task.902\n      approved_by: ${OWNER}\n      approved_on: 2026-10-29\n`,
  );
  const sameTwice = gate(
    GOOD_GATE_ENTRY +
      `    - action: second\n      case: ${CASE}\n      deferred_to: task.901\n      approved_by: ${OWNER}\n      approved_on: 2026-10-29\n`,
  );
  const { go, dir, paths } = reasons({
    "mention.yml": mentionOnly,
    "tasks.yml": otherTask,
    "twice.yml": sameTwice,
    "good.yml": gate(GOOD_GATE_ENTRY),
  });
  try {
    assert.equal(go("mention.yml"), "unapproved");
    assert.equal(go("tasks.yml"), "unapproved");
    assert.match(
      run(["--case", CASE, "--gate", paths["tasks.yml"], "--approver", OWNER])
        .json.detail,
      /disagree/,
    );
    // Controls: two agreeing records, and the single record, still match.
    assert.equal(go("twice.yml"), "matched");
    assert.equal(go("good.yml"), "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: a gate entry is matched on its own case field, not on a mention in its prose (T271-QA-12)", () => {
  const { go, dir } = reasons({
    "g.yml": gate(GOOD_GATE_ENTRY.replace(`      case: ${CASE}\n`, "")),
  });
  try {
    assert.equal(go("g.yml"), "unapproved");
  } finally {
    cleanup(dir);
  }
});

test("a deferral is withdrawn by removing or editing its gate entry - the only record that is read", () => {
  const { go, dir } = reasons({
    "present.yml": gate(GOOD_GATE_ENTRY),
    "removed.yml": gate("    - action: unrelated\n"),
    "edited.yml": gate(GOOD_GATE_ENTRY.replace(OWNER, "Sam Agent")),
  });
  try {
    assert.equal(go("present.yml"), "matched");
    assert.equal(go("removed.yml"), "no-match");
    assert.equal(go("edited.yml"), "unapproved");
  } finally {
    cleanup(dir);
  }
});

// ── the parser drops text it cannot read: the whole gate is reconciled ────

test("control: text the gate reader cannot parse that names the case blocks (T271-QA-13)", () => {
  const withdrawn = gate(
    GOOD_GATE_ENTRY +
      `    - action: >-\n        ${CASE} deferral withdrawn by the owner\n      refs: []\n`,
  );
  const caseLost = gate(
    `    - action: |\n        note\n      case: ${CASE}\n      deferred_to: task.901\n      approved_by: ${OWNER}\n      approved_on: 2026-10-28\n`,
  );
  const unrelatedBlock = gate(
    GOOD_GATE_ENTRY +
      `    - action: >-\n        something about another case\n      refs: []\n`,
  );
  const { go, dir, paths } = reasons({
    "w.yml": withdrawn,
    "c.yml": caseLost,
    "u.yml": unrelatedBlock,
  });
  try {
    assert.equal(go("w.yml"), "unapproved");
    assert.match(
      run(["--case", CASE, "--gate", paths["w.yml"], "--approver", OWNER]).json
        .detail,
      /could not parse/,
    );
    assert.equal(go("c.yml"), "unapproved");
    assert.equal(go("u.yml"), "matched");
  } finally {
    cleanup(dir);
  }
});

test("control: no line shape hides a lost withdrawal - the whole gate is reconciled (T271-QA-15, T271-QA-16, T271-QA-17)", () => {
  const lost = `    - action: >-\n        ${CASE} deferral withdrawn by the owner\n      refs: []\n`;
  const afterComment = gate(`${GOOD_GATE_ENTRY}# note\n${lost}`);
  const earlierFutureKey = `schema: 1\nnfr:\n  future:\nrecommendations:\n  future:\n${GOOD_GATE_ENTRY}${lost}`;
  const lostInOtherSection = `${gate(GOOD_GATE_ENTRY)}top_issues:\n  - id: X\n    finding: >-\n      ${CASE} was withdrawn\n`;
  const hashInScalar = gate(
    `${GOOD_GATE_ENTRY}    - action: >-\n        # ${CASE} approval is revoked\n      refs: []\n`,
  );
  const fullLineComment = gate(`${GOOD_GATE_ENTRY}# ${CASE} was reproduced\n`);
  // Control: the id read by the parser anywhere is accounted for.
  const quotedElsewhere = `${gate(GOOD_GATE_ENTRY)}top_issues:\n  - id: X\n    finding: 'reproduced by ${CASE}'\n`;
  const { go, dir } = reasons({
    "a.yml": afterComment,
    "b.yml": earlierFutureKey,
    "c.yml": lostInOtherSection,
    "d.yml": quotedElsewhere,
    "e.yml": fullLineComment,
    "f.yml": hashInScalar,
  });
  try {
    for (const g of ["a.yml", "b.yml", "c.yml", "e.yml", "f.yml"])
      assert.equal(go(g), "unapproved", g);
    assert.equal(go("d.yml"), "matched", "d.yml");
  } finally {
    cleanup(dir);
  }
});

test("control: a gate entry that names the case in ANY field is a record about it; only its own case: field approves (T271-QA-22)", () => {
  const second = (field) =>
    `    - action: y\n      case: other\n      ${field}: withdraw ${CASE} deferral\n`;
  const { go, dir } = reasons({
    "note.yml": gate(GOOD_GATE_ENTRY + second("note")),
    "reason.yml": gate(GOOD_GATE_ENTRY + second("reason")),
    "key.yml": gate(
      GOOD_GATE_ENTRY + `    - action: y\n      ${CASE}: withdrawn\n`,
    ),
    // Controls: an unrelated second entry blocks nothing; a longer id is another case.
    "plain.yml": gate(GOOD_GATE_ENTRY + `    - action: y\n      case: other\n`),
    "longer.yml": gate(
      GOOD_GATE_ENTRY + second("note").replace(CASE, `${CASE}-2`),
    ),
  });
  try {
    for (const f of ["note.yml", "reason.yml", "key.yml"])
      assert.equal(go(f), "unapproved", f);
    for (const f of ["plain.yml", "longer.yml"])
      assert.equal(go(f), "matched", f);
  } finally {
    cleanup(dir);
  }
});

test("control: a record about the case outside future[] blocks - immediate, other keys, unknown root keys, a note in the approving entry (T271-QA-25)", () => {
  const head = (extra) =>
    `schema: 1\nrecommendations:\n${extra}  future:\n${GOOD_GATE_ENTRY}`;
  const { go, dir } = reasons({
    "immediate.yml": head(`  immediate:\n    - action: ${CASE} revoked\n`),
    "otherkey.yml": head(`  extra: ${CASE} revoked\n`),
    "root.yml": `${head("")}top: ${CASE} revoked\n`,
    "note.yml": gate(
      GOOD_GATE_ENTRY + `      note: approval withdrawn for ${CASE}\n`,
    ),
    // Controls: gate prose may cite the id; an immediate entry about another case is fine.
    "prose.yml": `${head("")}top_issues:\n  - id: X\n    finding: '${CASE} reproduced'\nstatus_reason: '${CASE} was a finding'\n`,
    "immediate-other.yml": head(
      `  immediate:\n    - action: other-case revoked\n`,
    ),
  });
  try {
    for (const f of ["immediate", "otherkey", "root", "note"])
      assert.equal(go(`${f}.yml`), "unapproved", f);
    for (const f of ["prose", "immediate-other"])
      assert.equal(go(`${f}.yml`), "matched", f);
  } finally {
    cleanup(dir);
  }
});
