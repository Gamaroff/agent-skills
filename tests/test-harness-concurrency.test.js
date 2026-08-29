"use strict";
/**
 * Test-harness concurrency guard — bug.2.
 *
 * WHY THIS EXISTS
 * ---------------
 * `node --test` defaults its file-level concurrency to the machine's CPU count. Most of this
 * repo's suites are not CPU-bound — they `spawnSync` a child per assertion — so on a 16-core box
 * the runner starts 16 test FILES at once and each of those forks its own children. The effective
 * process count lands far above core count, every spawn's latency inflates, and any test whose
 * timeout was chosen against an idle-machine measurement becomes a coin flip.
 *
 * Measured on the bug (16 cores, Node 24): `shared/resources/tests/jira-interception.test.mjs`
 * runs in 3.2s alone and 48.5s under spawn contention — 15x. Its slowest single test goes from
 * 461ms to 6741ms against a bare 20s timeout, i.e. the margin falls from ~43x to ~3x. Nothing in
 * the code under test changed; only the process pressure did.
 *
 * This had already cost two merges over a red local suite (task.62, task.63), which is the
 * expensive part: a gate that goes red for environmental reasons teaches everyone to merge over
 * red, which is precisely the habit that lets a real red through.
 *
 * WHAT IS PINNED, AND WHY IT IS EVERY INVOCATION
 * ---------------------------------------------
 * The bound lives in `package.json`, so the guard reads `package.json` — editing the scripts is
 * what these assertions measure. It is asserted on EVERY `node --test` invocation rather than on
 * the `test` script alone, because the defect is reintroduced by ADDING a script, not by editing
 * the one that was fixed. A guard pinned to a single string would pass while the next unbounded
 * runner is added beside it.
 *
 * KNOWN LIMITATION, deliberately not guarded: `TEST_CONCURRENCY=0` or a typo'd non-numeric value
 * is accepted by the shell and then silently ignored by node (its `getOptionValue(...) || undefined`
 * falsifies 0), so the runner falls back to CPU-count concurrency with exit status 0 and no warning.
 * No static guard can see that — these tests read the shell DEFAULT, never the effective value. It is
 * left as-is rather than wrapped in validation noise because the failure mode is a return to the
 * pre-fix default, and the pre-fix default is not what was actually tripping the gate: the spawn
 * budget below is, and it is unaffected by TEST_CONCURRENCY.
 *
 * The bound is deliberately NOT asserted to be a specific number — only that it is present, is a
 * positive integer, and is genuinely below the core counts these suites run on (a "bound" of 16
 * on a 16-core box bounds nothing). Pick the number by measurement; at the time of the fix, 4 was
 * measured at no wall-clock cost against the unbounded default (135.0s vs 137.0s).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PKG_PATH = path.join(__dirname, "..", "package.json");
const SCRIPTS = JSON.parse(fs.readFileSync(PKG_PATH, "utf8")).scripts;

/**
 * Split a script body into the individual commands a shell would run.
 *
 * Detection is per-command rather than by splitting on the literal string `node --test`, because
 * that literal is three separate false answers waiting to happen: it misses
 * `node --experimental-vm-modules --test` and `node  --test` (two spaces) — both of which ship an
 * unbounded runner past a green guard, the exact regression this file exists to prevent — and it
 * misreports `node --test-concurrency=4 --test '...'` as unbounded, because the split consumes the
 * flag it is looking for.
 */
function commandsIn(body) {
  return body.split(/&&|\|\||;|\n|(?<!\|)\|(?!\|)/);
}

/** `--test` as its own flag — NOT the `--test-concurrency` that starts with the same characters. */
const TEST_FLAG = /--test(?![-\w])/;

/** Every script whose body starts a `node --test` runner. */
function isRunnerCommand(command) {
  return /\bnode\b/.test(command) && TEST_FLAG.test(command);
}

/**
 * @param {Record<string,string>} scripts Injectable so the tests below can pin THIS function against
 *   synthetic scripts. Testing a locally re-declared copy of the predicate instead left the real one
 *   unguarded: reverting it to the old literal match changed nothing observable on this repo, so the
 *   mutation survived a green suite.
 */
function runnerScripts(scripts = SCRIPTS) {
  return Object.entries(scripts).filter(([, body]) =>
    commandsIn(body).some(isRunnerCommand),
  );
}

