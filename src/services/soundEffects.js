// Gestione Audio FX con i suoni originali estratti
class SoundEffectsManager {
  constructor() {
    this.muted = localStorage.getItem('botpark_sound_muted') === 'true';
    this.sounds = {};
    this.initSounds();
  }

  initSounds() {
    const soundFiles = {
      open: './sounds/tmp-1-open-blip-D1y74m9N.wav',
      tick: './sounds/tmp-2-tick-DY1KrPne.wav',
      doubleTick: './sounds/tmp-3-double-tick-CdEXJqnB.wav',
      chime: './sounds/tmp-4-chime-a-CH10PUxT.wav',
      success: './sounds/tmp-5-chime-b-B3aR0Am-.wav',
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        this.sounds[key] = audio;
      } catch (e) {
        console.warn(`Non è stato possibile precaricare l'audio ${key}:`, e);
      }
    }
  }

  play(name, volume = 0.5) {
    if (this.muted) return;
    const sound = this.sounds[name];
    if (sound) {
      try {
        const clone = sound.cloneNode();
        clone.volume = volume;
        clone.play().catch(() => {});
      } catch (_) {}
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('botpark_sound_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }
}

export const sounds = new SoundEffectsManager();

