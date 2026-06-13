export const MOOD_EMOJIS = Object.freeze({
  happy: '😊',
  motivated: '🔥',
  calm: '😌',
  anxious: '😰',
  stressed: '😫',
  burnt_out: '🥵',
  sad: '😢',
  frustrated: '😤',
  overwhelmed: '🌊',
  hopeful: '🌟',
});

export const AFFIRMATIONS = Object.freeze([
  "You are more prepared than you think. Trust the hours you've put in. 🌟",
  "Progress isn't always visible. Seeds grow in darkness before they bloom. 🌱",
  "One day at a time. One chapter at a time. One question at a time. 📚",
  "Your worth is not defined by a score. You are enough, exactly as you are. 💛",
  "The fact that you're trying today means you haven't given up. That's strength. 💪",
  "Comparison is the thief of joy. Your journey is uniquely yours. ✨",
  "Rest is not laziness. Your brain needs downtime to consolidate what you've learned. 🧠",
  "Every expert was once a beginner. Every topper once struggled with basics. 🎯",
  "You don't have to be perfect. You just have to be better than yesterday. 📈",
  "This exam is important, but it doesn't define your entire life. Breathe. 🫁",
  "Mistakes are proof that you're trying. Each wrong answer teaches you something right. ✅",
  "You've survived 100% of your worst days so far. You'll survive this too. 🌈",
  "The pressure you feel is the same pressure that creates diamonds. 💎",
  "Take a break. The books will wait. Your mental health cannot. 🧘",
  "You are not behind. You are on your own timeline, and that's perfectly okay. ⏰",
]);

export function getMoodCategory(score) {
  if (score >= 7) return 'positive';
  if (score >= 4) return 'neutral';
  return 'negative';
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
