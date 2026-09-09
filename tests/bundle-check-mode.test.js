"use strict";
/**
 * Bundler `--check` — the per-file freshness assertion regenerate-and-diff cannot make.
 *
 * `validate.yml` asserts freshness by running the bundler and diffing the tree.
 * That is effective for everything the bundler WRITES, and structurally blind to
 * everything it does not — which is not a hypothetical set. On the first run of
 * this check against the real repo it found a live instance:
 * `skills/create-skill/references/skill-dependencies.json` was 44 bytes behind
 * its source, the bundler refused to write it ("not bundler output, left alone"),
 * and regenerate-and-diff had therefore been green over a stale copy.
 *
 * Four classes are invisible to regenerate-and-diff, and each has a test below:
 *
 *   ORPHANED    the source was deleted; the copy keeps a banner naming a file
 *               that no longer exists, and nothing ever writes it again
 *   SYMLINK     `writable_copy` refuses to write through a link, so the copy is
 *               never diffed — and a consumer copying the directory gets a
 *               dangling link
 *   AMBIGUOUS   an authored file sharing a name with a shared resource; the
 *               bundler correctly leaves it alone and therefore never reports it
 *   MISDECLARED the banner names a path other than the one the file occupies
 *
 * WHAT THESE TESTS ARE CAREFUL ABOUT
 * ----------------------------------
 * Task 86's `--check` attempt ran five QA cycles and ~45 findings, several of
 * which were tests that passed for the wrong reason. The four specific traps it
 * recorded are avoided here deliberately:
 *
 *   1. **A fixture that produces a second problem class** keeps a bucket
 *      non-empty and makes the assertion pass for the wrong reason. Every test
 *      below asserts on the FULL problem set for its fixture — `classesFound`
 *      is compared with deepEqual, not with `includes` — so a stray second class
 *      fails the test instead of propping it up.
 *   2. **Asserting on whole stdout** breaks because the summary block lists the
 *      class names it counted. Every assertion here parses the per-problem lines
 *      (`  CLASS  references/path — detail`) and ignores the summary, so
 *      "class X was NOT reported" is actually assertable.
 *   3. **Testing the reconciliation path only.** The gate has two inbound paths —
 *      a file discovery reaches (named by the skill's own text) and a file only
 *      disk reconciliation reaches. Both are exercised.
 *   4. **A byte-bounded banner search** misses a banner that sits after YAML
 *      frontmatter — measured at char 499 in a real file. The long-frontmatter
 *      test below pins the line-based window.
 *
 * Run: node --test tests/bundle-check-mode.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const BUNDLER = path.join(
  REPO_ROOT,
  "skills",
  "create-skill",
  "scripts",
  "bundle_skill.py",
);

const SKILL_MD_HEAD = `---
name: fixture-skill
description: Fixture skill used by the bundler --check regression test.
---

# Fixture Skill
`;

const BANNER = (name) =>
  `<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/${name}. ` +
  `Regenerate via \`npm run bundle\`. -->\n`;

/**
 * A disposable repo with one skill plus a shared/resources tree.
 *
 * A real temp repo, and the real bundler run as a subprocess: the assertions are
 * about observed behaviour rather than a re-implementation of the classifier.
 */
