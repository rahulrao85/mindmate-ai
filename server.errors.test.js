import { jest } from '@jest/globals';

describe('500 Error Handling', () => {
  let request;
  let app;

  beforeAll(async () => {
    jest.unstable_mockModule('./services/ai.js', () => ({
      analyzeJournal: jest.fn().mockRejectedValue(new Error('Simulated AI failure')),
      chatWithAI: jest.fn().mockResolvedValue({ reply: 'Test fallback reply', provider: 'test' }),
      analyzeWithGemini: jest.fn(),
      callOpenRouter: jest.fn(),
      analyzeWithOpenRouter: jest.fn(),
      getFallbackAnalysis: jest.fn(),
    }));

    const supertest = await import('supertest');
    const server = await import('./server.js');
    request = supertest.default;
    app = server.default;
  }, 30000);

  test('POST /api/analyze-journal should return 500 on AI service failure', async () => {
    const res = await request(app)
      .post('/api/analyze-journal')
      .send({ entry: 'This is a test entry for error handling simulation purposes.', exam: 'NEET' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  }, 30000);
});
