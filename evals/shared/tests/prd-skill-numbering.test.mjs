/**
 * Numbered PRDs in the PRD skills (task 204).
 *
 * Every row slices a LIVE fenced block out of skills/create-prd/SKILL.md or
 * skills/review-prd/SKILL.md, by the marker on its first line, and runs it under bash
 * in a consumer-shaped root (makeConsumerRoot: `.agents/skills -> <repo>/skills`), so
 * the test follows the text as shipped and the bundled `references/doc-id.js` copies
 * it reaches. It asserts what the block does — the number, the exit code, the file it
 * writes — never that a string exists.
 *
 * Rows are numbered as in the task document's Testing Strategy (§ 8).
 */

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnBudget } from "../../../shared/resources/spawn-budget.mjs";
import { makeConsumerRoot } from "../lib/consumer-root.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("prd-skill-numbering");

// The repository's one fence reader (the QA snippet runner's), so a block is found the
// way every other engine finds it. ESM, loaded once.
let extractBlocks;
before(async () => {
  ({ extractBlocks } =
    await import("../../../shared/resources/qa-execute-snippets.mjs"));
});

const skillText = (skill) =>
  readFileSync(path.join(REPO, "skills", skill, "SKILL.md"), "utf8");

/** The one ```bash block of `skill` whose first line starts with `marker`. */
function blockBy(skill, marker) {
  const blocks = extractBlocks(skillText(skill))
    .map(({ code }) => code)
    .filter((body) => body.trimStart().startsWith(marker));
  assert.equal(blocks.length, 1, `${skill}: one block marked "${marker}"`);
  return blocks[0];
}

const ALLOCATE = () =>
  blockBy("create-prd", "# create-prd — allocate a new PRD number");
const KEEP = () =>
  blockBy("create-prd", "# create-prd — keep the found PRD's number");
const REGISTER = () =>
  blockBy("create-prd", "# create-prd — write the PRD registry row");
const CHECK = () =>
  blockBy("create-prd", "# create-prd — numbering check, blocking");
const RESOLVE = () => blockBy("review-prd", "# review-prd — resolve the PRD");
const NUMBERING = () => blockBy("review-prd", "# review-prd — numbering check");
const MIG_PLAN = () =>
  blockBy("review-prd", "# review-prd — numbering migration plan, read-only");
const MIG_APPLY = () =>
  blockBy("review-prd", "# review-prd — apply the numbering migration");
const REPORT_N = () =>
  blockBy("review-prd", "# review-prd — next review report number");

/** A fresh consumer root holding `files` (repo-relative path → content). */
function tree(files = {}) {
  const root = makeConsumerRoot(REPO, "prd-204-");
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  return root;
}

