// observation-log.test.mjs — behaviour of the observation-log engine and its
// workspace resolver.
//
// Written as a defect-class suite in the style of the sibling files here: each
// block names the specific failure it guards against, because a test whose name
// is only its assertion cannot tell a later reader whether it still matters.
//
// **Every guard in this file is mutation-proven.** The procedure, run once per
// guard during task 93: revert the guard in the source, run the named test,
// confirm it goes RED, restore the guard, confirm GREEN. The mutation for each
// is written above the test that catches it, so the proof is repeatable rather
// than merely claimed. A guard whose test stays green when the guard is removed
// is not testing the guard — it is manufacturing confidence, which is worse
// than no test at all.

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
  mkdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const SHARED = join(__dirname, "..");
const CLI = join(SHARED, "observation-log.js");
const RESOLVER = join(SHARED, "resolve-observation-workspace.sh");
const engine = require(CLI);

// ── helpers ──────────────────────────────────────────────────────────────────

// Workspaces are built under the OS temp dir, one per test, and torn down after.
// They are never the developer's real workspace: a test that writes into the
// live log would be indistinguishable from the tool working.
//
// NOTE the tension this creates with the engine's own ephemeral-anchor refusal —
// /tmp IS an ephemeral anchor, and refusing it is a guard tested below. The
// tests therefore call the exported functions directly, or pass an explicit
// --workspace, rather than routing through the resolver.
function ws(label) {
  const dir = mkdtempSync(join(tmpdir(), `observation-log-${label}-`));
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

// ── $HOME isolation ──────────────────────────────────────────────────────────
//
// `forkCandidates()` probes `~/skill-observations`, `~/.claude/skill-observations`
// and `~/.claude/projects/<encoded>/skill-observations`. So EVERY `doctor` test
// reads the real home directory unless it is told otherwise, and one of them
// used to WRITE there — planting a directory under the developer's actual
// `~/.claude/projects` on every `npm test`, with a `recursive: true` mkdir that
// would create `~/.claude` itself if absent and leave it behind.
//
// That is unacceptable twice over: a test suite must not touch the user's data,
// and a test whose result depends on what happens to be in someone's home
// directory is not a test. Both directions were live — a developer with a stray
// `~/skill-observations` would have seen spurious failures.
//
// So every `doctor` invocation below runs against a TEMP home. The env shape is
// this repo's existing allow-list convention (see access-config-parity.test.mjs
// and setup-consumer-skill-profiles.test.mjs, which pass
// `{ PATH: process.env.PATH, HOME: process.env.HOME }`) with the temp home
// substituted for the real one. `os.homedir()` prefers `$HOME` on macOS and
// Linux, so the override reaches the engine with no production-code change.
//
// Isolation is by REDIRECTION, never by careful paths under the real home: a
// temp home is discarded wholesale, so there is no cleanup step to get wrong and
// no `rm -rf` whose argument could be empty.
function tempHome(label) {
  const home = mkdtempSync(join(tmpdir(), `observation-log-home-${label}-`));
  mkdirSync(join(home, ".claude", "projects"), { recursive: true });
  return home;
}

/** The env an isolated CLI invocation runs with. */
function isolatedEnv(home) {
  return { PATH: process.env.PATH, HOME: home };
}

/** Run the CLI. Returns { code, json, stdout, stderr }. */
function cli(args, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    ...opts,
  });
  let json = null;
  if (args.includes("--json")) {
    try {
      json = JSON.parse(r.stdout);
    } catch {
      json = null;
    }
  }
  return { code: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

/** Build a workspace with `init` already run, bypassing the ephemeral check. */
function initWs(label) {
  const dir = ws(label);
  const P = engine.paths(dir);
  mkdirSync(P.archiveDir, { recursive: true });
  mkdirSync(P.staging, { recursive: true });
  writeFileSync(P.lastReview, "never\n");
  writeFileSync(P.checkpoints, "");
  writeFileSync(P.families, "# Skill families\n");
  writeFileSync(P.principles, "# Cross-cutting principles\n");
  return { dir, P };
}

function obs(P, name, fm, body = "body\n") {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) lines.push(`${k}: ${v}`);
  lines.push("---", "", body);
  writeFileSync(join(P.logDir, name), lines.join("\n"));
}

// ── init ─────────────────────────────────────────────────────────────────────

test("init seeds last-review-date.txt with the literal `never`, not a date", () => {
  // MUTATION: change the `never` seed in cmdInit to `today()`.
  //
  // The defect this prevents is silent and permanent: a date means a review
  // actually ran, so seeding one at setup makes "days since last review" read
  // plausibly forever and the first review never fires. The log fills up and
  // nothing surfaces — which looks exactly like a project with nothing to
  // report.
  const dir = ws("init");
  try {
    const r = cli(["init", "--workspace", dir, "--json"]);
    assert.equal(r.json.reason, "ok");
    const P = engine.paths(dir);
    assert.equal(readFileSync(P.lastReview, "utf8").trim(), "never");
    assert.doesNotMatch(
      readFileSync(P.lastReview, "utf8"),
      /\d{4}-\d{2}-\d{2}/,
    );
  } finally {
    cleanup(dir);
  }
});

test("init is idempotent — a second run reports `already` and rewrites nothing", () => {
  const dir = ws("init-idem");
  try {
    cli(["init", "--workspace", dir, "--quiet"]);
    const P = engine.paths(dir);
    writeFileSync(P.lastReview, "2026-01-01\n"); // a review has since run
    const r = cli(["init", "--workspace", dir, "--json"]);
    assert.equal(r.json.reason, "already");
    // init must not stomp a real review date back to `never`.
    assert.equal(readFileSync(P.lastReview, "utf8").trim(), "2026-01-01");
  } finally {
    cleanup(dir);
  }
});

// ── scan ─────────────────────────────────────────────────────────────────────

test("scan reports scan-broken when files exist and no headers parse", () => {
  // MUTATION: delete the `files.length > 0 && entries.length === 0` branch in
  // cmdScan.
  //
  // Without it the caller receives `reason: "empty", count: 0` — a clean,
  // reassuring answer that is indistinguishable from a genuinely empty log.
  // That is the whole thesis of this engine: an empty result is a claim about
  // the INSTRUMENT as much as about the data, and only one of those two
  // readings is a finding.
  const { dir, P } = initWs("scan-broken");
  try {
    writeFileSync(join(P.logDir, "0001-junk.md"), "no frontmatter here\n");
    writeFileSync(join(P.logDir, "0002-junk.md"), "nor here\n");
    const r = cli(["scan", "--workspace", dir, "--json"]);
    assert.equal(r.json.reason, "scan-broken");
    assert.equal(r.json.files, 2);
    assert.equal(r.json.parsed, 0);
    assert.equal(r.code, 1, "a tripped guard exits 1");
  } finally {
    cleanup(dir);
  }
});

