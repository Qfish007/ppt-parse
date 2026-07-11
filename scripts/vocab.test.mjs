// 无依赖纯逻辑 TDD 断言：分页切片 + 页码越界 clamp
// 运行：node scripts/vocab.test.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { slicePage, clampPage } from '../src/utils/pagination.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const vocabVueSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'pages', 'vocabulary', 'vocabulary.vue'),
    'utf8'
)
const testVueSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'pages', 'vocabulary', 'test.vue'),
    'utf8'
)

let passed = 0
let failed = 0
let cases = []

function test(name, fn) {
    try {
        fn()
        passed++
        cases.push({ name, ok: true })
    } catch (e) {
        failed++
        cases.push({ name, ok: false, err: e.message })
        console.error(`❌ ${name}\n   ${e.message}`)
    }
}

// ---------- 构造假 130 条单词（对齐用户截图：总词汇 130）----------
const words130 = Array.from({ length: 130 }, (_, i) => ({ word: `w${i}`, idx: i }))

test('slicePage: 130 words / page 1 / size 50 → 前 50 条', () => {
    const out = slicePage(words130, 1, 50)
    assert.equal(out.length, 50, '长度应为 50')
    assert.equal(out[0].word, 'w0', '首条应为 w0')
})

test('slicePage: 130 words / page 2 / size 50 → 中 50 条', () => {
    const out = slicePage(words130, 2, 50)
    assert.equal(out.length, 50, '长度应为 50')
    assert.equal(out[0].word, 'w50', '首条应为 w50')
    assert.equal(out[49].word, 'w99', '尾条应为 w99')
})

test('slicePage: 130 words / page 3 / size 50 → 后 30 条', () => {
    const out = slicePage(words130, 3, 50)
    assert.equal(out.length, 30, '长度应为 30')
    assert.equal(out[0].word, 'w100', '首条应为 w100')
    assert.equal(out[29].word, 'w129', '尾条应为 w129')
})

test('slicePage: 边界 - 空数组返回空', () => {
    assert.deepEqual(slicePage([], 1, 50), [])
})

test('slicePage: 边界 - page 超界返回空', () => {
    assert.deepEqual(slicePage(words130, 99, 50), [])
})

test('clampPage: 130 total / page=5 / size=50 → totalPages=3 → clamp 到 3', () => {
    assert.equal(clampPage(130, 5, 50), 3)
})

test('clampPage: 130 total / page=0 → clamp 到 1', () => {
    assert.equal(clampPage(130, 0, 50), 1)
})

test('clampPage: 130 total / page=-1 → clamp 到 1', () => {
    assert.equal(clampPage(130, -1, 50), 1)
})

test('clampPage: total=0 / page=任何 → 返回 1（空列表展示态）', () => {
    assert.equal(clampPage(0, 5, 50), 1)
})

test('clampPage: total=130 / page=2 / size=50 → 正好有效 → 返回 2', () => {
    assert.equal(clampPage(130, 2, 50), 2)
})

// -------------------- 用户新增需求：默认每页 10 条，pageSizes 必须包含 10 --------------------
test('vocabulary.vue: pageSizes 数组里包含 10，且排在首位（用户默认优先选）', () => {
    const m = vocabVueSrc.match(/const\s+pageSizes\s*=\s*(\[[\s\S]*?\])/)
    assert.ok(m, `源代码里未找到 const pageSizes = [...]`)
    // eslint-disable-next-line no-eval
    const arr = eval(m[1])
    assert.ok(Array.isArray(arr), `pageSizes 解析结果不是数组：${typeof arr}`)
    assert.ok(arr.includes(10), `pageSizes=${JSON.stringify(arr)} 不包含用户要求的 10`)
    assert.equal(arr[0], 10, `pageSizes 第一项应为默认值 10，实际 ${arr[0]}`)
})

test('vocabulary.vue: pageSize 默认初始值 = ref(10)（用户要求默认每页 10 个）', () => {
    const m = vocabVueSrc.match(/const\s+pageSize\s*=\s*ref\(\s*(\d+)\s*\)/)
    assert.ok(m, `源代码里未找到 const pageSize = ref(N)`)
    const n = parseInt(m[1], 10)
    assert.equal(n, 10, `pageSize 默认值应为 10，实际 = ${n}`)
})

// -------------------- 用户新增需求：测试页 answer-row 输入框+提交按钮字体 30px --------------------
function extractClassBlock(src, blockHeaderSelector) {
    const idx = src.indexOf(blockHeaderSelector)
    if (idx < 0) return null
    let depth = 0, started = false, j = idx
    while (j < src.length) {
        const c = src[j]
        if (c === '{') { depth++; started = true }
        else if (c === '}') { depth--; if (started && depth === 0) return src.slice(idx, j + 1) }
        j++
    }
    return null
}

test('test.vue: answer-row 下的输入框字体 = 30px（用户要求红框字体 30px）', () => {
    // 查找 input 对应的 30px 字号声明；可能在 :deep(.el-input__wrapper) 或 :deep(.el-input) 下
    const inputBlocks = [
        extractClassBlock(testVueSrc, '.answer-input :deep(.el-input__wrapper)'),
        extractClassBlock(testVueSrc, '.answer-row :deep(.el-input__wrapper)'),
        extractClassBlock(testVueSrc, '.answer-input :deep(.el-input)'),
        extractClassBlock(testVueSrc, '.answer-row :deep(.el-input)'),
        extractClassBlock(testVueSrc, '.answer-input :deep(.el-input__inner)'),
        extractClassBlock(testVueSrc, '.answer-row :deep(.el-input__inner)'),
    ].filter(Boolean)
    assert.ok(inputBlocks.length, `在 test.vue 未找到 answer-input/answer-row 下 el-input 的 :deep 样式声明`)
    const has30 = inputBlocks.some(b => /font-size\s*:\s*30px/.test(b))
    assert.ok(has30, `test.vue 输入框样式块均未设置 font-size: 30px。已扫描：${inputBlocks.map(b => b.split('{')[0].trim()).join(' | ')}`)
})

