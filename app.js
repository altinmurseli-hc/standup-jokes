// Standup Jokes: pick a category, press Space, read it out loud.
// Two-part jokes keep the punchline hidden until the second press.
// The clean categories only use checked jokes that ship with the page.
// The two NSFW categories never mix into the others; NSFW is the only live one.

const JOKEAPI = 'https://v2.jokeapi.dev/joke/';
const TIMEOUT_MS = 6000;

const STORAGE = {
  category: 'standup-jokes:category',
  seen: 'standup-jokes:seen',
  favourites: 'standup-jokes:favourites',
};
const SEEN_MAX = 2000;

function fromJokeApi(joke) {
  return joke.type === 'twopart'
    ? { id: joke.id, setup: joke.setup, punchline: joke.delivery }
    : { id: joke.id, setup: joke.joke, punchline: null };
}

// Every source returns a list of candidates; fetchJoke picks an unseen one.
// JokeAPI can't ask for "only NSFW", so pull a batch without safe mode and
// keep the flagged ones. Racist/sexist jokes stay blacklisted.
const nsfwApi = {
  name: 'JokeAPI',
  async get() {
    const res = await fetchJson(`${JOKEAPI}Misc,Dark,Pun,Spooky,Christmas?lang=en&blacklistFlags=racist,sexist&amount=10`);
    if (res.error) throw new Error(res.message || 'JokeAPI error');
    const flagged = (res.jokes || [res]).filter((j) => j.flags.nsfw || j.flags.explicit);
    if (!flagged.length) throw new Error('no NSFW joke in this batch');
    return flagged.map(fromJokeApi);
  },
};

const bundled = (name, jokes) => ({ name, async get() { return jokes; } });

// One source per origin, so every joke keeps the key it had when it came from
// the live API (seen jokes and favourites saved back then still match).
const cleanSources = (category) => CLEAN_JOKES
  .filter((group) => group.category === category)
  .map((group) => bundled(group.source, group.jokes.map(([id, setup, punchline]) => ({ id, setup, punchline }))));

const knockList = bundled('built-in', KNOCK_KNOCK.map(([who, punchline]) => ({
  id: `knock:${who}`,
  setup: `Knock, knock.\nWho's there?\n${who}.\n${who} who?`,
  punchline,
})));

// Keyed by the setup text, so adding or reordering jokes keeps "seen" intact.
const albanianList = (prefix, jokes) => bundled('built-in', jokes.map(([setup, punchline]) => ({
  id: `${prefix}:${setup}`,
  setup,
  punchline,
})));

const CATEGORIES = [
  { key: 'any', label: '🎲 Random' },
  { key: 'dad', label: '👨 Dad', sources: cleanSources('dad') },
  { key: 'pun', label: '🤓 Pun', sources: cleanSources('pun') },
  { key: 'knock', label: '🚪 Knock-knock', sources: [knockList] },
  { key: 'misc', label: '🎭 Misc', sources: cleanSources('misc') },
  { key: 'spooky', label: '👻 Spooky', sources: cleanSources('spooky') },
  { key: 'christmas', label: '🎄 Christmas', sources: cleanSources('christmas') },
  { key: 'sq', label: '🇦🇱🇽🇰 Albanian', inRandom: false, sources: [albanianList('sq', ALBANIAN)] },
  { key: 'favs', label: '⭐ Favourites' },
  { key: 'nsfw', label: '🔞 NSFW', nsfw: true, live: true, sources: [nsfwApi] },
  { key: 'sq-nsfw', label: '🔞 Albanian NSFW', nsfw: true, sources: [albanianList('sq-nsfw', ALBANIAN_NSFW)] },
];

const tag = (joke, cat, source) => ({
  ...joke,
  key: `${source.name}:${joke.id}`,
  category: cat.label,
  source: source.name,
  nsfw: Boolean(cat.nsfw),
});

const OFFLINE_JOKES = OFFLINE.map(([setup, punchline], i) => ({
  key: `offline:${i}`, setup, punchline, category: 'Offline backup', source: 'built-in',
}));

const els = {
  categories: document.getElementById('categories'),
  card: document.getElementById('card'),
  meta: document.getElementById('meta'),
  setup: document.getElementById('setup'),
  punchline: document.getElementById('punchline'),
  drum: document.getElementById('drum'),
  back: document.getElementById('back'),
  go: document.getElementById('go'),
  forward: document.getElementById('forward'),
  fav: document.getElementById('fav'),
  copy: document.getElementById('copy'),
  big: document.getElementById('big'),
};

// seen: joke key -> when it was last shown. Kept across reloads.
let tick = 0;
const seen = loadSeen();
const favourites = loadList(STORAGE.favourites);
const history = []; // every joke shown this session, oldest first
let pos = -1; // index in history of the joke on screen
let count = 0;
let favPos = -1;
let category = loadCategory();
let loading = false;

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

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function loadList(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* storage blocked or full */ }
}

