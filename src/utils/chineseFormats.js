/**
 * 中文生词本导入导出格式处理器
 * 通过统一接口 serialize / deserialize 屏蔽不同格式的差异。
 * 与 vocabFormats.js 完全独立，不复用其常量/解析器。
 *
 * 只有两种格式：
 *   1. comma   - 格式1：逗号间隔，单词之间只有逗号（无拼音）
 *                如：蝴蝶,蜻蜓,蚂蚁
 *                导入/录入后由本地拼音库补全拼音，不检索其他数据
 *   2. tagtext - 格式2：标签+文本
 *                [标签]
 *                词组:拼音
 *                如：
 *                [第2单元]
 *                蝴蝶:hú dié
 *                蜻蜓:qīng tíng
 *                自带拼音直接入库，不做任何检索
 */

// ---------------- 内部辅助 ----------------

function normalizeWordText(word) {
    return String(word || '').trim();
}

// 支持英文冒号与中文全角冒号
function splitColon(line) {
    const match = String(line || '').match(/^([^:：]+)[:：]([\s\S]*)$/);
    if (!match) return { left: String(line || '').trim(), right: '' };
    return { left: match[1].trim(), right: match[2].trim() };
}

/**
 * 解析「标签+文本」纯文本（纯函数，不依赖 store）
 * 同一个词在多个标签段落下出现时，标签取并集、拼音取第一个非空值
 * @returns {{ words: Array<{word:string,pinyin:string,tagNames:string[]}>, tagNames: string[] }}
 */
export function parseTagText(rawText) {
    const lines = String(rawText || '').split(/\r?\n/);
    const merged = new Map();
    const tagNames = [];
    let currentTagNames = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const tagMatch = line.match(/^\[(.+?)\]$/);
        if (tagMatch) {
            currentTagNames = tagMatch[1]
                .split(/[,，]/)
                .map(name => name.trim())
                .filter(Boolean);
            for (const name of currentTagNames) {
                if (!tagNames.includes(name)) tagNames.push(name);
            }
            continue;
        }

        const { left: word, right: pinyin } = splitColon(line);
        if (!word) continue;

        if (!merged.has(word)) {
            merged.set(word, { word, pinyin: '', tagNames: new Set() });
        }
        const record = merged.get(word);
        if (!record.pinyin && pinyin) record.pinyin = pinyin;
        for (const name of currentTagNames) record.tagNames.add(name);
    }

    const words = [...merged.values()].map(record => ({
        word: record.word,
        pinyin: record.pinyin,
        tagNames: [...record.tagNames]
    }));
    return { words, tagNames };
}

// ---------------- 格式1：逗号间隔 ----------------

const formatComma = {
    id: 'comma',
    name: '格式1：逗号间隔',
    desc: '单词之间用逗号隔开（无拼音），如：蝴蝶,蜻蜓',
    importAccept: 'text/plain,.txt,.csv',

    serialize(words) {
        const list = (words || [])
            .map(w => normalizeWordText(w?.word))
            .filter(Boolean);
        return {
            content: list.join(','),
            mime: 'text/plain;charset=utf-8',
            ext: 'txt'
        };
    },

    deserialize(rawText) {
        const text = String(rawText || '').trim();
        if (!text) throw new Error('文件内容为空');
        // 逗号分隔；兼容中文逗号与换行
        const parts = text
            .split(/\s*[,，]\s*|\s*[\r\n]+\s*/)
            .map(normalizeWordText)
            .filter(Boolean);
        if (!parts.length) throw new Error('未解析到任何词，请使用逗号分隔');
        const seen = new Set();
        const words = [];
        for (const w of parts) {
            if (seen.has(w)) continue;
            seen.add(w);
            words.push({ word: w, pinyin: '', tagIds: [] });
        }
        return { words, tags: [] };
    }
};

// ---------------- 格式2：标签+文本 ----------------

const formatTagText = {
    id: 'tagtext',
    name: '格式2：标签+文本',
    desc: '[标签] 换行 词组:拼音，如：[第2单元]\\n蝴蝶:hú dié',
    importAccept: 'text/plain,.txt,.csv',

    // words：book.words（含 tagIds/pinyin）；tags：book.tags
    // 无标签的词排在最前面（不带 [标签] 头）；多标签词在每个标签段落下各出现一次
    serialize(words, tags) {
        const list = (words || [])
            .map(w => ({
                word: normalizeWordText(w?.word),
                pinyin: String(w?.pinyin || '').trim(),
                tagIds: Array.isArray(w?.tagIds) ? w.tagIds : []
            }))
            .filter(item => item.word);

        const lines = [];

        const formatWordLine = (item) =>
            item.pinyin ? `${item.word}:${item.pinyin}` : item.word;

        // 无标签词
        const untagged = list.filter(item => item.tagIds.length === 0);
        if (untagged.length) {
            lines.push(...untagged.map(formatWordLine));
        }

        // 按标签分段落（顺序与 tags 一致，标签已按名称数字排序）
        for (const tag of (tags || [])) {
            const members = list.filter(item => item.tagIds.includes(tag.id));
            if (!members.length) continue;
            if (lines.length) lines.push('');
            lines.push(`[${tag.name}]`);
            lines.push(...members.map(formatWordLine));
        }

        return {
            content: lines.join('\n'),
            mime: 'text/plain;charset=utf-8',
            ext: 'txt'
        };
    },

    deserialize(rawText) {
        const { words: parsedWords, tagNames } = parseTagText(rawText);
        if (!parsedWords.length) {
            throw new Error('未解析到任何词条，请使用 [标签]\\n词组:拼音 格式');
        }
        // 标签以“名称”作为临时 id；store.importTags 会负责映射到真实标签 id
        const tags = tagNames.map(name => ({ id: name, name }));
        const words = parsedWords.map(item => ({
            word: item.word,
            pinyin: item.pinyin,
            tagIds: item.tagNames
        }));
        return { words, tags };
    }
};

// ---------------- 注册中心 ----------------

const REGISTRY = [formatComma, formatTagText];

export function getChineseFormatList() {
    return REGISTRY.map(f => ({
        id: f.id,
        name: f.name,
        desc: f.desc || '',
        importAccept: f.importAccept || ''
    }));
}

export function getChineseFormat(id) {
    return REGISTRY.find(f => f.id === id) || null;
}

export { REGISTRY as chineseFormats };
export default {
    list: getChineseFormatList,
    get: getChineseFormat
};
