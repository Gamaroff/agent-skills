# Target types

Decide the target type first, and say why in the report. The type decides which principles apply and what each one means. Without this step a prompt library is marked down for lacking a vector database.

## How to decide

| Signal | Type |
|---|---|
| Mostly prompts, skills, instruction files and scripts that drive an agent; no end users of its own | Prompt/skill library |
| A running assistant or chatbot with end users, a model call in its request path | Deployed assistant |
| Code that other teams build agents on (SDK, orchestration, tool-calling layer) | Agent framework |
| An ordinary product with one AI-powered feature | Product feature |

If two fit, pick the one that describes who the users are, and note the other.

## What each principle means per type

| Principle | Prompt/skill library | Deployed assistant | Agent framework | Product feature |
|---|---|---|---|---|
| 1. Prompt and change control | Instruction files, skill frontmatter, who may change them, checks on edits | System prompt, its location, review and release of changes | Default prompts it ships, how consumers override them | The feature's prompt, its review path |
| 2. Grounding | How prompts obtain ground-truth context (shared docs, bundling, drift checks) | Retrieval over owned documents | The retrieval and memory interfaces it offers | The context the feature feeds the model |
| 3. Tools | Wrapper scripts and CLIs the agent calls, idempotency, fakes | Tool and MCP calls, idempotent writes | The tool-calling layer and its retry rules | Functions the model may call |
| 4. Access control | What the agent is permitted to do (permission modes, allowlists, credential handling) | End-user identity passed into every tool call | The identity and permission hooks it offers | The feature's authorisation model |
| 5. Guardrails | Rule that third-party text is data; secret scanning; input filters | Injection detection, input filters, PII masking | Hooks for filters and masking it offers | Filters on what reaches and leaves the model |
| 6. Cost and routing | Loop limits, cheap modes, model choice per step, caching | Caching and routing per request | Routing and cache controls it exposes | Per-call budgets, caching |
| 7. Observability | Per-run state, decision logs, metrics | Traces, logs, prompt and tool records | Tracing hooks and export | Logs tying an answer to its inputs |
| 8. Evals before change | Tests and evals that run when prompts change | Eval suite gating prompt and model changes | Eval harness it ships, its own tests | Evals on the feature's prompts |

## Not applicable

Mark a principle `Not applicable` only when the cell above cannot be filled for the target at all, and give that reason. A principle that applies but is unmet is a `Gap`, never `Not applicable`.
