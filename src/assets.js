// The download embeds its assets; the hosted app keeps ordinary local URLs.
export function asset(path) {
  return globalThis.__LITTLE_FARM_ASSETS__?.[path] || path;
}
