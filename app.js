// Standup Jokes: pick a category, press Space, read it out loud.
// Two-part jokes keep the punchline hidden until the second press.

const JOKEAPI = 'https://v2.jokeapi.dev/joke/';
const OFFICIAL = 'https://official-joke-api.appspot.com/jokes/';
const DADJOKE = 'https://icanhazdadjoke.com/';
const TIMEOUT_MS = 6000;

const jokeApi = (category) => ({
  name: 'JokeAPI',
  async get() {
    const res = await fetchJson(`${JOKEAPI}${category}?safe-mode&lang=en`);
    if (res.error) throw new Error(res.message || 'JokeAPI error');
    return res.type === 'twopart'
      ? { id: res.id, setup: res.setup, punchline: res.delivery }
      : { id: res.id, setup: res.joke, punchline: null };
  },
});

const officialApi = (type) => ({
  name: 'Official Joke API',
  async get() {
    const [joke] = await fetchJson(`${OFFICIAL}${type}/random`);
    return { id: joke.id, setup: tidy(joke.setup), punchline: tidy(joke.punchline) };
  },
});

const dadApi = {
  name: 'icanhazdadjoke',
  async get() {
    const res = await fetchJson(DADJOKE, { headers: { Accept: 'application/json' } });
    return { id: res.id, setup: res.joke, punchline: null };
  },
};

const CATEGORIES = [
  { key: 'any', label: '🎲 Random' },
  { key: 'programming', label: '💻 Programming', sources: [jokeApi('Programming'), officialApi('programming')] },
  { key: 'dad', label: '👨 Dad', sources: [dadApi, officialApi('dad')] },
  { key: 'pun', label: '🤓 Pun', sources: [jokeApi('Pun')] },
  { key: 'knock', label: '🚪 Knock-knock', sources: [officialApi('knock-knock')] },
  { key: 'misc', label: '🎭 Misc', sources: [jokeApi('Misc'), officialApi('general')] },
  { key: 'spooky', label: '👻 Spooky', sources: [jokeApi('Spooky')] },
  { key: 'christmas', label: '🎄 Christmas', sources: [jokeApi('Christmas')] },
];

// Used only when every API is unreachable (office Wi-Fi, rate limit, ...).
const OFFLINE = [
  ['Why do programmers prefer dark mode?', 'Because light attracts bugs.'],
  ['How many programmers does it take to change a light bulb?', "None. That's a hardware problem."],
  ['Why did the developer go broke?', 'Because he used up all his cache.'],
  ['What is a standup meeting?', 'A sitdown meeting where everyone is too tired to sit down.'],
  ["Why don't skeletons fight each other?", "They don't have the guts."],
  ['I told my computer I needed a break.', 'It said: "No problem, I\'ll go to sleep."'],
  ['Why was the JavaScript developer sad?', "Because he didn't Node how to Express himself."],
  ['What do you call a fake noodle?', 'An impasta.'],
];

const STORAGE_KEY = 'standup-jokes:category';

const els = {
  categories: document.getElementById('categories'),
  card: document.getElementById('card'),
  meta: document.getElementById('meta'),
  setup: document.getElementById('setup'),
  punchline: document.getElementById('punchline'),
  drum: document.getElementById('drum'),
  go: document.getElementById('go'),
  copy: document.getElementById('copy'),
};

const seen = new Set();
let category = loadCategory();
let current = null;
let revealed = false;
let loading = false;
let count = 0;

function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .finally(() => clearTimeout(timer));
}

// The Official Joke API pads knock-knock lines with spaces around \n.
function tidy(text) {
  return String(text).split('\n').map((line) => line.trim()).join('\n');
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function loadCategory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (CATEGORIES.some((c) => c.key === saved)) return saved;
  } catch (e) { /* storage blocked: fall back to Random */ }
  return 'any';
}

function saveCategory(key) {
  try { localStorage.setItem(STORAGE_KEY, key); } catch (e) { /* ignore */ }
}

async function fetchJoke() {
  const pool = category === 'any'
    ? CATEGORIES.filter((c) => c.sources)
    : [CATEGORIES.find((c) => c.key === category)];

  // A few tries to dodge repeats and the odd failing API.
  for (let attempt = 0; attempt < 4; attempt++) {
    const cat = pick(pool);
    const source = pick(cat.sources);
    try {
      const joke = await source.get();
      const key = `${source.name}:${joke.id}`;
      if (seen.has(key) && attempt < 3) continue;
      seen.add(key);
      return { ...joke, category: cat.label, source: source.name };
    } catch (e) {
      console.warn(`${source.name} failed:`, e.message);
    }
  }

  const fresh = OFFLINE.filter((_, i) => !seen.has(`offline:${i}`));
  const index = OFFLINE.indexOf(pick(fresh.length ? fresh : OFFLINE));
  seen.add(`offline:${index}`);
  const [setup, punchline] = OFFLINE[index];
  return { setup, punchline, category: 'Offline backup', source: 'built-in' };
}

async function step() {
  if (loading) return;

  if (current && current.punchline && !revealed) {
    revealed = true;
    render();
    return;
  }

  loading = true;
  els.card.classList.add('loading');
  els.go.disabled = true;
  try {
    current = await fetchJoke();
    revealed = false;
    count++;
  } finally {
    loading = false;
    els.card.classList.remove('loading');
    els.go.disabled = false;
    render();
  }
}

function render() {
  if (!current) return;
  els.meta.textContent = `#${count} · ${current.category} · ${current.source}`;
  els.setup.textContent = current.setup;
  els.punchline.textContent = current.punchline || '';
  els.punchline.hidden = !(current.punchline && revealed);
  els.drum.hidden = !(current.punchline && revealed);
  els.go.textContent = current.punchline && !revealed ? 'Reveal punchline' : 'Next joke';
  els.copy.disabled = false;
}

function renderCategories() {
  els.categories.innerHTML = '';
  for (const c of CATEGORIES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = c.label;
    chip.setAttribute('aria-pressed', String(c.key === category));
    chip.addEventListener('click', () => {
      category = c.key;
      saveCategory(c.key);
      renderCategories();
      current = null;
      step();
    });
    els.categories.appendChild(chip);
  }
}

async function copyJoke() {
  if (!current) return;
  const text = [current.setup, current.punchline].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    els.copy.textContent = 'Copied!';
  } catch (e) {
    els.copy.textContent = 'Copy failed';
  }
  setTimeout(() => { els.copy.textContent = 'Copy'; }, 1500);
}

els.go.addEventListener('click', step);
els.copy.addEventListener('click', copyJoke);

// Space anywhere = next step. Swallow keyup too, so a focused button
// doesn't also fire its own click.
document.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || e.target.closest('a')) return;
  e.preventDefault();
  if (!e.repeat) step();
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ' && !e.target.closest('a')) e.preventDefault();
});

renderCategories();
