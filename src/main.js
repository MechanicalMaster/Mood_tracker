import './style.css'

// ===== Constants =====
const MOODS = [
  { id: 'angry', label: 'Angry', icon: '😡', gradient: 'from-red-100/50 to-orange-100/20' },
  { id: 'joyful', label: 'Joyful', icon: '🥰', gradient: 'from-primary/10 to-pastel-peach/20' },
  { id: 'calm', label: 'Calm', icon: '😌', gradient: 'from-blue-100/50 to-cyan-100/20' },
  { id: 'sad', label: 'Sad', icon: '😢', gradient: 'from-indigo-100/50 to-purple-100/20' },
  { id: 'anxious', label: 'Anxious', icon: '😰', gradient: 'from-amber-100/50 to-yellow-100/20' }
];

const CONTEXTS = [
  { id: 'work', label: 'Work', icon: 'work' },
  { id: 'family', label: 'Family', icon: 'family_restroom' },
  { id: 'sleep', label: 'Sleep', icon: 'bedtime' },
  { id: 'exercise', label: 'Exercise', icon: 'fitness_center' }
];

const STORAGE_KEY = 'mood-entries';

// ===== State =====
let currentScreen = 'capture';
let selectedMood = null;
let selectedContexts = [];
let intensity = 75;
let entries = [];

// ===== Storage =====
function loadEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    entries = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load entries:', e);
    entries = [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save entries:', e);
  }
}

// ===== Utilities =====
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatShortDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay && d.getDate() === now.getDate()) {
    return formatTime(date);
  } else if (diff < 2 * oneDay && d.getDate() === now.getDate() - 1) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function getMoodById(id) {
  return MOODS.find(m => m.id === id);
}

function getIntensityLabel(value) {
  if (value < 25) return 'Low';
  if (value < 50) return 'Mild';
  if (value < 75) return 'Moderate';
  return 'High';
}

function getWeekStats() {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekEntries = entries.filter(e => e.timestamp >= oneWeekAgo);

  if (weekEntries.length === 0) return null;

  const counts = {};
  weekEntries.forEach(e => {
    counts[e.mood] = (counts[e.mood] || 0) + 1;
  });

  let maxCount = 0;
  let topMood = null;
  for (const [mood, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      topMood = mood;
    }
  }

  return { topMood: getMoodById(topMood), count: maxCount, total: weekEntries.length };
}

function getMoodColor(moodId) {
  const colors = {
    joyful: 'mood-happy',
    calm: 'mood-calm',
    sad: 'mood-sad',
    angry: 'mood-angry',
    anxious: 'mood-energetic'
  };
  return colors[moodId] || 'mood-happy';
}

function getMoodTextColor(moodId) {
  const darkMoods = ['sad', 'angry', 'anxious'];
  return darkMoods.includes(moodId) ? 'text-white' : 'text-text-main';
}

