/**
 * security-probe — the TypeScript module entry form (task.314).
 *
 * A boundary written in TypeScript used to be declined `entry-not-probeable`, so
 * `probes_executed` was 0 and /finalise's zero-guard failed every run. The engine
 * now loads a `.ts`/`.mts`/`.cts`/`.tsx` module entry through a bundled loader
 * hook and the TARGET repository's own `typescript` package. This suite holds:
 *   - every fixture shape loads and is scored, never declined;
 *   - calibration: a refusing control scores held, an accept-everything one on the
 *     same fixture scores reproduced, and an escaping write is still caught;
 *   - a repository with no compiler is declined BY NAME, with the root searched;
 *   - nothing a case or the ambient environment supplies reaches the child's argv
 *     or its compiler binding, and a plain `.mjs` entry is started exactly as before.
 *
 * `typescript` is a pinned devDependency of this repository so this suite can
 * never pass by skipping: the precondition test below FAILS when it is absent.
 *
 * Run: node --test shared/resources/tests/security-probe-typescript-entry.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  TS_ENTRY_EXTENSION,
  checkTypeScriptRuntime,
  runProbeSpec,
} from "../security-probe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FX = "shared/resources/tests/fixtures/security-probe-ts";
const FX_NO_CONFIG =
  "shared/resources/tests/fixtures/security-probe-ts-notsconfig";

/** Corpus-shaped cases: three hostile shapes, one a hook never names, and a legitimate host. */
const CASES = [
  {
    id: "h.slash",
    sink: "url-authority",
    input: "evil.example.com/x",
    why: "a / ends the authority",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "h.backslash",
    sink: "url-authority",
    input: "evil.example.com\\x",
    why: "a backslash ends the authority in some parsers",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "h.hash",
    sink: "url-authority",
    input: "evil.example.com#x",
    why: "a fragment re-points the host",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "l.plain",
    sink: "url-authority",
    input: "example.com",
    why: "a plain host",
    correct: "accept",
    direction: "legitimate",
  },
];

const probe = (entry, cases = CASES, extra = {}) =>
  runProbeSpec({ sink: "url-authority", entry, cases, ...extra });

// ── precondition ─────────────────────────────────────────────────────────────

test("precondition: this repository's own typescript resolves, so no test below can pass by skipping", () => {
  const require = createRequire(
    resolve(HERE, "..", "..", "..", "package.json"),
  );
  assert.doesNotThrow(() => require.resolve("typescript"));
});

test("precondition: the no-tsconfig fixture has no tsconfig above it, or its test proves nothing", () => {
  const require = createRequire(
    resolve(HERE, "..", "..", "..", "package.json"),
  );
  const ts = require("typescript");
  assert.equal(
    ts.findConfigFile(
      resolve(FX_NO_CONFIG),
      ts.sys.fileExists,
      "tsconfig.json",
    ),
    undefined,
  );
});

// ── the extension test ───────────────────────────────────────────────────────

test("the extension test selects exactly the four TypeScript extensions", () => {
  for (const yes of ["a.ts", "a.mts", "a.cts", "a.tsx", "dir/b.ts"]) {
    assert.ok(TS_ENTRY_EXTENSION.test(yes), yes);
  }
  for (const no of [
    "a.js",
    "a.mjs",
    "a.cjs",
    "a.py",
    "a.json",
    "a.ts.map",
    "a.tsx.bak",
    "ts",
    "a.jsx",
  ]) {
    assert.ok(!TS_ENTRY_EXTENSION.test(no), no);
  }
});

// ── every shape loads and is scored, never declined ──────────────────────────

const SHAPES = [
  [
    "guard.ts",
    "parameter property, enum, namespace, extensionless import, NodeNext .js specifier, commonjs package",
  ],
  ["alias.ts", "a value import through a tsconfig `paths` alias"],
  ["decorated.ts", "a class decorator"],
  ["view.tsx", "a .tsx entry"],
  [
    "plain.mts",
    "a .mts entry with a type-only import and a parameter property",
  ],
  ["plain.cts", "a .cts entry"],
  [
    "esm-pkg/guard.ts",
    'a "type": "module" package with a directory (index.ts) import',
  ],
];

/** The two cases every fixture's refusal covers: a hostile `/` and a plain host. */
const BASIC = [CASES[0], CASES[3]];

for (const [file, what] of SHAPES) {
  test(`loads and scores ${file} (${what})`, () => {
    const r = probe(`${FX}/${file}#validateHost`, BASIC);
    assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
    assert.equal(r.executed, BASIC.length);
    assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  });
}