/**
 * The concurrency bound each `node --test` command in `body` carries.
 *
 * One entry per runner command, so an unbounded runner appended to an already-bounded script is
 * still caught. `undefined` marks a runner with no `--test-concurrency` at all.
 */
function boundsIn(body) {
  return commandsIn(body)
    .filter((c) => /\bnode\b/.test(c) && TEST_FLAG.test(c))
    .map((command) => {
      const m = command.match(
        /--test-concurrency[= ]"?(?:\$\{(\w+):-(\d+)\}|(\d+))"?/,
      );
      if (!m) return undefined;
      return { envVar: m[1], value: Number(m[2] ?? m[3]) };
    });
}

test("the repo actually has node --test runners to guard", () => {
  assert.ok(
    runnerScripts().length > 0,
    "no `node --test` script found in package.json — this guard is measuring nothing",
  );
});

test("every `node --test` invocation bounds its concurrency", () => {
  const unbounded = [];
  for (const [name, body] of runnerScripts()) {
    boundsIn(body).forEach((bound, i) => {
      if (bound === undefined) unbounded.push(`${name} (invocation ${i + 1})`);
    });
  }
  assert.deepEqual(
    unbounded,
    [],
    `unbounded \`node --test\` runner(s): ${unbounded.join(", ")}. ` +
      "`node --test` defaults to CPU-count file concurrency; these suites spawn a child per " +
      "assertion, so the default oversubscribes the box and inflates spawn latency until " +
      "timeouts trip for environmental reasons. Add --test-concurrency (see bug.2).",
  );
});

test("each bound is a positive integer that is actually below core count", () => {
  // 8 is the ceiling, not the target: a bound at or above a typical CI/dev core count (8-16)
  // would satisfy "a flag is present" while leaving the oversubscription entirely in place.
  const MAX_SANE = 8;
  for (const [name, body] of runnerScripts()) {
    for (const bound of boundsIn(body)) {
      if (bound === undefined) continue; // reported by the test above
      assert.ok(
        Number.isInteger(bound.value) && bound.value > 0,
        `${name}: --test-concurrency must be a positive integer, got ${bound.value}`,
      );
      assert.ok(
        bound.value <= MAX_SANE,
        `${name}: --test-concurrency=${bound.value} does not bound anything on an ${MAX_SANE}+ core box`,
      );
    }
  }
});

test("the bound is overridable from the environment without editing package.json", () => {
  // Same rationale as PARITY_SPAWN_TIMEOUT_MS in access-config-parity.test.mjs: a slow or
  // differently-sized CI box must be tunable without a commit.
  for (const [name, body] of runnerScripts()) {
    for (const bound of boundsIn(body)) {
      if (bound === undefined) continue;
      assert.ok(
        bound.envVar,
        `${name}: --test-concurrency is hardcoded; use \${TEST_CONCURRENCY:-N} so a box can be tuned`,
      );
    }
  }
});

/* ------------------------------------------------------------------------ *
 * Spawn budget — the other half of bug.2.
 *
 * Bounding the runner removes the suite's SELF-inflicted contention, and that turned out to be
 * the smaller half. Measured on a 16-core box: the full suite's slowest test is ~2.8s idle at
 * ANY concurrency (bounded or not), but 16.2s when sixteen unrelated spawn loops compete — and a
 * dev box running `npm test` is usually also running the agent pipelines that asked for it. The
 * exposure that actually trips is therefore per-spawn timeout headroom, not file concurrency.
 *
 * A bare `timeout: 20000` is ~1.2x the loaded worst case. The shared budget defaults to 60s, and
 * `access-config-parity.test.mjs` — the one file that already had it — is precisely the file that
 * absorbed that 16.2s spike without failing. These tests keep the literals from growing back.
 * ------------------------------------------------------------------------ */

const BUDGET_MODULE = path.join(
  __dirname,
  "..",
  "shared/resources/tests/spawn-budget.mjs",
);