function makeFixture({ skillFiles = {}, sharedFiles = {}, refsFiles = {} }, t) {
  if (!t || typeof t.after !== "function") {
    throw new Error("makeFixture requires the test context `t` for cleanup");
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-check-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, "skills"), { recursive: true });
  fs.mkdirSync(path.join(root, "shared", "resources"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"fixture"}\n');

  const skillDir = path.join(root, "skills", "fixture-skill");
  fs.mkdirSync(skillDir, { recursive: true });

  const writeAll = (base, files) => {
    for (const [rel, content] of Object.entries(files)) {
      const dest = path.join(base, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
    }
  };
  writeAll(skillDir, skillFiles);
  writeAll(path.join(root, "shared", "resources"), sharedFiles);
  writeAll(path.join(skillDir, "references"), refsFiles);

  const runRaw = (argv) => {
    try {
      return {
        status: 0,
        stdout: execFileSync("python3", [BUNDLER, ...argv], {
          encoding: "utf-8",
        }),
      };
    } catch (e) {
      if (e.status == null) throw e;
      return { status: e.status, stdout: (e.stdout || "") + (e.stderr || "") };
    }
  };

  /**
   * Run `--check` and parse the PER-PROBLEM lines only.
   *
   * The summary block deliberately names every class it counted, so a test that
   * greps whole stdout for a class name matches the explainer and passes for the
   * wrong reason. Parsing structured lines is what makes a negative assertion
   * ("AMBIGUOUS was not reported") mean anything.
   */
  const check = (argv = []) => {
    const res = runRaw(["--check", skillDir, ...argv]);
    const problems = [];
    for (const line of res.stdout.split("\n")) {
      const m = line.match(
        /^ {2}([A-Z]+(?: [A-Z]+)*) {2,}references\/(\S+) — (.*)$/,
      );
      if (m) problems.push({ klass: m[1], rel: m[2], detail: m[3] });
    }
    return {
      status: res.status,
      stdout: res.stdout,
      problems,
      classesFound: [...new Set(problems.map((p) => p.klass))].sort(),
      relsFound: problems.map((p) => p.rel).sort(),
    };
  };

  return {
    root,
    skillDir,
    check,
    bundle: () =>
      execFileSync("python3", [BUNDLER, skillDir], { encoding: "utf-8" }),
    refPath: (name) => path.join(skillDir, "references", name),
    readRef: (name) =>
      fs.readFileSync(path.join(skillDir, "references", name), "utf-8"),
    refExists: (name) => fs.existsSync(path.join(skillDir, "references", name)),
    writeShared: (name, content) =>
      fs.writeFileSync(path.join(root, "shared", "resources", name), content),
    rmShared: (name) =>
      fs.rmSync(path.join(root, "shared", "resources", name), { force: true }),
    chmodShared: (name, mode) =>
      fs.chmodSync(path.join(root, "shared", "resources", name), mode),
    chmodRef: (name, mode) =>
      fs.chmodSync(path.join(skillDir, "references", name), mode),
    refMode: (name) =>
      fs.statSync(path.join(skillDir, "references", name)).mode & 0o777,
    symlinkRef: (name, target) => {
      const dest = path.join(skillDir, "references", name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.symlinkSync(target, dest);
    },
  };
}

/** A fixture whose skill text NAMES the reference — the discovery-reached path. */
const namingSkill = (name) =>
  `${SKILL_MD_HEAD}\nSee [the contract](shared/resources/${name}).\n`;

/** A fixture whose skill text names nothing — the disk-reconciliation path. */
const silentSkill = () => `${SKILL_MD_HEAD}\nNo shared references here.\n`;

/**
 * Snapshot every path under a root with its bytes and mode.
 *
 * mtime is deliberately NOT part of the snapshot: it has one-second granularity
 * on some filesystems, so a mutation-then-restore inside the same second would
 * compare equal and the read-only assertion would pass vacuously. Bytes plus
 * mode plus the path set is what actually answers "did anything change?".
 */
function snapshotTree(root) {
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        out.set(full, `symlink:${fs.readlinkSync(full)}`);
      } else if (entry.isDirectory()) {
        out.set(full, "dir");
        walk(full);
      } else {
        const st = fs.statSync(full);
        out.set(
          full,
          `${(st.mode & 0o777).toString(8)}:${fs.readFileSync(full).toString("base64")}`,
        );
      }
    }
  };
  walk(root);
  return out;
}

// ---------------------------------------------------------------------------
// The four classes regenerate-and-diff cannot see.
// ---------------------------------------------------------------------------

test("ORPHANED: a bundled copy whose source was deleted is reported", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fx.bundle();
  assert.equal(fx.check().problems.length, 0, "clean after a bundle run");

  // The source goes away. The copy keeps its banner and nothing ever writes it
  // again — `source_backed_on_disk` requires the source to exist, so the copy
  // leaves the bundler's population entirely.
  fx.rmShared("contract.md");

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["ORPHANED"]);
  assert.deepEqual(res.relsFound, ["contract.md"]);
  assert.equal(res.status, 1, "a problem exits non-zero");
  assert.match(res.problems[0].detail, /no longer exists/);
});

test("ORPHANED is invisible to regenerate-and-diff — the premise this check exists for", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fx.bundle();
  fx.rmShared("contract.md");

  // This is what `validate.yml` does today: bundle, then diff. Snapshot the tree
  // around a full bundle run — if nothing changes, `git diff` sees nothing, and
  // the orphan is green forever.
  const before = snapshotTree(fx.skillDir);
  fx.bundle();
  const after = snapshotTree(fx.skillDir);
  assert.deepEqual(
    [...after.entries()],
    [...before.entries()],
    "a bundle run does not touch an orphan, so regenerate-and-diff cannot see it",
  );

  // …and the check does.
  assert.deepEqual(fx.check().classesFound, ["ORPHANED"]);
});

