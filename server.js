/**
 * @module server
 * @fileoverview MindMate AI — Mental Wellness Tracker backend.
 * Express server with 3-layer AI fallback chain (DeepSeek → Gemini → Static),
 * Google Cloud Logging, Google Cloud Storage, and conversational chat.
 * @author Rahul Rao
 * @license MIT
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logging } from '@google-cloud/logging';
import { Storage } from '@google-cloud/storage';

const app = express();

// ── Configuration Constants ───────────────────────────────────────────
/** @constant {number} PORT - Server port from environment or default */
const PORT = process.env.PORT || 3000;

/** @constant {number} RATE_LIMIT_WINDOW_MS - Rate limit window (15 min) */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** @constant {number} RATE_LIMIT_MAX - Max requests per window per IP */
const RATE_LIMIT_MAX = 100;

/** @constant {string} PAYLOAD_LIMIT - Max JSON body size */
const PAYLOAD_LIMIT = '16kb';

/** @constant {number} GEMINI_TIMEOUT_MS - Gemini API timeout (10s) */
const GEMINI_TIMEOUT_MS = 10000;

/** @constant {number} OPENROUTER_TIMEOUT_MS - OpenRouter API timeout (25s) */
const OPENROUTER_TIMEOUT_MS = 25000;

/** @constant {number} MIN_JOURNAL_LENGTH - Minimum journal entry length */
const MIN_JOURNAL_LENGTH = 10;

/** @constant {string} OPENROUTER_API_URL - OpenRouter API endpoint */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** @constant {string} DEEPSEEK_MODEL - Primary AI model */
const DEEPSEEK_MODEL = 'deepseek/deepseek-v4-flash';

/** @constant {string} GEMINI_MODEL - Fallback AI model */
const GEMINI_MODEL = 'gemini-2.0-flash-lite';

// ── Lazy-initialized AI Clients (created once, reused) ───────────────
/** @type {GoogleGenerativeAI|null} Singleton Gemini client */
let geminiClient = null;

/**
 * Get or create the Gemini AI client (singleton pattern).
 * Avoids creating a new client on every request.
 * @returns {GoogleGenerativeAI|null} The Gemini client or null.
 */
function getGeminiClient() {
  if (!GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

// ── Simple Response Cache (avoids redundant API calls) ────────────────
/** @constant {number} CACHE_TTL_MS - Cache time-to-live (5 min) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, {data: object, timestamp: number}>} In-memory cache */
const responseCache = new Map();

/**
 * Get cached response if still valid.
 * @param {string} key - Cache key.
 * @returns {object|null} Cached data or null if expired/missing.
 */
function getCached(key) {
  const entry = responseCache.get(key);
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
    return entry.data;
  }
  responseCache.delete(key);
  return null;
}

/**
 * Store a response in cache.
 * @param {string} key - Cache key.
 * @param {object} data - Data to cache.
 */
function setCache(key, data) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

// ── Google Cloud Logging ──────────────────────────────────────────────
/** @type {Logging} Google Cloud Logging client */
const logging = new Logging();
const log = logging.log('mindmate-ai-journal');

/**
 * Write a structured log entry to Google Cloud Logging.
 * Fails silently if not running on GCP (local dev).
 * @param {string} mood - Detected mood.
 * @param {number} score - Mood score 1-10.
 * @param {string} exam - Exam type.
 * @param {string[]} triggers - Detected stress triggers.
 */
async function writeLog(mood, score, exam, triggers) {
  try {
    const metadata = {
      resource: { type: 'global' },
      severity: score <= 3 ? 'WARNING' : 'INFO',
    };
    const entry = log.entry(metadata, {
      service: 'mindmate-ai',
      event: 'journal_analysis',
      mood: mood,
      score: score,
      exam: exam,
      triggers: triggers,
      timestamp: new Date().toISOString(),
    });
    await log.write(entry);
  } catch (err) {
    // Silently fail — Cloud Logging only works on GCP
    console.debug('Cloud Logging unavailable (local dev):', err.message);
  }
}

// ── Google Cloud Storage ──────────────────────────────────────────────
/** @type {Storage} Google Cloud Storage client */
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET || 'mindmate-ai-data';

/**
 * Save anonymized mood summary to Google Cloud Storage.
 * Stores daily mood data for long-term pattern analysis.
 * Fails silently if bucket doesn't exist (local dev).
 * @param {object} analysisData - The analysis result to store.
 * @param {string} exam - The exam type.
 */
async function saveMoodToStorage(analysisData, exam) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `mood-logs/${dateStr}/${Date.now()}.json`;
    const file = bucket.file(fileName);

    const summary = {
      timestamp: new Date().toISOString(),
      mood: analysisData.mood?.primary || 'unknown',
      score: analysisData.mood?.score || 5,
      exam: exam,
      triggers: analysisData.analysis?.stress_triggers || [],
      trend_data: true,
    };

    await file.save(JSON.stringify(summary, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    });
  } catch (err) {
    // Silently fail — GCS only works on GCP with proper bucket
    console.debug('Cloud Storage unavailable (local dev):', err.message);
  }
}