/** Run `script` under bash in `cwd` with `env`; `tail` runs after it in the same shell. */
function run(script, cwd, env = {}, tail = "") {
  const r = spawnSync(
    "bash",
    ["--noprofile", "--norc", "-c", `${script}\n${tail}`],
    {
      cwd,
      encoding: "utf8",
      timeout: SPAWN_TIMEOUT_MS,
      env: {
        ...process.env,
        PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`,
        ...env,
      },
    },
  );
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const registry = (next, rows = []) =>
  [
    "---",
    "type: registry",
    "---",
    "",
    "# PRD Registry",
    "",
    `**Next Available PRD Number:** **${next}**`,
    "",
    "| PRD # | Title | Folder | Status | Created |",
    "|---|---|---|---|---|",
    ...rows.map(
      ([n, slug, domain]) =>
        `| ${n} | [${slug}](${domain}/prd.${n}.${slug}/prd.${n}.${slug}.md) | ${domain} | draft | 2026-10-15 |`,
    ),
    "",
  ].join("\n");

const prdDoc = (n, slug) =>
  `---\nname: prd.${n}.${slug}\nprd_number: ${n}\ntype: prd\n---\n# PRD ${slug}\n`;
const prdPath = (n, slug, domain = slug) =>
  `docs/prd/${domain}/prd.${n}.${slug}/prd.${n}.${slug}.md`;
const REG = "docs/prd/prd-registry.md";

// ── create-prd ─────────────────────────────────────────────────────────────

test("row 1: an empty PRD root allocates 1, and the row block creates the registry with row 1 and counter 2", () => {
  const root = tree({ "docs/prd/.keep": "" });
  const env = { DOMAIN: "shop", FEATURE: "shop" };
  const a = run(ALLOCATE(), root, env, 'echo "GOT P=$P FILE=$PRD_FILE"');
  assert.equal(a.code, 0, a.out);
  assert.match(
    a.out,
    /GOT P=1 FILE=docs\/prd\/shop\/prd\.1\.shop\/prd\.1\.shop\.md/,
  );
  assert.match(a.out, /\(bootstrap\)/);
  assert.equal(
    existsSync(path.join(root, REG)),
    false,
    "allocation writes nothing",
  );

  // The PRD is written (create-doc's job), then registered.
  mkdirSync(path.join(root, "docs/prd/shop/prd.1.shop"), { recursive: true });
  writeFileSync(path.join(root, prdPath(1, "shop")), prdDoc(1, "shop"));
  const w = run(REGISTER(), root, {
    DOMAIN: "shop",
    PRD_FILE: prdPath(1, "shop"),
    TITLE: "Shop PRD",
  });
  assert.equal(w.code, 0, w.out);
  const reg = readFileSync(path.join(root, REG), "utf8");
  assert.match(reg, /\*\*Next Available PRD Number:\*\* \*\*2\*\*/);
  assert.match(
    reg,
    /^\| 1 \| \[Shop PRD\]\(shop\/prd\.1\.shop\/prd\.1\.shop\.md\) \| shop \| draft \| \d{4}-\d{2}-\d{2} \|$/m,
  );
});

test("row 1b: no registry but a numbered PRD on disk — the allocation halts and writes nothing", () => {
  const root = tree({ [prdPath(2, "x")]: prdDoc(2, "x") });
  const a = run(
    ALLOCATE(),
    root,
    { DOMAIN: "shop", FEATURE: "shop" },
    'echo "GOT P=$P"',
  );
  assert.equal(a.code, 1, a.out);
  assert.match(a.out, /registry-missing/);
  assert.doesNotMatch(a.out, /GOT P=/);
  assert.equal(existsSync(path.join(root, REG)), false);
});

test("row 2: the registry's counter is the number — next = 3 allocates 3, not a directory count", () => {
  const root = tree({
    [REG]: registry(3, [
      [1, "a", "a"],
      [2, "b", "b"],
    ]),
    [prdPath(1, "a")]: prdDoc(1, "a"),
    [prdPath(2, "b")]: prdDoc(2, "b"),
  });
  const a = run(
    ALLOCATE(),
    root,
    { DOMAIN: "c", FEATURE: "c" },
    'echo "GOT P=$P"',
  );
  assert.equal(a.code, 0, a.out);
  assert.match(a.out, /GOT P=3\b/);
});

test("allocation refuses a feature slug no PRD name can carry", () => {
  const root = tree({ [REG]: registry(1) });
  const a = run(
    ALLOCATE(),
    root,
    { DOMAIN: "x", FEATURE: "3d-shop" },
    'echo "GOT P=$P"',
  );
  assert.equal(a.code, 1, a.out);
  assert.match(a.out, /bad-slug/);
});

test("row 3: a numbered, registered PRD passes the blocking check", () => {
  const root = tree({
    [REG]: registry(2, [[1, "shop", "shop"]]),
    [prdPath(1, "shop")]: prdDoc(1, "shop"),
  });
  const c = run(CHECK(), root, { PRD_FILE: prdPath(1, "shop") });
  assert.equal(c.code, 0, c.out);
  assert.match(c.out, /numbering ok/);
});

test("row 4: the same PRD without prd_number fails the check and the HALT branch fires", () => {
  const root = tree({
    [REG]: registry(2, [[1, "shop", "shop"]]),
    [prdPath(1, "shop")]: "---\nname: prd.1.shop\ntype: prd\n---\n# PRD\n",
  });
  const c = run(
    CHECK(),
    root,
    { PRD_FILE: prdPath(1, "shop") },
    'echo "AFTER-HALT"',
  );
  assert.equal(c.code, 1, c.out);
  assert.match(c.out, /HALT/);
  assert.match(c.out, /frontmatter-mismatch/);
  assert.doesNotMatch(c.out, /AFTER-HALT/, "the block must stop the run");
});

test("row 8: continuation keeps the found PRD's number and leaves the registry byte-identical", () => {
  const reg = registry(5, [[4, "x", "x"]]);
  const root = tree({ [REG]: reg, [prdPath(4, "x")]: prdDoc(4, "x") });
  const k = run(
    KEEP(),
    root,
    { FOUND_PRD: prdPath(4, "x") },
    'echo "GOT P=$P"',
  );
  assert.equal(k.code, 0, k.out);
  assert.match(k.out, /GOT P=4\b/);
  assert.equal(readFileSync(path.join(root, REG), "utf8"), reg);
});

test("row 9: continuation on a legacy unnumbered PRD halts and points at /review-prd", () => {
  const root = tree({
    [REG]: registry(1),
    "docs/prd/x/prd.x/prd.x.md": "---\ntype: prd\n---\n# PRD\n",
  });
  const k = run(
    KEEP(),
    root,
    { FOUND_PRD: "docs/prd/x/prd.x/prd.x.md" },
    'echo "GOT P=$P"',
  );
  assert.equal(k.code, 1, k.out);
  assert.match(k.out, /review-prd/);
  assert.doesNotMatch(k.out, /GOT P=/);
});

test("row 11: allocation, the registry row and the check are exactly three node processes", () => {
  const root = tree({ [REG]: registry(1) });
  // A `node` shim first on PATH counts every process the blocks start, then runs the real one.
  const shimDir = path.join(root, ".shim");
  mkdirSync(shimDir);
  const log = path.join(root, ".node-calls");
  writeFileSync(
    path.join(shimDir, "node"),
    `#!/bin/sh\necho x >> "${log}"\nexec "${process.execPath}" "$@"\n`,
  );
  chmodSync(path.join(shimDir, "node"), 0o755);
  const env = {
    PATH: `${shimDir}:${path.dirname(process.execPath)}:${process.env.PATH}`,
    DOMAIN: "shop",
    FEATURE: "shop",
    TITLE: "Shop",
  };
  const write = `mkdir -p "$PRD_DIR" && printf -- '---\\nname: prd.1.shop\\nprd_number: 1\\ntype: prd\\n---\\n' > "$PRD_FILE"`;
  const r = run([ALLOCATE(), write, REGISTER(), CHECK()].join("\n"), root, env);
  assert.equal(r.code, 0, r.out);
  const calls = readFileSync(log, "utf8").trim().split("\n").length;
  assert.equal(calls, 3, `node processes: ${calls}`);
});

// ── review-prd ─────────────────────────────────────────────────────────────

/** A legacy PRD with a legacy epic, plus — the control — a numbered PRD whose epic carries another P. */
const LEGACY_TREE = {
  [REG]: registry(3, [[2, "chat", "chat"]]),
  "docs/prd/onboarding/prd.onboarding/prd.onboarding.md":
    "---\ntitle: Onboarding\nstatus: draft\ntype: prd\n---\n# PRD\n",
  "docs/prd/onboarding/prd.onboarding/epics/epic.4.tour/epic.4.tour.md":
    "---\nepic_number: 4\ntitle: Tour\nstatus: draft\n---\n# Epic\n",
  [prdPath(2, "chat")]: prdDoc(2, "chat"),
  "docs/prd/chat/prd.2.chat/epics/epic.3.1.feed/epic.3.1.feed.md":
    "---\nprd_number: 3\nepic_number: 1\ntitle: Feed\n---\n# Epic\n",
};

function gitInit(root) {
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "fixture"],
  ]) {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  }
}

test("row 5: a legacy PRD and its epic are each a Critical finding; a numbered PRD's wrong-P epic is too", () => {
  const root = tree(LEGACY_TREE);
  const legacy = run(NUMBERING(), root, {
    PRD_FILE: "docs/prd/onboarding/prd.onboarding/prd.onboarding.md",
  });
  assert.equal(legacy.code, 0, legacy.out); // findings are reported, not a crash
  assert.match(
    legacy.out,
    /\[Critical\] numbering bad-shape: .*prd\.onboarding\.md/,
  );
  assert.match(
    legacy.out,
    /\[Critical\] numbering bad-shape: .*epic\.4\.tour\.md/,
  );
  assert.doesNotMatch(
    legacy.out,
    /chat/,
    "findings stay inside this PRD's directory",
  );

  const control = run(NUMBERING(), root, { PRD_FILE: prdPath(2, "chat") });
  assert.match(
    control.out,
    /\[Critical\] numbering parent-number-mismatch: .*epic\.3\.1\.feed\.md/,
  );
  assert.doesNotMatch(control.out, /onboarding/);
});

test("row 10: a deleted registry and a wrong prd_number are each a Critical finding", () => {
  const root = tree({
    [prdPath(1, "a")]: prdDoc(1, "a"),
    [prdPath(2, "b")]: "---\nname: prd.2.b\nprd_number: 7\ntype: prd\n---\n",
  });
  const missing = run(NUMBERING(), root, { PRD_FILE: prdPath(1, "a") });
  assert.match(
    missing.out,
    /\[Critical\] numbering registry-missing: .*prd\.1\.a\.md/,
  );
  const wrong = run(NUMBERING(), root, { PRD_FILE: prdPath(2, "b") });
  assert.match(
    wrong.out,
    /\[Critical\] numbering frontmatter-mismatch: .*prd_number: 7 ≠ 2/,
  );
});

test("a clean numbered PRD has no numbering findings", () => {
  const root = tree({
    [REG]: registry(2, [[1, "a", "a"]]),
    [prdPath(1, "a")]: prdDoc(1, "a"),
  });
  const r = run(NUMBERING(), root, { PRD_FILE: prdPath(1, "a") });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /numbering ok/);
  assert.doesNotMatch(r.out, /Critical/);
});

