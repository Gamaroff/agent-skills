"use strict";
/**
 * stage-access-gate.test.mjs — the ACCESS_TRACKER gate on the two stage CLIs.
 *
 * `jira-stage.js` and `gh-stage.js` are the only files task.52 changes that sit
 * on a live pipeline path. They are invoked from six pipeline steps and seven
 * skills, so this suite exists to hold two properties in tension:
 *
 *   INERT UNDER `full` — which is every consumer today. A gate that misfires
 *       silently stops every pipeline moving cards. The comparison must be
 *       `!== "full"` explicitly: an UNSET variable reads as `full`.
 *
 *   NO NETWORK UNDER A RESTRICTED MODE — the defer branch must be reached before
 *       any credential read or out-of-process call. Both CLIs take an injectable
 *       transport (`fetchImpl` / `execImpl`); here they are injected as THROWING
 *       stubs, so any attempt to reach out fails the test rather than being
 *       counted after the fact.
 *
 * Run: node --test shared/resources/tests/stage-access-gate.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED = join(__dirname, "..");

const ghCli = require(join(SHARED, "gh-stage.js"));
const jiraCli = require(join(SHARED, "jira-stage.js"));
const dm = require(join(SHARED, "defer-mutation.js"));

const RESTRICTED = ["read-only", "approve", "command", "manual"];

const LADDER = `
statuses:
  - Todo
  - In Progress
  - In Review
  - Done
pipeline:
  work-started: In Progress
  in-review: In Review
  done: Done
`;

const PROJECT_YML = `github:
  owner: Gamaroff
  repo: agent-skills
  project_board_name: "Agent Skills"
  project_board_number: 1
`;

const _tmp = [];
function withRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "stage-gate-"));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body);
  }
  _tmp.push(dir);
  return dir;
}
process.on("exit", () => {
  for (const d of _tmp) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {}
  }
});

/**
 * Run one CLI with ACCESS_TRACKER set, a journal redirected into a temp dir, and
 * a transport that throws if touched. Restores the environment afterwards.
 */
/**
 * @param {string|undefined} mode - ACCESS_TRACKER value; undefined leaves it unset
 * @param {(ctx: {dir: string, journal: string}) => any} fn
 * @param {{credentials?: boolean}} [opts] - when true, present a full JIRA_* set
 *   so `getAuth()` succeeds. Without this, jira-stage short-circuits at
 *   "no-credentials" and a "no network call" assertion proves nothing, because
 *   no network call was reachable in the first place. The consumer who matters
 *   is the one who HAS a token and has declared a restricted mode.
 */
function underAccess(mode, fn, { credentials = false } = {}) {
  const dir = withRepo({ "tracker-workflow.yaml": LADDER, "project.yml": PROJECT_YML });
  const journal = join(dir, "journal.jsonl");
  const saved = {};
  const set = (k, v) => {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  };

  set("ACCESS_TRACKER", mode);
  set("TRACKER_ACTIONS_JOURNAL", journal);
  set("JIRA_URL", "https://acme.atlassian.net");
  // The exact set `getAuth()` requires — an incomplete set short-circuits at
  // "no-credentials", which would make the no-network assertions vacuous.
  set("JIRA_USER_EMAIL", credentials ? "bot@acme.test" : undefined);
  set("JIRA_API_TOKEN", credentials ? "fake-token-for-tests" : undefined);
  set("JIRA_PROJECT_KEY", credentials ? "PROJ" : undefined);

  const restore = () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };

  let result;
  try {
    result = fn({ dir, journal });
  } catch (e) {
    restore();
    throw e;
  }
  // The jira CLI is async; the environment must survive until it settles.
  if (result && typeof result.then === "function") {
    return result.then(
      (v) => {
        restore();
        return v;
      },
      (e) => {
        restore();
        throw e;
      },
    );
  }
  restore();
  return result;
}

const explode = (what) => () => {
  throw new Error(`NETWORK CALL ATTEMPTED via ${what} — the gate leaked`);
};