test("SYMLINK: a symlinked reference is reported, not silently accepted", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fx.symlinkRef(
    "contract.md",
    path.join(fx.root, "shared", "resources", "contract.md"),
  );

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["SYMLINK"]);
  assert.deepEqual(res.relsFound, ["contract.md"]);

  // The link must NOT be reported MISSING. That is the whole point of testing the
  // symlink branch before `exists()`: MISSING is bucketed regenerable, and
  // `writable_copy` refuses a symlink, so the regenerate remedy could never
  // clear it — CI would go permanently red under an instruction that does nothing.
  assert.equal(
    res.problems.filter((p) => p.klass === "MISSING").length,
    0,
    "a symlink is not MISSING",
  );
});

test("AMBIGUOUS: an authored file sharing a name with a shared resource is reported, never rewritten", (t) => {
  const authored = "# Authored\n\nHand-written, not bundler output.\n";
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nShared body.\n" },
      refsFiles: { "contract.md": authored },
    },
    t,
  );

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["AMBIGUOUS"]);
  assert.deepEqual(res.relsFound, ["contract.md"]);

  // The success criterion is two-part: reported AND never rewritten.
  fx.bundle();
  assert.equal(
    fx.readRef("contract.md"),
    authored,
    "bundler left the authored file alone",
  );
  assert.deepEqual(
    fx.check().classesFound,
    ["AMBIGUOUS"],
    "and a bundle run does not clear it — which is why its remedy is not `npm run bundle`",
  );
});

test("MISDECLARED: a banner naming another path is distinguished from AMBIGUOUS", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: {
        "contract.md": "# Contract\n\nBody.\n",
        "other.md": "# Other\n\nBody.\n",
      },
      // The file sits at contract.md but its banner claims other.md — the shape a
      // moved or renamed bundled file has.
      refsFiles: {
        "contract.md": `${BANNER("other.md")}# Contract\n\nBody.\n`,
      },
    },
    t,
  );

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["MISDECLARED"]);
  assert.match(
    res.problems[0].detail,
    /banner declares shared\/resources\/other\.md/,
  );
});

// ---------------------------------------------------------------------------
// The three classes a bundle run DOES clear.
// ---------------------------------------------------------------------------

test("STALE: a bundled copy behind its source is reported", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nORIGINAL.\n" },
    },
    t,
  );
  fx.bundle();
  fx.writeShared("contract.md", "# Contract\n\nUPDATED.\n");

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["STALE"]);
  assert.deepEqual(res.relsFound, ["contract.md"]);
});

test("MISSING: a discovered reference with no bundled copy is reported", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  const res = fx.check();
  assert.deepEqual(res.classesFound, ["MISSING"]);
  assert.deepEqual(res.relsFound, ["contract.md"]);
});

test("WRONG MODE: drift is detected in BOTH directions, keyed on the source's mode", (t) => {
  // Executable source, non-executable copy.
  const fxA = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("tool.sh") },
      sharedFiles: { "tool.sh": "#!/bin/sh\necho hi\n" },
    },
    t,
  );
  fxA.chmodShared("tool.sh", 0o755);
  fxA.bundle();
  assert.equal(fxA.check().problems.length, 0);
  fxA.chmodRef("tool.sh", 0o644);
  const resA = fxA.check();
  assert.deepEqual(resA.classesFound, ["WRONG MODE"]);
  assert.match(resA.problems[0].detail, /0644 on disk, source is 0755/);

  // …and the reverse. A suffix-keyed check would miss this one entirely: `.sh`
  // "looks executable", so a 0755 copy of a 0644 source reads as correct.
  const fxB = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("tool.sh") },
      sharedFiles: { "tool.sh": "#!/bin/sh\necho hi\n" },
    },
    t,
  );
  fxB.chmodShared("tool.sh", 0o644);
  fxB.bundle();
  fxB.chmodRef("tool.sh", 0o755);
  const resB = fxB.check();
  assert.deepEqual(resB.classesFound, ["WRONG MODE"]);
  assert.match(resB.problems[0].detail, /0755 on disk, source is 0644/);
});

