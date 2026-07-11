/**
 * OCR 工具函数
 * 基于 tesseract.js 实现图片文字识别
 */
import Tesseract from 'tesseract.js';

let ocrWorker = null;

/**
 * 获取或创建 OCR worker（复用以提高性能）
 */
async function getWorker() {
  if (!ocrWorker) {
    ocrWorker = await Tesseract.createWorker('eng+chi_sim');
  }
  return ocrWorker;
}

/**
 * 识别图片中的文字
 * @param {string|File|Blob} image - 图片源（URL、File对象或Blob）
 * @returns {Promise<{text: string, confidence: number}>}
 */
export async function recognizeText(image) {
  const worker = await getWorker();
  const result = await worker.recognize(image);
  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
    paragraphs: Array.isArray(result.data.paragraphs)
      ? result.data.paragraphs
        .map(paragraph => String(paragraph.text || '').trim())
        .filter(Boolean)
      : []
  };
}

/**
 * 批量识别图片
 * @param {Array<string|File|Blob>} images - 图片数组
 * @param {Function} onProgress - 进度回调 (current, total, result)
 * @returns {Promise<Array<{text: string, confidence: number}>>}
 */
export async function recognizeBatch(images, onProgress = null) {
  const results = [];
  const worker = await getWorker();

  for (let i = 0; i < images.length; i++) {
    try {
      const result = await worker.recognize(images[i]);
      const item = {
        text: result.data.text.trim(),
        confidence: result.data.confidence
      };
      results.push(item);
      if (onProgress) {
        onProgress(i + 1, images.length, item);
      }
    } catch (error) {
      console.error(`OCR 识别失败（第 ${i + 1} 张）:`, error);
      results.push({ text: '', confidence: 0, error: error.message });
      if (onProgress) {
        onProgress(i + 1, images.length, { text: '', confidence: 0, error: error.message });
      }
    }
  }

  return results;
}

/**
 * 将 OCR 结果转换为书籍页面格式
 * @param {Array<{text: string, image?: string}>} ocrResults
 * @param {string} title
 * @returns {{title: string, pages: Array}}
 */
export function convertToBookFormat(ocrResults, title = '未命名') {
  const pages = ocrResults.map((result, index) => {
    const lines = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => ({
        en: detectLanguage(line) === 'en' ? line : '',
        zh: detectLanguage(line) === 'zh' ? line : line
      }));

    return {
      page: index + 1,
      image: result.image || '',
      lines: lines.length > 0 ? lines : [{ en: result.text.trim(), zh: '' }]
    };
  });

  return { title, pages };
}

/**
 * 检测文本主要语言（简单判断）
 */
function detectLanguage(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  return chineseChars > englishChars ? 'zh' : 'en';
}

/**
 * 终止 OCR worker 并释放资源
 */
export async function terminateWorker() {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}