// ── Security ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: PAYLOAD_LIMIT }));

// ── Compression ───────────────────────────────────────────────────────
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Static Files ──────────────────────────────────────────────────────
app.use(express.static('public'));

// ── AI Client Setup ───────────────────────────────────────────────────

/** Gemini API key from environment */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/** OpenRouter API key from environment (fallback) */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

/** Supported exam types for validation */
const VALID_EXAMS = [
  'NEET', 'JEE', 'CUET', 'CAT', 'GATE', 'UPSC', 'Board Exams', 'Other'
];

/**
 * Build the system prompt for MindMate AI.
 * @returns {string} The system instruction for the AI model.
 */
function getSystemPrompt() {
  return `You are MindMate AI, an empathetic, warm, and deeply supportive mental wellness companion designed specifically for students preparing for high-stakes exams in India (NEET, JEE, CUET, CAT, GATE, UPSC, Board Exams).

Your core traits:
- You are compassionate, non-judgmental, and genuinely caring
- You validate emotions before offering solutions
- You use warm, conversational language (like a caring older sibling or mentor)
- You understand the immense pressure of Indian competitive exams
- You never dismiss feelings or say "just relax"
- You provide actionable, practical coping strategies
- You celebrate small wins and progress

Safety guidelines:
- If you detect signs of severe depression, self-harm, or suicidal ideation, ALWAYS include crisis helpline information (iCall: 9152987821, Vandrevala Foundation: 1860-2662-345)
- You are NOT a replacement for professional mental health care
- Encourage seeking professional help when patterns suggest clinical concern`;
}

/**
 * Build the analysis prompt for a journal entry.
 * @param {string} entry - The student's journal entry.
 * @param {string} exam - The exam they're preparing for.
 * @returns {string} The formatted prompt.
 */
function buildAnalysisPrompt(entry, exam) {
  return `The student is preparing for: ${exam}

Their journal entry:
"${entry}"

Analyze this journal entry deeply. Look for hidden stress triggers, emotional patterns, and unspoken concerns. Respond with ONLY valid JSON (no markdown fences, no code blocks, no extra text):

{
  "mood": {
    "primary": "one of: happy, motivated, calm, anxious, stressed, burnt_out, sad, frustrated, overwhelmed, hopeful",
    "score": 7,
    "confidence": 0.85
  },
  "analysis": {
    "summary": "2-3 sentence empathetic analysis of their emotional state",
    "stress_triggers": ["specific trigger 1", "specific trigger 2"],
    "emotional_patterns": "patterns you notice in their writing style and content",
    "hidden_concerns": "subtle worries they may not have explicitly stated"
  },
  "support": {
    "empathetic_response": "3-4 sentence warm, personalized response that validates their feelings first, then gently offers perspective",
    "coping_strategy": {
      "title": "Name of strategy",
      "description": "Why this strategy helps",
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4"]
    },
    "mindfulness_exercise": {
      "title": "Name of exercise",
      "duration": "3 minutes",
      "instructions": "Clear, step-by-step breathing or grounding instructions"
    },
    "motivational_message": "A heartfelt, personalized motivational message tied to their exam journey — not generic"
  },
  "follow_up_question": "A thoughtful follow-up question to help them reflect deeper"
}

Rules:
- mood.score: 1 = deeply distressed, 10 = feeling great
- stress_triggers: Be specific (not generic like "exams") — dig into what they wrote
- Keep the empathetic_response warm and human, not clinical
- The coping strategy should be immediately actionable (doable in 5-10 minutes)
- The mindfulness exercise should be simple enough to do at a study desk
- Make the motivational message personal to their specific exam and situation`;
}

