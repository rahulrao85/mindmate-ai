import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import { PORT, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, PAYLOAD_LIMIT } from './config/constants.js';
import analyzeRouter from './routes/analyze.js';
import chatRouter from './routes/chat.js';
import insightsRouter from './routes/insights.js';

const app = express();

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
app.use(compression());

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.static('public', {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

app.use('/api', analyzeRouter);
app.use('/api', chatRouter);
app.use('/api', insightsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MindMate AI',
    timestamp: new Date().toISOString(),
  });
});

const isDirectRun = process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`  MindMate AI server running on http://localhost:${PORT}`);
  });
}

export default app;
