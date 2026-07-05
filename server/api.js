/**
 * Vite Dev Server API 中间件
 * 处理文件上传、解析结果保存、文件列表查询
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const imageExts = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp', '.gif']);
const ICIBA_SIGNATURE_SECRET = '7ece94d9f9c202b0d2ec557dg4r9bc';
const YOUDAO_VOICE_KEY_ID = 'voiceDictWeb';
const YOUDAO_VOICE_PRODUCT = 'webdict';
const YOUDAO_VOICE_SECRET = 'U3uACNRWSDWdcsKm';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(data));
}

function sendAudio(res, buffer, contentType) {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType || 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(buffer);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeApiPath(pathname) {
  return pathname.startsWith('/api/') ? pathname.slice(4) : pathname;
}

function safeFilename(filename) {
  const parsed = path.parse(String(filename || 'file'));
  const base = parsed.name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'file';
  const ext = parsed.ext.replace(/[\\/:*?"<>|]/g, '').toLowerCase();
  return `${base}${ext}`;
}

function uniqueFilePath(dir, filename) {
  const parsed = path.parse(filename);
  let candidate = path.join(dir, filename);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${parsed.name}-${counter}${parsed.ext}`);
    counter += 1;
  }
  return candidate;
}

function signedIcibaUrl(pathname) {
  const params = {
    client: 6,
    key: 1000006,
    timestamp: Date.now()
  };
  const values = Object.keys(params).sort().map(key => params[key]).join('');
  params.signature = createHash('md5').update(`${pathname}${values}${ICIBA_SIGNATURE_SECRET}`).digest('hex');
  const url = new URL(pathname, 'https://dictionary.iciba.com');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

function signedYoudaoPronounceUrl(text) {
  const params = {
    product: YOUDAO_VOICE_PRODUCT,
    appVersion: 1,
    client: 'web',
    mid: 1,
    vendor: 'web',
    screen: 1,
    model: 1,
    imei: 1,
    network: 'wifi',
    keyfrom: YOUDAO_VOICE_PRODUCT,
    keyid: YOUDAO_VOICE_KEY_ID,
    mysticTime: Date.now(),
    yduuid: 'abcdefg',
    le: 'en',
    rate: 4,
    word: text,
    type: 2
  };
  const signKeys = Object.keys(params)
    .sort()
    .filter(key => params[key] !== undefined && params[key] !== '');
  const signedKeys = [...signKeys, 'key'];
  const signText = signedKeys
    .map(key => `${key}=${key === 'key' ? YOUDAO_VOICE_SECRET : params[key]}`)
    .join('&');
  params.sign = createHash('md5').update(signText).digest('hex');
  params.pointParam = signedKeys.join(',');

  const url = new URL('https://dict.youdao.com/pronounce/base');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function pipeAudio(res, upstream) {
  const contentType = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !contentType.includes('audio')) {
    const errorText = await upstream.text();
    sendJSON(res, {
      error: `TTS failed: ${upstream.status}`,
      detail: errorText.slice(0, 200)
    }, 502);
    return;
  }

  sendAudio(res, Buffer.from(await upstream.arrayBuffer()), contentType);
}

async function handleTts(req, res, provider, url) {
  if (req.method !== 'GET') {
    sendJSON(res, { error: 'Method not allowed' }, 405);
    return;
  }

  const text = String(url.searchParams.get('text') || '').trim();
  const spd = String(url.searchParams.get('spd') || '3');
  if (!text) {
    sendJSON(res, { error: 'text is required' }, 400);
    return;
  }

  try {
    if (provider === 'youdao') {
      const upstreamUrl = signedYoudaoPronounceUrl(text);
      await pipeAudio(res, await fetch(upstreamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Referer: 'https://dict.youdao.com/'
        }
      }));
      return;
    }

    if (provider === 'baidu') {
      const upstreamUrl = new URL('https://fanyi.baidu.com/gettts');
      upstreamUrl.searchParams.set('lan', 'en');
      upstreamUrl.searchParams.set('text', text);
      upstreamUrl.searchParams.set('spd', spd);
      upstreamUrl.searchParams.set('source', 'web');
      await pipeAudio(res, await fetch(upstreamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Referer: 'https://fanyi.baidu.com/'
        }
      }));
      return;
    }

    sendJSON(res, { error: 'Unknown TTS provider' }, 404);
  } catch (error) {
    sendJSON(res, { error: error.message }, 500);
  }
}

async function handleIcibaTranslate(req, res) {
  if (req.method !== 'POST') {
    sendJSON(res, { error: 'Method not allowed' }, 405);
    return;
  }

  try {
    const body = await parseBody(req);
    const textList = Array.isArray(body.textList)
      ? body.textList.map(text => String(text || '').trim())
      : [];
    if (!textList.some(Boolean)) {
      sendJSON(res, { error: 'textList is required' }, 400);
      return;
    }

    const upstream = await fetch(signedIcibaUrl('/dictionary/fy/batch'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: body.from || 'en',
        to: body.to || 'zh',
        textList
      })
    });
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(text);
  } catch (error) {
    sendJSON(res, { error: error.message }, 500);
  }
}

/**
 * API 路由处理
 */
