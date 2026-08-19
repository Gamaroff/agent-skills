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
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = dirname(HERE);
const REPO = dirname(dirname(SHARED));
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
 * The environment the child shell is allowed to see — the SAME allowlist
 * probeResolver builds in defer-mutation.js.
 *
 * This is the whole of T61-M5, and it is why two high-severity escalations
 * survived cycle 1. The suite used to run the shell reader with `{PATH, HOME}`
 * and the JS reader with the full `process.env`, so the two "readers" were never
 * compared under the same conditions and the entire class of environment-driven
 * divergence — BASH_ENV, PATH, the tier hook — was structurally invisible to the
 * one artifact built to see divergence. A parity suite that varies the
 * environment between its two sides is not comparing readers; it is comparing
 * two different experiments.
 */
function childEnvFor(tier) {
  // IMPORTED from defer-mutation.js, not re-declared. A hand-copied second copy
  // is what let the two sides drift in the first place, and copying it again to
  // fix that would have reinstated the same hazard one layer down.
  const env = { ...dm.CHILD_ENV_AT_LOAD };
  if (tier) env.AGENT_SKILLS_CONFIG_TIER = tier;
  return env;
}

/**
 * What read-config.sh (via resolve-platform.sh, its only consumer for access)
 * resolves in `dir`. Returns a mode, or REFUSAL_AS when it refused.
 *
 * --noprofile --norc so an operator's shell profile can neither print into the
 * captured stdout nor export an ACCESS_TRACKER that would forge the answer.
 */
function shellAnswer(dir, tier) {
  const env = childEnvFor(tier);
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
  assert.ok(
    TIERS.length > 0,
    "no config tier is usable \u2014 the corpus cannot run",
  );

  for (const tier of TIERS) {
    MATRIX[tier] = {};
    for (const { name, body } of corpus()) {
      withRepo(body, (dir) => {
        MATRIX[tier][name] = {
          shell: shellAnswer(dir, tier),
          js: jsAnswer(dir, tier),
        };
      });
    }
  }
});

/**
 * Walk the precomputed matrix, RETURNING the number of cells visited.
 *
 * Callers assert on that count. Without it every matrix test is vacuous by
 * construction: an empty TIERS or MATRIX makes the loop iterate nothing and the
 * assertions pass green, which looks identical to a real pass (T61-L4). A suite
 * whose failure mode is "silently checks nothing" is the wrong suite to guard an
 * access control with.
 */
function eachCell(fn) {
  let cells = 0;
  for (const tier of TIERS) {
    for (const [name, cell] of Object.entries(MATRIX[tier])) {
      fn(name, tier, cell);
      cells++;
    }
  }
  return cells;
}