/**
 * Strip comments from JS source, keeping every other byte.
 *
 * WHY THIS IS A SCANNER AND NOT A REGEX
 * -------------------------------------
 * Two regex versions of this shipped and both were wrong, in opposite directions, because JavaScript
 * cannot be lexed by a regex:
 *
 *   1. Stripping block comments before line comments let a `/*` inside a `//` comment open a phantom
 *      block running to the next close-marker anywhere later — 53 lines of a real suite vanished.
 *   2. Adding a string arm fixed that but had no REGEX-LITERAL arm, so `str.replace(/\//g, "")` put a
 *      literal `//` into the source and the rest of that line was deleted (11 real sites in this
 *      tree), while a quote inside a character class — `/['"]/` — opened a pseudo-string that ran to
 *      the next quote and PRESERVED every comment in between.
 *
 * Deleting code is the dangerous direction: the scan below then cannot see a hardcoded timeout that
 * is really there, and the guard passes on the regression it exists to catch. Preserving a comment is
 * the annoying direction: a false positive on prose. This scanner does neither.
 *
 * It tracks the five states that matter — line comment, block comment, string (all three quotes),
 * regex literal (character classes included, so `/` inside `[...]` does not end it) — and uses the
 * standard preceding-token heuristic to tell a regex literal from a division.
 */
function stripComments(src) {
  const REGEX_OK_AFTER =
    /[(,=:[!&|?{};+\-*%~^<>]$|\b(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;
  let out = "";
  let i = 0;
  const n = src.length;
  // Trailing significant output, for the regex-vs-division heuristic. A window rather than a scan
  // of `out`: trimming the whole accumulated string on every `/` is quadratic (measured 3.9s on a
  // 1.2MB input, 245ms at 500KB) and the longest keyword here is 10 characters.
  let tail = "";
  const emit = (text) => {
    out += text;
    tail = (tail + text).slice(-16);
  };
  const regexAllowed = () => {
    const before = tail.replace(/\s+$/, "");
    return before === "" || REGEX_OK_AFTER.test(before);
  };

  // Template-literal state. A template's closing backtick ALWAYS returns to code, because a
  // template can only be opened from code — either at the top level or inside a `${}`. What needs
  // a stack is the `${}` substitution: its contents are CODE, and the matching `}` must return to
  // the enclosing template. Without this, a nested template's opening backtick closed the outer
  // one and its contents were scanned as code, so a URL, a glob or a `//` inside it started a
  // comment and deleted the rest of the line — to EOF for a `/*`.
  let inTemplate = false;
  const substitutions = []; // saved brace depth, one entry per open `${`
  let braceDepth = 0;

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];

    if (inTemplate) {
      if (c === "\\") {
        emit(c + (src[i + 1] ?? ""));
        i += 2;
        continue;
      }
      if (c === "`") {
        emit(c);
        i++;
        inTemplate = false;
        continue;
      }
      if (c === "$" && d === "{") {
        emit("${");
        i += 2;
        substitutions.push(braceDepth);
        braceDepth = 0;
        inTemplate = false;
        continue;
      }
      emit(c);
      i++;
      continue;
    }

    // ---- code ----
    if (c === "/" && d === "/") {
      // `\r` terminates a line comment in JS too; stopping only at `\n` ran a CRLF-free comment on.
      while (i < n && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      emit(c);
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          emit(src[i] + (src[i + 1] ?? ""));
          i += 2;
          continue;
        }
        emit(src[i]);
        if (src[i] === c) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "`") {
      emit(c);
      i++;
      inTemplate = true;
      continue;
    }
    if (c === "}" && braceDepth === 0 && substitutions.length > 0) {
      emit(c);
      i++;
      braceDepth = substitutions.pop();
      inTemplate = true;
      continue;
    }
    if (c === "{") braceDepth++;
    else if (c === "}") braceDepth--;
    if (c === "/" && regexAllowed()) {
      emit(c);
      i++;
      let inClass = false;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\") {
          emit(ch + (src[i + 1] ?? ""));
          i += 2;
          continue;
        }
        if (ch === "\n") break; // unterminated — not a regex after all; stop rather than run on
        emit(ch);
        i++;
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
      }
      continue;
    }
    emit(c);
    i++;
  }
  return out;
}

/** Source with comments removed, so prose about a historical value is not read as code. */
function code(file) {
  return stripComments(fs.readFileSync(file, "utf8"));
}

/** Every test file the runners actually execute. */
function testFiles() {
  const roots = ["shared/resources/tests", "tests", "evals", "skills"];
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.test\.(mjs|js)$/.test(e.name)) out.push(full);
    }
  };
  for (const r of roots) walk(path.join(__dirname, "..", r));
  return out;
}

