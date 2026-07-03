const sampleBook = {
  title: "示例内容",
  pages: [
    {
      page: 1,
      image: "",
      lines: [
        { en: "Good morning, everyone.", zh: "大家早上好。" },
        { en: "Let's read and listen together.", zh: "我们一起读、一起听。" }
      ]
    },
    {
      page: 2,
      image: "",
      lines: [
        { en: "Point to a word to hear it.", zh: "点击一个单词来听它的读音。" },
        { en: "Use the page button to read everything on this page.", zh: "使用本页朗读按钮朗读整页内容。" }
      ]
    }
  ]
};

let book = window.generatedBook ? normalizeBook(window.generatedBook) : sampleBook;
let currentIndex = 0;
let activeAudio = null;
let speechRunId = 0;
let wordPopup = null;
const WORD_TRANSLATION_CACHE_KEY = "bilingual-reader-word-translations";
const WORD_FALLBACK_MEANING = "释义待补充，可以继续点喇叭听发音。";

const dictionary = {
  a: "一个；一件",
  about: "关于；大约",
  ago: "以前",
  ancient: "古代的",
  another: "另一个",
  any: "任何的；一些",
  axe: "斧头",
  before: "在……以前",
  bit: "一点；少量",
  boxes: "盒子；箱子",
  buy: "买",
  conversations: "谈话；对话",
  created: "创造；产生",
  did: "助动词，用于过去时疑问句",
  do: "做；助动词",
  earliest: "最早的",
  everywhere: "到处；处处",
  exchanged: "交换",
  exciting: "令人兴奋的；有趣的",
  explore: "探索",
  familiar: "熟悉的",
  for: "为了；给；换取",
  how: "怎样；如何",
  in: "在……里面",
  is: "是",
  it: "它",
  know: "知道；了解",
  let: "让",
  like: "像；喜欢",
  lives: "生活",
  long: "长的；长久地",
  look: "看起来；样子",
  money: "钱；货币",
  much: "许多；大量",
  our: "我们的",
  parents: "父母",
  people: "人们",
  probably: "可能；大概",
  really: "真正地；确实",
  same: "相同的",
  shops: "商店",
  the: "这个；那个",
  there: "那里；有",
  thing: "东西；事情",
  things: "东西；物品",
  this: "这个",
  times: "时代；时期；次数",
  to: "向；到；用于动词不定式",
  together: "一起",
  use: "使用",
  was: "是（am/is 的过去式）",
  "wasn't": "不是；没有（was not）",
  wallets: "钱包",
  want: "想要",
  went: "去；进行（go 的过去式）",
  we: "我们",
  "we're": "我们是；我们正在",
  what: "什么",
  with: "和；带有",
  world: "世界"
};

try {
  const savedWordTranslations = JSON.parse(localStorage.getItem(WORD_TRANSLATION_CACHE_KEY) || "{}");
  Object.entries(savedWordTranslations).forEach(([word, meaning]) => {
    if (typeof meaning === "string" && meaning.trim()) dictionary[word] = meaning.trim();
  });
} catch {
  localStorage.removeItem(WORD_TRANSLATION_CACHE_KEY);
}