test("loads and scores an entry with no tsconfig, mapping a .js specifier to its .ts file", () => {
  const r = probe(`${FX_NO_CONFIG}/guard.ts#validateHost`, BASIC);
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
});

// ── QA cycle 2: target default, tsconfig bound, root of `/` ──────────────────

const FX_NO_TARGET =
  "shared/resources/tests/fixtures/security-probe-ts-notarget";
const OWN_TS = dirname(
  createRequire(resolve(HERE, "..", "..", "..", "package.json")).resolve(
    "typescript/package.json",
  ),
);

test("T314-CR2-1: a tsconfig with no target still loads a thrown Error subclass so instanceof holds", () => {
  const r = probe(`${FX_NO_TARGET}/errguard.ts#validateHost`, BASIC);
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
});

test("T314-CR2-1: with no tsconfig at all the same subclass holds", () => {
  const r = probe(`${FX_NO_CONFIG}/errguard.ts#validateHost`, BASIC);
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
});

/** A repo with its own compiler and a copy of the no-tsconfig fixture; a tsconfig that asks for ES5 is placed where `at` says. */
function repoWithEs5Config(t, at) {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "probe-ts-cfg-")));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const repo = join(parent, "repo");
  mkdirSync(join(repo, "node_modules"), { recursive: true });
  symlinkSync(OWN_TS, join(repo, "node_modules", "typescript"));
  cpSync(resolve(FX_NO_CONFIG), join(repo, "fx"), { recursive: true });
  const dir = at === "parent" ? parent : repo;
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { target: "ES5" } }),
  );
  return repo;
}

test("T314-CR2-2: a tsconfig that exists only ABOVE the repo root is never inherited", (t) => {
  const repo = repoWithEs5Config(t, "parent");
  const r = probe("fx/errguard.ts#validateHost", BASIC, { repoRoot: repo });
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  // The parent's ES5 config is ignored, so the default target applies and instanceof holds.
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
});

test("T314-CR2-2 control: the same tsconfig INSIDE the repo root is applied", (t) => {
  const repo = repoWithEs5Config(t, "inside");
  const r = probe("fx/errguard.ts#validateHost", BASIC, { repoRoot: repo });
  // ES5 downlevels the subclass, so the refusal reads as a crash: proof the config was read.
  assert.notEqual(r.verdict, "engages", JSON.stringify(r.cases));
});

test("T314-CR2-3: a repo root of / finds the compiler between the entry and the root", () => {
  const entry = resolve(FX, "guard.ts");
  const r = checkTypeScriptRuntime("/", entry);
  assert.equal(r.ok, true, JSON.stringify(r));
});

// ── calibration ──────────────────────────────────────────────────────────────

test("calibration: a refusing control scores held and an accept-everything control on the same fixture scores reproduced", () => {
  const held = probe(`${FX}/guard.ts#validateHost`);
  assert.equal(held.verdict, "engages");
  assert.deepEqual(held.reproduced, []);
  assert.deepEqual(held.overblocked, []);

  const reproduced = probe(`${FX}/guard.ts#acceptAll`);
  assert.equal(reproduced.verdict, "absent", JSON.stringify(reproduced.cases));
  assert.deepEqual(reproduced.reproduced.sort(), [
    "h.backslash",
    "h.hash",
    "h.slash",
  ]);
  assert.deepEqual(reproduced.declined, []);
});

test("calibration: an escaping write from a TypeScript entry is still reported", () => {
  const r = probe(`${FX}/escaper.ts#validateHost`, [CASES[0]]);
  assert.ok(
    r.escapes.length > 0,
    "the sentinel must fire for a TypeScript entry too",
  );
  assert.match(r.escapes[0].path, /escaped-ts\.txt/);
});

test("the hook writes nothing: a TypeScript run that engages reports no escape", () => {
  const r = probe(`${FX}/guard.ts#validateHost`);
  assert.equal(r.verdict, "engages");
  assert.deepEqual(r.escapes, []);
});

// ── a repository with no compiler ────────────────────────────────────────────

test("a repository with no typescript is declined by name, with what was searched, never a raw import error", (t) => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "probe-ts-nocompiler-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(resolve(FX), join(root, "fx"), { recursive: true });
  const r = probe("fx/guard.ts#validateHost", CASES, { repoRoot: root });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.executed, 0);
  assert.equal(r.reason, "typescript-unavailable");
  assert.equal(r.declined[0].reason, "typescript-unavailable");
  assert.ok(
    r.declined[0].detail.includes(root),
    `the searched root must be named: ${r.declined[0].detail}`,
  );
  assert.doesNotMatch(r.declined[0].detail, /Cannot find|ERR_MODULE_NOT_FOUND/);
});