test("row 6: the migration plan lists the renames and writes nothing", () => {
  const root = tree({
    [REG]: registry(1),
    "docs/prd/onboarding/prd.onboarding/prd.onboarding.md":
      LEGACY_TREE["docs/prd/onboarding/prd.onboarding/prd.onboarding.md"],
    "docs/prd/onboarding/prd.onboarding/epics/epic.4.tour/epic.4.tour.md":
      LEGACY_TREE[
        "docs/prd/onboarding/prd.onboarding/epics/epic.4.tour/epic.4.tour.md"
      ],
  });
  gitInit(root);
  const r = run(MIG_PLAN(), root);
  assert.match(r.out, /migration: needs-migration/);
  assert.match(r.out, /prd prd\.onboarding → 1 .*prd\.1\.onboarding\.md/);
  assert.match(r.out, /epic 4 → 1\.1 /);
  assert.doesNotMatch(r.out, /blocker/);
  const st = spawnSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    st.stdout.replace(/^\?\? \.agents\/\n/m, ""),
    "",
    "the plan writes nothing",
  );
});

test("row 6b: apply moves the PRD, and the numbering check on its new path is clean", () => {
  const root = tree({
    [REG]: registry(1),
    "docs/prd/onboarding/prd.onboarding/prd.onboarding.md":
      LEGACY_TREE["docs/prd/onboarding/prd.onboarding/prd.onboarding.md"],
    "docs/prd/onboarding/prd.onboarding/epics/epic.4.tour/epic.4.tour.md":
      LEGACY_TREE[
        "docs/prd/onboarding/prd.onboarding/epics/epic.4.tour/epic.4.tour.md"
      ],
  });
  writeFileSync(path.join(root, ".gitignore"), ".agents/\n");
  gitInit(root);
  const a = run(MIG_APPLY(), root);
  assert.equal(a.code, 0, a.out);
  assert.match(a.out, /migration: ok/);
  const resolved = run(RESOLVE(), root, { PRD_INPUT: "1" });
  assert.equal(resolved.code, 0, resolved.out);
  const file = resolved.out.match(/PRD_FILE=(\S+)/)[1];
  assert.equal(
    file,
    "docs/prd/onboarding/prd.1.onboarding/prd.1.onboarding.md",
  );
  const c = run(NUMBERING(), root, { PRD_FILE: file });
  assert.equal(c.code, 0, c.out);
  assert.match(c.out, /numbering ok/);
});

test("row 7: resolving 1 picks prd.1's document — not prd.12, not a review report — and the next report is 4 (highest + 1, not count + 1)", () => {
  const root = tree({
    [REG]: registry(13, [
      [1, "x", "x"],
      [12, "other", "other"],
    ]),
    [prdPath(1, "x")]: prdDoc(1, "x"),
    "docs/prd/x/prd.1.x/prd.1.x.review.1.y.md": "# review\n",
    "docs/prd/x/prd.1.x/prd.1.x.review.3.y.md": "# review\n",
    [prdPath(12, "other")]: prdDoc(12, "other"),
  });
  for (const input of ["1", "prd.1"]) {
    const r = run(RESOLVE(), root, { PRD_INPUT: input });
    assert.equal(r.code, 0, `${input}: ${r.out}`);
    assert.match(r.out, /PRD_FILE=docs\/prd\/x\/prd\.1\.x\/prd\.1\.x\.md$/m);
  }
  const bySlug = run(RESOLVE(), root, { PRD_INPUT: "other" });
  assert.match(bySlug.out, /PRD_FILE=.*prd\.12\.other\.md$/m);
  const n = run(REPORT_N(), root, { PRD_FILE: prdPath(1, "x") });
  assert.equal(n.code, 0, n.out);
  assert.match(
    n.out,
    /REPORT=docs\/prd\/x\/prd\.1\.x\/prd\.1\.x\.review\.4\.\{name\}\.md/,
  );
});

test("a legacy PRD still resolves by its slug, so review-prd can report it", () => {
  const root = tree({
    "docs/prd/onboarding/prd.onboarding/prd.onboarding.md": "# PRD\n",
    "docs/prd/onboarding/prd.onboarding/prd.onboarding.review.1.x.md": "# r\n",
  });
  const r = run(RESOLVE(), root, { PRD_INPUT: "onboarding" });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /PRD_FILE=.*\/prd\.onboarding\/prd\.onboarding\.md$/m);
});

// ── QA cycle 1 (gate 1) ────────────────────────────────────────────────────

test("register: the number comes from PRD_FILE's own name, and a non-numbered file is refused", () => {
  const root = tree({ [REG]: registry(5, [[4, "x", "x"]]) });
  mkdirSync(path.join(root, "docs/prd/y/prd.5.y"), { recursive: true });
  writeFileSync(path.join(root, prdPath(5, "y")), prdDoc(5, "y"));
  const ok = run(REGISTER(), root, {
    DOMAIN: "y",
    PRD_FILE: prdPath(5, "y"),
    TITLE: "Y",
    P: "99",
  });
  assert.equal(ok.code, 0, ok.out);
  const reg = readFileSync(path.join(root, REG), "utf8");
  assert.match(reg, /^\| 5 \| \[Y\]/m, "row 5, from the file name");
  assert.doesNotMatch(
    reg,
    /^\| 99 /m,
    "a stray P in the environment is never used",
  );

  writeFileSync(path.join(root, "docs/prd/y/prd.y.md"), "# legacy\n");
  const bad = run(REGISTER(), root, {
    DOMAIN: "y",
    PRD_FILE: "docs/prd/y/prd.y.md",
    TITLE: "Y",
  });
  assert.equal(bad.code, 1, bad.out);
  assert.match(bad.out, /not a numbered PRD document/);
});

test("CR-1: a PRD directory resolves to its own document, with or without the trailing slash", () => {
  const root = tree({
    [REG]: registry(4, [[3, "shop", "shop"]]),
    [prdPath(3, "shop")]: prdDoc(3, "shop"),
    "docs/prd/shop/prd.3.shop/prd.3.shop.review.1.x.md": "# review\n",
    "docs/prd/empty/prd.9.empty/notes.md": "# not the document\n",
  });
  for (const input of [
    "docs/prd/shop/prd.3.shop/",
    "docs/prd/shop/prd.3.shop",
  ]) {
    const r = run(RESOLVE(), root, { PRD_INPUT: input });
    assert.equal(r.code, 0, `${input}: ${r.out}`);
    assert.match(
      r.out,
      /^PRD_FILE=docs\/prd\/shop\/prd\.3\.shop\/prd\.3\.shop\.md$/m,
    );
  }
  const none = run(RESOLVE(), root, {
    PRD_INPUT: "docs/prd/empty/prd.9.empty/",
  });
  assert.equal(none.code, 1, none.out);
  assert.match(none.out, /No PRD found/);
});

