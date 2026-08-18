/**
 * handover-render.test.mjs — the deferred-mutation record, its journal, and the
 * four renderings of it.
 *
 * Fixture-driven and hermetic: no network, no credentials, no tracker. Every
 * assertion below is reachable from a `.jsonl` fixture in ./fixtures.
 *
 * The two invariants that matter most, and why:
 *
 *   TOTALITY  — every one of the 20 kinds must render in all four output
 *               formats. A renderer with a silent `default:` case would emit a
 *               checklist that quietly omits an action a human must perform,
 *               which is precisely the invisible-drift failure this sequence
 *               exists to remove. §1 enumerates kinds from the SCHEMA DOC, not
 *               from a list in this file, so adding a kind without a renderer
 *               fails here rather than passing vacuously.
 *
 *   NO CREDENTIAL IN ANY OUTPUT — the rendered script and JSON are COMMITTED.
 *               That is defensible only because §6 holds and is watched failing.
 *
 * Run: node --test shared/resources/tests/handover-render.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED = join(__dirname, "..");
const FIXTURES = join(__dirname, "fixtures");

const dm = require(join(SHARED, "defer-mutation.js"));
const hr = require(join(SHARED, "handover-render.js"));

const CLEAN_ENV = Object.freeze({});

/** Read a fixture journal into records, asserting it parsed. */
function loadFixture(name, { expectWarnings = false } = {}) {
  const { records, warnings } = dm.readJournal(join(FIXTURES, name));
  if (!expectWarnings) {
    assert.deepEqual(warnings, [], `${name} produced unexpected warnings`);
  }
  return { records, warnings };
}

function renderAll(records, ctx = {}) {
  const out = {};
  for (const f of hr.FORMATS) out[f] = hr.render(records, f, { env: CLEAN_ENV, ...ctx });
  return out;
}

/** A temp dir that cleans itself up. */
function withTmp(fn) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "handover-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── 1. Totality — every kind × every renderer ──────────────────────────────

test("§1 the roster in the schema doc has exactly 20 kinds, 9 Jira + 11 GitHub", () => {
  const roster = dm.loadRoster();
  assert.equal(roster.size, 20, "roster size changed — update the schema doc's own count too");
  const bySystem = {};
  for (const k of roster.keys()) {
    const s = k.split(".")[0];
    bySystem[s] = (bySystem[s] || 0) + 1;
  }
  assert.deepEqual(bySystem, { jira: 9, github: 11 });
});

test("§1 every roster kind has a renderer, and every renderer has a roster kind", () => {
  const roster = dm.loadRoster();
  const presented = Object.keys(hr.KIND_PRESENTATION);

  const missing = [...roster.keys()].filter((k) => !hr.KIND_PRESENTATION[k]);
  assert.deepEqual(
    missing,
    [],
    "kinds in the roster with no KIND_PRESENTATION entry — a renderer would " +
      "silently omit them",
  );

  const extra = presented.filter((k) => !roster.has(k));
  assert.deepEqual(
    extra,
    [],
    "KIND_PRESENTATION entries absent from the roster — unreachable, because " +
      "defer-mutation refuses to write them",
  );
});

test("§1 every kind renders non-empty in all four formats, with nothing unsubstituted", () => {
  const { records } = loadFixture("handover-all-kinds.jsonl");
  assert.equal(records.length, 20, "the all-kinds fixture must carry every kind");

  const outputs = renderAll(records, { run: "feature/task.52.fixture", access: "manual" });

  for (const format of hr.FORMATS) {
    const text = outputs[format];
    assert.ok(text && text.trim().length > 0, `${format} rendered empty`);

    // A placeholder that survived substitution is the failure mode a
    // "non-empty output" assertion alone would miss.
    for (const marker of ["{{", "}}", "undefined", "[object Object]", "TODO_"]) {
      assert.ok(
        !text.includes(marker),
        `${format} contains an unsubstituted placeholder: ${marker}`,
      );
    }
  }

  // md, sh and json each name every kind explicitly. `summary` is a headline
  // block and names the objects rather than the kinds, so it is asserted on
  // record count instead.
  for (const format of ["md", "sh", "json"]) {
    for (const kind of dm.loadRoster().keys()) {
      assert.ok(
        outputs[format].includes(kind),
        `${format} does not mention kind ${kind}`,
      );
    }
  }
  const summaryBullets = outputs.summary
    .split("\n")
    .filter((l) => l.startsWith("- ")).length;
  assert.equal(summaryBullets, 20, "summary must list every outstanding record");
});

