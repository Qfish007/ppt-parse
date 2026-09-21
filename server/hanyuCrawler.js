/**
 * 百度汉语词条爬虫（puppeteer-core + 系统 Chrome）
 *
 * 为什么需要 puppeteer：
 *   百度汉语详情页 https://hanyu.baidu.com/hanyu-page/term/detail?wd=xxx
 *   是 Vue CSR，HTML 里没有数据；后端 fetch 拿到的是空模板 <div id=app></div>。
 *   真实 API https://hanyuapp.baidu.com/dictapp/swan/termdetail 被 ymg 验证码拦截，
 *   直接 fetch 返回 {"tri_reason":"ymg","tri_cap":true}。
 *   唯一可靠方案：用真实浏览器渲染页面后从 DOM 提取字段。
 *
 * 字段选择器基于守株待兔页面 DOM 实测：
 *   词: .pinyin-box .name
 *   拼音: .pinyin-box .pinyin-text  (带方括号如 [shǒu zhū dài tù])
 *   各区块容器: .idiom-wrap.liju-wrap，内部 .idiom-title 是标题，.idiom-box 是内容
 *   近义词/反义词: .idiom-box.synonyms-box 内的 .word-box（按顺序）
 *   引证: .cite-box
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 持久化浏览器用户目录：保留 BAIDUID 等 Cookie，让后端看起来像"回访的真实用户"，
// 显著降低触发百度安全验证（反爬）的概率
const HANYU_PROFILE_DIR = path.join(os.tmpdir(), 'hanyu-chrome-profile');
const STEALTH_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// macOS / Linux / Windows 系统 Chrome 候选路径
const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);

function findChromeExecutable() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

let browserPromise = null;

async function launchBrowser(useProfile) {
  const executablePath = findChromeExecutable();
  if (!executablePath) {
    throw new Error('未找到系统 Chrome/Chromium，请设置 PUPPETEER_EXECUTABLE_PATH 环境变量');
  }
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-translate',
    '--mute-audio',
    '--lang=zh-CN',
    '--disable-blink-features=AutomationControlled'
  ];
  const options = {
    executablePath,
    headless: 'new',
    args: useProfile ? [...baseArgs, `--user-data-dir=${HANYU_PROFILE_DIR}`] : baseArgs
  };
  return await puppeteer.launch(options);
}

async function getBrowser() {
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    let browser;
    try {
      // 优先用持久化用户目录（保留反爬 Cookie）；目录损坏时退回临时配置
      browser = await launchBrowser(true);
    } catch (err) {
      console.warn('[hanyuCrawler] 持久化用户目录启动失败，改用临时配置：', err.message);
      browser = await launchBrowser(false);
    }
    // 浏览器断开时清空单例，下次调用会重启
    browser.on('disconnected', () => { browserPromise = null; });
    return browser;
  })();
  return browserPromise;
}

/**
 * 彻底重启浏览器（用于安全验证持续拦截时换一个干净会话）
 */