const els = {
  bookTitle: document.querySelector("#bookTitle"),
  fileInput: document.querySelector("#fileInput"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  pageCounter: document.querySelector("#pageCounter"),
  pageInput: document.querySelector("#pageInput"),
  rateInput: document.querySelector("#rateInput"),
  rateValue: document.querySelector("#rateValue"),
  sentenceVoiceInput: document.querySelector("#sentenceVoiceInput"),
  readPageBtn: document.querySelector("#readPageBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  translatePageBtn: document.querySelector("#translatePageBtn"),
  pageList: document.querySelector("#pageList"),
  imagePanel: document.querySelector("#imagePanel"),
  pageImage: document.querySelector("#pageImage"),
  pageContent: document.querySelector("#pageContent")
};

const ICIBA_SIGNATURE_SECRET = "7ece94d9f9c202b0d2ec557dg4r9bc";
const ICIBA_TTS_SECRET = "#ICIBA!(*&R$@#LOVE#";
const YOUDAO_VOICE_KEY_ID = "voiceDictWeb";
const YOUDAO_VOICE_PRODUCT = "webdict";
const YOUDAO_VOICE_SECRET = "U3uACNRWSDWdcsKm";

function md5(input) {
  function add32(a, b) {
    return (a + b) & 0xffffffff;
  }

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md5cycle(x, k) {
    let [a, b, c, d] = x;

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function md5blk(s) {
    const blocks = [];
    for (let i = 0; i < 64; i += 4) {
      blocks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return blocks;
  }

  function md51(s) {
    const txt = unescape(encodeURIComponent(String(s)));
    let n = txt.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(txt.substring(i - 64, i)));
    const tail = Array(16).fill(0);
    const remaining = txt.substring(i - 64);
    n = remaining.length;
    for (i = 0; i < n; i += 1) tail[i >> 2] |= remaining.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      tail.fill(0);
    }
    tail[14] = txt.length * 8;
    md5cycle(state, tail);
    return state;
  }

  function hex(x) {
    const chars = "0123456789abcdef";
    return x.map((value) => {
      let out = "";
      for (let j = 0; j < 4; j += 1) {
        out += chars[(value >> (j * 8 + 4)) & 0x0f] + chars[(value >> (j * 8)) & 0x0f];
      }
      return out;
    }).join("");
  }

  return hex(md51(input));
}

function normalizeBook(raw) {
  const pages = Array.isArray(raw.pages) ? raw.pages : [];
  return {
    title: String(raw.title || "未命名内容"),
    pages: pages.map((page, index) => ({
      page: Number(page.page || index + 1),
      image: typeof page.image === "string" ? page.image : "",
      lines: Array.isArray(page.lines)
        ? page.lines.map((line) => ({
            en: String(line.en || "").trim(),
            zh: String(line.zh || "").trim()
          })).filter((line) => line.en || line.zh)
        : []
    })).filter((page) => page.lines.length || page.image)
  };
}

function tokenize(text) {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]/g) || [];
}

function lookupWord(word) {
  const key = String(word || "").toLowerCase();
  return dictionary[key] || WORD_FALLBACK_MEANING;
}

function saveWordMeaning(word, meaning) {
  const key = String(word || "").toLowerCase().trim();
  const value = String(meaning || "").trim();
  if (!key || !value) return;

  dictionary[key] = value;
  const saved = JSON.parse(localStorage.getItem(WORD_TRANSLATION_CACHE_KEY) || "{}");
  saved[key] = value;
  localStorage.setItem(WORD_TRANSLATION_CACHE_KEY, JSON.stringify(saved));
}

async function translateWordToChinese(word) {
  const value = String(word || "").trim();
  if (!value) return "";

  if (getSentenceVoiceMode() === "youdao" && window.location.protocol.startsWith("http")) {
    const response = await fetch(`/youdao/translate?word=${encodeURIComponent(value)}`);
    if (response.ok) {
      const data = await response.json();
      const meaning = data?.data?.meaning;
      if (meaning) return String(meaning).trim();
    }
  }

  const [translation] = await translateWithIciba([value], "en", "zh");
  return String(translation || "").trim();
}

function closeWordPopup() {
  wordPopup?.remove();
  wordPopup = null;
}

function showWordPopup(anchor, word) {
  closeWordPopup();

  const cleanWord = String(word || "").trim();
  const rect = anchor.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.className = "word-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", `${cleanWord} 的释义`);

  const title = document.createElement("div");
  title.className = "word-popup-title";
  title.textContent = cleanWord;

  const meaning = document.createElement("div");
  meaning.className = "word-popup-meaning";
  meaning.textContent = lookupWord(cleanWord);

  const actions = document.createElement("div");
  actions.className = "word-popup-actions";

  const sound = document.createElement("button");
  sound.type = "button";
  sound.className = "word-popup-sound";
  sound.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path></svg><span>发音</span>';
  sound.addEventListener("click", (event) => {
    event.stopPropagation();
    speak(cleanWord, "en-US");
  });

  const translate = document.createElement("button");
  translate.type = "button";
  translate.className = "word-popup-translate";
  translate.textContent = "翻译";
  async function runWordTranslation() {
    translate.disabled = true;
    const originalText = translate.textContent;
    translate.textContent = "翻译中";
    meaning.textContent = "正在查询中文释义...";

    try {
      const translated = await translateWordToChinese(cleanWord);
      if (!translated) throw new Error("empty translation");
      saveWordMeaning(cleanWord, translated);
      meaning.textContent = translated;
      translate.textContent = "已翻译";
    } catch {
      meaning.textContent = "翻译失败。请确认已通过本地服务打开页面，或稍后再试。";
      translate.disabled = false;
      translate.textContent = originalText;
    }
  }

  translate.addEventListener("click", async (event) => {
    event.stopPropagation();
    await runWordTranslation();
  });

  const close = document.createElement("button");
  close.type = "button";
  close.className = "word-popup-close";
  close.textContent = "关闭";
  close.addEventListener("click", closeWordPopup);

  actions.append(sound, translate, close);
  popup.append(title, meaning, actions);
  document.body.append(popup);

  const popupRect = popup.getBoundingClientRect();
  const top = Math.min(window.innerHeight - popupRect.height - 12, rect.bottom + 10);
  const left = Math.min(window.innerWidth - popupRect.width - 12, Math.max(12, rect.left + rect.width / 2 - popupRect.width / 2));
  popup.style.top = `${Math.max(12, top)}px`;
  popup.style.left = `${left}px`;
  wordPopup = popup;
  speak(cleanWord, "en-US");
  if (meaning.textContent === WORD_FALLBACK_MEANING) {
    runWordTranslation();
  }
}

