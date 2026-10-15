"use strict";
/**
 * PRD-scoped epic numbering (task 205) — the retirement guard and the executed
 * skill blocks.
 *
 * 1. NO REGISTRY READER, NO SENTINEL. Shipped sources must not name the retired
 *    global epic registry (`epic-registry.md`), its skill (`epic-registry-manager`)
 *    or the PRD-less epic sentinel (`brownfield-enhancement`).
 *
 *    (a) Keys: the three literals belong to this rule alone.
 *    (b) A restatement this test MISSES: prose that says "look the epic up in the
 *        global registry" without naming the file. That form is caught by review,
 *        not here.
 *    (c) Population: derived from the globs, with a non-vacuity floor — an emptied
 *        glob fails loudly instead of passing over nothing.
 *
 *    The allowlist names each file still allowed a literal and why. An entry whose
 *    file no longer carries any literal FAILS, so the list empties as task.204
 *    (PRD skills) and task.207 (prose sweep) land.
 *
 * 2. EXECUTED SKILL BLOCKS (obs #258). A behaviour fix that lands in a SKILL.md is
 *    held only if a test runs it. Each block is found by the marker comment on its
 *    first line, extracted, and run with bash against a temp fixture tree that holds
 *    the bundled `doc-id.js` where the block expects it.
 *
 * Run: node --test tests/epic-numbering-retirement.test.js
 */
const test = require("node:test");
const { before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DOC_ID_SRC = path.join(ROOT, "shared", "resources", "doc-id.js");

// ── 1. The retirement guard ────────────────────────────────────────────────

const LITERALS = [
  "brownfield-enhancement",
  "epic-registry.md",
  "epic-registry-manager",
];

// file → why it may still carry a literal. Each must still carry one.
const ALLOW = new Map([
  [
    "skills/create-prd/SKILL.md",
    "task.204 — PRD skills move to per-PRD numbering",
  ],
  [
    "skills/review-prd/SKILL.md",
    "task.204 — PRD skills move to per-PRD numbering",
  ],
  ["shared/resources/open-knowledge-format.md", "task.207 — prose sweep"],
  [
    "shared/resources/migrate-doc-numbering.mjs",
    "task.203 — the migration WRITES the retired pointer at docs/development/epic-registry.md",
  ],
]);

function scanned() {
  const out = [];
  for (const skill of fs.readdirSync(path.join(ROOT, "skills"))) {
    const f = path.join("skills", skill, "SKILL.md");
    if (fs.existsSync(path.join(ROOT, f))) out.push(f);
  }
  for (const f of fs.readdirSync(path.join(ROOT, "shared", "resources"))) {
    if (/\.(md|js|mjs|sh)$/.test(f))
      out.push(path.join("shared", "resources", f));
  }
  for (const f of fs.readdirSync(path.join(ROOT, "scripts"))) {
    if (/\.sh$/.test(f)) out.push(path.join("scripts", f));
  }
  return out;
}

test("no shipped source names the retired epic registry, its skill or the sentinel", () => {
  const files = scanned();
  assert.ok(
    files.length >= 100,
    `scan read only ${files.length} files — a glob emptied`,
  );
  const hits = [];
  for (const f of files) {
    if (ALLOW.has(f)) continue;
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const lit of LITERALS) {
      text.split("\n").forEach((line, i) => {
        if (line.includes(lit)) hits.push(`${f}:${i + 1}: ${lit}`);
      });
    }
  }
  assert.deepEqual(hits, [], `retired literals found:\n${hits.join("\n")}`);
});

test("every allowlisted file still carries a literal — a stale entry fails", () => {
  for (const [f, why] of ALLOW) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(
      LITERALS.some((l) => text.includes(l)),
      `${f} no longer names a retired literal — drop it from ALLOW (${why})`,
    );
  }
});

test("the epic-registry-manager skill is gone", () => {
  assert.equal(
    fs.existsSync(path.join(ROOT, "skills", "epic-registry-manager")),
    false,
  );
});

