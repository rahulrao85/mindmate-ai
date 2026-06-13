export const STORAGE_KEY = 'mindmate_mood_history';
export const THEME_KEY = 'mindmate_theme';
export const MAX_HISTORY = 30;

export function loadHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry) {
  const history = loadHistory();
  history.push({
    date: new Date().toISOString(),
    mood: entry.mood,
    score: entry.score,
    exam: entry.exam,
    triggers: entry.triggers || [],
  });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