function speakWithBrowser(text, lang = "en-US") {
  const value = String(text || "").trim();
  if (!value) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = lang;
  utterance.voice = pickVoice(lang);
  utterance.rate = getSpeechRate();
  window.speechSynthesis.speak(utterance);
}

function speakWithBrowserOnce(text, runId, lang = "en-US") {
  const value = String(text || "").trim();
  if (!value) return Promise.resolve();
  window.speechSynthesis.cancel();

  return new Promise((resolve) => {
    if (runId !== speechRunId) return resolve();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = lang;
    utterance.voice = pickVoice(lang);
    utterance.rate = getSpeechRate();
    utterance.addEventListener("end", () => resolve(), { once: true });
    utterance.addEventListener("error", () => resolve(), { once: true });
    window.speechSynthesis.speak(utterance);
  });
}

function getSpeechRate() {
  return Number(els.rateInput.value || 0.9);
}

function pickVoice(lang = "en-US") {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const englishVoices = voices.filter((voice) => /^en[-_]/i.test(voice.lang));
  return englishVoices.find((voice) => /samantha|karen|moira|victoria|google us english|microsoft/i.test(voice.name))
    || englishVoices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
    || englishVoices[0]
    || null;
}

function updateRateDisplay() {
  const rate = getSpeechRate();
  if (els.rateValue) els.rateValue.textContent = `${rate.toFixed(2)}x`;
  if (activeAudio) activeAudio.playbackRate = rate;
  localStorage.setItem("bilingual-reader-rate", String(rate));
}

function getSentenceVoiceMode() {
  return els.sentenceVoiceInput?.value || "youdao";
}

function updateSentenceVoiceMode() {
  localStorage.setItem("bilingual-reader-voice-provider", getSentenceVoiceMode());
}

function normalizeSpeechText(text) {
  return String(text || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function youdaoVoiceUrl(text) {
  if (window.location.protocol.startsWith("http")) {
    return localTtsUrl("youdao", text);
  }
  return signedYoudaoPronounceUrl(text);
}

function signedYoudaoPronounceUrl(text) {
  const params = {
    product: YOUDAO_VOICE_PRODUCT,
    appVersion: 1,
    client: "web",
    mid: 1,
    vendor: "web",
    screen: 1,
    model: 1,
    imei: 1,
    network: "wifi",
    keyfrom: YOUDAO_VOICE_PRODUCT,
    keyid: YOUDAO_VOICE_KEY_ID,
    mysticTime: Date.now(),
    yduuid: "abcdefg",
    le: "en",
    rate: 4,
    word: text,
    type: 2
  };
  const signKeys = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== "");
  const signedKeys = [...signKeys, "key"];
  const signText = signedKeys
    .map((key) => `${key}=${key === "key" ? YOUDAO_VOICE_SECRET : params[key]}`)
    .join("&");
  params.sign = md5(signText);
  params.pointParam = signedKeys.join(",");

  const url = new URL("https://dict.youdao.com/pronounce/base");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function localTtsUrl(provider, text) {
  if (!window.location.protocol.startsWith("http")) return "";
  return `/tts/${provider}?text=${encodeURIComponent(text)}&spd=${baiduSpeed()}&rate=${getSpeechRate()}`;
}

function baiduSpeed() {
  const rate = getSpeechRate();
  if (rate <= 0.7) return 2;
  if (rate <= 0.9) return 3;
  if (rate <= 1.05) return 4;
  return 5;
}

function baiduVoiceUrl(text) {
  if (window.location.protocol.startsWith("http")) {
    return localTtsUrl("baidu", text);
  }
  return `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(text)}&spd=${baiduSpeed()}&source=web`;
}

function sogouVoiceUrl(text) {
  return localTtsUrl("sogou", text);
}

function macVoiceUrl(text) {
  return localTtsUrl("mac", text);
}

function sortedValueString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => params[key])
    .join("");
}

