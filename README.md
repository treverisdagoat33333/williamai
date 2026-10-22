# williamAI
Frontend (public/index.html) + Node backend (server.js) + WilliamCore brain (engine.js) + Qwen language layer (llm.js, core.js).
Run: `npm start` then open http://localhost:3000
API: POST /api/chat {text,sid} -> {out,skill,conf} | GET /api/health
Teach him: `teach: question => answer` (saved to data/learned.json)

## How the brain and Qwen fit together
WilliamCore always runs first. Exact skills (tools, math, code generation, code analyzer, follow-ups, teach) are answered by the brain and never handed to the LLM.
When the brain is unsure, Qwen answers, grounded in the closest things the brain knows (its "brain notes") plus the last few turns of the conversation.
If the LLM is down or slow, williamAI silently falls back to the brain's own answer. With no LLM configured it behaves exactly as before (zero dependencies, no keys).

## Connect Qwen (any OpenAI-compatible endpoint)
Environment variables:
- `LLM_BASE_URL`  endpoint ending in /v1 (required to enable the LLM)
- `LLM_API_KEY`   key for hosted providers (not needed for local Ollama)
- `LLM_MODEL`     model name as the provider spells it
- `LLM_MODE`      `fallback` (default: Qwen only when the brain is unsure), `always` (Qwen phrases every knowledge answer using the brain's answer as a fact), `off`
- `LLM_TEMPERATURE` (0.5), `LLM_MAX_TOKENS` (700), `LLM_TIMEOUT_MS` (30000)

Examples (check each provider's docs for current model names):
- Ollama (local): `LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:7b-instruct`
- OpenRouter: `LLM_BASE_URL=https://openrouter.ai/api/v1 LLM_API_KEY=... LLM_MODEL=qwen/qwen-2.5-72b-instruct`
- Together: `LLM_BASE_URL=https://api.together.xyz/v1 LLM_API_KEY=... LLM_MODEL=Qwen/Qwen2.5-72B-Instruct-Turbo`
- Alibaba DashScope: `LLM_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1 LLM_API_KEY=... LLM_MODEL=qwen-plus`

Check `/api/health` to confirm: it shows the LLM mode, model and host (never the key).
Deploy: push to GitHub, create a Render Web Service, start: `npm start`, and set the LLM_* variables in Render (Render's free plan cannot run Ollama, so use a hosted provider there).
