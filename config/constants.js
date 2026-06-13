export const PORT = process.env.PORT || 3000;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const RATE_LIMIT_MAX = 100;

export const PAYLOAD_LIMIT = '16kb';

export const GEMINI_TIMEOUT_MS = 10000;

export const OPENROUTER_TIMEOUT_MS = 25000;

export const MIN_JOURNAL_LENGTH = 10;

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEEPSEEK_MODEL = 'deepseek/deepseek-v4-flash';

export const GEMINI_MODEL = 'gemini-2.0-flash-lite';

export const CACHE_TTL_MS = 5 * 60 * 1000;

export const VALID_EXAMS = [
  'NEET', 'JEE', 'CUET', 'CAT', 'GATE', 'UPSC', 'Board Exams', 'Other',
];

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export const BUCKET_NAME = process.env.GCS_BUCKET || 'mindmate-ai-data';