function icibaSignedUrl(baseUrl, path, params) {
  const signed = { ...params };
  signed.signature = md5(`${path}${sortedValueString(signed)}${ICIBA_SIGNATURE_SECRET}`);
  const url = new URL(path, baseUrl);
  Object.entries(signed).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function translateWithIciba(textList, from = "en", to = "zh") {
  const values = textList.map((text) => String(text || "").trim());
  if (!values.some(Boolean)) return [];

  if (window.location.protocol.startsWith("http")) {
    try {
      const localResponse = await fetch("/iciba/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, textList: values })
      });
      if (localResponse.ok) {
        const data = await localResponse.json();
        if (data.code === 1 && Array.isArray(data.data)) return data.data.map((item) => item?.out || "");
      }
    } catch {
      // Fall through to direct request for static hosts that allow cross-origin calls.
    }
  }

  const path = "/dictionary/fy/batch";
  const url = icibaSignedUrl("https://dictionary.iciba.com", path, {
    client: 6,
    key: 1000006,
    timestamp: Date.now()
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, textList: values })
  });
  if (!response.ok) throw new Error(`iciba translate failed: ${response.status}`);

  const data = await response.json();
  if (data.code !== 1 || !Array.isArray(data.data)) {
    throw new Error(data.msg || "iciba translate returned no result");
  }
  return data.data.map((item) => item?.out || "");
}

function icibaTtsParams(lang = 1) {
  const timestamp = (Date.now() / 1000).toFixed(0);
  const params = {
    c: "word",
    m: "getTTSUrl",
    client: 6,
    timestamp,
    tts_lan: lang
  };
  params.sign = md5(`${params.c}${params.m}${ICIBA_TTS_SECRET}${params.client}${params.timestamp}`).substr(5, 16);
  return params;
}

async function getIcibaTtsUrl(text, lang = 1) {
  const url = new URL("https://dict-mobile.iciba.com/interface/index.php");
  Object.entries(icibaTtsParams(lang)).forEach(([key, value]) => url.searchParams.set(key, value));

  const form = new FormData();
  form.append("word", text);
  const response = await fetch(url.toString(), {
    method: "POST",
    body: form
  });
  if (!response.ok) throw new Error(`iciba tts failed: ${response.status}`);

  const data = await response.json();
  const message = data?.message;
  const audioUrl = typeof message === "string"
    ? message
    : message?.tts_url || message?.ttsUrl || message?.url || message?.audio;
  if (!audioUrl || data.status === 0) throw new Error(message?.message || "iciba tts returned no url");
  return audioUrl;
}

function splitSpeechText(text, maxLength = 120) {
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
    let current = "";
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

function stopSpeech() {
  speechRunId += 1;
  window.speechSynthesis.cancel();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio = null;
  }
}

function playAudioUrl(text, runId, url, fallbackProvider = "browser") {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  activeAudio = new Audio(url);
  activeAudio.preload = "auto";
  activeAudio.playbackRate = getSpeechRate();

  return new Promise((resolve) => {
    const fallback = () => {
      if (runId !== speechRunId) return resolve();
      activeAudio = null;
      if (fallbackProvider === "browser") {
        speakWithBrowserOnce(value, runId, "en-US").then(resolve);
      } else {
        playWithProvider(value, runId, fallbackProvider, "browser").then(resolve);
      }
    };

    activeAudio.addEventListener("ended", () => resolve(), { once: true });
    activeAudio.addEventListener("error", fallback, { once: true });
    activeAudio.play().catch(fallback);
  });
}