test("a typescript that exists only ABOVE the repo root is never borrowed (T314-CR-1)", (t) => {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "probe-ts-above-")));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  // A compiler in the PARENT of the repo root, none inside it.
  mkdirSync(join(parent, "node_modules"), { recursive: true });
  symlinkSync(
    dirname(
      createRequire(resolve(HERE, "..", "..", "..", "package.json")).resolve(
        "typescript/package.json",
      ),
    ),
    join(parent, "node_modules", "typescript"),
  );
  const repo = join(parent, "repo");
  mkdirSync(repo);
  cpSync(resolve(FX), join(repo, "fx"), { recursive: true });
  const r = probe("fx/guard.ts#validateHost", CASES, { repoRoot: repo });
  assert.equal(r.reason, "typescript-unavailable");
  assert.equal(r.executed, 0);
  assert.ok(r.declined[0].detail.includes(repo));
});

test("the control: a typescript inside the repo root, above the entry's directory, is found", (t) => {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), "probe-ts-inside-")));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const repo = join(parent, "repo");
  mkdirSync(join(repo, "node_modules"), { recursive: true });
  symlinkSync(
    dirname(
      createRequire(resolve(HERE, "..", "..", "..", "package.json")).resolve(
        "typescript/package.json",
      ),
    ),
    join(repo, "node_modules", "typescript"),
  );
  cpSync(resolve(FX), join(repo, "fx"), { recursive: true });
  const r = probe("fx/guard.ts#validateHost", CASES, { repoRoot: repo });
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
});

test("a Node without registerHooks is declined by name with its version", () => {
  const r = checkTypeScriptRuntime("/repo", "/repo/a.ts", {});
  assert.equal(r.ok, false);
  assert.equal(r.reason, "typescript-hook-unavailable");
  assert.ok(r.detail.includes(process.version));
  assert.ok(r.detail.includes("22.15.0"));
});

// ── containment ──────────────────────────────────────────────────────────────

test("a TypeScript entry outside the repo root is refused by containment before any compiler is resolved or child spawned", (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "probe-ts-elsewhere-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // An absolute path: a relative one resolves against the root, which is not outside it.
  const r = probe(`${resolve(FX)}/guard.ts#validateHost`, CASES, {
    repoRoot: root,
  });
  assert.equal(r.reason, "outside-repo-root");
  assert.equal(r.executed, 0);
  assert.deepEqual(r.cases ?? [], []);
});

// ── nothing caller-supplied reaches the child ────────────────────────────────

const HOOK = resolve(HERE, "..", "security-probe-ts-hook.mjs");

/** The one answer an argv-probe entry gives: its child's execArgv and compiler binding. */
function startedAs(entry, input = "MARKER-d41d8cd9") {
  const r = probe(entry, [{ ...CASES[0], input }]);
  assert.deepEqual(r.declined, [], JSON.stringify(r.declined));
  return JSON.parse(r.cases[0].detail);
}

test("a TypeScript child is started with the fixed hook and the engine-resolved compiler, and nothing from the case", () => {
  const seen = startedAs(`${FX}/argv-probe.ts#validateHost`);
  assert.deepEqual(seen.execArgv, [
    "--import",
    HOOK,
    "--input-type=module",
    "-e",
    "<code>",
  ]);
  assert.ok(
    !JSON.stringify(seen).includes("MARKER-d41d8cd9"),
    "the case input must not reach argv or env",
  );
  assert.equal(
    seen.compiler,
    createRequire(resolve(`${FX}/argv-probe.ts`)).resolve("typescript"),
  );
});

test("an ambient PROBE_TS_COMPILER never reaches the child: the binding is the engine's own", () => {
  const before = process.env.PROBE_TS_COMPILER;
  process.env.PROBE_TS_COMPILER = "/nonexistent/typescript.js";
  try {
    const seen = startedAs(`${FX}/argv-probe.ts#validateHost`);
    assert.equal(
      seen.compiler,
      createRequire(resolve(`${FX}/argv-probe.ts`)).resolve("typescript"),
    );
  } finally {
    if (before === undefined) delete process.env.PROBE_TS_COMPILER;
    else process.env.PROBE_TS_COMPILER = before;
  }
});

test("a plain .mjs entry is started exactly as before: no --import, no compiler binding", () => {
  const seen = startedAs(`${FX}/argv-probe.mjs#validateHost`);
  assert.deepEqual(seen.execArgv, ["--input-type=module", "-e", "<code>"]);
  assert.equal(seen.compiler, null);
});

test("the hook file the engine passes exists beside the engine", () => {
  assert.ok(existsSync(HOOK));
});
