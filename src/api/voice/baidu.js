/**
 * 百度发音 API 模块
 * 从原 app.js 中提取百度相关的代码
 */

/**
 * 根据播放速率计算百度 spd 参数
 * @param {number} rate - 播放速率（从 settings store 获取）
 * @returns {number} 百度 spd 值
 */
export function baiduSpeed(rate = 0.9) {
  if (rate <= 0.7) return 2;
  if (rate <= 0.9) return 3;
  if (rate <= 1.05) return 4;
  return 5;
}

/**
 * 获取百度语音 URL
 * 如果是 http 协议，使用本地代理 `/tts/baidu?text=xxx&spd=xxx&lan=xxx`
 * 否则直接使用百度翻译 TTS 接口
 * @param {string} text - 要发音的文本
 * @param {number} [rate] - 播放速率
 * @param {string} [lang='en'] - 语言：'en' 英文 / 'zh' 中文
 * @returns {string} 语音 URL
 */
export function baiduVoiceUrl(text, rate, lang = 'en') {
  const spd = baiduSpeed(rate);
  const lan = /^zh/i.test(String(lang || '')) ? 'zh' : 'en';
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return `/tts/baidu?text=${encodeURIComponent(text)}&spd=${spd}&lan=${lan}`;
  }
  return `https://fanyi.baidu.com/gettts?lan=${lan}&text=${encodeURIComponent(text)}&spd=${spd}&source=web`;
}

/**
 * 播放百度语音
 * @param {string} text - 要发音的文本
 * @param {number} runId - 当前运行 ID，用于判断是否被中断
 * @param {Function} playAudioUrl - 播放音频 URL 的辅助函数
 * @param {Function} normalizeSpeechText - 标准化语音文本函数
 * @param {number} [rate] - 播放速率
 * @param {string} [lang='en'] - 语言：'en' / 'zh'
 * @param {string} [fallbackProvider='browser'] - 失败时的回退提供商
 * @param {string} [fallbackLang='en-US'] - 回退到 browser 时使用的 lang
 * @returns {Promise}
 */
export function playBaiduText(text, runId, playAudioUrl, normalizeSpeechText, rate, lang = 'en', fallbackProvider = 'browser', fallbackLang = 'en-US') {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  return playAudioUrl(value, runId, baiduVoiceUrl(value, rate, lang), fallbackProvider, fallbackLang);
}