function playYoudaoText(text, runId, fallbackProvider = "browser") {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  return playAudioUrl(value, runId, youdaoVoiceUrl(value), fallbackProvider);
}

function playBaiduText(text, runId, fallbackProvider = "browser") {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  return playAudioUrl(value, runId, baiduVoiceUrl(value), fallbackProvider);
}

function playSogouText(text, runId, fallbackProvider = "baidu") {
  const value = normalizeSpeechText(text);
  const url = sogouVoiceUrl(value);
  if (!value || !url) return playWithProvider(value, runId, fallbackProvider, "browser");
  return playAudioUrl(value, runId, url, fallbackProvider);
}

function playMacText(text, runId, fallbackProvider = "browser") {
  const value = normalizeSpeechText(text);
  const url = macVoiceUrl(value);
  if (!value || !url) return playWithProvider(value, runId, fallbackProvider, "browser");
  return playAudioUrl(value, runId, url, fallbackProvider);
}

async function playIcibaText(text, runId, fallbackProvider = "baidu") {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();

  try {
    const audioUrl = await getIcibaTtsUrl(value, 1);
    if (runId !== speechRunId) return;
    activeAudio = new Audio(audioUrl);
    activeAudio.preload = "auto";
    activeAudio.playbackRate = getSpeechRate();

    return await new Promise((resolve) => {
      const fallback = () => {
        if (runId !== speechRunId) return resolve();
        activeAudio = null;
        speakWithBrowserOnce(value, runId, "en-US").then(resolve);
      };

      activeAudio.addEventListener("ended", () => resolve(), { once: true });
      activeAudio.addEventListener("error", fallback, { once: true });
      activeAudio.play().catch(fallback);
    });
  } catch {
    return playWithProvider(value, runId, fallbackProvider, "browser");
  }
}

async function playWithProvider(text, runId, provider = getSentenceVoiceMode(), fallbackProvider = "browser") {
  const value = normalizeSpeechText(text);
  if (!value || runId !== speechRunId) return Promise.resolve();

  if (provider === "browser") return speakWithBrowserOnce(value, runId, "en-US");
  if (provider === "youdao") return playYoudaoText(value, runId, fallbackProvider);
  if (provider === "baidu") return playBaiduText(value, runId, fallbackProvider);
  if (provider === "iciba") return playIcibaText(value, runId, fallbackProvider);
  if (provider === "sogou") return playSogouText(value, runId, fallbackProvider);
  if (provider === "mac") return playMacText(value, runId, fallbackProvider);
  return speakWithBrowserOnce(value, runId, "en-US");
}

function playSingleEnglishText(text) {
  const value = normalizeSpeechText(text);
  if (!value) return Promise.resolve();
  stopSpeech();
  const runId = speechRunId;
  return playWithProvider(value, runId, getSentenceVoiceMode(), "browser");
}

function isSingleEnglishWord(text) {
  return /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(normalizeSpeechText(text));
}

function speak(text, lang = "en-US") {
  const value = normalizeSpeechText(text);
  if (!value) return;
  if (lang.startsWith("en") && isSingleEnglishWord(value)) {
    playSingleEnglishText(value);
  } else if (lang.startsWith("en")) {
    speakEnglishQueue([value]);
  } else {
    stopSpeech();
    speakWithBrowser(value, lang);
  }
}

async function speakEnglishQueue(items) {
  const runId = speechRunId + 1;
  stopSpeech();
  speechRunId = runId;

  const chunks = items.flatMap((item) => splitSpeechText(item)).filter(Boolean);

  for (const item of chunks) {
    if (runId !== speechRunId) break;
    await playWithProvider(item, runId, getSentenceVoiceMode(), "browser");
  }
}

function renderPageList() {
  els.pageList.replaceChildren();
  book.pages.forEach((page, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-link";
    button.textContent = `第 ${page.page} 页`;
    button.setAttribute("aria-current", index === currentIndex ? "page" : "false");
    button.addEventListener("click", () => {
      currentIndex = index;
      render();
    });
    els.pageList.append(button);
  });
}

function renderLine(line) {
  return renderStudyBlock({ en: line.en, zh: line.zh, sourceLines: [line] }, 0);
}

function lineLooksLikeHeading(text) {
  const value = String(text || "").trim();
  return value.length <= 34 && !/[.!?。！？]$/.test(value);
}