test("the shared spawn budget exists and is generous by default", () => {
  assert.ok(
    fs.existsSync(BUDGET_MODULE),
    `missing shared spawn budget at ${BUDGET_MODULE}`,
  );
  const src = code(BUDGET_MODULE);
  const m = src.match(/DEFAULT_TIMEOUT_MS\s*=\s*([0-9_]+)/);
  assert.ok(m, "spawn-budget.mjs must declare DEFAULT_TIMEOUT_MS");
  const def = Number(m[1].replace(/_/g, ""));
  // The loaded worst case measured for bug.2 was 16.2s. 20s was ~1.2x that and was being hit;
  // anything under 30s is back inside the range that produced the original mystery failures.
  assert.ok(
    def >= 30000,
    `DEFAULT_TIMEOUT_MS=${def} is too tight — the measured loaded worst case was 16.2s`,
  );
});

test("the spawn budget is tunable per-suite and globally", () => {
  const src = code(BUDGET_MODULE);
  // `/SPAWN_TIMEOUT_MS/` is a strict substring of `TEST_SPAWN_TIMEOUT_MS`, so it could never fail
  // independently — a global-only implementation with the per-suite lookups deleted passed all
  // three of these. Match the interpolated per-suite form instead.
  assert.match(
    src,
    /\$\{prefix\}_SPAWN_TIMEOUT_MS/,
    "budget must expose a PER-SUITE timeout knob, not only the global one",
  );
  assert.match(
    src,
    /\$\{prefix\}_SPAWN_RETRIES/,
    "budget must expose a PER-SUITE retries knob, not only the global one",
  );
  assert.match(
    src,
    /TEST_SPAWN_TIMEOUT_MS/,
    "budget must expose a global TEST_SPAWN_TIMEOUT_MS",
  );
  assert.match(
    src,
    /TEST_SPAWN_RETRIES/,
    "budget must expose a global TEST_SPAWN_RETRIES",
  );
});

test("no test file hardcodes a spawn timeout — the budget is the single source", () => {
  const offenders = [];
  for (const file of testFiles()) {
    const hits = code(file).match(/\btimeout:\s*[0-9]+/g);
    if (hits)
      offenders.push(
        `${path.relative(path.join(__dirname, ".."), file)}: ${hits.join(", ")}`,
      );
  }
  assert.deepEqual(
    offenders,
    [],
    "hardcoded spawn timeout(s) found: " +
      offenders.join(" | ") +
      ". Import { spawnBudget } from the shared spawn-budget module instead — a literal chosen " +
      "against an idle machine is ~1.2x the loaded worst case, which is what bug.2 was about.",
  );
});

/* ------------------------------------------------------------------------ *
 * Tests for the detector itself.
 *
 * The guards above are only worth their runtime if `commandsIn`/`boundsIn` actually recognise a
 * runner. A first version of this file split on the literal string `node --test`, which silently
 * failed to see `node --experimental-vm-modules --test` and `node  --test` — both of which would
 * have shipped an unbounded runner past a green suite, i.e. the guard would have passed on the
 * exact regression it is named after. These cases pin the detector so that cannot recur.
 * ------------------------------------------------------------------------ */

test("the runner detector sees node --test however the flags are arranged", () => {
  for (const body of [
    "node --test 'tests/*.test.js'",
    "node --experimental-vm-modules --test 'tests/*.test.js'",
    "node  --test 'tests/*.test.js'",
    "NODE_OPTIONS=--no-warnings node --test 'tests/*.test.js'",
    "node --test-concurrency=4 --test 'tests/*.test.js'",
    "bash a.sh && node --test 'tests/*.test.js'",
  ]) {
    assert.ok(
      commandsIn(body).some(isRunnerCommand),
      `not detected as a runner: ${body}`,
    );
  }
});

test("the runner detector ignores commands that only look like runners", () => {
  for (const body of [
    "bash shared/resources/resolve-platform.test.sh",
    'for s in x/; do node evals/shared/runner.mjs "$s" || exit 1; done',
    "node scripts/build.mjs",
  ]) {
    assert.ok(
      !commandsIn(body).some(isRunnerCommand),
      `wrongly detected as a runner: ${body}`,
    );
  }
});

