/**
 * 中文拼音本地转换工具（中文生词本专用）
 *
 * 使用 pinyin-pro 在浏览器本地即时生成带声调拼音：
 *   蝴蝶 -> hú dié
 *   蜻蜓 -> qīng tíng
 *
 * 用途：
 *   录入/导入「格式1（逗号间隔）」时本地批量补拼音，无需网络请求；
 *   多音字按词组上下文识别（pinyin-pro 内置词组词典）。
 * 非汉字字符（字母/数字等）原样保留。
 */
import { pinyin } from 'pinyin-pro';

/**
 * 将中文文本转换为带声调拼音（空格分隔音节）
 * @param {string} text 中文词或词组
 * @returns {string} 拼音字符串；无法转换时返回 ''
 */
export function toPinyin(text) {
    const value = String(text || '').trim();
    if (!value) return '';
    const result = pinyin(value, {
        toneType: 'symbol', // 带声调符号：hú dié
        type: 'string',
        v: true // 韵母 ü 使用 ü 而不是 v
    });
    return String(result || '').replace(/\s+/g, ' ').trim();
}

/**
 * 批量转换拼音
 * @param {string[]} words 中文词数组
 * @returns {{word: string, pinyin: string}[]} 词与拼音的对应数组
 */
export function toPinyinBatch(words) {
    return (Array.isArray(words) ? words : [])
        .map(word => ({ word: String(word || '').trim(), pinyin: toPinyin(word) }))
        .filter(item => item.word);
}
