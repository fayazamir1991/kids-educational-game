import { asset } from './assets.js';
import audioReview from './audio-review.json' with { type: 'json' };

let context;
let activeSource;
let activeGain;
let cancelCurrent;
let generation = 0;
const buffers = new Map();
const effectNodes = new Set();

function stopEffects() {
  for (const effect of effectNodes) {
    effect.oscillator.onended = null;
    try { effect.oscillator.stop(); } catch { /* Already ended. */ }
    effect.oscillator.disconnect();
    effect.gain.disconnect();
  }
  effectNodes.clear();
}

function getContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('Audio is unavailable in this browser.');
  context ||= new AudioContext();
  return context;
}

async function loadRecording(id) {
  if (!buffers.has(id)) {
    const pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const location = asset(`/audio/${id}.mp3`);
        // A revised recording must not reuse a previous browser/CDN cache entry.
        const version = audioReview.animals[id]?.sha256;
        const url = location.startsWith('data:') ? location : `${location}?v=${version}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Recording unavailable: ${id}`);
        return await getContext().decodeAudioData(await response.arrayBuffer());
      } finally { clearTimeout(timeout); }
    })();
    buffers.set(id, pending);
    pending.catch(() => buffers.delete(id));
  }
  return buffers.get(id);
}

export function stopSound() {
  generation++;
  stopEffects();
  if (activeSource) {
    activeSource.onended = null;
    try { activeSource.stop(); } catch { /* A stopped buffer is already silent. */ }
    activeSource.disconnect();
    activeSource = null;
  }
  activeGain?.disconnect();
  activeGain = null;
  cancelCurrent?.(false);
  cancelCurrent = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export async function playAnimal(id, volume = 0.65) {
  stopSound();
  const token = generation;
  try {
    // Resume synchronously from the initial tap; later rounds reuse the unlocked
    // context, including on mobile browsers that restrict media autoplay.
    const ctx = getContext();
    await ctx.resume();
    if (token !== generation) return false;
    const buffer = await loadRecording(id);
    if (token !== generation) return false;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    activeSource = source;
    activeGain = gain;
    return await new Promise((resolve) => {
      cancelCurrent = resolve;
      source.onended = () => {
        gain.disconnect();
        source.disconnect();
        if (token === generation) {
          activeSource = null;
          activeGain = null;
          cancelCurrent = null;
        }
        resolve(true);
      };
      source.start();
    });
  } catch {
    if (token === generation) {
      activeSource = null;
      cancelCurrent?.(false);
      cancelCurrent = null;
    }
    return false;
  }
}

function playNotes(notes, volume) {
  try {
    const ctx = getContext();
    void ctx.resume();
    stopEffects();
    notes.forEach(({ frequency, endFrequency = frequency, at, duration, level }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + at;
      const effect = { oscillator, gain };
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * level, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      effectNodes.add(effect);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        effectNodes.delete(effect);
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch { /* Visual praise is always available. */ }
}

// Musical answer feedback is deliberately distinct from the recorded animal call.
export function chime(volume = 0.65) {
  playNotes([523.25, 659.25, 783.99, 1046.5].map((frequency, index) => ({
    frequency, at: index * 0.105, duration: 0.27, level: 0.12,
  })), volume);
}

export function tryAgainTone(volume = 0.65) {
  playNotes([
    { frequency: 392, endFrequency: 349.23, at: 0, duration: 0.15, level: 0.1 },
    { frequency: 329.63, endFrequency: 293.66, at: 0.17, duration: 0.2, level: 0.09 },
  ], volume);
}

export function speakPersian(text, volume) {
  if (!('speechSynthesis' in window)) return;
  const voice = speechSynthesis.getVoices().find((item) => /^fa(?:-|_|$)/i.test(item.lang));
  if (!voice) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = 'fa-IR';
  utterance.rate = 0.85;
  utterance.volume = volume;
  speechSynthesis.speak(utterance);
}
