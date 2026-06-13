/**
 * MindMate AI — Frontend Application
 * Handles journal submission, mood tracking, chart rendering,
 * and AI response display.
 * @module app
 */

// ── Constants ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'mindmate_mood_history';
const THEME_KEY = 'mindmate_theme';
const MAX_HISTORY = 30;

// ── Mood Emoji Map ────────────────────────────────────────────────────
/** Map mood names to their emoji representations */
const MOOD_EMOJIS = {
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
};

// ── DOM Elements ──────────────────────────────────────────────────────
const journalForm = document.getElementById('journal-form');
const journalInput = document.getElementById('journal-input');
const examSelect = document.getElementById('exam-select');
const submitBtn = document.getElementById('submit-btn');
const charCount = document.getElementById('char-count');

const aiResponse = document.getElementById('ai-response');
const welcomeMessage = document.getElementById('welcome-message');
const copingSection = document.getElementById('coping-section');
const moodPlaceholder = document.getElementById('mood-placeholder');
const moodStats = document.getElementById('mood-stats');
const themeToggle = document.getElementById('theme-toggle');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// ── Chart Instance ────────────────────────────────────────────────────
/** @type {Chart|null} */
let moodChart = null;

// ── Theme Management ──────────────────────────────────────────────────

/**
 * Initialize theme from localStorage or default to dark.
 */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/**
 * Toggle between light and dark themes.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);

  // Update chart colors if chart exists
  if (moodChart) {
    renderMoodChart();
  }
}

// ── Mood History (localStorage) ───────────────────────────────────────

/**
 * Load mood history from localStorage.
 * @returns {Array<object>} Array of mood entries.
 */
function loadHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new mood entry to localStorage.
 * @param {object} entry - Mood entry with date, mood, score, exam.
 */
function saveEntry(entry) {
  const history = loadHistory();
  history.push({
    date: new Date().toISOString(),
    mood: entry.mood,
    score: entry.score,
    exam: entry.exam,
    triggers: entry.triggers || [],
  });

  // Keep only the last MAX_HISTORY entries
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Clear all mood history from localStorage.
 */
function clearHistory() {
  if (confirm('Clear all mood history? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    renderMoodChart();
    updateMoodStats();
  }
}

// ── Chart Rendering ───────────────────────────────────────────────────

/**
 * Get theme-appropriate chart colors.
 * @returns {object} Chart color configuration.
 */
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    line: '#5c7cfa',
    fill: isDark ? 'rgba(92, 124, 250, 0.15)' : 'rgba(92, 124, 250, 0.1)',
    grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    text: isDark ? '#adb5bd' : '#495057',
    point: '#20c997',
    pointBorder: isDark ? '#1a1a2e' : '#ffffff',
  };
}

/**
 * Render the mood timeline chart using Chart.js.
 */
function renderMoodChart() {
  const history = loadHistory();
  const canvas = document.getElementById('mood-chart');

  if (history.length === 0) {
    if (moodPlaceholder) moodPlaceholder.style.display = 'block';
    canvas.style.display = 'none';
    if (moodStats) moodStats.hidden = true;
    return;
  }

  // Show chart, hide placeholder
  if (moodPlaceholder) moodPlaceholder.style.display = 'none';
  canvas.style.display = 'block';
  if (moodStats) moodStats.hidden = false;

  const colors = getChartColors();

  const labels = history.map((h) => {
    const d = new Date(h.date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });

  const scores = history.map((h) => h.score);
  const emojis = history.map((h) => MOOD_EMOJIS[h.mood] || '😐');

  // Destroy previous chart instance if exists
  if (moodChart) {
    moodChart.destroy();
  }

  moodChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Mood Score',
        data: scores,
        borderColor: colors.line,
        backgroundColor: colors.fill,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: colors.point,
        pointBorderColor: colors.pointBorder,
        pointBorderWidth: 2,
        pointHoverRadius: 9,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.9)',
          titleColor: '#ffffff',
          bodyColor: '#e9ecef',
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function(ctx) {
              const idx = ctx.dataIndex;
              return `${emojis[idx]} Score: ${ctx.parsed.y}/10`;
            },
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            color: colors.text,
            font: { size: 11 },
          },
          grid: { color: colors.grid },
        },
        x: {
          ticks: {
            color: colors.text,
            font: { size: 11 },
            maxRotation: 45,
          },
          grid: { display: false },
        },
      },
    },
  });
}

/**
 * Update mood statistics display.
 */
