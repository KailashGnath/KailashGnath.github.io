/** The lab remembers returning visitors. Purely cosmetic; safe if storage is blocked. */
export interface LabMemory {
  visits: number;
  sound: boolean;
}

const KEY = 'kailash.lab.v1';

export function loadMemory(): LabMemory {
  let m: LabMemory = { visits: 0, sound: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) m = { ...m, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  m.visits += 1;
  saveMemory(m);
  return m;
}

export function saveMemory(m: LabMemory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** Each visit nudges the specimen's hue a little, cycling back after a while. */
export function hueShiftFor(visits: number) {
  return [0, 0.03, -0.03, 0.06, -0.05, 0.09][(visits - 1) % 6];
}
