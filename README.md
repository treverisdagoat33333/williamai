# williamAI
Frontend (public/index.html) + Node backend (server.js) + WilliamCore brain (engine.js) + Qwen language layer (llm.js, core.js) + storage (store.js).
Zero npm dependencies. Node 18+ (22 recommended).

Run: `npm start` then open http://localhost:3000
API: `POST /api/chat {text,sid,stream?}` -> `{out,skill,conf}` (with `stream:true` it replies as server-sent events: `{delta}` ... `{done,out,skill,conf}`) | `POST /api/feedback` | `GET /api/health` | `GET /admin?key=ADMIN_KEY`
Teach him by hand: `teach: question => answer`
Tests: `npm test` (10 end-to-end tests with fake Qwen and fake Upstash servers)

## How the brain and Qwen fit together
WilliamCore always runs first. Exact skills (tools, math, code generation, code analyzer, follow-ups, teach) are answered by the brain and never handed to the LLM.
When the brain is unsure, Qwen answers, grounded in the closest things the brain knows ("brain notes") plus the last few turns of conversation, and the reply streams to the UI word by word.
If the LLM is down, slow or capped, williamAI silently falls back to the brain's own answer. With no LLM configured it behaves exactly as the original zero-key brain.

## 1. Connect Qwen
Put these in the environment or in a `.env` file (see `.env.example`), then run `npm run check:llm` to verify auth, model name, latency and streaming.
- `LLM_BASE_URL`  endpoint ending in /v1 (setting this turns the LLM on)
- `LLM_API_KEY`   key for hosted providers (not needed for local Ollama)
- `LLM_MODEL`     model name as the provider spells it
- `LLM_MODE`      `smart` (default: Qwen does the thinking and ALL the coding, the brain keeps exact tools, math, small talk, learned answers and supplies facts), `fallback` (Qwen only when the brain is unsure), `off`
- `LLM_FALLBACK_MODELS` comma-separated model ids tried in order when the main model errors or is rate limited
- `LLM_TEMPERATURE` (0.5), `LLM_MAX_TOKENS` (1500), `LLM_CODE_TEMPERATURE` (0.2), `LLM_CODE_MAX_TOKENS` (3500), `LLM_TIMEOUT_MS` (45000)

Examples (check each provider's docs for current model names):
- Ollama (local): `LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:7b-instruct`
- OpenRouter: `LLM_BASE_URL=https://openrouter.ai/api/v1 LLM_API_KEY=... LLM_MODEL=qwen/qwen-2.5-72b-instruct`
- Together: `LLM_BASE_URL=https://api.together.xyz/v1 LLM_API_KEY=... LLM_MODEL=Qwen/Qwen2.5-72B-Instruct-Turbo`
- Alibaba DashScope: `LLM_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1 LLM_API_KEY=... LLM_MODEL=qwen-plus`

Reasoning models that emit `<think>...</think>` are handled: the thinking is hidden, also while streaming.

### Make it as smart as possible for free: chain free providers
Every free provider needs one free key (email signup). You can chain several: williamAI tries provider 1, and if it is rate limited or down it tries provider 2, then 3 (up to 5). Provider 1 uses `LLM_*`, provider 2 uses `LLM2_*`, provider 3 `LLM3_*` ... each with `BASE_URL`, `API_KEY`, `MODEL` and optional `FALLBACK_MODELS`.
Suggested free stack (model ids change, copy the exact id from each provider's model list):
1. Groq (fast, free, no card): `LLM_BASE_URL=https://api.groq.com/openai/v1`, key from console.groq.com/keys, model: the Qwen3 32B id listed at console.groq.com/docs/models
2. OpenRouter free: `LLM2_BASE_URL=https://openrouter.ai/api/v1`, `LLM2_MODEL=qwen/qwen3-coder:free`, `LLM2_FALLBACK_MODELS=openrouter/free`
3. Google Gemini (strongest free model, but free-tier prompts may be used by Google to improve products, and free use is restricted in the EU/UK/Switzerland): `LLM3_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, key from aistudio.google.com, model: a current Flash model id
Other free options: Cerebras (`https://api.cerebras.ai/v1`, about 1M tokens/day), Cloudflare Workers AI, Mistral.
In `smart` mode coding requests get a dedicated coding prompt, low temperature, a bigger token budget, the brain's template as reference, and the static bug-check results as hints.

### Put Qwen on your website with no local setup (OpenRouter free tier)
1. Make a free account at openrouter.ai and create an API key.
2. On openrouter.ai/models filter by free pricing and search "qwen". Free model ids end in `:free` and the free roster rotates, so copy the exact id you see there.
3. In Render, open your service, go to Environment and add:
   - `LLM_BASE_URL` = `https://openrouter.ai/api/v1`
   - `LLM_API_KEY` = your key
   - `LLM_MODEL` = a free Qwen id, e.g. `qwen/qwen3-coder:free` (or whichever chat-style Qwen is free that day)
   - `LLM_FALLBACK_MODELS` = a second free id, then `openrouter/free` as the last resort (it picks any free model)
   - `LLM_MAX_TOKENS` = `2000` and `LLM_TIMEOUT_MS` = `60000`
4. Save (Render redeploys) and open `https://YOUR-SITE.onrender.com/api/health`: it should show the llm block as enabled.
Free models are rate limited (about 20 requests per minute and a daily cap per account) and can disappear without notice. williamAI handles that: it tries the fallback models in order, and if all fail or the caps are hit it answers with the brain alone. For steadier service, add a few dollars of OpenRouter credit and switch to the paid (no `:free`) model id.

## 2. The learn loop (the brain grows)
A thumbs-up on an answer that came from Qwen saves that question and answer into the brain (`learned.json`), so next time the brain answers instantly and for free. A thumbs-down removes it again.
Safeguards: the server only accepts feedback for answers that session really received from Qwen (forged feedback is ignored); context-dependent questions ("explain that again"), "I don't know" answers and code questions are never learned; `LEARN_MIN_UPS=2` requires thumbs-ups from two different sessions. `/admin` lists what was learned from Qwen.
Caveat: learned answers are matched by similarity, so a very similar but different question can get a learned answer. Review `/admin` now and then.

## 3. Streaming
Qwen replies appear live in the UI. Brain answers (instant) keep the typing animation. If the stream breaks midway, the partial reply is kept.

## 4. Cost protection and persistence
- `LLM_DAILY_CAP` (default 500 Qwen calls per UTC day) and `LLM_IP_HOURLY` (default 20 per IP): when hit, williamAI keeps working brain-only. `/admin` shows calls, errors, blocked calls and a rough token estimate.
- Render's free plan wipes the disk on restart. Create a free Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: learned answers, feedback, unknown questions, stats and usage then persist there (and are mirrored to local files). Sessions stay local-only. `/api/health` shows `storage: upstash` when it is active.
- Security: user text only ever goes in the user role, the system prompt tells the model to treat it as untrusted, the UI escapes all output, and `/api/chat` is rate-limited.

## Deploy (Render)
Push to GitHub, create a Render Web Service, start command `npm start`, then set the LLM_*, UPSTASH_* and ADMIN_KEY variables in the Render dashboard (they are declared in `render.yaml` with `sync: false` so no secrets live in the repo). Render's free plan cannot run Ollama, so use a hosted Qwen provider there.