test("boundsIn reports an unbounded runner whatever its flag order", () => {
  for (const body of [
    "node --test 'x'",
    "node --experimental-vm-modules --test 'x'",
    "node  --test 'x'",
  ]) {
    assert.deepEqual(
      boundsIn(body),
      [undefined],
      `should read as unbounded: ${body}`,
    );
  }
});

test("boundsIn finds the bound when the flag precedes --test", () => {
  // The split-on-`node --test` version consumed the very flag it was looking for and reported a
  // correctly-bounded script as unbounded.
  assert.deepEqual(boundsIn('node --test-concurrency=4 --test "x"'), [
    { envVar: undefined, value: 4 },
  ]);
  assert.deepEqual(
    boundsIn('node --test-concurrency="${TEST_CONCURRENCY:-4}" --test "x"'),
    [{ envVar: "TEST_CONCURRENCY", value: 4 }],
  );
});

test("boundsIn reports one entry per runner, so a bounded script cannot hide an unbounded one", () => {
  const mixed = "node --test-concurrency=4 --test 'a' && node --test 'b'";
  assert.deepEqual(boundsIn(mixed), [
    { envVar: undefined, value: 4 },
    undefined,
  ]);
});

test("comment stripping never deletes executable source", () => {
  // Three separate ways a naive stripper gets this wrong, all of which shipped at some point:
  //   1. a `/*` inside a line comment opening a phantom block that runs to the next close marker;
  //   2. a regex literal ending in an escaped slash putting a literal `//` into the source, so the
  //      rest of that line is read as a comment and deleted;
  //   3. a quote inside a character class opening a pseudo-string, so every comment up to the next
  //      quote is PRESERVED and then read as code.
  const tmp = path.join(os.tmpdir(), `spawn-guard-${process.pid}.mjs`);
  // The literals are assembled rather than written out, so this fixture does not itself trip the
  // hardcode scan above — which reads every test file, this one included. Exempting the guard from
  // its own rule is how the rule stops being checkable.
  const inCode = 20000;
  const inComment = 30000;
  fs.writeFileSync(
    tmp,
    [
      "// a note mentioning `skills/*/references/` in prose",
      `const r = spawnSync('bash', [], { timeout: ${inCode} });`,
      `/* a real block comment with timeout: ${inComment} inside */`,
      "const u = 'https://example.com/a//b';",
      `const slash = s.replace(/\\//g, ""); const q = { timeout: ${inCode} };`,
      "const cls = /['\"]/;",
      `// pseudo-string bait: timeout: ${inComment}`,
      // An escaped quote inside a string: a scanner that does not honour the escape ends the string
      // early, and the stray quote then opens another one that runs on and swallows what follows.
      "const esc = 'it\\'s fine';",
      `// escaped-quote bait: timeout: ${inComment}`,
      // A NESTED template inside a `${}` substitution. A scanner that treats a backtick as a plain
      // quote closes the outer template on the inner one's opening backtick, then reads the inner
      // template's contents as code — so a URL, a glob or a `//` inside it starts a comment and
      // deletes the rest of the line, to EOF for a `/*`.
      `const url = \`run \${ \`https://host/x\` } now\`; const v = { timeout: ${inCode} };`,
      `const glob = \`\${ \`skills/*/references\` }\`; const w = { timeout: ${inCode} };`,
      // A backtick inside a quoted string inside a substitution: same desync, but the stray quote
      // then runs on and swallows a later, unrelated line.
      'const tick = `x${ "`" }y`;',
      'const later = "http://a";',
      `// substitution bait: timeout: ${inComment}`,
      // A lone `\r` (classic-Mac line ending) terminates a line comment in JS. A scanner that
      // breaks only on `\n` runs the comment on and eats the code after it.
      `const cr = 1;\r// cr bait: timeout: ${inComment}\rconst y = { timeout: ${inCode} };`,
    ].join("\n"),
  );
  try {
    const stripped = code(tmp);
    // BOTH executable occurrences must survive: the plain one, and the one sharing a line with a
    // regex literal. Deleting code is the dangerous direction — the scan then cannot see a real
    // hardcoded timeout, and the guard passes on the regression it exists to catch.
    assert.equal(
      (stripped.match(new RegExp(`timeout: ${inCode}`, "g")) || []).length,
      5,
      "executable source was deleted by comment stripping",
    );
    // NEITHER comment occurrence may survive: the block comment, or the line comment after a regex
    // literal containing a quote.
    assert.doesNotMatch(
      stripped,
      new RegExp(`timeout: ${inComment}`),
      "a comment survived stripping and would be reported as a hardcoded timeout",
    );
    assert.match(
      stripped,
      /example\.com/,
      "a URL's // ate the rest of its line",
    );
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test("the spawn budget honours 0 retries and the full precedence ladder", async () => {
  const { spawnBudget } =
    await import("../shared/resources/tests/spawn-budget.mjs");
  const withEnv = (env, fn) => {
    const saved = {};
    for (const [k, v] of Object.entries(env)) {
      saved[k] = process.env[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      return fn();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
  const clean = {
    P_SPAWN_TIMEOUT_MS: undefined,
    P_SPAWN_RETRIES: undefined,
    TEST_SPAWN_TIMEOUT_MS: undefined,
    TEST_SPAWN_RETRIES: undefined,
  };

  // 0 retries is the only way to say "do not retry" and must survive.
  assert.equal(
    withEnv({ ...clean, P_SPAWN_RETRIES: "0" }, () => spawnBudget("P").retries),
    0,
  );
  // A set-but-empty specific var is the normal shape of an unset CI input; it must not mask the
  // global one by falling straight to the hardcoded default.
  assert.equal(
    withEnv(
      { ...clean, P_SPAWN_TIMEOUT_MS: "", TEST_SPAWN_TIMEOUT_MS: "123000" },
      () => spawnBudget("P").timeoutMs,
    ),
    123000,
  );
  assert.equal(
    withEnv(
      { ...clean, P_SPAWN_TIMEOUT_MS: "abc", TEST_SPAWN_TIMEOUT_MS: "123000" },
      () => spawnBudget("P").timeoutMs,
    ),
    123000,
  );
  // Specific still wins when it is valid.
  assert.equal(
    withEnv(
      {
        ...clean,
        P_SPAWN_TIMEOUT_MS: "90000",
        TEST_SPAWN_TIMEOUT_MS: "123000",
      },
      () => spawnBudget("P").timeoutMs,
    ),
    90000,
  );
  // A timeout of 0 means "no timeout" to spawnSync, which is not a budget — fall back.
  assert.equal(
    withEnv(
      { ...clean, P_SPAWN_TIMEOUT_MS: "0" },
      () => spawnBudget("P").timeoutMs,
    ),
    60000,
  );
});

test("runnerScripts itself recognises every runner form", () => {
  // Pins the REAL function, not a re-declared copy of its predicate. The previous version of these
  // tests exercised a local copy, so reverting runnerScripts to the old literal `node --test` match
  // changed nothing observable on this repo and the mutant survived a green suite.
  const detected = runnerScripts({
    plain: "node --test 'a'",
    flagged: "node --experimental-vm-modules --test 'a'",
    doubleSpace: "node  --test 'a'",
    chained: "bash x.sh && node --test 'a'",
    notARunner: "node scripts/build.mjs",
    alsoNot: "bash shared/resources/resolve-platform.test.sh",
    reporterOnly: "node --test-reporter=spec x.mjs",
  }).map(([name]) => name);
  assert.deepEqual(detected.sort(), [
    "chained",
    "doubleSpace",
    "flagged",
    "plain",
  ]);
});

test("the spawn budget rejects values that are not integers", async () => {
  const { spawnBudget } =
    await import("../shared/resources/tests/spawn-budget.mjs");
  const timeoutFor = (v) => {
    const saved = process.env.Q_SPAWN_TIMEOUT_MS;
    process.env.Q_SPAWN_TIMEOUT_MS = v;
    try {
      return spawnBudget("Q").timeoutMs;
    } finally {
      if (saved === undefined) delete process.env.Q_SPAWN_TIMEOUT_MS;
      else process.env.Q_SPAWN_TIMEOUT_MS = saved;
    }
  };
  // "0x10" would otherwise become a 16 ms budget that kills every child.
  for (const v of ["0x10", "1.5", "1e3", " +5 ", "Infinity", "abc"]) {
    assert.equal(
      timeoutFor(v),
      60000,
      `${v} should not be accepted as a timeout`,
    );
  }
  assert.equal(
    timeoutFor("90000"),
    90000,
    "a plain integer must still be accepted",
  );
});