// Stored oldest first, so the position doubles as "when".
function loadSeen() {
  const keys = loadList(STORAGE.seen);
  tick = keys.length;
  return new Map(keys.map((key, i) => [key, i]));
}

function markSeen(key) {
  seen.delete(key);
  seen.set(key, ++tick);
  while (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value);
  saveList(STORAGE.seen, [...seen.keys()]);
}

// NSFW is never restored on reload, so the page can't open on it mid-meeting.
function loadCategory() {
  try {
    const saved = localStorage.getItem(STORAGE.category);
    if (CATEGORIES.some((c) => c.key === saved && !c.nsfw)) return saved;
  } catch (e) { /* storage blocked: fall back to Random */ }
  return 'any';
}

function saveCategory(key) {
  try { localStorage.setItem(STORAGE.category, key); } catch (e) { /* ignore */ }
}

const inNsfw = () => Boolean(CATEGORIES.find((c) => c.key === category)?.nsfw);

// NSFW jokes stay in the NSFW category, also when stepping back through history.
const allowedHere = (joke) => !joke.nsfw || inNsfw();

// Unseen first. Once everything is seen, the one seen longest ago,
// but never the joke that is on screen right now.
function choose(jokes) {
  const fresh = jokes.filter((j) => !seen.has(j.key));
  if (fresh.length) return pick(fresh);
  const onScreen = history[pos]?.key;
  return jokes
    .filter((j) => j.key !== onScreen)
    .sort((a, b) => seen.get(a.key) - seen.get(b.key))[0];
}

async function fetchJoke(key) {
  // Random: the English clean categories only (no NSFW, no Albanian).
  const pool = key === 'any'
    ? CATEGORIES.filter((c) => c.sources && !c.nsfw && c.inRandom !== false)
    : [CATEGORIES.find((c) => c.key === key)];
  const tried = [];

  // Built-in lists answer at once. NSFW goes to the network, so a few tries
  // to find an unseen joke and dodge the odd failed request.
  for (let attempt = 0; attempt < 4; attempt++) {
    const cat = pick(pool);
    try {
      const lists = await Promise.all(cat.sources.map(async (source) =>
        (await source.get()).map((joke) => tag(joke, cat, source))));
      const jokes = lists.flat();
      if (jokes.some((j) => !seen.has(j.key))) return choose(jokes);
      tried.push(...jokes);
      // A built-in category with nothing unseen left: recycle the oldest.
      if (pool.length === 1 && !cat.live) break;
    } catch (e) {
      console.warn(`${cat.label} failed:`, e.message);
    }
  }

  return choose(tried) || choose(OFFLINE_JOKES);
}

function show(joke) {
  if (history[pos]?.key === joke.key) {
    // Same joke again (a single favourite): replay it.
    history[pos] = { ...history[pos], ...joke, revealed: false };
  } else {
    history.push({ ...joke, n: ++count, revealed: false });
    pos = history.length - 1;
  }
  markSeen(joke.key);
  render();
}

function showMessage(meta, text) {
  pos = history.length; // past the end, so ← still goes to the last joke
  els.meta.textContent = meta;
  els.setup.textContent = text;
  els.punchline.hidden = true;
  els.drum.hidden = true;
  els.card.classList.remove('revealed');
  els.go.textContent = 'Next joke';
  renderTools();
}

// Space and the big button: reveal the punchline, then walk forward through
// history, and only fetch a new joke at the end of it.
function step() {
  if (loading) return;
  const joke = history[pos];
  if (joke && allowedHere(joke) && joke.punchline && !joke.revealed) {
    joke.revealed = true;
    render();
    return;
  }
  if (neighbour(1) >= 0) return go(1);
  fetchNew();
}

async function fetchNew() {
  if (loading) return;
  if (category === 'favs') return showFavourite();

  const requested = category;
  let joke;
  setLoading(true);
  try {
    joke = await fetchJoke(requested);
  } finally {
    setLoading(false);
  }

  // The category changed while we waited: drop this joke so an NSFW one
  // can never land under another category (and vice versa).
  if (category !== requested) return fetchNew();
  show(joke);
}

// Nearest joke in history in that direction (-1 back, 1 forward) that may be
// shown in the current category, or -1.
function neighbour(dir) {
  for (let i = pos + dir; i >= 0 && i < history.length; i += dir) {
    if (allowedHere(history[i])) return i;
  }
  return -1;
}

function go(dir) {
  if (loading) return;
  const i = neighbour(dir);
  if (i < 0) return;
  pos = i;
  render();
}

