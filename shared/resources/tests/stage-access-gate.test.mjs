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
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
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
  const dir = withRepo({
    "tracker-workflow.yaml": LADDER,
    "project.yml": PROJECT_YML,
  });
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
        argv: [
          "node",
          "gh-stage.js",
          "--issue",
          "42",
          "--stage",
          "done",
          "--json",
        ],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      });

      assert.equal(
        r.exitCode,
        0,
        "a gated run must exit 0 — pipeline steps run in shells",
      );
      assert.equal(r.transitioned, false);
      assert.equal(r.reason, "deferred");
      assert.equal(r.access, mode);

      const records = readJournal(journal);
      assert.equal(
        records.length,
        1,
        `expected exactly one record, got ${records.length}`,
      );
      const rec = records[0];
      assert.equal(rec.kind, "github.board.field-set");
      assert.equal(rec.system, "github");
      assert.equal(rec.access, mode);
      assert.equal(rec.target.issue, "42");
      assert.deepEqual(rec.desired, { Status: "Done" });
      assert.ok(
        rec.intent.includes("Done"),
        "the record must name the target column",
      );
      assert.equal(rec.id, r.record, "the CLI must report the id it wrote");
    });
  });
}

test("gh-stage under access.tracker=full is inert: no record, transport is reached", () => {
  underAccess("full", ({ dir, journal }) => {
    let reached = false;
    const r = ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--json",
      ],
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
    assert.deepEqual(
      readJournal(journal),
      [],
      "a full-access run must write no record",
    );
  });
});

test("gh-stage with ACCESS_TRACKER unset behaves exactly as `full`", () => {
  const asFull = underAccess("full", ({ dir }) =>
    ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--json",
      ],
      execImpl: () => {
        throw new Error("not authenticated");
      },
      repoRoot: dir,
      sleepImpl: () => {},
    }),
  );
  const asUnset = underAccess(undefined, ({ dir, journal }) => {
    const r = ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--json",
      ],
      execImpl: () => {
        throw new Error("not authenticated");
      },
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.deepEqual(
      readJournal(journal),
      [],
      "an unset variable must not defer",
    );
    return r;
  });
  assert.deepEqual(
    asUnset,
    asFull,
    "an unset ACCESS_TRACKER must be byte-identical to `full` — gating on " +
      'truthiness or emptiness instead of `!== "full"` breaks every consumer',
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
    assert.deepEqual(
      readJournal(journal),
      [],
      "a read must not write a record",
    );
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
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "in-qa",
        "--json",
      ],
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
          argv: [
            "node",
            "jira-stage.js",
            "--issue",
            "PROJ-7",
            "--stage",
            "done",
            "--json",
          ],
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
        assert.equal(
          records.length,
          1,
          `expected one record, got ${records.length}`,
        );
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
        argv: [
          "node",
          "jira-stage.js",
          "--issue",
          "PROJ-7",
          "--stage",
          "done",
          "--json",
        ],
        fetchImpl: () => {
          fetches++;
          throw new Error("network unavailable in test");
        },
        repoRoot: dir,
      });
      assert.ok(fetches > 0, "a full-access run must still talk to Jira");
      assert.deepEqual(
        readJournal(journal),
        [],
        "a full-access run writes no record",
      );
    },
    { credentials: true },
  );
});

