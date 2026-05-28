(() => {
  if (window.__DEEPFOCUS_SOUND_MANAGER_LOADED__) {
    return;
  }
  window.__DEEPFOCUS_SOUND_MANAGER_LOADED__ = true;

  class DeepFocusSoundManager {
    constructor() {
      this.soundUrls = {};
      this.preloaded = {};
      this.lastPlayTimeByType = {};
      this.cooldownByType = {
        success: 0,
        fail: 0
      };
      this.soundEnabled = false;

      if (!window.location.hostname.includes('leetcode.com')) {
        return;
      }

      if (!chrome.runtime?.id) {
        return;
      }

      try {
        this.soundUrls = {
          success: chrome.runtime.getURL("sounds/success.mp3"),
          fail: chrome.runtime.getURL("sounds/fail.mp3")
        };
      } catch (e) {
        return;
      }

      this.soundEnabled = true;
      this.preload();
      this.loadSettings();
      this.watchSettings();
    }

    preload() {
      for (const [key, url] of Object.entries(this.soundUrls)) {
        try {
          const audio = new Audio(url);
          audio.preload = "auto";
          audio.load();
          this.preloaded[key] = audio;
        } catch (e) {
          // Ignore preload failures; playback falls back to a fresh Audio object.
        }
      }
    }

    loadSettings() {
      try {
        chrome.storage.local.get(["soundEnabled"], (result) => {
          if (chrome.runtime.lastError) return;
          if (result.soundEnabled !== undefined) {
            this.soundEnabled = result.soundEnabled;
          }
        });
      } catch (e) {
        // Extension context may be invalidated after reload.
      }
    }

    watchSettings() {
      try {
        chrome.storage.onChanged.addListener((changes) => {
          if (changes.soundEnabled) {
            this.soundEnabled = changes.soundEnabled.newValue;
          }
        });
      } catch (e) {
        // Extension context may be invalidated after reload.
      }
    }

    playSound(type, options = {}) {
      if (!this.soundEnabled) return;

      const now = Date.now();
      const cooldown = this.cooldownByType[type] ?? 0;
      if (!options.force && cooldown > 0 && now - (this.lastPlayTimeByType[type] || 0) < cooldown) return;

      const url = this.soundUrls[type];
      if (!url) return;

      this.lastPlayTimeByType[type] = now;
      if (this.preloaded[type] && this.tryPlay(this.preloaded[type])) {
        return;
      }

      try {
        this.tryPlay(new Audio(url));
      } catch (e) {
        // Playback can be blocked by browser gesture policies.
      }
    }

    tryPlay(audio) {
      try {
        audio.currentTime = 0;
        const result = audio.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {});
        }
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  window.DeepFocusSound = window.DeepFocusSound || new DeepFocusSoundManager();
})();
