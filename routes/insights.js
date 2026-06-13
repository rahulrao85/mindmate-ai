import { Router } from 'express';

const router = Router();

router.post('/mood-insights', async (req, res) => {
  try {
    const { history } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        error: 'No mood history available yet. Start journaling to build your timeline!',
      });
    }

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
        trend,
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

export default router;