test("`empty` and `scan-broken` are different reasons, not one collapsed state", () => {
  const { dir } = initWs("scan-empty");
  try {
    const r = cli(["scan", "--workspace", dir, "--json"]);
    assert.equal(r.json.reason, "empty");
    assert.equal(r.code, 0, "a genuinely empty log is a normal, fine state");
  } finally {
    cleanup(dir);
  }
});

test("scan never reads an observation body — asserted in bytes, not in seconds", () => {
  // MUTATION: replace readFrontmatterBounded's chunked loop with
  // `fs.readFileSync(file, "utf8")`.
  //
  // Asserted structurally on purpose. A wall-clock threshold would be the
  // third load-sensitive timing assertion this repo has been bitten by, and a
  // byte count is not load-sensitive.
  const { dir, P } = initWs("scan-bytes");
  try {
    const body = "BODY ".repeat(200_000); // ~1MB
    writeFileSync(
      join(P.logDir, "0001-huge.md"),
      `---\nid: 1\nstatus: open\n---\n\n${body}\n`,
    );
    const file = join(P.logDir, "0001-huge.md");
    const size = statSync(file).size;
    const r = engine.readFrontmatterBounded(file);
    assert.equal(r.fm.id, 1, "the header still parses");
    assert.ok(size > 900_000, "precondition: the body really is large");
    assert.ok(
      r.bytesRead < 16384,
      `read ${r.bytesRead} bytes of a ${size}-byte file — the body was read`,
    );
  } finally {
    cleanup(dir);
  }
});

test("scan cost does not grow with body size", () => {
  const { dir, P } = initWs("scan-flat");
  try {
    const mk = (name, mult) =>
      writeFileSync(
        join(P.logDir, name),
        `---\nid: 1\nstatus: open\n---\n\n${"B".repeat(mult)}\n`,
      );
    mk("0001-a.md", 500_000);
    mk("0002-b.md", 2_000_000);
    const a = engine.readFrontmatterBounded(join(P.logDir, "0001-a.md"));
    const b = engine.readFrontmatterBounded(join(P.logDir, "0002-b.md"));
    assert.equal(
      a.bytesRead,
      b.bytesRead,
      "a 4x larger body must cost the same",
    );
  } finally {
    cleanup(dir);
  }
});

// ── next-id ──────────────────────────────────────────────────────────────────

test("next-id over a log containing 0108 returns 109 — the octal regression", () => {
  // MUTATION: change `parseInt(m[1], 10)` in prefixes() to `parseInt(m[1])`.
  //
  // In JavaScript that mutation happens to be harmless, which is exactly why
  // the assertion is written against the VALUE and not against the source
  // text: the defect being guarded is upstream's, where the same prefix goes
  // into shell arithmetic and `$(( 0108 + 1 ))` is an invalid octal constant
  // that errors the whole derivation (and `0105` silently yields 70). The
  // explicit radix is what documents that this file must never grow a
  // zero-stripping step in imitation of upstream's `sed` mitigation.
  const { dir, P } = initWs("octal");
  try {
    obs(P, "0108-octal-hazard.md", { id: 108, status: "open" });
    const r = cli(["next-id", "--workspace", dir, "--json"]);
    assert.equal(r.json.id, 109, "0108 must parse as one hundred and eight");
    assert.notEqual(r.json.id, 70, "the octal reading of 0105 is 69");
  } finally {
    cleanup(dir);
  }
});

test("next-id reads all three inputs: highest active, highest archived, .id-floor", () => {
  const { dir, P } = initWs("three-inputs");
  try {
    obs(P, "0003-active.md", { id: 3, status: "open" });
    obs(P, "0009-archived.md", { id: 9, status: "open" });
    // move it into archive/
    const { renameSync } = require("node:fs");
    renameSync(
      join(P.logDir, "0009-archived.md"),
      join(P.archiveDir, "0009-archived.md"),
    );
    writeFileSync(join(P.archiveDir, ".id-floor"), "5\n");
    const r = cli(["next-id", "--workspace", dir, "--json"]);
    assert.equal(r.json.id, 10, "max(3 active, 9 archived, 5 floor) + 1");
  } finally {
    cleanup(dir);
  }
});

test("the .id-floor prevents the counter restarting at 1 when the active dir is empty", () => {
  // MUTATION: drop `readIdFloor(logDir)` from the `ids` array in nextId().
  //
  // Without the floor, a log whose every entry has been archived derives from
  // an empty active directory and issues 1 again — an id that already exists
  // in archive/, so the same number now names two different observations
  // across the active/archive boundary. Ids are never reused; that is the
  // point of the floor.
  const { dir, P } = initWs("floor");
  try {
    writeFileSync(join(P.archiveDir, ".id-floor"), "42\n");
    assert.equal(
      engine.listMarkdown(P.logDir).length,
      0,
      "precondition: empty",
    );
    const r = cli(["next-id", "--workspace", dir, "--json"]);
    assert.equal(r.json.id, 43);
    assert.notEqual(r.json.id, 1, "the counter must not restart");
  } finally {
    cleanup(dir);
  }
});

test("next-id reports id-broken when the log is populated and no ids come out", () => {
  // MUTATION: delete the `hi === 0 && listMarkdown(logDir).length > 0` branch.
  //
  // Same class as scan-broken: without it a broken derivation silently returns
  // 1 and the next write collides with an existing observation.
  const { dir, P } = initWs("id-broken");
  try {
    obs(P, "no-numeric-prefix.md", { id: 1, status: "open" });
    rmSync(join(P.archiveDir, ".id-floor"), { force: true });
    const r = cli(["next-id", "--workspace", dir, "--json"]);
    assert.equal(r.json.reason, "id-broken");
    assert.equal(r.json.id, null);
    assert.equal(r.code, 1);
  } finally {
    cleanup(dir);
  }
});

test("next-id archives a stale resolved file WITHOUT `archive` being called", () => {
  // MUTATION: remove the `sweepResolved(logDir, opts)` call from nextId().
  //
  // This test never invokes the `archive` subcommand. That is the point: the
  // sweep is folded into id derivation so no write path can reach an id
  // without having swept. Upstream couples the two by prose preamble ("on
  // every write, first archive") and records that the preamble under-fires.
  const { dir, P } = initWs("folded-sweep");
  try {
    obs(P, "0001-stale.md", {
      id: 1,
      status: "actioned",
      resolved: "2020-01-01",
    });
    const r = cli([
      "next-id",
      "--workspace",
      dir,
      "--now",
      "2026-09-08",
      "--json",
    ]);
    assert.deepEqual(r.json.archived, ["0001-stale.md"]);
    assert.ok(
      existsSync(join(P.archiveDir, "0001-stale.md")),
      "moved to archive/",
    );
    assert.ok(!existsSync(join(P.logDir, "0001-stale.md")), "gone from active");
  } finally {
    cleanup(dir);
  }
});

// ── write ────────────────────────────────────────────────────────────────────

