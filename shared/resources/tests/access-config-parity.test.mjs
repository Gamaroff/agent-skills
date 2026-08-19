// access-config-parity.test.mjs — the parity corpus.
//
// The JS gates and read-config.sh must answer the SAME thing about
// `access.tracker` for every input. Task 53 tried to guarantee that by writing a
// second YAML reader in JavaScript and reviewing it; every round found a
// high-severity divergence, and each correct fix revealed the next one. This
// suite is the assertion that attempt never had.
//
// The corpus is DERIVED, not hand-asserted. For every fixture the expected value
// is whatever read-config.sh says at run time — so when that file moves, these
// expectations move with it and a divergence becomes a red test rather than a
// review finding. A fixture whose two answers differ is a failure regardless of
// which one looks more sensible; that is what parity means.
//
// THE ONE MAPPING. The shell REFUSES by returning non-zero, which halts the
// skill so no tracker call happens. JavaScript cannot halt the process — cycle 4
// of task 53 proved that, by making an unreadable config throw and taking down
// the deliberately read-only CLI modes. The JS analogue that preserves the
// shell's meaning is `manual`: every write is deferred and recorded, nothing is
// sent. So `rc != 0` maps to `manual`, and that mapping is stated here, in one
// place, rather than left implicit in each assertion.

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = dirname(HERE);
const RESOLVER = join(SHARED, "resolve-platform.sh");
const FIXTURES = join(HERE, "fixtures");
const require = createRequire(import.meta.url);
const dm = require(join(SHARED, "defer-mutation.js"));

const REFUSAL_AS = "manual";

/** Every access-config-*.yaml body, as { name, body }. */
function corpus() {
  return readdirSync(FIXTURES)
    .filter((f) => f.startsWith("access-config-") && f.endsWith(".yaml"))
    .sort()
    .map((f) => ({
      name: basename(f, ".yaml").replace(/^access-config-/, ""),
      body: readFileSync(join(FIXTURES, f), "utf8"),
    }));
}

