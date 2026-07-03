import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const ICIBA_SIGNATURE_SECRET = "7ece94d9f9c202b0d2ec557dg4r9bc";
const YOUDAO_VOICE_KEY_ID = "voiceDictWeb";
const YOUDAO_VOICE_PRODUCT = "webdict";
const YOUDAO_VOICE_SECRET = "U3uACNRWSDWdcsKm";
const execFileAsync = promisify(execFile);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8"
};

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

function signedIcibaUrl(path) {
  const params = {
    client: 6,
    key: 1000006,
    timestamp: Date.now()
  };
  const values = Object.keys(params).sort().map((key) => params[key]).join("");
  params.signature = createHash("md5").update(`${path}${values}${ICIBA_SIGNATURE_SECRET}`).digest("hex");
  const url = new URL(path, "https://dictionary.iciba.com");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function handleIcibaTranslate(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = await readRequestJson(req);
    const textList = Array.isArray(body.textList) ? body.textList.map((text) => String(text || "").trim()) : [];
    if (!textList.some(Boolean)) return json(res, 400, { error: "textList is required" });

    const upstream = await fetch(signedIcibaUrl("/dictionary/fy/batch"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: body.from || "en",
        to: body.to || "zh",
        textList
      })
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(text);
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseYoudaoMeaning(html) {
  const items = [];
  const entryPattern = /<li class="word-exp"[^>]*>\s*<span class="pos"[^>]*>([\s\S]*?)<\/span>\s*<span class="trans"[^>]*>([\s\S]*?)<\/span>/g;
  let match;
  while ((match = entryPattern.exec(html))) {
    const pos = decodeHtml(match[1]);
    const trans = decodeHtml(match[2]);
    if (trans) items.push(pos ? `${pos} ${trans}` : trans);
    if (items.length >= 2) break;
  }

  return items.join("\n");
}

async function handleYoudaoTranslate(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const word = String(requestUrl.searchParams.get("word") || "").trim();
  if (!word) return json(res, 400, { error: "word is required" });

  try {
    const upstreamUrl = new URL("https://www.youdao.com/result");
    upstreamUrl.searchParams.set("word", word);
    upstreamUrl.searchParams.set("lang", "en");

    const upstream = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.youdao.com/"
      }
    });
    const html = await upstream.text();
    if (!upstream.ok) return json(res, upstream.status, { error: `Youdao failed: ${upstream.status}` });

    const meaning = parseYoudaoMeaning(html);
    if (!meaning) return json(res, 404, { error: "No Youdao translation found" });
    json(res, 200, { code: 1, data: { word, meaning, url: upstreamUrl.toString() } });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}

async function pipeAudio(res, upstream) {
  const contentType = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !contentType.includes("audio")) {
    const errorText = await upstream.text();
    return json(res, 502, {
      error: `TTS failed: ${upstream.status}`,
      detail: errorText.slice(0, 200)
    });
  }

  const audio = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(200, {
    "Content-Type": contentType || "audio/mpeg",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(audio);
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
  params.sign = createHash("md5").update(signText).digest("hex");
  params.pointParam = signedKeys.join(",");

  const url = new URL("https://dict.youdao.com/pronounce/base");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function handleTts(req, res, provider) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const text = String(requestUrl.searchParams.get("text") || "").trim();
  const spd = String(requestUrl.searchParams.get("spd") || "3");
  if (!text) return json(res, 400, { error: "text is required" });

  try {
    if (provider === "youdao") {
      const upstreamUrl = signedYoudaoPronounceUrl(text);
      return pipeAudio(res, await fetch(upstreamUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://dict.youdao.com/"
        }
      }));
    }

    if (provider === "baidu") {
      const upstreamUrl = new URL("https://fanyi.baidu.com/gettts");
      upstreamUrl.searchParams.set("lan", "en");
      upstreamUrl.searchParams.set("text", text);
      upstreamUrl.searchParams.set("spd", spd);
      upstreamUrl.searchParams.set("source", "web");
      return pipeAudio(res, await fetch(upstreamUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://fanyi.baidu.com/"
        }
      }));
    }

    if (provider === "sogou") {
      return json(res, 502, { error: "Sogou TTS endpoint is not available yet" });
    }

    if (provider === "mac") {
      return await handleMacTts(res, text, requestUrl.searchParams);
    }

    return json(res, 404, { error: "Unknown TTS provider" });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}

function macSayRate(rateValue) {
  const rate = Number(rateValue || 0.9);
  if (!Number.isFinite(rate)) return 170;
  return Math.round(Math.min(Math.max(rate, 0.6), 1.2) * 190);
}

async function handleMacTts(res, text, params) {
  const tempDir = await mkdtemp(join(tmpdir(), "ppt-reader-tts-"));
  const outputPath = join(tempDir, "speech.m4a");
  const voice = String(params.get("voice") || process.env.MAC_TTS_VOICE || "Samantha").trim();
  const rate = String(macSayRate(params.get("rate")));

  try {
    await execFileAsync("/usr/bin/say", [
      "--file-format=m4af",
      "-v",
      voice,
      "-r",
      rate,
      "-o",
      outputPath,
      text
    ], { timeout: 30000, maxBuffer: 1024 * 1024 });

    const audio = await readFile(outputPath);
    res.writeHead(200, {
      "Content-Type": "audio/mp4",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(audio);
  } finally {
    rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) return json(res, 403, { error: "Forbidden" });

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  } catch {
    try {
      const notFound = await readFile(join(root, "index.html"));
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(notFound);
    } catch {
      json(res, 404, { error: "Not found" });
    }
  }
}

createServer((req, res) => {
  if (req.url?.startsWith("/iciba/translate")) {
    handleIcibaTranslate(req, res);
  } else if (req.url?.startsWith("/youdao/translate")) {
    handleYoudaoTranslate(req, res);
  } else if (req.url?.startsWith("/tts/youdao")) {
    handleTts(req, res, "youdao");
  } else if (req.url?.startsWith("/tts/baidu")) {
    handleTts(req, res, "baidu");
  } else if (req.url?.startsWith("/tts/sogou")) {
    handleTts(req, res, "sogou");
  } else if (req.url?.startsWith("/tts/mac")) {
    handleTts(req, res, "mac");
  } else {
    serveStatic(req, res);
  }
}).listen(port, host, () => {
  console.log(`Reader running at http://${host}:${port}`);
});
