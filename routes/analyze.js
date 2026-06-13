import { Router } from 'express';
import { analyzeJournal } from '../services/ai.js';
import { writeLog, saveMoodToStorage } from '../services/cloud.js';
import { VALID_EXAMS, MIN_JOURNAL_LENGTH } from '../config/constants.js';

const router = Router();

router.post('/analyze-journal', async (req, res) => {
  try {
    const { entry, exam } = req.body;

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

    const examType = VALID_EXAMS.includes(exam) ? exam : 'Other';

    const data = await analyzeJournal(entry.trim(), examType);

    writeLog(
      data.mood?.primary || 'unknown',
      data.mood?.score || 5,
      examType,
      data.analysis?.stress_triggers || []
    );

    saveMoodToStorage(data, examType);

    res.json(data);
  } catch (err) {
    console.error('Journal analysis error:', err);
    res.status(500).json({
      error: 'Something went wrong. Please try again — I\'m here for you.',
    });
  }
});

export default router;