// ---------------------------------------------------------------------------
// Remedy correctness, verified by measurement rather than asserted.
// ---------------------------------------------------------------------------

test("every class called regenerable is cleared by a bundle run — check → bundle → check", (t) => {
  // One fixture per class rather than one shared fixture: a fixture carrying
  // three problems at once cannot show that each individual remedy works, and a
  // second class lingering in the bucket would keep the "still dirty" assertion
  // true for the wrong reason.
  const cases = {
    STALE: (fx) => {
      fx.bundle();
      fx.writeShared("contract.md", "# Contract\n\nUPDATED.\n");
    },
    MISSING: () => {},
    "WRONG MODE": (fx) => {
      fx.bundle();
      fx.chmodRef("contract.md", 0o600);
    },
  };

  for (const [klass, dirty] of Object.entries(cases)) {
    const fx = makeFixture(
      {
        skillFiles: { "SKILL.md": namingSkill("contract.md") },
        sharedFiles: { "contract.md": "# Contract\n\nORIGINAL.\n" },
      },
      t,
    );
    dirty(fx);

    assert.deepEqual(
      fx.check().classesFound,
      [klass],
      `${klass}: fixture is dirty`,
    );
    fx.bundle();
    assert.deepEqual(
      fx.check().classesFound,
      [],
      `${klass}: \`npm run bundle\` must actually clear the class its remedy names`,
    );
  }
});

test("no class called non-regenerable is cleared by a bundle run", (t) => {
  // The other half of remedy correctness, and the more important half: printing
  // "run npm run bundle" for a class the bundler cannot clear leaves CI red
  // under an instruction that does nothing.
  const authored = "# Authored\n\nNot bundler output.\n";
  const cases = {
    ORPHANED: (fx) => {
      fx.bundle();
      fx.rmShared("contract.md");
    },
    AMBIGUOUS: (fx) => {
      fs.writeFileSync(fx.refPath("contract.md"), authored);
    },
    SYMLINK: (fx) => {
      fx.symlinkRef(
        "contract.md",
        path.join(fx.root, "shared", "resources", "contract.md"),
      );
    },
    UNREADABLE: (fx) => {
      fx.bundle();
      const target = fx.refPath("contract.md");
      fs.chmodSync(target, 0o000);
      t.after(() => {
        try {
          fs.chmodSync(target, 0o644);
        } catch {
          /* already removed by fixture cleanup */
        }
      });
    },
  };

  for (const [klass, dirty] of Object.entries(cases)) {
    const fx = makeFixture(
      {
        skillFiles: { "SKILL.md": namingSkill("contract.md") },
        sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
      },
      t,
    );
    fs.mkdirSync(path.join(fx.skillDir, "references"), { recursive: true });
    dirty(fx);

    assert.deepEqual(
      fx.check().classesFound,
      [klass],
      `${klass}: fixture is dirty`,
    );
    fx.bundle();
    assert.deepEqual(
      fx.check().classesFound,
      [klass],
      `${klass}: a bundle run must NOT clear it — so its remedy must not say to run one`,
    );
  }
});

test("the printed remedy for a non-regenerable class does not tell the reader to re-bundle", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fx.bundle();
  fx.rmShared("contract.md");

  const { stdout } = fx.check();
  const summaryLine = stdout
    .split("\n")
    .find((l) => l.trim().startsWith("ORPHANED x"));
  assert.ok(summaryLine, "the summary names the class it counted");
  assert.doesNotMatch(
    summaryLine,
    /npm run bundle/,
    "the orphan remedy must not be the one that provably cannot clear it",
  );
});

// ---------------------------------------------------------------------------
// Read-only.
// ---------------------------------------------------------------------------