function updateMoodStats() {
  const history = loadHistory();

  const entriesEl = document.getElementById('stat-entries');
  const avgEl = document.getElementById('stat-avg');
  const trendEl = document.getElementById('stat-trend');

  if (history.length === 0) {
    if (moodStats) moodStats.hidden = true;
    return;
  }

  if (moodStats) moodStats.hidden = false;

  const scores = history.map((h) => h.score || 5);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  entriesEl.textContent = history.length;
  avgEl.textContent = `${avg.toFixed(1)}/10`;

  // Calculate trend from last 3 vs overall
  if (scores.length >= 3) {
    const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recentAvg > avg + 0.5) {
      trendEl.textContent = '📈 Up';
      trendEl.style.color = '#20c997';
    } else if (recentAvg < avg - 0.5) {
      trendEl.textContent = '📉 Down';
      trendEl.style.color = '#f783ac';
    } else {
      trendEl.textContent = '➡️ Steady';
      trendEl.style.color = '#5c7cfa';
    }
  } else {
    trendEl.textContent = '—';
  }
}

// ── AI Response Rendering ─────────────────────────────────────────────

/**
 * Get mood category from score for badge styling.
 * @param {number} score - Mood score 1-10.
 * @returns {string} Category: 'positive', 'neutral', or 'negative'.
 */
function getMoodCategory(score) {
  if (score >= 7) return 'positive';
  if (score >= 4) return 'neutral';
  return 'negative';
}

/**
 * Render the AI analysis response in the UI.
 * @param {object} data - Analysis data from the API.
 */
function renderAnalysis(data) {
  const { mood, analysis, support, follow_up_question: followUp } = data;
  const category = getMoodCategory(mood.score);
  const emoji = MOOD_EMOJIS[mood.primary] || '😐';

  aiResponse.innerHTML = `
    <div class="analysis-result">
      <!-- Provider Badge -->
      ${data.provider ? `
      <div class="provider-badge">
        <span>🤖</span>
        <span>Powered by ${escapeHtml(data.provider)}</span>
      </div>
      ` : ''}

      <!-- Mood Badge -->
      <div class="mood-badge ${category}">
        <span>${emoji}</span>
        <span>Feeling ${mood.primary.replace('_', ' ')} — ${mood.score}/10</span>
      </div>

      <!-- Empathetic Response -->
      <div class="response-section">
        <p class="empathetic-text">${escapeHtml(support.empathetic_response)}</p>
      </div>

      <!-- Analysis Summary -->
      <div class="response-section">
        <h4>🔍 What I Notice</h4>
        <p>${escapeHtml(analysis.summary)}</p>
      </div>

      <!-- Stress Triggers -->
      ${analysis.stress_triggers && analysis.stress_triggers.length > 0 ? `
      <div class="response-section">
        <h4>⚡ Stress Triggers Detected</h4>
        <div class="trigger-tags">
          ${analysis.stress_triggers.map((t) => `<span class="trigger-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Emotional Patterns -->
      ${analysis.emotional_patterns ? `
      <div class="response-section">
        <h4>🧩 Emotional Patterns</h4>
        <p>${escapeHtml(analysis.emotional_patterns)}</p>
      </div>
      ` : ''}

      <!-- Hidden Concerns -->
      ${analysis.hidden_concerns ? `
      <div class="response-section">
        <h4>💡 Between the Lines</h4>
        <p>${escapeHtml(analysis.hidden_concerns)}</p>
      </div>
      ` : ''}

      <!-- Follow-up Question -->
      ${followUp ? `
      <div class="follow-up-box">
        <p>${escapeHtml(followUp)}</p>
      </div>
      ` : ''}
    </div>
  `;

  // Show and populate coping section
  copingSection.hidden = false;
  renderCopingStrategies(support);

  // Show chat interface for conversational follow-up
  showChatInterface(data);
}

// ── Chat Conversation System ──────────────────────────────────────────

/** Conversation history for multi-turn chat */
let chatHistory = [];
/** Context from the last journal analysis */
let lastAnalysisContext = null;

/**
 * Show the chat interface after an analysis is rendered.
 * Seeds the conversation with the AI's initial analysis summary.
 * @param {object} analysisData - The analysis response from the API.
 */
function showChatInterface(analysisData) {
  const chatSection = document.getElementById('chat-section');
  const chatMessages = document.getElementById('chat-messages');
  if (!chatSection || !chatMessages) return;

  chatSection.hidden = false;
  chatMessages.innerHTML = '';
  lastAnalysisContext = analysisData;

  // Seed the conversation with the journal analysis context
  const summaryText = analysisData.analysis?.summary || 'I\'ve read your journal entry.';
  const followUp = analysisData.follow_up_question || 'Would you like to talk more?';

  chatHistory = [
    {
      role: 'assistant',
      content: `${summaryText} ${followUp}`,
    },
  ];

  // Add the AI's opening message as a chat bubble
  addChatBubble('ai', `${summaryText} ${followUp}`, analysisData.provider);

  // Focus the chat input
  setTimeout(() => {
    document.getElementById('chat-input')?.focus();
  }, 300);
}

/**
 * Add a chat bubble to the conversation display.
 * @param {string} type - 'user' or 'ai'.
 * @param {string} text - Message text.
 * @param {string} [provider] - AI provider name (for AI bubbles).
 */
function addChatBubble(type, text, provider) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.innerHTML = escapeHtml(text)
    + (type === 'ai' && provider
      ? `<span class="chat-provider">via ${escapeHtml(provider)}</span>`
      : '');

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Show a typing indicator while waiting for AI response.
 * @returns {HTMLElement} The typing indicator element.
 */
function showTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return null;

  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.innerHTML = '<span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return typing;
}

/**
 * Handle chat form submission.
 * Sends the conversation history to /api/chat and displays the reply.
 * @param {Event} e - Submit event.
 */
async function handleChatSubmit(e) {
  e.preventDefault();

  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.querySelector('.btn-chat-send');
  const message = chatInput.value.trim();

  if (!message) return;

  // Add user message
  chatHistory.push({ role: 'user', content: message });
  addChatBubble('user', message);
  chatInput.value = '';
  sendBtn.disabled = true;

  // Show typing indicator
  const typing = showTypingIndicator();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        exam: examSelect.value || 'General',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();

    // Remove typing indicator
    typing?.remove();

    if (data.reply) {
      chatHistory.push({ role: 'assistant', content: data.reply });
      addChatBubble('ai', data.reply, data.provider);
    } else if (data.error) {
      addChatBubble('ai', data.error);
    }
  } catch (err) {
    typing?.remove();
    addChatBubble('ai', "I'm sorry, I couldn't process that right now. Please try again. 💛");
  }

  sendBtn.disabled = false;
  chatInput.focus();
}