test("CR-3: a resolver that cannot run says so, never 'No PRD found'", () => {
  // A consumer root whose review-prd install lacks doc-id.js.
  const root = makeConsumerRoot(REPO, "prd-204-broken-");
  rmSync(path.join(root, ".agents", "skills"));
  const ref = path.join(root, ".agents", "skills", "review-prd", "references");
  mkdirSync(ref, { recursive: true });
  for (const f of ["resolve-paths.sh", "read-config.sh"]) {
    copyFileSync(
      path.join(REPO, "skills", "review-prd", "references", f),
      path.join(ref, f),
    );
  }
  mkdirSync(path.join(root, "docs", "prd"), { recursive: true });
  const r = run(RESOLVE(), root, { PRD_INPUT: "1" });
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /resolver could not run/);
  assert.doesNotMatch(r.out, /No PRD found/);
});

/** A consumer holding a monolithic docs/prd.md, beside a numbered PRD with a defect of its own. */
const MONOLITH_TREE = {
  [REG]: registry(2, [[1, "a", "a"]]),
  [prdPath(1, "a")]: "---\nname: prd.1.a\nprd_number: 7\ntype: prd\n---\n",
  "docs/prd.md": "---\ntitle: Mono\nstatus: draft\ntype: prd\n---\n# PRD\n",
};

test("CR-2: a root-level docs/prd.md reports exactly its own finding, not another PRD's", () => {
  const root = tree(MONOLITH_TREE);
  const r = run(NUMBERING(), root, { PRD_FILE: "docs/prd.md" });
  const lines = r.out.split("\n").filter((l) => l.startsWith("[Critical]"));
  assert.equal(lines.length, 1, r.out);
  assert.match(lines[0], /bad-shape: .*\/docs\/prd\.md — outside docs\/prd/);
  assert.doesNotMatch(r.out, /prd\.1\.a/);
});

test("QA-1: the migration plan surfaces a monolith's blocker, and MIG_NAME clears it", () => {
  const root = tree({
    [REG]: registry(1),
    "docs/prd.md": MONOLITH_TREE["docs/prd.md"],
  });
  writeFileSync(path.join(root, ".gitignore"), ".agents/\n");
  gitInit(root);
  const blocked = run(MIG_PLAN(), root);
  assert.match(blocked.out, /✖ blocker unplaced-prd: docs\/prd\.md/);
  const named = run(MIG_PLAN(), root, { MIG_NAME: "docs/prd.md=mono" });
  assert.doesNotMatch(named.out, /blocker/);
  assert.match(
    named.out,
    /prd prd → 1 .*docs\/prd\.md → docs\/prd\/mono\/prd\.1\.mono\/prd\.1\.mono\.md/,
  );
});

// ── QA cycle 2 (gate 2) ────────────────────────────────────────────────────

test("gate-2 CR-1/CR-2: a PRD file that does not own its directory reports only its own finding", () => {
  const root = tree({
    [REG]: registry(4, [[3, "shop", "shop"]]),
    [prdPath(3, "shop")]:
      "---\nname: prd.3.shop\nprd_number: 9\ntype: prd\n---\n",
    "docs/prd/x/prd.x/prd.x.md": "# legacy\n",
    "docs/prd/index.md": "# legacy index\n",
    "docs/prd/flat/prd.flat.md": "# flat legacy\n",
    "docs/prd/flat/prd.2.other/prd.2.other.md": prdDoc(2, "other"),
  });
  for (const [file, name] of [
    ["docs/prd/index.md", "index.md"],
    ["docs/prd/flat/prd.flat.md", "prd.flat.md"],
  ]) {
    const r = run(NUMBERING(), root, { PRD_FILE: file });
    const lines = r.out.split("\n").filter((l) => l.startsWith("[Critical]"));
    assert.equal(lines.length, 1, `${file}: ${r.out}`);
    assert.ok(lines[0].includes(name), `${file}: ${lines[0]}`);
    assert.doesNotMatch(r.out, /prd\.3\.shop|prd\.x\.md|prd\.2\.other/, file);
  }
});

test("gate-2 CR-2: the PRD file's own findings are reported with its subtree's", () => {
  const root = tree({
    [REG]: registry(3, [[1, "a", "a"]]),
    [prdPath(1, "a")]: prdDoc(1, "a"),
    // A numbered PRD that is not in the registry: unregistered is the file's own finding.
    [prdPath(2, "b")]: prdDoc(2, "b"),
    "docs/prd/b/prd.2.b/epics/epic.2.1.e/epic.2.1.e.md":
      "---\nprd_number: 2\nepic_number: 1\n---\n",
  });
  const r = run(NUMBERING(), root, { PRD_FILE: prdPath(2, "b") });
  assert.match(r.out, /\[Critical\] numbering unregistered: .*prd\.2\.b\.md/);
  assert.equal((r.out.match(/unregistered/g) || []).length, 1, "deduplicated");
});

test("gate-2 CR-6: a duplicated PRD id is reported from either side", () => {
  const root = tree({
    [REG]: registry(2, [[1, "x", "a"]]),
    "docs/prd/a/prd.1.x/prd.1.x.md": prdDoc(1, "x"),
    "docs/prd/b/prd.1.x/prd.1.x.md": prdDoc(1, "x"),
  });
  for (const file of [
    "docs/prd/a/prd.1.x/prd.1.x.md",
    "docs/prd/b/prd.1.x/prd.1.x.md",
  ]) {
    const r = run(NUMBERING(), root, { PRD_FILE: file });
    assert.match(r.out, /\[Critical\] numbering duplicate-id/, file);
  }
});

test("gate-2 CR-3: a full stem resolves to exactly that PRD; a wrong slug resolves to nothing", () => {
  const root = tree({
    [REG]: registry(13, [
      [3, "shop", "shop"],
      [12, "shop-two", "shop"],
    ]),
    [prdPath(3, "shop")]: prdDoc(3, "shop"),
    "docs/prd/shop/prd.12.shop-two/prd.12.shop-two.md": prdDoc(12, "shop-two"),
    "docs/prd/x/prd.onboarding/prd.onboarding.md": "# legacy\n",
  });
  const hit = run(RESOLVE(), root, { PRD_INPUT: "prd.3.shop" });
  assert.equal(hit.code, 0, hit.out);
  assert.match(
    hit.out,
    /^PRD_FILE=docs\/prd\/shop\/prd\.3\.shop\/prd\.3\.shop\.md$/m,
  );
  const legacy = run(RESOLVE(), root, { PRD_INPUT: "prd.onboarding" });
  assert.match(legacy.out, /^PRD_FILE=.*\/prd\.onboarding\.md$/m);
  const miss = run(RESOLVE(), root, { PRD_INPUT: "prd.3.other" });
  assert.equal(miss.code, 1, miss.out);
});

test("gate-2 CR-5: a domain that is not a kebab-case segment is refused, and nothing is allocated", () => {
  for (const domain of ["../..", "a/b", "Shop", "3d", " ", "."]) {
    const root = tree({ [REG]: registry(1) });
    const r = run(
      ALLOCATE(),
      root,
      { DOMAIN: domain, FEATURE: "shop" },
      'echo "GOT P=$P"',
    );
    assert.equal(r.code, 1, `${JSON.stringify(domain)}: ${r.out}`);
    assert.match(r.out, /bad-domain/, JSON.stringify(domain));
    assert.doesNotMatch(r.out, /GOT P=/);
  }
});