function readJournal(journal) {
  if (!existsSync(journal)) return [];
  return readFileSync(journal, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// ── gh-stage ────────────────────────────────────────────────────────────────

for (const mode of RESTRICTED) {
  test(`gh-stage defers under access.tracker=${mode}: exit 0, reason "deferred", one record, no network`, () => {
    underAccess(mode, ({ dir, journal }) => {
      const r = ghCli.run({
        argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "done", "--json"],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      });

      assert.equal(r.exitCode, 0, "a gated run must exit 0 — pipeline steps run in shells");
      assert.equal(r.transitioned, false);
      assert.equal(r.reason, "deferred");
      assert.equal(r.access, mode);

      const records = readJournal(journal);
      assert.equal(records.length, 1, `expected exactly one record, got ${records.length}`);
      const rec = records[0];
      assert.equal(rec.kind, "github.board.field-set");
      assert.equal(rec.system, "github");
      assert.equal(rec.access, mode);
      assert.equal(rec.target.issue, "42");
      assert.deepEqual(rec.desired, { Status: "Done" });
      assert.ok(rec.intent.includes("Done"), "the record must name the target column");
      assert.equal(rec.id, r.record, "the CLI must report the id it wrote");
    });
  });
}

test("gh-stage under access.tracker=full is inert: no record, transport is reached", () => {
  underAccess("full", ({ dir, journal }) => {
    let reached = false;
    const r = ghCli.run({
      argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "done", "--json"],
      execImpl: (argv) => {
        reached = true;
        if (argv[0] === "auth") throw new Error("not authenticated");
        return "";
      },
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(r.exitCode, 0);
    assert.equal(
      r.reason,
      "no-credentials",
      "under `full` the CLI must take its normal path, not the gate",
    );
    assert.equal(reached, true, "the gate swallowed a full-access run");
    assert.deepEqual(readJournal(journal), [], "a full-access run must write no record");
  });
});

test("gh-stage with ACCESS_TRACKER unset behaves exactly as `full`", () => {
  const asFull = underAccess("full", ({ dir }) =>
    ghCli.run({
      argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "done", "--json"],
      execImpl: () => {
        throw new Error("not authenticated");
      },
      repoRoot: dir,
      sleepImpl: () => {},
    }),
  );
  const asUnset = underAccess(undefined, ({ dir, journal }) => {
    const r = ghCli.run({
      argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "done", "--json"],
      execImpl: () => {
        throw new Error("not authenticated");
      },
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.deepEqual(readJournal(journal), [], "an unset variable must not defer");
    return r;
  });
  assert.deepEqual(
    asUnset,
    asFull,
    "an unset ACCESS_TRACKER must be byte-identical to `full` — gating on " +
      "truthiness or emptiness instead of `!== \"full\"` breaks every consumer",
  );
});

test("gh-stage --probe-board still reads under a restricted mode", () => {
  underAccess("manual", ({ dir, journal }) => {
    let reached = false;
    ghCli.run({
      argv: ["node", "gh-stage.js", "--probe-board", "--json"],
      execImpl: () => {
        reached = true;
        throw new Error("not authenticated");
      },
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(
      reached,
      true,
      "--probe-board is a READ; gating it would break scaffold-tracker-workflow " +
        "for exactly the consumers who most need to see their board",
    );
    assert.deepEqual(readJournal(journal), [], "a read must not write a record");
  });
});

test("gh-stage: a disabled moment under a restricted mode is stage-disabled, not deferred", () => {
  underAccess("manual", ({ journal }) => {
    // A ladder that declares no `in-qa` moment: there was never a mutation to
    // defer, so reporting one would invent work for the operator.
    const dir = withRepo({
      "tracker-workflow.yaml": LADDER,
      "project.yml": PROJECT_YML,
    });
    const r = ghCli.run({
      argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "in-qa", "--json"],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.reason, "stage-disabled");
    assert.deepEqual(readJournal(journal), []);
  });
});

// ── jira-stage ──────────────────────────────────────────────────────────────

for (const mode of RESTRICTED) {
  test(`jira-stage defers under access.tracker=${mode}: exit 0, reason "deferred", one record, no network`, async () => {
    // Credentials ARE present. That is the whole point: without them the CLI
    // stops at "no-credentials" and never reaches a network call, so the
    // assertion below would hold for a gate that did not exist.
    await underAccess(
      mode,
      async ({ dir, journal }) => {
        let fetches = 0;
        const res = await jiraCli.run({
          argv: ["node", "jira-stage.js", "--issue", "PROJ-7", "--stage", "done", "--json"],
          fetchImpl: (...a) => {
            fetches++;
            return explode("fetch")(...a);
          },
          repoRoot: dir,
        });

        assert.equal(
          fetches,
          0,
          "the gate let the CLI reach the network before deferring",
        );
        assert.equal(res.exitCode, 0);
        assert.equal(res.transitioned, false);
        assert.equal(res.reason, "deferred");
        assert.equal(res.access, mode);

        const records = readJournal(journal);
        assert.equal(records.length, 1, `expected one record, got ${records.length}`);
        const rec = records[0];
        assert.equal(rec.kind, "jira.transition");
        assert.equal(rec.system, "jira");
        assert.equal(rec.access, mode);
        assert.equal(rec.target.issue, "PROJ-7");
        assert.ok(
          rec.target.url.includes("acme.atlassian.net/browse/PROJ-7"),
          "the record must carry a link the operator can open",
        );
        assert.equal(rec.consequence, "state-drift");
        assert.equal(rec.id, res.record);

        // And the credential must not have leaked into the record.
        assert.ok(
          !JSON.stringify(rec).includes("fake-token-for-tests"),
          "the deferred record carries the token it declined to use",
        );
      },
      { credentials: true },
    );
  });
}

test("jira-stage under `full` WITH credentials does reach the network", async () => {
  // The counterpart to the four tests above: proof that they are measuring the
  // gate rather than an environment with nothing to call.
  await underAccess(
    "full",
    async ({ dir, journal }) => {
      let fetches = 0;
      await jiraCli.run({
        argv: ["node", "jira-stage.js", "--issue", "PROJ-7", "--stage", "done", "--json"],
        fetchImpl: () => {
          fetches++;
          throw new Error("network unavailable in test");
        },
        repoRoot: dir,
      });
      assert.ok(fetches > 0, "a full-access run must still talk to Jira");
      assert.deepEqual(readJournal(journal), [], "a full-access run writes no record");
    },
    { credentials: true },
  );
});

test("jira-stage --print-plan still works under a restricted mode (credential-free read)", async () => {
  await underAccess("manual", async ({ dir, journal }) => {
    const r = await jiraCli.run({
      argv: ["node", "jira-stage.js", "--stage", "done", "--print-plan", "--json"],
      fetchImpl: explode("fetch"),
      repoRoot: dir,
    });
    assert.equal(r.exitCode, 0);
    assert.equal(
      r.reason,
      "plan",
      "--print-plan is what the MCP fallback protocol consumes; gating it would " +
        "break the fallback for restricted consumers",
    );
    assert.deepEqual(readJournal(journal), []);
  });
});

test("jira-stage under access.tracker=full is inert: no record, normal path taken", async () => {
  await underAccess("full", async ({ dir, journal }) => {
    const r = await jiraCli.run({
      argv: ["node", "jira-stage.js", "--issue", "PROJ-7", "--stage", "done", "--json"],
      fetchImpl: explode("fetch"),
      repoRoot: dir,
    });
    assert.equal(r.exitCode, 0);
    assert.equal(
      r.reason,
      "no-credentials",
      "under `full` the CLI must reach its normal credential check",
    );
    assert.deepEqual(readJournal(journal), []);
  });
});

// ── The mode value itself ───────────────────────────────────────────────────

test("an unrecognised ACCESS_TRACKER is refused, never defaulted to full", () => {
  underAccess("manul", ({ dir }) => {
    const r = ghCli.run({
      argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "done", "--json"],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(
      r.exitCode,
      2,
      "a typo'd mode must not silently escalate into a tracker write",
    );
  });
});

test("resolveAccessTracker: unset and empty both read as full; every legal mode round-trips", () => {
  assert.equal(dm.resolveAccessTracker({}), "full");
  assert.equal(dm.resolveAccessTracker({ ACCESS_TRACKER: "" }), "full");
  assert.equal(dm.resolveAccessTracker({ ACCESS_TRACKER: "  " }), "full");
  for (const mode of dm.ACCESS_MODES) {
    assert.equal(dm.resolveAccessTracker({ ACCESS_TRACKER: mode }), mode);
  }
  assert.throws(
    () => dm.resolveAccessTracker({ ACCESS_TRACKER: "FULL" }),
    /not a recognised access mode/,
    "mode values are lowercase; accepting a variant here would fork the grammar " +
      "from resolve-platform.sh",
  );
});

// ── The deferred record renders ─────────────────────────────────────────────

test("a gated run produces a journal that renders in all four formats", async () => {
  const hr = require(join(SHARED, "handover-render.js"));
  await underAccess("manual", async ({ dir, journal }) => {
    ghCli.run({
      argv: ["node", "gh-stage.js", "--issue", "42", "--stage", "done", "--json"],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    await jiraCli.run({
      argv: ["node", "jira-stage.js", "--issue", "PROJ-7", "--stage", "in-review", "--json"],
      fetchImpl: explode("fetch"),
      repoRoot: dir,
    });

    const records = readJournal(journal);
    assert.equal(records.length, 2, "both CLIs should have recorded");

    for (const format of hr.FORMATS) {
      const text = hr.render(records, format, { access: "manual" });
      assert.ok(text.trim().length > 0, `${format} rendered empty`);
      assert.ok(text.includes("42") || text.includes("PROJ-7"));
    }
    // The end-to-end point of the whole task: a checklist that names the card
    // and its target column.
    const md = hr.render(records, "md", { access: "manual" });
    assert.match(md, /PROJ-7/);
    assert.match(md, /Done/);
  });
});