/** Every matrix test asserts it actually visited the corpus. */
function assertNotVacuous(cells) {
  const expected = TIERS.length * corpus().length;
  assert.equal(
    cells,
    expected,
    `visited ${cells} cells, expected ${expected} — the matrix is incomplete, ` +
      `so this assertion proved nothing`,
  );
  assert.ok(
    cells >= 25,
    `only ${cells} cells visited — corpus too small to trust`,
  );
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
    assertNotVacuous(
      eachCell((name, tier, { shell, js }) => {
        if (shell !== js)
          mismatches.push(`${name} [tier=${tier}]: shell=${shell} js=${js}`);
      }),
    );
    assert.deepEqual(
      mismatches,
      [],
      `the two readers disagree:\n  ${mismatches.join("\n  ")}`,
    );
  });

  test("no fixture makes the config tier throw", () => {
    assertNotVacuous(
      eachCell((name, tier, { js }) => {
        assert.notEqual(
          js,
          "THREW",
          `${name} [tier=${tier}] threw \u2014 cycle 4's shape has come back`,
        );
      }),
    );
  });

  test("a declared restriction is never resolved MORE permissively than the shell", () => {
    // The weaker, direction-only invariant. It holds even where the two tiers
    // legitimately disagree with each other, so it is the one that would still
    // catch an escalation if the equality test above were ever relaxed.
    const rank = { manual: 0, command: 1, approve: 2, "read-only": 3, full: 4 };
    assertNotVacuous(
      eachCell((name, tier, { shell, js }) => {
        assert.ok(
          rank[js] <= rank[shell],
          `${name} [tier=${tier}]: js=${js} is more permissive than shell=${shell}`,
        );
      }),
    );
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

describe("the environment cannot forge an answer (T61-H1)", () => {
  test("a .env-supplied BASH_ENV cannot change what the config tier resolves", () => {
    // The stage CLIs call loadDotEnv() BEFORE resolving, so everything in a repo's
    // .env is in process.env by the time the tier runs. When probeResolver spread
    // process.env into the child, `bash --noprofile --norc -c` sourced $BASH_ENV —
    // arbitrary code execution, and a forged `full` over a committed `manual`.
    withRepo("access:\n  tracker: manual\n", (dir) => {
      const pwn = join(dir, "pwn.sh");
      writeFileSync(pwn, "ACCESS_TRACKER=full\nsource() { :; }\n");
      const saved = process.env.BASH_ENV;
      process.env.BASH_ENV = pwn;
      try {
        assert.equal(
          dm.resolveAccessTracker({}, { cwd: dir }),
          "manual",
          "a repo-local .env must not be able to forge the access mode",
        );
      } finally {
        if (saved === undefined) delete process.env.BASH_ENV;
        else process.env.BASH_ENV = saved;
      }
    });
  });

  test("an ambient AGENT_SKILLS_CONFIG_TIER cannot loosen the answer", () => {
    // Forcing a tier the host cannot honour makes the reader answer nothing and
    // the resolver exit 0 with `full`. It is a testing hook, so it is honoured
    // only when a CALLER passes it — never inherited from the environment (T61-M4).
    withRepo("access:\n  tracker: manual\n", (dir) => {
      const saved = process.env.AGENT_SKILLS_CONFIG_TIER;
      process.env.AGENT_SKILLS_CONFIG_TIER = "python";
      try {
        assert.equal(dm.resolveAccessTracker({}, { cwd: dir }), "manual");
      } finally {
        if (saved === undefined) delete process.env.AGENT_SKILLS_CONFIG_TIER;
        else process.env.AGENT_SKILLS_CONFIG_TIER = saved;
      }
    });
  });
});

describe("the fast-path is a hint, not an authorisation decision (T61-H2)", () => {
  test("an escape-spelled access key is not read as absent", (t) => {
    // Forcing a tier the host cannot honour makes the reader answer nothing and
    // the resolver exit 0 with `full` — so on a host without pyyaml this would
    // fail spuriously rather than test anything. SKIP loudly, per read-config.sh's
    // own instruction to suites that force a tier.
    if (!TIERS.includes("python")) return t.skip("tier python unavailable");
    // PyYAML resolves "\x61ccess" to the key `access`, so a file with no literal
    // `access` substring can still declare a restriction. The corpus covers this
    // via its escaped-key fixtures; this test names the mechanism.
    for (const body of [
      '"\\x61ccess":\n  tracker: manual\n',
      '"\\u0061ccess":\n  tracker: manual\n',
    ]) {
      withRepo(body, (dir) => {
        assert.notEqual(
          dm.resolveAccessTracker(
            { AGENT_SKILLS_CONFIG_TIER: "python" },
            { cwd: dir },
          ),
          "full",
          `an escape-spelled key must not resolve to full: ${JSON.stringify(body)}`,
        );
      });
    }
  });

  test("a config with no access key and no metacharacters stays spawn-free", () => {
    // The other half of the contract: the guard against a FALSE restriction, and
    // the reason the hint exists at all. A prose `*` in a COMMENT must not count —
    // this repo's own config carries one, and treating it as an alias made every
    // ordinary config pay the subprocess.
    withRepo(
      "# a comment with *emphasis* and a & ampersand\nprd:\n  prdShardedLocation: docs/prd\n",
      (dir) => {
        const t0 = Date.now();
        assert.equal(dm.resolveAccessTracker({}, { cwd: dir }), "full");
        assert.ok(
          Date.now() - t0 < 200,
          "an unrestricted repo must not pay for a subprocess",
        );
      },
    );
  });
});

describe("the shell seam answers the same as the JS tier", () => {
  // jira-sprint-lib.sh is the fourth gate and had NO automated coverage at all —
  // T61-H4 and T61-M1 both lived there, and the H4 mutation was caught only by a
  // hand-run probe. A gate nothing tests is a gate that drifts.
  const LIB = join(SHARED, "jira-sprint-lib.sh");

  /** Resolve JSM_ACCESS_MODE by sourcing the lib from `cwd`. */
  function seamAnswer(cwd, lib = LIB, env = {}) {
    const r = spawnSync(
      "bash",
      [
        "--noprofile",
        "--norc",
        "-c",
        'source "$1"; jsm_resolve_access; printf "%s" "$JSM_ACCESS_MODE"',
        "_",
        lib,
      ],
      {
        cwd,
        env: { ...childEnvFor(), ...env },
        encoding: "utf8",
        timeout: 20000,
      },
    );
    return String(r.stdout || "").trim();
  }

  test("it reads a config-declared restriction at all", () => {
    withRepo("access:\n  tracker: manual\n", (dir) => {
      assert.equal(seamAnswer(dir), "manual");
    });
  });

  test("it is anchored to the repo root, not the caller's cwd", () => {
    // T61-H4. read-config.sh defaults SKILLS_CONFIG_FILE to the RELATIVE
    // `skills-config.yaml`, and this skill documents bare invocations that no
    // wrapper cd's for. Unanchored, the same repo answered `manual` from its root
    // and `full` from a subdirectory.
    withRepo("access:\n  tracker: manual\n", (dir) => {
      mkdirSync(join(dir, "sub"), { recursive: true });
      spawnSync("git", ["init", "-q", "."], { cwd: dir });
      assert.equal(seamAnswer(dir), "manual", "from the repo root");
      assert.equal(
        seamAnswer(join(dir, "sub")),
        "manual",
        "from a subdirectory — a declared restriction must not vanish",
      );
    });
  });

  test("it fails CLOSED when resolve-platform.sh is not beside it", () => {
    // T61-M1. The JS tier fails closed for the identical condition; a partial
    // bundle must not be the one situation that grants everything.
    withRepo("access:\n  tracker: manual\n", (dir) => {
      const lonely = join(dir, "lonely");
      mkdirSync(lonely, { recursive: true });
      const copy = join(lonely, "jira-sprint-lib.sh");
      writeFileSync(copy, readFileSync(LIB, "utf8"));
      assert.equal(seamAnswer(dir, copy), "manual");
    });
  });

  test("an ambient forced tier cannot loosen it", () => {
    withRepo("access:\n  tracker: manual\n", (dir) => {
      assert.equal(
        seamAnswer(dir, LIB, { AGENT_SKILLS_CONFIG_TIER: "python" }),
        "manual",
      );
    });
  });

  test("a refusal populates JSM_ACCESS_ERROR with the resolver's own line", () => {
    // The shell path used to hand the operator `manual` and no reason at all.
    // The first attempt at fixing that grepped for "^\\xe2\\x9d\\x8c" in double
    // quotes — grep does not interpret \\xNN, so it searched for the literal text
    // `xe2x9dx8c`, matched nothing, and the capture was silently inert. Asserting
    // on the CONTENT is what makes that visible; asserting only on the mode would
    // have passed either way.
    withRepo("access: manual\n", (dir) => {
      spawnSync("git", ["init", "-q", "."], { cwd: dir });
      const r = spawnSync(
        "bash",
        [
          "--noprofile",
          "--norc",
          "-c",
          'source "$1"; jsm_resolve_access; printf "%s" "$JSM_ACCESS_ERROR"',
          "_",
          LIB,
        ],
        {
          cwd: dir,
          env: { PATH: process.env.PATH, HOME: process.env.HOME },
          encoding: "utf8",
          timeout: 20000,
        },
      );
      const err = String(r.stdout || "").trim();
      assert.ok(
        err.length > 0,
        "a refusal with no reason is not a legible refusal",
      );
      assert.match(err, /access/, "the reason must name what was wrong");
    });
  });

  test("an unrestricted repo still answers full", () => {
    withRepo("prd:\n  prdShardedLocation: docs/prd\n", (dir) => {
      assert.equal(seamAnswer(dir), "full");
    });
  });

  test("env may tighten the config answer but never loosen it", () => {
    withRepo("access:\n  tracker: approve\n", (dir) => {
      assert.equal(
        seamAnswer(dir, LIB, { AGENT_SKILLS_ACCESS_TRACKER: "manual" }),
        "manual",
      );
      assert.equal(
        seamAnswer(dir, LIB, { AGENT_SKILLS_ACCESS_TRACKER: "full" }),
        "approve",
      );
    });
  });
});

describe("regressions from the cycle-1 fixes", () => {
  const LIB2 = join(SHARED, "jira-sprint-lib.sh");

  test("the seam works when the lib is sourced by a RELATIVE path", () => {
    // The cycle-1 anchor fix computed $resolver from a relative BASH_SOURCE and
    // then cd'd away from it, so `source` failed and EVERY answer became
    // `manual`. A repo declaring nothing deferred every sprint write — a false
    // restriction, and worse than the bug being fixed. The earlier seam tests
    // could not see it because they passed an absolute path.
    for (const [body, want] of [
      ["prd:\n  prdShardedLocation: docs/prd\n", "full"],
      ["access:\n  tracker: manual\n", "manual"],
    ]) {
      withRepo(body, (dir) => {
        spawnSync("git", ["init", "-q", "."], { cwd: dir });
        mkdirSync(join(dir, "refs"), { recursive: true });
        mkdirSync(join(dir, "sub"), { recursive: true });
        for (const f of [
          "jira-sprint-lib.sh",
          "resolve-platform.sh",
          "read-config.sh",
        ]) {
          writeFileSync(
            join(dir, "refs", f),
            readFileSync(join(SHARED, f), "utf8"),
          );
        }
        const r = spawnSync(
          "bash",
          [
            "--noprofile",
            "--norc",
            "-c",
            'source "../refs/jira-sprint-lib.sh"; jsm_resolve_access; printf "%s" "$JSM_ACCESS_MODE"',
          ],
          {
            cwd: join(dir, "sub"),
            env: childEnvFor(),
            encoding: "utf8",
            timeout: 20000,
          },
        );
        assert.equal(
          String(r.stdout || "").trim(),
          want,
          `relative source, config ${JSON.stringify(body)}`,
        );
      });
    }
  });

  test("an exported CDPATH cannot turn every answer into `manual`", () => {
    // `cd` consults CDPATH, and on a match it PRINTS the directory to stdout —
    // which, inside `$(...)`, lands in the resolver path. An operator with CDPATH
    // in their dotfiles plus a bare-relative source path got a garbage path,
    // `[ -f ]` false, and `manual` on every write, blamed on the bundle. Same
    // false-restriction class as the cycle-2 regression, through another door.
    for (const [body, want] of [
      ["prd:\n  prdShardedLocation: docs/prd\n", "full"],
      ["access:\n  tracker: manual\n", "manual"],
    ]) {
      withRepo(body, (dir) => {
        spawnSync("git", ["init", "-q", "."], { cwd: dir });
        mkdirSync(join(dir, "refs"), { recursive: true });
        mkdirSync(join(dir, "sub"), { recursive: true });
        mkdirSync(join(dir, "decoy", "refs"), { recursive: true });
        for (const f of [
          "jira-sprint-lib.sh",
          "resolve-platform.sh",
          "read-config.sh",
        ]) {
          writeFileSync(
            join(dir, "refs", f),
            readFileSync(join(SHARED, f), "utf8"),
          );
        }
        const r = spawnSync(
          "bash",
          [
            "--noprofile",
            "--norc",
            "-c",
            // A BARE relative dirname (`refs/...`, not `../refs/...`). CDPATH is
            // consulted only for paths that do not begin with `/`, `./` or
            // `../`, so the `../` form used by the sibling test cannot trigger
            // this hazard at all — the first version of this test asserted
            // nothing for exactly that reason.
            'source "refs/jira-sprint-lib.sh"; jsm_resolve_access; printf "%s" "$JSM_ACCESS_MODE"',
          ],
          {
            cwd: dir,
            env: { ...childEnvFor(), CDPATH: join(dir, "decoy") },
            encoding: "utf8",
            timeout: 20000,
          },
        );
        assert.equal(
          String(r.stdout || "").trim(),
          want,
          `CDPATH exported, config ${JSON.stringify(body)}`,
        );
      });
    }
  });

  test("a config refusal is PRINTED, not just stored in a variable", () => {
    // Both new writers set JSM_ACCESS_ERROR and returned 0, while the only
    // existing printer was the return-1 path — so the message was written and
    // never shown. Asserting on the variable alone would still pass.
    withRepo("access: manual\n", (dir) => {
      spawnSync("git", ["init", "-q", "."], { cwd: dir });
      const r = spawnSync(
        "bash",
        [
          "--noprofile",
          "--norc",
          "-c",
          'source "$1"; jsm_resolve_access >/dev/null',
          "_",
          LIB2,
        ],
        { cwd: dir, env: childEnvFor(), encoding: "utf8", timeout: 20000 },
      );
      assert.match(
        String(r.stderr || ""),
        /access/,
        "the refusal reason must reach stderr, not just a shell variable",
      );
    });
  });

  test("every makeHttp call site is anchored to a repo root", () => {
    // T61-M3's first sweep fixed jira-stage.js and missed six live write paths in
    // the three sync scripts plus scaffold-tracker-workflow. Layer 1 there
    // resolved the config tier against process.cwd(), so a bare `node ...` run
    // from a subdirectory wrote at `full` over a committed restriction. A grep is
    // the honest guard: the defect is "somebody added a call site and forgot".
    // DISCOVERED, not listed. The defect this guards against is "somebody added a
    // call site and forgot the anchor" — a hard-coded list cannot see a call site
    // in a file nobody remembered to add to the list.
    const files = [];
    for (const f of readdirSync(SHARED)) {
      if (f.endsWith(".js")) files.push(join(SHARED, f));
    }
    const skillsDir = join(REPO, "skills");
    for (const skill of readdirSync(skillsDir)) {
      let entries = [];
      try {
        entries = readdirSync(join(skillsDir, skill, "scripts"));
      } catch {
        continue; // no scripts/ dir
      }
      for (const f of entries) {
        if (f.endsWith(".js")) files.push(join(skillsDir, skill, "scripts", f));
      }
    }
    const withCalls = files.filter((f) =>
      readFileSync(f, "utf8").includes("makeHttp("),
    );
    assert.ok(
      withCalls.length >= 5,
      `expected >=5 files with makeHttp calls, found ${withCalls.length}`,
    );
    for (const f of withCalls) {
      const src = readFileSync(f, "utf8");
      // A window after each call, NOT a match to the first `)` — the argument
      // object contains `(typeof fetch !== "undefined" ? ... )`, so a lazy
      // `\\)` terminates inside it and the check reads no arguments at all. It
      // failed on correctly-anchored code the first time for exactly that reason.
      const calls = [];
      let at = src.indexOf("makeHttp(");
      while (at !== -1) {
        const next = src.indexOf("makeHttp(", at + 1);
        // Bounded at the NEXT call, not a fixed window: otherwise a new
        // unanchored call added just before an anchored one borrows its
        // neighbour's `cwd:` and the guard passes on broken code.
        calls.push(
          src.slice(
            Math.max(0, at - 12),
            next === -1 ? at + 600 : Math.min(next, at + 600),
          ),
        );
        at = next;
      }
      assert.ok(calls.length > 0, `no makeHttp call found in ${f}`);
      for (const args of calls) {
        // Not every `makeHttp(` is a call. The DEFINITION in jira-sync.js
        // (`function makeHttp({ … })`) and a no-argument invocation are both
        // exempt — only an argument object on a real call needs the anchor.
        // The widened discovery above surfaced the definition immediately, which
        // is the guard working, not a defect in the source.
        if (/^makeHttp\(\s*\)/.test(args)) continue;
        if (/function\s+makeHttp\(/.test(args)) continue;
        assert.match(
          args,
          /cwd:/,
          `a makeHttp call in ${f} has no cwd — layer 1 would resolve the ` +
            `config tier against process.cwd()`,
        );
      }
    }
  });
});

describe("the refusal is legible and safe", () => {
  test("a refused config names the file and the reason", () => {
    withRepo("access: manual\n", (dir) => {
      const { mode, reason } = dm.readConfiguredAccessTracker({}, dir);
      assert.equal(mode, null);
      assert.ok(reason, "a refusal with no reason is not a legible refusal");
      assert.match(
        reason,
        /skills-config\.yaml/,
        "the reason must name the file",
      );
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
        dm.resolveAccessTracker(
          { AGENT_SKILLS_ACCESS_TRACKER: "manual" },
          { cwd: dir },
        ),
        "manual",
        "env may tighten what config declared",
      );
      assert.equal(
        dm.resolveAccessTracker(
          { AGENT_SKILLS_ACCESS_TRACKER: "full" },
          { cwd: dir },
        ),
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