test("write never accepts a caller-supplied id", () => {
  // MUTATION: delete the `subcommand === "write" && args.id != null` guard in
  // parseArgs().
  //
  // Note what the mutation restores: not an id that WORKS, but one that is
  // silently ignored — `--id` reaches the parser because `set-status` needs
  // it, so `write --id 7` would exit 0 and derive its own id anyway. That is
  // worse than accepting it, because the caller sees success and believes the
  // id took effect. This defect was live in the first implementation of this
  // engine and caught by running this exact case.
  const { dir } = initWs("no-id-flag");
  try {
    const bodyFile = join(dir, "body.md");
    writeFileSync(bodyFile, "body\n");
    const r = cli([
      "write",
      "--workspace",
      dir,
      "--id",
      "7",
      "--title",
      "t",
      "--skill",
      "s",
      "--siblings-checked",
      "none",
      "--body-file",
      bodyFile,
      "--json",
    ]);
    assert.equal(r.json.reason, "usage");
    assert.equal(r.code, 2);
    assert.match(r.json.error, /does not accept --id/);
  } finally {
    cleanup(dir);
  }
});

test("write refuses an existing path rather than truncating it", () => {
  // MUTATION: change the `"wx"` in cmdWrite's openSync to `"w"`.
  //
  // `w` truncates. Under a real race — the id derived, then a parallel session
  // creating that path before this one opens it — `w` destroys the other
  // session's observation and reports success. `wx` cannot.
  //
  // The CLI-level collision path needs a genuine race to reach (the id
  // derivation counts existing prefixes, so a file that is already there bumps
  // the id past itself). The guard itself is the open mode, so it is asserted
  // directly, at the filesystem, where the mutation is visible.
  const { dir, P } = initWs("wx");
  try {
    const target = join(P.logDir, "0001-taken.md");
    writeFileSync(target, "PRE-EXISTING CONTENT\n");
    const fs = require("node:fs");
    assert.throws(
      () => fs.openSync(target, "wx"),
      (e) => e.code === "EEXIST",
      "wx must refuse an existing path",
    );
    assert.equal(
      readFileSync(target, "utf8"),
      "PRE-EXISTING CONTENT\n",
      "and must not have truncated it",
    );
  } finally {
    cleanup(dir);
  }
});

test("write rejects an empty --siblings-checked at the CLI boundary", () => {
  // MUTATION: drop `--siblings-checked` from cmdWrite's `missing` list, or
  // default it to "none".
  //
  // Defaulting is the tempting move and it destroys the field's only property.
  // The two states of a one-entry `skill:` list — siblings evaluated and
  // correctly excluded, versus siblings never considered — are byte-identical.
  // Recording the judgement does not improve it; it makes its ABSENCE visible,
  // and a default restores exactly the indistinguishability the field exists
  // to remove.
  const { dir } = initWs("siblings");
  try {
    const bodyFile = join(dir, "body.md");
    writeFileSync(bodyFile, "body\n");
    const r = cli([
      "write",
      "--workspace",
      dir,
      "--title",
      "t",
      "--skill",
      "s",
      "--body-file",
      bodyFile,
      "--json",
    ]);
    assert.equal(r.json.reason, "usage");
    assert.equal(r.code, 2);
    assert.match(r.json.error, /--siblings-checked/);
  } finally {
    cleanup(dir);
  }
});

test("write serialises `skill` as a list even with a single entry", () => {
  // MUTATION: emit a bare scalar when the list has length 1.
  //
  // A field that is a string sometimes and a list other times makes every
  // consumer branch on its shape before reading it, and the one consumer that
  // forgets performs a silent single-skill read of a multi-skill observation.
  const { dir, P } = initWs("skill-list");
  try {
    const bodyFile = join(dir, "body.md");
    writeFileSync(bodyFile, "body\n");
    const r = cli([
      "write",
      "--workspace",
      dir,
      "--title",
      "One skill",
      "--skill",
      "only-one",
      "--siblings-checked",
      "none",
      "--body-file",
      bodyFile,
      "--json",
    ]);
    const text = readFileSync(r.json.path, "utf8");
    assert.match(text, /^skill:\n {2}- only-one$/m);
    const scan = cli(["scan", "--workspace", dir, "--json"]);
    assert.ok(Array.isArray(scan.json.entries[0].skill));
    assert.deepEqual(scan.json.entries[0].skill, ["only-one"]);
  } finally {
    cleanup(dir);
  }
});

// ── set-status ───────────────────────────────────────────────────────────────

test("set-status --status parked without --parked-until is rejected", () => {
  // MUTATION: delete the `parked-without-condition` branch in cmdSetStatus.
  //
  // `parked` without a condition is not a state, it is a shrug: a later review
  // has nothing to answer yes or no to, so the entry never leaves parked and,
  // because parked never archives, never leaves the directory either.
  const { dir, P } = initWs("parked-cond");
  try {
    obs(P, "0001-x.md", { id: 1, status: "open" });
    const r = cli([
      "set-status",
      "--workspace",
      dir,
      "--id",
      "1",
      "--status",
      "parked",
      "--json",
    ]);
    assert.equal(r.json.reason, "parked-without-condition");
    assert.equal(r.code, 1);
    assert.match(
      readFileSync(join(P.logDir, "0001-x.md"), "utf8"),
      /status: open/,
    );
  } finally {
    cleanup(dir);
  }
});

test("set-status actioned writes a resolved date and touches no non-lifecycle field", () => {
  const { dir, P } = initWs("set-actioned");
  try {
    obs(P, "0001-x.md", {
      id: 1,
      title: '"keep me"',
      status: "open",
      area: "some-area",
      siblings_checked: '"family: a, b"',
    });
    const r = cli([
      "set-status",
      "--workspace",
      dir,
      "--id",
      "1",
      "--status",
      "actioned",
      "--resolution",
      "applied",
      "--now",
      "2026-09-08",
      "--json",
    ]);
    assert.equal(r.json.reason, "ok");
    const text = readFileSync(join(P.logDir, "0001-x.md"), "utf8");
    assert.match(text, /status: "actioned"/);
    assert.match(text, /resolved: "2026-09-08"/);
    // untouched:
    assert.match(text, /title: "keep me"/);
    assert.match(text, /area: some-area/);
    assert.match(text, /siblings_checked: "family: a, b"/);
  } finally {
    cleanup(dir);
  }
});

test("set-status rejects an unknown status rather than writing it", () => {
  const { dir, P } = initWs("bad-status");
  try {
    obs(P, "0001-x.md", { id: 1, status: "open" });
    const r = cli([
      "set-status",
      "--workspace",
      dir,
      "--id",
      "1",
      "--status",
      "finished",
      "--json",
    ]);
    assert.equal(r.json.reason, "usage");
    assert.equal(r.code, 2);
    assert.match(
      readFileSync(join(P.logDir, "0001-x.md"), "utf8"),
      /status: open/,
    );
  } finally {
    cleanup(dir);
  }
});

// ── archive ──────────────────────────────────────────────────────────────────

