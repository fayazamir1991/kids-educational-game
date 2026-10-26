import { asset } from './assets.js';

let context;
let activeSource;
let activeGain;
let cancelCurrent;
let generation = 0;
const buffers = new Map();

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
        const response = await fetch(asset(`/audio/${id}.mp3`), { signal: controller.signal });
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

export function chime(volume = 0.65) {
  try {
    const ctx = getContext();
    void ctx.resume();
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.11;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
  } catch { /* Visual praise is always available. */ }
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
