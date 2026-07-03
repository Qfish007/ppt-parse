import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const configPath = join(root, "config.js");
const imagesDir = join(root, "images");
const ocrDir = join(root, "ocr");
const outputPath = join(root, "content.generated.js");
const bookUrl = "https://www.fltrp.com/ebook/jcjycpzx/xbz-xxxjdb-1/";

mkdirSync(imagesDir, { recursive: true });
mkdirSync(ocrDir, { recursive: true });

function readConfig() {
  const source = readFileSync(configPath, "utf8");
  const match = source.match(/var\s+htmlConfig\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) throw new Error("Cannot find htmlConfig in config.js");
  return JSON.parse(match[1]);
}

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function imageUrl(fileName) {
  return `${bookUrl}files/large/${fileName}`;
}

function pageImageName(index, original) {
  return `page-${String(index + 1).padStart(3, "0")}-${basename(original)}`;
}

function download(url, dest) {
  if (existsSync(dest)) return;
  execFileSync("curl", ["-sS", "-L", "--connect-timeout", "20", "--max-time", "180", url, "-o", dest], {
    stdio: ["ignore", "pipe", "inherit"]
  });
}

function ocrImage(imagePath, tsvPath) {
  if (existsSync(tsvPath)) return readFileSync(tsvPath, "utf8");
  const text = run("tesseract", [imagePath, "stdout", "-l", "eng", "--psm", "6", "tsv"]);
  writeFileSync(tsvPath, text);
  return text;
}

function cleanWord(word) {
  return String(word || "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .trim();
}

function linesFromTsv(tsv) {
  const rows = tsv.trim().split(/\r?\n/);
  const header = rows.shift()?.split("\t") || [];
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const lines = new Map();

  for (const row of rows) {
    const cols = row.split("\t");
    if (cols[index.level] !== "5") continue;
    const conf = Number(cols[index.conf]);
    const text = cleanWord(cols[index.text]);
    if (!text || conf < 25) continue;
    if (!/[A-Za-z]/.test(text)) continue;

    const key = [
      cols[index.block_num],
      cols[index.par_num],
      cols[index.line_num]
    ].join(".");
    const left = Number(cols[index.left] || 0);
    const top = Number(cols[index.top] || 0);
    if (!lines.has(key)) lines.set(key, { top, words: [] });
    lines.get(key).words.push({ left, text });
  }

  return [...lines.values()]
    .sort((a, b) => a.top - b.top)
    .map((line) => line.words.sort((a, b) => a.left - b.left).map((word) => word.text).join(" "))
    .map((line) => line.replace(/\s+([,.;:!?])/g, "$1").replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1);
}

function escapeForScript(data) {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

const config = readConfig();
const pages = config.fliphtml5_pages || [];
if (!pages.length) throw new Error("No pages found in config.js");

const generated = {
  title: config.meta?.title || "《新标准小学衔接读本》",
  source: bookUrl,
  generatedAt: new Date().toISOString(),
  pages: []
};

for (const [index, page] of pages.entries()) {
  const original = page.n?.[0];
  if (!original) continue;
  const localName = pageImageName(index, original);
  const imagePath = join(imagesDir, localName);
  const tsvPath = join(ocrDir, `page-${String(index + 1).padStart(3, "0")}.tsv`);

  console.log(`Page ${index + 1}/${pages.length}: ${original}`);
  download(imageUrl(original), imagePath);
  const tsv = ocrImage(imagePath, tsvPath);
  const lines = linesFromTsv(tsv).map((en) => ({ en, zh: "" }));

  generated.pages.push({
    page: index + 1,
    image: `./images/${localName}`,
    lines
  });
}

writeFileSync(outputPath, `window.generatedBook = ${escapeForScript(generated)};\n`);
console.log(`Wrote ${outputPath}`);