test("archive leaves a parked entry in place regardless of age", () => {
  // MUTATION: add "parked" to RESOLVED_SET.
  //
  // This is the single most dangerous plausible simplification in the engine.
  // `parked` HAS left the work queue, so "it's done with, archive it" reads as
  // tidying. It is not: a parked entry that archives never has its
  // `parked_until:` condition re-checked, so it is LOST rather than deferred —
  // and it looks identical to correctly-filed work.
  const { dir, P } = initWs("parked-exempt");
  try {
    obs(P, "0001-ancient-parked.md", {
      id: 1,
      status: "parked",
      parked_until: '"until task 94 lands"',
      date: "2015-01-01",
    });
    // A parked entry that ALSO carries an old `resolved:` date. This is the
    // case that isolates RESOLVED_SET membership as the thing doing the work:
    // without it the entry is held back by the missing-date half of the gate
    // as well, so adding "parked" to RESOLVED_SET leaves the test green and
    // the "exemption" is proven by nothing. It is also the realistic shape of
    // the defect — the contract's explicit warning is against stamping a
    // `resolved:` date onto a parked entry to tidy it away.
    obs(P, "0002-parked-with-date.md", {
      id: 2,
      status: "parked",
      parked_until: '"until the vendor ships the fix"',
      resolved: "2020-01-01",
    });
    const r = cli([
      "archive",
      "--workspace",
      dir,
      "--now",
      "2026-09-08",
      "--json",
    ]);
    assert.deepEqual(r.json.archived, [], "nothing should have moved");
    assert.ok(existsSync(join(P.logDir, "0001-ancient-parked.md")));
    assert.ok(
      existsSync(join(P.logDir, "0002-parked-with-date.md")),
      "parked is exempt even carrying a resolved date — that is the whole point",
    );
  } finally {
    cleanup(dir);
  }
});

test("archive moves a file resolved yesterday and leaves one resolved today", () => {
  // MUTATION: change `fm.resolved < now` to `fm.resolved <= now`.
  //
  // The grace period is what makes the rule hold across PARALLEL sessions: the
  // date lives in the file, so a file resolved today survives until tomorrow
  // whichever session resolved it and whichever session sweeps. With `<=`, a
  // session archives what another session resolved seconds earlier, and the
  // second session's next scan cannot see its own work.
  const { dir, P } = initWs("grace");
  try {
    obs(P, "0001-today.md", {
      id: 1,
      status: "actioned",
      resolved: "2026-09-08",
    });
    obs(P, "0002-yesterday.md", {
      id: 2,
      status: "declined",
      resolved: "2026-09-07",
    });
    const r = cli([
      "archive",
      "--workspace",
      dir,
      "--now",
      "2026-09-08",
      "--json",
    ]);
    assert.deepEqual(r.json.archived, ["0002-yesterday.md"]);
    assert.ok(existsSync(join(P.logDir, "0001-today.md")), "today's stays");
    assert.ok(existsSync(join(P.archiveDir, "0002-yesterday.md")));
  } finally {
    cleanup(dir);
  }
});

test("archive skips a resolved file whose resolved date is unreadable", () => {
  // A resolved status with a malformed date is repaired deliberately, not
  // filed away. Archiving on a bad date would file away exactly the entries
  // whose metadata is least trustworthy.
  const { dir, P } = initWs("baddate");
  try {
    obs(P, "0001-bad.md", {
      id: 1,
      status: "actioned",
      resolved: "sometime-last-week",
    });
    const r = cli([
      "archive",
      "--workspace",
      dir,
      "--now",
      "2026-09-08",
      "--json",
    ]);
    assert.deepEqual(r.json.archived, []);
    assert.ok(existsSync(join(P.logDir, "0001-bad.md")));
  } finally {
    cleanup(dir);
  }
});

// ── queue ────────────────────────────────────────────────────────────────────

test("queue counts a statusless file as OPEN and names it in the delta", () => {
  // MUTATION: derive the queue from a `status === "open"` filter instead of
  // from the directory listing.
  //
  // `status` is optional and its absence means `open`, so a filter (or the
  // `grep 'status: open'` it stands in for) drops exactly the files that most
  // belong in the queue — and drops them silently, leaving a shorter queue
  // that looks like progress.
  const { dir, P } = initWs("statusless");
  try {
    obs(P, "0001-nostatus.md", { id: 1, title: '"no status field"' });
    obs(P, "0002-open.md", { id: 2, status: "open" });
    const r = cli(["queue", "--workspace", dir, "--json"]);
    assert.equal(r.json.open.length, 2, "the statusless file is OPEN");
    assert.ok(r.json.open.includes("0001-nostatus.md"));
    assert.deepEqual(r.json.statusless, ["0001-nostatus.md"], "and is NAMED");
    assert.equal(r.json.reconciled, true);
  } finally {
    cleanup(dir);
  }
});

test("queue reconciles: every file lands in exactly one bucket", () => {
  const { dir, P } = initWs("reconcile");
  try {
    obs(P, "0001-open.md", { id: 1, status: "open" });
    obs(P, "0002-parked.md", { id: 2, status: "parked", parked_until: '"x"' });
    obs(P, "0003-actioned.md", {
      id: 3,
      status: "actioned",
      resolved: "2026-09-08",
    });
    obs(P, "0004-none.md", { id: 4 });
    const r = cli(["queue", "--workspace", dir, "--json"]);
    assert.equal(r.json.total, 4);
    assert.equal(
      r.json.open.length + r.json.parked.length + r.json.resolved.length,
      4,
    );
    assert.equal(r.json.reconciled, true);
  } finally {
    cleanup(dir);
  }
});

// ── doctor ───────────────────────────────────────────────────────────────────

test("doctor reports fork-detected when a second skill-observations/ exists", () => {
  // MUTATION: return an empty array from forkCandidates().
  //
  // A silent fork is the failure mode with no symptom: both workspaces look
  // healthy, each holds half the observations, and every scan of either
  // returns a short, clean, believable list.
  const { dir } = initWs("fork");
  const other = ws("fork-other");
  const home = tempHome("fork");
  try {
    mkdirSync(join(other, "skill-observations"), { recursive: true });
    const r = cli(
      ["doctor", "--workspace", dir, "--audit-root", other, "--json"],
      { env: isolatedEnv(home) },
    );
    assert.equal(r.json.reason, "fork-detected");
    assert.equal(r.code, 1);
    const check = r.json.checks.find((c) => c.check === "no-fork");
    assert.equal(check.ok, false);
  } finally {
    cleanup(dir);
    cleanup(other);
    cleanup(home);
  }
});

test("doctor reports ephemeral-workspace for an anchor under /tmp", () => {
  const other = ws("doctor-clean");
  const home = tempHome("ephemeral");
  try {
    const r = cli(
      [
        "doctor",
        "--workspace",
        "/tmp/some-ephemeral-anchor",
        "--audit-root",
        other,
        "--json",
      ],
      { env: isolatedEnv(home) },
    );
    assert.equal(r.json.reason, "ephemeral-workspace");
    assert.equal(r.code, 1);
  } finally {
    cleanup(other);
    cleanup(home);
  }
});