function withRepo(body, fn) {
  const dir = mkdtempSync(join(tmpdir(), "access-parity-"));
  try {
    writeFileSync(join(dir, "skills-config.yaml"), body);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * What read-config.sh (via resolve-platform.sh, its only consumer for access)
 * resolves in `dir`. Returns a mode, or REFUSAL_AS when it refused.
 *
 * --noprofile --norc so an operator's shell profile can neither print into the
 * captured stdout nor export an ACCESS_TRACKER that would forge the answer.
 */
function shellAnswer(dir, tier) {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME };
  if (tier) env.AGENT_SKILLS_CONFIG_TIER = tier;
  const r = spawnSync(
    "bash",
    [
      "--noprofile",
      "--norc",
      "-c",
      'source "$1" >/dev/null 2>&1 && printf %s "$ACCESS_TRACKER"',
      "_",
      RESOLVER,
    ],
    { cwd: dir, env, encoding: "utf8", timeout: 20000 },
  );
  if (r.status !== 0) return REFUSAL_AS;
  const out = String(r.stdout || "").trim();
  return out || REFUSAL_AS;
}

/** What the JS gates resolve in `dir`, with no env tier in play. */
function jsAnswer(dir, tier) {
  const env = {};
  if (tier) env.AGENT_SKILLS_CONFIG_TIER = tier;
  try {
    return dm.resolveAccessTracker(env, { cwd: dir });
  } catch {
    // The config tier must never throw. Surfacing this as a distinct value makes
    // a regression to cycle 4's shape fail loudly instead of looking restrictive.
    return "THREW";
  }
}

/**
 * Is a forced tier actually usable on this host? read-config.sh's own header is
 * explicit that a suite covering both tiers must SKIP loudly rather than
 * silently pass when the forced tier is unavailable — a tier-1 assertion that
 * quietly ran on tier 2 would assert nothing.
 */
function tierAvailable(tier) {
  return withRepo("access:\n  tracker: read-only\n", (dir) => {
    // `read-only` is chosen because it is neither the absent default (`full`)
    // nor the refusal value (`manual`), so only a tier that genuinely parsed the
    // file can produce it.
    return shellAnswer(dir, tier) === "read-only";
  });
}

const TIERS = [];

/**
 * The matrix, computed ONCE: { [tier]: { [fixture]: {shell, js} } }.
 *
 * Every entry costs a bash spawn that sources the resolver, and a second inside
 * the JS tier. Recomputing it per assertion turned a two-second suite into a
 * two-minute one, so the answers are derived once here and every test below
 * reads them. Deriving still happens at RUN TIME — the point of the corpus is
 * that its expectations move when read-config.sh moves, and caching within a
 * single run does not weaken that.
 */
const MATRIX = {};

before(() => {
  for (const t of ["awk", "python"]) {
    if (tierAvailable(t)) TIERS.push(t);
    else console.error(`# SKIP tier "${t}" unavailable on this host`);
  }
  assert.ok(TIERS.length > 0, "no config tier is usable \u2014 the corpus cannot run");

  for (const tier of TIERS) {
    MATRIX[tier] = {};
    for (const { name, body } of corpus()) {
      withRepo(body, (dir) => {
        MATRIX[tier][name] = { shell: shellAnswer(dir, tier), js: jsAnswer(dir, tier) };
      });
    }
  }
});

/** Walk the precomputed matrix. */
function eachCell(fn) {
  for (const tier of TIERS) {
    for (const [name, cell] of Object.entries(MATRIX[tier])) fn(name, tier, cell);
  }
}

describe("access-config parity: read-config.sh vs the JS tier", () => {
  test("the corpus is present and covers the refusal classes", () => {
    const names = corpus().map((c) => c.name);
    assert.ok(names.length >= 25, `corpus too small: ${names.length}`);
    // The aliasing family is what a line-oriented scanner cannot bound, and is
    // the class task 53 kept re-opening. Name them so deleting one is visible.
    for (const required of [
      "merge-key",
      "anchor",
      "alias",
      "doc-separator",
      "explicit-tag",
      "bom",
      "multiline-flow",
      "duplicate-access",
      "block-scalar-before",
      "quoted-key",
      "space-before-colon",
      "mapping-valued-mode",
      "access-scalar",
      "unrecognised-mode",
    ]) {
      assert.ok(names.includes(required), `corpus is missing ${required}`);
    }
  });

  test("every fixture resolves identically through both readers, on every tier", () => {
    const mismatches = [];
    eachCell((name, tier, { shell, js }) => {
      if (shell !== js) mismatches.push(`${name} [tier=${tier}]: shell=${shell} js=${js}`);
    });
    assert.deepEqual(
      mismatches,
      [],
      `the two readers disagree:\n  ${mismatches.join("\n  ")}`,
    );
  });

  test("no fixture makes the config tier throw", () => {
    eachCell((name, tier, { js }) => {
      assert.notEqual(
        js,
        "THREW",
        `${name} [tier=${tier}] threw \u2014 cycle 4's shape has come back`,
      );
    });
  });

  test("a declared restriction is never resolved MORE permissively than the shell", () => {
    // The weaker, direction-only invariant. It holds even where the two tiers
    // legitimately disagree with each other, so it is the one that would still
    // catch an escalation if the equality test above were ever relaxed.
    const rank = { manual: 0, command: 1, approve: 2, "read-only": 3, full: 4 };
    eachCell((name, tier, { shell, js }) => {
      assert.ok(
        rank[js] <= rank[shell],
        `${name} [tier=${tier}]: js=${js} is more permissive than shell=${shell}`,
      );
    });
  });
});

describe("config path resolution parity", () => {
  test("no config file at all resolves full — an ordinary repo is not restricted", () => {
    const dir = mkdtempSync(join(tmpdir(), "access-parity-none-"));
    try {
      assert.equal(shellAnswer(dir, "awk"), "full");
      assert.equal(jsAnswer(dir, "awk"), "full");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("SKILLS_CONFIG_FILE naming the default basename is not a redirect", () => {
    withRepo("access:\n  tracker: command\n", (dir) => {
      const { origin } = dm.resolveConfigPath(
        { SKILLS_CONFIG_FILE: "skills-config.yaml" },
        dir,
      );
      assert.equal(origin, "default");
      assert.equal(
        dm.resolveAccessTracker(
          { SKILLS_CONFIG_FILE: "skills-config.yaml" },
          { cwd: dir },
        ),
        "command",
      );
    });
  });

  test("a redirect that lands on nothing is refused, not degraded to full", () => {
    withRepo("access:\n  tracker: manual\n", (dir) => {
      const gone = join(dir, "nowhere.yaml");
      const { mode, reason } = dm.readConfiguredAccessTracker(
        { SKILLS_CONFIG_FILE: gone },
        dir,
      );
      assert.equal(mode, null);
      assert.match(reason || "", /does not name a readable config file/);
      assert.equal(
        dm.resolveAccessTracker({ SKILLS_CONFIG_FILE: gone }, { cwd: dir }),
        "manual",
        "an unusable redirect must not fall through to the env tier's full",
      );
    });
  });

  test("a redirect at a non-regular file is refused", () => {
    withRepo("access:\n  tracker: manual\n", (dir) => {
      assert.equal(
        dm.resolveAccessTracker(
          { SKILLS_CONFIG_FILE: "/dev/null" },
          { cwd: dir },
        ),
        "manual",
        "/dev/null is not a regular file and must not read as an empty config",
      );
    });
  });

  test("the tier anchors to the caller's root, not process.cwd()", () => {
    // C5-CR6. The gates are invoked as bare `node …` from wherever the operator
    // happens to be standing; anchoring to process.cwd() made a declared
    // restriction invisible from any subdirectory.
    withRepo("access:\n  tracker: read-only\n", (dir) => {
      const sub = mkdtempSync(join(dir, "sub-"));
      const before = process.cwd();
      try {
        process.chdir(sub);
        assert.equal(
          dm.resolveAccessTracker({}, { cwd: dir }),
          "read-only",
          "the caller's root must win over the process working directory",
        );
      } finally {
        process.chdir(before);
      }
    });
  });
});

describe("the refusal is legible and safe", () => {
  test("a refused config names the file and the reason", () => {
    withRepo("access: manual\n", (dir) => {
      const { mode, reason } = dm.readConfiguredAccessTracker({}, dir);
      assert.equal(mode, null);
      assert.ok(reason, "a refusal with no reason is not a legible refusal");
      assert.match(reason, /skills-config\.yaml/, "the reason must name the file");
    });
  });

  test("an unreadable config still resolves — no throw, so read-only CLIs survive", () => {
    withRepo("access:\n  tracker: Manual\n", (dir) => {
      // A typo in the CONFIG tier resolves to the most restrictive mode; only
      // the ENV tier throws. Cycle 4 threw here and took --check, --print-plan
      // and --probe-board down with the write.
      assert.equal(dm.resolveAccessTracker({}, { cwd: dir }), "manual");
    });
  });

  test("the env tier still throws on a typo", () => {
    withRepo("prd:\n  prdShardedLocation: docs/prd\n", (dir) => {
      assert.throws(
        () => dm.resolveAccessTracker({ ACCESS_TRACKER: "FULL" }, { cwd: dir }),
        /not a recognised access mode/,
      );
    });
  });

  test("config and env reduce most-restrictive-wins, in both directions", () => {
    withRepo("access:\n  tracker: approve\n", (dir) => {
      assert.equal(
        dm.resolveAccessTracker({ AGENT_SKILLS_ACCESS_TRACKER: "manual" }, { cwd: dir }),
        "manual",
        "env may tighten what config declared",
      );
      assert.equal(
        dm.resolveAccessTracker({ AGENT_SKILLS_ACCESS_TRACKER: "full" }, { cwd: dir }),
        "approve",
        "env must not loosen what config declared",
      );
    });
  });

  test("a config with no access key is spawn-free and answers full", () => {
    // The false-restriction guard: the overwhelmingly common case must not
    // depend on bash being present, let alone on it succeeding.
    withRepo("prd:\n  prdShardedLocation: docs/prd\n", (dir) => {
      const { mode, reason } = dm.readConfiguredAccessTracker({}, dir);
      assert.equal(mode, null);
      assert.equal(reason, null);
      assert.equal(dm.resolveAccessTracker({}, { cwd: dir }), "full");
    });
  });
});
