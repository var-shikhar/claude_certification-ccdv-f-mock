// localStorage persistence. Every access is guarded: storage can be
// unavailable (private windows, blocked site data), and the app must still
// work for a single session in that case.

const PREFIX = 'ccdvf.v1.';
const memory = new Map();

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}

function write(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // fall back to in-memory only
  }
}

function remove(key) {
  memory.delete(key);
  try { window.localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

export const store = {
  getActive: () => read('active', null),
  setActive: (attempt) => write('active', attempt),
  clearActive: () => remove('active'),

  getHistory: () => read('history', []),
  addToHistory(result) {
    const list = read('history', []).filter((r) => r.id !== result.id);
    list.unshift(result);
    write('history', list.slice(0, 50));
  },
  getResult: (id) => read('history', []).find((r) => r.id === id) ?? null,
  clearHistory: () => remove('history'),

  getPrefs: () => read('prefs', {}),
  setPrefs: (prefs) => write('prefs', { ...read('prefs', {}), ...prefs }),
};
