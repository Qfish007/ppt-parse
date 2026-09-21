/**
 * 百度汉语数据源 API（中文生词本专用，独立于 vocabulary 的 voice/api 模块）
 *
 * 数据来源：
 *   后端代理 /hanyu/detail?wd=xxx  （server/api.js 路由，调用 puppeteer 渲染百度汉语页面）
 *
 * 发音策略：
 *   百度汉语页面本身没有可抓的 mp3 文件（按钮是 base64 PNG 图标）。
 *   复用项目已有的 /tts/baidu 百度翻译 TTS 接口传 lan=zh 即可获得中文发音
 *   （同为百度发音源，符合"用百度发音"的精神）。
 *
 * 缓存策略：
 *   长期缓存（IndexedDB chineseHanyuCache 表）由 store 层管理
 *   本模块只做短期内存缓存（60 秒），避免用户快速重复点击时重复请求
 */

import { baiduVoiceUrl } from '../voice/baidu.js';

const MEMO_TTL = 60 * 1000; // 60 秒短期缓存
const memo = new Map(); // word => { result, expireAt }

/**
 * 调用后端 /hanyu/detail 抓取百度汉语词条数据
 * @param {string} wd 中文词
 * @param {object} [options] { force: boolean } 强制刷新
 * @returns {Promise<object|null>} 词条数据；词条不存在返回 null
 */
export async function fetchHanyuDetail(wd, options = {}) {
  const word = String(wd || '').trim();
  if (!word) return null;

  const now = Date.now();
  if (!options.force) {
    const cached = memo.get(word);
    if (cached && cached.expireAt > now) {
      return cached.result;
    }
  }

  const url = `/hanyu/detail?wd=${encodeURIComponent(word)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // puppeteer 抓取慢，给 30 秒
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    if (json.code === 1 && json.data) {
      memo.set(word, { result: json.data, expireAt: now + MEMO_TTL });
      return json.data;
    }
    if (json.code === 0) {
      // 百度汉语查不到该词
      memo.set(word, { result: null, expireAt: now + MEMO_TTL });
      return null;
    }
    if (json.error === 'BLOCKED_BY_VERIFY') {
      throw new Error('触发百度安全验证，请稍后重试（或进入词条详情点刷新按钮）');
    }
    throw new Error(json.error || 'Unknown hanyu API error');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 构造中文发音 URL（百度翻译 TTS，lan=zh）
 * @param {string} text 要发音的中文文本
 * @returns {string} 音频 URL
 */
export function chineseVoiceUrl(text) {
  return baiduVoiceUrl(text, 0.9, 'zh');
}

/**
 * 播放中文发音
 * @param {string} text 要发音的中文文本
 * @returns {Promise<void>}
 */
export function playChineseAudio(text) {
  const value = String(text || '').trim();
  if (!value) return Promise.resolve();
  const url = chineseVoiceUrl(value);
  const audio = new Audio(url);
  audio.preload = 'auto';
  return new Promise((resolve) => {
    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.addEventListener('error', () => resolve(), { once: true });
    audio.play().catch(() => resolve());
  });
}

/**
 * 清空短期内存缓存
 */
export function clearHanyuMemo() {
  memo.clear();
}
