// Sound Manager Utility for DeepFocus
// Handles audio playback for submission results with cooldown and user settings.

class SoundManager {
  constructor() {
    this.soundUrls = {
      success: chrome.runtime.getURL("sounds/success.mp3"),
      fail: chrome.runtime.getURL("sounds/fail.mp3")
    };

    // Preload audio objects for faster playback
    this.preloaded = {};
    for (const [key, url] of Object.entries(this.soundUrls)) {
      try {
        this.preloaded[key] = new Audio(url);
        this.preloaded[key].preload = "auto";
        this.preloaded[key].load();
      } catch(e) {
        // Preload failed
      }
    }

    this.lastPlayTime = 0;
    this.cooldown = 2000; // 2 seconds minimum between sounds
    this.soundEnabled = true;

    // Load initial setting
    chrome.storage.local.get(["soundEnabled"], (result) => {
      if (result.soundEnabled !== undefined) {
        this.soundEnabled = result.soundEnabled;
      }
    });

    // Listen for setting changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.soundEnabled) {
        this.soundEnabled = changes.soundEnabled.newValue;
      }
    });
  }

  /**
   * Play a sound by type (success or fail)
   * @param {string} type - "success" | "fail"
   */
  playSound(type) {
    if (!this.soundEnabled) {
      return;
    }

    const now = Date.now();
    if (now - this.lastPlayTime < this.cooldown) {
      return;
    }

    this.lastPlayTime = now;
    const url = this.soundUrls[type];
    
    if (!url) {
      console.error(`[DeepFocus Sound] No URL for type "${type}"`);
      return;
    }

    // Try preloaded audio first, then fall back to fresh Audio object
    const tryPlay = (audio, label) => {
      try {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.catch(() => {});
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    // Attempt 1: Use preloaded audio
    if (this.preloaded[type]) {
      if (tryPlay(this.preloaded[type], 'preloaded')) return;
    }

    // Attempt 2: Create fresh audio object  
    const freshAudio = new Audio(url);
    tryPlay(freshAudio, 'fresh');
  }
}

// Global instance for content activities
window.DeepFocusSound = new SoundManager();
