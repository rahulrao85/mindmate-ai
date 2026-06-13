# 🧠 MindMate AI — Mental Wellness Tracker

> **Generative AI-powered mental wellness companion for students preparing for competitive exams in India.**

Built for [PromptWars Hackathon](https://hack2skill.com) by **Rahul Rao** using Google Gemini AI, Google Cloud Logging, and Google Cloud Storage.

---

## 🎯 Problem Statement

Students preparing for high-stakes board exams and competitive entrance tests (NEET, JEE, CUET, CAT, GATE, UPSC) face **severe stress, burnout, and self-doubt**. Standard wellness trackers rely on rigid forms and fail to capture the nuanced emotional struggles of exam preparation.

**MindMate AI** is a Generative AI-powered solution that acts as an **empathetic, always-available digital companion** — analyzing open-ended journal entries to uncover hidden stress triggers, emotional patterns, and providing hyper-personalized coping strategies.

## ✨ What Makes MindMate AI Different

Unlike standard mood trackers that use sliders and checkboxes, MindMate AI:

1. **Reads between the lines** — Uses GenAI to analyze free-form journal entries and detect emotions, stress triggers, and hidden concerns that students may not explicitly state
2. **Provides exam-specific support** — Understands the unique pressures of NEET, JEE, CAT, UPSC, GATE, and tailors advice accordingly (e.g., a NEET student struggling with Physics gets Physics-specific study strategies)
3. **Offers actionable coping strategies** — Not generic advice, but step-by-step techniques doable in 5-10 minutes at a study desk
4. **Tracks emotional patterns over time** — Visual mood timeline chart reveals trends and triggers across days/weeks
5. **Includes safety measures** — Detects severe distress and provides crisis helpline information (iCall, Vandrevala Foundation)

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
| 🎯 **Exam-Aware AI** | Select your exam (NEET/JEE/CAT/UPSC/GATE/Board) for tailored support |
| 😊 **Smart Mood Detection** | AI analyzes journal text and auto-detects mood with confidence score |
| ⚡ **Stress Trigger Analysis** | Identifies specific triggers — not generic "exams" but "fear of Physics despite 8 hours of study" |
| 🧩 **Emotional Pattern Recognition** | Detects writing patterns and hidden concerns between the lines |
| 🎯 **Personalized Coping Strategies** | Actionable techniques with step-by-step instructions |
| 🧘 **Guided Mindfulness Exercises** | Desk-friendly breathing and grounding exercises with timers |
| 💪 **Motivational Messages** | Exam-specific encouragement, not generic quotes |
| 📊 **Mood Timeline Chart** | Visual chart tracking mood scores over time using Chart.js |
| 📈 **Trend Analysis** | Detects improving, declining, or stable mood patterns |
| 🌙 **Dark/Light Mode** | Calming visual design with theme preference saved locally |
| 📱 **Fully Responsive** | Works on desktop, tablet, and mobile devices |
| 🔒 **Privacy-First** | Mood history stored in browser localStorage — no server-side storage of personal data |

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **AI Engine** | Google Gemini 2.0 Flash (`@google/generative-ai`) | Journal analysis, mood detection, coping strategies |
| **Cloud Logging** | Google Cloud Logging (`@google-cloud/logging`) | Structured logging of mood data for monitoring |
| **Cloud Storage** | Google Cloud Storage (`@google-cloud/storage`) | Anonymized mood summaries for long-term trend analysis |
| **Backend** | Node.js + Express | REST API server |
| **Frontend** | Vanilla HTML/CSS/JS + Chart.js | Responsive UI with mood charts |
| **Security** | Helmet + express-rate-limit + CORS | HTTP headers, rate limiting, payload limits |
| **Efficiency** | compression middleware | Gzip response compression |
| **Testing** | Jest + Supertest | 22+ automated tests |
| **Deployment** | Docker + Google Cloud Run | Containerized deployment |

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ installed
- A Google Gemini API key ([Get one free](https://aistudio.google.com/apikey))

### Local Development

```bash
# Clone the repository
git clone https://github.com/rahulrao85/mindmate-ai.git
cd mindmate-ai

# Install dependencies
npm install

# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env
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
├── server.js          # Express backend with Gemini AI + Cloud Logging + Cloud Storage
├── server.test.js     # Jest test suite (22+ tests: API, security, validation)
├── public/
│   ├── index.html     # Semantic HTML frontend with ARIA labels
│   ├── style.css      # Responsive CSS with dark/light mode, glassmorphism
│   └── app.js         # Frontend logic, Chart.js mood timeline, localStorage
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

## 🐳 Docker Deployment

```bash
# Build
docker build -t mindmate-ai .

# Run
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key mindmate-ai
```

### Google Cloud Run

```bash
gcloud run deploy mindmate-ai \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key
```

## ♿ Accessibility

- **Semantic HTML5** — `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`
- **ARIA Labels** — All interactive elements have descriptive aria-labels
- **Focus Visible** — Clear focus indicators for keyboard navigation
- **High Contrast** — Carefully chosen color palette meeting WCAG standards
- **Google Fonts** — Inter typeface for optimal readability
- **Responsive Design** — Mobile-first CSS with breakpoints for all devices

## 🧪 Testing

22+ automated tests covering:
- ✅ Static file serving (HTML, CSS, JS)
- ✅ Security headers (Helmet integration)
- ✅ Rate limiting headers
- ✅ Gzip compression
- ✅ Health check endpoint
- ✅ Journal analysis validation (missing, empty, short, wrong type)
- ✅ Journal analysis with valid entries
- ✅ Mood insights trend detection (improving, declining, stable)
- ✅ Dominant mood identification
- ✅ 16kb payload limit enforcement

## 📝 License

MIT License — Built with 💛 for Indian students by Rahul Rao.

## 🏷️ Tags

`#BuildwithAI` `#PromptWarsVirtual` `#GoogleForDevelopers` `#Hack2Skill` `#MentalHealth` `#GenAI` `#GeminiAI`
