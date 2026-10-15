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

/** The one ```bash block whose first line starts with `marker`. Exactly one, or the test fails. */
function blockBy(skill, marker) {
  const md = skillText(skill);
  const blocks = [];
  const re = /^([ \t]*)```bash\n([\s\S]*?)^\1```/gm;
  let m;
  while ((m = re.exec(md))) {
    const indent = m[1];
    const body = m[2]
      .split("\n")
      .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
      .join("\n");
    if (body.trimStart().startsWith(marker)) blocks.push(body);
  }
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
  }
  return dir;
}

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
  const env = { PRD_ROOT: "docs/prd", DOMAIN: "d" };

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
  } finally {
    fs.rmSync(drift, { recursive: true, force: true });
  }
});

test("ensure-epic-github-issue / sync-github-epic id blocks: [Epic P.E] title and milestone", () => {
  for (const skill of ["ensure-epic-github-issue", "sync-github-epic"]) {
    const block = blockBy(skill, `# ${skill} — epic id and bare title`);
    const dir = fixture({}, [skill]);
    try {
      for (const title of ["Epic 3: Foo", "[Epic 1.3] Foo", "Foo"]) {
        const r = runBlock(
          block,
          dir,
          {
            EPIC_FILE_PATH:
              "docs/prd/d/prd.1.x/epics/epic.1.3.foo/epic.1.3.foo.md",
            TITLE: title,
          },
          'printf "ID=%s|MS=%s\\n" "$EPIC_ID" "$MILESTONE_TITLE"',
        );
        assert.equal(r.code, 0, r.out);
        assert.match(
          r.out,
          /ID=1\.3\|MS=Epic 1\.3 — Foo/,
          `${skill} / ${title}`,
        );
      }
      const bad = runBlock(block, dir, {
        EPIC_FILE_PATH: "x/epic.3.foo.md",
        TITLE: "Foo",
      });
      assert.equal(bad.code, 1, bad.out);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("sync-github-epic milestone block: a changed title renames in place with --rename-from", () => {
  const block = blockBy(
    "sync-github-epic",
    "# sync-github-epic — resolve the epic's milestone",
  );
  const dir = fixture({}, []);
  const stub = path.join(dir, "bin");
  fs.mkdirSync(stub);
  // A `node` stand-in that records its argv, one per line.
  fs.writeFileSync(
    path.join(stub, "node"),
    `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${path.join(dir, "argv.txt")}"\n`,
    { mode: 0o755 },
  );
  const issue = `205${process.pid}`;
  const issueJson = path.join(os.tmpdir(), `issue-${issue}.json`);
  const argvOf = () =>
    fs.readFileSync(path.join(dir, "argv.txt"), "utf8").split("\n");
  try {
    fs.writeFileSync(
      issueJson,
      JSON.stringify({ milestone: { title: "Epic 3 — Foo" } }),
    );
    const env = {
      ISSUE_NUM: issue,
      MILESTONE_TITLE: "Epic 1.3 — Foo",
      PATH: `${stub}:${process.env.PATH}`,
    };
    let r = spawnSync("bash", ["-c", block], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    assert.equal(r.status, 0, r.stderr);
    let argv = argvOf();
    assert.ok(argv.includes("--rename-from"), argv.join(" "));
    assert.equal(argv[argv.indexOf("--rename-from") + 1], "Epic 3 — Foo");
    assert.equal(argv[argv.indexOf("--title") + 1], "Epic 1.3 — Foo");

    // Same title → no rename asked for.
    fs.writeFileSync(
      issueJson,
      JSON.stringify({ milestone: { title: "Epic 1.3 — Foo" } }),
    );
    r = spawnSync("bash", ["-c", block], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    assert.equal(r.status, 0, r.stderr);
    argv = argvOf();
    assert.ok(!argv.includes("--rename-from"), argv.join(" "));
  } finally {
    fs.rmSync(issueJson, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("ensure-task-github-issue block: a task's epic: resolves through doc-id, not a registry", () => {
  const block = blockBy(
    "ensure-task-github-issue",
    "# ensure-task-github-issue — task milestone from its epic",
  );
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
    },
    ["ensure-task-github-issue"],
  );
  try {
    for (const ref of ["1.3", "epic.1.3.foo"]) {
      const r = runBlock(
        block,
        dir,
        { EPIC_REF: ref },
        'printf "MS=%s\\n" "$MILESTONE_TITLE"',
      );
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /MS=Epic 1\.3 — Foo/, ref);
    }
    const none = runBlock(
      block,
      dir,
      { EPIC_REF: "9.9" },
      'printf "MS=%s\\n" "$MILESTONE_TITLE"',
    );
    assert.match(none.out, /MS=Technical Tasks \(standalone\)/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
