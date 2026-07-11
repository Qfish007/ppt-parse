/**
 * PDF 解析工具
 * 基于 pdfjs-dist 将 PDF 页面渲染为图片，再进行 OCR 识别
 */
import * as pdfjsLib from 'pdfjs-dist';
import { recognizeText, recognizeBatch } from './ocr.js';

// 设置 PDF.js worker
// 使用 CDN 版本的 worker（避免打包问题）
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * 将 PDF 文件解析为页面图片和文字
 * @param {File|ArrayBuffer} pdfSource - PDF 文件或 ArrayBuffer
 * @param {Object} options
 * @param {number} options.scale - 渲染缩放比例（默认 2.0，越高越清晰）
 * @param {Function} options.onProgress - 进度回调 (current, total, pageResult)
 * @returns {Promise<Array<{page: number, image: string, text: string, confidence: number}>>}
 */
export async function parsePDF(pdfSource, options = {}) {
  const { scale = 2.0, onProgress } = options;

  let arrayBuffer;
  if (pdfSource instanceof File) {
    arrayBuffer = await pdfSource.arrayBuffer();
  } else if (pdfSource instanceof ArrayBuffer) {
    arrayBuffer = pdfSource;
  } else {
    throw new Error('PDF 源必须是 File 或 ArrayBuffer 类型');
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const results = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // 创建 canvas 渲染页面
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    // 将 canvas 转为图片数据
    const imageDataUrl = canvas.toDataURL('image/png');

    // OCR 识别
    let text = '';
    let confidence = 0;
    try {
      const ocrResult = await recognizeText(imageDataUrl);
      text = ocrResult.text;
      confidence = ocrResult.confidence;
    } catch (err) {
      console.error(`第 ${i} 页 OCR 识别失败:`, err);
    }

    const result = {
      page: i,
      image: imageDataUrl,
      text,
      confidence
    };
    results.push(result);

    if (onProgress) {
      onProgress(i, numPages, result);
    }

    page.cleanup();
  }

  return results;
}

/**
 * 将 PDF 解析结果转换为书籍格式
 * @param {Array} pdfResults - parsePDF 的结果
 * @param {string} title
 * @returns {{title: string, pages: Array}}
 */
export function pdfResultsToBook(pdfResults, title = 'PDF 书籍') {
  const pages = pdfResults.map(result => {
    const lines = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => ({
        en: detectLanguage(line) === 'en' ? line : '',
        zh: detectLanguage(line) === 'zh' ? line : ''
      }));

    return {
      page: result.page,
      image: result.image || '',
      lines: lines.length > 0 ? lines : [{ en: result.text.trim() || '', zh: '' }]
    };
  });

  return { title, pages };
}

/**
 * 获取 PDF 页数（不渲染）
 * @param {File|ArrayBuffer} pdfSource
 * @returns {Promise<number>}
 */
export async function getPDFPageCount(pdfSource) {
  let arrayBuffer;
  if (pdfSource instanceof File) {
    arrayBuffer = await pdfSource.arrayBuffer();
  } else {
    arrayBuffer = pdfSource;
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

function detectLanguage(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  return chineseChars > englishChars ? 'zh' : 'en';
}
