/**
 * Tests for agent-reply-block.js (task 269, obs #65, #136, #142).
 *
 * The property under test: a fenced block in a subagent's reply reaches a file byte for byte, so the
 * seven characters a hand copy loses (U+0085, U+2028, U+2029, VT, FF, U+001F, a lone CR) arrive as
 * the agent wrote them, and an escaped reply is refused rather than written.
 *
 * Run: CI=true node --test shared/resources/tests/agent-reply-block.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const MOD = join(HERE, "..", "agent-reply-block.js");
const arb = require(MOD);

const CONTROLS = ["\u0085", " ", " ", "\u000b", "\u000c", "\u001f"];

function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "arb-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A transcript file whose last turn is `reply` (split over two assistant lines, as the host does). */
function transcript(
  dir,
  id,
  reply,
  { root = "projects", session = "s1" } = {},
) {
  const d = join(dir, root, "p", session, "subagents");
  mkdirSync(d, { recursive: true });
  // Split at a line boundary, as the host does: a mid-line split would be joined with "\n" and differ.
  const cut = reply.indexOf("\n", Math.floor(reply.length / 2));
  const half = cut === -1 ? reply.length : cut;
  const rest = cut === -1 ? "" : reply.slice(cut + 1);
  const rows = [
    { type: "user", message: { role: "user", content: "task" } },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "thinking aloud" }],
      },
    },
    {
      type: "user",
      message: { role: "user", content: [{ type: "tool_result" }] },
    },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text: reply.slice(0, half) }],
      },
    },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text: rest }],
      },
    },
    // The host writes metadata lines after a turn (T269-QA-5): they are not a turn boundary.
    { type: "attachment", attachment: { type: "x" } },
    { type: "api-request", n: 1 },
  ];
  const f = join(d, `agent-${id}.jsonl`);
  writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return f;
}

test("extract: all seven characters a hand copy loses reach the file as the agent wrote them", () =>
  withDir((dir) => {
    // A lone CR inside the block, the six others, and a CRLF-free body so the lone CR is unambiguous.
    const body = `[{"id":"c1","input":"a${CONTROLS.join("|")}|b\rc"}]`;
    transcript(
      dir,
      "x1",
      "intro\n```finalise-probe-plan\n" + body + "\n```\nbye\n",
    );
    const out = join(dir, "plan.json");
    const r = arb.extract({
      agentId: "x1",
      block: "finalise-probe-plan",
      out,
      projectsRoot: join(dir, "projects"),
    });
    assert.equal(r.reason, "extracted");
    const got = readFileSync(out);
    assert.deepEqual(got, Buffer.from(body + "\n", "utf8"));
    for (const ch of CONTROLS) assert.ok(got.toString("utf8").includes(ch));
    assert.ok(got.toString("utf8").includes("b\rc"), "the lone CR is kept");
    assert.equal(r.bytes, got.length);
    assert.equal(r.sha256, arb.sha256(got));
  }));

test("extract: the LAST block with the info string wins, and a different info string is ignored", () =>
  withDir((dir) => {
    transcript(
      dir,
      "x2",
      "```finalise-ac-yaml\nquoted: example\n```\ntext\n```yaml\nother: 1\n```\n```finalise-ac-yaml\nreal: 1\n```\n",
    );
    const out = join(dir, "o.yaml");
    const r = arb.extract({
      agentId: "x2",
      block: "finalise-ac-yaml",
      out,
      projectsRoot: join(dir, "projects"),
    });
    assert.equal(r.reason, "extracted");
    assert.equal(readFileSync(out, "utf8"), "real: 1\n");
  }));

test("extract: an escaped block is refused and writes nothing; the same text with a literal < is accepted (control)", () =>
  withDir((dir) => {
    const root = join(dir, "projects");
    const out = join(dir, "o.json");
    transcript(
      dir,
      "e1",
      '```finalise-probe-plan\n[{"i":"&lt;!-- matrix-start --&gt;"}]\n```\n',
    );
    const bad = arb.extract({
      agentId: "e1",
      block: "finalise-probe-plan",
      out,
      projectsRoot: root,
    });
    assert.equal(bad.reason, "entity-escaped");
    assert.equal(
      existsSync(out),
      false,
      "nothing is written for an escaped reply",
    );
    // Control: an entity carried on purpose beside a literal < is the agent's own text.
    transcript(
      dir,
      "e2",
      '```finalise-probe-plan\n[{"i":"<b>","e":"&lt;"}]\n```\n',
    );
    const ok = arb.extract({
      agentId: "e2",
      block: "finalise-probe-plan",
      out,
      projectsRoot: root,
    });
    assert.equal(ok.reason, "extracted");
  }));