test("gate-2 CR-8: the register block takes folder and href from PRD_FILE and refuses a file off the layout", () => {
  const root = tree({ [REG]: registry(2) });
  mkdirSync(path.join(root, "docs/prd/shop/prd.2.shop"), { recursive: true });
  writeFileSync(path.join(root, prdPath(2, "shop")), prdDoc(2, "shop"));
  const ok = run(REGISTER(), root, {
    PRD_FILE: prdPath(2, "shop"),
    TITLE: "Shop",
    DOMAIN: "wrong",
  });
  assert.equal(ok.code, 0, ok.out);
  assert.match(
    readFileSync(path.join(root, REG), "utf8"),
    /^\| 2 \| \[Shop\]\(shop\/prd\.2\.shop\/prd\.2\.shop\.md\) \| shop \|/m,
  );
  mkdirSync(path.join(root, "docs/prd/prd.3.flat"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/prd/prd.3.flat/prd.3.flat.md"),
    prdDoc(3, "flat"),
  );
  const off = run(REGISTER(), root, {
    PRD_FILE: "docs/prd/prd.3.flat/prd.3.flat.md",
    TITLE: "Flat",
  });
  assert.equal(off.code, 1, off.out);
  assert.match(off.out, /not a numbered PRD document at/);
});

test("gate-2 CR-2: a file the corpus walk skips is still checked, never reported as numbering ok", () => {
  // notes/notes.md owns its directory but carries no prd. prefix, so checkCorpus never visits it.
  const root = tree({
    [REG]: registry(1),
    "docs/prd/x/notes/notes.md": "# not a PRD\n",
  });
  const r = run(NUMBERING(), root, { PRD_FILE: "docs/prd/x/notes/notes.md" });
  assert.match(r.out, /\[Critical\] numbering bad-shape: .*notes\.md/);
  assert.doesNotMatch(r.out, /numbering ok/);
});

test("gate-2 CR-8: the register block refuses a bad folder and a PRD nested one level too deep", () => {
  const root = tree({ [REG]: registry(4) });
  for (const file of [
    "docs/prd/Bad_Folder/prd.3.x/prd.3.x.md",
    "docs/prd/a/prd.3.x/prd.3.x/prd.3.x.md",
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), prdDoc(3, "x"));
    const r = run(REGISTER(), root, { PRD_FILE: file, TITLE: "X" });
    assert.equal(r.code, 1, `${file}: ${r.out}`);
    assert.match(r.out, /not a numbered PRD document at/, file);
  }
  assert.doesNotMatch(readFileSync(path.join(root, REG), "utf8"), /^\| 3 /m);
});

// ── QA cycle 3 (gate 3) ────────────────────────────────────────────────────

/** A consumer root whose review-prd or create-prd install has no doc-id.js. */
function brokenRoot(skill, files = {}) {
  const root = makeConsumerRoot(REPO, "prd-204-broken-");
  rmSync(path.join(root, ".agents", "skills"));
  const ref = path.join(root, ".agents", "skills", skill, "references");
  mkdirSync(ref, { recursive: true });
  for (const f of ["resolve-paths.sh", "read-config.sh"]) {
    copyFileSync(
      path.join(REPO, "skills", skill, "references", f),
      path.join(ref, f),
    );
  }
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  return root;
}

test("gate-3 CR-1: a numbering checker that cannot run says so and fails, never 'no findings'", () => {
  const root = brokenRoot("review-prd", { [prdPath(1, "a")]: prdDoc(1, "a") });
  const r = run(NUMBERING(), root, { PRD_FILE: prdPath(1, "a") });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /numbering check could not run/);
  assert.doesNotMatch(r.out, /numbering ok/);
});

test("gate-3 CR-3: a migration plan that cannot run says so, never 'no blockers'", () => {
  // No git repository: migrate-doc-numbering.mjs answers usage, with no blockers list.
  const root = tree({ [REG]: registry(1), "docs/prd.md": "# mono\n" });
  const r = run(MIG_PLAN(), root);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /migration plan could not run \(exit 2, usage\)/);
  assert.doesNotMatch(r.out, /^migration: /m);
});

test("gate-3 CR-2/CR-4: the keep block refuses an off-layout PRD and tells an unreadable one apart", () => {
  const root = tree({
    [REG]: registry(5, [[4, "x", "x"]]),
    "docs/prd/x/prd.4.x.md": prdDoc(4, "x"),
    "elsewhere/prd.4.x/prd.4.x.md": prdDoc(4, "x"),
  });
  for (const file of [
    "docs/prd/x/prd.4.x.md",
    "elsewhere/prd.4.x/prd.4.x.md",
  ]) {
    const k = run(KEEP(), root, { FOUND_PRD: file }, 'echo "GOT P=$P"');
    assert.equal(k.code, 1, `${file}: ${k.out}`);
    assert.match(k.out, /is not at docs\/prd\/\{domain\}/, file);
    assert.doesNotMatch(k.out, /GOT P=/);
  }
  const missing = run(KEEP(), root, { FOUND_PRD: prdPath(4, "x") });
  assert.equal(missing.code, 1, missing.out);
  assert.match(missing.out, /cannot be read .*check the FOUND_PRD binding/);
  assert.doesNotMatch(missing.out, /review-prd/);
});

test("gate-3 CR-5: a domain directory that symlinks out of the root is refused, at allocate and at register", () => {
  const root = tree({ [REG]: registry(1), "outside/.keep": "" });
  symlinkSync(path.join(root, "outside"), path.join(root, "docs/prd/shop"));
  const a = run(
    ALLOCATE(),
    root,
    { DOMAIN: "shop", FEATURE: "shop" },
    'echo "GOT P=$P"',
  );
  assert.equal(a.code, 1, a.out);
  assert.match(a.out, /bad-domain .*resolves outside/);
  assert.doesNotMatch(a.out, /GOT P=/);
  mkdirSync(path.join(root, "outside/prd.1.shop"), { recursive: true });
  writeFileSync(
    path.join(root, "outside/prd.1.shop/prd.1.shop.md"),
    prdDoc(1, "shop"),
  );
  const w = run(REGISTER(), root, {
    PRD_FILE: prdPath(1, "shop"),
    TITLE: "Shop",
  });
  assert.equal(w.code, 1, w.out);
  assert.match(w.out, /resolves outside docs\/prd/);
  // gate-4 CR-1: the third block that accepts a PRD path holds the same line.
  const k = run(
    KEEP(),
    root,
    { FOUND_PRD: prdPath(1, "shop") },
    'echo "GOT P=$P"',
  );
  assert.equal(k.code, 1, k.out);
  assert.match(k.out, /resolves outside docs\/prd/);
  assert.doesNotMatch(k.out, /GOT P=/);
});