test("--check mutates nothing — not content, not mode, not the path set", (t) => {
  const fx = makeFixture(
    {
      // Deliberately dirty in several ways at once. Read-only is a property of
      // the code path, not of the fixture, so the fixture should exercise as many
      // branches as possible — including the write-adjacent ones.
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: {
        "contract.md": "# Contract\n\nUPDATED.\n",
        "extra.md": "# Extra\n\nBody.\n",
      },
      refsFiles: {
        "contract.md": `${BANNER("contract.md")}# Contract\n\nORIGINAL.\n`,
        "authored.md": "# Authored\n\nMine.\n",
      },
    },
    t,
  );

  const beforeSkill = snapshotTree(fx.skillDir);
  const beforeShared = snapshotTree(path.join(fx.root, "shared", "resources"));

  const res = fx.check();
  assert.ok(
    res.problems.length > 0,
    "the fixture is genuinely dirty — else this proves nothing",
  );

  assert.deepEqual(
    [...snapshotTree(fx.skillDir).entries()],
    [...beforeSkill.entries()],
    "--check wrote to the skill tree",
  );
  assert.deepEqual(
    [...snapshotTree(path.join(fx.root, "shared", "resources")).entries()],
    [...beforeShared.entries()],
    "--check wrote to shared/resources",
  );
});

test("--check does not create a references/ directory that did not exist", (t) => {
  // `bundle_skill` calls `refs_dir.mkdir()`. A check that shared that line would
  // leave an empty directory behind on every skill it inspected — a mutation
  // that no content snapshot of an existing tree would catch.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  assert.equal(fs.existsSync(path.join(fx.skillDir, "references")), false);
  fx.check();
  assert.equal(
    fs.existsSync(path.join(fx.skillDir, "references")),
    false,
    "--check created references/",
  );
});

// ---------------------------------------------------------------------------
// Both inbound paths, and the banner window.
// ---------------------------------------------------------------------------

test("a copy reached only by disk reconciliation is checked too", (t) => {
  // Trap 3: the gate has two inbound paths. A test that only ever names the
  // reference in SKILL.md exercises discovery and never reconciliation.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": silentSkill() },
      sharedFiles: { "contract.md": "# Contract\n\nUPDATED.\n" },
      refsFiles: {
        "contract.md": `${BANNER("contract.md")}# Contract\n\nORIGINAL.\n`,
      },
    },
    t,
  );
  const res = fx.check();
  assert.deepEqual(
    res.classesFound,
    ["STALE"],
    "nothing names it, disk finds it",
  );
  assert.deepEqual(res.relsFound, ["contract.md"]);
});

test("a banner after long YAML frontmatter is still found — the window is lines, not bytes", (t) => {
  // Trap 4: measured at char 499 in a real file, so a 512-byte slice cut the
  // marker in half and misclassified a correctly-bundled copy as hand-authored.
  const longDescription = "x".repeat(900);
  const body = `---\nname: contract\ndescription: "${longDescription}"\n---\n\n# Contract\n\nBody.\n`;
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": body },
    },
    t,
  );
  fx.bundle();

  // Sanity: the banner really is far into the file, or this test proves nothing.
  const bundled = fx.readRef("contract.md");
  assert.ok(
    bundled.indexOf("AUTO-GENERATED") > 512,
    `banner at ${bundled.indexOf("AUTO-GENERATED")} — fixture must push it past a byte window`,
  );

  assert.deepEqual(
    fx.check().classesFound,
    [],
    "a correctly-bundled copy with a late banner must not read as AMBIGUOUS",
  );
});

test("an ORPHANED file whose banner sits after long frontmatter is still found", (t) => {
  // The banner window matters in TWO places, and only one of them was covered.
  // `_looks_bundled` reads the banner through `declared_source`, and the
  // long-frontmatter test above pins that. The ORPHAN SCAN reads it through
  // `banner_declaration` — a separate function, because a non-matching banner is
  // "not provenance" to the write gate but a distinct FINDING here.
  //
  // Byte-bounding `banner_declaration` reded nothing when it was mutated: the
  // orphan fixtures were all short enough that any window found the banner, and
  // the long-frontmatter test routes through `_looks_bundled` instead. A mutation
  // that reds nothing is a statement about the tests, so this fixture exists to
  // put a LATE banner on the orphan path specifically.
  const longDescription = "x".repeat(900);
  const body = `---\nname: contract\ndescription: "${longDescription}"\n---\n\n# Contract\n\nBody.\n`;
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": body },
    },
    t,
  );
  fx.bundle();
  assert.ok(
    fx.readRef("contract.md").indexOf("AUTO-GENERATED") > 512,
    "fixture must push the banner past a byte window, or this proves nothing",
  );

  fx.rmShared("contract.md");
  assert.deepEqual(
    fx.check().classesFound,
    ["ORPHANED"],
    "the orphan scan must read the banner on a line window, not a byte window",
  );
});