/**
 * Generate journal analysis using Gemini API (primary).
 * @param {string} entry - Student's journal entry.
 * @param {string} exam - Target exam type.
 * @returns {Promise<object>} Parsed analysis response.
 */
async function analyzeWithGemini(entry, exam) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key not configured');
  }

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: getSystemPrompt(),
  });

  const prompt = buildAnalysisPrompt(entry, exam);

  // 10-second timeout so fallback kicks in quickly on rate limits
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
  );

  const result = await Promise.race([
    model.generateContent(prompt),
    timeoutPromise,
  ]);
  const text = result.response.text();

  // Strip markdown fences if present
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*$/gm, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  parsed.provider = 'Google Gemini 2.0 Flash-Lite';
  return parsed;
}

/**
 * Shared helper: call OpenRouter API with timeout and response cleaning.
 * Used by both analyzeWithOpenRouter and chatWithAI to avoid duplication.
 * @param {Array<{role: string, content: string}>} messages - Chat messages.
 * @returns {Promise<string>} Cleaned response text (think-blocks stripped).
 */
async function callOpenRouter(messages) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: messages,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);
  const result = await response.json();

  if (result.error || !result.choices) {
    throw new Error(result.error?.message || 'OpenRouter API failed');
  }

  const text = result.choices[0].message.content;

  // Strip <think> blocks from reasoning models
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Generate journal analysis using OpenRouter API (fallback).
 * @param {string} entry - Student's journal entry.
 * @param {string} exam - Target exam type.
 * @returns {Promise<object>} Parsed analysis response.
 */
async function analyzeWithOpenRouter(entry, exam) {
  const prompt = `${getSystemPrompt()}\n\n${buildAnalysisPrompt(entry, exam)}`;
  const rawText = await callOpenRouter([{ role: 'user', content: prompt }]);

  // Strip markdown fences
  const cleaned = rawText
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*$/gm, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    parsed.provider = 'DeepSeek V4 Flash';
    return parsed;
  } catch (parseErr) {
    // Try to repair common JSON issues from LLMs
    console.error('OpenRouter JSON parse attempt 1 failed, trying repair...');
    try {
      // Fix: unescaped quotes inside strings, trailing commas
      const repaired = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/(?<=:\s*"[^"]*)"(?=[^"]*"[,}\]])/g, '\\"');
      const parsed = JSON.parse(repaired);
      parsed.provider = 'DeepSeek V4 Flash';
      return parsed;
    } catch (repairErr) {
      // Last resort: extract the JSON object from the text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          parsed.provider = 'DeepSeek V4 Flash';
          return parsed;
        } catch (e) {
          // Log full output for debugging
          console.error('OpenRouter all JSON parse attempts failed. Raw:', cleaned.substring(0, 500));
        }
      }
      throw new Error('OpenRouter returned invalid JSON');
    }
  }
}

/**
 * Fallback analysis when no AI API is available.
 * @param {string} entry - Student's journal entry.
 * @param {string} exam - Target exam type.
 * @returns {object} Static fallback response.
 */
