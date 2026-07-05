/**
 * Word 文档解析工具
 * 基于 mammoth.js 将 .docx 转为文本
 */
import mammoth from 'mammoth';

/**
 * 解析 Word 文档
 * @param {File|ArrayBuffer} wordSource - Word 文件或 ArrayBuffer
 * @returns {Promise<{text: string, html: string}>}
 */
export async function parseWord(wordSource) {
  let arrayBuffer;
  if (wordSource instanceof File) {
    arrayBuffer = await wordSource.arrayBuffer();
  } else if (wordSource instanceof ArrayBuffer) {
    arrayBuffer = wordSource;
  } else {
    throw new Error('Word 源必须是 File 或 ArrayBuffer 类型');
  }

  const result = await mammoth.convertToHtml({ arrayBuffer });
  const text = await mammoth.extractRawText({ arrayBuffer });

  return {
    text: text.value,
    html: result.value,
    messages: result.messages
  };
}

/**
 * 将 Word 文本转换为书籍页面格式
 * @param {string} text
 * @param {string} title
 * @returns {{title: string, pages: Array}}
 */
export function wordTextToBook(text, title = 'Word 文档') {
  const paragraphs = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // 将段落分组，每5-10段作为一页
  const pagesPerPage = 8;
  const pages = [];

  for (let i = 0; i < paragraphs.length; i += pagesPerPage) {
    const pageParagraphs = paragraphs.slice(i, i + pagesPerPage);
    const lines = pageParagraphs.map(p => ({
      en: detectLanguage(p) === 'en' ? p : '',
      zh: detectLanguage(p) === 'zh' ? p : p
    }));

    pages.push({
      page: Math.floor(i / pagesPerPage) + 1,
      image: '',
      lines
    });
  }

  // 至少有一页
  if (pages.length === 0) {
    pages.push({
      page: 1,
      image: '',
      lines: [{ en: '', zh: text.trim() || '' }]
    });
  }

  return { title, pages };
}

function detectLanguage(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  return chineseChars > englishChars ? 'zh' : 'en';
}