// ===== Render Functions =====
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderCaptureScreen()}
    ${renderHistoryScreen()}
  `;

  attachEventListeners();

  // Auto-scroll to selected mood
  setTimeout(() => {
    const carousel = document.querySelector('.mood-carousel');
    if (carousel) {
      const selectedCard = carousel.querySelector('.mood-card.selected') || carousel.querySelector('.mood-card:nth-child(2)');
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, 100);
}

function renderCaptureScreen() {
  const now = new Date();

  return `
    <div class="screen capture-screen flex flex-col min-h-screen w-full max-w-md mx-auto bg-background-light ${currentScreen === 'capture' ? 'active' : ''}" id="capture-screen">
      
      <!-- Header -->
      <div class="flex items-center p-4 pb-2 justify-between z-10">
        <button class="text-text-main flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span class="material-symbols-outlined text-[24px]">close</span>
        </button>
        <h2 class="text-text-main text-lg font-bold leading-tight tracking-tight flex-1 text-center">Check-in</h2>
        <button class="nav-history flex w-auto px-2 items-center justify-end rounded-full hover:bg-black/5 transition-colors h-10" data-screen="history">
          <p class="text-primary-dark text-base font-bold leading-normal tracking-wide shrink-0">History</p>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto pb-24 hide-scrollbar">
        
        <!-- Greeting -->
        <div class="flex flex-col items-center pt-4 pb-6">
          <h1 class="text-text-main tracking-tight text-3xl font-extrabold leading-tight px-6 text-center">
            Hi there,<br/>what's the vibe?
          </h1>
          <p class="text-text-sub text-sm mt-2 font-medium">${formatDate(now)} • ${formatTime(now)}</p>
        </div>
        
        <!-- Mood Carousel -->
        <div class="relative w-full py-4">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-gradient-to-tr from-pastel-peach/40 to-primary/30 blur-[60px] rounded-full pointer-events-none"></div>
          <div class="mood-carousel flex w-full overflow-x-auto snap-x snap-mandatory px-6 py-4 gap-4 hide-scrollbar items-center">
            ${MOODS.map((mood, i) => `
              <button class="mood-card snap-center shrink-0 flex flex-col items-center gap-3 ${selectedMood === mood.id ? 'selected' : ''}" data-mood="${mood.id}">
                <div class="w-32 h-40 bg-surface-light rounded-3xl flex items-center justify-center relative overflow-hidden group ${selectedMood === mood.id ? 'shadow-soft ring-4 ring-primary/20' : 'shadow-card border border-slate-100'}">
                  <div class="absolute inset-0 bg-gradient-to-b ${mood.gradient}"></div>
                  <div class="${selectedMood === mood.id ? 'text-[80px]' : 'text-[64px]'} leading-none transform group-hover:scale-110 transition-transform duration-500 select-none drop-shadow-sm">${mood.icon}</div>
                </div>
                <p class="${selectedMood === mood.id ? 'text-primary-dark text-lg font-bold' : 'text-text-main text-base font-semibold'}">${mood.label}</p>
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Intensity Slider -->
        <div class="px-6 mt-4 mb-2">
          <div class="relative flex w-full flex-col gap-4 p-5 rounded-2xl bg-white shadow-card border border-slate-50">
            <div class="flex w-full items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary-dark">tune</span>
                <p class="text-text-main text-base font-bold leading-normal">Intensity</p>
              </div>
              <p class="text-primary-dark text-base font-bold leading-normal" id="intensity-label">${getIntensityLabel(intensity)}</p>
            </div>
            <div class="relative h-6 w-full flex items-center">
              <div class="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-pastel-peach to-primary transition-all duration-200" id="intensity-fill" style="width: ${intensity}%"></div>
              </div>
              <input type="range" min="0" max="100" value="${intensity}" class="absolute inset-0 w-full opacity-0 cursor-pointer" id="intensity-slider">
              <div class="absolute h-7 w-7 rounded-full bg-white border-[3px] border-primary shadow-md flex items-center justify-center pointer-events-none transition-all duration-200" id="intensity-thumb" style="left: ${intensity}%; transform: translateX(-50%)">
                <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Context Tags -->
        <div class="px-6 mt-6">
          <h3 class="text-text-main tracking-tight text-xl font-bold leading-tight text-left pb-4">Add Context</h3>
          <div class="flex flex-wrap gap-3">
            ${CONTEXTS.map(ctx => `
              <button class="context-tag group flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm ${selectedContexts.includes(ctx.id) ? 'selected' : 'bg-white border-slate-200 hover:border-secondary hover:bg-secondary/10'}" data-context="${ctx.id}">
                <span class="material-symbols-outlined text-[20px] ${selectedContexts.includes(ctx.id) ? 'text-white' : 'text-slate-400 group-hover:text-secondary-dark'} transition-colors">${ctx.icon}</span>
                <span class="text-sm font-semibold ${selectedContexts.includes(ctx.id) ? 'text-white' : 'text-slate-600 group-hover:text-text-main'} transition-colors">${ctx.label}</span>
              </button>
            `).join('')}
            <button class="flex items-center justify-center w-[42px] px-0 py-2.5 bg-transparent rounded-xl border border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 transition-all">
              <span class="material-symbols-outlined text-slate-400 text-[20px]">add</span>
            </button>
          </div>
        </div>
        
        <!-- Notes -->
        <div class="px-6 mt-6">
          <h3 class="text-text-main tracking-tight text-xl font-bold leading-tight text-left pb-4">Notes (optional)</h3>
          <textarea 
            class="w-full min-h-[80px] p-4 rounded-2xl bg-white border border-slate-100 shadow-card text-text-main placeholder:text-text-sub/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            id="notes-input"
            placeholder="What's on your mind?"
            rows="3"
          ></textarea>
        </div>
        
        <div class="h-24"></div>
      </div>
      
      <!-- Fixed Bottom Button -->
      <div class="absolute bottom-0 w-full p-6 bg-gradient-to-t from-background-light via-background-light/95 to-transparent">
        <button class="save-btn w-full h-14 bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 text-white disabled:opacity-50 disabled:cursor-not-allowed" id="save-btn" ${!selectedMood ? 'disabled' : ''}>
          <span class="text-lg font-bold tracking-wide btn-text">Log Mood</span>
          <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
          <span class="material-symbols-outlined btn-check hidden">check</span>
        </button>
      </div>
    </div>
  `;
}

function renderHistoryScreen() {
  const stats = getWeekStats();
  const now = new Date();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `
    <div class="screen history-screen flex flex-col min-h-screen w-full max-w-md mx-auto bg-background-purple ${currentScreen === 'history' ? 'active' : ''}" id="history-screen">
      
      <!-- Header -->
      <div class="sticky top-0 z-50 flex items-center bg-background-purple/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-primary-purple/10">
        <button class="nav-capture text-text-main flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary-purple/10 transition-colors" data-screen="capture">
          <span class="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h2 class="text-text-main text-lg font-extrabold leading-tight tracking-tight flex-1 text-center">Mood History</h2>
        <button class="flex size-10 items-center justify-center rounded-full hover:bg-primary-purple/10 transition-colors text-text-main">
          <span class="material-symbols-outlined text-[24px]">filter_list</span>
        </button>
      </div>
      
      <!-- Period Selector -->
      <div class="flex px-4 py-4 w-full">
        <div class="flex h-12 flex-1 items-center justify-center rounded-2xl bg-white shadow-sm border border-primary-purple/10 p-1">
          ${['Week', 'Month', 'Year'].map((period, i) => `
            <label class="period-option group flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 relative transition-all duration-200">
              <input class="peer invisible w-0 absolute" name="period-selector" type="radio" value="${period}" ${i === 1 ? 'checked' : ''}>
              <span class="z-10 truncate text-sm font-bold text-text-muted peer-checked:text-white transition-colors">${period}</span>
              <div class="period-bg absolute inset-0 bg-transparent peer-checked:bg-primary-purple rounded-xl shadow-md transition-all duration-200 scale-95 peer-checked:scale-100"></div>
            </label>
          `).join('')}
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="flex gap-3 overflow-x-auto px-4 py-2 hide-scrollbar snap-x">
        <div class="snap-center min-w-[140px] flex-1 flex flex-col gap-1 rounded-3xl p-5 bg-white shadow-soft border border-white/50">
          <div class="flex items-center gap-2 mb-2">
            <div class="p-1.5 rounded-full bg-mood-happy/20">
              <span class="material-symbols-outlined text-mood-happy text-[18px]">sentiment_satisfied</span>
            </div>
            <p class="text-text-muted text-[10px] font-bold uppercase tracking-wider">Top Mood</p>
          </div>
          <p class="text-text-main text-2xl font-bold leading-tight">${stats?.topMood?.label || 'None'}</p>
          <p class="text-text-muted text-xs font-medium">${stats?.count || 0} entries</p>
        </div>
        <div class="snap-center min-w-[140px] flex-1 flex flex-col gap-1 rounded-3xl p-5 bg-white shadow-soft border border-white/50 relative overflow-hidden group">
          <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="material-symbols-outlined text-primary-purple text-[50px]">local_fire_department</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <div class="p-1.5 rounded-full bg-primary-purple/20">
              <span class="material-symbols-outlined text-primary-purple text-[18px]">bolt</span>
            </div>
            <p class="text-text-muted text-[10px] font-bold uppercase tracking-wider">Entries</p>
          </div>
          <p class="text-text-main text-2xl font-bold leading-tight">${entries.length}</p>
          <p class="text-mood-calm text-xs font-bold flex items-center gap-1">Total logged</p>
        </div>
      </div>
      
      <!-- Recent Entries -->
      <div class="flex-1 px-4 py-4 pb-8">
        <h3 class="text-xl font-bold tracking-tight text-text-main mb-4 px-1">Recent Entries</h3>
        <div class="flex flex-col gap-4" id="entries-feed">
          ${entries.length === 0 ? `
            <div class="flex flex-col items-center justify-center py-12 text-center">
              <span class="material-symbols-outlined text-[64px] text-primary-purple/30 mb-4">mood</span>
              <p class="text-text-muted text-base">No entries yet</p>
              <p class="text-text-muted/60 text-sm mt-1">Start logging your moods!</p>
            </div>
          ` : entries.slice(0, 10).map(entry => renderEntryCard(entry)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEntryCard(entry) {
  const mood = getMoodById(entry.mood);
  const moodColor = getMoodColor(entry.mood);
  const contexts = entry.contexts || [];

  return `
    <div class="entry-card flex items-start gap-4 p-5 rounded-3xl bg-white shadow-soft border border-white/50 hover:border-primary-purple/50 transition-colors cursor-pointer group">
      <div class="flex-shrink-0 size-12 rounded-2xl bg-${moodColor}/30 flex items-center justify-center group-hover:scale-105 transition-transform">
        <span class="text-2xl">${mood?.icon || '😊'}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start">
          <h4 class="text-base font-bold text-text-main truncate">${mood?.label || 'Unknown'}</h4>
          <span class="text-xs font-semibold text-primary-purple/70 whitespace-nowrap bg-primary-purple/10 px-2 py-0.5 rounded-full">${formatShortDate(entry.timestamp)}</span>
        </div>
        ${entry.note ? `<p class="text-sm text-text-muted mt-1 line-clamp-2">${entry.note}</p>` : ''}
        ${contexts.length > 0 ? `
          <div class="flex gap-2 mt-3 flex-wrap">
            ${contexts.map(ctx => `
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-background-purple text-primary-purple-dark">#${ctx}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ===== Event Handlers =====
function attachEventListeners() {
  // Mood selection
  document.querySelectorAll('.mood-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedMood = card.dataset.mood;

      document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      document.getElementById('save-btn').disabled = false;

      // Scroll selected into view
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  // Intensity slider
  const slider = document.getElementById('intensity-slider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      intensity = parseInt(e.target.value);
      document.getElementById('intensity-label').textContent = getIntensityLabel(intensity);
      document.getElementById('intensity-fill').style.width = `${intensity}%`;
      document.getElementById('intensity-thumb').style.left = `${intensity}%`;
    });
  }

  // Context tags
  document.querySelectorAll('.context-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const ctx = tag.dataset.context;
      if (selectedContexts.includes(ctx)) {
        selectedContexts = selectedContexts.filter(c => c !== ctx);
        tag.classList.remove('selected');
      } else {
        selectedContexts.push(ctx);
        tag.classList.add('selected');
      }
    });
  });

  // Save button
  document.getElementById('save-btn')?.addEventListener('click', handleSave);

  // Navigation
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.screen);
    });
  });
}

