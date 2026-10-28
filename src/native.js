import { Capacitor, registerPlugin } from '@capacitor/core';
import './native.css';

const KidGarden = registerPlugin('KidGarden');
const trustedHosts = new Set([
  'fayazamir1991.github.io', 'github.com', 'raw.githubusercontent.com',
  'bigsoundbank.com', 'www.bigsoundbank.com', 'freesound.org', 'www.freesound.org',
  'creativecommons.org', 'mixkit.co', 'www.mixkit.co',
  'commons.wikimedia.org', 'upload.wikimedia.org', 'opensource.org',
]);

export const isNativeApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/** The parent area calls this only after its adult gate has succeeded. */
export async function openExternal(url) {
  let target;
  try { target = new URL(url); } catch { return false; }
  if (target.protocol !== 'https:' || target.username || target.password || (target.port && target.port !== '443') || !trustedHosts.has(target.hostname.toLowerCase())) return false;
  if (isNativeApp()) {
    try { await KidGarden.openExternal({ url: target.href }); return true; } catch { return false; }
  }
  window.open(target.href, '_blank', 'noopener,noreferrer');
  return true;
}

export async function setNativeGameMode(isGame) {
  if (!isNativeApp()) return;
  try { await KidGarden.setGameMode({ active: Boolean(isGame) }); } catch { /* Browser layout remains usable if the OS cannot change orientation. */ }
}

export async function getNativeBuildInfo() {
  if (!isNativeApp()) return null;
  try { return await KidGarden.getBuildInfo(); } catch { return null; }
}

export async function moveNativeAppToBackground() {
  if (!isNativeApp()) return false;
  try { await KidGarden.moveToBackground(); return true; } catch { return false; }
}

/** Explicit user audio may request focus; automatic follow-up sounds can only query it. */
export async function requestNativeAudioFocus(request = true) {
  if (!isNativeApp()) return true;
  try {
    const result = await KidGarden.requestAudioFocus({ request: Boolean(request) });
    return result.granted === true;
  } catch { return false; }
}

/** Connect Android lifecycle/back events to the game's existing cancellable state. */
export async function initNativeApp({ onBack, onPause, onResume, onAudioFocusLost } = {}) {
  if (!isNativeApp()) return () => {};
  document.documentElement.dataset.nativeApp = 'true';
  const pause = () => onPause?.();
  const resume = () => onResume?.();
  const audioPause = () => onAudioFocusLost?.();
  window.addEventListener('kidgardenPause', pause);
  window.addEventListener('kidgardenResume', resume);
  window.addEventListener('kidgardenAudioPause', audioPause);
  const removers = [() => window.removeEventListener('kidgardenPause', pause), () => window.removeEventListener('kidgardenResume', resume), () => window.removeEventListener('kidgardenAudioPause', audioPause)];
  try {
    const { App } = await import('@capacitor/app');
    const back = await App.addListener('backButton', async () => {
      const handled = await onBack?.();
      if (handled === false || !onBack) await moveNativeAppToBackground();
    });
    removers.push(() => { void back.remove(); });
  } catch { /* The native activity remains the lifecycle authority. */ }
  try {
    // App.onResume alone does not guarantee window focus; use the combined native state.
    const state = await KidGarden.getInteractionState();
    if (state.active) resume(); else pause();
  } catch { /* Lifecycle events still arrive from the native activity. */ }
  return () => removers.forEach((remove) => remove());
}
