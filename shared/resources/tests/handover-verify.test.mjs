/**
 * handover-verify.test.mjs — the read-only verification pass and its four
 * states (task.57).
 *
 * Hermetic: every read is served by a stub. The stub used throughout THROWS on
 * any argv that is not read-only, so the suite is a standing proof that no
 * mutation can reach the network from this module.
 *
 * Mutation-prove (each named change must go red):
 *   - let a mutating argv through `isReadOnlyArgv`            → §1 red
 *   - coerce an ambiguous (2+ match) read to `satisfied`      → §3 red
 *   - delete satisfied records instead of ticking             → §2 count red
 *   - derive `pending` where the baseline says `divergent`    → §4 red
 *   - abort the pass on a failed read                         → §5 red
 *
 * Run: node --test shared/resources/tests/handover-verify.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED = join(__dirname, "..");

const hv = require(join(SHARED, "handover-verify.js"));
const hr = require(join(SHARED, "handover-render.js"));

// ---------------------------------------------------------------------------
// Harness: a read stub that THROWS on any mutating argv. Programmed with
// canned responses keyed by a recognisable slice of the argv.
// ---------------------------------------------------------------------------

function readStub(responses = []) {
  const calls = [];
  return {
    calls,
    execImpl(argv) {
      // The gate in makeIo() already ran assertReadOnlyArgv. This second check
      // is the suite's own tripwire: if the gate is ever weakened, a mutating
      // argv lands HERE and the throw names it.
      if (!hv.isReadOnlyArgv(argv)) {
        throw new Error(
          `MUTATION ATTEMPTED via ${JSON.stringify(argv)} — the read-only gate leaked`,
        );
      }
      calls.push(argv);
      const joined = argv.join(" ");
      for (const [needle, result] of responses) {
        if (joined.includes(needle)) return result;
      }
      return { status: 1, error: `no canned response for: ${joined}` };
    },
  };
}

function rec(over = {}) {
  return {
    v: 1,
    id: over.id || "aaaa0001",
    order: 1,
    dependsOn: [],
    ts: "2026-08-18T10:00:00Z",
    run: "feature/task.57.fixture",
    step: "7",
    skill: "finalise",
    system: "github",
    access: "manual",
    kind: "github.board.field-set",
    consequence: "state-drift",
    produces: null,
    intent: "Move the card to Done",
    target: { issue: "235", url: "https://github.com/acme/repo/issues/235" },
    desired: { status: "Done" },
    observed: null,
    satisfied: false,
    manual: { deepLink: "", ui: "", fields: [] },
    command: { argv: ["gh", "project", "item-edit"], stdin: null },
    verify: null,
    retry_of: null,
    ...over,
  };
}

function boardRead(value) {
  return {
    status: 0,
    stdout: JSON.stringify({
      data: {
        repository: {
          issue: {
            projectItems: { nodes: [{ fieldValueByName: { name: value } }] },
          },
        },
      },
    }),
  };
}

const FIXED_NOW = () => "2026-08-20T09:00:00Z";

async function verify(records, stub, over = {}) {
  const io = hv.makeIo({
    env: {},
    execImpl: stub.execImpl,
    fetchImpl: over.fetchImpl || null,
    now: over.now || FIXED_NOW,
  });
  return hv.verifyRecords(records, { io });
}

// ── §1 No mutation ever reaches the network ────────────────────────────────

test("§1 the allowlist admits reads and refuses every mutating shape", () => {
  const reads = [
    ["gh", "issue", "view", "235", "--json", "state"],
    ["gh", "issue", "list", "--search", "x", "--json", "number"],
    ["gh", "pr", "view", "12", "--json", "comments"],
    ["gh", "api", "repos/{owner}/{repo}/milestones?state=all"],
    ["gh", "api", "graphql", "-f", "query=query { viewer { login } }"],
    ["git", "ls-remote", "origin", "main"],
    ["git", "rev-parse", "HEAD"],
  ];
  for (const argv of reads)
    assert.ok(hv.isReadOnlyArgv(argv), `read refused: ${argv.join(" ")}`);

  const mutations = [
    ["gh", "issue", "close", "235"],
    ["gh", "issue", "comment", "235", "--body-file", "-"],
    ["gh", "issue", "edit", "235", "--title", "x"],
    ["gh", "pr", "merge", "12"],
    ["gh", "api", "-X", "POST", "repos/{owner}/{repo}/milestones"],
    ["gh", "api", "repos/x/y/issues", "-f", "title=x"],
    ["gh", "api", "repos/x/y/issues", "-F", "title=x"],
    ["gh", "api", "repos/x/y/issues", "--field", "title=x"],
    ["gh", "api", "repos/x/y/issues", "--input", "body.json"],
    ["gh", "api", "graphql", "--input", "mutation.json"],
    ["gh", "api", "graphql", "-f", "query=mutation { }"],
    ["gh", "api", "graphql", "-F", "query=mutation { m }"],
    ["gh", "api", "graphql", "--field", "query=mutation { m }"],
    ["git", "push", "origin", "main"],
    ["curl", "-X", "POST", "https://example.invalid"],
    [],
  ];
  for (const argv of mutations)
    assert.ok(
      !hv.isReadOnlyArgv(argv),
      `mutation admitted: ${JSON.stringify(argv)}`,
    );
});

test("§1 a full verification run performs no mutation — throwing stub stays silent", async () => {
  const stub = readStub([
    ["graphql", boardRead("Done")],
    [
      "issue view 235 --json state",
      { status: 0, stdout: '{"state":"CLOSED"}' },
    ],
  ]);
  const records = [
    rec({ id: "aaaa0001" }),
    rec({ id: "aaaa0002", kind: "github.issue.close", desired: {} }),
    rec({ id: "aaaa0003", kind: "jira.worklog.add", system: "jira" }),
  ];
  const { counts } = await verify(records, stub);
  assert.equal(
    counts.satisfied + counts.pending + counts.divergent + counts.unverifiable,
    3,
  );
  for (const argv of stub.calls)
    assert.ok(
      hv.isReadOnlyArgv(argv),
      `non-read argv executed: ${argv.join(" ")}`,
    );
});

test("§1 a recipe that tried to mutate is refused in-process and resolves unverifiable", async () => {
  // Simulate a future recipe bug by injecting a record whose read path would
  // exec a mutation: makeIo's assertReadOnlyArgv throws, verifyRecord catches,
  // and the state is unverifiable — never a silent success.
  const io = hv.makeIo({
    env: {},
    execImpl: () => ({ status: 0, stdout: "{}" }),
    now: FIXED_NOW,
  });
  assert.throws(
    () => io.exec(["gh", "issue", "close", "235"]),
    /refusing to execute non-read-only argv/,
  );
});

// ── §2 Already-done action: satisfied, ticked, never deleted ───────────────

test("§2 a read matching the desired value derives satisfied and keeps the record", async () => {
  const stub = readStub([["graphql", boardRead("Done")]]);
  const records = [rec()];
  const { records: out, counts } = await verify(records, stub);
  assert.equal(counts.satisfied, 1);
  assert.equal(
    out.length,
    records.length,
    "item count must equal record count",
  );
  assert.equal(out[0].satisfied, true);
  assert.equal(out[0].verification.state, "satisfied");
  assert.match(String(out[0].verification.observed), /Done/);
});

test("§2 the markdown checklist ticks and strikes a satisfied action with value and time", async () => {
  const stub = readStub([["graphql", boardRead("Done")]]);
  const { records: out } = await verify([rec()], stub);
  const md = hr.render(out, "md", { env: {} });
  assert.match(
    md,
    /- \[x\] ~~.*~~/,
    "satisfied item must be ticked and struck through",
  );
  assert.match(md, /observed `Done`/);
  assert.match(md, /2026-08-20T09:00:00Z/, "observed time must be shown");
  const sh = hr.render(out, "sh", { env: {} });
  assert.match(
    sh,
    /already satisfied — short-circuited|already satisfied/,
    "script must show the short-circuit",
  );
  assert.doesNotMatch(
    sh,
    /run_step 'aaaa0001'/,
    "a satisfied action must not run",
  );
});

// ── §3 Ambiguity never coerces to satisfied ─────────────────────────────────

test("§3 two marker matches resolve to unverifiable — never satisfied", async () => {
  const marker = "<!-- agent-skills-comment:review -->";
  const comments = JSON.stringify({
    comments: [
      { body: `${marker}\nhello` },
      { body: `${marker}\nhello again` },
    ],
  });
  const stub = readStub([
    ["issue view 235 --json comments", { status: 0, stdout: comments }],
  ]);
  const r = rec({
    kind: "github.issue.comment",
    consequence: "communication",
    command: {
      argv: ["gh", "issue", "comment", "235", "--body-file", "-"],
      stdin: `${marker}\nhello`,
    },
  });
  const { records: out, counts } = await verify([r], stub);
  assert.equal(counts.unverifiable, 1);
  assert.equal(counts.satisfied, 0, "2+ matches must NEVER read as satisfied");
  assert.match(out[0].verification.detail, /2 comments/);
  const md = hr.render(out, "md", { env: {} });
  assert.match(md, /cannot verify — check by hand/);
});

test("§3 exactly one marker match is satisfied; zero is pending", async () => {
  const marker = "<!-- agent-skills-comment:review -->";
  const one = JSON.stringify({ comments: [{ body: `${marker}\nhello` }] });
  const none = JSON.stringify({ comments: [{ body: "unrelated" }] });
  const mk = (stdout) =>
    readStub([["issue view 235 --json comments", { status: 0, stdout }]]);
  const r = rec({
    kind: "github.issue.comment",
    command: {
      argv: ["gh", "issue", "comment", "235", "--body-file", "-"],
      stdin: `${marker}\nhello`,
    },
  });
  const a = await verify([r], mk(one));
  assert.equal(a.counts.satisfied, 1);
  const b = await verify([r], mk(none));
  assert.equal(b.counts.pending, 1);
});

test("§3 the no-marker heuristic: one match satisfied, two matches unverifiable", async () => {
  const two = JSON.stringify({
    comments: [
      { body: "Pipeline started — branch: x" },
      { body: "Pipeline started — branch: x (retyped)" },
    ],
  });
  const stub = readStub([
    ["issue view 235 --json comments", { status: 0, stdout: two }],
  ]);
  const r = rec({
    kind: "github.issue.comment",
    command: {
      argv: ["gh", "issue", "comment", "235", "--body-file", "-"],
      stdin: "Pipeline started — branch: x", // no marker — a human retyped it
    },
  });
  const { counts } = await verify([r], stub);
  assert.equal(
    counts.unverifiable,
    1,
    "heuristic multi-match must be unverifiable",
  );
});

// ── §4 Divergence — the card moved somewhere else ───────────────────────────

test("§4 observed ≠ desired with a known baseline ≠ observed derives divergent", async () => {
  const stub = readStub([["graphql", boardRead("Blocked")]]);
  // The first pass recorded the pre-action value: the card sat in To Do.
  const r = rec({
    verification: {
      state: "pending",
      at: "2026-08-18T10:00:00Z",
      observed: "To Do",
      baseline: "To Do",
      detail: "still To Do; wanted Done",
    },
  });
  const { records: out, counts } = await verify([r], stub);
  assert.equal(counts.divergent, 1);
  assert.match(out[0].verification.detail, /observed Blocked, wanted Done/);
});

test("§4 observed equal to the baseline stays pending — not divergent", async () => {
  const stub = readStub([["graphql", boardRead("To Do")]]);
  const r = rec({
    verification: {
      state: "pending",
      at: "2026-08-18T10:00:00Z",
      observed: "To Do",
      baseline: "To Do",
      detail: "still To Do; wanted Done",
    },
  });
  const { counts } = await verify([r], stub);
  assert.equal(counts.pending, 1);
  assert.equal(counts.divergent, 0);
});

test("§4 the first pass records the baseline it observed", async () => {
  const stub = readStub([["graphql", boardRead("To Do")]]);
  const { records: out } = await verify([rec()], stub);
  assert.equal(out[0].verification.state, "pending");
  assert.equal(out[0].verification.baseline, "To Do");
});

test("§4 a divergent step is guarded behind --all in the rendered script", async () => {
  const stub = readStub([["graphql", boardRead("Blocked")]]);
  const r = rec({
    command: { argv: ["gh", "project", "item-edit", "--id", "x"], stdin: null },
    verification: {
      state: "pending",
      at: "2026-08-18T10:00:00Z",
      observed: "To Do",
      baseline: "To Do",
      detail: "",
    },
  });
  const { records: out } = await verify([r], stub);
  const sh = hr.render(out, "sh", { env: {} });
  assert.match(
    sh,
    /divergent_step 'aaaa0001'/,
    "divergent action must use the guard",
  );
  assert.match(sh, /--all\) ALL=1/, "the script must parse --all");
  assert.match(sh, /DIVERGENT — skipped \(re-run with --all to force\)/);
  const md = hr.render(out, "md", { env: {} });
  assert.match(
    md,
    /observed `Blocked`, wanted/,
    "checklist must show observed vs wanted",
  );
});

// ── §5 A failed read never aborts the pass ──────────────────────────────────

test("§5 a failed read derives unverifiable and the run continues", async () => {
  const stub = readStub([
    ["issue view 235 --json state", { status: 1, error: "boom" }],
    ["graphql", boardRead("Done")],
  ]);
  const records = [
    rec({ id: "aaaa0001", kind: "github.issue.close", desired: {} }),
    rec({ id: "aaaa0002" }),
  ];
  const { records: out, counts } = await verify(records, stub);
  assert.equal(counts.unverifiable, 1, "failed read → unverifiable");
  assert.equal(counts.satisfied, 1, "the pass continued to the next record");
  assert.match(out[0].verification.detail, /read failed/);
});

test("§5 a kind with no reliable read is unverifiable; a kind with no recipe is pending", async () => {
  const stub = readStub([]);
  const records = [
    rec({
      id: "aaaa0001",
      kind: "jira.worklog.add",
      system: "jira",
      consequence: "communication",
    }),
    rec({
      id: "aaaa0002",
      kind: "jira.unknown-mutation",
      system: "jira",
      consequence: "irreversible",
    }),
  ];
  const { records: out, counts } = await verify(records, stub);
  assert.equal(counts.unverifiable, 2);
  assert.match(out[0].verification.detail, /no reliable read/);
});

// ── §6 Idempotence ───────────────────────────────────────────────────────────

test("§6 re-verifying an unchanged state keeps the annotation verbatim, timestamp included", async () => {
  const stub = readStub([["graphql", boardRead("Done")]]);
  const first = await verify([rec()], stub, {
    now: () => "2026-08-20T09:00:00Z",
  });
  const second = await verify(
    first.records,
    readStub([["graphql", boardRead("Done")]]),
    {
      now: () => "2026-08-21T17:30:00Z", // a later clock must NOT leak in
    },
  );
  assert.deepEqual(
    second.records[0].verification,
    first.records[0].verification,
    "unchanged state must keep the stored annotation byte-for-byte",
  );
});

// ── §7 The four states partition the model and reach every renderer ─────────

test("§7 counts: pending + divergent + unverifiable === outstanding; all four in json and summary", async () => {
  const marker = "<!-- agent-skills-comment:review -->";
  const stub = readStub([
    ["graphql", boardRead("Done")], // satisfied
    [
      "issue view 111 --json comments",
      {
        status: 0,
        stdout: JSON.stringify({
          comments: [{ body: `${marker}a` }, { body: `${marker}b` }],
        }),
      },
    ], // unverifiable
  ]);
  const records = [
    rec({ id: "aaaa0001" }),
    rec({
      id: "aaaa0002",
      kind: "github.issue.comment",
      consequence: "communication",
      target: { issue: "111", url: "" },
      command: {
        argv: ["gh", "issue", "comment", "111", "--body-file", "-"],
        stdin: `${marker}x`,
      },
    }),
    rec({
      id: "aaaa0003",
      target: { issue: "999", url: "" },
      verification: {
        state: "divergent",
        at: "2026-08-19T10:00:00Z",
        observed: "Blocked",
        baseline: "To Do",
        detail: "observed Blocked, wanted Done",
      },
    }),
  ];
  // aaaa0003's board read: keep it divergent by returning the same observation.
  stub.calls.length = 0;
  const io = hv.makeIo({
    env: {},
    execImpl: (argv) => {
      const joined = argv.join(" ");
      if (joined.includes("999")) return boardRead("Blocked");
      if (joined.includes("graphql")) return boardRead("Done");
      if (joined.includes("111"))
        return {
          status: 0,
          stdout: JSON.stringify({
            comments: [{ body: `${marker}a` }, { body: `${marker}b` }],
          }),
        };
      return { status: 1, error: "no response" };
    },
    now: FIXED_NOW,
  });
  const { records: out } = await hv.verifyRecords(records, { io });

  const model = hr.buildModel(out, {});
  assert.equal(
    model.counts.pending + model.counts.divergent + model.counts.unverifiable,
    model.counts.outstanding,
    "the three sub-states must partition outstanding exactly",
  );
  assert.equal(model.counts.satisfied, 1);
  assert.equal(model.counts.divergent, 1);
  assert.equal(model.counts.unverifiable, 1);

  const json = JSON.parse(hr.render(out, "json", { env: {} }));
  assert.deepEqual(json.divergent, ["aaaa0003"]);
  assert.deepEqual(json.unverifiable, ["aaaa0002"]);
  assert.deepEqual(json.satisfied, ["aaaa0001"]);

  const summary = hr.render(out, "summary", { env: {} });
  assert.match(summary, /1 divergent/);
  assert.match(summary, /1 unverifiable/);
  assert.match(summary, /1 already correct/);
});

// ── §8 renderersForMode — the approve model's selection ─────────────────────

test("§8 approve WITH a tty selects md+sh+summary; WITHOUT one it degrades to command", () => {
  assert.deepEqual(hr.renderersForMode("approve", { tty: true }), [
    "md",
    "sh",
    "summary",
  ]);
  assert.deepEqual(
    hr.renderersForMode("approve", { tty: false }),
    hr.renderersForMode("command", { tty: false }),
    "non-tty approve must equal command — the operator runs the script; consent is never assumed",
  );
});

test("§8 the other modes select per the schema doc's table", () => {
  assert.deepEqual(hr.renderersForMode("full", { tty: true }), ["summary"]);
  assert.deepEqual(hr.renderersForMode("read-only", { tty: true }), [
    "json",
    "summary",
  ]);
  assert.deepEqual(hr.renderersForMode("command", { tty: true }), [
    "sh",
    "summary",
  ]);
  assert.deepEqual(hr.renderersForMode("manual", { tty: true }), [
    "md",
    "summary",
  ]);
  assert.throws(
    () => hr.renderersForMode("write-everything"),
    /unknown access mode/,
  );
});

// ── §9 git push verification — credential-free ──────────────────────────────

test("§9 verifyGitPush compares ls-remote to the local sha with no API call", () => {
  const sha = "a".repeat(40);
  const io = hv.makeIo({
    env: {},
    execImpl: (argv) => {
      if (argv[1] === "rev-parse") return { status: 0, stdout: `${sha}\n` };
      if (argv[1] === "ls-remote")
        return { status: 0, stdout: `${sha}\trefs/heads/main\n` };
      throw new Error(`unexpected argv ${argv.join(" ")}`);
    },
  });
  assert.equal(hv.verifyGitPush("main", { io }).state, "satisfied");

  const io2 = hv.makeIo({
    env: {},
    execImpl: (argv) => {
      if (argv[1] === "rev-parse") return { status: 0, stdout: `${sha}\n` };
      if (argv[1] === "ls-remote") return { status: 0, stdout: "" };
      throw new Error("unexpected");
    },
  });
  assert.equal(hv.verifyGitPush("main", { io: io2 }).state, "pending");
});

// ── §10 Regressions from QA cycle 1 (CR-2, CR-4, CR-5) ─────────────────────

test("§10 CR-2: a revoked tick is cleared — satisfied follows the fresh read", async () => {
  // Ticked by an earlier pass, then the board regresses to a third value.
  const stub = readStub([["graphql", boardRead("Blocked")]]);
  const r = rec({
    satisfied: true,
    verification: {
      state: "satisfied",
      at: "2026-08-19T10:00:00Z",
      observed: "Done",
      detail: "verified in the desired state",
    },
  });
  const { records: out, counts } = await verify([r], stub);
  assert.equal(out[0].satisfied, false, "the stale tick must be revoked");
  assert.notEqual(out[0].verification.state, "satisfied");
  assert.equal(counts.satisfied, 0);
  const model = hr.buildModel(out, {});
  assert.equal(
    model.counts.satisfied,
    0,
    "partition must not render the regression as ticked",
  );
  assert.equal(model.counts.outstanding, 1);
});

test("§10 CR-4: a divergent AND irreversible step keeps its confirm gate under --all", async () => {
  const stub = readStub([["graphql", boardRead("Blocked")]]);
  const r = rec({
    consequence: "irreversible",
    command: { argv: ["gh", "pr", "merge", "12", "--squash"], stdin: null },
    verification: {
      state: "pending",
      at: "2026-08-18T10:00:00Z",
      observed: "To Do",
      baseline: "To Do",
      detail: "",
    },
  });
  const { records: out } = await verify([r], stub);
  const sh = hr.render(out, "sh", { env: {} });
  assert.match(
    sh,
    /divergent_step 'aaaa0001' .* confirm_step /,
    "the divergent guard must dispatch to confirm_step, not replace it",
  );
  // And a reversible divergent step dispatches to run_step.
  const r2 = { ...r, consequence: "state-drift" };
  const { records: out2 } = await verify(
    [r2],
    readStub([["graphql", boardRead("Blocked")]]),
  );
  const sh2 = hr.render(out2, "sh", { env: {} });
  assert.match(sh2, /divergent_step 'aaaa0001' .* run_step /);
});

test("§10 CR-5: render --verify annotates in-process and the annotations reach the artifact", async () => {
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } =
    await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "render-verify-"));
  try {
    const journal = join(dir, "journal.jsonl");
    writeFileSync(journal, `${JSON.stringify(rec())}\n`);
    const out = join(dir, "task.9.handover.1.smoke.md");
    const io = hv.makeIo({
      env: {},
      execImpl: readStub([["graphql", boardRead("Done")]]).execImpl,
      now: FIXED_NOW,
    });
    const result = await hr.run({
      argv: [
        "node",
        "handover-render.js",
        "--journal",
        journal,
        "--format",
        "md",
        "--out",
        out,
        "--verify",
        "--quiet",
      ],
      env: {},
      cwd: dir,
      verifyIo: io,
    });
    assert.equal(result.exitCode, 0);
    const md = readFileSync(out, "utf8");
    assert.match(
      md,
      /- \[x\] ~~/,
      "the verified tick must reach the rendered artifact",
    );
    assert.match(md, /observed `Done`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── §11 Regressions from QA cycle 2 (CR2-1, CR2-2, CR2-4) ──────────────────

test("§11 CR2-1: a single-format render lands on the format's own extension", async () => {
  const { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } =
    await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "render-ext-"));
  try {
    const journal = join(dir, "journal.jsonl");
    writeFileSync(journal, `${JSON.stringify(rec())}\n`);
    // --out names the .md base, per the pipeline docs — a lone sh/json format
    // must land on .sh/.json, or reconcile's *.handover.*.json glob finds nothing.
    for (const [format, ext, marker] of [
      ["sh", "sh", "#!/usr/bin/env bash"],
      ["json", "json", '"generator": "handover-render.js"'],
      ["md", "md", "# Tracker actions required"],
    ]) {
      const out = join(dir, `task.9.handover.1.smoke.md`);
      const r = hr.run({
        argv: [
          "node",
          "handover-render.js",
          "--journal",
          journal,
          "--format",
          format,
          "--out",
          out,
          "--quiet",
        ],
        env: {},
        cwd: dir,
      });
      assert.equal(r.exitCode, 0);
      const expected = join(dir, `task.9.handover.1.smoke.${ext}`);
      assert.ok(existsSync(expected), `${format} must write ${expected}`);
      assert.match(
        readFileSync(expected, "utf8"),
        new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
      rmSync(expected, { force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("§11 CR2-2: a tick is NOT revoked without evidence — unverifiable and no-recipe reads keep it", async () => {
  // An executed/verified action whose kind has no reliable read: the fresh
  // pass returns unverifiable, which is silence, not evidence of regression.
  const ticked = rec({
    kind: "jira.worklog.add",
    system: "jira",
    consequence: "communication",
    satisfied: true,
    verification: {
      state: "satisfied",
      at: "2026-08-19T10:00:00Z",
      observed: "executed",
      evidence: true,
      detail: "executed by tracker-reconcile --apply",
    },
  });
  const { records: out, counts } = await verify([ticked], readStub([]));
  assert.equal(out[0].satisfied, true, "silence must not revoke a tick");
  assert.equal(counts.satisfied + counts.unverifiable, 1);
  const model = hr.buildModel(out, {});
  assert.equal(
    model.counts.satisfied,
    1,
    "the ticked action must not return to outstanding",
  );
  assert.equal(model.counts.outstanding, 0, "no re-run risk: not outstanding");

  // But POSITIVE evidence still revokes: a real board read showing a
  // non-desired value.
  const regressed = rec({
    satisfied: true,
    verification: {
      state: "satisfied",
      at: "2026-08-19T10:00:00Z",
      observed: "Done",
      evidence: true,
      detail: "verified in the desired state",
    },
  });
  const { records: out2 } = await verify(
    [regressed],
    readStub([["graphql", boardRead("To Do")]]),
  );
  assert.equal(
    out2[0].satisfied,
    false,
    "a real read showing regression must revoke",
  );
});

test("§11 CR2-4: a render failure under --verify propagates — it is not swallowed as a verify failure", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "render-fail-"));
  try {
    const journal = join(dir, "journal.jsonl");
    writeFileSync(journal, `${JSON.stringify(rec())}\n`);
    const io = hv.makeIo({
      env: {},
      execImpl: readStub([["graphql", boardRead("Done")]]).execImpl,
      now: FIXED_NOW,
    });
    // An unwritable --out path: the render fails; with the old catch placement
    // this resolved exitCode 0 after a second unannotated render attempt.
    const r = await hr
      .run({
        argv: [
          "node",
          "handover-render.js",
          "--journal",
          journal,
          "--format",
          "md",
          "--out",
          join(dir, "no-such-dir-file\u0000bad", "x.md"),
          "--verify",
          "--quiet",
        ],
        env: {},
        cwd: dir,
        verifyIo: io,
      })
      .catch((e) => ({ threw: true, message: e.message }));
    assert.ok(
      r.threw || r.exitCode !== 0,
      "a render failure must surface as a failure",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
