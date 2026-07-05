/**
 * 语音引擎统一导出模块
 * 整合有道、百度、iciba 等语音/翻译提供商，提供统一接口
 */
import { ref } from 'vue';
import { md5, signedYoudaoPronounceUrl, youdaoVoiceUrl, playYoudaoText } from './youdao.js';
import { baiduVoiceUrl, baiduSpeed, playBaiduText } from './baidu.js';
import { translateWithIciba, getIcibaTtsUrl } from './iciba.js';

// ============ 状态管理 ============

/** 当前正在播放的 Audio 对象 */
export const activeAudio = ref(null);

/** 语音运行 ID，每次 stopSpeech 时递增，用于中断正在进行的播放 */
export const speechRunId = ref(0);

// ============ 工具函数 ============

/**
 * 标准化语音文本
 * 替换特殊引号，压缩多余空白
 * @param {string} text
 * @returns {string}
 */
export function normalizeSpeechText(text) {
  return String(text || '')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 判断是否单个英语单词
 * @param {string} text
 * @returns {boolean}
 */
export function isSingleEnglishWord(text) {
  return /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(normalizeSpeechText(text));
}

/**
 * 选择浏览器语音
 * 优先选择高质量的英语声音
 * @param {string} [lang='en-US']
 * @returns {SpeechSynthesisVoice|null}
 */
function pickVoice(lang = 'en-US') {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const englishVoices = voices.filter((voice) => /^en[-_]/i.test(voice.lang));
  return englishVoices.find((voice) => /samantha|karen|moira|victoria|google us english|microsoft/i.test(voice.name))
    || englishVoices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
    || englishVoices[0]
    || null;
}

function waitForVoices() {
  if (!window.speechSynthesis) return Promise.resolve();
  if (window.speechSynthesis.getVoices().length) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 500);
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/**
 * 获取当前语速
 * @param {number} [rate] - 可选的覆盖速率
 * @returns {number}
 */
export function getSpeechRate(rate) {
  if (typeof rate === 'number' && Number.isFinite(rate)) return rate;
  try {
    const saved = localStorage.getItem('bilingual-reader-rate');
    return Number(saved) || 0.9;
  } catch {
    return 0.9;
  }
}

/**
 * 获取当前发音平台设置
 * @returns {string}
 */
function getVoiceProvider() {
  try {
    return localStorage.getItem('bilingual-reader-voice-provider') || 'youdao';
  } catch {
    return 'youdao';
  }
}

/**
 * 本地 TTS 代理 URL 生成
 * @param {string} provider - 提供商名称
 * @param {string} text - 文本
 * @param {number} [rate] - 播放速率
 * @returns {string}
 */
function localTtsUrl(provider, text, rate) {
  if (typeof window === 'undefined' || !window.location.protocol.startsWith('http')) return '';
  return `/tts/${provider}?text=${encodeURIComponent(text)}&spd=${baiduSpeed(rate || getSpeechRate())}&rate=${rate || getSpeechRate()}`;
}

// ============ 长句分割 ============

/**
 * 将长句按照标点、逗号分割为适合 TTS 的片段
 * @param {string} text
 * @param {number} [maxLength=120]
 * @returns {string[]}
 */
export function splitSpeechText(text, maxLength = 120) {
  const value = normalizeSpeechText(text);
  if (!value) return [];

  const sentences = value.match(/[^.!?;:]+[.!?;:]?|.+$/g) || [value];
  const chunks = [];

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    if (trimmed.length <= maxLength) {
      chunks.push(trimmed);
      return;
    }

    const parts = trimmed.split(/,\s+/);
    let current = '';
    parts.forEach((part, index) => {
      const piece = index < parts.length - 1 ? `${part},` : part;
      if (`${current} ${piece}`.trim().length > maxLength && current) {
        chunks.push(current.trim());
        current = piece;
      } else {
        current = `${current} ${piece}`.trim();
      }
    });
    if (current) chunks.push(current.trim());
  });

  return chunks;
}

// ============ 播放音频 ============

/**
 * 播放音频 URL（辅助函数）
 * 创建 Audio 对象播放，支持 playbackRate 控制速率，失败时回退
 * @param {string} text - 标准化后的文本
 * @param {number} runId - 当前运行 ID
 * @param {string} url - 音频 URL
 * @param {string} [fallbackProvider='browser'] - 失败时的回退提供商
 * @returns {Promise}
 */
export function playAudioUrl(text, runId, url, fallbackProvider = 'browser') {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.playbackRate = getSpeechRate();
  activeAudio.value = audio;

  return new Promise((resolve) => {
    const fallback = () => {
      if (runId !== speechRunId.value) return resolve();
      activeAudio.value = null;
      if (fallbackProvider === 'browser') {
        speakWithBrowserOnce(value, runId, 'en-US').then(resolve);
      } else {
        playWithProvider(value, runId, fallbackProvider, 'browser').then(resolve);
      }
    };

    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.addEventListener('error', fallback, { once: true });
    audio.play().catch(fallback);
  });
}

// ============ 浏览器内置 TTS ============

