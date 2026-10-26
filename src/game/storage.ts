const BEST_SCORE_KEY = 'neon-snake.best-score';
const SOUND_PREFERENCE_KEY = 'neon-snake.sound';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadBestScore(): number {
  const storage = getStorage();
  if (!storage) return 0;

  const value = Number.parseInt(storage.getItem(BEST_SCORE_KEY) ?? '0', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function saveBestScore(score: number): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // A full or disabled localStorage should never break the game.
  }
}

export function loadSoundPreference(): boolean {
  const storage = getStorage();
  if (!storage) return true;
  return storage.getItem(SOUND_PREFERENCE_KEY) !== 'off';
}

export function saveSoundPreference(enabled: boolean): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(SOUND_PREFERENCE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Ignore storage failures; sound still works for this session.
  }
}
