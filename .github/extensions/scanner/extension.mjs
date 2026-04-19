// Scanner Extension — M365 signal scanner via WorkIQ
// Scans email + Teams periodically, extracts actionable signals, deduplicates

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SIGNALS_PATH = join(import.meta.dirname, 'data', 'signals.json');

export function getSignals() {
  if (!existsSync(SIGNALS_PATH)) return [];
  try { return JSON.parse(readFileSync(SIGNALS_PATH, 'utf-8')); } catch { return []; }
}

export function saveSignals(signals) {
  mkdirSync(join(import.meta.dirname, 'data'), { recursive: true });
  writeFileSync(SIGNALS_PATH, JSON.stringify(signals, null, 2));
}

export function deduplicateSignals(newSignals, existing) {
  const existingTitles = new Set(existing.map(s => s.title?.toLowerCase()));
  return newSignals.filter(s => !existingTitles.has(s.title?.toLowerCase()));
}