async function restartBrowser() {
  try {
    const browser = await getBrowser();
    try {
      await Promise.race([
        browser.close(),
        sleep(3000)
      ]);
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
  browserPromise = null;
  await getBrowser();
}

// 在页面内执行的提取脚本
// 兼容两种页面结构：
//   1. 成语词条（守株待兔）：用 .idiom-wrap / .idiom-title / .idiom-box 容器
//      含基本释义、例句、成语故事、近反义词、同义异形、出处、引证
//   2. 普通词词条（项目、苹果）：用 .definition-box / .word-box / .liju-box 容器
//      含基本释义、组词、用作、例句，一般没有成语故事/出处/引证/近反义词
// 返回结构化 JSON：{ word, pinyin, audio, meaning, cihui, liju, idiomStory, synonyms, antonyms, sameMeaningDiffForm, chuchu, yinzhen }
const EXTRACTION_SCRIPT = () => {
  const getText = (el) => (el?.textContent || '').trim().replace(/\s+/g, ' ');

  // 词 + 拼音
  const word = getText(document.querySelector('.pinyin-box .name'));
  const pinyinRaw = getText(document.querySelector('.pinyin-box .pinyin-text'));
  // 去掉方括号 [shǒu zhū dài tù] -> shǒu zhū dài tù
  const pinyin = pinyinRaw.replace(/^\[|\]$/g, '').trim();

  const result = {
    word,
    pinyin,
    audio: '',
    meaning: '',
    cihui: '',
    liju: '',
    idiomStory: '',
    synonyms: '',
    antonyms: '',
    sameMeaningDiffForm: '',
    chuchu: '',
    yinzhen: ''
  };

  if (!word) return result;

  // ===== 第一阶段：成语页面结构 .idiom-wrap =====
  const idiomWraps = Array.from(document.querySelectorAll('.idiom-wrap'));
  for (const wrap of idiomWraps) {
    const title = getText(wrap.querySelector('.idiom-title, .bar, h2, h3, .title'))?.replace(/\s+/g, '');
    const contentBox = wrap.querySelector('.idiom-box');
    const content = contentBox ? getText(contentBox) : '';
    if (!title) continue;

    if (title.includes('基本释义') || title === '释义') {
      result.meaning = content || result.meaning;
    } else if (title.includes('例') && title.includes('句')) {
      result.liju = content || result.liju;
    } else if (title.includes('成语故事')) {
      result.idiomStory = content || result.idiomStory;
    } else if (title.includes('近反义词')) {
      const wordBoxes = wrap.querySelectorAll('.word-box');
      if (wordBoxes.length >= 2) {
        result.synonyms = getText(wordBoxes[0]).replace(/^近义词/, '').trim();
        result.antonyms = getText(wordBoxes[1]).replace(/^反义词/, '').trim();
      } else if (wordBoxes.length === 1) {
        const txt = getText(wordBoxes[0]);
        const m = txt.match(/近义词\s*([\s\S]*?)\s*反义词\s*([\s\S]*)/);
        if (m) {
          result.synonyms = m[1].trim();
          result.antonyms = m[2].trim();
        } else {
          result.synonyms = txt.replace(/^近义词/, '').trim();
        }
      }
    } else if (title.includes('同义异形')) {
      const wordBoxes = wrap.querySelectorAll('.word-box');
      const cihuiText = Array.from(wordBoxes).map(b => getText(b).replace(/^词组/, '').trim()).filter(Boolean).join('；');
      result.sameMeaningDiffForm = cihuiText || content.replace(/^同义异形/, '').trim();
      if (!result.cihui) result.cihui = cihuiText;
    } else if (title === '出 处' || title.includes('出处')) {
      result.chuchu = content || result.chuchu;
    } else if (title === '引 证' || title.includes('引证')) {
      result.yinzhen = content || result.yinzhen;
    } else if (title.includes('组词')) {
      result.cihui = content.replace(/^组词/, '').trim() || result.cihui;
    }
  }

  // ===== 第二阶段：普通词页面结构 .definition-box / .word-box / .liju-box 兜底 =====
  // 释义：所有 .definition-box 下的 .word 拼接
  if (!result.meaning) {
    const defBoxes = Array.from(document.querySelectorAll('.definition-box'));
    const meanings = defBoxes.map(b => getText(b.querySelector('.word'))).filter(Boolean);
    if (meanings.length) result.meaning = meanings.join('；');
  }

  // 组词：所有 .word-box 中 title 是"组词"的，拼接 .word-item
  if (!result.cihui) {
    const wordBoxes = Array.from(document.querySelectorAll('.word-box'));
    for (const box of wordBoxes) {
      const t = getText(box.querySelector('.title'));
      if (t.includes('组词')) {
        const items = Array.from(box.querySelectorAll('.word-item')).map(i => getText(i)).filter(Boolean);
        if (items.length) result.cihui = items.join('、');
        break;
      }
    }
  }

  // 例句：所有 .liju-box 中 .liju-title 文本是"例句"的，拼接 .liju-content .liju
  if (!result.liju) {
    const lijuBoxes = Array.from(document.querySelectorAll('.liju-box'));
    for (const box of lijuBoxes) {
      const t = getText(box.querySelector('.liju-title'));
      if (t.includes('例句') || t === '例 句') {
        const items = Array.from(box.querySelectorAll('.liju-content .liju')).map(i => getText(i)).filter(Boolean);
        if (items.length) result.liju = items.join('\n');
        break;
      }
    }
  }

  // 引证兜底：.cite-box
  if (!result.yinzhen) {
    const citeBox = document.querySelector('.cite-box');
    if (citeBox) result.yinzhen = getText(citeBox);
  }

  // 基本释义兜底：第一个 .idiom-box（无标题时）
  if (!result.meaning) {
    const firstBox = document.querySelector('.idiom-box');
    if (firstBox) result.meaning = getText(firstBox);
  }

  return result;
};

// 单字（字典页）提取脚本
// 单字在 term/detail 页没有词典内容（只有百科释义），需要走 /hanyu-page/zici/s?wd=字&ptype=zici 字典页：
//   https://hanyu.baidu.com/hanyu-page/zici/s?wd=陈&ptype=zici
// 页面结构实测：
//   标题: "陈是什么意思|陈怎么读_笔顺_拼音_笔画_部首|百度教育"
//   拼音: .pinyin-item .pinyin-text（多读音，如 chén / zhèn）
//   释义: 每个 .definition-wrap 一条（.definition-index 编号 + .shiyi 内 .cixing 词性 + .definition 释义）
//   例词/近义/反义: .definition-item 内 .item-label + .edu-tag-item 标签
const ZICI_EXTRACTION_SCRIPT = () => {
  const getText = (el) => (el?.textContent || '').trim().replace(/\s+/g, ' ');
  const result = {
    word: '', pinyin: '', audio: '', meaning: '', cihui: '', liju: '',
    idiomStory: '', synonyms: '', antonyms: '', sameMeaningDiffForm: '', chuchu: '', yinzhen: ''
  };

  // 词：从标题提取，如 "陈是什么意思|..." -> "陈"
  const m = (document.title || '').match(/^(.+?)(?:是什么意思|怎么读)/);
  result.word = m ? m[1].trim() : '';

  // 拼音：只取顶部 .word-pinyin-list 内的读音（右侧区域 là/zhōu/zǎo 是组词其他字的拼音）
  const pys = Array.from(document.querySelectorAll('.word-pinyin-list .pinyin-text')).map(getText).filter(Boolean);
  result.pinyin = pys.join(' ');

  const meanings = [];
  const cihuiParts = [];
  const synParts = [];
  const antParts = [];
  document.querySelectorAll('.definition-wrap').forEach(wrap => {
    const idx = getText(wrap.querySelector('.definition-index'));
    const shiyi = wrap.querySelector('.shiyi');
    const cixing = getText(shiyi?.querySelector('.cixing'));
    const def = getText(shiyi?.querySelector('.definition'));
    if (def) meanings.push([idx, cixing, def].filter(Boolean).join(' '));
    wrap.querySelectorAll('.definition-item').forEach(item => {
      const label = getText(item.querySelector('.item-label'));
      const tags = Array.from(item.querySelectorAll('.edu-tag-item')).map(getText).filter(Boolean);
      if (!tags.length) return;
      if (label.includes('例词')) cihuiParts.push(...tags);
      else if (label.includes('近义')) synParts.push(...tags);
      else if (label.includes('反义')) antParts.push(...tags);
    });
  });
  result.meaning = meanings.join('\n');
  result.cihui = [...new Set(cihuiParts)].join('、');
  result.synonyms = [...new Set(synParts)].join(' ');
  result.antonyms = [...new Set(antParts)].join(' ');
  return result;
};

/**
 * 在页面内识别当前状态：真实内容 / 百度安全验证 / 词条不存在 / 仍在加载
 */
const DETECT_STATE_SCRIPT = () => {
  const title = document.title || '';
  const href = location.href || '';
  const bodyText = (document.body?.textContent || '').replace(/\s+/g, ' ').trim();
  const hasName = !!document.querySelector('.pinyin-box .name, .name.name-space, .idiom-title, .pinyin-item .pinyin-text');
  const isChallenge =
    /安全验证/.test(title) ||
    /wappass|static\/captcha|\/v\//i.test(href) ||
    /百度安全验证|请完成下方验证|网络不给力，请稍后重试/.test(bodyText.slice(0, 200));
  const isNotFound =
    !isChallenge &&
    /没有找到|未收录|抱歉|找不到|不存在相关|暂无该词条/.test(bodyText.slice(0, 200));
  return { title, href: href.slice(0, 120), hasName, isChallenge, isNotFound, bodyLen: bodyText.length };
};

/**
 * 单次抓取（含安全验证等待）
 * @returns {Promise<{status:'ok',data}|{status:'notfound'}|{status:'challenge'}|{status:'empty'}>}
 */
async function crawlOnce(word, targetUrl, extractScript) {
  const browser = await getBrowser();
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent(STEALTH_UA);
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    // 隐藏 navigator.webdriver 等自动化特征
    await page.evaluateOnNewDocument(() => {
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      } catch { /* ignore */ }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 轮询等待：真实内容出现 / 确认为 404 / 安全验证自动放行，最长约 16 秒
    const deadline = Date.now() + 16000;
    let state = { hasName: false, isChallenge: false, isNotFound: false, bodyLen: 0 };
    let reloaded = false;
    while (Date.now() < deadline) {
      state = await page.evaluate(DETECT_STATE_SCRIPT);
      if (state.hasName) break;
      if (state.isChallenge) {
        // 百度 JS 挑战通常会自动算 token 再跳回；等待 5 秒后补一次 reload 帮助 Cookie 回种
        if (!reloaded && Date.now() > deadline - 11000) {
          reloaded = true;
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => { });
        }
      } else if (state.isNotFound && state.bodyLen > 120) {
        // 应用已渲染且明确提示不存在
        return { status: 'notfound' };
      }
      await sleep(1000);
    }

    // 再给 Vue 1 秒把字段渲染齐
    await sleep(1000);

    const data = await page.evaluate(extractScript || EXTRACTION_SCRIPT);
    if (data.word) {

      // DEBUG: 如果词拿到了但释义为空，dump HTML 便于诊断页面结构
      if (!data.meaning && process.env.HANYU_DEBUG === '1') {
        const html = await page.content();
        const safe = word.replace(/[^\w\u4e00-\u9fa5]/g, '_');
        try {
          fs.writeFileSync(`/tmp/hanyu-debug-${safe}.html`, html);
          console.log(`[hanyuCrawler] dumped HTML for "${word}" to /tmp/hanyu-debug-${safe}.html`);
        } catch {
          // ignore
        }
      }

      return { status: 'ok', data };
    }

    // 没拿到词：被拦截 / 真不存在 二选一
    if (state.isChallenge) {
      console.log(`[hanyuCrawler] word="${word}" blocked by baidu verify (${state.title})`);
      return { status: 'challenge' };
    }
    if (state.isNotFound) {
      console.log(`[hanyuCrawler] word="${word}" not found (${state.title})`);
      return { status: 'notfound' };
    }
    console.log(`[hanyuCrawler] word="${word}" empty result:`, JSON.stringify(state));
    return { status: 'empty' };
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
}

/**
 * 抓取百度汉语词条数据（带安全验证退避重试）
 * @param {string} wd 中文词
 * @returns {Promise<object|null>} 词条数据；词条确实不存在返回 null
 * @throws {Error} 连续被百度安全验证拦截时抛 code=BLOCKED_BY_VERIFY 错误
 */
export async function fetchHanyuDetail(wd) {
  const word = String(wd || '').trim();
  if (!word) return null;

  // 单字没有 term/detail 词典内容，走字典页 /hanyu-page/zici/s?wd=字&ptype=zici
  const isSingle = Array.from(word).length === 1;
  const targetUrl = isSingle
    ? `https://hanyu.baidu.com/hanyu-page/zici/s?wd=${encodeURIComponent(word)}&ptype=zici`
    : `https://hanyu.baidu.com/hanyu-page/term/detail?wd=${encodeURIComponent(word)}&device=pc&from=home`;
  const extractScript = isSingle ? ZICI_EXTRACTION_SCRIPT : EXTRACTION_SCRIPT;
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await crawlOnce(word, targetUrl, extractScript);

    if (result.status === 'ok') return result.data;
    if (result.status === 'notfound') return null;

    // challenge / empty：退避后重试；倒数第二次先重启浏览器换新会话
    if (attempt < MAX_ATTEMPTS) {
      if (attempt === MAX_ATTEMPTS - 1) {
        await restartBrowser();
      }
      await sleep(1500 * attempt);
    } else {
      const err = new Error('BLOCKED_BY_VERIFY');
      err.code = 'BLOCKED_BY_VERIFY';
      throw err;
    }
  }
  return null;
}

/**
 * 释放浏览器实例（用于开发期热重载或显式清理）
 */
export async function closeHanyuBrowser() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
}
