export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    clearDevelopmentServiceWorkers();
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[DeepFocus] Service worker registration failed:', error);
    });
  });
}

async function clearDevelopmentServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('deepfocus-'))
          .map((name) => caches.delete(name))
      );
    }
  } catch (error) {
    console.warn('[DeepFocus] Failed to clear development service worker cache:', error);
  }
}