test("gate-4 CR-2: a post-check-failed migration answer offers nothing to apply and names the findings", () => {
  // Fully numbered, so nothing moves, but the corpus is not clean (prd_number disagrees).
  const root = tree({
    [REG]: registry(2, [[1, "a", "a"]]),
    [prdPath(1, "a")]: "---\nname: prd.1.a\nprd_number: 7\ntype: prd\n---\n",
  });
  writeFileSync(path.join(root, ".gitignore"), ".agents/\n");
  gitInit(root);
  const r = run(MIG_PLAN(), root);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /post-check-failed — nothing to migrate/);
  assert.match(r.out, /✖ frontmatter-mismatch: .*prd\.1\.a\.md/);
  assert.doesNotMatch(r.out, /^migration: needs-migration/m);
});

// ── QA cycle 5 (gate 5) ────────────────────────────────────────────────────

const SHARD = () =>
  blockBy("shard-prd", "# shard-prd — explode a numbered PRD in place");

test("gate-5: every block that reads or writes a PRD path refuses a symlink out of the root", () => {
  // CR-1: a registry that is a symlink (live or dangling) is never written through.
  for (const live of [true, false]) {
    const root = tree({
      [prdPath(1, "shop")]: prdDoc(1, "shop"),
      "outside/.keep": "",
    });
    if (live) writeFileSync(path.join(root, "outside/reg.md"), registry(1));
    symlinkSync(path.join(root, "outside/reg.md"), path.join(root, REG));
    const r = run(REGISTER(), root, {
      PRD_FILE: prdPath(1, "shop"),
      TITLE: "Shop",
    });
    assert.equal(r.code, 1, `live=${live}: ${r.out}`);
    assert.match(r.out, /is a symlink/);
    const target = path.join(root, "outside/reg.md");
    assert.equal(
      existsSync(target) && readFileSync(target, "utf8").includes("[Shop]"),
      false,
      "nothing written outside",
    );
  }
  // CR-2: review-prd reports a PRD file that is a symlink out of the root.
  const root = tree({
    [REG]: registry(2, [[1, "shop", "shop"]]),
    "outside/real.md": prdDoc(1, "shop"),
  });
  mkdirSync(path.join(root, "docs/prd/shop/prd.1.shop"), { recursive: true });
  symlinkSync(
    path.join(root, "outside/real.md"),
    path.join(root, prdPath(1, "shop")),
  );
  const n = run(NUMBERING(), root, { PRD_FILE: prdPath(1, "shop") });
  assert.equal(n.code, 1, n.out);
  assert.match(n.out, /resolves outside docs\/prd through a symlink/);
  assert.doesNotMatch(n.out, /numbering ok/);
  // CR-3: the keep block names the real remedy, not a migration.
  const k = run(KEEP(), root, { FOUND_PRD: prdPath(1, "shop") });
  assert.equal(k.code, 1, k.out);
  assert.match(k.out, /no migration can fix this/);
  assert.doesNotMatch(k.out, /offers the numbering migration/);
});

test("gate-6 CR-1: a PRD that resolves outside the root stops the review, and no report path is given through the link", () => {
  const root = tree({
    [REG]: registry(3, [[2, "evil", "evil"]]),
    "outside/prd.2.evil/prd.2.evil.md": prdDoc(2, "evil"),
    "docs/prd.md": "# legacy monolith\n",
  });
  mkdirSync(path.join(root, "docs/prd/evil"), { recursive: true });
  symlinkSync(
    path.join(root, "outside/prd.2.evil"),
    path.join(root, "docs/prd/evil/prd.2.evil"),
  );
  const file = "docs/prd/evil/prd.2.evil/prd.2.evil.md";
  // The numbering block stops the review rather than reporting and carrying on.
  const n = run(NUMBERING(), root, { PRD_FILE: file }, 'echo "AFTER-BLOCK"');
  assert.equal(n.code, 1, n.out);
  assert.match(n.out, /review stopped: a symlink leads out of docs\/prd/);
  assert.match(n.out, /no migration can fix this/);
  assert.doesNotMatch(n.out, /AFTER-BLOCK|numbering ok|\[Critical\]/);
  // The report-number block refuses the linked directory: no REPORT path through it.
  const r = run(REPORT_N(), root, { PRD_FILE: file });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /resolves outside docs\/prd/);
  assert.doesNotMatch(r.out, /REPORT=/);
  // The other direction: a legacy PRD above the root still gets its report beside it.
  const legacy = run(REPORT_N(), root, { PRD_FILE: "docs/prd.md" });
  assert.equal(legacy.code, 0, legacy.out);
  assert.match(legacy.out, /REPORT=docs\/prd\.review\.1\.\{name\}\.md/);
});

test("gate-7 CR-1: migrating a root-level docs/prd.md leaves every other PRD's text alone", () => {
  const shop = `${prdDoc(1, "shop")}\nThe prd says hi; the \`prd\` type stays; a bare prd.md mention is prose.\n`;
  const root = tree({
    [REG]: registry(2, [[1, "shop", "shop"]]),
    [prdPath(1, "shop")]: shop,
    "docs/prd.md": "---\ntype: prd\n---\n# Legacy\n",
  });
  writeFileSync(path.join(root, ".gitignore"), ".agents/\n");
  gitInit(root);
  const env = { MIG_NAME: "docs/prd.md=legacy" };
  const plan = run(MIG_PLAN(), root, env);
  assert.match(plan.out, /migration: needs-migration/);
  const a = run(MIG_APPLY(), root, env);
  assert.equal(a.code, 0, a.out);
  assert.match(a.out, /migration: ok/);
  assert.ok(
    existsSync(path.join(root, prdPath(2, "legacy"))),
    "the monolith moved to its numbered place",
  );
  assert.equal(
    readFileSync(path.join(root, prdPath(1, "shop")), "utf8"),
    shop,
    "another PRD's type: prd and prose are untouched",
  );
});

test("gate-7 CR-3: a legacy PRD above the root that links out of the working tree stops the review", () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), "prd-204-outside-"));
  writeFileSync(path.join(outside, "victim.md"), "# not ours\n");
  const root = tree({ [REG]: registry(1) });
  symlinkSync(path.join(outside, "victim.md"), path.join(root, "docs/prd.md"));
  const n = run(
    NUMBERING(),
    root,
    { PRD_FILE: "docs/prd.md" },
    'echo "AFTER-BLOCK"',
  );
  assert.equal(n.code, 1, n.out);
  assert.match(n.out, /resolves outside the working tree through a symlink/);
  assert.match(n.out, /review stopped/);
  assert.doesNotMatch(n.out, /AFTER-BLOCK|\[Critical\]/);
  rmSync(outside, { recursive: true, force: true });
  // The other direction: a real legacy docs/prd.md is reported, not stopped.
  const plain = tree({ [REG]: registry(1), "docs/prd.md": "# legacy\n" });
  const p = run(NUMBERING(), plain, { PRD_FILE: "docs/prd.md" });
  assert.equal(p.code, 0, p.out);
  assert.match(p.out, /\[Critical\] numbering bad-shape: .*outside docs\/prd/);
});