/**
 * Render coping strategies and mindfulness exercises.
 * @param {object} support - Support data from the API.
 */
function renderCopingStrategies(support) {
  const { coping_strategy: strategy, mindfulness_exercise: mindfulness, motivational_message: motivation } = support;

  // Strategy card
  if (strategy) {
    document.getElementById('strategy-title').textContent = strategy.title;
    document.getElementById('strategy-desc').textContent = strategy.description;
    const stepsList = document.getElementById('strategy-steps');
    stepsList.innerHTML = strategy.steps
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('');
  }

  // Mindfulness card
  if (mindfulness) {
    document.getElementById('mindfulness-title').textContent = mindfulness.title;
    document.getElementById('mindfulness-duration').textContent = `⏱️ ${mindfulness.duration}`;
    document.getElementById('mindfulness-instructions').textContent = mindfulness.instructions;
  }

  // Motivational message
  if (motivation) {
    document.getElementById('motivational-text').textContent = motivation;
  }
}

/**
 * Escape HTML entities to prevent XSS.
 * @param {string} text - Raw text to escape.
 * @returns {string} Escaped HTML string.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── UI Helpers ────────────────────────────────────────────────────────

/**
 * Show the loading overlay.
 */
function showLoading() {
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
}

/**
 * Hide the loading state on the button.
 */
function hideLoading() {
  submitBtn.classList.remove('loading');
  submitBtn.disabled = false;
}

/**
 * Show an error message in the AI response area.
 * @param {string} message - Error message to display.
 */
function showError(message) {
  aiResponse.innerHTML = `
    <div class="analysis-result">
      <div class="mood-badge negative">
        <span>⚠️</span>
        <span>${escapeHtml(message)}</span>
      </div>
      <div class="response-section">
        <p class="empathetic-text">
          Something didn't go as planned, but that's okay — just like in your exam prep,
          we can always try again. Please submit your journal entry once more.
        </p>
      </div>
    </div>
  `;
}

// ── Event Handlers ────────────────────────────────────────────────────

/**
 * Handle journal form submission.
 * Sends journal entry to the API and renders the response.
 * @param {Event} e - Form submit event.
 */
