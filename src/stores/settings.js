import { reactive } from 'vue';
import { STORAGE_KEYS as GLOBAL_KEYS } from '../types/index.js';
import { settingsRepository } from '../repositories/index.js';

function normalizeBodyFontSize(size) {
  return Math.min(Math.max(Number(size) || 18, 14), 60);
}

export function useSettingsStore() {
  const store = reactive({
    speechRate: 0.9,
    voiceProvider: 'youdao',
    bodyFontSize: 18,
    _loaded: false,

    async load() {
      if (this._loaded) return;

      const rate = await settingsRepository.get(GLOBAL_KEYS.RATE);
      const provider = await settingsRepository.get(GLOBAL_KEYS.PROVIDER);
      const fontSize = await settingsRepository.get(GLOBAL_KEYS.BODY_FONT_SIZE);

      this.speechRate = Number(rate) || 0.9;
      this.voiceProvider = provider || 'youdao';
      this.bodyFontSize = normalizeBodyFontSize(fontSize);
      this._loaded = true;
    },

    async saveRate(rate) {
      const value = Number(rate) || 0.9;
      this.speechRate = value;
      await settingsRepository.set(GLOBAL_KEYS.RATE, String(value));
    },

    async saveProvider(provider) {
      this.voiceProvider = String(provider || 'youdao');
      await settingsRepository.set(GLOBAL_KEYS.PROVIDER, this.voiceProvider);
    },

    async saveBodyFontSize(size) {
      const value = normalizeBodyFontSize(size);
      this.bodyFontSize = value;
      await settingsRepository.set(GLOBAL_KEYS.BODY_FONT_SIZE, String(value));
    },

    ensureLoaded() {
      if (!this._loaded) {
        this.load();
      }
    }
  });

  store.load();
  return store;
}