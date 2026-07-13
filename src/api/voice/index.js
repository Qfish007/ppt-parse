/**
 * 语音引擎统一导出模块
 * 整合有道、百度、iciba 等语音/翻译提供商，提供统一接口
 */
import { ref } from 'vue';
import { md5, playYoudaoText } from './youdao.js';
import { playBaiduText } from './baidu.js';
import { translateWithIciba, getIcibaTtsUrl } from './iciba.js';

export const activeAudio = ref(null);
export const speechRunId = ref(0);

let cachedRate = 0.9;
let cachedProvider = 'youdao';

export function setSpeechConfig(rate, provider) {
  cachedRate = rate;
  cachedProvider = provider;
}

export function normalizeSpeechText(text) {
  return String(text || '')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSingleEnglishWord(text) {
  return /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(normalizeSpeechText(text));
}

function pickVoice(lang = 'en-US') {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const isChinese = /^zh/i.test(lang);
  const matchedVoices = voices.filter((voice) => {
    const vl = (voice.lang || '').toLowerCase();
    if (isChinese) return vl.startsWith('zh') || vl.startsWith('cmn');
    return vl.startsWith('en');
  });
  if (isChinese) {
    return matchedVoices.find((voice) => /tingting|mei-jia|yunxi|yaoyao|google.*chinese|microsoft.*(simplified|chinese|hanhan|huihui|yaoyao|xiaoxiao|kangkang)/i.test(voice.name))
      || matchedVoices.find((voice) => voice.lang.toLowerCase().includes('cn') || voice.lang.toLowerCase() === 'zh-cn')
      || matchedVoices.find((voice) => voice.lang.toLowerCase().startsWith('zh'))
      || matchedVoices[0]
      || null;
  }
  return matchedVoices.find((voice) => /samantha|karen|moira|victoria|google us english|microsoft/i.test(voice.name))
    || matchedVoices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
    || matchedVoices[0]
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

export function getSpeechRate(rate) {
  if (typeof rate === 'number' && Number.isFinite(rate)) return rate;
  return cachedRate;
}

function getVoiceProvider() {
  return cachedProvider;
}

export function splitSpeechText(text, maxLength = 120) {
  const value = normalizeSpeechText(text);
  if (!value) return [];

  const sentences = value.match(/[^.!?;:。！？；：]+[.!?;:。！？；：]?|.+$/g) || [value];
  const chunks = [];

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    if (trimmed.length <= maxLength) {
      chunks.push(trimmed);
      return;
    }

    const parts = trimmed.match(/[^,，、]+[,，、]?|.+$/g) || [trimmed];
    let current = '';
    parts.forEach((part, index) => {
      const piece = part.trim();
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

export function playAudioUrl(text, runId, url, fallbackProvider = 'browser', fallbackLang = 'en-US') {
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
        speakWithBrowserOnce(value, runId, fallbackLang).then(resolve);
      } else {
        playWithProvider(value, runId, fallbackProvider, 'browser', fallbackLang).then(resolve);
      }
    };

    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.addEventListener('error', fallback, { once: true });
    audio.play().catch(fallback);
  });
}

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

async function playIcibaText(text, runId, fallbackProvider = 'baidu', fallbackLang = 'en-US') {
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
        playWithProvider(value, runId, fallbackProvider, 'browser', fallbackLang).then(resolve);
      };

      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', fallback, { once: true });
      audio.play().catch(fallback);
    });
  } catch {
    return playWithProvider(value, runId, fallbackProvider, 'browser', fallbackLang);
  }
}

export async function playWithProvider(text, runId, provider, fallbackProvider = 'browser', fallbackLang = 'en-US', preferLang = 'en') {
  const value = normalizeSpeechText(text);
  if (!value || runId !== speechRunId.value) return Promise.resolve();

  const prov = provider || getVoiceProvider();
  const rate = getSpeechRate();

  if (prov === 'browser') return speakWithBrowserOnce(value, runId, fallbackLang);
  if (prov === 'youdao') return playYoudaoText(value, runId, playAudioUrl, normalizeSpeechText, preferLang, fallbackProvider, fallbackLang);
  if (prov === 'baidu') return playBaiduText(value, runId, playAudioUrl, normalizeSpeechText, rate, preferLang, fallbackProvider, fallbackLang);
  if (prov === 'iciba') return playIcibaText(value, runId, fallbackProvider, fallbackLang);
  return speakWithBrowserOnce(value, runId, fallbackLang);
}

export function stopSpeech() {
  speechRunId.value += 1;
  window.speechSynthesis.cancel();
  if (activeAudio.value) {
    activeAudio.value.pause();
    activeAudio.value.removeAttribute('src');
    activeAudio.value = null;
  }
}

export function speak(text, lang = 'en-US') {
  const value = normalizeSpeechText(text);
  if (!value) return;
  if (lang.startsWith('en') && isSingleEnglishWord(value)) {
    playSingleEnglishText(value);
  } else if (lang.startsWith('en')) {
    speakEnglishQueue([value]);
  } else {
    speakChineseQueue([value]);
  }
}

export function speakChinese(text) {
  const value = normalizeSpeechText(text);
  if (!value) return;
  speakChineseQueue([value]);
}

function playSingleEnglishText(text) {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  stopSpeech();
  const runId = speechRunId.value;
  return playWithProvider(value, runId, getVoiceProvider(), 'browser', 'en-US', 'en');
}

export async function speakEnglishQueue(items) {
  const runId = speechRunId.value + 1;
  stopSpeech();
  speechRunId.value = runId;

  const chunks = items.flatMap((item) => splitSpeechText(item)).filter(Boolean);
  if (!chunks.length) return;

  for (const item of chunks) {
    if (runId !== speechRunId.value) break;
    await playWithProvider(item, runId, getVoiceProvider(), 'browser', 'en-US', 'en');
  }
}

export async function speakChineseQueue(items) {
  const runId = speechRunId.value + 1;
  stopSpeech();
  speechRunId.value = runId;

  const chunks = items.flatMap((item) => splitSpeechText(item)).filter(Boolean);
  if (!chunks.length) return;

  for (const item of chunks) {
    if (runId !== speechRunId.value) break;
    await playWithProvider(item, runId, getVoiceProvider(), 'browser', 'zh-CN', 'zh');
  }
}