function getFallbackAnalysis(entry, exam) {
  // Simple keyword-based mood detection
  const lowerEntry = entry.toLowerCase();
  const stressWords = ['stress', 'anxious', 'worried', 'scared', 'panic',
    'overwhelm', 'pressure', 'can\'t', 'fail', 'behind'];
  const positiveWords = ['happy', 'good', 'great', 'confident', 'ready',
    'motivated', 'excited', 'progress', 'solved', 'understood'];

  const stressCount = stressWords.filter((w) => lowerEntry.includes(w)).length;
  const positiveCount = positiveWords.filter(
    (w) => lowerEntry.includes(w)
  ).length;

  const isStressed = stressCount > positiveCount;
  const score = isStressed ? Math.max(3, 5 - stressCount) : Math.min(8, 5 + positiveCount);

  const response = {
    mood: {
      primary: isStressed ? 'stressed' : 'motivated',
      score: score,
      confidence: 0.6,
    },
    analysis: {
      summary: isStressed
        ? `It sounds like you're carrying a heavy load right now with your ${exam} preparation. That takes real courage to keep going.`
        : `You seem to be in a positive headspace about your ${exam} preparation. That's wonderful to see!`,
      stress_triggers: isStressed
        ? ['Exam pressure', 'High expectations', 'Time management']
        : ['Maintaining momentum', 'Staying consistent'],
      emotional_patterns: 'Your writing reflects the typical emotional journey of a dedicated student.',
      hidden_concerns: isStressed
        ? 'You might be putting too much pressure on yourself to be perfect.'
        : 'Even when things are going well, remember to check in with yourself.',
    },
    support: {
      empathetic_response: isStressed
        ? `I hear you, and I want you to know that what you're feeling is completely valid. ${exam} preparation is genuinely one of the most challenging things you'll face, and the fact that you're still showing up every day speaks volumes about your strength. It's okay to not be okay sometimes — let's work through this together.`
        : `That's really great to hear! Your positive energy is well-deserved — you've been putting in the work, and it's showing. Keep riding this wave, but also remember that it's okay to take breaks and recharge.`,
      coping_strategy: {
        title: isStressed ? '5-4-3-2-1 Grounding Technique' : 'Victory Journaling',
        description: isStressed
          ? 'This sensory grounding technique helps bring you back to the present moment when anxiety takes over.'
          : 'Documenting your wins reinforces positive neural pathways and builds confidence.',
        steps: isStressed
          ? [
            'Name 5 things you can see around you right now',
            'Touch 4 different textures near you',
            'Listen for 3 distinct sounds',
            'Identify 2 things you can smell',
            'Notice 1 thing you can taste',
          ]
          : [
            'Write down 3 things you accomplished today, no matter how small',
            'Note one concept you understood better than yesterday',
            'Identify one person who supported you today',
            'Set one exciting micro-goal for tomorrow',
          ],
      },
      mindfulness_exercise: {
        title: 'Box Breathing',
        duration: '4 minutes',
        instructions: 'Sit comfortably at your desk. Breathe in slowly for 4 counts, hold for 4 counts, breathe out for 4 counts, hold empty for 4 counts. Repeat 4 times. This activates your parasympathetic nervous system and reduces cortisol levels.',
      },
      motivational_message: isStressed
        ? `Every ${exam} topper has had days exactly like this one. The difference isn't that they never felt overwhelmed — it's that they kept going anyway. You're doing the same thing right now, and that makes you extraordinary.`
        : `Your ${exam} journey is a marathon, not a sprint, and right now you're running at a beautiful pace. Trust the process, trust your preparation, and most importantly, trust yourself.`,
    },
    follow_up_question: isStressed
      ? 'What\'s one small thing that brought you even a tiny moment of peace today?'
      : 'What\'s the one topic you\'re most excited to study next?',
    provider: 'MindMate AI (offline mode)',
  };

  return response;
}

/**
 * Main analysis function with cascading fallback and response caching.
 * Checks cache first, then tries DeepSeek, Gemini, and static fallback.
 * @param {string} entry - Student's journal entry.
 * @param {string} exam - Target exam type.
 * @returns {Promise<object>} Analysis result.
 */
