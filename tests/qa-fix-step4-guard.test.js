"use strict";

/**
 * qa-fix Step 4 — the untracked-files guard (task.268, QA cycle 2).
 *
 * The guard is a fenced bash block that refuses on repository state, so the probe engine's `fence:`
 * form is the harness: it substitutes the {changed-paths} slot with each case's input and runs the
 * block under bash and zsh. The cycle-1 version tested for an unfilled slot with the slot's own text
 * in its `case` pattern; substitution rewrote that copy too, so a FILLED slot always halted. Every
 * hostile case alone passes that bug (they are refused for the wrong reason), which is why the
 * legitimate case is the one that matters here: a control that rejects everything is `inert`.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENGINE = path.join(ROOT, "shared", "resources", "security-probe.mjs");
const ENTRY = "fence:skills/qa-fix/SKILL.md#Step 4: Validate";

// A bare repository the block's `git ls-files` can read: HEAD plus empty objects/ and refs/.
const GIT = {
  ".git/HEAD": "ref: refs/heads/main\n",
  ".git/objects/.keep": "",
  ".git/refs/.keep": "",
};
const BRACE_REFUSAL =
  "HALT: CHANGED_PATHS is empty or still holds a brace — substitute the paths this fix touched\n";

const MISSING_HEAD =
  "HALT: these changed paths are neither on disk nor tracked — a mistyped path lists nothing and would read as clean:\n";
const QUOTE_REFUSAL =
  "HALT: a changed path holds a backslash, single quote or double quote — xargs reads those as syntax and would judge a different path\n";
const BOUNDARY_REFUSAL =
  'HALT: these changed paths sit below a symlink or a nested repository — the untracked listing cannot look through either, so "nothing listed" would read as clean:\n';

const CASES = [
  {
    id: "empty",
    input: "",
    why: "empty slot",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "unfilled",
    input: "{changed-paths}",
    why: "slot left in",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "brace",
    input: "a{b",
    why: "brace in a path",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "untracked",
    input: "newdir",
    why: "an untracked file under the changed paths",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "newdir/new.txt": "x\n" } },
    expected: {
      stdout:
        "untracked files under the changed paths — stage them first:\nnewdir/new.txt\n",
      exit: 1,
    },
  },
  {
    id: "blank",
    input: "   ",
    why: "whitespace-only slot",
    correct: "refused",
    direction: "hostile",
    expected: { stdout: BRACE_REFUSAL, exit: 1 },
  },
  {
    id: "multi-second-untracked",
    input: "ignored newdir",
    why: "two paths, the untracked file under the second (zsh does not word-split a bare variable)",
    correct: "refused",
    direction: "hostile",
    fixture: {
      files: {
        ...GIT,
        ".gitignore": "ignored/\n",
        "ignored/x": "x\n",
        "newdir/new.txt": "x\n",
      },
    },
    expected: {
      stdout:
        "untracked files under the changed paths — stage them first:\nnewdir/new.txt\n",
      exit: 1,
    },
  },
  {
    id: "missing-path",
    input: "nosuchdir",
    why: "a mistyped path lists nothing and would read as clean",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "other/x": "x\n" } },
    expected: {
      stdout:
        "HALT: these changed paths are neither on disk nor tracked — a mistyped path lists nothing and would read as clean:\nnosuchdir\n",
      exit: 1,
    },
  },
  {
    id: "magic-pathspec-dir",
    input: ":(exclude)newdir newdir",
    why: "a path named like an exclude pathspec must be matched literally, not hide newdir",
    correct: "refused",
    direction: "hostile",
    fixture: {
      files: { ...GIT, ":(exclude)newdir/g": "x\n", "newdir/new.txt": "x\n" },
    },
    expected: {
      stdout:
        "untracked files under the changed paths — stage them first:\n:(exclude)newdir/g\nnewdir/new.txt\n",
      exit: 1,
    },
  },
  // T268-QA-10: the slot is substituted as TEXT, so a path holding shell syntax must reach the block
  // as data. Each case asserts the marker file it would create stays absent AND that the guard
  // refuses for the named reason (a path that merely does not exist), not because the shell ran it.
  {
    id: "meta-substitution",
    input: "$(touch pwned)",
    why: "a command substitution in a path must not run",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "other/x": "x\n" } },
    expected: {
      stdout: MISSING_HEAD + "$(touch\npwned)\n",
      exit: 1,
      absent: ["pwned"],
    },
  },
  {
    id: "meta-backtick",
    input: "`touch pwned2`",
    why: "a backtick substitution in a path must not run",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "other/x": "x\n" } },
    expected: {
      stdout: MISSING_HEAD + "`touch\npwned2`\n",
      exit: 1,
      absent: ["pwned2"],
    },
  },
  {
    id: "meta-variable",
    input: "$HOME/x",
    why: "a variable reference in a path must reach the guard literally, not expanded",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "other/x": "x\n" } },
    expected: { stdout: MISSING_HEAD + "$HOME/x\n", exit: 1 },
  },
  // xargs (no -0) reads quotes and backslashes as syntax: an unmatched quote fails loudly, but a
  // trailing backslash is silently consumed, so `a\` is judged as `a` and an untracked `a\` reads clean.
  {
    id: "backslash-mutation",
    input: "a\\",
    why: "a path ending in a backslash is judged as a different path by xargs",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, ".gitignore": "a\n", a: "x\n", "a\\": "x\n" } },
    expected: { stdout: QUOTE_REFUSAL, exit: 1 },
  },
  {
    id: "single-quote",
    input: "a'b",
    why: "a single quote in a path is syntax to xargs",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "other/x": "x\n" } },
    expected: { stdout: QUOTE_REFUSAL, exit: 1 },
  },
  {
    id: "double-quote",
    input: 'a"b',
    why: "a double quote in a path is syntax to xargs",
    correct: "refused",
    direction: "hostile",
    fixture: { files: { ...GIT, "other/x": "x\n" } },
    expected: { stdout: QUOTE_REFUSAL, exit: 1 },
  },
  // T268-QA-11: the untracked listing cannot look below a nested repository, so "nothing listed" is
  // "could not look", not "clean". (A symlinked directory needs a real symlink, which a fixture file
  // cannot be: it is held by the direct-runner tests below.)
  {
    id: "nested-repo",
    input: "inner/f",
    why: "a path below a nested repository lists nothing and would read as clean",
    correct: "refused",
    direction: "hostile",
    fixture: {
      files: {
        ...GIT,
        "inner/.git/HEAD": "ref: refs/heads/main\n",
        "inner/.git/objects/.keep": "",
        "inner/.git/refs/.keep": "",
        "inner/f": "x\n",
      },
    },
    expected: { stdout: BOUNDARY_REFUSAL + "inner/f\n", exit: 1 },
  },
  {
    id: "multi-clean",
    input: "ignored ignored2",
    why: "two filled paths with nothing untracked are admitted",
    correct: "admitted",
    direction: "legitimate",
    fixture: {
      files: {
        ...GIT,
        ".gitignore": "ignored/\nignored2/\n",
        "ignored/x": "x\n",
        "ignored2/x": "x\n",
      },
    },
  },
  {
    id: "filled-clean",
    input: "ignored",
    why: "a filled slot with nothing untracked is admitted",
    correct: "admitted",
    direction: "legitimate",
    fixture: {
      files: { ...GIT, ".gitignore": "ignored/\n", "ignored/x": "x\n" },
    },
  },
].map((c) => ({ sink: "filename", ...c }));

function probe(skillFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-step4-"));
  try {
    const casesFile = path.join(dir, "cases.json");
    fs.writeFileSync(casesFile, JSON.stringify(CASES));
    const args = [
      ENGINE,
      "--sink",
      "filename",
      "--entry",
      ENTRY.replace("skills/qa-fix/SKILL.md", skillFile),
      "--slot",
      "{changed-paths}",
      "--cases-file",
      casesFile,
      "--repo-root",
      ROOT,
      "--json",
    ];
    const r = spawnSync(process.execPath, args, { encoding: "utf8" });
    return JSON.parse(r.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("Step 4 guard: hostile slots are refused, a filled clean slot is admitted (bash and zsh)", () => {
  const out = probe("skills/qa-fix/SKILL.md");
  assert.equal(
    out.reason,
    "hostile-rejected-legitimate-accepted",
    JSON.stringify(out.cases),
  );
  assert.ok(out.cases.length >= CASES.length, "every case ran");
});

// Each mutant reverts one fix to the shape that shipped broken. The probe must stop reading
// "engages" for it. The mutant lives under the repo root so the engine's --repo-root containment
// accepts it, and is removed in a finally.
const SKILL_SRC = fs.readFileSync(
  path.join(ROOT, "skills", "qa-fix", "SKILL.md"),
  "utf8",
);
const MUTANTS = [
  {
    name: "the cycle-1 bug: the unfilled-slot test repeats the slot text",
    from: '*"{"*|*"}"*)',
    to: '*"{changed-paths}"*)',
  },
  {
    name: "the cycle-3 bug: an unquoted expansion, which zsh does not word-split",
    from: "printf '%s\\n' \"$CHANGED_PATHS\" | tr -s ' \\t' '\\n\\n' | grep -v '^$' | xargs git --literal-pathspecs ls-files --others --exclude-standard --",
    to: "git --literal-pathspecs ls-files --others --exclude-standard -- $CHANGED_PATHS",
  },
  {
    name: "the cycle-4 bug: pathspec magic is interpreted, not matched literally",
    from: "xargs git --literal-pathspecs ls-files",
    to: "xargs git ls-files",
  },
  {
    name: "the cycle-4 bug: a nonexistent path reads as clean",
    from: '[ -z "$MISSING" ]',
    to: '[ -z "" ]',
  },
  {
    name: "T268-QA-10: the slot is substituted into a double-quoted assignment, so the shell runs it",
    from: "IFS= read -r -d '' CHANGED_PATHS <<'QA_FIX_CHANGED_PATHS_END' || true\n{changed-paths}\nQA_FIX_CHANGED_PATHS_END",
    to: 'CHANGED_PATHS="{changed-paths}"',
  },
  {
    name: "task 285: backslashes and quotes reach xargs, which reads them as syntax",
    from: String.raw`*\\*|*\'*|*\"*)`,
    to: '*"@never-matches@"*)',
  },
  {
    name: "T268-QA-11: a nested repository is not refused, so nothing listed reads as clean",
    from: '|| [ -e "$d/.git" ]',
    to: "|| false",
  },
];

for (const m of MUTANTS) {
  test(`Step 4 guard: caught when reverted to ${m.name}`, () => {
    assert.ok(SKILL_SRC.includes(m.from), "the line under mutation is present");
    const src = SKILL_SRC.replace(m.from, m.to);
    assert.notEqual(src, SKILL_SRC, "the mutation applied");
    const rel = path.join("tests", `.qa-fix-step4-mutant-${process.pid}.md`);
    const mutantPath = path.join(ROOT, rel);
    fs.writeFileSync(mutantPath, src);
    try {
      const out = probe(rel);
      assert.notEqual(
        out.reason,
        "hostile-rejected-legitimate-accepted",
        "the mutant must not read as engaging",
      );
      assert.ok(out.cases.length > 0, "the mutant was probed: " + out.reason);
    } finally {
      fs.rmSync(mutantPath, { force: true });
    }
  });
}

test("Step 4 guard: fails closed when git cannot look (not a repository)", () => {
  const noRepo = [
    {
      ...CASES.find((c) => c.id === "filled-clean"),
      id: "no-repo",
      direction: "hostile",
      correct: "refused",
      input: "ignored",
      fixture: { files: { "ignored/x": "x\n" } },
      expected: {
        stdout:
          "HALT: git ls-files could not look (not a repository, or a bad path) — not treating that as clean\n",
        exit: 1,
      },
    },
  ];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-step4-nr-"));
  try {
    const casesFile = path.join(dir, "cases.json");
    fs.writeFileSync(casesFile, JSON.stringify([...noRepo]));
    const r = spawnSync(
      process.execPath,
      [
        ENGINE,
        "--sink",
        "filename",
        "--entry",
        ENTRY,
        "--slot",
        "{changed-paths}",
        "--cases-file",
        casesFile,
        "--repo-root",
        ROOT,
        "--json",
      ],
      { encoding: "utf8" },
    );
    const out = JSON.parse(r.stdout);
    const refused = out.cases.filter((c) => c.id === "no-repo");
    assert.ok(
      refused.length > 0 && refused.every((c) => c.outcome === "rejected"),
      JSON.stringify(out.cases),
    );
    // `rejected` with an `expected` means the stdout matched it exactly (a mismatch scores
    // `accepted` with a detail), so these pin the REASON: the "could not look" refusal, exit 1.
    assert.ok(
      refused.every((c) => c.detail === null && c.exit === 1),
      JSON.stringify(refused),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------
// Direct runs: cases a fence: fixture cannot express. `fixture.files` writes regular files only,
// so a symlink, a real index (tracked, deleted-tracked, intent-to-add) and an absolute path cannot
// be fixtures. The block is run under each shell in a throwaway real repository instead.

const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"]).status === 0 ? ["zsh"] : []),
];
const NO_RC = { bash: ["--noprofile", "--norc"], zsh: ["-f"] };

async function stepBlock(src) {
  const { extractFencedBlock } = await import(
    require("node:url").pathToFileURL(ENGINE).href
  );
  const r = extractFencedBlock(src, "Step 4: Validate");
  assert.ok(r.ok, r.detail);
  return r.code;
}

function git(cwd, ...args) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: cwd,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    },
  });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
}

// `setup(dir)` builds the repository; `input(dir)` is the slot text. Returns one result per shell.
function runDirect(block, setup, input, cwdOf = (d) => d) {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "qa-fix-step4-d-")),
  );
  try {
    git(dir, "init", "-q");
    setup(dir);
    const script = block.replaceAll("{changed-paths}", () => input(dir));
    return SHELLS.map((shell) => {
      const r = spawnSync(shell, [...NO_RC[shell], "-c", script], {
        cwd: cwdOf(dir),
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          HOME: dir,
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          LC_ALL: "C",
        },
      });
      return { shell, status: r.status, stdout: r.stdout };
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(dir + "-link", { force: true }); // the symlinked-prefix scenario's link, outside dir
  }
}

const write = (dir, rel, content = "x\n") => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
};

const ADMITTED = [
  {
    id: "tracked",
    setup: (d) => {
      write(d, "t.txt");
      git(d, "add", "t.txt");
    },
    input: () => "t.txt",
  },
  {
    // On disk: no. In the index: yes. Only `--error-unmatch` tells this from a mistyped path.
    id: "deleted-tracked",
    setup: (d) => {
      write(d, "t.txt");
      git(d, "add", "t.txt");
      fs.rmSync(path.join(d, "t.txt"));
    },
    input: () => "t.txt",
  },
  {
    id: "intent-to-add",
    setup: (d) => {
      write(d, "n.txt");
      git(d, "add", "-N", "n.txt");
    },
    input: () => "n.txt",
  },
  {
    // The walk must stop at the repository root: an absolute path's parents above it include the
    // root's own `.git`, which is not a nested repository.
    id: "absolute-inside-repo",
    setup: (d) => {
      write(d, "sub/f");
      git(d, "add", "sub/f");
    },
    input: (d) => path.join(d, "sub", "f"),
  },
  {
    // T285-QA-1: run from a subdirectory, a path that climbs out with `..` reaches the root through
    // text that never equals the root's path. The walk must compare physical paths.
    id: "dotdot-from-subdirectory",
    setup: (d) => {
      write(d, "real/g");
      write(d, "a/b");
      git(d, "add", "real/g", "a/b");
    },
    cwd: (d) => path.join(d, "a"),
    input: () => "../real/g",
  },
  {
    // T285-QA-1: an absolute path that reaches the repository through a symlinked prefix.
    id: "symlinked-prefix",
    setup: (d) => {
      write(d, "sub/f");
      git(d, "add", "sub/f");
      fs.symlinkSync(d, d + "-link");
    },
    input: (d) => path.join(d + "-link", "sub", "f"),
  },
];

for (const c of ADMITTED) {
  test(`Step 4 guard: admits ${c.id}`, async () => {
    const block = await stepBlock(SKILL_SRC);
    for (const r of runDirect(block, c.setup, c.input, c.cwd)) {
      assert.deepEqual(
        [r.status, r.stdout],
        [0, ""],
        `${r.shell}: ${r.stdout}`,
      );
    }
  });
}

test("Step 4 guard: refuses a path below a symlinked directory, naming it", async () => {
  const block = await stepBlock(SKILL_SRC);
  const results = runDirect(
    block,
    (d) => {
      write(d, "real/f");
      fs.symlinkSync("real", path.join(d, "link"));
    },
    () => "link/f",
  );
  for (const r of results) {
    assert.deepEqual(
      [r.status, r.stdout],
      [1, BOUNDARY_REFUSAL + "link/f\n"],
      r.shell,
    );
  }
});

// T285-QA-2: a symlink inside the repository that points back at the root resolves to $TOP. Stopping
// the walk there read `rootlink/real/new` (untracked) as clean, because `ls-files` lists nothing
// through a symlink.
const ROOTLINK = {
  setup: (d) => {
    write(d, "real/tracked");
    git(d, "add", "real/tracked");
    write(d, "real/new");
    fs.symlinkSync(".", path.join(d, "rootlink"));
  },
  input: () => "rootlink/real/new",
};

test("Step 4 guard: refuses a path through a symlink that points at the repository root", async () => {
  const block = await stepBlock(SKILL_SRC);
  for (const r of runDirect(block, ROOTLINK.setup, ROOTLINK.input)) {
    assert.deepEqual(
      [r.status, r.stdout],
      [1, BOUNDARY_REFUSAL + "rootlink/real/new\n"],
      r.shell,
    );
  }
});

// Mutants for what a fence: fixture cannot reach. Each reverts one clause; the named scenario must
// stop reading as it did, or the clause is held by nothing.
const DIRECT_MUTANTS = [
  {
    name: "the --error-unmatch branch (a deleted tracked path reads as mistyped)",
    from: 'git --literal-pathspecs ls-files --error-unmatch -- "$p" >/dev/null 2>&1',
    to: "false",
    scenario: ADMITTED.find((c) => c.id === "deleted-tracked"),
    broken: (r) => r.status !== 0,
  },
  {
    name: "the in-repository symlink check at the root stop (a symlink to the root reads as clean)",
    from: `case "$PP/" in "$TOP"/*) printf '%s\\n' "$p" ;; esac`,
    to: ":",
    scenario: ROOTLINK,
    broken: (r) => r.status === 0,
  },
  {
    name: "the symlink clause (a path below a symlinked directory reads as clean)",
    from: '[ -L "$d" ] ||',
    to: "false ||",
    scenario: {
      setup: (d) => {
        write(d, "real/f");
        fs.symlinkSync("real", path.join(d, "link"));
      },
      input: () => "link/f",
    },
    broken: (r) => r.status === 0,
  },
  {
    name: "the repository-root stop (an absolute path inside the repo reads as a nested repo)",
    from: 'if [ -n "$PHYS" ] && [ "$PHYS" = "$TOP" ]; then',
    to: "if false; then",
    scenario: ADMITTED.find((c) => c.id === "absolute-inside-repo"),
    broken: (r) => r.status !== 0,
  },
  {
    // T285-QA-1: comparing the path text instead of the physical path refuses `..` and a symlinked
    // prefix, because neither is spelled like the root.
    name: "the physical comparison (a path reaching the root through `..` reads as a nested repo)",
    from: '[ "$PHYS" = "$TOP" ]',
    to: '[ "$d" = "$TOP" ]',
    scenario: ADMITTED.find((c) => c.id === "dotdot-from-subdirectory"),
    broken: (r) => r.status !== 0,
  },
  {
    name: "the physical comparison (a symlinked prefix reads as a nested repo)",
    from: '[ "$PHYS" = "$TOP" ]',
    to: '[ "$d" = "$TOP" ]',
    scenario: ADMITTED.find((c) => c.id === "symlinked-prefix"),
    broken: (r) => r.status !== 0,
  },
];

for (const m of DIRECT_MUTANTS) {
  test(`Step 4 guard: caught when the clause is reverted — ${m.name}`, async () => {
    assert.ok(SKILL_SRC.includes(m.from), "the line under mutation is present");
    const src = SKILL_SRC.replace(m.from, () => m.to);
    assert.notEqual(src, SKILL_SRC, "the mutation applied");
    const results = runDirect(
      await stepBlock(src),
      m.scenario.setup,
      m.scenario.input,
      m.scenario.cwd,
    );
    assert.ok(
      results.every(m.broken),
      "the mutant must change the outcome: " + JSON.stringify(results),
    );
  });
}
