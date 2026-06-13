import { MOOD_EMOJIS, AFFIRMATIONS, getMoodCategory, escapeHtml } from './app-utils.js';
import { loadHistory, saveEntry, STORAGE_KEY, THEME_KEY, MAX_HISTORY } from './app-storage.js';

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

let moodChart = null;

// ── Theme Management ──────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);

  if (moodChart) {
    renderMoodChart();
  }
}

// ── Mood History ──────────────────────────────────────────────────────

function clearHistory() {
  if (confirm('Clear all mood history? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    renderMoodChart();
    updateMoodStats();
  }
}

// ── Chart Rendering ───────────────────────────────────────────────────

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

function renderMoodChart() {
  const history = loadHistory();
  const canvas = document.getElementById('mood-chart');

  if (history.length === 0) {
    if (moodPlaceholder) moodPlaceholder.style.display = 'block';
    canvas.style.display = 'none';
    if (moodStats) moodStats.hidden = true;
    return;
  }

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

function renderAnalysis(data) {
  const { mood, analysis, support, follow_up_question: followUp } = data;
  const category = getMoodCategory(mood.score);
  const emoji = MOOD_EMOJIS[mood.primary] || '😐';

  aiResponse.innerHTML = `
    <div class="analysis-result">
      ${data.provider ? `
      <div class="provider-badge">
        <span>🤖</span>
        <span>Powered by ${escapeHtml(data.provider)}</span>
      </div>
      ` : ''}

      <div class="mood-badge ${category}">
        <span>${emoji}</span>
        <span>Feeling ${mood.primary.replace('_', ' ')} — ${mood.score}/10</span>
      </div>

      <div class="response-section">
        <p class="empathetic-text">${escapeHtml(support.empathetic_response)}</p>
      </div>

      <div class="response-section">
        <h4>🔍 What I Notice</h4>
        <p>${escapeHtml(analysis.summary)}</p>
      </div>

      ${analysis.stress_triggers && analysis.stress_triggers.length > 0 ? `
      <div class="response-section">
        <h4>⚡ Stress Triggers Detected</h4>
        <div class="trigger-tags">
          ${analysis.stress_triggers.map((t) => `<span class="trigger-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      ${analysis.emotional_patterns ? `
      <div class="response-section">
        <h4>🧩 Emotional Patterns</h4>
        <p>${escapeHtml(analysis.emotional_patterns)}</p>
      </div>
      ` : ''}

      ${analysis.hidden_concerns ? `
      <div class="response-section">
        <h4>💡 Between the Lines</h4>
        <p>${escapeHtml(analysis.hidden_concerns)}</p>
      </div>
      ` : ''}

      ${followUp ? `
      <div class="follow-up-box">
        <p>${escapeHtml(followUp)}</p>
      </div>
      ` : ''}
    </div>
  `;

  copingSection.hidden = false;
  renderCopingStrategies(support);
  showChatInterface(data);
}

// ── Chat Conversation System ──────────────────────────────────────────

let chatHistory = [];

let lastAnalysisContext = null;

function showChatInterface(analysisData) {
  const chatSection = document.getElementById('chat-section');
  const chatMessages = document.getElementById('chat-messages');
  if (!chatSection || !chatMessages) return;

  chatSection.hidden = false;
  chatMessages.innerHTML = '';
  lastAnalysisContext = analysisData;

  const summaryText = analysisData.analysis?.summary || 'I\'ve read your journal entry.';
  const followUp = analysisData.follow_up_question || 'Would you like to talk more?';

  chatHistory = [
    {
      role: 'assistant',
      content: `${summaryText} ${followUp}`,
    },
  ];

  addChatBubble('ai', `${summaryText} ${followUp}`, analysisData.provider);

  setTimeout(() => {
    document.getElementById('chat-input')?.focus();
  }, 300);
}

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

async function handleChatSubmit(e) {
  e.preventDefault();

  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.querySelector('.btn-chat-send');
  const message = chatInput.value.trim();

  if (!message) return;

  chatHistory.push({ role: 'user', content: message });
  addChatBubble('user', message);
  chatInput.value = '';
  sendBtn.disabled = true;

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

function renderCopingStrategies(support) {
  const { coping_strategy: strategy, mindfulness_exercise: mindfulness, motivational_message: motivation } = support;

  if (strategy) {
    document.getElementById('strategy-title').textContent = strategy.title;
    document.getElementById('strategy-desc').textContent = strategy.description;
    const stepsList = document.getElementById('strategy-steps');
    stepsList.innerHTML = strategy.steps
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('');
  }

  if (mindfulness) {
    document.getElementById('mindfulness-title').textContent = mindfulness.title;
    document.getElementById('mindfulness-duration').textContent = `⏱️ ${mindfulness.duration}`;
    document.getElementById('mindfulness-instructions').textContent = mindfulness.instructions;
  }

  if (motivation) {
    document.getElementById('motivational-text').textContent = motivation;
  }
}

// ── UI Helpers ────────────────────────────────────────────────────────

function showLoading() {
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
}

function hideLoading() {
  submitBtn.classList.remove('loading');
  submitBtn.disabled = false;
}

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

async function handleSubmit(e) {
  e.preventDefault();

  const entry = journalInput.value.trim();
  const exam = examSelect.value;

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

    saveEntry({
      mood: data.mood?.primary || 'unknown',
      score: data.mood?.score || 5,
      exam: exam,
      triggers: data.analysis?.stress_triggers || [],
    });

    renderAnalysis(data);
    renderMoodChart();
    updateMoodStats();

    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }

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

function handleCharCount() {
  const count = journalInput.value.length;
  charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
}

// ── Quick Mood Check ──────────────────────────────────────────────────

function initQuickMoodCheck() {
  const grid = document.getElementById('quick-mood-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (!btn) return;

    grid.querySelectorAll('.mood-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');

    saveEntry({
      mood: btn.dataset.mood,
      score: parseInt(btn.dataset.score, 10),
      exam: examSelect.value || 'General',
      triggers: [],
    });

    renderMoodChart();
    updateMoodStats();

    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 300);
  });
}

// ── Breathing Exercise ────────────────────────────────────────────────

let breathingActive = false;
let breathingTimer = null;

function initBreathingExercise() {
  const circle = document.getElementById('breath-circle');
  const text = document.getElementById('breath-text');
  const instruction = document.getElementById('breath-instruction');
  if (!circle) return;

  circle.addEventListener('click', () => {
    if (breathingActive) {
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

function showAffirmation() {
  const text = document.getElementById('affirmation-text');
  if (!text) return;
  const idx = Math.floor(Math.random() * AFFIRMATIONS.length);
  text.textContent = AFFIRMATIONS[idx];
}

function initAffirmations() {
  showAffirmation();
  const btn = document.getElementById('new-affirmation-btn');
  if (btn) {
    btn.addEventListener('click', showAffirmation);
  }
}

// ── Initialization ────────────────────────────────────────────────────

function init() {
  initTheme();
  renderMoodChart();
  updateMoodStats();

  journalForm.addEventListener('submit', handleSubmit);
  journalInput.addEventListener('input', handleCharCount);
  themeToggle.addEventListener('click', toggleTheme);
  clearHistoryBtn.addEventListener('click', clearHistory);

  initQuickMoodCheck();
  initBreathingExercise();
  initAffirmations();

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }

  console.log('🧠 MindMate AI initialized');
}

init();