async function analyzeJournal(entry, exam) {
  // Check cache for identical recent entries (avoids redundant API calls)
  const cacheKey = `${exam}:${entry.trim().substring(0, 100)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('Cache hit — returning cached analysis');
    return cached;
  }

  let result;

  // Try DeepSeek V4 Flash first (primary — best conversational model)
  try {
    result = await analyzeWithOpenRouter(entry, exam);
  } catch (deepseekError) {
    console.error('DeepSeek failed, trying Gemini:', deepseekError.message);

    // Try Gemini as fallback (Google Services pillar)
    try {
      result = await analyzeWithGemini(entry, exam);
    } catch (geminiError) {
      console.error('Gemini failed, using static fallback:', geminiError.message);
      // Static fallback — always works
      result = getFallbackAnalysis(entry, exam);
    }
  }

  // Cache the result for future identical entries
  setCache(cacheKey, result);
  return result;
}

// ── API Routes ────────────────────────────────────────────────────────

/**
 * POST /api/analyze-journal
 * Analyzes a student's journal entry for mood, stress triggers,
 * and provides personalized coping strategies.
 *
 * Body: { entry: string, exam: string }
 * Returns: { mood, analysis, support, follow_up_question }
 */
app.post('/api/analyze-journal', async (req, res) => {
  try {
    const { entry, exam } = req.body;

    // Validate journal entry
    if (!entry || typeof entry !== 'string' || entry.trim().length === 0) {
      return res.status(400).json({
        error: 'Please share what\'s on your mind. Your journal entry cannot be empty.',
      });
    }

    if (entry.trim().length < MIN_JOURNAL_LENGTH) {
      return res.status(400).json({
        error: 'Tell me a bit more — even a few sentences help me understand you better.',
      });
    }

    // Validate exam type
    const examType = VALID_EXAMS.includes(exam) ? exam : 'Other';

    const data = await analyzeJournal(entry.trim(), examType);

    // Log to Google Cloud Logging (async, non-blocking)
    writeLog(
      data.mood?.primary || 'unknown',
      data.mood?.score || 5,
      examType,
      data.analysis?.stress_triggers || []
    );

    // Save mood summary to Google Cloud Storage (async, non-blocking)
    saveMoodToStorage(data, examType);

    res.json(data);
  } catch (err) {
    console.error('Journal analysis error:', err);
    res.status(500).json({
      error: 'Something went wrong. Please try again — I\'m here for you.',
    });
  }
});

/**
 * POST /api/mood-insights
 * Generates insights from stored mood history.
 *
 * Body: { history: Array<{ date, mood, score }> }
 * Returns: { insights: string, trend: string, recommendation: string }
 */
app.post('/api/mood-insights', async (req, res) => {
  try {
    const { history } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        error: 'No mood history available yet. Start journaling to build your timeline!',
      });
    }

    // Calculate simple trend from mood scores
    const scores = history.map((h) => h.score || 5);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0)
      / Math.min(scores.length, 3);

    const trend = recentAvg > avgScore + 0.5
      ? 'improving'
      : recentAvg < avgScore - 0.5
        ? 'declining'
        : 'stable';

    const moods = history.map((h) => h.mood || 'unknown');
    const moodCounts = moods.reduce((acc, m) => {
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});

    const dominantMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    res.json({
      insights: {
        total_entries: history.length,
        average_score: Math.round(avgScore * 10) / 10,
        recent_average: Math.round(recentAvg * 10) / 10,
        dominant_mood: dominantMood,
        trend: trend,
      },
      recommendation: trend === 'declining'
        ? 'Your recent entries suggest increasing stress. Consider taking a study break, talking to someone you trust, or trying the mindfulness exercises MindMate suggests.'
        : trend === 'improving'
          ? 'You\'re on an upward trend — keep nurturing these positive habits! Consistency in self-care makes a huge difference.'
          : 'Your mood has been steady. Stability is strength! Keep checking in with yourself daily.',
    });
  } catch (err) {
    console.error('Mood insights error:', err);
    res.status(500).json({
      error: 'Could not generate insights. Please try again.',
    });
  }
});

/**
 * POST /api/chat
 * Multi-turn conversational AI endpoint.
 * Maintains context from the initial journal analysis.
 *
 * Body: { messages: Array<{ role, content }>, exam: string }
 * Returns: { reply: string, provider: string }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, exam } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Please send a message to continue our conversation.',
      });
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.content || typeof lastMsg.content !== 'string'
        || lastMsg.content.trim().length === 0) {
      return res.status(400).json({
        error: 'Your message cannot be empty.',
      });
    }

    const examType = VALID_EXAMS.includes(exam) ? exam : 'General';
    const reply = await chatWithAI(messages, examType);
    res.json(reply);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      reply: "I'm here for you. Could you rephrase that? I want to make sure I understand.",
      provider: 'MindMate AI (error recovery)',
    });
  }
});

/**
 * Generate a conversational reply using the AI fallback chain.
 * Reuses shared callOpenRouter helper to avoid code duplication.
 * @param {Array} messages - Conversation history.
 * @param {string} exam - Target exam type.
 * @returns {Promise<object>} Reply object with reply and provider.
 */
async function chatWithAI(messages, exam) {
  const chatSystemPrompt = `You are MindMate AI, an empathetic mental wellness companion for Indian students preparing for ${exam}. 
You are in a follow-up conversation after analyzing their journal entry. 
Rules:
- Be warm, caring, and conversational (like a supportive older sibling)
- Keep responses concise (2-4 sentences max)
- If they share struggles, validate emotions first, then offer one actionable tip
- If they seem in crisis, share iCall helpline: 9152987821
- Use simple language, avoid clinical terms
- Add a relevant emoji at the end of your response
- Never diagnose medical conditions`;

  // Try DeepSeek first (primary — best for conversation)
  if (OPENROUTER_API_KEY) {
    try {
      const openRouterMessages = [
        { role: 'system', content: chatSystemPrompt },
        ...messages,
      ];
      const result = await callOpenRouter(openRouterMessages);
      return { reply: result, provider: 'DeepSeek V4 Flash' };
    } catch (e) {
      console.error('DeepSeek chat failed:', e.message);
    }
  }

  // Try Gemini as fallback (uses singleton client)
  const client = getGeminiClient();
  if (client) {
    try {
      const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: chatSystemPrompt,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini chat timeout')), GEMINI_TIMEOUT_MS)
      );

      const chatMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({ history: chatMessages.slice(0, -1) });
      const result = await Promise.race([
        chat.sendMessage(chatMessages[chatMessages.length - 1].parts[0].text),
        timeoutPromise,
      ]);

      return {
        reply: result.response.text(),
        provider: 'Google Gemini 2.0 Flash-Lite',
      };
    } catch (e) {
      console.error('Gemini chat failed:', e.message);
    }
  }

  // Static fallback — always works
  const supportive = [
    "I hear you, and what you're feeling is completely valid. Remember, every small step counts — even on tough days. 💛",
    "That takes courage to share. One thing that might help: try writing down 3 things that went well today, no matter how small. 🌟",
    "You're not alone in this. Many students feel this way during preparation. Have you tried a 2-minute breathing exercise? It can reset your focus. 🫁",
    "It's okay to have these feelings. Your awareness itself shows strength. What's one kind thing you can do for yourself right now? 🌈",
    "Thank you for trusting me with that. Progress isn't always linear — some days are harder, and that's part of the journey. 💪",
  ];
  const idx = Math.floor(Math.random() * supportive.length);

  return {
    reply: supportive[idx],
    provider: 'MindMate AI (offline mode)',
  };
}

/**
 * GET /api/health
 * Health check endpoint for monitoring.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MindMate AI',
    timestamp: new Date().toISOString(),
  });
});

// ── Start Server ──────────────────────────────────────────────────────
// Only start listening when run directly (not when imported by tests)
const isDirectRun = process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`🧠 MindMate AI server running on http://localhost:${PORT}`);
  });
}

export default app;