test("extract: named answers for a transcript it cannot use, never a guess", () =>
  withDir((dir) => {
    const root = join(dir, "projects");
    const base = {
      block: "finalise-ac-yaml",
      out: join(dir, "o"),
      projectsRoot: root,
    };
    assert.equal(
      arb.extract({ ...base, agentId: "none" }).reason,
      "transcript-not-found",
    );
    transcript(dir, "dup", "```finalise-ac-yaml\na: 1\n```\n", {
      session: "s1",
    });
    transcript(dir, "dup", "```finalise-ac-yaml\na: 1\n```\n", {
      session: "s2",
    });
    assert.equal(
      arb.extract({ ...base, agentId: "dup" }).reason,
      "transcript-ambiguous",
    );
    transcript(dir, "nb", "no fence at all\n");
    assert.equal(arb.extract({ ...base, agentId: "nb" }).reason, "no-block");
    transcript(dir, "em", "```finalise-ac-yaml\n\n```\n");
    assert.equal(arb.extract({ ...base, agentId: "em" }).reason, "empty-block");
    const junk = join(dir, "junk.jsonl");
    writeFileSync(junk, "not json\n");
    assert.equal(
      arb.extract({ ...base, transcript: junk }).reason,
      "transcript-unreadable",
    );
    assert.equal(existsSync(join(dir, "o")), false);
  }));

test("extract: only the final turn is read — a block quoted in an earlier turn does not run", () =>
  withDir((dir) => {
    const d = join(dir, "projects", "p", "s", "subagents");
    mkdirSync(d, { recursive: true });
    const rows = [
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "```finalise-ac-yaml\nold: 1\n```" }],
        },
      },
      {
        type: "user",
        message: { role: "user", content: [{ type: "tool_result" }] },
      },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "no block now" }],
        },
      },
    ];
    writeFileSync(
      join(d, "agent-t1.jsonl"),
      rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
    const r = arb.extract({
      agentId: "t1",
      block: "finalise-ac-yaml",
      out: join(dir, "o"),
      projectsRoot: join(dir, "projects"),
    });
    assert.equal(r.reason, "no-block");
  }));

// ---- task 327: the SubagentHandback reply shape, and a cleared --out ----

/** A transcript file made of exactly `rows`, one JSON line each. */
function rowsTranscript(dir, id, rows) {
  const d = join(dir, "projects", "p", "s", "subagents");
  mkdirSync(d, { recursive: true });
  const f = join(d, `agent-${id}.jsonl`);
  writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return f;
}
const asst = (content) => ({
  type: "assistant",
  message: { role: "assistant", content },
});
const text = (t) => ({ type: "text", text: t });
const handback = (message, name = "SubagentHandback") => ({
  type: "tool_use",
  id: "toolu_1",
  name,
  input: { message },
});
const toolResult = {
  type: "user",
  message: { role: "user", content: [{ type: "tool_result" }] },
};
const attachment = { type: "attachment", attachment: { type: "x" } };
const fenced = (body) => "```finalise-ac-yaml\n" + body + "\n```\n";
function run327(dir, id, rows, extra = {}) {
  rowsTranscript(dir, id, rows);
  const out = join(dir, `${id}.yaml`);
  const r = arb.extract({
    agentId: id,
    block: "finalise-ac-yaml",
    out,
    projectsRoot: join(dir, "projects"),
    ...extra,
  });
  return { r, out };
}

test("task 327: a hand-back-only transcript (the measured host shape) is extracted byte for byte", () =>
  withDir((dir) => {
    const body = `ac: "a${CONTROLS.join("|")}|b\rc"`;
    const { r, out } = run327(dir, "h1", [
      { type: "user", message: { role: "user", content: "task" } },
      asst([{ type: "thinking", thinking: "…" }]),
      asst([handback("Done.\n" + fenced(body))]),
      toolResult,
      attachment,
    ]);
    assert.equal(r.reason, "extracted");
    assert.equal(r.reply, "handback");
    const got = readFileSync(out);
    assert.deepEqual(got, Buffer.from(body + "\n", "utf8"));
    for (const ch of CONTROLS) assert.ok(got.toString("utf8").includes(ch));
    assert.ok(got.toString("utf8").includes("b\rc"), "the lone CR is kept");
    assert.equal(r.sha256, arb.sha256(got));
  }));

test("task 327: a final-turn text reply (control) answers extracted with reply: text and the same bytes", () =>
  withDir((dir) => {
    const { r, out } = run327(dir, "c1", [
      { type: "user", message: { role: "user", content: "task" } },
      asst([text("here\n" + fenced("t: 1"))]),
    ]);
    assert.equal(r.reason, "extracted");
    assert.equal(r.reply, "text");
    assert.equal(readFileSync(out, "utf8"), "t: 1\n");
  }));

