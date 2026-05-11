import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapDriver } from "../lib/pipeline-recorder.mjs";

function makeStubDriver(toolEvents = []) {
  return {
    name: "stub",
    async isAvailable() { return { ok: true }; },
    async run(ctx) {
      for (const e of toolEvents) {
        ctx.onToolUse?.(e);
      }
      return { remainingAnswers: [] };
    },
  };
}

test("wrapDriver: returns driver and empty events array", () => {
  const { driver, events } = wrapDriver(makeStubDriver());
  assert.ok(typeof driver.run === "function");
  assert.deepEqual(events, []);
});

test("wrapDriver: records Skill tool-use events in order", async () => {
  const toolEvents = [
    { tool: "Skill", input: { skill: "create-branch", args: "task.42" } },
    { tool: "Skill", input: { skill: "review-task", args: undefined } },
    { tool: "Bash",  input: { command: "ls" } }, // non-Skill should be ignored
    { tool: "Skill", input: { skill: "develop", args: "task.42.md" } },
  ];

  const { driver, events } = wrapDriver(makeStubDriver(toolEvents));
  const ctx = { sandbox: "/tmp/test", onToolUse: undefined };
  await driver.run(ctx);

  assert.equal(events.length, 3);
  assert.equal(events[0].skill, "create-branch");
  assert.equal(events[1].skill, "review-task");
  assert.equal(events[2].skill, "develop");
  assert.ok(events.every(e => e.status === "started"));
  assert.ok(events.every(e => typeof e.timestamp === "number"));
});

test("wrapDriver: forwards onToolUse to original handler", async () => {
  const seen = [];
  const toolEvents = [{ tool: "Skill", input: { skill: "qa-task" } }];
  const { driver, events } = wrapDriver(makeStubDriver(toolEvents));
  const ctx = { sandbox: "/tmp/x", onToolUse: (e) => seen.push(e) };
  await driver.run(ctx);

  assert.equal(events.length, 1);
  assert.equal(seen.length, 1); // original handler also fired
});

test("wrapDriver: handles missing input gracefully", async () => {
  const toolEvents = [{ tool: "Skill" }]; // no input field
  const { driver, events } = wrapDriver(makeStubDriver(toolEvents));
  await driver.run({ sandbox: "/tmp/x" });
  assert.equal(events.length, 1);
  assert.equal(events[0].skill, "(unknown)");
});

test("wrapDriver: isAvailable delegates to wrapped driver", async () => {
  const { driver } = wrapDriver(makeStubDriver());
  const result = await driver.isAvailable();
  assert.ok(result.ok);
});