test("gate-8: the migration guard refuses what the migration cannot carry, names several PRDs, and shows the undo", () => {
  const status = (root) =>
    spawnSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    }).stdout.replace(/^\?\? \.agents\/\n/m, "");
  // CR-2: a PRD with no closed frontmatter block is refused at plan and at apply; nothing moves.
  const bare = tree({
    [REG]: registry(1),
    "docs/prd.md": "# Mono, no frontmatter\n",
  });
  writeFileSync(path.join(bare, ".gitignore"), ".agents/\n");
  gitInit(bare);
  const env = { MIG_NAME: "docs/prd.md=mono" };
  assert.match(
    run(MIG_PLAN(), bare, env).out,
    /✖ blocker no-frontmatter: docs\/prd\.md/,
  );
  const refused = run(MIG_APPLY(), bare, env);
  assert.equal(refused.code, 1, refused.out);
  assert.match(refused.out, /migration not applied .* guard refused it/);
  assert.equal(status(bare), "", "nothing moved");
  const unclosed = tree({
    [REG]: registry(1),
    "docs/prd.md": "---\ntype: prd\n# Mono, fence never closed\n",
  });
  writeFileSync(path.join(unclosed, ".gitignore"), ".agents/\n");
  gitInit(unclosed);
  assert.match(
    run(MIG_PLAN(), unclosed, env).out,
    /✖ blocker no-frontmatter: docs\/prd\.md/,
  );
  // CR-5: a file outside the PRD root naming docs/prd.md would be left dead — refused.
  const linked = tree({
    [REG]: registry(1),
    "docs/prd.md": "---\ntype: prd\n---\n# Mono\n",
    "README.md": "[PRD](docs/prd.md)\n",
  });
  writeFileSync(path.join(linked, ".gitignore"), ".agents/\n");
  gitInit(linked);
  assert.match(
    run(MIG_PLAN(), linked, env).out,
    /✖ blocker outside-links: docs\/prd\.md — mentioned by 1 file\(s\) outside docs\/prd .*README\.md/,
  );
  assert.equal(run(MIG_APPLY(), linked, env).code, 1);
  assert.equal(status(linked), "", "nothing moved; README untouched");
  // CR-3 + CR-4: two unnamed PRDs are both named, one per line; the root index has no domain.
  const two = tree({
    [REG]: registry(1),
    "docs/prd.md": "---\ntype: prd\n---\n# Mono\n",
    "docs/prd/index.md": "---\ntype: prd\n---\n# Index\n",
  });
  writeFileSync(path.join(two, ".gitignore"), ".agents/\n");
  gitInit(two);
  const both = run(MIG_PLAN(), two, {
    MIG_NAME: "docs/prd.md=mono\ndocs/prd/index.md=core",
  });
  assert.doesNotMatch(both.out, /unplaced-prd/);
  assert.match(both.out, /✖ blocker no-domain: docs\/prd\/index\.md/);
  assert.doesNotMatch(both.out, /no-domain: docs\/prd\.md/);
  // CR-1: an apply that fails after moving files shows the engine's findings and its undo command.
  const stub = tree({
    [REG]: registry(1),
    [prdPath(1, "shop")]: prdDoc(1, "shop"),
  });
  rmSync(path.join(stub, ".agents/skills"), { recursive: true, force: true });
  const skillDir = path.join(stub, ".agents/skills/review-prd");
  mkdirSync(path.join(skillDir, "references"), { recursive: true });
  mkdirSync(path.join(skillDir, "scripts"), { recursive: true });
  for (const f of ["resolve-paths.sh"])
    writeFileSync(
      path.join(skillDir, "references", f),
      readFileSync(path.join(REPO, "skills/review-prd/references", f)),
    );
  writeFileSync(
    path.join(skillDir, "scripts/migration-guard.mjs"),
    readFileSync(
      path.join(REPO, "skills/review-prd/scripts/migration-guard.mjs"),
    ),
  );
  writeFileSync(
    path.join(skillDir, "references/migrate-doc-numbering.mjs"),
    `export const inRewriteScope = () => true;
// The guard imports this module for inRewriteScope; only a direct run answers.
const a = process.argv;
if (a[1] && a[1].endsWith("migrate-doc-numbering.mjs")) {
  if (a.includes("--check")) console.log(JSON.stringify({ reason: "needs-migration", blockers: [], mapping: [] }));
  else console.log(JSON.stringify({ reason: "post-check-failed", findings: [{ reason: "frontmatter-mismatch", path: "docs/prd/x.md", detail: "prd_number (missing) ≠ 2" }], revert: "git restore --staged --worktree docs/prd" }));
  process.exitCode = 1;
}
`,
  );
  const failed = run(MIG_APPLY(), stub);
  assert.equal(failed.code, 1, failed.out);
  assert.match(failed.out, /❌ migration: post-check-failed/);
  assert.match(
    failed.out,
    /✖ frontmatter-mismatch: docs\/prd\/x\.md — prd_number \(missing\) ≠ 2/,
  );
  assert.match(failed.out, /undo: git restore --staged --worktree docs\/prd/);
});