async function handleSubmit(e) {
  e.preventDefault();

  const entry = journalInput.value.trim();
  const exam = examSelect.value;

  // Client-side validation
  if (!exam) {
    examSelect.focus();
    return;
  }

  if (entry.length < 10) {
    journalInput.focus();
    return;
  }

  showLoading();

  try {
    // 30-second timeout to prevent spinner getting stuck
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('/api/analyze-journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry, exam }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to analyze journal.');
    }

    // Save mood to history
    saveEntry({
      mood: data.mood?.primary || 'unknown',
      score: data.mood?.score || 5,
      exam: exam,
      triggers: data.analysis?.stress_triggers || [],
    });

    // Render everything
    renderAnalysis(data);
    renderMoodChart();
    updateMoodStats();

    // Hide welcome message
    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }

    // Scroll to response on mobile
    if (window.innerWidth <= 768) {
      aiResponse.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    console.error('Submit error:', err);
    const msg = err.name === 'AbortError'
      ? 'Request timed out. Please try again.'
      : err.message;
    showError(msg);
  } finally {
    hideLoading();
  }
}

/**
 * Update character count display.
 */
function handleCharCount() {
  const count = journalInput.value.length;
  charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
}

// ── Initialization ────────────────────────────────────────────────────

// ── Quick Mood Check ──────────────────────────────────────────────────

/** Handle quick mood button clicks */
function initQuickMoodCheck() {
  const grid = document.getElementById('quick-mood-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (!btn) return;

    // Visual feedback
    grid.querySelectorAll('.mood-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Save to history
    saveEntry({
      mood: btn.dataset.mood,
      score: parseInt(btn.dataset.score, 10),
      exam: examSelect.value || 'General',
      triggers: [],
    });

    // Update chart
    renderMoodChart();
    updateMoodStats();

    // Brief feedback animation
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 300);
  });
}

// ── Breathing Exercise ────────────────────────────────────────────────

/** Breathing exercise state */
let breathingActive = false;
let breathingTimer = null;

/**
 * Initialize the breathing exercise widget.
 * 4-phase box breathing: Inhale → Hold → Exhale → Hold
 */
function initBreathingExercise() {
  const circle = document.getElementById('breath-circle');
  const text = document.getElementById('breath-text');
  const instruction = document.getElementById('breath-instruction');
  if (!circle) return;

  circle.addEventListener('click', () => {
    if (breathingActive) {
      // Stop
      breathingActive = false;
      clearTimeout(breathingTimer);
      circle.className = 'breath-circle';
      text.textContent = 'Tap to start';
      instruction.textContent = '4-4-4-4 Box Breathing • Tap the circle to begin';
      return;
    }

    breathingActive = true;
    instruction.textContent = 'Tap again to stop';
    runBreathCycle(circle, text, 0);
  });
}

/**
 * Run one phase of the breathing cycle.
 * @param {HTMLElement} circle - The breathing circle element.
 * @param {HTMLElement} text - The breathing text element.
 * @param {number} phase - Current phase (0-3).
 */
function runBreathCycle(circle, text, phase) {
  if (!breathingActive) return;

  const phases = [
    { class: 'inhale', label: 'Breathe In...', duration: 4000 },
    { class: 'hold', label: 'Hold...', duration: 4000 },
    { class: 'exhale', label: 'Breathe Out...', duration: 4000 },
    { class: 'hold', label: 'Hold...', duration: 4000 },
  ];

  const current = phases[phase % 4];
  circle.className = `breath-circle ${current.class}`;
  text.textContent = current.label;

  breathingTimer = setTimeout(() => {
    runBreathCycle(circle, text, phase + 1);
  }, current.duration);
}

// ── Daily Affirmations ────────────────────────────────────────────────

/** Exam-specific affirmations for students */
const AFFIRMATIONS = [
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
];

/**
 * Show a random affirmation.
 */
function showAffirmation() {
  const text = document.getElementById('affirmation-text');
  if (!text) return;
  const idx = Math.floor(Math.random() * AFFIRMATIONS.length);
  text.textContent = AFFIRMATIONS[idx];
}

/**
 * Initialize the affirmation widget.
 */
function initAffirmations() {
  showAffirmation();
  const btn = document.getElementById('new-affirmation-btn');
  if (btn) {
    btn.addEventListener('click', showAffirmation);
  }
}

// ── Initialization ────────────────────────────────────────────────────

/**
 * Initialize the MindMate AI application.
 */
function init() {
  // Set theme
  initTheme();

  // Render existing mood chart from history
  renderMoodChart();
  updateMoodStats();

  // Event listeners
  journalForm.addEventListener('submit', handleSubmit);
  journalInput.addEventListener('input', handleCharCount);
  themeToggle.addEventListener('click', toggleTheme);
  clearHistoryBtn.addEventListener('click', clearHistory);

  // Initialize new interactive widgets
  initQuickMoodCheck();
  initBreathingExercise();
  initAffirmations();

  // Chat conversation
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }

  console.log('🧠 MindMate AI initialized');
}

// Start the app
init();