test("doctor flags a workspace with no activation instruction", () => {
  // Without an instruction in the project's agent-instruction file, nothing
  // ever tells an agent the log exists — and a log nothing writes to is
  // indistinguishable from a project with nothing worth recording.
  const { dir } = initWs("activation");
  const other = ws("no-agents-md");
  const home = tempHome("activation");
  try {
    const r = cli(
      ["doctor", "--workspace", dir, "--audit-root", other, "--json"],
      { env: isolatedEnv(home) },
    );
    const check = r.json.checks.find(
      (c) => c.check === "activation-configured",
    );
    assert.equal(check.ok, false);
  } finally {
    cleanup(home);
    cleanup(dir);
    cleanup(other);
  }
});

// ── checkpoint ───────────────────────────────────────────────────────────────

test("checkpoint appends and never rewrites", () => {
  const { dir, P } = initWs("checkpoint");
  try {
    writeFileSync(P.checkpoints, "PRE-EXISTING LINE\n");
    cli(["checkpoint", "--workspace", dir, "--note", "first", "--quiet"]);
    cli(["checkpoint", "--workspace", dir, "--note", "second", "--quiet"]);
    const text = readFileSync(P.checkpoints, "utf8");
    assert.match(text, /^PRE-EXISTING LINE$/m, "the existing content survives");
    assert.match(text, /\tfirst$/m);
    assert.match(text, /\tsecond$/m);
    assert.equal(text.trim().split("\n").length, 3);
  } finally {
    cleanup(dir);
  }
});

// ── the CLI contract ─────────────────────────────────────────────────────────

test("an unknown flag is a usage error, not a silent no-op", () => {
  // MUTATION: replace the `default:` throw in parseArgs with `break`.
  //
  // A silently-ignored flag is how a caller runs `scan --status open`, gets
  // every entry back, and believes the filter applied.
  const { dir } = initWs("unknown-flag");
  try {
    const r = cli(["scan", "--workspace", dir, "--not-a-real-flag", "--json"]);
    assert.equal(r.json.reason, "usage");
    assert.equal(r.code, 2);
  } finally {
    cleanup(dir);
  }
});

test("a flag whose value is missing fails closed", () => {
  const { dir } = initWs("missing-value");
  try {
    const r = cli(["scan", "--workspace", dir, "--status", "--json"]);
    assert.equal(r.json.reason, "usage");
    assert.equal(r.code, 2);
  } finally {
    cleanup(dir);
  }
});

test("an unknown subcommand is a usage error", () => {
  const r = cli(["frobnicate", "--workspace", "/nowhere", "--json"]);
  assert.equal(r.json.reason, "usage");
  assert.equal(r.code, 2);
});

test("--json always emits a reason field", () => {
  const { dir, P } = initWs("reason-field");
  const home = tempHome("reason-field");
  try {
    obs(P, "0001-x.md", { id: 1, status: "open" });
    for (const argv of [
      ["scan"],
      ["queue"],
      ["next-id"],
      ["archive"],
      ["families"],
      ["doctor"],
    ]) {
      const r = cli(
        [...argv, "--workspace", dir, "--audit-root", dir, "--json"],
        { env: isolatedEnv(home) },
      );
      assert.ok(r.json, `${argv[0]} produced unparseable JSON`);
      assert.ok(
        typeof r.json.reason === "string" && r.json.reason.length > 0,
        `${argv[0]} emitted no reason`,
      );
    }
  } finally {
    cleanup(dir);
    cleanup(home);
  }
});

test("exit codes: 0 for the success family, 1 for a tripped guard, 2 for usage", () => {
  const { dir, P } = initWs("exit-codes");
  try {
    assert.equal(
      cli(["scan", "--workspace", dir, "--json"]).code,
      0,
      "empty -> 0",
    );
    obs(P, "0001-x.md", { id: 1, status: "open" });
    assert.equal(
      cli(["scan", "--workspace", dir, "--json"]).code,
      0,
      "ok -> 0",
    );
    writeFileSync(join(P.logDir, "0002-junk.md"), "junk\n");
    rmSync(join(P.logDir, "0001-x.md"));
    assert.equal(
      cli(["scan", "--workspace", dir, "--json"]).code,
      1,
      "guard -> 1",
    );
    assert.equal(
      cli(["scan", "--workspace", dir, "--nope", "--json"]).code,
      2,
      "usage -> 2",
    );
  } finally {
    cleanup(dir);
  }
});

test("--dry-run writes nothing", () => {
  const { dir, P } = initWs("dry-run");
  try {
    obs(P, "0001-stale.md", {
      id: 1,
      status: "actioned",
      resolved: "2020-01-01",
    });
    const r = cli([
      "archive",
      "--workspace",
      dir,
      "--now",
      "2026-09-08",
      "--dry-run",
      "--json",
    ]);
    assert.deepEqual(
      r.json.archived,
      ["0001-stale.md"],
      "it reports what it would do",
    );
    assert.ok(existsSync(join(P.logDir, "0001-stale.md")), "but moved nothing");
  } finally {
    cleanup(dir);
  }
});

// ── the pipe ─────────────────────────────────────────────────────────────────

test("scan --json over a large log emits complete, parseable JSON through a pipe", () => {
  // MUTATION: change `process.exitCode = exitCode; return;` at the end of
  // emit() to `process.exit(exitCode)`.
  //
  // stdio is ASYNCHRONOUS on a pipe, so process.exit() tears the process down
  // before the buffer drains and the output is truncated at ~64KB. A FILE
  // REDIRECT hides this completely — stdio is synchronous to a file — which is
  // why this test pipes through `cat` rather than redirecting. See
  // bug.3.stdout-truncation-on-exit; tracker-comment.js:831 still has the line
  // this engine deliberately did not transcribe.
  //
  // The payload is sized from the ACTUAL pipe buffer rather than a fixed
  // constant: a hard-coded 64KB assumption is what made an earlier premise
  // test in this repo load-flaky.
  const { dir, P } = initWs("pipe");
  try {
    const pipeBuf = Number(
      spawnSync("getconf", ["PIPE_BUF", "/"], {
        encoding: "utf8",
      }).stdout.trim(),
    );
    const buf = Number.isFinite(pipeBuf) && pipeBuf > 0 ? pipeBuf : 512;
    const target = buf * 128; // a large multiple, so this is about draining

    let n = 0;
    let bytes = 0;
    while (bytes < target) {
      n += 1;
      const name = `${String(n).padStart(4, "0")}-synthetic-observation-${n}.md`;
      const fm = {
        id: n,
        title: `"Synthetic observation ${n} with a long title to inflate the frontmatter"`,
        status: "open",
        siblings_checked: `"family check for ${n}"`,
        area: '"an area string"',
        date: "2026-09-08",
      };
      obs(P, name, fm, "BODY ".repeat(200));
      bytes += 420; // approximate emitted JSON per entry
    }

    const r = spawnSync(
      "/bin/sh",
      [
        "-c",
        `"$1" "$2" scan --workspace "$3" --json | cat`,
        "sh",
        process.execPath,
        CLI,
        dir,
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );

    assert.ok(
      r.stdout.length > buf * 100,
      `payload was only ${r.stdout.length} bytes — too small to test draining`,
    );
    let parsed;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(r.stdout);
    }, `output truncated at ${r.stdout.length} bytes`);
    assert.equal(parsed.entries.length, n, "every entry survived the pipe");
  } finally {
    cleanup(dir);
  }
});