test("§1 render() refuses an unknown format", () => {
  assert.throws(() => hr.render([], "yaml"), /unknown format/i);
});

test("§1 a kind with no presentation entry raises rather than rendering generically", () => {
  assert.throws(
    () => hr.presentationFor("github.issue.explode"),
    /no renderer for kind/i,
    "an unknown kind must fail loudly, not render a generic line",
  );
});

// ── 2. Resume — duplicate ids ──────────────────────────────────────────────

test("§2 a duplicated record (resume re-emit) is rendered once", () => {
  const { records } = loadFixture("handover-resume-duplicates.jsonl");
  assert.equal(records.length, 4, "fixture should carry two records twice over");

  const ids = records.map((r) => r.id);
  assert.equal(new Set(ids).size, 2, "fixture must contain exactly two distinct ids");

  assert.equal(hr.dedupe(records).length, 2);

  const outputs = renderAll(records);
  for (const id of new Set(ids)) {
    const md = outputs.md.split(id).length - 1;
    assert.equal(md, 1, `markdown lists ${id} ${md} times, expected once`);
  }
  const parsed = JSON.parse(outputs.json);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.counts.total, 2);
});

test("§2 the id is a content hash — the same input yields the same id", () => {
  const mk = () =>
    dm.buildRecord(
      {
        kind: "jira.transition",
        intent: "Move to In Review",
        target: { issue: "PROJ-1", url: "https://x/PROJ-1" },
        desired: { status: "In Review" },
      },
      { env: CLEAN_ENV, now: "2026-08-18T00:00:00Z" },
    );
  assert.equal(mk().id, mk().id);

  // Field ORDER inside target must not change identity.
  const reordered = dm.buildRecord(
    {
      kind: "jira.transition",
      intent: "Move to In Review",
      target: { url: "https://x/PROJ-1", issue: "PROJ-1" },
      desired: { status: "In Review" },
    },
    { env: CLEAN_ENV, now: "2026-08-18T00:00:00Z" },
  );
  assert.equal(mk().id, reordered.id);
});

// ── 3. dependsOn ordering ──────────────────────────────────────────────────

test("§3 a dependant never appears before its dependency", () => {
  const { records } = loadFixture("handover-depends-chain.jsonl");
  const { sorted, warnings } = hr.topoSort(hr.dedupe(records));
  assert.deepEqual(warnings, []);

  const pos = new Map(sorted.map((r, i) => [r.id, i]));
  for (const rec of sorted) {
    for (const dep of rec.dependsOn || []) {
      assert.ok(
        pos.get(dep) < pos.get(rec.id),
        `${rec.id} (${rec.kind}) is listed before its dependency ${dep}`,
      );
    }
  }

  // The fixture's `order` values are deliberately the REVERSE of the dependency
  // order, so a renderer sorting on `order` alone fails this.
  const byOrder = [...records].sort((a, b) => a.order - b.order);
  assert.notDeepEqual(
    byOrder.map((r) => r.id),
    sorted.map((r) => r.id),
    "fixture no longer distinguishes topological order from `order` — it must",
  );

  const outputs = renderAll(records);
  for (const format of ["sh", "json"]) {
    const text = outputs[format];
    for (const rec of sorted) {
      for (const dep of rec.dependsOn || []) {
        assert.ok(
          text.indexOf(dep) < text.indexOf(rec.id),
          `${format}: ${rec.id} appears before its dependency ${dep}`,
        );
      }
    }
  }
});

