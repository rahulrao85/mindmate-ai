# 🧠 MindMate AI — Mental Wellness Tracker

> **Generative AI-powered mental wellness companion for students preparing for competitive exams in India.**

🔗 **Live App:** [https://mindmate-ai-513650706645.asia-south1.run.app](https://mindmate-ai-513650706645.asia-south1.run.app)

Built for [PromptWars Hackathon](https://hack2skill.com) by **Rahul Rao** using Google Gemini AI, DeepSeek V4 Flash, Google Cloud Logging, and Google Cloud Storage.

---

## 🎯 Problem Statement

Students preparing for high-stakes board exams and competitive entrance tests (NEET, JEE, CUET, CAT, GATE, UPSC) face **severe stress, burnout, and self-doubt**. Standard wellness trackers rely on rigid forms and fail to capture the nuanced emotional struggles of exam preparation.

**MindMate AI** is a Generative AI-powered solution that acts as an **empathetic, always-available digital companion** — analyzing open-ended journal entries to uncover hidden stress triggers, emotional patterns, and providing hyper-personalized coping strategies through **conversational AI**.

## ✨ What Makes MindMate AI Different

Unlike standard mood trackers that use sliders and checkboxes, MindMate AI:

1. **Reads between the lines** — Uses GenAI to analyze free-form journal entries and detect emotions, stress triggers, and hidden concerns that students may not explicitly state
2. **Conversational AI companion** — Multi-turn chat interface where students can continue talking with MindMate after the initial analysis, ask follow-up questions, and get ongoing support
3. **Provides exam-specific support** — Understands the unique pressures of NEET, JEE, CAT, UPSC, GATE, and tailors advice accordingly (e.g., a NEET student struggling with Physics gets Physics-specific study strategies)
4. **Offers actionable coping strategies** — Not generic advice, but step-by-step techniques doable in 5-10 minutes at a study desk
5. **Tracks emotional patterns over time** — Visual mood timeline chart reveals trends and triggers across days/weeks
6. **Interactive wellness tools** — Quick Mood Check, Box Breathing Exercise, and Daily Affirmations built in
7. **Includes safety measures** — Detects severe distress and provides crisis helpline information (iCall, Vandrevala Foundation)

## 🤖 AI Architecture

MindMate uses a **3-layer AI fallback chain** for maximum reliability:

| Priority | Provider | Model | Purpose |
|----------|----------|-------|---------|
| 🥇 Primary | **DeepSeek** (via OpenRouter) | `deepseek-v4-flash` | Best-in-class conversational quality for journal analysis + multi-turn chat |
| 🥈 Fallback | **Google Gemini** | `gemini-2.0-flash-lite` | Google Cloud integration, fast inference |
| 🥉 Offline | **Static Engine** | Built-in keyword analysis | Always-available fallback with curated responses |

### Why This Architecture?

- **DeepSeek V4 Flash** excels at empathetic, nuanced conversation — critical for mental wellness
- **Gemini** provides the Google Cloud pillar and serves as a reliable fallback
- **Static fallback** ensures the app NEVER fails — even offline, students get support
- Each layer has independent timeouts (10s Gemini, 25s DeepSeek) for fast failover

## 🧠 AI Prompt Engineering

MindMate AI uses a deeply crafted system prompt that instructs the AI to:

- **Validate emotions first** — Always acknowledge feelings before offering solutions
- **Act like a caring mentor** — Warm, conversational tone (like a supportive older sibling)
- **Detect hidden patterns** — Analyze writing style, word choice, and emotional undertones
- **Provide structured support** — Every response includes mood detection, stress triggers, coping strategy, mindfulness exercise, and motivational message
- **Stay exam-aware** — Understand the Indian competitive exam ecosystem and its unique pressures
- **Include safety guardrails** — Flag severe anxiety/depression with professional helpline contacts

## 🔧 Features

| Feature | Description |
|---------|-------------|
| 📝 **Open-ended Journaling** | Write freely about your day — no rigid forms or checkboxes |
| 💬 **Conversational AI Chat** | Multi-turn follow-up conversation with MindMate after analysis |
| 🎯 **Exam-Aware AI** | Select your exam (NEET/JEE/CAT/UPSC/GATE/Board) for tailored support |
| 😊 **Smart Mood Detection** | AI analyzes journal text and auto-detects mood with confidence score |
| ⚡ **Stress Trigger Analysis** | Identifies specific triggers — not generic "exams" but "fear of Physics despite 8 hours of study" |
| 🧩 **Emotional Pattern Recognition** | Detects writing patterns and hidden concerns between the lines |
| 🎯 **Personalized Coping Strategies** | Actionable techniques with step-by-step instructions |
| 🧘 **Guided Mindfulness Exercises** | Desk-friendly exercises with timers |
| 🫁 **Box Breathing Widget** | Interactive 4-4-4-4 breathing exercise with animated circle |
| ⚡ **Quick Mood Check** | 8-emoji instant mood logging (Happy, Calm, Motivated, Anxious, Stressed, Sad, Frustrated, Hopeful) |
| ✨ **Daily Affirmations** | Rotating positive affirmations for exam motivation |
| 💪 **Motivational Messages** | Exam-specific encouragement, not generic quotes |
| 📊 **Mood Timeline Chart** | Visual chart tracking mood scores over time using Chart.js |
| 📈 **Trend Analysis** | Detects improving, declining, or stable mood patterns |
| 🌙 **Dark/Light Mode** | Calming visual design with theme preference saved locally |
| 📱 **Fully Responsive** | 3-column dashboard on desktop, stacked on mobile |
| 🔒 **Privacy-First** | Mood history stored in browser localStorage — no server-side storage of personal data |
| 🏷️ **AI Provider Badge** | Transparent display of which AI model powered each response |

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **AI Engine (Primary)** | DeepSeek V4 Flash (via OpenRouter) | Journal analysis, conversational chat |
| **AI Engine (Fallback)** | Google Gemini 2.0 Flash-Lite (`@google/generative-ai`) | Google Cloud pillar, backup analysis |
| **Cloud Logging** | Google Cloud Logging (`@google-cloud/logging`) | Structured logging of mood data for monitoring |
| **Cloud Storage** | Google Cloud Storage (`@google-cloud/storage`) | Anonymized mood summaries for long-term trend analysis |
| **Backend** | Node.js + Express | REST API server with 4 endpoints |
| **Frontend** | Vanilla HTML/CSS/JS + Chart.js | Responsive 3-column dashboard with mood charts |
| **Security** | Helmet + express-rate-limit + CORS | HTTP headers, rate limiting, payload limits |
| **Efficiency** | compression middleware | Gzip response compression |
| **Testing** | Jest + Supertest | 26+ automated tests |
| **Deployment** | Docker + Google Cloud Run | Containerized deployment in asia-south1 |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze-journal` | Analyze journal entry for mood, triggers, coping strategies |
| `POST` | `/api/chat` | Multi-turn conversational AI follow-up |
| `POST` | `/api/mood-insights` | Generate insights from mood history |
| `GET` | `/api/health` | Health check for monitoring |

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ installed
- A Google Gemini API key ([Get one free](https://aistudio.google.com/apikey))
- An OpenRouter API key ([Get one free](https://openrouter.ai/keys))

### Local Development

```bash
# Clone the repository
git clone https://github.com/rahulrao85/mindmate-ai.git
cd mindmate-ai

# Install dependencies
npm install

# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env
echo "OPENROUTER_API_KEY=your_key_here" >> .env
echo "PORT=3000" >> .env

# Start development server
npm run dev
```

Visit **http://localhost:3000** and start journaling!

### Run Tests

```bash
npm test
```

## 📂 Project Structure

```
mindmate-ai/
├── server.js          # Express backend: DeepSeek + Gemini + Cloud Logging + Cloud Storage
├── server.test.js     # Jest test suite (26+ tests: API, security, validation, GCP)
├── public/
│   ├── index.html     # 3-column dashboard with chat, breathing, affirmations
│   ├── style.css      # 1200+ lines: dark/light mode, glassmorphism, chat bubbles
│   └── app.js         # 830+ lines: Chart.js, chat system, breathing exercise
├── Dockerfile         # Lightweight Node.js 22 Alpine container
├── .env               # Environment variables (never committed)
├── .gitignore         # Excludes node_modules, .env, prep files
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## 🔒 Security

- **Helmet** — Comprehensive HTTP security headers (CSP, XSS Protection, etc.)
- **Rate Limiting** — 100 requests per 15 minutes per IP
- **JSON Payload Limit** — 16kb maximum body size
- **No hardcoded API keys** — All keys via environment variables
- **CORS** — Cross-origin resource sharing configured
- **.env in .gitignore** — Secrets never committed to version control
- **HTML Escaping** — All user input escaped before rendering

## 🐳 Docker Deployment

```bash
# Build
docker build -t mindmate-ai .

# Run
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e OPENROUTER_API_KEY=your_key \
  mindmate-ai
```

### Google Cloud Run

```bash
gcloud run deploy mindmate-ai \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,OPENROUTER_API_KEY=your_key
```

## ♿ Accessibility

- **Semantic HTML5** — `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`
- **ARIA Labels** — All interactive elements have descriptive aria-labels
- **Focus Visible** — Clear focus indicators for keyboard navigation
- **High Contrast** — Carefully chosen color palette meeting WCAG standards
- **Google Fonts** — Inter typeface for optimal readability
- **Responsive Design** — Mobile-first CSS with breakpoints for all devices

## 🧪 Testing

26+ automated tests covering:
- ✅ Static file serving (HTML, CSS, JS)
- ✅ Security headers (Helmet integration)
- ✅ Rate limiting headers
- ✅ Gzip compression
- ✅ Health check endpoint
- ✅ Journal analysis validation (missing, empty, short, wrong type)
- ✅ Journal analysis with valid entries (AI + fallback paths)
- ✅ Mood insights trend detection (improving, declining, stable)
- ✅ Dominant mood identification
- ✅ 16kb payload limit enforcement
- ✅ Google Cloud Logging SDK import verification
- ✅ Google Cloud Storage SDK import verification
- ✅ Structured data validation for Cloud Logging compatibility

## 📝 License

MIT License — Built with 💛 for Indian students by Rahul Rao.

## 🏷️ Tags

`#BuildwithAI` `#PromptWarsVirtual` `#GoogleForDevelopers` `#Hack2Skill` `#MentalHealth` `#GenAI` `#GeminiAI` `#DeepSeek` `#ConversationalAI`