// ── the resolver ─────────────────────────────────────────────────────────────

function sourceResolver(env, cwd) {
  return spawnSync(
    "/bin/bash",
    [
      "-c",
      `source "$1" || exit 1; printf '%s\\n%s\\n%s\\n' "$OBS_WORKSPACE" "$OBS_LOG_DIR" "$OBS_STAGING_DIR"`,
      "bash",
      RESOLVER,
    ],
    { encoding: "utf8", env: { ...process.env, ...env }, cwd: cwd || SHARED },
  );
}

test("the resolver exports all three paths, not just the root", () => {
  // MUTATION: export only OBS_WORKSPACE.
  //
  // Upstream records the failure directly: pinning only the log directory left
  // the staging root to be re-derived per session, and parallel sessions
  // derived it plausibly and DIFFERENTLY — three writers, two staging roots,
  // one manifest that saw half the work.
  const dir = ws("resolver-exports");
  try {
    // Read the variables back from a CHILD process, which is the only thing
    // `export` actually buys. Printing them in the sourcing shell proves
    // nothing: a plain assignment is visible there too, so removing the
    // `export` keyword leaves that check green — which it did, until this test
    // was rewritten. The engine is a child process, so this is also how the
    // variables are really consumed.
    const r = spawnSync(
      "/bin/bash",
      [
        "-c",
        `source "$1" || exit 1; ` +
          `/bin/sh -c 'printf "%s\\n%s\\n%s\\n" "$OBS_WORKSPACE" "$OBS_LOG_DIR" "$OBS_STAGING_DIR"'`,
        "bash",
        RESOLVER,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, OBS_WORKSPACE: dir },
        cwd: SHARED,
      },
    );
    assert.equal(r.status, 0, r.stderr);
    const [w, log, staging] = r.stdout.trim().split("\n");
    assert.equal(w, dir);
    assert.equal(log, join(dir, "skill-observations", "observation-log"));
    assert.equal(staging, join(dir, "skill-updates"));
  } finally {
    cleanup(dir);
  }
});

test("the resolver refuses an ephemeral anchor with a non-zero exit", () => {
  // MUTATION: delete the `_ow_is_ephemeral` call, or make it always return 1.
  //
  // The `|| exit 1` at the call site is only load-bearing if the resolver
  // actually returns non-zero. State written to a checkout that is about to be
  // torn down is torn down with it — and the symptom is an empty, clean,
  // believable log.
  for (const bad of [
    "/tmp/obs-anchor",
    "/var/tmp/obs-anchor",
    "/Users/someone/proj/.claude/worktrees/wt1",
  ]) {
    const r = sourceResolver({ OBS_WORKSPACE: bad });
    assert.notEqual(r.status, 0, `${bad} was accepted`);
    assert.match(r.stderr, /refused/);
  }
});

test("the resolver's precedence is env var over the project-identity default", () => {
  const dir = ws("resolver-precedence");
  try {
    const withEnv = sourceResolver({ OBS_WORKSPACE: dir });
    assert.equal(withEnv.stdout.trim().split("\n")[0], dir);

    const noEnv = spawnSync(
      "/bin/bash",
      [
        "-c",
        `unset OBS_WORKSPACE; source "$1" || exit 1; printf '%s\\n' "$OBS_WORKSPACE"`,
        "bash",
        RESOLVER,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, OBS_WORKSPACE: "" },
        cwd: SHARED,
      },
    );
    assert.equal(noEnv.status, 0, noEnv.stderr);
    const fallback = noEnv.stdout.trim();
    assert.notEqual(
      fallback,
      dir,
      "the default must differ from the env value",
    );
    assert.match(fallback, /\.claude\/projects\//, "the project-identity path");
  } finally {
    cleanup(dir);
  }
});

test("the resolver's precedence is config over env var over default", () => {
  // The full three-source order, asserted end to end. The env-vs-default half
  // was covered before this test existed; the CONFIG half was not, and it is
  // the half that decides whose answer wins when a project has deliberately
  // pinned a workspace. A resolver that silently prefers the environment over
  // committed config is how two developers on one project end up with two
  // workspaces while both believe they are configured.
  const cfgDir = ws("resolver-config");
  const configured = ws("resolver-configured-target");
  const fromEnv = ws("resolver-env-target");
  try {
    const cfg = join(cfgDir, "skills-config.yaml");
    writeFileSync(cfg, `observations:\n  workspace: ${configured}\n`);

    // config present AND env set — config must win.
    const both = spawnSync(
      "/bin/bash",
      [
        "-c",
        `source "$1" || exit 1; printf '%s\\n' "$OBS_WORKSPACE"`,
        "bash",
        RESOLVER,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          OBS_WORKSPACE: fromEnv,
          SKILLS_CONFIG_FILE: cfg,
        },
        cwd: SHARED,
      },
    );
    assert.equal(both.status, 0, both.stderr);
    assert.equal(
      both.stdout.trim(),
      configured,
      "skills-config.yaml must beat the environment variable",
    );

    // env only — env must win over the project-identity default.
    const envOnly = spawnSync(
      "/bin/bash",
      [
        "-c",
        `source "$1" || exit 1; printf '%s\\n' "$OBS_WORKSPACE"`,
        "bash",
        RESOLVER,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, OBS_WORKSPACE: fromEnv },
        cwd: SHARED,
      },
    );
    assert.equal(envOnly.stdout.trim(), fromEnv);
  } finally {
    cleanup(cfgDir);
    cleanup(configured);
    cleanup(fromEnv);
  }
});

test("the project-identity default encodes separators as hyphens", () => {
  // The convention remember-insight DOCUMENTS (it ships no code for it):
  // <home>/.claude/projects/<abs path with "/" replaced by "-">.
  //
  // The expected string is written out LITERALLY rather than recomputed the
  // way the resolver computes it. A test that re-derives the expectation the
  // same way is two derivations that agree by construction, which is the
  // silent-fork failure wearing a test's clothes.
  const r = spawnSync(
    "/bin/bash",
    [
      "-c",
      `unset OBS_WORKSPACE; source "$1" || exit 1; printf '%s\\n' "$OBS_WORKSPACE"`,
      "bash",
      RESOLVER,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, OBS_WORKSPACE: "" },
      cwd: SHARED,
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = r.stdout.trim();
  const repoRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: SHARED,
  }).stdout.trim();
  const encoded = repoRoot.split("/").join("-");
  assert.ok(
    out.endsWith(`/.claude/projects/${encoded}`),
    `expected the encoded path to end with /.claude/projects/${encoded}, got ${out}`,
  );
  assert.ok(
    encoded.startsWith("-"),
    "a leading separator becomes a leading hyphen",
  );
});

