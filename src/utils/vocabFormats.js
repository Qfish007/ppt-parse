/**
 * 生词本导入导出格式处理器
 * 通过统一接口 serialize / deserialize 屏蔽不同格式的差异。
 * 新增格式只需在此处追加一条注册即可。
 */

// ---------------- 内部辅助 ----------------

function normalizeWordText(word) {
    return String(word || '').trim().toLowerCase()
}

function normalizePhonetic(value) {
    const text = String(value || '').trim()
    if (!text) return ''
    return text.startsWith('/') ? text : `/${text}/`
}

/**
 * 解析外部库1的文件内容：兼容 JSON Array 与 JSONL（每行一个对象）
 */
function parseExternal1Payload(rawText) {
    const text = String(rawText || '').trim()
    if (!text) return []

    // 1) 优先尝试标准 JSON 解析（数组或单对象）
    try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return parsed
        if (parsed && typeof parsed === 'object') return [parsed]
    } catch {
        // 不是合法 JSON，继续走 JSONL 分支
    }

    // 2) JSONL：按行切分，逐行解析
    const lines = text.split(/\r?\n/)
    const result = []
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
            const obj = JSON.parse(trimmed)
            if (obj && typeof obj === 'object') result.push(obj)
        } catch {
            // 忽略非法行
        }
    }
    return result
}

/**
 * 从外部库1单条记录提取释义：优先中释(trans[].tranCn)，并把多个释义用换行拼接
 */
function extractExternal1Meaning(item) {
    const trans = item?.content?.word?.content?.trans
    if (!Array.isArray(trans) || !trans.length) return ''
    const parts = trans
        .map(t => String(t?.tranCn || '').trim())
        .filter(Boolean)
    // 去重并保持顺序
    const seen = new Set()
    const unique = []
    for (const p of parts) {
        if (!seen.has(p)) {
            seen.add(p)
            unique.push(p)
        }
    }
    return unique.join('\n')
}

// ---------------- 格式定义 ----------------

/**
 * 每个格式处理器提供：
 * - id:       唯一标识
 * - name:     弹窗显示名
 * - desc:     弹窗描述（可选）
 * - serialize(words, tags, ctx):  导出 → { content, mime, ext }
 *     - ctx: { bookName, exportedAt }  可选上下文
 * - deserialize(rawText):        导入 → { words: [...], tags?: [...] }
 *     - 可能抛错，调用方负责捕获
 * - importAccept: 导入时 <input accept> 的值（字符串或返回字符串函数）
 */

const formatDefault = {
    id: 'default',
    name: '默认格式',
    desc: '完整 JSON，包含单词、标签、书籍信息（推荐）',
    importAccept: 'application/json,.json',

    serialize(words, tags, ctx = {}) {
        const payload = {
            schema: 'bilingual-reader-vocabulary',
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
        } catch (e) {
            throw new Error('默认格式文件不是有效的 JSON')
        }
        const words = Array.isArray(payload)
            ? payload
            : (payload && payload.schema === 'bilingual-reader-vocabulary' ? payload.words : null)
        if (!Array.isArray(words)) {
            throw new Error('默认格式文件结构不正确，请确认是生词本导出文件')
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
    desc: '用英文逗号分隔，如：always,became,before',
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
        const parts = text
            .split(/\s*,\s*/)
            .map(normalizeWordText)
            .filter(Boolean)
        if (!parts.length) throw new Error('未解析到任何单词，请使用逗号分隔')
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

const formatExternal1 = {
    id: 'external1',
    name: '外部库1（PEP 词典）',
    desc: '兼容 PEPXiaoXue 系列 JSON / JSONL 词典文件',
    importAccept: 'application/json,.json',

    serialize(words, tags, ctx = {}) {
        // 导出也按 JSONL 形式输出，保持与源格式一致
        const bookId = ctx.bookName || 'custom-export'
        const lines = (words || []).map((entry, idx) => {
            const word = normalizeWordText(entry?.word) || ''
            const rawPhonetic = String(entry?.phonetic || '').replace(/^\/|\/$/g, '')
            const meaning = String(entry?.meaning || '').split(/\n|;/)[0].trim()
            return JSON.stringify({
                wordRank: idx + 1,
                headWord: word,
                content: {
                    word: {
                        wordHead: word,
                        wordId: `${bookId}_${idx + 1}`,
                        content: {
                            usphone: rawPhonetic,
                            trans: meaning ? [{ tranCn: meaning, descCn: '中释' }] : []
                        }
                    }
                },
                bookId
            })
        })
        return {
            content: lines.join('\n'),
            mime: 'application/json;charset=utf-8',
            ext: 'json'
        }
    },

    deserialize(rawText) {
        const items = parseExternal1Payload(rawText)
        if (!items.length) {
            throw new Error('外部库1格式文件为空或无法解析')
        }
        const seen = new Set()
        const words = []
        for (const item of items) {
            const head = normalizeWordText(item?.headWord || item?.content?.word?.wordHead)
            if (!head || seen.has(head)) continue
            seen.add(head)
            const content = item?.content?.word?.content || {}
            words.push({
                word: head,
                phonetic: normalizePhonetic(content.usphone || content.ukphone || ''),
                meaning: extractExternal1Meaning(item)
            })
        }
        if (!words.length) {
            throw new Error('外部库1格式中未找到有效的单词条目')
        }
        return { words, tags: [] }
    }
}

// ---------------- 注册中心 ----------------

const REGISTRY = [formatDefault, formatText, formatExternal1]

export function getVocabFormatList() {
    return REGISTRY.map(f => ({
        id: f.id,
        name: f.name,
        desc: f.desc || '',
        importAccept: f.importAccept || ''
    }))
}

export function getVocabFormat(id) {
    return REGISTRY.find(f => f.id === id) || null
}

export { REGISTRY as vocabFormats }
export default {
    list: getVocabFormatList,
    get: getVocabFormat
}