test("jira-stage --print-plan still works under a restricted mode (credential-free read)", async () => {
  await underAccess("manual", async ({ dir, journal }) => {
    const r = await jiraCli.run({
      argv: [
        "node",
        "jira-stage.js",
        "--stage",
        "done",
        "--print-plan",
        "--json",
      ],
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
      argv: [
        "node",
        "jira-stage.js",
        "--issue",
        "PROJ-7",
        "--stage",
        "done",
        "--json",
      ],
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
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--json",
      ],
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
  // `config: false` pins the ENV tier in isolation. Without it these assertions
  // would quietly depend on the config of whatever repo the suite happens to run
  // in — they pass today only because this one declares no `access:` key, which
  // is a property of the checkout, not of the resolver. The config tier has its
  // own corpus in access-config-parity.test.mjs.
  const env = { config: false };
  assert.equal(dm.resolveAccessTracker({}, env), "full");
  assert.equal(dm.resolveAccessTracker({ ACCESS_TRACKER: "" }, env), "full");
  assert.equal(dm.resolveAccessTracker({ ACCESS_TRACKER: "  " }, env), "full");
  for (const mode of dm.ACCESS_MODES) {
    assert.equal(dm.resolveAccessTracker({ ACCESS_TRACKER: mode }, env), mode);
  }
  assert.throws(
    () => dm.resolveAccessTracker({ ACCESS_TRACKER: "FULL" }, env),
    /not a recognised access mode/,
    "mode values are lowercase; accepting a variant here would fork the grammar " +
      "from resolve-platform.sh",
  );
});

test("resolveAccessTracker: the config tier is on by default, and only opt-OUT", () => {
  // The entire point of task.61: a caller that passes nothing still reads the
  // file. If this ever inverts, a committed restriction goes back to being
  // invisible to every bare `node …` invocation and nothing else fails.
  const src = readFileSync(join(SHARED, "defer-mutation.js"), "utf8");
  assert.match(
    src,
    /opts\.config !== false/,
    "the config tier must be opt-out, never opt-in",
  );
  // And it must not be reachable only through a flag no call site passes.
  for (const f of ["jira-stage.js", "gh-stage.js", "jira-sync.js"]) {
    assert.doesNotMatch(
      readFileSync(join(SHARED, f), "utf8"),
      /config:\s*false/,
      `${f} must not opt out of the config tier`,
    );
  }
});

test("resolveAccessTracker: every gate passes a repo root, not process.cwd()", () => {
  // C5-CR6. A gate that resolves against process.cwd() reads a declared
  // restriction as absent from any subdirectory — which is where a bare
  // `node …` invocation is most likely to be run from.
  for (const f of ["jira-stage.js", "gh-stage.js"]) {
    const src = readFileSync(join(SHARED, f), "utf8");
    assert.match(
      src,
      /resolveAccessTracker\(accessEnv,\s*\{[\s\S]{0,120}?cwd:/,
      `${f} must anchor the config tier to the root it already computed`,
    );
  }
  // And the snapshot has to carry the config PATH, or a .env redirects around it.
  for (const f of ["jira-stage.js", "gh-stage.js"]) {
    const literal = /const accessEnv = \{[^}]*\}/s.exec(
      readFileSync(join(SHARED, f), "utf8"),
    );
    assert.ok(literal, `${f} must keep a flat accessEnv literal`);
    assert.match(
      literal[0],
      /SKILLS_CONFIG_FILE/,
      `${f} must snapshot the config path alongside the mode (C5-CR1)`,
    );
  }
});

// ── The deferred record renders ─────────────────────────────────────────────

test("a gated run produces a journal that renders in all four formats", async () => {
  const hr = require(join(SHARED, "handover-render.js"));
  await underAccess("manual", async ({ dir, journal }) => {
    ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--json",
      ],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    await jiraCli.run({
      argv: [
        "node",
        "jira-stage.js",
        "--issue",
        "PROJ-7",
        "--stage",
        "in-review",
        "--json",
      ],
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

// ── task.54: gh-stage --print-plan, and the two gaps it closed in the gate ───
//
// `--print-plan` is the GitHub half of the credential-free pair jira-stage.js has
// had since task.38. Its whole value is to the consumer with NO credentials, so
// every test here runs with `explode("gh")` as the transport: any reach for the
// network fails the test rather than merely being slow.

test("gh-stage --print-plan resolves with no credentials and no network", () => {
  underAccess("manual", ({ dir, journal }) => {
    const r = ghCli.run({
      argv: ["node", "gh-stage.js", "--stage", "done", "--print-plan"],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.reason, "plan");
    assert.deepEqual(r.targets, ["Done"]);
    // A plan is a READ. It must never append to the journal — a deferral record
    // for a mutation that was never attempted is noise in the handover.
    assert.deepEqual(readJournal(journal), []);
  });
});

test("gh-stage --print-plan needs no --issue, but still needs --stage", () => {
  underAccess("full", ({ dir }) => {
    // No --issue: fine. This is the case that matters — a `manual` consumer
    // building a checklist knows the stage, and asking them for an issue number
    // to resolve a COLUMN NAME would be nonsense.
    assert.equal(
      ghCli.run({
        argv: ["node", "gh-stage.js", "--stage", "done", "--print-plan"],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      }).exitCode,
      0,
    );
    // No --stage: the stage IS the question, so this is a usage error.
    assert.equal(
      ghCli.run({
        argv: ["node", "gh-stage.js", "--print-plan"],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      }).exitCode,
      2,
    );
  });
});

test("gh-stage --print-plan reports a ladder-disabled moment as disabled, not missing", () => {
  underAccess("manual", ({ dir }) => {
    // LADDER declares no `blocked:`, so the moment is deliberately off. That is
    // the same answer the move path gives as `stage-disabled` — the two must not
    // disagree, or a checklist would list an action the board never wanted.
    const r = ghCli.run({
      argv: ["node", "gh-stage.js", "--stage", "blocked", "--print-plan"],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.targets, null);
  });
});

test("gh-stage --print-plan agrees with --dry-run on the same board", () => {
  // The risk this task named: --print-plan reads the ladder file, --dry-run reads
  // the live board, and a checklist that names a column the board does not have
  // is worse than one that names none. They are allowed to differ in SHAPE —
  // --print-plan returns the whole rung, --dry-run the one name the board has —
  // so the contract is CONTAINMENT, not equality.
  underAccess("full", ({ dir }) => {
    const plan = ghCli.run({
      argv: ["node", "gh-stage.js", "--stage", "done", "--print-plan"],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });

    const board = {
      data: {
        repository: {
          issue: {
            projectItems: {
              nodes: [
                {
                  id: "IT_1",
                  fieldValueByName: { name: "In Progress" },
                  project: {
                    id: "PVT_1",
                    title: "Agent Skills",
                    number: 1,
                    fields: {
                      nodes: [
                        {
                          id: "F_1",
                          name: "Status",
                          options: [
                            { id: "o1", name: "Todo" },
                            { id: "o2", name: "In Progress" },
                            { id: "o3", name: "In Review" },
                            { id: "o4", name: "Done" },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };
    const dry = ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--dry-run",
        "--json",
      ],
      execImpl: (argv) => {
        if (argv[0] === "auth") return "";
        return JSON.stringify(board);
      },
      repoRoot: dir,
      sleepImpl: () => {},
    });

    assert.equal(dry.reason, "dry-run");
    assert.ok(
      plan.targets.includes(dry.would),
      `--dry-run would set "${dry.would}", which --print-plan does not list in ` +
        `${JSON.stringify(plan.targets)} — the credential-free path disagrees ` +
        `with the credentialed one`,
    );
  });
});

test("gh-stage --print-plan is placed ABOVE the auth gate in source order", () => {
  // A behavioural test cannot catch this on its own: move the block below
  // `ghAvailable` and the credential-free tests above still pass on any host
  // where `gh auth status` happens to succeed — i.e. on every developer machine
  // and never in the one deployment that matters. Assert the ORDER directly.
  const src = readFileSync(join(SHARED, "gh-stage.js"), "utf-8");
  const planAt = src.indexOf("if (args.printPlan)");
  const authAt = src.indexOf("if (!ghAvailable(exec))");
  assert.ok(planAt > 0, "--print-plan block not found");
  assert.ok(authAt > 0, "ghAvailable gate not found");
  assert.ok(
    planAt < authAt,
    "--print-plan must resolve BEFORE the first credential read; it is the one " +
      "mode whose entire purpose is to work without credentials",
  );
});

test("a deferred record names the board ADD when --add-to-board was passed", () => {
  underAccess("manual", ({ dir, journal }) => {
    const r = ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--add-to-board",
        "--json",
      ],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(r.reason, "deferred");

    const rec = readJournal(journal)[0];
    // Without this, the checklist told a human to set a field on an item that
    // `ensureOnBoard` had not yet put on the board — an instruction that cannot
    // be followed, on the one path where a human is the only actor.
    assert.equal(rec.desired.onBoard, true);
    assert.match(rec.intent, /board/i);
    assert.match(rec.manual.ui, /add issue #42/i);
    assert.ok(
      rec.command.argv.includes("--add-to-board"),
      "the replay command must preserve --add-to-board, or replaying the " +
        "journal sets the field and leaves the card off the board",
    );
  });
});

test("a deferred record WITHOUT --add-to-board claims no board membership", () => {
  underAccess("manual", ({ dir, journal }) => {
    ghCli.run({
      argv: [
        "node",
        "gh-stage.js",
        "--issue",
        "42",
        "--stage",
        "done",
        "--json",
      ],
      execImpl: explode("gh"),
      repoRoot: dir,
      sleepImpl: () => {},
    });
    const rec = readJournal(journal)[0];
    assert.equal(rec.desired.onBoard, undefined);
    assert.ok(!rec.command.argv.includes("--add-to-board"));
  });
});

for (const extra of [[], ["--add-to-board"]]) {
  test(`a deferred record's verify.cmd is credential-free${
    extra.length ? " (with --add-to-board)" : ""
  }`, () => {
    underAccess("manual", ({ dir, journal }) => {
      ghCli.run({
        argv: [
          "node",
          "gh-stage.js",
          "--issue",
          "42",
          "--stage",
          "done",
          ...extra,
          "--json",
        ],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      });
      const rec = readJournal(journal)[0];
      // This record is written on a machine under a restricted mode — in
      // `manual`, one with no `gh` auth at all. --dry-run sits below
      // `ghAvailable` and reads a live board, so it cannot run there. Handing
      // the operator a verification step that fails on their own machine reads
      // as "the deferral is broken" rather than "here is the column".
      assert.match(rec.verify.cmd, /--print-plan/);
      assert.doesNotMatch(
        rec.verify.cmd,
        /--dry-run/,
        "verify.cmd must not require credentials the deferring host lacks",
      );
    });
  });
}

test("defer-mutation --resolve-access reports the resolved mode, and refuses a typo", () => {
  underAccess("command", ({ dir }) => {
    // The one mode table. The two `.sh` board helpers call this rather than
    // open-coding a fifth copy of the contract, so this is the assertion that
    // keeps shell and JS from drifting.
    assert.equal(
      dm.run({
        argv: ["node", "defer-mutation.js", "--resolve-access"],
        env: { ACCESS_TRACKER: "command" },
        cwd: dir,
      }).access,
      "command",
    );
    // Most-restrictive-wins across the two env tiers.
    assert.equal(
      dm.run({
        argv: ["node", "defer-mutation.js", "--resolve-access"],
        env: {
          ACCESS_TRACKER: "read-only",
          AGENT_SKILLS_ACCESS_TRACKER: "manual",
        },
        cwd: dir,
      }).access,
      "manual",
    );
    // A typo EXITS 2 rather than printing a mode. A refusal is not a
    // resolution, and answering "manual" here would make the caller unable to
    // tell a declared restriction from a mistake.
    assert.equal(
      dm.run({
        argv: ["node", "defer-mutation.js", "--resolve-access"],
        env: { ACCESS_TRACKER: "manul" },
        cwd: dir,
      }).exitCode,
      2,
    );
  });
});

// ── task.54 / TASK-54-BUG-2: --print-plan validates its own arguments ────────
//
// The moment check and the lowercasing used to live only inside the
// `if (!args.probeBoard)` block. Three flags set `probeBoard` — `--probe-board`
// directly, plus `--check` and `--init-workflow` internally — so all three
// bypassed both once `--print-plan` was added below that block.
//
// The consequence was NOT cosmetic. An unknown moment resolved to
// `{enabled: false, targets: null}` exit 0, which is byte-identical to the
// payload a DELIBERATELY DISABLED moment produces. A caller could not tell a
// typo from a moment the consumer had switched off, so a typo silently dropped a
// board move from a manual checklist — the exact failure --print-plan exists to
// prevent. `--check` is the documented CI mode, so the combination is ordinary.

for (const extra of [[], ["--probe-board"], ["--check"]]) {
  const label = extra.length ? extra[0] : "no extra flag";
  test(`gh-stage --print-plan rejects an unknown moment (${label})`, () => {
    underAccess("full", ({ dir }) => {
      const r = ghCli.run({
        argv: [
          "node",
          "gh-stage.js",
          ...extra,
          "--stage",
          "nonsense",
          "--print-plan",
        ],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      });
      assert.equal(
        r.exitCode,
        2,
        `an unknown moment must exit 2, not resolve to "disabled" — a caller ` +
          `cannot distinguish {enabled:false} from a moment the board switched off`,
      );
    });
  });

  test(`gh-stage --print-plan canonicalises stage casing (${label})`, () => {
    underAccess("full", ({ dir }) => {
      const r = ghCli.run({
        argv: [
          "node",
          "gh-stage.js",
          ...extra,
          "--stage",
          "DONE",
          "--print-plan",
        ],
        execImpl: explode("gh"),
        repoRoot: dir,
        sleepImpl: () => {},
      });
      assert.equal(r.exitCode, 0);
      assert.deepEqual(r.targets, ["Done"]);
    });
  });
}

test("gh-stage --probe-board without --print-plan is unaffected by that validation", () => {
  // The fix must not make the moment mandatory for the probe path, which
  // legitimately takes no --stage at all.
  underAccess("full", ({ dir }) => {
    let reached = false;
    ghCli.run({
      argv: ["node", "gh-stage.js", "--probe-board"],
      execImpl: (argv) => {
        reached = true;
        if (argv[0] === "auth") throw new Error("not authenticated");
        return "";
      },
      repoRoot: dir,
      sleepImpl: () => {},
    });
    assert.equal(
      reached,
      true,
      "--probe-board must still reach the board read",
    );
  });
});