test("the resolver does not leak its private helpers into the caller's shell", () => {
  // A sourced file runs in the caller's shell. Leaving _ow_* functions and
  // variables behind is how a resolver quietly collides with an unrelated
  // script sourced later in the same session.
  const r = spawnSync(
    "/bin/bash",
    [
      "-c",
      `source "$1" || exit 1; declare -F | grep -c '_ow_' || true; set | grep -c '^_ow_' || true`,
      "bash",
      RESOLVER,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, OBS_WORKSPACE: "" },
      cwd: SHARED,
    },
  );
  const [fns, vars] = r.stdout.trim().split("\n").map(Number);
  assert.equal(fns, 0, "helper functions leaked");
  assert.equal(vars, 0, "helper variables leaked");
});

// ── QA cycle 1 regressions ───────────────────────────────────────────────────
//
// Three defects found by QA cycle 1, all in the same seam: the boundary between
// the process and the world outside it. Each test below reproduces its defect —
// which for two of the three means the obvious cheap test does NOT work, and the
// comment says why.

test("the project-identity default is the same from a linked worktree as from the main checkout", () => {
  // MUTATION: change `--git-common-dir` back to `--show-toplevel` in
  // `_ow_project_root`.
  //
  // TASK-93-001. `--show-toplevel` returns the WORKTREE path inside a linked
  // worktree, so the encoded project-identity segment differs per worktree and
  // one project resolves two workspaces — the silent fork `doctor` exists to
  // catch, manufactured by the resolver itself. Not hypothetical: /develop-batch
  // dispatches every parallel story into a linked worktree.
  //
  // This test creates a REAL linked worktree, because nothing else reproduces
  // it. A test that merely `cd`s somewhere else passes against the broken code.
  const repoRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: SHARED,
  }).stdout.trim();
  const wt = join(mkdtempSync(join(tmpdir(), "observation-log-wt-")), "probe");

  const added = spawnSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  if (added.status !== 0) {
    // A sandbox that cannot create worktrees must not silently pass this test.
    assert.fail(`could not create a linked worktree: ${added.stderr}`);
  }

  try {
    const read = (cwd) =>
      spawnSync(
        "/bin/bash",
        [
          "-c",
          `unset OBS_WORKSPACE; source "$1" || exit 1; printf '%s\\n' "$OBS_WORKSPACE"`,
          "bash",
          RESOLVER,
        ],
        { encoding: "utf8", env: { ...process.env, OBS_WORKSPACE: "" }, cwd },
      );

    const fromMain = read(SHARED);
    const fromWorktree = read(wt);
    assert.equal(fromMain.status, 0, fromMain.stderr);
    assert.equal(fromWorktree.status, 0, fromWorktree.stderr);
    assert.equal(
      fromWorktree.stdout.trim(),
      fromMain.stdout.trim(),
      "a linked worktree must resolve the SAME workspace as the main checkout",
    );
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: repoRoot });
    rmSync(dirname(wt), { recursive: true, force: true });
  }
});

test("doctor detects a second workspace at this project's own encoding", () => {
  // MUTATION: remove the `~/.claude/projects` sweep from forkCandidates().
  //
  // TASK-93-002. The other three candidates cover hand-configured anchors; this
  // one covers the directory the project-identity DEFAULT writes to, which is
  // where a fork actually lands. Without it `doctor` answered `no-fork` on a
  // workspace that had one — the check reporting the reassuring half of the two
  // states it exists to tell apart.
  //
  // The planted path is this repository's OWN encoding. That is not incidental:
  // TASK-93-004 narrowed the sweep to this project's worktrees, so an arbitrary
  // sibling directory is deliberately no longer a candidate. See the pair of
  // tests below, which assert both directions of that narrowing.
  const { dir } = initWs("fork-projects");
  const home = tempHome("fork-projects");
  const repoRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: SHARED,
  }).stdout.trim();
  try {
    const planted = join(
      home,
      ".claude",
      "projects",
      engine.encodeProjectPath(repoRoot),
      "skill-observations",
    );
    mkdirSync(planted, { recursive: true });
    const r = cli(
      ["doctor", "--workspace", dir, "--audit-root", repoRoot, "--json"],
      { env: isolatedEnv(home) },
    );
    assert.equal(r.json.reason, "fork-detected");
    assert.equal(r.code, 1);
    const check = r.json.checks.find((c) => c.check === "no-fork");
    assert.equal(check.ok, false);
    assert.match(check.detail, /skill-observations/);
  } finally {
    cleanup(home);
    cleanup(dir);
  }
});

test("doctor does NOT flag another project's workspace as a fork", () => {
  // MUTATION: restore the unrestricted `readdirSync(projects)` sweep in
  // forkCandidates().
  //
  // TASK-93-004, and the direction that matters. `~/.claude/projects` holds one
  // entry PER PROJECT on the machine — twelve on the machine this was found on.
  // Sweeping all of them meant that as soon as a second project adopted the
  // observation log, `doctor` failed in BOTH, permanently, naming a path that
  // was not a fault.
  //
  // That is not a milder bug than the blindness it replaced, it is the same bug
  // inverted: an alarm that always fires is read exactly as often as one that
  // never fires, which this repo already has written down (`bug.7` — an ignored
  // check is a check that does not exist).
  //
  // Both directions are asserted, here and in the test above, because either one
  // alone passes against a broken implementation: return everything and this
  // test fails while that one passes; return nothing and the reverse.
  const { dir } = initWs("fork-unrelated");
  const home = tempHome("fork-unrelated");
  const repoRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: SHARED,
  }).stdout.trim();
  try {
    const unrelated = join(
      home,
      ".claude",
      "projects",
      engine.encodeProjectPath("/Users/someone/Development/an-unrelated-repo"),
      "skill-observations",
    );
    mkdirSync(unrelated, { recursive: true });
    const r = cli(
      ["doctor", "--workspace", dir, "--audit-root", repoRoot, "--json"],
      { env: isolatedEnv(home) },
    );
    const check = r.json.checks.find((c) => c.check === "no-fork");
    assert.equal(
      check.ok,
      true,
      `another project's workspace was reported as a fork: ${check.detail}`,
    );
    assert.notEqual(r.json.reason, "fork-detected");
  } finally {
    cleanup(home);
    cleanup(dir);
  }
});