export async function apiMiddleware(req, res, next) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = normalizeApiPath(url.pathname);

  // ============ GET /tts/:provider ============
  if (pathname === '/tts/youdao' && req.method === 'GET') {
    await handleTts(req, res, 'youdao', url);
    return;
  }

  if (pathname === '/tts/baidu' && req.method === 'GET') {
    await handleTts(req, res, 'baidu', url);
    return;
  }

  // ============ POST /iciba/translate ============
  if (pathname === '/iciba/translate') {
    await handleIcibaTranslate(req, res);
    return;
  }

  // ============ POST /api/upload ============
  if (pathname === '/upload' && req.method === 'POST') {
    const data = await parseBody(req);
    const { index, type, filename, fileData } = data;
    if (!index || !type || !filename || !fileData) {
      sendJSON(res, { error: 'Missing parameters' }, 400);
      return;
    }

    const typeDir = type === 'image' ? 'images' : type;
    const dir = path.join(ROOT, 'static', `demo${index}`, typeDir);
    ensureDir(dir);

    const buffer = Buffer.from(fileData, 'base64');
    const finalName = safeFilename(filename);
    const filePath = uniqueFilePath(dir, finalName);
    fs.writeFileSync(filePath, buffer);
    const savedName = path.basename(filePath);

    sendJSON(res, {
      success: true,
      path: `/static/demo${index}/${typeDir}/${encodeURIComponent(savedName)}`,
      filename: savedName
    });
    return;
  }

  // ============ POST /api/parse/save ============
  if (pathname === '/parse/save' && req.method === 'POST') {
    const data = await parseBody(req);
    const { index, result } = data;
    if (!index || !result) {
      sendJSON(res, { error: 'Missing parameters' }, 400);
      return;
    }

    const dir = path.join(ROOT, 'parse', 'ocr', `demo${index}`);
    ensureDir(dir);

    const filePath = path.join(dir, 'content.json');
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));

    sendJSON(res, { success: true, path: filePath });
    return;
  }

  // ============ GET /api/files/:index ============
  if (pathname.startsWith('/files/') && req.method === 'GET') {
    const index = pathname.replace('/files/', '');
    const type = url.searchParams.get('type') || 'image';
    const typeDir = type === 'image' ? 'images' : type;
    const dir = path.join(ROOT, 'static', `demo${index}`, typeDir);
    
    if (!fs.existsSync(dir)) {
      sendJSON(res, { files: [] });
      return;
    }

    const files = fs.readdirSync(dir)
      .filter(name => type !== 'image' || imageExts.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }))
      .map(name => ({
        name,
        path: `/static/demo${index}/${typeDir}/${encodeURIComponent(name)}`
      }));

    sendJSON(res, { files });
    return;
  }

  // ============ GET /api/parse-result/:index ============
  if (pathname.startsWith('/parse-result/') && req.method === 'GET') {
    const index = pathname.replace('/parse-result/', '');
    const filePath = path.join(ROOT, 'parse', 'ocr', `demo${index}`, 'content.json');
    
    if (!fs.existsSync(filePath)) {
      sendJSON(res, { error: 'Not found' }, 404);
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    sendJSON(res, content);
    return;
  }

  // ============ GET /api/project/:index/content ============
  if (pathname.match(/^\/project\/\d+\/content$/) && req.method === 'GET') {
    const index = pathname.match(/\/project\/(\d+)\/content/)[1];
    const filePath = path.join(ROOT, 'parse', 'ocr', `demo${index}`, 'content.json');
    
    if (!fs.existsSync(filePath)) {
      sendJSON(res, { error: 'Not found' }, 404);
      return;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    sendJSON(res, content);
    return;
  }

  next();
}
