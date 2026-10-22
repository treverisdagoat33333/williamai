# williamAI
Frontend (`public/index.html`) + Node backend (`server.js`) + WilliamCore engine (`engine.js`). Zero dependencies, no API keys, no external AI.

Run: `npm start` then open http://localhost:3000
API: `POST /api/chat {text,sid}` -> `{out,skill,conf}` | `GET /api/health`

## Knowledge (v2)
- `knowledge/*.json` - one file per topic (coding, errors, science, math, history, geography, everyday, games, communication, meta...). Each entry:
  `{"q":["phrase 1","phrase 2","phrase 3"],"a":"answer or [\"variant 1\",\"variant 2\"]","more":"shown when the user says tell me more"}`
- `knowledge/facts.json` - lookup tables (120 capitals, 118 elements) so one entry covers every country/element.
- `knowledge/wiki/*.json` - ingested Wikipedia articles and web pages (searched with BM25 when no hand-written entry matches). Answers always show the source and license.

## Feed it Wikipedia and websites
```
npm run ingest                                   # Wikipedia articles in scripts/topics.txt
node scripts/ingest.js wiki "Black hole" "Octopus"
node scripts/ingest.js category "Category:Physics" 200
node scripts/ingest.js url https://example.com/page
node scripts/ingest.js urls --file urls.txt
```
Wikipedia text is CC BY-SA 4.0 (attribution is shown with each answer). The web ingester respects robots.txt. Only ingest pages you are allowed to reuse.
`render.yaml` runs `npm run ingest` at build time so Render pulls Wikipedia on every deploy.

## Improve him
- `npm run train` validates the knowledge base (duplicate triggers, missing answers, entries with too few phrasings) and prints accuracy.
- `data/unknown.json` = questions he could not answer. `data/nearmiss.json` = questions he almost matched. `data/feedback.json` = thumbs down. Turn these into entries.
- Teach live: `teach: question => answer`.

## Persistence on Render (free tier wipes disk on deploy)
Taught answers can be committed back to a GitHub branch. Set env vars on Render: `GH_TOKEN` (fine-grained token, contents: write on this repo only), `GH_REPO` (`owner/williamai`), `GH_BRANCH` (default `learned-data`). Create the `learned-data` branch first. Render should auto-deploy `main` only so these commits do not trigger redeploys.
Optional: `DATA_DIR` moves runtime files (sessions, unknown, feedback) to a mounted disk.
