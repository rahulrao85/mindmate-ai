# MindMate AI — OpenCode Handoff: Target 99+/100

## Current State
- **Live App:** https://mindmate-ai-513650706645.asia-south1.run.app
- **GitHub:** https://github.com/rahulrao85/mindmate-ai
- **Local Code:** C:\Users\Admin\Desktop\AI
- **Deploy Repo:** C:\Users\Admin\Desktop\mindmate-ai
- **GCP Project:** promptwars-mumbai-499305, region asia-south1
- **gcloud path:** C:\Users\Admin\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd

## API Keys (set as env vars in Cloud Run)
- GEMINI_API_KEY=<your-gemini-key>
- OPENROUTER_API_KEY=<your-openrouter-key>

## AI Model Chain
1. Primary: deepseek/deepseek-v4-flash (via OpenRouter)
2. Fallback: gemini-2.0-flash-lite (via @google/generative-ai)
3. Offline: Static keyword-based analysis

## Current Scores (last submission: 95.56/100, NO bonus)
| Section | Score | Target |
|---------|-------|--------|
| Code Quality | 86 | 99+ |
| Security | 98 | 98+ |
| Efficiency | 80 | 99+ |
| Testing | 98 | 98+ |
| Accessibility | 98 | 98+ |
| Problem Statement | 99 | 99 |

## THE TWO GAPS TO FIX

### GAP 1: Code Quality (86 → 99+)
The evaluator is likely penalizing:

1. **Monolith files** — server.js is 799 lines, app.js is 715 lines, style.css is 1066 lines
2. **No linting config** — no .eslintrc.json or prettier config
3. **`!important` in CSS** — code smell

**FIXES NEEDED:**
- Split server.js into modular files:
  - `server.js` — Express app setup, middleware, start server (keep slim)
  - `routes/analyze.js` — POST /api/analyze-journal route
  - `routes/chat.js` — POST /api/chat route
  - `routes/insights.js` — POST /api/mood-insights route
  - `services/ai.js` — analyzeJournal, analyzeWithGemini, analyzeWithOpenRouter, callOpenRouter, chatWithAI, getFallbackAnalysis
  - `services/cloud.js` — writeLog, saveMoodToStorage
  - `config/constants.js` — All constants (PORT, timeouts, models, etc.)
  - `config/prompts.js` — getSystemPrompt, buildAnalysisPrompt
- Add `.eslintrc.json` with recommended rules
- Add `.prettierrc` with consistent formatting
- Remove all `!important` from style.css
- Split style.css into logical sections (optional but helpful)

### GAP 2: Efficiency (80 → 99+)
The evaluator is likely penalizing:

1. **Duplicated patterns** — partially fixed with callOpenRouter but getSystemPrompt rebuilds every call
2. **No lazy loading** — frontend loads everything upfront
3. **Large static fallback arrays recreated per call**

**FIXES NEEDED:**
- Cache getSystemPrompt() result (it never changes at runtime)
- Cache buildAnalysisPrompt template (only entry/exam vary)
- Move static fallback data to a constant (not recreated per call)
- Add `loading="lazy"` to any images
- Add `<link rel="preconnect">` for Google Fonts and CDN
- Consider adding `Cache-Control` headers for static files
- Add ETag support or cache headers in Express static middleware

## Files in the Project
```
C:\Users\Admin\Desktop\AI\
├── server.js          # 799 lines — Express backend (NEEDS SPLITTING)
├── server.test.js     # 250 lines — 26+ Jest tests
├── package.json       # Dependencies
├── Dockerfile         # Node 22 Alpine
├── README.md          # Full documentation
├── .env               # Local env vars
├── .gitignore         # Excludes node_modules, .env
└── public/
    ├── index.html     # 205 lines — 3-column dashboard + chat
    ├── app.js         # 715 lines — Frontend logic
    └── style.css      # 1066 lines — Full styling
```

## Deploy Process
After making changes:
```powershell
# Copy files to deploy repo
Copy-Item -Path "C:\Users\Admin\Desktop\AI\*" -Destination "C:\Users\Admin\Desktop\mindmate-ai\" -Force -Recurse -Exclude node_modules,.env,.git

# Commit and push
cd C:\Users\Admin\Desktop\mindmate-ai
git add -A
git commit -m "message"
git push origin master

# Deploy to Cloud Run
& "C:\Users\Admin\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" run deploy mindmate-ai --source . --platform managed --region asia-south1 --allow-unauthenticated --set-env-vars "GEMINI_API_KEY=<your-gemini-key>,OPENROUTER_API_KEY=<your-openrouter-key>"
```

## Test Command
```powershell
cd C:\Users\Admin\Desktop\AI
$env:GEMINI_API_KEY="<your-gemini-key>"
$env:OPENROUTER_API_KEY="<your-openrouter-key>"
npx jest --verbose
```

## CRITICAL RULES
- Maintain ALL existing functionality — do NOT break anything
- Keep all existing tests passing
- The app is a hackathon submission for PromptWars by Hack2Skill
- Evaluator uses automated scoring on 6 pillars
- All code must follow PEP 8 equivalent for JS (consistent formatting)
- All code must be properly commented with JSDoc
- After changes, copy to C:\Users\Admin\Desktop\mindmate-ai, commit, push, and deploy