// ── Documentation criteria (asserted on the instruction text) ──────────────

const skillText = (s) =>
  fs.readFileSync(path.join(ROOT, "skills", s, "SKILL.md"), "utf8");

test("create-epic: allocates with doc-id next epic, checks the file, halts with no PRD", () => {
  const t = skillText("create-epic");
  assert.match(
    t,
    /DOC_ID=\.agents\/skills\/create-epic\/references\/doc-id\.js/,
  );
  assert.match(t, /"\$DOC_ID" next epic --prd-dir/);
  assert.match(t, /doc-id\.js check "\$EPIC_FILE"/);
  assert.match(t, /No parent PRD found under .*Run \/create-prd first/);
  assert.doesNotMatch(t, /use decimals for intermediate epics/);
});

test("review-epic: Critical numbering check via doc-id check, no sentinel exemption", () => {
  const t = skillText("review-epic");
  assert.match(
    t,
    /\*\*Numbering\*\* \(Critical\): run `command node \.agents\/skills\/review-epic\/references\/doc-id\.js check/,
  );
  assert.match(
    t,
    /every epic has a parent PRD, so the path must point to an actual file in the repo — there is no exemption/,
  );
  assert.match(t, /Epic Corpus Conflict Detection/);
});

// ── 2. Executed skill blocks ───────────────────────────────────────────────

// The repository's one fence reader — the one the security probe, QA's snippet runner and a
// renderer agree with. A regex that ignores fence nesting found the Step 7 block while a stray
// four-backtick fence hid it from every engine (QA cycle 6, TASK-205-BUG-14). ESM, so loaded once.
let extractBlocks;
before(async () => {
  ({ extractBlocks } =
    await import("../shared/resources/qa-execute-snippets.mjs"));
});

/** Every ```bash block of a document, as the fence reader sees it, with the list indent removed. */
function bashBlocks(md) {
  return extractBlocks(md).map(({ code }) => {
    const lines = code.split("\n");
    const indent = Math.min(
      ...lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length),
    );
    return lines.map((l) => l.slice(indent)).join("\n");
  });
}

/** The one ```bash block whose first line starts with `marker`. Exactly one, or the test fails. */
function blockBy(skill, marker) {
  const blocks = bashBlocks(skillText(skill)).filter((body) =>
    body.trimStart().startsWith(marker),
  );
  assert.equal(
    blocks.length,
    1,
    `${skill}: expected exactly one block marked "${marker}"`,
  );
  return blocks[0];
}

function fixture(files, skills) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epic-205-"));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
  }
  for (const s of skills) {
    const ref = path.join(dir, ".agents", "skills", s, "references");
    fs.mkdirSync(ref, { recursive: true });
    fs.copyFileSync(DOC_ID_SRC, path.join(ref, "doc-id.js"));
    // The path resolver and the config reader it sources: blocks resolve PRD_ROOT themselves.
    for (const f of ["resolve-paths.sh", "read-config.sh"]) {
      fs.copyFileSync(
        path.join(ROOT, "shared", "resources", f),
        path.join(ref, f),
      );
    }
  }
  return dir;
}

function write(dir, rel, content) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
}

/** A block with its `{placeholder}` replaced — how the agent runs a block that names one. */
const substitute = (block, map) =>
  Object.entries(map).reduce((b, [k, v]) => b.split(k).join(v), block);

