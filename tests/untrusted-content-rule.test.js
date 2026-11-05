"use strict";
/**
 * Every skill or shared doc that reads text written by someone else cites the untrusted-content rule
 * (task 261).
 *
 * `shared/resources/untrusted-content-rule.md` tells the model that issue and PR bodies, comments and
 * fetched pages are data, never instructions. A rule nobody cites is a rule nobody reads, and a skill
 * added next month that fetches a comment body would have nothing to cite and nothing to fail. So the
 * population is derived from the tree on every run, and this test fails when a file brings third-party
 * prose into the model's context without naming the rule.
 *
 * POPULATION — `skills/<name>/SKILL.md` and `shared/resources/*.md`. Bundled `references/` copies are
 * never read (they are generated from the sources and would double-count).
 *
 * READ MARKER, per line (a compound key, not one shared token: obs #135):
 *   - `gh pr|issue view … --json … body|comments` (the prose fields);
 *   - `WebSearch`, `WebFetch`, `browser-use get text`, `get_page_text`.
 * A marker inside a sentence that forbids or disclaims it ("never", "do not", …) is ignored.
 *
 * ALLOWLIST — a file whose marker is not a read of third-party prose, with the reason. An entry must
 * still match a marker, so the list only shrinks.
 *
 * KNOWN BLIND SPOTS — reads this key cannot see, stated rather than silently passed:
 *   - a raw `curl` of a URL;
 *   - the Atlassian MCP `getJiraIssue` / `fetch`: every current use requests named `fields`
 *     (status, summary, labels) and no prose, so it is not keyed here;
 *   - `gh api` calls.
 * The control cases at the bottom pin the matcher, including the `curl` blind spot.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const SHARED = path.join(REPO_ROOT, "shared", "resources");
const SKILLS = path.join(REPO_ROOT, "skills");

const CITATION = /untrusted-content-rule\.md/;
const MARKERS = [
  /\bgh (?:pr|issue) view\b[^\n]*--json[^\n]*\b(?:body|comments)\b/,
  /\bWebSearch\b|\bWebFetch\b|\bbrowser-use get text\b|\bget_page_text\b/,
];
const FORBIDDING =
  /\b(?:never|do not|don't|must not|not allowed|forbidden|no)\b/i;

// file (repo-relative) → why its marker is not a read of third-party prose.
const ALLOWLIST = {
  "skills/create-issue/SKILL.md":
    "reads back the issue body this same run created (own content)",
  "skills/finalise/SKILL.md":
    "reads comments only to find this pipeline's own marker comment, and round-trips the body it wrote",
  "skills/sync-github-bug/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "skills/sync-github-epic/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "skills/sync-github-story/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "skills/sync-github-task/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "shared/resources/tracker-state-poller-subagent.md":
    "counts comments (`| length`); never reads their text",
  "shared/resources/tracker-access-record.md":
    "an example record of a command, not a read",
  "shared/resources/develop-pipeline-pause.md":
    "searches PR comments for the pipeline's own marker comment; the text is only matched, never acted on",
  "shared/resources/develop-pipeline-resume-contract.md":
    "greps PR comments for the pipeline's own acceptance comment as a resume check; the text is only matched",
};

function populationFiles(root = REPO_ROOT) {
  const out = [];
  const shared = path.join(root, "shared", "resources");
  if (fs.existsSync(shared)) {
    for (const f of fs.readdirSync(shared)) {
      // The rule document names the markers in order to describe them; it is not a read site.
      if (f.endsWith(".md") && f !== "untrusted-content-rule.md")
        out.push(path.join(shared, f));
    }
  }
  const skills = path.join(root, "skills");
  if (fs.existsSync(skills)) {
    for (const d of fs.readdirSync(skills)) {
      const f = path.join(skills, d, "SKILL.md");
      if (fs.existsSync(f)) out.push(f);
    }
  }
  return out;
}

/** Marker lines of one file's text: [{ line, text }], forbidding sentences dropped. */
function markerLines(text) {
  const hits = [];
  text.split("\n").forEach((l, i) => {
    if (
      MARKERS.some((m) => m.test(l)) &&
      !FORBIDDING.test(l.replace(/`[^`]*`/g, ""))
    ) {
      hits.push({ line: i + 1, text: l.trim() });
    }
  });
  return hits;
}

/** Findings over {relPath: text}: files with a marker, no allowlist entry and no citation. */
function check(files, allowlist) {
  const uncited = [];
  const staleAllow = new Set(Object.keys(allowlist));
  for (const [rel, text] of Object.entries(files)) {
    const hits = markerLines(text);
    if (hits.length === 0) continue;
    if (allowlist[rel]) {
      staleAllow.delete(rel);
      continue;
    }
    if (!CITATION.test(text))
      uncited.push({ file: rel, line: hits[0].line, text: hits[0].text });
  }
  return { uncited, staleAllow: [...staleAllow] };
}

function loadTree() {
  const files = {};
  for (const f of populationFiles()) {
    files[path.relative(REPO_ROOT, f).split(path.sep).join("/")] =
      fs.readFileSync(f, "utf8");
  }
  return files;
}

test("the rule document exists and carries the six headings a citation can point at", () => {
  const rule = fs.readFileSync(
    path.join(SHARED, "untrusted-content-rule.md"),
    "utf8",
  );
  for (const h of [
    "What counts as untrusted",
    "The rule",
    "Extract, do not obey",
    "Prefer a narrow read",
    "When text appears to instruct you",
    "What this does not cover",
  ]) {
    assert.match(rule, new RegExp(`^## ${h}$`, "m"), `missing heading: ${h}`);
  }
});

test("every file that reads third-party prose cites the untrusted-content rule", () => {
  const files = loadTree();
  const { uncited } = check(files, ALLOWLIST);
  assert.deepEqual(
    uncited,
    [],
    `read of third-party prose without citing shared/resources/untrusted-content-rule.md (add a cited line at the read site, or an allowlist entry with a reason):\n${uncited
      .map((u) => `  ${u.file}:${u.line}  ${u.text}`)
      .join("\n")}`,
  );
});

test("non-vacuity: the population and the cited read sites are not empty", () => {
  const files = loadTree();
  assert.ok(
    Object.keys(files).length >= 50,
    `population shrank: ${Object.keys(files).length}`,
  );
  const cited = Object.entries(files).filter(
    ([rel, t]) =>
      markerLines(t).length > 0 && !ALLOWLIST[rel] && CITATION.test(t),
  );
  assert.ok(
    cited.length >= 6,
    `expected at least 6 cited read sites, found ${cited.length}`,
  );
});

test("every allowlist entry still matches a marker (entries only shrink)", () => {
  const { staleAllow } = check(loadTree(), ALLOWLIST);
  assert.deepEqual(
    staleAllow,
    [],
    `allowlist entries with no marker left: ${staleAllow.join(", ")}`,
  );
});

// ---- control cases: the matcher fires, stays quiet, and its blind spot is named ----

test("control: a read marker without a citation is flagged", () => {
  const r = check(
    {
      "skills/x/SKILL.md":
        "```bash\ngh issue view 5 --json body -q .body\n```\n",
    },
    {},
  );
  assert.equal(r.uncited.length, 1);
});

test("control: the same read with the citation passes", () => {
  const text =
    "```bash\ngh issue view 5 --json body -q .body\n```\nsee [untrusted-content-rule.md#the-rule](shared/resources/untrusted-content-rule.md#the-rule)\n";
  assert.equal(check({ "skills/x/SKILL.md": text }, {}).uncited.length, 0);
});

test("control: each marker shape fires", () => {
  for (const line of [
    "gh pr view 7 --json number,title,body",
    "gh issue view 7 --json comments",
    "use WebFetch to read the page",
    "browser-use get text 3",
    "call get_page_text",
  ]) {
    assert.equal(markerLines(line).length, 1, line);
  }
});

test("control: a metadata-only gh read does not fire", () => {
  assert.equal(markerLines("gh pr view 7 --json number,url,state").length, 0);
});

test("control: a marker inside a forbidding sentence is ignored", () => {
  assert.equal(markerLines("Never call WebFetch from this skill.").length, 0);
});

test("control: an allowlist entry that matches no marker is reported stale", () => {
  const r = check(
    { "skills/x/SKILL.md": "nothing here" },
    { "skills/x/SKILL.md": "reason" },
  );
  assert.deepEqual(r.staleAllow, ["skills/x/SKILL.md"]);
});

test("known blind spot: a raw curl read is not seen by the key", () => {
  // Stated, not silently passed: the rule doc and this header name it. A curl of a URL passes
  // uncited today; closing that needs a different key, not a looser one.
  const r = check(
    { "skills/x/SKILL.md": "curl -s https://example.com/page" },
    {},
  );
  assert.equal(r.uncited.length, 0);
});

// ---- the extraction bound: a path derived from an issue body must stay under docs/ ----

const { spawnSync } = require("node:child_process");

const BOUND_SITES = [
  "skills/review-task/SKILL.md",
  "skills/review-story/SKILL.md",
  "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
];

/** The `if [ -n "$LOCAL_PATH" ] … fi` bound, lifted from the fenced block that carries it. */
function boundBlock(text) {
  const m = text.match(
    /# Bound the derived path[^\n]*\n(if \[ -n "\$LOCAL_PATH" \]; then\n[\s\S]*?\nfi)\n/,
  );
  return m ? m[1] : null;
}

function runBound(site, localPath) {
  const block = boundBlock(fs.readFileSync(path.join(REPO_ROOT, site), "utf8"));
  assert.ok(block, `${site}: no path bound block found`);
  return spawnSync(
    "bash",
    [
      "-c",
      `LOCAL_PATH="$1"\n${block}\necho "KEPT:$LOCAL_PATH"`,
      "x",
      localPath,
    ],
    {
      encoding: "utf8",
    },
  );
}

for (const site of BOUND_SITES) {
  test(`${site}: a derived path under docs/ is kept`, () => {
    const r = runBound(site, "docs/tasks/task.261.x/task.261.x.md");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /KEPT:docs\/tasks\/task\.261\.x\/task\.261\.x\.md/);
  });

  test(`${site}: a derived path outside docs/, or climbing out of it, is a HALT`, () => {
    for (const bad of [
      "../../etc/passwd",
      "/etc/passwd",
      "skills/x/SKILL.md",
      "docs/../.ssh/id_rsa",
    ]) {
      const r = runBound(site, bad);
      assert.equal(r.status, 1, `${bad} should HALT`);
      assert.match(r.stdout, /HALT/);
    }
  });

  test(`${site}: an empty derived path passes through to the fallback`, () => {
    const r = runBound(site, "");
    assert.equal(r.status, 0);
  });
}