test("§3 a dependant is nested beneath its dependency in the checklist", () => {
  const { records } = loadFixture("handover-depends-chain.jsonl");
  const md = hr.render(records, "md", { env: CLEAN_ENV });

  const lineOf = (id) =>
    md.split("\n").find((l) => l.includes(id) && l.includes("id `"));
  const indentOf = (id) => {
    const line = lineOf(id);
    assert.ok(line, `no checklist line for ${id}`);
    return line.length - line.trimStart().length;
  };

  const { sorted } = hr.topoSort(hr.dedupe(records));
  for (const rec of sorted) {
    for (const dep of rec.dependsOn || []) {
      assert.ok(
        indentOf(rec.id) > indentOf(dep),
        `${rec.id} is not nested under ${dep} — the human reads a pile, not a sequence`,
      );
    }
  }
});

test("§3 a dangling dependsOn edge warns and still renders the rest", () => {
  const rec = dm.buildRecord(
    {
      kind: "github.issue.comment",
      intent: "Comment on an issue whose creation is not in this journal",
      dependsOn: ["deadbeef"],
      target: { issue: "1", url: "https://x/1" },
    },
    { env: CLEAN_ENV, now: "2026-08-18T00:00:00Z" },
  );
  const { sorted, warnings } = hr.topoSort([rec]);
  assert.equal(sorted.length, 1, "a bad edge must not lose the record");
  assert.match(warnings.join("\n"), /not in this journal/);
});

// ── 4. satisfied — collapsed, not listed as outstanding ────────────────────