function groupLines(lines) {
  const groups = [];
  let current = [];

  function pushCurrent() {
    if (!current.length) return;
    groups.push({
      en: current.map((line) => line.en).filter(Boolean).join(" "),
      zh: current.map((line) => line.zh).filter(Boolean).join("\n"),
      sourceLines: current
    });
    current = [];
  }

  lines.forEach((line, index) => {
    const text = line.en.trim();
    if (!text && !line.zh) return;

    if (current.length && lineLooksLikeHeading(text)) {
      pushCurrent();
    }

    current.push(line);

    const joined = current.map((item) => item.en).join(" ");
    const endOfThought = /[.!?。！？]"?$/.test(text);
    const next = lines[index + 1]?.en || "";
    const nextLooksNew = lineLooksLikeHeading(next);

    if (line.zh || current.length >= 5 || (endOfThought && joined.length > 120) || (endOfThought && nextLooksNew)) {
      pushCurrent();
    }
  });

  pushCurrent();
  return groups;
}

function renderStudyBlock(group, index) {
  const block = document.createElement("section");
  block.className = "study-block";
  const isHeading = index === 0 && lineLooksLikeHeading(group.en);
  if (isHeading) block.classList.add("heading-block");

  const english = document.createElement("p");
  english.className = "english paragraph-text";
  if (isHeading) english.classList.add("lesson-title");
  let previousPart = "";
  tokenize(group.en).forEach((part, tokenIndex) => {
    const isReadable = /[A-Za-z0-9]/.test(part);
    const shouldSpace = tokenIndex > 0 && isReadable && !/["'“‘(]/.test(previousPart);
    if (shouldSpace) english.append(document.createTextNode(" "));

    const word = document.createElement("button");
    word.type = "button";
    word.className = "word";
    word.textContent = part;
    word.disabled = !isReadable;
    if (!word.disabled) {
      word.addEventListener("click", (event) => {
        event.stopPropagation();
        showWordPopup(word, part);
      });
    }
    english.append(word);
    previousPart = part;
  });

  const chinese = document.createElement("div");
  chinese.className = "chinese";
  chinese.contentEditable = "true";
  chinese.spellcheck = false;
  chinese.dataset.placeholder = "在这里补中文对照";
  chinese.textContent = group.zh;
  chinese.addEventListener("input", () => {
    const text = chinese.textContent.trim();
    if (group.sourceLines.length === 1) {
      group.sourceLines[0].zh = text;
    } else {
      group.sourceLines.forEach((sourceLine, lineIndex) => {
        sourceLine.zh = lineIndex === 0 ? text : "";
      });
    }
    saveEdits();
  });

  const actions = document.createElement("div");
  actions.className = "study-actions";

  const number = document.createElement("span");
  number.className = "study-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const play = document.createElement("button");
  play.type = "button";
  play.className = "mini-play";
  play.title = "朗读这一段";
  play.setAttribute("aria-label", "朗读这一段");
  play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
  play.addEventListener("click", () => speak(group.en, "en-US"));

  actions.append(number, play);
  block.append(actions, english, chinese);
  return block;
}

function saveEdits() {
  try {
    localStorage.setItem("bilingual-reader-edits", JSON.stringify(book));
  } catch {
    // Local storage may be unavailable in some browser privacy modes.
  }
}

function loadEdits() {
  try {
    const saved = JSON.parse(localStorage.getItem("bilingual-reader-edits") || "null");
    if (saved?.title === book.title && Array.isArray(saved.pages) && saved.pages.length === book.pages.length) {
      book = normalizeBook(saved);
    }
  } catch {
    localStorage.removeItem("bilingual-reader-edits");
  }
}

function render() {
  const total = book.pages.length;
  const page = book.pages[currentIndex];

  els.bookTitle.textContent = book.title;
  if (els.pageCounter) els.pageCounter.textContent = `${total ? currentIndex + 1 : 0} / ${total}`;
  els.pageInput.max = String(Math.max(total, 1));
  els.pageInput.value = String(total ? currentIndex + 1 : 1);
  if (els.prevBtn) els.prevBtn.disabled = currentIndex <= 0;
  if (els.nextBtn) els.nextBtn.disabled = currentIndex >= total - 1;
  if (els.readPageBtn) els.readPageBtn.disabled = !page?.lines?.length;
  if (els.translatePageBtn) els.translatePageBtn.disabled = !page?.lines?.some((line) => line.en.trim());

  if (page?.image) {
    els.imagePanel.hidden = false;
    els.pageImage.src = page.image;
    els.pageImage.alt = `第 ${page.page} 页`;
  } else {
    els.imagePanel.hidden = true;
    els.pageImage.removeAttribute("src");
  }

  els.pageContent.replaceChildren();
  if (!page) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "请导入包含 pages 数组的 JSON 文件。";
    els.pageContent.append(empty);
  } else if (!page.lines.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "这一页还没有逐行文本。";
    els.pageContent.append(empty);
  } else {
    const header = document.createElement("header");
    header.className = "study-header";
    header.innerHTML = `<span>第 ${page.page} 页</span><strong>逐段朗读</strong>`;
    els.pageContent.append(header);
    groupLines(page.lines).forEach((group, index) => els.pageContent.append(renderStudyBlock(group, index)));
  }

  renderPageList();
}

