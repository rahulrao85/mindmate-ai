import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'mindmate-ai' });
});

app.listen(PORT, () => {
  console.log(`MindMate AI server running on http://localhost:${PORT}`);
});

export default app;
