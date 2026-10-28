import { asset } from './assets.js';

// The build script fills this block from reviewed local recordings. There is no
// manifest request at runtime, so the player also works in the offline download.
// BEGIN GENERATED NARRATION CATALOG
const catalog = Object.freeze({});
// END GENERATED NARRATION CATALOG

let context;
let activeSource;
let activeGain;
let generation = 0;
const buffers = new Map();

function normalize(text) {
  return String(text).normalize('NFC').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u200c\s]+/g, ' ').trim();
}

function getContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) throw new Error('Audio context unavailable');
  context ||= new AudioContext();
  return context;
}

function releaseSource(source, gain) {
  source.onended = null;
  source.disconnect();
  gain.disconnect();
  if (activeSource === source) {
    activeSource = undefined;
    activeGain = undefined;
  }
}

async function loadClip(clip) {
  if (!buffers.has(clip.sha256)) {
    const pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const location = asset(clip.path);
        const url = location.startsWith('data:') ? location : `${location}?v=${clip.sha256}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Narrator recording unavailable');
        return await getContext().decodeAudioData(await response.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
    })();
    buffers.set(clip.sha256, pending);
    pending.catch(() => buffers.delete(clip.sha256));
  }
  return buffers.get(clip.sha256);
}

/** Stops playing or loading speech from an earlier screen. No speech API used. */
export function stopNarration() {
  generation++;
  if (activeSource) {
    const source = activeSource;
    const gain = activeGain;
    try { source.stop(); } catch { /* Already ended. */ }
    releaseSource(source, gain);
  }
}

/**
 * True means speech started or was intentionally cancelled by a newer request.
 * False means no reviewed clip was available. A caller can choose its fallback.
 * The packaged Android app should not fall back to a network/device TTS service.
 */
export async function playNarration(text, volume = 0.65) {
  stopNarration();
  const token = generation;
  const key = normalize(text);
  const clip = Object.hasOwn(catalog, key) ? catalog[key] : undefined;
  if (!clip) return false;
  let source;
  let gain;
  try {
    // Resume from the user gesture before fetching or decoding any recording.
    const ctx = getContext();
    await ctx.resume();
    if (token !== generation) return true;
    const buffer = await loadClip(clip);
    if (token !== generation) return true;
    source = ctx.createBufferSource();
    gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.65));
    source.connect(gain);
    gain.connect(ctx.destination);
    activeSource = source;
    activeGain = gain;
    source.onended = () => releaseSource(source, gain);
    source.start();
    return true;
  } catch {
    if (source && gain) releaseSource(source, gain);
    // A cancelled request must not awaken an old fallback after navigation.
    return token !== generation;
  }
}

export function hasNarration(text) {
  return Object.hasOwn(catalog, normalize(text));
}

export const narrationClipCount = Object.keys(catalog).length;