function runBlock(block, cwd, env, tail = "") {
  const r = spawnSync("bash", ["-c", `${block}\n${tail}`], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`,
      ...env,
    },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const epicFile = (P, E, slug, title = slug) =>
  `---\nprd_number: ${P}\nepic_number: ${E}\ntitle: "${title}"\n---\n`;
const prdFile = (P) => `---\nprd_number: ${P}\ntype: prd\n---\n# PRD\n`;

test("review-epic block: 1.3 resolves exactly one file; 3 is refused; names still search", () => {
  const ep = "docs/prd/d/prd.1.x/epics";
  const dir = fixture(
    {
      [`${ep}/epic.1.3.foo/epic.1.3.foo.md`]: epicFile(1, 3, "foo"),
      [`${ep}/epic.1.3.foo/epic.1.3.review.1.foo.md`]: "# review artifact\n",
      [`${ep}/epic.1.30.bar/epic.1.30.bar.md`]: epicFile(1, 30, "bar"),
      ["docs/prd/d/prd.2.y/epics/epic.2.3.baz/epic.2.3.baz.md"]: epicFile(
        2,
        3,
        "baz",
      ),
    },
    ["review-epic"],
  );
  try {
    const block = blockBy(
      "review-epic",
      "# review-epic — resolve the input to DOC_FILE",
    );
    const pe = runBlock(block, dir, { INPUT: "1.3" });
    assert.equal(pe.code, 0, pe.out);
    assert.match(
      pe.out,
      /DOC_FILE=docs\/prd\/d\/prd\.1\.x\/epics\/epic\.1\.3\.foo\/epic\.1\.3\.foo\.md\n?$/,
    );

    const bare = runBlock(block, dir, { INPUT: "3" });
    assert.equal(bare.code, 1, bare.out);
    assert.match(bare.out, /Epic ids are P\.E \(e\.g\. 1\.3\)/);

    const name = runBlock(block, dir, { INPUT: "bar" });
    assert.equal(name.code, 0, name.out);
    assert.match(name.out, /epic\.1\.30\.bar\.md/);

    const missing = runBlock(block, dir, { INPUT: "9.9" });
    assert.equal(missing.code, 1, missing.out);
    assert.match(missing.out, /not found/);

    const malformed = runBlock(block, dir, { INPUT: "1.2.3" });
    assert.equal(malformed.code, 1, malformed.out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("create-epic block: no PRD halts naming /create-prd; one PRD allocates P and the next E", () => {
  const block = blockBy(
    "create-epic",
    "# create-epic — Discover Parent PRD and allocate the epic id",
  );
  const env = { DOMAIN: "d" };

  const empty = fixture({ "docs/prd/d/notes.md": "x\n" }, ["create-epic"]);
  try {
    const r = runBlock(block, empty, env);
    assert.equal(r.code, 1, r.out);
    assert.match(
      r.out,
      /No parent PRD found under docs\/prd\/d\/.*Run \/create-prd first/,
    );
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }

  const one = fixture(
    {
      "docs/prd/d/prd.1.x/prd.1.x.md": prdFile(1),
      "docs/prd/d/prd.1.x/epics/epic.1.1.a/epic.1.1.a.md": epicFile(1, 1, "a"),
    },
    ["create-epic"],
  );
  try {
    const r = runBlock(block, one, env);
    assert.equal(r.code, 0, r.out);
    assert.match(
      r.out,
      /PRD_SOURCE_PATH=docs\/prd\/d\/prd\.1\.x\/prd\.1\.x\.md P=1 E=2/,
    );
  } finally {
    fs.rmSync(one, { recursive: true, force: true });
  }

  const two = fixture(
    {
      "docs/prd/d/prd.1.x/prd.1.x.md": prdFile(1),
      "docs/prd/d/prd.2.y/prd.2.y.md": prdFile(2),
    },
    ["create-epic"],
  );
  try {
    const r = runBlock(block, two, env);
    assert.equal(r.code, 3, r.out);
    assert.match(r.out, /ASK: 2 PRDs/);
    const chosen = runBlock(block, two, {
      ...env,
      PRD_DIR: "docs/prd/d/prd.2.y",
    });
    assert.equal(chosen.code, 0, chosen.out);
    assert.match(chosen.out, /P=2 E=1/);
  } finally {
    fs.rmSync(two, { recursive: true, force: true });
  }

  const drift = fixture({ "docs/prd/d/prd.1.x/prd.1.x.md": prdFile(4) }, [
    "create-epic",
  ]);
  try {
    const r = runBlock(block, drift, env);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /prd_number: 4, its directory says 1/);
    // One frontmatter parser: a trailing comment is not part of the value (QA cycle 4, CR-6).
    fs.writeFileSync(
      path.join(drift, "docs/prd/d/prd.1.x/prd.1.x.md"),
      "---\nprd_number: 1 # the onboarding PRD\ntype: prd\n---\n",
    );
    const commented = runBlock(block, drift, env);
    assert.equal(commented.code, 0, commented.out);
  } finally {
    fs.rmSync(drift, { recursive: true, force: true });
  }
});

test("review-epic block: a configured PRD root is honoured, an env PRD_ROOT is not (QA cycle 2, CR-5)", () => {
  const block = blockBy(
    "review-epic",
    "# review-epic — resolve the input to DOC_FILE",
  );
  const dir = fixture(
    {
      "skills-config.yaml": "prd:\n  prdShardedLocation: specs/prd\n",
      "specs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md": epicFile(
        1,
        3,
        "foo",
      ),
    },
    ["review-epic"],
  );
  try {
    const r = runBlock(block, dir, { INPUT: "1.3", PRD_ROOT: "docs/prd" });
    assert.equal(r.code, 0, r.out);
    assert.match(
      r.out,
      /DOC_FILE=specs\/prd\/d\/prd\.1\.x\/epics\/epic\.1\.3\.foo\/epic\.1\.3\.foo\.md/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("create-epic id-check block: checks the substituted epic file, blocking (QA cycle 2, CR-6)", () => {
  const block = blockBy(
    "create-epic",
    "# INPUT: {epic file} — substitute the path of the epic file this run just wrote. Nothing",
  );
  const ok = "docs/prd/d/prd.1.x/epics/epic.1.2.a/epic.1.2.a.md";
  const bad = "docs/prd/d/prd.1.x/epics/epic.1.3.b/epic.1.3.b.md";
  const dir = fixture(
    {
      "docs/prd/d/prd.1.x/prd.1.x.md": prdFile(1),
      [ok]: epicFile(1, 2, "a"),
      [bad]: epicFile(1, 9, "b"),
    },
    ["create-epic"],
  );
  try {
    const good = runBlock(substitute(block, { "{epic file}": ok }), dir, {});
    assert.equal(good.code, 0, good.out);
    const wrong = runBlock(substitute(block, { "{epic file}": bad }), dir, {});
    assert.equal(wrong.code, 1, wrong.out);
    assert.match(wrong.out, /doc-id check failed/);
    const missing = runBlock(
      substitute(block, { "{epic file}": "nope.md" }),
      dir,
      {},
    );
    assert.equal(missing.code, 1, missing.out);
    assert.match(missing.out, /is not a file/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("create-epics-from-shards blocks: E0 from next epic; Step 7 checks the batch and refuses an empty one (CR-7)", () => {
  const step4 = blockBy(
    "create-epics-from-shards",
    "# INPUT: {PRD dir} — substitute the PRD directory found in Step 1",
  );
  const step7 = blockBy(
    "create-epics-from-shards",
    "# INPUTS: {PRD dir} — the same PRD directory as Step 4",
  );
  const prdDir = "docs/prd/chat/prd.2.chat";
  const dir = fixture(
    {
      [`${prdDir}/prd.2.chat.md`]: prdFile(2),
      [`${prdDir}/epics/epic.2.1.core/epic.2.1.core.md`]: epicFile(
        2,
        1,
        "core",
      ),
    },
    ["create-epics-from-shards"],
  );
  const empty = fixture(
    { [`${prdDir}/prd.2.chat.md`]: prdFile(2), [`${prdDir}/epics/.keep`]: "" },
    ["create-epics-from-shards"],
  );
  try {
    const e0 = runBlock(substitute(step4, { "{PRD dir}": prdDir }), dir, {});
    assert.equal(e0.code, 0, e0.out);
    assert.match(e0.out, /E0=2/);
    const notDir = runBlock(
      substitute(step4, { "{PRD dir}": "nope" }),
      dir,
      {},
    );
    assert.equal(notDir.code, 1, notDir.out);

    const checked = runBlock(
      substitute(step7, { "{PRD dir}": prdDir, "{E0}": "1", "{count}": "1" }),
      dir,
      {},
    );
    assert.equal(checked.code, 0, checked.out);
    assert.match(checked.out, /1 epic\(s\) ok/);
    const none = runBlock(
      substitute(step7, { "{PRD dir}": prdDir, "{E0}": "1", "{count}": "1" }),
      empty,
      {},
    );
    assert.equal(none.code, 1, none.out);
    assert.match(none.out, /epic\.2\.1 is missing/);
    // A batch that claims more epics than it wrote fails even when the PRD already has some (CR-3).
    const short = runBlock(
      substitute(step7, { "{PRD dir}": prdDir, "{E0}": "1", "{count}": "2" }),
      dir,
      {},
    );
    assert.equal(short.code, 1, short.out);
    assert.match(short.out, /epic\.2\.2 is missing/);
    for (const partial of [
      { "{PRD dir}": prdDir, "{E0}": "1" },
      { "{PRD dir}": prdDir, "{count}": "1" },
      { "{PRD dir}": prdDir, "{E0}": "1", "{count}": "0" },
    ]) {
      const r = runBlock(substitute(step7, partial), dir, {});
      assert.equal(r.code, 1, `${JSON.stringify(partial)}: ${r.out}`);
    }
    const unsub = runBlock(step7, dir, {});
    assert.equal(unsub.code, 1, unsub.out);

    // A batch epic named apart from its directory is one the id check never read (QA cycle 5, CR-1).
    write(
      dir,
      `${prdDir}/epics/epic.2.2.foo/epic.2.2.bar.md`,
      epicFile(2, 2, "bar"),
    );
    const misnamed = runBlock(
      substitute(step7, { "{PRD dir}": prdDir, "{E0}": "2", "{count}": "1" }),
      dir,
      {},
    );
    assert.equal(misnamed.code, 1, misnamed.out);
    assert.match(misnamed.out, /epic\.2\.2 is missing/);
    // A failing check prints its findings, not only the path (QA cycle 5, CR-4).
    write(
      dir,
      `${prdDir}/epics/epic.2.3.baz/epic.2.3.baz.md`,
      epicFile(2, 4, "baz"),
    );
    const failing = runBlock(
      substitute(step7, { "{PRD dir}": prdDir, "{E0}": "3", "{count}": "1" }),
      dir,
      {},
    );
    assert.equal(failing.code, 1, failing.out);
    assert.match(failing.out, /doc-id check failed/);
    assert.match(failing.out, /"reason"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(empty, { recursive: true, force: true });
  }
});

test("ensure-epic-github-issue / sync-github-epic id blocks: [Epic P.E] title and milestone from epic-meta", () => {
  const EPIC = "docs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md";
  const fm = (title) =>
    `---\nprd_number: 1\nepic_number: 3\n${title === null ? "" : `title: ${title}\n`}---\n`;
  for (const skill of ["ensure-epic-github-issue", "sync-github-epic"]) {
    const block = blockBy(skill, `# ${skill} — epic id and bare title`);
    for (const title of [
      '"Epic 3: Foo"',
      '"[Epic 1.3] Foo"',
      "Foo",
      "'Epic 1.3 — Foo'",
    ]) {
      const dir = fixture({ [EPIC]: fm(title) }, [skill]);
      try {
        // Nothing but the file path from outside: the block reads the rest from the document.
        const r = runBlock(
          block,
          dir,
          { EPIC_FILE_PATH: EPIC, TITLE: "", EPIC_ID: "9.9" },
          'printf "ID=%s|MS=%s\\n" "$EPIC_ID" "$MILESTONE_TITLE"',
        );
        assert.equal(r.code, 0, r.out);
        assert.match(
          r.out,
          /ID=1\.3\|MS=Epic 1\.3 — Foo/,
          `${skill} / ${title}`,
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    const untitled = fixture({ [EPIC]: fm(null) }, [skill]);
    try {
      const r = runBlock(block, untitled, { EPIC_FILE_PATH: EPIC });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /has no frontmatter title/);
      const legacy = runBlock(block, untitled, {
        EPIC_FILE_PATH: "x/epic.3.foo.md",
      });
      assert.equal(legacy.code, 1, legacy.out);
      const unbound = runBlock(block, untitled, { EPIC_FILE_PATH: "" });
      assert.notEqual(unbound.code, 0, unbound.out);
    } finally {
      fs.rmSync(untitled, { recursive: true, force: true });
    }
  }
});

test("sync-github-epic milestone block: derives its inputs from the epic file and renames only the epic's own milestone (CR-1, CR-3, CR-9)", () => {
  const block = blockBy(
    "sync-github-epic",
    "# sync-github-epic — resolve the epic's milestone",
  );
  const issue = `205${process.pid}`;
  const EPIC = "docs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md";
  const dir = fixture(
    {
      [EPIC]: `---\nprd_number: 1\nepic_number: 3\ntitle: "Foo"\ngithub_issue: ${issue}\n---\n`,
    },
    ["sync-github-epic"],
  );
  const stub = path.join(dir, "bin");
  fs.mkdirSync(stub);
  // A `node` stand-in for the tracker-issue call only; doc-id runs under the real node.
  fs.writeFileSync(
    path.join(stub, "node"),
    `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${path.join(dir, "argv.txt")}"\n`,
    { mode: 0o755 },
  );
  // The literal path the block reads — not os.tmpdir(), which is not /tmp on every host (QA cycle 3, CR-4).
  const issueJson = `/tmp/issue-${issue}.json`;
  // `command node` (doc-id) must reach the real node; the bare `node` (tracker-issue) the stub.
  const realNode = path.dirname(process.execPath);
  const blockWithStub = block.replace(
    /^command node \.agents\/skills\/sync-github-epic\/references\/tracker-issue\.js/m,
    `"${path.join(stub, "node")}" references/tracker-issue.js`,
  );
  assert.notEqual(
    blockWithStub,
    block,
    "the tracker-issue call line was not found",
  );
  const env = {
    ...process.env,
    EPIC_FILE_PATH: EPIC,
    PATH: `${realNode}:${process.env.PATH}`,
  };
  const renameFrom = (current) => {
    fs.writeFileSync(
      issueJson,
      JSON.stringify({ milestone: current ? { title: current } : null }),
    );
    fs.rmSync(path.join(dir, "argv.txt"), { force: true });
    const r = spawnSync("bash", ["-c", blockWithStub], {
      cwd: dir,
      encoding: "utf8",
      env,
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const argv = fs
      .readFileSync(path.join(dir, "argv.txt"), "utf8")
      .split("\n");
    assert.equal(argv[argv.indexOf("--title") + 1], "Epic 1.3 — Foo");
    return argv.includes("--rename-from")
      ? argv[argv.indexOf("--rename-from") + 1]
      : null;
  };
  try {
    // The epic's own milestone — retitled, or under a legacy one-number id — is renamed in place.
    assert.equal(renameFrom("Epic 3 — Foo"), "Epic 3 — Foo");
    assert.equal(renameFrom("Epic 163 — Foo"), "Epic 163 — Foo");
    assert.equal(renameFrom("Epic 1.3 — Old title"), "Epic 1.3 — Old title");
    // Anything else is never renamed: a sprint, another epic's, a shared one — and another
    // dotted epic whose title happens to match (CR-9).
    assert.equal(renameFrom("Sprint 12"), null);
    assert.equal(renameFrom("Epic 9 — Other"), null);
    assert.equal(renameFrom("Epic 1.30 — Bar"), null);
    assert.equal(renameFrom("Epic 2.1 — Foo"), null);
    assert.equal(renameFrom("Release — Foo"), null);
    assert.equal(renameFrom("Epic 9x — Foo"), null);
    // Already right, or no milestone: nothing to rename.
    assert.equal(renameFrom("Epic 1.3 — Foo"), null);
    assert.equal(renameFrom(null), null);
    // No file bound fails loudly instead of skipping the rename.
    const r = spawnSync("bash", ["-c", blockWithStub], {
      cwd: dir,
      encoding: "utf8",
      env: { ...env, EPIC_FILE_PATH: "" },
    });
    assert.notEqual(r.status, 0);
  } finally {
    fs.rmSync(issueJson, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("ensure-task-github-issue block: reads the task's own epic:, through doc-id and epic-meta (CR-1, CR-2, CR-4)", () => {
  const block = blockBy(
    "ensure-task-github-issue",
    "# ensure-task-github-issue — task milestone from its epic",
  );
  const task = (epic) =>
    `---\ntype: task\n${epic === null ? "" : `epic: ${epic}\n`}---\n# T\n`;
  const ms = 'printf "MS=%s\\n" "$MILESTONE_TITLE"';
  const dir = fixture(
    {
      "docs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md": epicFile(
        1,
        3,
        "foo",
        "[Epic 1.3] Foo",
      ),
      "docs/prd/d/prd.1.x/epics/epic.1.30.bar/epic.1.30.bar.md": epicFile(
        1,
        30,
        "bar",
        "Bar",
      ),
      "docs/prd/d/prd.1.x/epics/epic.1.4.q/epic.1.4.q.md":
        "---\nprd_number: 1\nepic_number: 4\ntitle: 'Checkout: v2'\n---\n",
      "t/pe.md": task("1.3"),
      "t/stem.md": task("epic.1.3.foo"),
      "t/quoted.md": task("1.4"),
      "t/none.md": task("9.9"),
      "t/standalone.md": task(null),
    },
    ["ensure-task-github-issue"],
  );
  try {
    for (const f of ["t/pe.md", "t/stem.md"]) {
      // A misleading EPIC_REF in the environment must not decide: the block reads the task file.
      const r = runBlock(
        block,
        dir,
        { TASK_FILE_PATH: f, EPIC_REF: "9.9" },
        ms,
      );
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /MS=Epic 1\.3 — Foo/, f);
    }
    // One parser for the milestone key: a single-quoted title matches the epic's own key (CR-2).
    const q = runBlock(block, dir, { TASK_FILE_PATH: "t/quoted.md" }, ms);
    assert.match(q.out, /MS=Epic 1\.4 — Checkout: v2\n/);
    assert.match(
      runBlock(block, dir, { TASK_FILE_PATH: "t/none.md" }, ms).out,
      /MS=Technical Tasks \(standalone\)/,
    );
    const alone = runBlock(
      block,
      dir,
      { TASK_FILE_PATH: "t/standalone.md" },
      ms,
    );
    assert.match(alone.out, /MS=Technical Tasks \(standalone\)/);
    assert.doesNotMatch(alone.out, /does not resolve/);
    assert.notEqual(runBlock(block, dir, { TASK_FILE_PATH: "" }, ms).code, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("ensure-task-github-issue block: a configured PRD root is honoured (CR-4)", () => {
  const block = blockBy(
    "ensure-task-github-issue",
    "# ensure-task-github-issue — task milestone from its epic",
  );
  const dir = fixture(
    {
      "skills-config.yaml": "prd:\n  prdShardedLocation: specs/prd\n",
      "specs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md": epicFile(
        1,
        3,
        "foo",
        "Foo",
      ),
      "t.md": "---\nepic: 1.3\n---\n",
    },
    ["ensure-task-github-issue"],
  );
  try {
    const r = runBlock(
      block,
      dir,
      { TASK_FILE_PATH: "t.md", PRD_ROOT: "docs/prd" },
      'printf "MS=%s\\n" "$MILESTONE_TITLE"',
    );
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /MS=Epic 1\.3 — Foo/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("create-epic card preflight block reads no value from another block (QA cycle 3, CR-1)", () => {
  const block = blockBy(
    "create-epic",
    "# INPUT: {epic file} — substitute the path of the epic file this run just wrote (QA cycle 3",
  );
  assert.match(block, /card-preflight\.js --file "\{epic file\}"/);
  assert.doesNotMatch(
    block,
    /\$\{?[A-Z_]/,
    "the preflight block must read no shell variable",
  );
});

test("ensure-epic-github-issue milestone and create blocks derive id/title/milestone in-block, from one root (QA cycles 3–4)", () => {
  const EPIC = "docs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md";
  const dir = fixture(
    {
      [EPIC]: '---\nprd_number: 1\nepic_number: 3\ntitle: "Epic 3: Foo"\n---\n',
    },
    ["ensure-epic-github-issue"],
  );
  // The blocks run with their OWN paths: a recording tracker-issue.js and a pass-through label
  // helper sit where the blocks look for them (repository root), and nothing is rewritten.
  const ref = path.join(
    dir,
    ".agents",
    "skills",
    "ensure-epic-github-issue",
    "references",
  );
  fs.writeFileSync(
    path.join(ref, "tracker-issue.js"),
    `require("fs").writeFileSync(${JSON.stringify(path.join(dir, "argv.txt"))}, process.argv.slice(2).join("\\n"));\n`,
  );
  fs.writeFileSync(
    path.join(ref, "gh-labels.sh"),
    'gh_labels_filter() { printf "%s\\n" "$1"; }\n',
  );
  const blocks = bashBlocks(skillText("ensure-epic-github-issue")).filter(
    (b) => b.includes("tracker-issue.js") && b.includes("epic-meta"),
  );
  assert.equal(
    blocks.length,
    2,
    "the milestone block and the create block each bind via epic-meta",
  );
  try {
    for (const b of blocks) {
      fs.rmSync(path.join(dir, "argv.txt"), { force: true });
      // Empty values "from another block" must not be what the block uses.
      const r = runBlock(b, dir, {
        EPIC_FILE_PATH: EPIC,
        EPIC_ID: "",
        EPIC_TITLE: "",
        MILESTONE_TITLE: "",
      });
      assert.equal(r.code, 0, r.out);
      const argv = fs
        .readFileSync(path.join(dir, "argv.txt"), "utf8")
        .split("\n");
      const kind = argv[argv.indexOf("--kind") + 1];
      if (kind === "create") {
        assert.equal(argv[argv.indexOf("--title") + 1], "[Epic 1.3] Foo");
        assert.equal(argv[argv.indexOf("--milestone") + 1], "Epic 1.3 — Foo");
      } else {
        assert.equal(kind, "milestone");
        assert.equal(argv[argv.indexOf("--title") + 1], "Epic 1.3 — Foo");
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── One path root per block (QA cycle 4, CR-1/CR-2) ────────────────────────
// A block that calls a helper from the repository root (`.agents/skills/<skill>/references/…`) and
// another relative to the skill directory (`references/…`) fails one half from either cwd. Every
// block in the epic skills that uses the repository-root form must use it for every helper.
test("no epic-skill block mixes repository-root and skill-relative helper paths", () => {
  const skills = [
    "create-epic",
    "create-epics-from-shards",
    "review-epic",
    "edit-epic",
    "ensure-epic-github-issue",
    "sync-github-epic",
    "ensure-task-github-issue",
    "sync-jira-epic",
    "jira-epic-creator",
  ];
  let rootBlocks = 0;
  const mixed = [];
  for (const s of skills) {
    for (const { line, code } of extractBlocks(skillText(s))) {
      if (!code.includes(".agents/skills/")) continue;
      rootBlocks++;
      const bare = code.match(/(^|[\s"'(=])references\/[\w.-]+/gm);
      if (bare) mixed.push(`${s}:${line} ${bare.join(" ").trim()}`);
    }
  }
  assert.ok(
    rootBlocks >= 10,
    `only ${rootBlocks} repository-root blocks scanned — the scan matched less than it should`,
  );
  assert.deepEqual(
    mixed,
    [],
    `blocks mixing the two path roots:\n${mixed.join("\n")}`,
  );
});
