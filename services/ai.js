import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  GEMINI_API_KEY, OPENROUTER_API_KEY,
  GEMINI_MODEL, DEEPSEEK_MODEL,
  GEMINI_TIMEOUT_MS, OPENROUTER_TIMEOUT_MS,
  OPENROUTER_API_URL, CACHE_TTL_MS,
} from '../config/constants.js';
import { getSystemPrompt, buildAnalysisPrompt, getChatSystemPrompt } from '../config/prompts.js';

let geminiClient = null;

function getGeminiClient() {
  if (!GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

const GEMINI_SAFETY_SETTINGS = Object.freeze([
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
]);

function getGeminiModel(systemInstruction) {
  const client = getGeminiClient();
  if (!client) return null;
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    safetySettings: GEMINI_SAFETY_SETTINGS,
  });
}

const responseCache = new Map();

function getCached(key) {
  const entry = responseCache.get(key);
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
    return entry.data;
  }
  responseCache.delete(key);
  return null;
}

function setCache(key, data) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

export async function analyzeWithGemini(entry, exam) {
  const model = getGeminiModel(getSystemPrompt());
  if (!model) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = buildAnalysisPrompt(entry, exam);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
  );

  const result = await Promise.race([
    model.generateContent(prompt),
    timeoutPromise,
  ]);
  const text = result.response.text();

  const cleaned = text
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*$/gm, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  parsed.provider = 'Google Gemini 2.0 Flash-Lite';
  return parsed;
}

export async function callOpenRouter(messages) {
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
      messages,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);
  const result = await response.json();

  if (result.error || !result.choices) {
    throw new Error(result.error?.message || 'OpenRouter API failed');
  }

  const text = result.choices[0].message.content;

  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export async function analyzeWithOpenRouter(entry, exam) {
  const prompt = `${getSystemPrompt()}\n\n${buildAnalysisPrompt(entry, exam)}`;
  const rawText = await callOpenRouter([{ role: 'user', content: prompt }]);

  const cleaned = rawText
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*$/gm, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    parsed.provider = 'DeepSeek V4 Flash';
    return parsed;
  } catch (parseErr) {
    console.error('OpenRouter JSON parse attempt 1 failed, trying repair...');
    try {
      const repaired = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/(?<=:\s*"[^"]*)"(?=[^"]*"[,}\]])/g, '\\"');
      const parsed = JSON.parse(repaired);
      parsed.provider = 'DeepSeek V4 Flash';
      return parsed;
    } catch (repairErr) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          parsed.provider = 'DeepSeek V4 Flash';
          return parsed;
        } catch (e) {
          console.error('OpenRouter all JSON parse attempts failed. Raw:', cleaned.substring(0, 500));
        }
      }
      throw new Error('OpenRouter returned invalid JSON');
    }
  }
}

const STRESS_WORDS = Object.freeze([
  'stress', 'anxious', 'worried', 'scared', 'panic',
  'overwhelm', 'pressure', 'can\'t', 'fail', 'behind',
]);

const POSITIVE_WORDS = Object.freeze([
  'happy', 'good', 'great', 'confident', 'ready',
  'motivated', 'excited', 'progress', 'solved', 'understood',
]);

export function getFallbackAnalysis(entry, exam) {
  const lowerEntry = entry.toLowerCase();
  const stressCount = STRESS_WORDS.filter((w) => lowerEntry.includes(w)).length;
  const positiveCount = POSITIVE_WORDS.filter((w) => lowerEntry.includes(w)).length;

  const isStressed = stressCount > positiveCount;
  const score = isStressed ? Math.max(3, 5 - stressCount) : Math.min(8, 5 + positiveCount);

  return {
    mood: {
      primary: isStressed ? 'stressed' : 'motivated',
      score,
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
}

export async function analyzeJournal(entry, exam) {
  const cacheKey = `${exam}:${entry.trim().substring(0, 100)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('Cache hit — returning cached analysis');
    return cached;
  }

  let result;

  try {
    result = await analyzeWithOpenRouter(entry, exam);
  } catch (deepseekError) {
    console.error('DeepSeek failed, trying Gemini:', deepseekError.message);

    try {
      result = await analyzeWithGemini(entry, exam);
    } catch (geminiError) {
      console.error('Gemini failed, using static fallback:', geminiError.message);
      result = getFallbackAnalysis(entry, exam);
    }
  }

  setCache(cacheKey, result);
  return result;
}

export async function chatWithAI(messages, exam) {
  const chatSystemPrompt = getChatSystemPrompt(exam);

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

  const geminiModel = getGeminiModel(chatSystemPrompt);
  if (geminiModel) {
    try {

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini chat timeout')), GEMINI_TIMEOUT_MS)
      );

      const chatMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chat = geminiModel.startChat({ history: chatMessages.slice(0, -1) });
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

  const SUPPORTIVE_REPLIES = Object.freeze([
    "I hear you, and what you're feeling is completely valid. Remember, every small step counts — even on tough days. 💛",
    "That takes courage to share. One thing that might help: try writing down 3 things that went well today, no matter how small. 🌟",
    "You're not alone in this. Many students feel this way during preparation. Have you tried a 2-minute breathing exercise? It can reset your focus. 🫁",
    "It's okay to have these feelings. Your awareness itself shows strength. What's one kind thing you can do for yourself right now? 🌈",
    "Thank you for trusting me with that. Progress isn't always linear — some days are harder, and that's part of the journey. 💪",
  ]);
  const idx = Math.floor(Math.random() * SUPPORTIVE_REPLIES.length);

  return {
    reply: SUPPORTIVE_REPLIES[idx],
    provider: 'MindMate AI (offline mode)',
  };
}