test("a skill-native references/ file with no shared source and no banner is not a problem", (t) => {
  // The negative case that keeps the check usable: references/ legitimately holds
  // skill-owned files, and reporting those would make the check noise.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": silentSkill() },
      sharedFiles: {},
      refsFiles: { "skill-native.md": "# Native\n\nBelongs to this skill.\n" },
    },
    t,
  );
  const res = fx.check();
  assert.deepEqual(res.classesFound, []);
  assert.equal(res.status, 0);
});

test("a directory sitting at a needed reference name is AMBIGUOUS, not MISSING", (t) => {
  // Residual 4 from task 86: the write gate refuses a directory forever, so
  // bucketing it regenerable would print a remedy that can never clear it.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fs.mkdirSync(path.join(fx.skillDir, "references", "contract.md"), {
    recursive: true,
  });

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["AMBIGUOUS"]);
  assert.match(res.problems[0].detail, /not a regular file/);
});

// ---------------------------------------------------------------------------
// Reporting accuracy (QA cycle 1 findings).
//
// Neither of these is about DETECTION — the check found both files before the
// fix too. They are about what it then tells the reader, which for a diagnostic
// tool is the whole product.
// ---------------------------------------------------------------------------

test("a stale headerless copy names the headerless case, not `rename the authored file`", (t) => {
  // A suffix that never receives a banner cannot supply evidence 1 by
  // construction, so evidence 2 is the only test available and it fails the
  // instant the copy drifts. EVERY stale .json therefore lands in AMBIGUOUS,
  // whose generic remedy leads with "rename the authored file" — the wrong
  // action. This is the exact shape of the live defect the check found in the
  // real tree on its first run.
  const fx = makeFixture(
    {
      skillFiles: {
        "SKILL.md": `${SKILL_MD_HEAD}\nSee [data](shared/resources/data.json).\n`,
      },
      sharedFiles: { "data.json": '{"a": 1}\n' },
    },
    t,
  );
  fx.bundle();
  fs.writeFileSync(
    path.join(fx.root, "shared", "resources", "data.json"),
    '{"a": 2}\n',
  );

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["AMBIGUOUS"]);
  assert.match(
    res.problems[0].detail,
    /`\.json` files carry no provenance banner/,
    "the detail must name the reason this suffix can never prove itself",
  );
  assert.match(
    res.problems[0].detail,
    // Anchored: the detail ENDS on this phrase, and an unbounded `re-bundle`
    // would also match a longer token beginning with it — so a rename that
    // appended a suffix would keep this test green while the message changed.
    /delete it and re-bundle$/,
    "and must point at the action that actually fixes the common case",
  );
});

test("a .md AMBIGUOUS keeps the generic detail — the per-suffix branch is not a blanket rewrite", (t) => {
  // The negative half of the test above. A suffix that CAN carry a banner and
  // does not is genuinely ambiguous, and telling that reader to "delete and
  // re-bundle" would be advice to destroy their authored file.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nShared.\n" },
      refsFiles: { "contract.md": "# Authored\n\nMine.\n" },
    },
    t,
  );
  const res = fx.check();
  assert.deepEqual(res.classesFound, ["AMBIGUOUS"]);
  assert.match(res.problems[0].detail, /carries no provenance banner/);
  assert.doesNotMatch(
    res.problems[0].detail,
    /delete it and re-bundle$/,
    "never tell the owner of an authored file to delete it",
  );
});

test("an unreadable file is UNREADABLE, not AMBIGUOUS — the instrument is broken, not the file clean", (t) => {
  // `_looks_bundled` returns the same False for "read it and neither evidence
  // test passed" and "could not open it at all". Reporting the second as the
  // first asserts two facts about content nobody saw. This repository separates
  // exactly this pair elsewhere as `empty` vs `scan-broken`, for the same reason:
  // of the two readings, the reassuring one is the one that gets believed.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fx.bundle();
  const target = fx.refPath("contract.md");
  fs.chmodSync(target, 0o000);
  t.after(() => {
    try {
      fs.chmodSync(target, 0o644);
    } catch {
      /* already removed by fixture cleanup */
    }
  });

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["UNREADABLE"]);
  assert.match(res.problems[0].detail, /could not be read/);
  assert.doesNotMatch(
    res.problems[0].detail,
    /byte-identical/,
    "must not assert a comparison it could not perform",
  );
});