function showFavourite() {
  if (!favourites.length) {
    showMessage('⭐ Favourites', 'No favourites yet. Press ☆ Save on a joke you like.');
    return;
  }
  favPos = (favPos + 1) % favourites.length;
  if (favourites.length > 1 && favourites[favPos].key === history[pos]?.key) {
    favPos = (favPos + 1) % favourites.length;
  }
  show({ ...favourites[favPos], label: `⭐ ${favPos + 1}/${favourites.length} · ${favourites[favPos].category}` });
}

// NSFW jokes can't be saved, so Favourites stays clean.
function toggleFavourite() {
  const joke = history[pos];
  if (!joke || joke.nsfw) return;
  const i = favourites.findIndex((f) => f.key === joke.key);
  if (i >= 0) {
    favourites.splice(i, 1);
    if (i <= favPos) favPos--;
  } else {
    const { key, setup, punchline, category: cat, source } = joke;
    favourites.unshift({ key, setup, punchline, category: cat, source });
    if (favPos >= 0) favPos++;
  }
  saveList(STORAGE.favourites, favourites);
  renderCategories();
  renderTools();
}

function setLoading(on) {
  loading = on;
  els.card.classList.toggle('loading', on);
  els.go.disabled = on;
  renderTools();
}

function render() {
  const joke = history[pos];
  if (!joke) return;
  const twoPart = Boolean(joke.punchline);
  els.meta.textContent = `#${joke.n} · ${joke.label || joke.category} · ${joke.source}`;
  els.setup.textContent = joke.setup;
  els.punchline.textContent = joke.punchline || '';
  els.punchline.hidden = !twoPart;
  els.drum.hidden = !twoPart;
  els.card.classList.toggle('revealed', joke.revealed);
  els.go.textContent = twoPart && !joke.revealed ? 'Reveal punchline' : 'Next joke';
  renderTools();
}

function renderTools() {
  const joke = history[pos];
  const faved = Boolean(joke && favourites.some((f) => f.key === joke.key));
  els.back.disabled = loading || neighbour(-1) < 0;
  els.forward.disabled = loading || neighbour(1) < 0;
  els.copy.disabled = !joke;
  els.fav.disabled = !joke || joke.nsfw;
  els.fav.setAttribute('aria-pressed', String(faved));
  els.fav.textContent = faved ? '⭐ Saved' : '☆ Save';
  els.fav.title = joke?.nsfw ? "NSFW jokes can't be saved" : 'Save to Favourites';
}

function renderCategories() {
  els.categories.innerHTML = '';
  for (const c of CATEGORIES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = c.key === 'favs' && favourites.length ? `${c.label} (${favourites.length})` : c.label;
    chip.setAttribute('aria-pressed', String(c.key === category));
    chip.addEventListener('click', () => {
      category = c.key;
      favPos = -1;
      saveCategory(c.key);
      renderCategories();
      fetchNew();
    });
    els.categories.appendChild(chip);
  }
}

async function copyJoke() {
  const joke = history[pos];
  if (!joke) return;
  try {
    await navigator.clipboard.writeText([joke.setup, joke.punchline].filter(Boolean).join('\n'));
    els.copy.textContent = 'Copied!';
  } catch (e) {
    els.copy.textContent = 'Copy failed';
  }
  setTimeout(() => { els.copy.textContent = '📋 Copy'; }, 1500);
}

// Big screen: only the joke, large, in fullscreen when the browser allows it.
function setBig(on) {
  document.body.classList.toggle('big', on);
  if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.()?.catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

const toggleBig = () => setBig(!document.body.classList.contains('big'));

els.back.addEventListener('click', () => go(-1));
els.go.addEventListener('click', step);
els.forward.addEventListener('click', () => go(1));
els.fav.addEventListener('click', toggleFavourite);
els.copy.addEventListener('click', copyJoke);
els.big.addEventListener('click', toggleBig);
els.card.addEventListener('click', () => {
  if (document.body.classList.contains('big')) step();
});

// Esc leaves fullscreen without a keydown reaching the page, so follow the browser.
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setBig(false);
});

const KEYS = {
  ' ': step,
  ArrowLeft: () => go(-1),
  ArrowRight: () => go(1),
  f: toggleBig,
  F: toggleBig,
  Escape: () => setBig(false),
};

// Swallow Space on keyup too, so a focused button doesn't also fire its own click.
// Shortcuts with ⌘/Ctrl/Alt (⌘F, ⌘←, ...) stay with the browser.
document.addEventListener('keydown', (e) => {
  const action = KEYS[e.key];
  if (!action || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('a')) return;
  e.preventDefault();
  if (!e.repeat) action();
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ' && !e.target.closest('a')) e.preventDefault();
});

renderCategories();