test("§4 a satisfied record is collapsed into 'already correct'", () => {
  const { records } = loadFixture("handover-satisfied.jsonl");
  const satisfied = records.find((r) => r.satisfied === true);
  const outstanding = records.find((r) => r.satisfied !== true);
  assert.ok(satisfied && outstanding, "fixture must carry one of each");

  const model = hr.buildModel(records);
  assert.equal(model.counts.satisfied, 1);
  assert.equal(model.counts.outstanding, 1);
  assert.equal(model.outstanding[0].id, outstanding.id);

  const outputs = renderAll(records);

  assert.match(outputs.md, /## Already correct/);
  // The satisfied record must not appear as an unticked checkbox anywhere.
  const uncheckedLines = outputs.md
    .split("\n")
    .filter((l) => l.includes("- [ ]"));
  assert.ok(
    !uncheckedLines.some((l) => l.includes(satisfied.id)),
    "a satisfied record is listed as an outstanding checkbox",
  );

  // The script must not try to perform it.
  assert.ok(
    !outputs.sh.includes(`run_step '${satisfied.id}'`) &&
      !outputs.sh.includes(`confirm_step '${satisfied.id}'`),
    "the script would re-perform an action that is already correct",
  );

  assert.deepEqual(JSON.parse(outputs.json).satisfied, [satisfied.id]);
  assert.match(outputs.summary, /already correct/i);
});

// ── 5. Expected but absent → ⚠️ UNRECORDED ─────────────────────────────────

test("§5 an expected moment with no record renders as ⚠️ UNRECORDED", () => {
  const { records } = loadFixture("handover-satisfied.jsonl");
  const ctx = { expected: ["jira.transition", "jira.comment.add", "github.pr.merge"] };

  const model = hr.buildModel(records, ctx);
  assert.deepEqual(
    model.unrecorded,
    ["github.pr.merge"],
    "only the moment with no record is unrecorded",
  );

  // Every format must NAME the missing moment and FLAG it as unrecorded. The
  // flag differs by idiom — the three human-facing formats carry the literal
  // ⚠️ UNRECORDED marker; JSON carries an `unrecorded` array, which is what a
  // machine consumer (task.57) actually reads. Requiring the glyph inside JSON
  // would be cosmetic; requiring nothing would let the case pass vacuously.
  for (const format of hr.FORMATS) {
    const text = hr.render(records, format, { env: CLEAN_ENV, ...ctx });
    assert.ok(
      text.includes("github.pr.merge"),
      `${format} does not name the unrecorded moment`,
    );
    if (format === "json") {
      const parsed = JSON.parse(text);
      assert.deepEqual(
        parsed.unrecorded,
        ["github.pr.merge"],
        "json must expose the missing moment where a consumer will read it",
      );
    } else {
      assert.match(
        text,
        /⚠️ UNRECORDED/,
        `${format} silently omits an expected-but-absent moment`,
      );
    }
  }
});

// ── 6. THE CREDENTIAL TEST ─────────────────────────────────────────────────

test("§6 no credential value survives into any of the four outputs", () => {
  const env = {
    JIRA_API_TOKEN: "ATATT3xFfGF0aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789",
    GITHUB_TOKEN: "ghp_abcdefghijklmnopqrstuvwxyz0123456789",
    BITBUCKET_APP_PASSWORD: "sup3rs3cr3tpassw0rdvalue",
    HOME: "/Users/nobody", // not a secret: must NOT be swept
  };
  const SECRETS = [
    env.JIRA_API_TOKEN,
    env.GITHUB_TOKEN,
    env.BITBUCKET_APP_PASSWORD,
    "ghp_inlineTOKENvalue0123456789abcdef", // never in env — shape match must catch it
  ];

  const rec = dm.buildRecord(
    {
      kind: "jira.transition",
      intent: "Move PROJ-1 to In Review",
      target: { issue: "PROJ-1", url: "https://acme.atlassian.net/browse/PROJ-1" },
      desired: { status: "In Review" },
      command: {
        argv: [
          "curl",
          "-X",
          "POST",
          "-H",
          `Authorization: Bearer ${env.JIRA_API_TOKEN}`,
          "-u",
          `admin:${env.BITBUCKET_APP_PASSWORD}`,
          "--token",
          env.GITHUB_TOKEN,
          "--token=ghp_inlineTOKENvalue0123456789abcdef",
          "-H",
          "Content-Type: application/json",
          "https://acme.atlassian.net/rest/api/3/issue/PROJ-1/transitions",
        ],
        stdin: `a body that mentions ${env.JIRA_API_TOKEN} inline`,
      },
      manual: {
        ui: "Open the issue → Transition",
        fields: [{ name: "Token", value: env.GITHUB_TOKEN }],
      },
      verify: { cmd: `curl -H 'Authorization: Bearer ${env.JIRA_API_TOKEN}'`, expect: "200" },
    },
    { env, now: "2026-08-18T00:00:00Z" },
  );

  // The record itself is clean before it ever reaches a renderer.
  const asWritten = JSON.stringify(rec);
  for (const secret of SECRETS) {
    assert.ok(
      !asWritten.includes(secret),
      `the WRITER leaked ${secret.slice(0, 10)}… into the journal`,
    );
  }

  for (const format of hr.FORMATS) {
    const text = hr.render([rec], format, { env });
    for (const secret of SECRETS) {
      assert.ok(
        !text.includes(secret),
        `${format} leaked ${secret.slice(0, 10)}…`,
      );
    }
  }

  // Variable NAMES survive, which is what keeps the output actionable. The
  // summary is a headline block and carries no argv, so it is exempt.
  for (const format of ["md", "sh", "json"]) {
    const text = hr.render([rec], format, { env });
    assert.match(
      text,
      /\$JIRA_API_TOKEN/,
      `${format} masked the variable NAME as well as its value — the operator ` +
        `can no longer tell what to export`,
    );
  }

  // A non-secret env value must not be swept just for being long.
  assert.equal(
    dm.redactString("/Users/nobody", dm.buildEnvTable(env)),
    "/Users/nobody",
  );
});

test("§6 redaction survives a hand-edited journal (defence in depth at render time)", () => {
  const env = { GITHUB_TOKEN: "ghp_handEditedTOKEN0123456789abcdefghij" };
  // Simulates a journal edited after it was written — the renderer must not
  // trust that the writer already cleaned it.
  const dirty = {
    v: 1,
    id: "dirty001",
    order: 1,
    dependsOn: [],
    ts: "2026-08-18T00:00:00Z",
    system: "github",
    access: "command",
    kind: "github.issue.comment",
    consequence: "communication",
    produces: null,
    intent: "Post a comment",
    target: { issue: "1", url: "https://x/1" },
    desired: null,
    observed: null,
    satisfied: false,
    manual: null,
    command: { argv: ["gh", "--token", env.GITHUB_TOKEN], stdin: null },
    verify: null,
    retry_of: null,
  };
  for (const format of hr.FORMATS) {
    const text = hr.render([dirty], format, { env });
    assert.ok(
      !text.includes(env.GITHUB_TOKEN),
      `${format} passed a hand-edited credential straight through`,
    );
  }
});

// ── 7. Empty journal ───────────────────────────────────────────────────────

test("§7 an empty journal writes no artifact and creates no file", () => {
  const { records, warnings } = loadFixture("handover-empty.jsonl");
  assert.deepEqual(records, []);
  assert.deepEqual(warnings, []);

  assert.equal(hr.isEmpty(hr.buildModel(records)), true);

  withTmp((dir) => {
    const out = join(dir, "task.99.handover.1.empty.md");
    const r = hr.run({
      argv: [
        "node",
        "handover-render.js",
        "--journal",
        join(FIXTURES, "handover-empty.jsonl"),
        "--format",
        "md",
        "--out",
        out,
        "--quiet",
      ],
      env: CLEAN_ENV,
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.empty, true);
    assert.deepEqual(r.written, []);
    assert.equal(
      fs.existsSync(out),
      false,
      "an empty artifact was committed into the work-item directory",
    );
  });
});

// ── 8. Malformed journal lines ─────────────────────────────────────────────

test("§8 a malformed line is skipped with a warning and the rest still render", () => {
  const { records, warnings } = loadFixture("handover-malformed.jsonl", {
    expectWarnings: true,
  });

  assert.equal(records.length, 2, "the two well-formed records must survive");
  assert.ok(warnings.length >= 3, `expected several warnings, got ${warnings.length}`);
  assert.match(warnings.join("\n"), /not valid JSON/);
  assert.match(warnings.join("\n"), /newer than this reader/);
  assert.match(warnings.join("\n"), /missing `id` or `kind`/);

  const outputs = renderAll(records);
  for (const format of hr.FORMATS) {
    assert.ok(outputs[format].trim().length > 0, `${format} rendered nothing`);
  }
});

test("§8 a future schema version is skipped, never guessed at", () => {
  withTmp((dir) => {
    const f = join(dir, "future.jsonl");
    fs.writeFileSync(
      f,
      `${JSON.stringify({ v: 99, id: "aaaaaaaa", kind: "github.issue.comment" })}\n`,
    );
    const { records, warnings } = dm.readJournal(f);
    assert.deepEqual(records, []);
    assert.match(warnings.join(""), /v99 is newer/);
  });
});

// ── 9. Hostile bodies ──────────────────────────────────────────────────────

test("§9 a hostile body round-trips byte-exactly and reaches the CLI via --body-file", () => {
  const { records } = loadFixture("handover-hostile-body.jsonl");
  const expected = fs.readFileSync(
    join(FIXTURES, "handover-hostile-body.expected.txt"),
  );

  // The fixture is the point: backticks, a command substitution, two would-be
  // heredoc terminators, a CRLF, and no trailing newline.
  const body = records[0].command.stdin;
  assert.ok(body.includes("`"), "fixture lost its backticks");
  assert.ok(body.includes("$(rm -rf /)"), "fixture lost its command substitution");
  assert.ok(body.includes("\r\n"), "fixture lost its CRLF");
  assert.ok(!body.endsWith("\n"), "fixture must not end with a newline");
  assert.equal(body, expected.toString("utf8"), "fixture and expectation drifted");

  const sh = hr.render(records, "sh", { env: CLEAN_ENV });

  // NEVER the interpolating form.
  assert.ok(!/--body\s+"\$\(/.test(sh), 'the script uses --body "$(cat …)"');
  assert.ok(!/--body\s+'/.test(sh), "the script inlines the body as a --body argument");
  assert.match(sh, /--body-file/, "the body must reach the CLI via --body-file");

  // And the body must not ALSO appear inline anywhere in the script. Asserting
  // only that `--body-file` is present leaves the door open to passing the body
  // itself as that flag's argument, which is the same injection hazard wearing
  // the right flag name. (A mutation doing exactly that passed an earlier
  // version of this test.)
  assert.ok(
    !sh.includes("$(rm -rf /)"),
    "the body was interpolated into the script instead of travelling as base64",
  );
  for (const line of sh.split("\n")) {
    if (!/^(run_step|confirm_step)\b/.test(line)) continue;
    assert.ok(
      !line.includes("backtick"),
      `a command line carries the body inline: ${line.slice(0, 120)}`,
    );
  }

  // Decode the payload the script would hand over and compare bytes.
  const b64 = /printf %s '([A-Za-z0-9+/=]+)'/.exec(sh);
  assert.ok(b64, "no base64 body payload found in the script");
  const decoded = Buffer.from(b64[1], "base64");
  assert.equal(
    decoded.equals(expected),
    true,
    "the body does not round-trip byte-exactly through the script",
  );

  // And the generated script must actually be valid bash.
  withTmp((dir) => {
    const f = join(dir, "handover.sh");
    fs.writeFileSync(f, sh);
    execFileSync("bash", ["-n", f]); // throws on a syntax error
  });
});

test("§9 the markdown renders a multi-line body as a fenced block, not an inline span", () => {
  const { records } = loadFixture("handover-hostile-body.jsonl");
  const md = hr.render(records, "md", { env: CLEAN_ENV });
  assert.match(md, /```text/, "a multi-line field must be fenced for a human to copy");
});

// ── 10. retry_of — a full-access failure is its own section ────────────────

test("§10 a retry_of record renders separately from policy deferrals", () => {
  const { records } = loadFixture("handover-retry-and-irreversible.jsonl");
  const retry = records.find((r) => r.retry_of);
  assert.ok(retry, "fixture must carry a retry_of record");

  const model = hr.buildModel(records);
  assert.equal(model.counts.failures, 1);
  assert.ok(
    !model.outstanding.some((r) => r.id === retry.id),
    "a failure must not be mixed into the policy-deferral list",
  );

  const outputs = renderAll(records);
  assert.match(outputs.md, /## Failed while running with full access/);
  assert.match(outputs.summary, /Failed under full access/);
  assert.deepEqual(JSON.parse(outputs.json).failures, [retry.id]);

  // It is still runnable — the whole point is a re-runnable script.
  assert.ok(
    outputs.sh.includes(retry.id),
    "the script must be able to re-run what failed",
  );
});

// ── 11. Irreversible actions get a confirm gate ────────────────────────────

test("§11 an irreversible action emits a confirm gate, not a bare command", () => {
  const { records } = loadFixture("handover-retry-and-irreversible.jsonl");
  const merge = records.find((r) => r.kind === "github.pr.merge");
  assert.ok(merge, "fixture must carry an irreversible action");
  assert.equal(merge.consequence, "irreversible");

  const sh = hr.render(records, "sh", { env: CLEAN_ENV });
  assert.ok(
    sh.includes(`confirm_step '${merge.id}'`),
    "an irreversible action was emitted without a confirm gate",
  );
  assert.ok(
    !sh.includes(`run_step '${merge.id}'`),
    "an irreversible action must never take the unguarded path",
  );
  assert.match(sh, /IRREVERSIBLE/);

  // And the checklist groups it where a human will see it first.
  const md = hr.render(records, "md", { env: CLEAN_ENV });
  const irreversibleHeading = md.indexOf("### Irreversible");
  const driftHeading = md.indexOf("### State drift");
  assert.ok(irreversibleHeading !== -1, "no irreversible section in the checklist");
  if (driftHeading !== -1) {
    assert.ok(
      irreversibleHeading < driftHeading,
      "irreversible actions must be listed before recoverable ones",
    );
  }
});

test("§11 a caller may harden a consequence but never soften it", () => {
  const harder = dm.buildRecord(
    {
      kind: "github.issue.comment", // roster default: communication
      intent: "Post something that cannot be unsaid",
      consequence: "irreversible",
      target: { issue: "1", url: "https://x/1" },
    },
    { env: CLEAN_ENV, now: "2026-08-18T00:00:00Z" },
  );
  assert.equal(harder.consequence, "irreversible");

  const softer = dm.buildRecord(
    {
      kind: "github.pr.merge", // roster default: irreversible
      intent: "Merge, but pretend it is chatty",
      consequence: "communication",
      target: { pr: "1", url: "https://x/1" },
    },
    { env: CLEAN_ENV, now: "2026-08-18T00:00:00Z" },
  );
  assert.equal(
    softer.consequence,
    "irreversible",
    "softening a consequence would drop the confirm gate on a merge",
  );
});

// ── 12. The writer refuses what it cannot render ───────────────────────────

test("§12 an unknown kind is refused, not written", () => {
  assert.throws(
    () =>
      dm.buildRecord(
        { kind: "github.issue.explode", intent: "Do something unrenderable" },
        { env: CLEAN_ENV },
      ),
    /unknown kind/i,
  );
});

test("§12 a record with no intent is refused", () => {
  assert.throws(
    () => dm.buildRecord({ kind: "github.issue.comment" }, { env: CLEAN_ENV }),
    /`intent` is required/,
  );
});

test("§12 a system that disagrees with the kind's namespace is refused", () => {
  assert.throws(
    () =>
      dm.buildRecord(
        { kind: "github.issue.comment", system: "jira", intent: "Mismatched" },
        { env: CLEAN_ENV },
      ),
    /disagrees with kind/,
  );
});

test("§12 an unknown access mode is refused", () => {
  assert.throws(
    () =>
      dm.buildRecord(
        { kind: "github.issue.comment", intent: "x", access: "sudo" },
        { env: CLEAN_ENV },
      ),
    /unknown access mode/,
  );
});

// ── 13. Shell and node produce byte-identical records ──────────────────────

test("§13 the CLI and the library write byte-identical records for the same input", () => {
  withTmp((dir) => {
    const journal = join(dir, "j.jsonl");
    const argv = [
      "node",
      join(SHARED, "defer-mutation.js"),
      "--kind", "github.issue.comment",
      "--intent", "Post the Definition of Done summary",
      "--target", JSON.stringify({ issue: "230", url: "https://github.com/a/b/issues/230" }),
      "--command-argv", JSON.stringify(["gh", "issue", "comment", "230", "--body-file", "-"]),
      "--stdin", "the body\n",
      "--run", "feature/task.52.x",
      "--step", "7",
      "--skill", "finalise",
      "--access", "manual",
      "--journal", journal,
    ];
    const viaCli = dm.run({ argv, env: CLEAN_ENV, cwd: dir });
    assert.equal(viaCli.exitCode, 0);

    const viaLib = dm.buildRecord(
      {
        kind: "github.issue.comment",
        intent: "Post the Definition of Done summary",
        target: { issue: "230", url: "https://github.com/a/b/issues/230" },
        command: { argv: ["gh", "issue", "comment", "230", "--body-file", "-"], stdin: "the body\n" },
        run: "feature/task.52.x",
        step: "7",
        skill: "finalise",
        access: "manual",
        order: viaCli.record.order,
      },
      { env: CLEAN_ENV, now: viaCli.record.ts },
    );

    assert.equal(
      JSON.stringify(viaLib),
      JSON.stringify(viaCli.record),
      "the shell and node paths disagree — the schema has drifted between them",
    );

    // And the journal on disk holds exactly that line.
    const onDisk = fs.readFileSync(journal, "utf8").trim();
    assert.equal(onDisk, JSON.stringify(viaCli.record));
  });
});

test("§13 appends accumulate and `order` increases monotonically", () => {
  withTmp((dir) => {
    const journal = join(dir, "j.jsonl");
    const mk = (n) =>
      dm.defer(
        {
          kind: "github.issue.comment",
          intent: `Comment number ${n}`,
          target: { issue: String(n), url: `https://x/${n}` },
        },
        { journal, env: CLEAN_ENV, cwd: dir, now: "2026-08-18T00:00:00Z" },
      );
    const a = mk(1);
    const b = mk(2);
    const c = mk(3);
    assert.deepEqual([a.order, b.order, c.order], [1, 2, 3]);

    const { records, warnings } = dm.readJournal(journal);
    assert.equal(records.length, 3);
    assert.deepEqual(warnings, []);
  });
});

// ── 14. The rendered artifacts are safe to commit ──────────────────────────

test("§14 the script is written 0644 — reviewable, committable, not runnable by accident", () => {
  withTmp((dir) => {
    const out = join(dir, "task.99.handover.1.x.sh");
    const r = hr.run({
      argv: [
        "node", "handover-render.js",
        "--journal", join(FIXTURES, "handover-all-kinds.jsonl"),
        "--format", "sh",
        "--out", out,
        "--quiet",
      ],
      env: CLEAN_ENV,
    });
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.written, [out]);
    const mode = fs.statSync(out).mode & 0o777;
    assert.equal(mode, 0o644, `script written mode ${mode.toString(8)}, expected 644`);
  });
});

