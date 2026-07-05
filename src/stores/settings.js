/**
 * 设置 Store
 * 使用 Vue3 reactive 模拟 Pinia，管理语速和发音平台设置
 */
import { reactive } from 'vue';

/** localStorage 存储键 */
export const STORAGE_KEYS = {
  rate: 'bilingual-reader-rate',
  provider: 'bilingual-reader-voice-provider'
};

/**
 * 设置 store
 * 使用 reactive 创建，用法类似 Pinia 的 useStore
 * @returns {Object} 响应式设置对象
 */
export function useSettingsStore() {
  const store = reactive({
    /** 播放语速，默认 0.9 */
    speechRate: Number(localStorage.getItem(STORAGE_KEYS.rate)) || 0.9,
    /** 发音平台，默认 'youdao' */
    voiceProvider: localStorage.getItem(STORAGE_KEYS.provider) || 'youdao',

    /**
     * 保存语速到 localStorage
     * @param {number} rate
     */
    saveRate(rate) {
      const value = Number(rate) || 0.9;
      this.speechRate = value;
      localStorage.setItem(STORAGE_KEYS.rate, String(value));
    },

    /**
     * 保存发音平台到 localStorage
     * @param {string} provider
     */
    saveProvider(provider) {
      this.voiceProvider = String(provider || 'youdao');
      localStorage.setItem(STORAGE_KEYS.provider, this.voiceProvider);
    },

    /**
     * 从 localStorage 重新加载设置
     */
    load() {
      this.speechRate = Number(localStorage.getItem(STORAGE_KEYS.rate)) || 0.9;
      this.voiceProvider = localStorage.getItem(STORAGE_KEYS.provider) || 'youdao';
    }
  });

  return store;
}