function readCurrentPage() {
  const page = book.pages[currentIndex];
  if (!page) return;
  speakEnglishQueue(groupLines(page.lines).map((group) => group.en));
}

async function translateCurrentPageWithIciba() {
  const page = book.pages[currentIndex];
  const lines = page?.lines?.filter((line) => line.en.trim()) || [];
  if (!lines.length || !els.translatePageBtn) return;

  const originalText = els.translatePageBtn.textContent;
  els.translatePageBtn.disabled = true;
  els.translatePageBtn.classList.add("is-loading");
  els.translatePageBtn.lastChild.textContent = "金山翻译中";

  try {
    const translations = await translateWithIciba(lines.map((line) => line.en), "en", "zh");
    translations.forEach((translation, index) => {
      if (translation) lines[index].zh = translation;
    });
    saveEdits();
    render();
  } catch (error) {
    console.error(error);
    window.alert(`金山翻译失败：${error.message}`);
  } finally {
    els.translatePageBtn.classList.remove("is-loading");
    els.translatePageBtn.lastChild.textContent = originalText.trim();
    render();
  }
}

els.prevBtn?.addEventListener("click", () => {
  currentIndex = Math.max(0, currentIndex - 1);
  render();
});

els.nextBtn?.addEventListener("click", () => {
  currentIndex = Math.min(book.pages.length - 1, currentIndex + 1);
  render();
});

els.pageInput.addEventListener("change", () => {
  goToPageInput();
});

els.pageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") goToPageInput();
});

function goToPageInput() {
  const pageNumber = Number(els.pageInput.value);
  if (!Number.isFinite(pageNumber)) return;
  currentIndex = Math.min(Math.max(pageNumber - 1, 0), book.pages.length - 1);
  render();
}

els.readPageBtn?.addEventListener("click", readCurrentPage);
els.stopBtn?.addEventListener("click", stopSpeech);
els.translatePageBtn?.addEventListener("click", translateCurrentPageWithIciba);
els.rateInput.addEventListener("input", updateRateDisplay);
els.sentenceVoiceInput.addEventListener("change", updateSentenceVoiceMode);

document.addEventListener("click", (event) => {
  if (wordPopup && !wordPopup.contains(event.target)) closeWordPopup();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeWordPopup();
});

els.fileInput?.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const nextBook = normalizeBook(raw);
    if (!nextBook.pages.length) throw new Error("没有可用页面");
    book = nextBook;
    currentIndex = 0;
    render();
  } catch (error) {
    window.alert(`导入失败：${error.message}`);
  } finally {
    event.target.value = "";
  }
});

loadEdits();
const savedRate = Number(localStorage.getItem("bilingual-reader-rate"));
if (Number.isFinite(savedRate)) {
  els.rateInput.value = String(Math.min(Math.max(savedRate, Number(els.rateInput.min)), Number(els.rateInput.max)));
}
const savedVoiceProvider = localStorage.getItem("bilingual-reader-voice-provider")
  || localStorage.getItem("bilingual-reader-sentence-voice");
const hasSavedVoiceProvider = Array.from(els.sentenceVoiceInput?.options || [])
  .some((option) => option.value === savedVoiceProvider);
if (savedVoiceProvider && hasSavedVoiceProvider) {
  els.sentenceVoiceInput.value = savedVoiceProvider;
}
updateRateDisplay();
render();