test("a non-UTF-8 file is NOT reported UNREADABLE — unopenable and non-text are different", (t) => {
  // The carve-out. A binary file opens fine as bytes; `_looks_bundled` has a
  // deliberate answer for it (historically reconciled), so it must fall through
  // to the byte comparison rather than being reported as a broken instrument.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("blob.md") },
      sharedFiles: {},
    },
    t,
  );
  const shared = path.join(fx.root, "shared", "resources", "blob.md");
  fs.writeFileSync(shared, Buffer.from([0xff, 0xfe, 0x00, 0x01]));
  fx.bundle();

  assert.deepEqual(
    fx.check().classesFound,
    [],
    "a correctly-bundled binary copy is clean, not UNREADABLE",
  );

  fs.writeFileSync(shared, Buffer.from([0xff, 0xfe, 0x00, 0x02]));
  assert.deepEqual(
    fx.check().classesFound,
    ["STALE"],
    "and when it drifts it is STALE — the byte comparison still runs",
  );
});

test("an orphan that is ALSO unreadable is reported — never a silent clean result", (t) => {
  // Found by the cycle-2 refute pass. The orphan scan skipped an unreadable file
  // via `if text is None: continue`, treating "could not open it" as "it makes no
  // provenance claim" — so this fixture reported `0 problems`. A clean result
  // produced by a failed read, in the one check whose entire purpose is to make
  // invisible staleness visible.
  //
  // Cycle 1 fixed this exact conflation in the main loop and did not carry it
  // twenty lines down into the orphan scan. The symptom of the incompleteness was
  // a green tick, which is why it survived a passing suite.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  fx.bundle();
  fx.rmShared("contract.md"); // now an orphan — and out of `expected`
  const target = fx.refPath("contract.md");
  fs.chmodSync(target, 0o000);
  t.after(() => {
    try {
      fs.chmodSync(target, 0o644);
    } catch {
      /* already removed by fixture cleanup */
    }
  });

  const res = fx.check();
  assert.deepEqual(res.classesFound, ["UNREADABLE"]);
  assert.equal(res.status, 1, "must not exit 0 over a file it could not open");
  assert.doesNotMatch(
    res.stdout,
    /0 problems/,
    "a failed read must never be reported as a clean result",
  );
});

test("a non-UTF-8 orphan is still skipped in silence — residual 6, not a broken instrument", (t) => {
  // The other half. A banner genuinely cannot be read from binary content, so a
  // header-less orphan is a documented, bounded limitation rather than an
  // instrument failure. Reporting it UNREADABLE would be noise, and noise is how
  // a check stops being read.
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("blob.md") },
      sharedFiles: {},
    },
    t,
  );
  const shared = path.join(fx.root, "shared", "resources", "blob.md");
  fs.writeFileSync(shared, Buffer.from([0xff, 0xfe, 0x00, 0x01]));
  fx.bundle();
  fs.rmSync(shared);

  const res = fx.check();
  assert.deepEqual(
    res.classesFound,
    [],
    "binary orphan is a known limit, not a finding",
  );
  assert.equal(res.status, 0);
});

// ---------------------------------------------------------------------------
// CLI surface.
// ---------------------------------------------------------------------------

test("--check exits 0 on a clean skill and 1 when it finds a problem", (t) => {
  const fx = makeFixture(
    {
      skillFiles: { "SKILL.md": namingSkill("contract.md") },
      sharedFiles: { "contract.md": "# Contract\n\nBody.\n" },
    },
    t,
  );
  assert.equal(fx.check().status, 1, "MISSING copy → non-zero");
  fx.bundle();
  const clean = fx.check();
  assert.equal(clean.status, 0);
  assert.match(clean.stdout, /0 problems/);
});

test("the real repository is clean under --check", (t) => {
  // The check is only worth wiring into CI if the tree it guards passes it. This
  // also pins the fix to the live defect the check found on its first run:
  // skills/create-skill/references/skill-dependencies.json was stale behind its
  // source, and the bundler could not write it.
  let res;
  try {
    res = {
      status: 0,
      stdout: execFileSync("python3", [BUNDLER, "--check"], {
        encoding: "utf-8",
        cwd: REPO_ROOT,
      }),
    };
  } catch (e) {
    if (e.status == null) throw e;
    res = { status: e.status, stdout: (e.stdout || "") + (e.stderr || "") };
  }
  assert.equal(res.status, 0, `repo is not bundle-fresh:\n${res.stdout}`);
});