test("task 327: of a text reply and a hand-back, the later one wins — text after hand-back", () =>
  withDir((dir) => {
    const { r, out } = run327(dir, "o1", [
      asst([handback(fenced("old: handback"))]),
      toolResult,
      asst([text(fenced("new: text"))]),
    ]);
    assert.equal(r.reason, "extracted");
    assert.equal(r.reply, "text");
    assert.equal(readFileSync(out, "utf8"), "new: text\n");
  }));

test("task 327: of a text reply and a hand-back, the later one wins — hand-back after text", () =>
  withDir((dir) => {
    const { r, out } = run327(dir, "o2", [
      asst([text(fenced("old: text"))]),
      toolResult,
      asst([handback(fenced("new: handback"))]),
      toolResult,
      attachment,
    ]);
    assert.equal(r.reason, "extracted");
    assert.equal(r.reply, "handback");
    assert.equal(readFileSync(out, "utf8"), "new: handback\n");
  }));

test("task 327: a text block and a hand-back in ONE message — the hand-back, the later block, wins", () =>
  withDir((dir) => {
    const { r, out } = run327(dir, "o3", [
      asst([text(fenced("same: text")), handback(fenced("same: handback"))]),
      toolResult,
    ]);
    assert.equal(r.reason, "extracted");
    assert.equal(r.reply, "handback");
    assert.equal(readFileSync(out, "utf8"), "same: handback\n");
  }));

test("task 327: a block only in an earlier hand-back, then a text turn with no block, answers no-block", () =>
  withDir((dir) => {
    const { r, out } = run327(dir, "e1", [
      asst([handback(fenced("old: 1"))]),
      toolResult,
      asst([text("no block now")]),
    ]);
    assert.equal(r.reason, "no-block");
    assert.equal(existsSync(out), false);
  }));

test("task 327: a tool_use of another name is never read as a reply", () =>
  withDir((dir) => {
    const { r } = run327(dir, "n1", [
      asst([handback(fenced("not: a reply"), "Read")]),
      toolResult,
    ]);
    assert.equal(r.reason, "transcript-unreadable");
  }));

test("task 327: a hand-back whose message is empty or not a string answers transcript-unreadable", () =>
  withDir((dir) => {
    for (const [id, m] of [
      ["m1", ""],
      ["m2", 42],
      ["m3", null],
      ["m4", { text: fenced("x: 1") }],
    ]) {
      const { r } = run327(dir, id, [asst([handback(m)]), toolResult]);
      assert.equal(
        r.reason,
        "transcript-unreadable",
        `message ${JSON.stringify(m)}`,
      );
    }
  }));

test("task 327: after any answer but extracted, no file is left at --out, even a stale one", () =>
  withDir((dir) => {
    const out = join(dir, "stale.yaml");
    const root = join(dir, "projects");
    const cases = [
      [
        "no-block",
        () =>
          rowsTranscript(dir, "s1", [asst([text("none")])]) && {
            agentId: "s1",
          },
      ],
      ["transcript-not-found", () => ({ agentId: "missing" })],
      [
        "transcript-unreadable",
        () => {
          const f = join(dir, "junk.jsonl");
          writeFileSync(f, "not json\n");
          return { transcript: f };
        },
      ],
    ];
    for (const [want, setup] of cases) {
      writeFileSync(out, "run 1's 7-entry plan\n");
      const r = arb.extract({
        block: "finalise-ac-yaml",
        out,
        projectsRoot: root,
        ...setup(),
      });
      assert.equal(r.reason, want);
      assert.equal(existsSync(out), false, `${want} leaves no --out file`);
    }
  }));

test("task 327: an --out that names the --transcript file is a usage error and the transcript survives", () =>
  withDir((dir) => {
    const f = rowsTranscript(dir, "same", [asst([text(fenced("a: 1"))])]);
    const before = readFileSync(f);
    const r = spawnSync(
      process.execPath,
      [
        MOD,
        "extract",
        "--transcript",
        f,
        "--block",
        "finalise-ac-yaml",
        "--out",
        f,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(r.status, 2);
    assert.match(r.stdout, /--out must not be the --transcript file/);
    assert.deepEqual(readFileSync(f), before);
    // A direct caller skips the CLI's usage check: extract itself must not delete its own input.
    arb.extract({ transcript: f, block: "finalise-ac-yaml", out: f });
    assert.equal(
      existsSync(f),
      true,
      "extract never removes the transcript it reads",
    );
  }));

test("CLI: an agent id that is a path, or both sources, or no block name, is a usage error (exit 2)", () => {
  const run = (a) =>
    spawnSync(process.execPath, [MOD, "extract", ...a], { encoding: "utf8" });
  assert.equal(
    run(["--agent-id", "../../etc", "--block", "b", "--out", "o"]).status,
    2,
  );
  assert.equal(
    run(["--agent-id", "a", "--transcript", "t", "--block", "b", "--out", "o"])
      .status,
    2,
  );
  assert.equal(run(["--agent-id", "a", "--out", "o"]).status, 2);
  assert.equal(run([]).status, 2);
});
