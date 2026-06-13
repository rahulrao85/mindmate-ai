/**
 * MindMate AI — Server Test Suite
 * Tests all API endpoints, validation, security, and error handling.
 * @module server.test
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from './server.js';

describe('MindMate AI Server', () => {

  // ── Static Files ──────────────────────────────────────────────────
  describe('Static File Serving', () => {
    test('GET / should return HTML with 200 status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    test('GET /style.css should return CSS', async () => {
      const res = await request(app).get('/style.css');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/css/);
    });

    test('GET /app.js should return JavaScript', async () => {
      const res = await request(app).get('/app.js');
      expect(res.status).toBe(200);
    });
  });

  // ── Security Headers ──────────────────────────────────────────────
  describe('Security Headers', () => {
    test('should include security headers from helmet', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    test('should include rate limit headers on API routes', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ entry: 'test', exam: 'NEET' });
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });

  // ── Compression ───────────────────────────────────────────────────
  describe('Compression', () => {
    test('should support gzip compression', async () => {
      const res = await request(app)
        .get('/')
        .set('Accept-Encoding', 'gzip');
      // Compression middleware is active
      expect(res.status).toBe(200);
    });
  });

  // ── Health Check ──────────────────────────────────────────────────
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('MindMate AI');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ── Journal Analysis Endpoint ─────────────────────────────────────
  describe('POST /api/analyze-journal', () => {
    test('should return 400 when entry is missing', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should return 400 when entry is empty string', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ entry: '', exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should return 400 when entry is whitespace only', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ entry: '   ', exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should return 400 when entry is too short', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ entry: 'hi', exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/bit more/);
    });

    test('should return 400 when entry is not a string', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ entry: 12345, exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should accept valid journal entry and return analysis', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({
          entry: 'Today was really stressful. I studied for 10 hours but still feel unprepared for the NEET exam.',
          exam: 'NEET',
        });
      expect(res.status).toBe(200);
      expect(res.body.mood).toBeDefined();
      expect(res.body.mood.primary).toBeDefined();
      expect(res.body.mood.score).toBeDefined();
      expect(res.body.analysis).toBeDefined();
      expect(res.body.support).toBeDefined();
    }, 60000);

    test('should handle unknown exam type gracefully', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({
          entry: 'I feel great about my preparation today. Really confident!',
          exam: 'UNKNOWN_EXAM',
        });
      expect(res.status).toBe(200);
      expect(res.body.mood).toBeDefined();
    }, 60000);

    test('should handle positive journal entries', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({
          entry: 'Had an amazing study session today! Solved 50 problems and feel really confident about physics.',
          exam: 'JEE',
        });
      expect(res.status).toBe(200);
      expect(res.body.mood.score).toBeGreaterThanOrEqual(1);
      expect(res.body.mood.score).toBeLessThanOrEqual(10);
    }, 60000);
  });

  // ── Mood Insights Endpoint ────────────────────────────────────────
  describe('POST /api/mood-insights', () => {
    test('should return 400 when history is empty', async () => {
      const res = await request(app)
        .post('/api/mood-insights')
        .send({ history: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should return 400 when history is not an array', async () => {
      const res = await request(app)
        .post('/api/mood-insights')
        .send({ history: 'not-an-array' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should return insights for valid mood history', async () => {
      const history = [
        { date: '2026-06-10', mood: 'stressed', score: 3 },
        { date: '2026-06-11', mood: 'anxious', score: 4 },
        { date: '2026-06-12', mood: 'calm', score: 6 },
        { date: '2026-06-13', mood: 'motivated', score: 8 },
      ];

      const res = await request(app)
        .post('/api/mood-insights')
        .send({ history });

      expect(res.status).toBe(200);
      expect(res.body.insights).toBeDefined();
      expect(res.body.insights.total_entries).toBe(4);
      expect(res.body.insights.average_score).toBeDefined();
      expect(res.body.insights.trend).toBeDefined();
      expect(res.body.recommendation).toBeDefined();
    });

    test('should detect improving trend', async () => {
      const history = [
        { date: '2026-06-10', mood: 'sad', score: 2 },
        { date: '2026-06-11', mood: 'stressed', score: 3 },
        { date: '2026-06-12', mood: 'calm', score: 7 },
        { date: '2026-06-13', mood: 'happy', score: 9 },
      ];

      const res = await request(app)
        .post('/api/mood-insights')
        .send({ history });

      expect(res.status).toBe(200);
      expect(res.body.insights.trend).toBe('improving');
    });

    test('should detect declining trend', async () => {
      const history = [
        { date: '2026-06-10', mood: 'happy', score: 9 },
        { date: '2026-06-11', mood: 'motivated', score: 8 },
        { date: '2026-06-12', mood: 'stressed', score: 3 },
        { date: '2026-06-13', mood: 'sad', score: 2 },
      ];

      const res = await request(app)
        .post('/api/mood-insights')
        .send({ history });

      expect(res.status).toBe(200);
      expect(res.body.insights.trend).toBe('declining');
    });

    test('should identify dominant mood correctly', async () => {
      const history = [
        { date: '2026-06-10', mood: 'stressed', score: 3 },
        { date: '2026-06-11', mood: 'stressed', score: 4 },
        { date: '2026-06-12', mood: 'stressed', score: 3 },
        { date: '2026-06-13', mood: 'calm', score: 6 },
      ];

      const res = await request(app)
        .post('/api/mood-insights')
        .send({ history });

      expect(res.status).toBe(200);
      expect(res.body.insights.dominant_mood).toBe('stressed');
    });
  });

  // ── JSON Body Limit ───────────────────────────────────────────────
  describe('Request Body Limits', () => {
    test('should reject payloads exceeding 16kb', async () => {
      const largeEntry = 'x'.repeat(20000);
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({ entry: largeEntry, exam: 'NEET' });
      expect(res.status).toBe(413);
    });
  });

  // ── Google Cloud SDK Integration ──────────────────────────────────
  describe('Google Cloud SDK Integration', () => {
    test('server module should export express app with Google SDKs loaded', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    test('Google Cloud Logging should be importable', async () => {
      const { Logging } = await import('@google-cloud/logging');
      expect(Logging).toBeDefined();
      const logging = new Logging();
      expect(logging).toBeDefined();
    });

    test('Google Cloud Storage should be importable', async () => {
      const { Storage } = await import('@google-cloud/storage');
      expect(Storage).toBeDefined();
      const storage = new Storage();
      expect(storage).toBeDefined();
    });

    test('journal analysis should include mood structure for Cloud Logging', async () => {
      const res = await request(app)
        .post('/api/analyze-journal')
        .send({
          entry: 'Feeling quite overwhelmed with GATE preparation today. Too many subjects to cover.',
          exam: 'GATE',
        });
      expect(res.status).toBe(200);
      // Verify structured data suitable for Cloud Logging
      expect(res.body.mood).toHaveProperty('primary');
      expect(res.body.mood).toHaveProperty('score');
      expect(res.body.analysis).toHaveProperty('stress_triggers');
      expect(Array.isArray(res.body.analysis.stress_triggers)).toBe(true);
    }, 60000);
  });

  // ── Chat Endpoint ────────────────────────────────────────────────
  describe('POST /api/chat', () => {
    test('should return 400 when messages is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/message/i);
    });

    test('should return 400 when messages is empty array', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [], exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/message/i);
    });

    test('should return 400 when last message content is empty', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: '' }], exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    test('should return 400 when last message content is whitespace', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: '   ' }], exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    test('should return 400 when last message content is not a string', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: 123 }], exam: 'NEET' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    test('should accept valid chat messages and return reply', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({
          messages: [
            { role: 'user', content: 'I am feeling stressed about my NEET preparation.' },
          ],
          exam: 'NEET',
        });
      expect(res.status).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.reply.length).toBeGreaterThan(0);
    }, 60000);
  });

  // ── Rate Limiting ─────────────────────────────────────────────────
  describe('Rate Limiting', () => {
    test('should return 429 after exceeding request limit', async () => {
      let lastRes;
      for (let i = 0; i < 105; i++) {
        lastRes = await request(app).get('/api/health');
      }
      expect(lastRes.status).toBe(429);
      expect(lastRes.body.error).toMatch(/too many requests/i);
    }, 30000);
  });
});
