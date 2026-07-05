/**
 * iciba 翻译与 TTS API 模块
 * 从原 app.js 中提取 iciba 相关的代码
 */

const ICIBA_SIGNATURE_SECRET = '7ece94d9f9c202b0d2ec557dg4r9bc';
const ICIBA_TTS_SECRET = '#ICIBA!(*&R$@#LOVE#';

/**
 * 将 params 对象的值按 key 排序后拼接
 * @param {Object} params
 * @returns {string}
 */
function sortedValueString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => params[key])
    .join('');
}

/**
 * 生成 iciba 签名 URL
 * @param {string} baseUrl - 基础 URL
 * @param {string} path - 请求路径
 * @param {Object} params - 请求参数
 * @param {Function} md5 - MD5 哈希函数
 * @returns {string} 签名后的完整 URL
 */
function icibaSignedUrl(baseUrl, path, params, md5) {
  const signed = { ...params };
  signed.signature = md5(`${path}${sortedValueString(signed)}${ICIBA_SIGNATURE_SECRET}`);
  const url = new URL(path, baseUrl);
  Object.entries(signed).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

/**
 * 生成 iciba TTS 请求参数
 * @param {number} [lang=1] - 语言代码，1=英语，2=中文
 * @param {Function} md5 - MD5 哈希函数
 * @returns {Object} TTS 请求参数
 */
function icibaTtsParams(lang = 1, md5) {
  const timestamp = (Date.now() / 1000).toFixed(0);
  const params = {
    c: 'word',
    m: 'getTTSUrl',
    client: 6,
    timestamp,
    tts_lan: lang
  };
  params.sign = md5(`${params.c}${params.m}${ICIBA_TTS_SECRET}${params.client}${params.timestamp}`).substr(5, 16);
  return params;
}

/**
 * 批量翻译
 * @param {string[]} textList - 待翻译文本列表
 * @param {string} [from='en'] - 源语言
 * @param {string} [to='zh'] - 目标语言
 * @param {Function} md5 - MD5 哈希函数
 * @returns {Promise<string[]>} 翻译结果列表
 */
export async function translateWithIciba(textList, from = 'en', to = 'zh', md5) {
  const values = textList.map((text) => String(text || '').trim());
  if (!values.some(Boolean)) return [];

  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const localResponse = await fetch('/iciba/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, textList: values })
      });
      if (localResponse.ok) {
        const data = await localResponse.json();
        if (data.code === 1 && Array.isArray(data.data)) return data.data.map((item) => item?.out || '');
      }
    } catch {
      // Fall through to direct request for static hosts that allow cross-origin calls.
    }
  }

  const path = '/dictionary/fy/batch';
  const url = icibaSignedUrl('https://dictionary.iciba.com', path, {
    client: 6,
    key: 1000006,
    timestamp: Date.now()
  }, md5);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, textList: values })
  });
  if (!response.ok) throw new Error(`iciba translate failed: ${response.status}`);

  const data = await response.json();
  if (data.code !== 1 || !Array.isArray(data.data)) {
    throw new Error(data.msg || 'iciba translate returned no result');
  }
  return data.data.map((item) => item?.out || '');
}

/**
 * 获取 iciba TTS URL
 * @param {string} text - 要发音的文本
 * @param {number} [lang=1] - 语言代码，1=英语，2=中文
 * @param {Function} md5 - MD5 哈希函数
 * @returns {Promise<string>} 音频 URL
 */
export async function getIcibaTtsUrl(text, lang = 1, md5) {
  const url = new URL('https://dict-mobile.iciba.com/interface/index.php');
  Object.entries(icibaTtsParams(lang, md5)).forEach(([key, value]) => url.searchParams.set(key, value));

  const form = new FormData();
  form.append('word', text);
  const response = await fetch(url.toString(), {
    method: 'POST',
    body: form
  });
  if (!response.ok) throw new Error(`iciba tts failed: ${response.status}`);

  const data = await response.json();
  const message = data?.message;
  const audioUrl = typeof message === 'string'
    ? message
    : message?.tts_url || message?.ttsUrl || message?.url || message?.audio;
  if (!audioUrl || data.status === 0) throw new Error(message?.message || 'iciba tts returned no url');
  return audioUrl;
}
