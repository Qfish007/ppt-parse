import { reactive } from 'vue';
import { STORAGE_KEYS as GLOBAL_KEYS } from '../types/index.js';

function normalizeBodyFontSize(size) {
  return Math.min(Math.max(Number(size) || 18, 14), 60);
}

export function useSettingsStore() {
  const store = reactive({
    speechRate: Number(localStorage.getItem(GLOBAL_KEYS.RATE)) || 0.9,
    voiceProvider: localStorage.getItem(GLOBAL_KEYS.PROVIDER) || 'youdao',
    bodyFontSize: normalizeBodyFontSize(localStorage.getItem(GLOBAL_KEYS.BODY_FONT_SIZE)),

    saveRate(rate) {
      const value = Number(rate) || 0.9;
      this.speechRate = value;
      localStorage.setItem(GLOBAL_KEYS.RATE, String(value));
    },

    saveProvider(provider) {
      this.voiceProvider = String(provider || 'youdao');
      localStorage.setItem(GLOBAL_KEYS.PROVIDER, this.voiceProvider);
    },

    saveBodyFontSize(size) {
      const value = normalizeBodyFontSize(size);
      this.bodyFontSize = value;
      localStorage.setItem(GLOBAL_KEYS.BODY_FONT_SIZE, String(value));
    },

    load() {
      this.speechRate = Number(localStorage.getItem(GLOBAL_KEYS.RATE)) || 0.9;
      this.voiceProvider = localStorage.getItem(GLOBAL_KEYS.PROVIDER) || 'youdao';
      this.bodyFontSize = normalizeBodyFontSize(localStorage.getItem(GLOBAL_KEYS.BODY_FONT_SIZE));
    }
  });

  return store;
}