test("gate-9/10: outside-links blocks on a mention in the rewrite scope — not in vendored copies or history — fails closed, and a guard usage error is shown", () => {
  const guard = (root, mapping) =>
    spawnSync(
      process.execPath,
      [
        ".agents/skills/review-prd/scripts/migration-guard.mjs",
        "--root",
        "docs/prd",
      ],
      { cwd: root, encoding: "utf8", input: JSON.stringify({ mapping }) },
    );
  const mono = [
    {
      kind: "prd",
      old: "docs/prd.md",
      new: "docs/prd/mono/prd.2.mono/prd.2.mono.md",
    },
  ];
  // CR-1: committed vendored skills that mention docs/prd.md, and prose naming the basename, do
  // not block — nothing there would go dead.
  const quiet = tree({
    [REG]: registry(2),
    "docs/prd.md": "---\ntype: prd\n---\n# Mono\n",
    ".agents/vendored/review-prd/SKILL.md":
      "A root-level `docs/prd.md` is legacy.\n",
    "docs/tasks/task.1.x/task.1.x.md": "History mentions docs/prd.md.\n",
  });
  gitInit(quiet);
  const q = guard(quiet, mono);
  assert.equal(q.status, 0, q.stdout + q.stderr);
  assert.equal(JSON.parse(q.stdout).reason, "ok");
  // The other direction: a README path and a relative link from docs/ both block.
  const linked = tree({
    [REG]: registry(2),
    "docs/prd.md": "---\ntype: prd\n---\n# Mono\n",
    "README.md": "See [the PRD](docs/prd.md).\n",
    "docs/architecture.md": "See [the PRD](prd.md).\n",
  });
  gitInit(linked);
  const l = guard(linked, mono);
  assert.equal(l.status, 1, l.stdout);
  const b = JSON.parse(l.stdout).blockers.find(
    (x) => x.code === "outside-links",
  );
  assert.match(b.detail, /mentioned by 2 file\(s\)/);
  assert.match(b.detail, /README\.md/);
  assert.match(b.detail, /docs\/architecture\.md/);
  // gate-10: fail closed — a prose mention outside history blocks; a non-ASCII file name is read
  // as itself (git grep -z); a long run is no special case (there is no regex scan).
  const prose = tree({
    [REG]: registry(2),
    "docs/prd.md": "---\ntype: prd\n---\n# Mono\n",
    "docs/été.md": "The old prd.md layout.\n",
    "docs/img.md": `The old prd.md layout. ${"A".repeat(200000)}\n`,
  });
  gitInit(prose);
  const pr = guard(prose, mono);
  assert.equal(pr.status, 1, pr.stdout);
  assert.match(pr.stdout, /mentioned by 2 file\(s\)/);
  assert.match(pr.stdout, /docs\/été\.md/);
  // CR-5: a name carrying regex metacharacters still matches its own references.
  const plus = tree({
    [REG]: registry(2),
    "docs/prd+v2.md": "---\ntype: prd\n---\n# Mono\n",
    "README.md": "[x](docs/prd+v2.md)\n",
  });
  gitInit(plus);
  const pl = guard(plus, [
    {
      kind: "prd",
      old: "docs/prd+v2.md",
      new: "docs/prd/mono/prd.2.mono/prd.2.mono.md",
    },
  ]);
  assert.equal(pl.status, 1, pl.stdout);
  assert.match(pl.stdout, /outside-links/);
  // CR-4: a guard usage error reaches the user through the apply block.
  const stub = tree({
    [REG]: registry(1),
    [prdPath(1, "shop")]: prdDoc(1, "shop"),
  });
  rmSync(path.join(stub, ".agents/skills"), { recursive: true, force: true });
  const skillDir = path.join(stub, ".agents/skills/review-prd");
  mkdirSync(path.join(skillDir, "references"), { recursive: true });
  mkdirSync(path.join(skillDir, "scripts"), { recursive: true });
  for (const f of [
    "resolve-paths.sh",
    "migrate-doc-numbering.mjs",
    "doc-id.js",
  ])
    writeFileSync(
      path.join(skillDir, "references", f),
      readFileSync(path.join(REPO, "skills/review-prd/references", f)),
    );
  writeFileSync(
    path.join(skillDir, "scripts/migration-guard.mjs"),
    readFileSync(
      path.join(REPO, "skills/review-prd/scripts/migration-guard.mjs"),
    ),
  );
  // An engine whose --check answers without a plan: the guard refuses with a usage error.
  writeFileSync(
    path.join(skillDir, "references/migrate-doc-numbering.mjs"),
    `export const inRewriteScope = () => true;
if (process.argv.includes("--check")) { process.stdout.write('{"reason":"usage","error":"no git"}\\n'); process.exitCode = 2; }
`,
  );
  const failed = run(MIG_APPLY(), stub);
  assert.equal(failed.code, 1, failed.out);
  assert.match(failed.out, /guard refused it/);
  assert.match(failed.out, /the plan carries no mapping/);
});

test("gate-5 CR-4: shard-prd explodes only a numbered PRD that owns its directory under the root", () => {
  const root = tree({
    [prdPath(3, "shop")]: prdDoc(3, "shop"),
    "docs/prd.md": "# legacy monolith\n",
    "docs/prd/x/prd.x/prd.x.md": "# legacy\n",
  });
  // md-tree, stubbed: it records the arguments it was called with.
  const shimDir = path.join(root, ".shim");
  mkdirSync(shimDir);
  writeFileSync(
    path.join(shimDir, "md-tree"),
    `#!/bin/sh\necho "md-tree $*" >> "${root}/.md-tree-calls"\n`,
  );
  chmodSync(path.join(shimDir, "md-tree"), 0o755);
  const PATHX = `${shimDir}:${path.dirname(process.execPath)}:${process.env.PATH}`;
  for (const file of ["docs/prd.md", "docs/prd/x/prd.x/prd.x.md"]) {
    const r = run(SHARD(), root, { PATH: PATHX, PRD_FILE: file });
    assert.equal(r.code, 1, `${file}: ${r.out}`);
    assert.match(r.out, /is not a numbered PRD in its own directory/, file);
  }
  assert.equal(
    existsSync(path.join(root, ".md-tree-calls")),
    false,
    "nothing exploded",
  );
  const unbound = run(SHARD(), root, { PATH: PATHX, PRD_FILE: "" });
  assert.notEqual(unbound.code, 0, unbound.out);
  assert.match(unbound.out, /bind PRD_FILE/);
  // gate-6 CR-2: a numbered PRD reached through a symlink out of the root gets its own remedy.
  mkdirSync(path.join(root, "outside/prd.4.evil"), { recursive: true });
  writeFileSync(
    path.join(root, "outside/prd.4.evil/prd.4.evil.md"),
    prdDoc(4, "evil"),
  );
  mkdirSync(path.join(root, "docs/prd/evil"), { recursive: true });
  symlinkSync(
    path.join(root, "outside/prd.4.evil"),
    path.join(root, "docs/prd/evil/prd.4.evil"),
  );
  const linked = run(SHARD(), root, {
    PATH: PATHX,
    PRD_FILE: "docs/prd/evil/prd.4.evil/prd.4.evil.md",
  });
  assert.equal(linked.code, 1, linked.out);
  assert.match(linked.out, /resolves outside docs\/prd through a symlink/);
  assert.match(linked.out, /no migration can fix this/);
  assert.doesNotMatch(linked.out, /offers the numbering migration/);
  assert.equal(
    existsSync(path.join(root, ".md-tree-calls")),
    false,
    "nothing exploded through the link",
  );
  // gate-7 CR-2: a linked directory holding a link back to a real PRD inside the root passes a
  // file-only check; the directory md-tree writes into is checked too.
  mkdirSync(path.join(root, "outside/prd.3.shop"), { recursive: true });
  symlinkSync(
    path.join(root, prdPath(3, "shop")),
    path.join(root, "outside/prd.3.shop/prd.3.shop.md"),
  );
  mkdirSync(path.join(root, "docs/prd/mall"), { recursive: true });
  symlinkSync(
    path.join(root, "outside/prd.3.shop"),
    path.join(root, "docs/prd/mall/prd.3.shop"),
  );
  const backLinked = run(SHARD(), root, {
    PATH: PATHX,
    PRD_FILE: "docs/prd/mall/prd.3.shop/prd.3.shop.md",
  });
  assert.equal(backLinked.code, 1, backLinked.out);
  assert.match(backLinked.out, /resolves outside docs\/prd through a symlink/);
  assert.equal(
    existsSync(path.join(root, ".md-tree-calls")),
    false,
    "nothing exploded into the linked directory",
  );
  const ok = run(SHARD(), root, { PATH: PATHX, PRD_FILE: prdPath(3, "shop") });
  assert.equal(ok.code, 0, ok.out);
  assert.equal(
    readFileSync(path.join(root, ".md-tree-calls"), "utf8").trim(),
    `md-tree explode ${prdPath(3, "shop")} docs/prd/shop/prd.3.shop`,
  );
});