function handleSave() {
  if (!selectedMood) return;

  const saveBtn = document.getElementById('save-btn');
  const notesInput = document.getElementById('notes-input');

  // Show saving state
  saveBtn.querySelector('.btn-text').classList.add('hidden');
  saveBtn.querySelector('.btn-arrow').classList.add('hidden');
  saveBtn.querySelector('.btn-check').classList.remove('hidden');

  // Create entry
  const entry = {
    id: Date.now().toString(),
    mood: selectedMood,
    intensity: intensity,
    contexts: [...selectedContexts],
    note: notesInput?.value.trim() || '',
    timestamp: Date.now()
  };

  entries.unshift(entry);
  saveEntries();

  // Navigate after delay
  setTimeout(() => {
    selectedMood = null;
    selectedContexts = [];
    intensity = 75;
    if (notesInput) notesInput.value = '';

    navigateTo('history');

    setTimeout(() => {
      const btn = document.getElementById('save-btn');
      if (btn) {
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-arrow').classList.remove('hidden');
        btn.querySelector('.btn-check').classList.add('hidden');
      }
    }, 300);
  }, 600);
}

function navigateTo(screen) {
  currentScreen = screen;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`${screen}-screen`)?.classList.add('active');

  // Re-render when navigating
  if (screen === 'history') {
    const historyScreen = document.getElementById('history-screen');
    if (historyScreen) {
      historyScreen.outerHTML = renderHistoryScreen();
      attachEventListeners();
    }
  }

  if (screen === 'capture') {
    const captureScreen = document.getElementById('capture-screen');
    if (captureScreen) {
      captureScreen.outerHTML = renderCaptureScreen();
      attachEventListeners();

      setTimeout(() => {
        const carousel = document.querySelector('.mood-carousel');
        if (carousel) {
          const firstCard = carousel.querySelector('.mood-card:nth-child(2)');
          if (firstCard) {
            firstCard.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
          }
        }
      }, 100);
    }
  }
}

// ===== Initialize =====
loadEntries();
renderApp();
