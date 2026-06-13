import { Router } from 'express';
import { chatWithAI } from '../services/ai.js';
import { VALID_EXAMS } from '../config/constants.js';

const router = Router();

router.post('/chat', async (req, res) => {
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

export default router;