/**
 * 使用浏览器内置 Web Speech API 朗读
 * @param {string} text
 * @param {string} [lang='en-US']
 */
export function speakWithBrowser(text, lang = 'en-US') {
  const value = String(text || '').trim();
  if (!value) return;
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = lang;
  utterance.voice = pickVoice(lang);
  utterance.rate = getSpeechRate();
  window.speechSynthesis.speak(utterance);
}

/**
 * 使用浏览器内置 Web Speech API 单次朗读（Promise 版本）
 * @param {string} text
 * @param {number} runId - 运行 ID
 * @param {string} [lang='en-US']
 * @returns {Promise}
 */
export function speakWithBrowserOnce(text, runId, lang = 'en-US') {
  const value = String(text || '').trim();
  if (!value) return Promise.resolve();
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve();

  return new Promise(async (resolve) => {
    if (runId !== speechRunId.value) return resolve();
    await waitForVoices();
    if (runId !== speechRunId.value) return resolve();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(done, Math.max(4000, value.length * 180));
    utterance.lang = lang;
    utterance.voice = pickVoice(lang);
    utterance.rate = getSpeechRate();
    utterance.addEventListener('end', done, { once: true });
    utterance.addEventListener('error', done, { once: true });
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
  });
}

// ============ 各平台播放函数 ============

/**
 * 播放 iciba TTS
 * @param {string} text
 * @param {number} runId
 * @param {string} [fallbackProvider='baidu']
 * @returns {Promise}
 */
async function playIcibaText(text, runId, fallbackProvider = 'baidu') {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();

  try {
    const audioUrl = await getIcibaTtsUrl(value, 1, md5);
    if (runId !== speechRunId.value) return;
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.playbackRate = getSpeechRate();
    activeAudio.value = audio;

    return await new Promise((resolve) => {
      const fallback = () => {
        if (runId !== speechRunId.value) return resolve();
        activeAudio.value = null;
        speakWithBrowserOnce(value, runId, 'en-US').then(resolve);
      };

      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', fallback, { once: true });
      audio.play().catch(fallback);
    });
  } catch {
    return playWithProvider(value, runId, fallbackProvider, 'browser');
  }
}

/**
 * 按指定提供商播放文本
 * @param {string} text
 * @param {number} runId
 * @param {string} [provider] - 提供商名称：youdao, baidu, iciba, sogou, mac, browser
 * @param {string} [fallbackProvider='browser'] - 失败回退提供商
 * @returns {Promise}
 */
export async function playWithProvider(text, runId, provider, fallbackProvider = 'browser') {
  const value = normalizeSpeechText(text);
  if (!value || runId !== speechRunId.value) return Promise.resolve();

  const prov = provider || getVoiceProvider();
  const rate = getSpeechRate();

  if (prov === 'browser') return speakWithBrowserOnce(value, runId, 'en-US');
  if (prov === 'youdao') return playYoudaoText(value, runId, playAudioUrl, normalizeSpeechText, fallbackProvider);
  if (prov === 'baidu') return playBaiduText(value, runId, playAudioUrl, normalizeSpeechText, rate, fallbackProvider);
  if (prov === 'iciba') return playIcibaText(value, runId, fallbackProvider);
  return speakWithBrowserOnce(value, runId, 'en-US');
}

// ============ 对外统一接口 ============

/**
 * 停止所有发音
 */
export function stopSpeech() {
  speechRunId.value += 1;
  window.speechSynthesis.cancel();
  if (activeAudio.value) {
    activeAudio.value.pause();
    activeAudio.value.removeAttribute('src');
    activeAudio.value = null;
  }
}

/**
 * 主发音入口
 * 单词用有道真人发音，句子用选定平台
 * @param {string} text - 要朗读的文本
 * @param {string} [lang='en-US'] - 语言代码
 */
export function speak(text, lang = 'en-US') {
  const value = normalizeSpeechText(text);
  if (!value) return;
  if (lang.startsWith('en') && isSingleEnglishWord(value)) {
    playSingleEnglishText(value);
  } else if (lang.startsWith('en')) {
    speakEnglishQueue([value]);
  } else {
    stopSpeech();
    speakWithBrowser(value, lang);
  }
}

/**
 * 播放单个英语文本（停止当前播放后播放）
 * @param {string} text
 * @returns {Promise}
 */
function playSingleEnglishText(text) {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  stopSpeech();
  const runId = speechRunId.value;
  return playWithProvider(value, runId, getVoiceProvider(), 'browser');
}

/**
 * 英语句子队列播放
 * 将文本分割为片段后依次播放，支持中断
 * @param {string[]} items - 文本列表
 */
export async function speakEnglishQueue(items) {
  const runId = speechRunId.value + 1;
  stopSpeech();
  speechRunId.value = runId;

  const chunks = items.flatMap((item) => splitSpeechText(item)).filter(Boolean);
  if (!chunks.length) return;

  for (const item of chunks) {
    if (runId !== speechRunId.value) break;
    await playWithProvider(item, runId, getVoiceProvider(), 'browser');
  }
}
