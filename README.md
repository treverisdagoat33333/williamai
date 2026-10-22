# williamAI
Frontend (public/index.html) + Node backend (server.js) + WilliamCore engine (engine.js). Zero dependencies, no API keys, no external AI.
Run: `npm start` then open http://localhost:3000
API: POST /api/chat {text,sid} -> {out,skill,conf} | GET /api/health
Teach him: `teach: question => answer` (saved to data/learned.json)
Deploy: push to GitHub, create a Render Web Service, build: (blank), start: `npm start`
