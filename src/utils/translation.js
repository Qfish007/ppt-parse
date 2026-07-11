/**
 * 翻译类型项目的纯函数工具
 * 包括：类型判断、翻译方向计算、页面数据构建、显示顺序调整
 */

/** 清理录入文本：把空行折叠，多空格归一；不删除有意义的内容 */
function cleanSourceText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 是否为「翻译」类型项目（英文翻译 / 中文翻译）
 * @param {string} type
 * @returns {boolean}
 */
export function isTranslationProject(type) {
  return type === 'translate-en' || type === 'translate-zh';
}

/**
 * 计算该类型的翻译方向（给 iciba API 用）
 * @param {'translate-en'|'translate-zh'} type
 * @returns {{from:'en'|'zh', to:'en'|'zh'}}
 */
export function translationDirection(type) {
  if (type === 'translate-zh') return { from: 'zh', to: 'en' };
  return { from: 'en', to: 'zh' };
}

/**
 * 构造「翻译」类型的单页数据
 * 每次录入 = 1 页 = 1 段（lines 只有 1 条）
 *
 * @param {'translate-en'|'translate-zh'} type  项目类型
 * @param {string} srcText                    用户录入的原文
 * @param {string} translated                 翻译后的文本（未翻译时可传空串）
 * @param {number} pageNo                     页码（从 1 开始）
 * @returns {{ page:number, image:string, lines:Array<{en:string,zh:string,breakAfter:boolean}> }}
 */
export function buildTranslationPage(type, srcText, translated, pageNo) {
  const cleaned = cleanSourceText(srcText);
  const transClean = String(translated || '').trim();

  let en = '';
  let zh = '';
  if (type === 'translate-zh') {
    zh = cleaned;
    en = transClean;
  } else {
    en = cleaned;
    zh = transClean;
  }

  const lines = [];
  if (en || zh) {
    lines.push({ en, zh, breakAfter: true });
  }
  return {
    page: Number(pageNo || 1),
    image: '',
    lines
  };
}

/**
 * 调整第四栏 / 中间栏的显示顺序
 * - translate-en（英文翻译）：英文在上 → 中文在下
 * - translate-zh（中文翻译）：中文在上 → 英文在下
 *
 * 返回顺序: [firstText, firstLang, secondText, secondLang]
 *
 * @param {'translate-en'|'translate-zh'} type
 * @param {{en:string,zh:string}} line
 * @returns {[string, 'en'|'zh', string, 'en'|'zh']}
 */
export function displayLineOrder(type, line) {
  const en = String(line?.en || '');
  const zh = String(line?.zh || '');
  if (type === 'translate-zh') {
    return [zh, 'zh', en, 'en'];
  }
  return [en, 'en', zh, 'zh'];
}

/**
 * 翻译类型对应的显示标签（给下拉 / 按钮上的中文文案用）
 * @param {string} type
 * @returns {string}
 */
export function translationTypeLabel(type) {
  if (type === 'translate-en') return '英文翻译';
  if (type === 'translate-zh') return '中文翻译';
  return type || '';
}