test("§14 the script is dry-run by default and says so", () => {
  const sh = hr.render(
    loadFixture("handover-retry-and-irreversible.jsonl").records,
    "sh",
    { env: CLEAN_ENV },
  );
  assert.match(sh, /APPLY=0/, "the script must default to not applying");
  assert.match(sh, /DRY RUN BY DEFAULT/);
  assert.match(sh, /--apply/);
});

test("§14 the generated script runs clean as a dry run and changes nothing", () => {
  const sh = hr.render(loadFixture("handover-all-kinds.jsonl").records, "sh", {
    env: CLEAN_ENV,
  });
  withTmp((dir) => {
    const f = join(dir, "handover.sh");
    fs.writeFileSync(f, sh);
    const out = execFileSync("bash", [f], { encoding: "utf8" });
    assert.match(out, /Dry run — nothing was changed/);
    // Every kind is accounted for in the plan: 20 records, each either a step
    // or an explicit "do this by hand" line.
    const planned = out.split("\n").filter((l) => /^[·✋]/.test(l.trim())).length;
    assert.equal(planned, 20, `dry run planned ${planned} of 20 actions`);
  });
});

test("§14 --format may be given more than once and writes one file per format", () => {
  withTmp((dir) => {
    const out = join(dir, "task.99.handover.1.x.md");
    const r = hr.run({
      argv: [
        "node", "handover-render.js",
        "--journal", join(FIXTURES, "handover-satisfied.jsonl"),
        "--format", "md",
        "--format", "sh",
        "--format", "json",
        "--out", out,
        "--quiet",
      ],
      env: CLEAN_ENV,
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.written.length, 3);
    for (const ext of ["md", "sh", "json"]) {
      assert.ok(
        r.written.some((p) => p.endsWith(`.${ext}`)),
        `no .${ext} artifact written`,
      );
    }
  });
});

// ── 15. Fixtures are present and git-tracked ───────────────────────────────

test("§15 the fixture journals exist and are not gitignored", () => {
  const expected = [
    "handover-all-kinds.jsonl",
    "handover-resume-duplicates.jsonl",
    "handover-depends-chain.jsonl",
    "handover-satisfied.jsonl",
    "handover-retry-and-irreversible.jsonl",
    "handover-hostile-body.jsonl",
    "handover-hostile-body.expected.txt",
    "handover-malformed.jsonl",
    "handover-empty.jsonl",
  ];
  for (const name of expected) {
    assert.ok(
      fs.existsSync(join(FIXTURES, name)),
      `missing fixture ${name} — a blanket .gitignore rule has swallowed test ` +
        `fixtures in this repo before`,
    );
  }

  // `git check-ignore` exits 1 when the path is NOT ignored, which is what we
  // want. Anything else means a rule started matching.
  for (const name of expected) {
    let ignored = true;
    try {
      execFileSync("git", ["check-ignore", "-q", join(FIXTURES, name)], {
        cwd: SHARED,
        stdio: "ignore",
      });
    } catch {
      ignored = false;
    }
    assert.equal(ignored, false, `${name} is gitignored and would never be committed`);
  }
});
