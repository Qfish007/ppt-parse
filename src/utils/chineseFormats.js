/**
 * 中文生词本导入导出格式处理器
 * 通过统一接口 serialize / deserialize 屏蔽不同格式的差异。
 * 与 vocabFormats.js 完全独立，不复用其常量/解析器。
 *
 * 三种格式：
 *   1. default   - 完整 JSON，包含词条、标签、生词本信息（推荐）
 *   2. text       - 用逗号分隔中文词，如：项目,苹果,守株待兔
 *   3. external1  - JSONL，每行一个完整词条对象（含 pinyin/meaning/cihui/liju 等）
 */

// ---------------- 内部辅助 ----------------

function normalizeWordText(word) {
    return String(word || '').trim()
}

// ---------------- 格式定义 ----------------

const formatDefault = {
    id: 'default',
    name: '默认格式',
    desc: '完整 JSON，包含词条、标签、生词本信息（推荐）',
    importAccept: 'application/json,.json',

    serialize(words, tags, ctx = {}) {
        const payload = {
            schema: 'bilingual-reader-chinese',
            version: 1,
            exportedAt: ctx.exportedAt || new Date().toISOString(),
            bookName: ctx.bookName || '',
            tags: tags || [],
            words: words || []
        }
        return {
            content: JSON.stringify(payload, null, 2),
            mime: 'application/json;charset=utf-8',
            ext: 'json'
        }
    },

    deserialize(rawText) {
        let payload
        try {
            payload = JSON.parse(String(rawText || '{}'))
        } catch {
            throw new Error('默认格式文件不是有效的 JSON')
        }
        const words = Array.isArray(payload)
            ? payload
            : (payload && payload.schema === 'bilingual-reader-chinese' ? payload.words : null)
        if (!Array.isArray(words)) {
            throw new Error('默认格式文件结构不正确，请确认是中文生词本导出文件')
        }
        return {
            words,
            tags: Array.isArray(payload?.tags) ? payload.tags : []
        }
    }
}

const formatText = {
    id: 'text',
    name: '文本格式',
    desc: '用逗号分隔，如：项目,苹果,守株待兔（与录入格式一致）',
    importAccept: 'text/plain,.txt,.csv',

    serialize(words) {
        const list = (words || [])
            .map(w => normalizeWordText(w?.word))
            .filter(Boolean)
        return {
            content: list.join(','),
            mime: 'text/plain;charset=utf-8',
            ext: 'txt'
        }
    },

    deserialize(rawText) {
        const text = String(rawText || '').trim()
        if (!text) throw new Error('文本格式文件内容为空')
        // 同时支持英文逗号和中文逗号
        const parts = text
            .split(/\s*[,，]\s*/)
            .map(normalizeWordText)
            .filter(Boolean)
        if (!parts.length) throw new Error('未解析到任何词，请使用逗号分隔')
        const seen = new Set()
        const words = []
        for (const w of parts) {
            if (seen.has(w)) continue
            seen.add(w)
            words.push({ word: w })
        }
        return { words, tags: [] }
    }
}

// external1：JSONL，每行一个完整词条对象（含 pinyin/meaning/cihui/liju 等）
// 适合从其他中文词典系统迁移，或本系统导出后做完整数据备份
const formatExternal1 = {
    id: 'external1',
    name: '外部库1（JSONL）',
    desc: 'JSONL 格式，每行一个词条对象（含完整字段，适合备份）',
    importAccept: 'application/json,.json,.jsonl,.txt',

    serialize(words, tags, ctx = {}) {
        const lines = (words || []).map((entry, idx) => {
            return JSON.stringify({
                wordRank: idx + 1,
                word: normalizeWordText(entry?.word),
                pinyin: String(entry?.pinyin || ''),
                meaning: String(entry?.meaning || ''),
                cihui: String(entry?.cihui || ''),
                liju: String(entry?.liju || ''),
                idiomStory: String(entry?.idiomStory || ''),
                synonyms: String(entry?.synonyms || ''),
                antonyms: String(entry?.antonyms || ''),
                sameMeaningDiffForm: String(entry?.sameMeaningDiffForm || ''),
                chuchu: String(entry?.chuchu || ''),
                yinzhen: String(entry?.yinzhen || ''),
                note: String(entry?.note || ''),
                level: String(entry?.level || 'unknown'),
                tagIds: Array.isArray(entry?.tagIds) ? entry.tagIds : []
            })
        })
        return {
            content: lines.join('\n'),
            mime: 'application/json;charset=utf-8',
            ext: 'json'
        }
    },

    deserialize(rawText) {
        const text = String(rawText || '').trim()
        if (!text) throw new Error('外部库1格式文件内容为空')

        // 1) 优先尝试标准 JSON 解析（数组或单对象）
        let parsed
        try {
            parsed = JSON.parse(text)
        } catch {
            parsed = null
        }
        let items = []
        if (Array.isArray(parsed)) {
            items = parsed
        } else if (parsed && typeof parsed === 'object') {
            items = [parsed]
        } else {
            // 2) JSONL：按行切分，逐行解析
            items = text.split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    try { return JSON.parse(line) } catch { return null }
                })
                .filter(Boolean)
        }

        if (!items.length) {
            throw new Error('外部库1格式文件为空或无法解析')
        }

        const seen = new Set()
        const words = []
        for (const item of items) {
            const word = normalizeWordText(item?.word || item?.headWord || item?.wordHead)
            if (!word || seen.has(word)) continue
            seen.add(word)
            words.push({
                word,
                pinyin: String(item?.pinyin || '').trim(),
                meaning: String(item?.meaning || '').trim(),
                cihui: String(item?.cihui || '').trim(),
                liju: String(item?.liju || '').trim(),
                idiomStory: String(item?.idiomStory || '').trim(),
                synonyms: String(item?.synonyms || '').trim(),
                antonyms: String(item?.antonyms || '').trim(),
                sameMeaningDiffForm: String(item?.sameMeaningDiffForm || '').trim(),
                chuchu: String(item?.chuchu || '').trim(),
                yinzhen: String(item?.yinzhen || '').trim(),
                note: String(item?.note || '').trim(),
                level: String(item?.level || 'unknown'),
                tagIds: Array.isArray(item?.tagIds) ? item.tagIds : []
            })
        }
        if (!words.length) {
            throw new Error('外部库1格式中未找到有效的词条')
        }
        return { words, tags: [] }
    }
}

// ---------------- 注册中心 ----------------

const REGISTRY = [formatDefault, formatText, formatExternal1]

export function getChineseFormatList() {
    return REGISTRY.map(f => ({
        id: f.id,
        name: f.name,
        desc: f.desc || '',
        importAccept: f.importAccept || ''
    }))
}

export function getChineseFormat(id) {
    return REGISTRY.find(f => f.id === id) || null
}

export { REGISTRY as chineseFormats }
export default {
    list: getChineseFormatList,
    get: getChineseFormat
}
