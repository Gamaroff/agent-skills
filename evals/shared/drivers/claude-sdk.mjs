"use strict";
/**
 * claude-sdk driver — programmatic invocation via @anthropic-ai/claude-agent-sdk.
 *
 * Live evals: feeds the scenario prompt to query(), intercepts AskUserQuestion
 * via canUseTool by matching question text against the scripted answer queue
 * (regex on `matches`). Records remaining answers so answerQueueDrained
 * assertions can flag missing prompts.
 *
 * The skill itself is staged into <sandbox>/.claude/skills/<skill>/ before
 * the agent boots, so the cli/SDK skill loader discovers it as a
 * project-scoped skill.
 *
 * Available iff:
 *   1. @anthropic-ai/claude-agent-sdk is installed
 *   2. ANTHROPIC_API_KEY is set in the environment
 *
 * @type {import("./types.mjs").AgentDriver}
 */
import fs from "node:fs";
import path from "node:path";

function copyTree(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

function installSkill(sandbox, skill, skillRoot) {
  if (!skill || !skillRoot || !fs.existsSync(skillRoot)) return;
  const dst = path.join(sandbox, ".claude", "skills", skill);
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (entry.name === "tests") continue;
    const s = path.join(skillRoot, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

const driver = {
  name: "claude-sdk",

  async isAvailable() {
    try {
      await import("@anthropic-ai/claude-agent-sdk");
    } catch {
      return {
        ok: false,
        reason: "@anthropic-ai/claude-agent-sdk not installed (npm i -D @anthropic-ai/claude-agent-sdk)",
      };
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, reason: "ANTHROPIC_API_KEY not set" };
    }
    return { ok: true };
  },

  async run(ctx) {
    const { query } = await import("@anthropic-ai/claude-agent-sdk");
    installSkill(ctx.sandbox, ctx.skill, ctx.skillRoot);

    // Mutable copy — entries are spliced out as scripted answers fire.
    const remaining = ctx.answers.slice();

    function findAnswerFor(questionText) {
      const idx = remaining.findIndex(a => new RegExp(a.matches, "i").test(questionText));
      if (idx < 0) return null;
      const [hit] = remaining.splice(idx, 1);
      return hit.answer;
    }

    const systemPrompt =
      `You are running inside an automated eval sandbox. The target skill ` +
      `is "${ctx.skill}" — its SKILL.md is staged at .claude/skills/${ctx.skill}/SKILL.md. ` +
      `Load it and execute its protocol. Do NOT ask for confirmation beyond ` +
      `the prompts the protocol mandates. Treat DRY_RUN=1 as "do not call ` +
      `real tracker APIs — write a payload JSON to .eval/tracker-payload.json instead".`;

    const q = query({
      prompt: ctx.prompt,
      options: {
        model: "sonnet",
        cwd: ctx.sandbox,
        systemPrompt,
        permissionMode: "bypassPermissions",
        maxTurns: 30,
        canUseTool: async (toolName, input) => {
          if (toolName !== "AskUserQuestion") {
            return { behavior: "allow", updatedInput: input };
          }
          const questions = input.questions || [];
          const answers = {};
          for (const qn of questions) {
            const a = findAnswerFor(qn.question);
            // If no scripted match, pick the first option (recommended).
            answers[qn.question] = a || (qn.options[0] && qn.options[0].label) || "";
          }
          return { behavior: "allow", updatedInput: { questions, answers } };
        },
      },
    });

    // Drain the message stream. We only inspect for errors; assertions
    // run against the artefacts the agent wrote to ctx.sandbox.
    for await (const msg of q) {
      if (msg.type === "result" && msg.subtype !== "success") {
        throw new Error(`claude-sdk query failed: ${msg.subtype} — ${msg.error || "unknown"}`);
      }
    }

    return { remainingAnswers: remaining };
  },
};

export default driver;
