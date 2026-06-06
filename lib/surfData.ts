import { SpotData } from "@/constants/spots";
import axios from "axios";

const CACHE_TTL_MS = 10 * 60 * 1000;
const API_TIMEOUT_MS = 5500;

type CacheEntry<T> = { value: T; savedAt: number };
const memoryCache = new Map<string, CacheEntry<unknown>>();

export function normalizeDegrees(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function directionWindowFactor(waveDir: number, window: [number, number]) {
  const a = normalizeDegrees(waveDir);
  const inWindow = window[0] <= window[1]
    ? a >= window[0] && a <= window[1]
    : a >= window[0] || a <= window[1];

  if (inWindow) return 1;

  const distance = Math.min(
    Math.abs(((a - window[0] + 540) % 360) - 180),
    Math.abs(((a - window[1] + 540) % 360) - 180),
  );

  if (distance < 25) return 0.96;
  if (distance < 50) return 0.90;
  return 0.84;
}

export function correctWaveHeight(rawHeight: number, waveDir: number, spot: Pick<SpotData, "shelterFactor" | "swellWindow">) {
  const height = Number.isFinite(rawHeight) ? Math.max(0, rawHeight) : 0;
  const directionFactor = directionWindowFactor(waveDir, spot.swellWindow);
  const localFactor = Math.max(0.35, Math.min(1.05, spot.shelterFactor * directionFactor));
  return parseFloat((height * localFactor).toFixed(2));
}

export function currentKstHourIndex(times?: string[]) {
  if (!times?.length) return -1;
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:00`;
  const exact = times.findIndex(t => t.startsWith(key));
  if (exact >= 0) return exact;

  const current = now.getTime();
  return times.reduce((best, time, idx) => {
    const diff = Math.abs(new Date(time).getTime() - current);
    return diff < best.diff ? { idx, diff } : best;
  }, { idx: 0, diff: Number.POSITIVE_INFINITY }).idx;
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function nearestValidHourIndex(hourly: Record<string, any>, preferredIndex: number, keys: string[]) {
  const times: string[] = hourly?.time ?? [];
  if (!times.length) return -1;

  const hasValues = (idx: number) => keys.some(key => hourly[key]?.[idx] != null);
  if (preferredIndex >= 0 && hasValues(preferredIndex)) return preferredIndex;

  for (let offset = 1; offset < times.length; offset += 1) {
    const prev = preferredIndex - offset;
    const next = preferredIndex + offset;
    if (prev >= 0 && hasValues(prev)) return prev;
    if (next < times.length && hasValues(next)) return next;
  }

  return -1;
}

export async function getOpenMeteoHourly(url: string) {
  try {
    const res = await axios.get(url, { timeout: API_TIMEOUT_MS });
    return res.data.hourly ?? {};
  } catch (firstError) {
    await new Promise(resolve => setTimeout(resolve, 350));
    const res = await axios.get(url, { timeout: API_TIMEOUT_MS });
    return res.data.hourly ?? {};
  }
}

export function getSurfCache<T>(key: string): T | null {
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!cached) return null;
  if (Date.now() - cached.savedAt > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

export function setSurfCache<T>(key: string, value: T) {
  memoryCache.set(key, { value, savedAt: Date.now() });
}