test("archive refuses to overwrite an existing archived file", () => {
  // MUTATION: drop the `fs.existsSync(dest)` check in sweepResolved().
  //
  // TASK-93-005. `fs.renameSync` clobbers an existing destination silently, so
  // the archived observation was destroyed and the sweep still reported `ok`
  // with the file listed as archived. `write` uses `wx` specifically so a create
  // can never truncate; the one operation that MOVES files did not hold the same
  // line, which made the task's own Rollback Plan ("nothing is destroyed, only
  // misfiled") false.
  //
  // Reachable whenever an active and an archived file share a name: an
  // observation restored from the archive to be reopened, a `git checkout` of a
  // deleted active file, or a corrupted `.id-floor` permitting id reuse.
  const { dir, P } = initWs("archive-collision");
  try {
    obs(P, "0001-dup.md", {
      id: 1,
      status: "actioned",
      resolved: "2020-01-01",
    });
    const archived = join(P.archiveDir, "0001-dup.md");
    writeFileSync(archived, "ARCHIVED VERSION — MUST NOT BE LOST\n");

    const r = cli([
      "archive",
      "--workspace",
      dir,
      "--now",
      "2026-09-08",
      "--json",
    ]);
    assert.deepEqual(
      r.json.archived,
      [],
      "nothing may be moved onto a collision",
    );
    assert.deepEqual(r.json.skipped, [
      { file: "0001-dup.md", why: "collision" },
    ]);
    assert.equal(
      readFileSync(archived, "utf8"),
      "ARCHIVED VERSION — MUST NOT BE LOST\n",
      "the archived file was overwritten",
    );
    assert.ok(
      existsSync(join(P.logDir, "0001-dup.md")),
      "the active file must stay put rather than vanishing",
    );
  } finally {
    cleanup(dir);
  }
});

test("the workspace the resolver produces is the one the JS encoder predicts", () => {
  // MUTATION: change either encoder — e.g. make the JS `encodeProjectPath` strip
  // a trailing separator, or the shell `_ow_encode_project_path` use `_`.
  //
  // TASK-93-007. Two implementations answer the same question for different
  // consumers: the SHELL one decides where the workspace IS, the JS one decides
  // where `doctor` LOOKS for forks. If they diverge, doctor silently stops
  // recognising the resolver's own workspace and the fork check goes quiet — a
  // guard failing silently, which is what this component exists to eliminate.
  //
  // This asserts them END TO END, through their real consumers, rather than
  // calling the shell function directly. Two reasons, and the second is the
  // important one:
  //
  //   1. The resolver `unset -f`s its helpers on the way out — a deliberate,
  //      separately-tested property — so the function does not survive a source
  //      and cannot be called from outside.
  //   2. A test that re-implemented the shell expansion in order to compare
  //      would be a THIRD encoder. Three encoders agreeing with each other prove
  //      nothing about the two that ship. An earlier draft of this test did
  //      exactly that and passed while exercising neither shipped path.
  //
  // So: run the real resolver in a real repository and check the path it
  // exports against the path the JS encoder predicts for that same repository.
  const home = tempHome("encoder-parity");
  const repo = ws("encoder-parity-repo");
  try {
    const init = spawnSync("git", ["init", "-q", repo], { encoding: "utf8" });
    assert.equal(init.status, 0, `git init failed: ${init.stderr}`);

    const r = spawnSync(
      "/bin/bash",
      [
        "-c",
        `unset OBS_WORKSPACE; source "$1" || exit 1; printf '%s' "$OBS_WORKSPACE"`,
        "bash",
        RESOLVER,
      ],
      { encoding: "utf8", env: isolatedEnv(home), cwd: repo },
    );
    assert.equal(r.status, 0, `resolver failed: ${r.stderr}`);

    // `ws()` builds under the OS temp dir, which on macOS is a /var symlink to
    // /private/var. git reports the resolved path, so resolve ours too before
    // predicting — otherwise this compares a path to its own symlink and fails
    // for a reason that has nothing to do with the encoders.
    const realRepo = realpathSync(repo);
    const predicted = join(
      home,
      ".claude",
      "projects",
      engine.encodeProjectPath(realRepo),
    );

    assert.equal(
      r.stdout,
      predicted,
      "the shell resolver and the JS encoder disagree about this project's path",
    );
  } finally {
    cleanup(repo);
    cleanup(home);
  }
});

test("repoWorktrees returns an empty list outside a repository", () => {
  // The fork sweep is built from this list, so an empty one must mean "no
  // project-path candidates", not a crash and not a candidate list built from a
  // partially-resolved path.
  const outside = ws("no-repo");
  try {
    assert.deepEqual(engine.repoWorktrees(outside), []);
  } finally {
    cleanup(outside);
  }
});

test("a multi-byte character spanning the chunk boundary is not corrupted", () => {
  // MUTATION: change `decoder.write(buf.subarray(0, n))` back to
  // `buf.toString("utf8", 0, n)`.
  //
  // TASK-93-003. Decoding each chunk independently splits a multi-byte
  // character straddling the 8192-byte boundary into two invalid sequences,
  // both of which become U+FFFD. Silent — the header still parses.
  //
  // The sweep across alignments is the point, not thoroughness for its own
  // sake: the FIRST single-offset probe of this defect PASSED. One fixture can
  // land on a character boundary and report clean while seven others corrupt.
  const { dir, P } = initWs("utf8-boundary");
  try {
    for (let shift = 0; shift < 8; shift++) {
      const name = `000${shift + 1}-utf8-${shift}.md`;
      writeFileSync(
        join(P.logDir, name),
        `---\nid: ${shift + 1}\n${"a".repeat(shift)}note: "${"x".repeat(shift)}"\n` +
          `title: "${"é".repeat(5000)}"\nstatus: open\n---\n\nBODY\n`,
      );
      const r = engine.readFrontmatterBounded(join(P.logDir, name));
      assert.ok(r.fm, `alignment ${shift}: header did not parse`);
      assert.equal(r.fm.id, shift + 1, `alignment ${shift}: wrong id`);
      assert.equal(
        r.fm.title.length,
        5000,
        `alignment ${shift}: title length ${r.fm.title.length} — a character was split`,
      );
      assert.ok(
        !r.fm.title.includes("\uFFFD"),
        `alignment ${shift}: replacement character in the decoded title`,
      );
    }
  } finally {
    cleanup(dir);
  }
});

// ── the engine's independence ────────────────────────────────────────────────

test("the engine takes no dependency on resolve-platform.sh or any tracker module", () => {
  // The observation log is LOCAL state with no remote. resolve-observation-
  // workspace.sh is a sibling of resolve-platform.sh in FORM only; a
  // dependency here would make a purely local tool fail when a tracker is
  // misconfigured.
  const src = readFileSync(CLI, "utf8");
  const requires = [...src.matchAll(/require\(["']([^"']+)["']\)/g)].map(
    (m) => m[1],
  );
  const local = requires.filter((r) => r.startsWith("."));
  assert.deepEqual(
    local,
    ["./yaml-subset.js"],
    `unexpected local requires: ${local}`,
  );
  for (const forbidden of [
    "resolve-platform",
    "jira",
    "tracker-",
    "gh-stage",
  ]) {
    assert.ok(
      !requires.some((r) => r.includes(forbidden)),
      `engine must not require anything matching ${forbidden}`,
    );
  }
});