test('test.vue: answer-row 下的提交按钮字体 = 30px（用户要求红框字体 30px）', () => {
    // 注意：自定义类如果挂在 ElButton 组件根 button 上，则 ":deep" 是"子元素匹配"不会命中自身。
    //       因此方案是 :global(.answer-submit.el-button)。两种方案都扫描。
    const btnBlocks = [
        extractClassBlock(testVueSrc, '.answer-submit :deep(.el-button)'),
        extractClassBlock(testVueSrc, '.answer-row :deep(.el-button)'),
        extractClassBlock(testVueSrc, '.answer-submit-btn :deep(.el-button)'),
        extractClassBlock(testVueSrc, ':global(.answer-submit.el-button)'),
        extractClassBlock(testVueSrc, ':global(.answer-submit.el-button.el-button)'),
    ].filter(Boolean)
    assert.ok(btnBlocks.length, `在 test.vue 未找到 answer-submit 下 el-button 的 :deep 或 :global 样式声明`)
    const has30 = btnBlocks.some(b => /font-size\s*:\s*30px/.test(b))
    assert.ok(has30, `test.vue 提交按钮样式块均未设置 font-size: 30px。已扫描：${btnBlocks.map(b => b.split('{')[0].trim()).join(' | ')}`)
})

// -------------------- 用户新增需求：按钮另起一行居中 + 输入框内文字 & placeholder 居中 --------------------
test('test.vue: answer-row 改为单列（按钮另起一行：grid-template-columns: 1fr 或单列等价写法）', () => {
    const block = extractClassBlock(testVueSrc, '.answer-row {')
    assert.ok(block, `未找到 .answer-row { ... } 样式块`)
    // 原来两列布局写法："grid-template-columns: minmax(0, 1fr) auto" → 有 auto 或 repeat(2) 等都算两列；单列是 1fr;
    // 验证：grid-template-columns 中不包含 auto / 2 / 50% 等多列关键词
    const m = block.match(/grid-template-columns\s*:\s*([^;]+);/)
    assert.ok(m, `.answer-row 未定义 grid-template-columns`)
    const cols = m[1].trim()
    // 单列有效写法："1fr"、"minmax(0, 1fr)"、"100%" 都算单列表（不算两列），不允许包含 auto / / repeat(2
    assert.ok(
        !/\bauto\b/.test(cols) && !/\brepeat\s*\(\s*2/.test(cols),
        `.answer-row 当前还是多列：grid-template-columns: ${cols}；预期单列（按钮应另起一行），不是并列`
    )
    // 且列数只能是 1 个单位（列号数按空格拆分出 1 个片段）
    const parts = cols.split(/\s+/).filter(s => s.length)
    assert.equal(parts.length, 1, `.answer-row 列片段数=${parts.length}；预期单列=1`)
})

test('test.vue: 输入框内真实输入的文字居中 = text-align: center', () => {
    const inner = extractClassBlock(testVueSrc, '.answer-input :deep(.el-input__inner)')
    assert.ok(inner, `未找到 .answer-input :deep(.el-input__inner) 样式块`)
    assert.ok(/text-align\s*:\s*center/.test(inner), `输入框 inner 未设置 text-align:center；内容：${inner.slice(0, 150)}`)
})

test('test.vue: 输入框 placeholder 也要居中 = placeholder text-align: center', () => {
    const ph = extractClassBlock(testVueSrc, '.answer-input :deep(.el-input__inner::placeholder)')
    const phAlt = extractClassBlock(testVueSrc, '.answer-input :deep(.el-input__inner)::placeholder')
    const block = ph || phAlt
    assert.ok(block, `未找到 .el-input__inner::placeholder 样式块`)
    assert.ok(/text-align\s*:\s*center/.test(block), `输入框 placeholder 未设置 text-align:center`)
})

test('test.vue: 按钮在自身行内水平居中（justify-self:center 或 answer-row justify-items:center 或 margin: 0 auto）', () => {
    // 方案一：容器 .answer-row 对子项 justify-items:center 或 place-items:center
    const row = extractClassBlock(testVueSrc, '.answer-row {')
    // 方案二：.answer-submit justify-self:center 或 margin:auto（或 :global 里写）
    const submitGlobal = extractClassBlock(testVueSrc, ':global(.answer-submit.el-button)')
    const viaRow = row && /(justify-items|place-items|justify-content|place-content)\s*:\s*[^;]*center/.test(row)
    const viaSelf = submitGlobal && /(justify-self\s*:\s*[^;]*center|margin(?!-left|-right|-top|-bottom)\s*:\s*[^;]*0\s*auto|margin\s*:\s*[^;]*auto)/.test(submitGlobal)
    assert.ok(viaRow || viaSelf, `按钮未设置任何居中规则（支持两种写法）。\n  row justify-items/place-items/justify-content: ${viaRow ? 'OK' : '缺'}; submit justify-self/margin auto：${viaSelf ? 'OK' : '缺'}`)
})

// ---------- 汇总打印 ----------
console.log('\n========== vocab TDD 结果 ==========')
cases.forEach(c => {
    console.log(`${c.ok ? '✅' : '❌'}  ${c.name}${c.ok ? '' : `\n      ↳ ${c.err}`}`)
})
console.log(`\n总计: ${passed + failed}  通过率: ${passed}/${passed + failed}`)
process.exit(failed === 0 ? 0 : 1)
