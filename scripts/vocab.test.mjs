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
const routerSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'router', 'index.js'),
    'utf8'
)
const sidebarSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'ProjectSidebar.vue'),
    'utf8'
)
const topBarSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'views', 'topBar.vue'),
    'utf8'
)
const pagesDir = path.join(__dirname, '..', 'src', 'pages')
const fileExists = relPath => fs.existsSync(path.join(pagesDir, relPath))

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

// -------------------- 用户新增需求：项目结构重排（main → books / books/setting / home 新主页面） --------------------
test('结构：pages/books/books.vue 存在（原 pages/main/main.vue 改名后位置）', () => {
    assert.ok(fileExists('books/books.vue'), `期望 src/pages/books/books.vue 存在，实际不存在`)
})

test('结构：pages/books/setting.vue 存在（原 pages/setting/setting.vue 挪到 books 下）', () => {
    assert.ok(fileExists('books/setting.vue'), `期望 src/pages/books/setting.vue 存在，实际不存在`)
})

test('结构：pages/home/home.vue 存在（新增功能主入口）', () => {
    assert.ok(fileExists('home/home.vue'), `期望 src/pages/home/home.vue 存在，实际不存在`)
})

test('路由：router/index.js 注册 /home（新主页）、/books/:index（原 main）、/books/setting（原 setting）', () => {
    const r1 = /path\s*:\s*['"']\/home['"']/.test(routerSrc)
    const r2 = /path\s*:\s*['"']\/books\/:index['"']/.test(routerSrc) || /path\s*:\s*['"']\/books(?!\/setting)['"]?\s*,\s*\n[^}]{0,200}redirect\s*:\s*['"']\/books\//.test(routerSrc)
    const r3 = /path\s*:\s*['"']\/books\/setting['"']/.test(routerSrc) || /path\s*:\s*['"']\/setting['"][^}]{0,300}component\s*:\s*SettingView[^}]{0,500}SettingView\s*=\s*\(\)\s*=>\s*import\(['"']\.\.\/pages\/books\/setting\.vue['"']\)/.test(routerSrc) || /SettingView\s*=\s*\(\)\s*=>\s*import\(['"']\.\.\/pages\/books\/setting\.vue['"']\)/.test(routerSrc)
    assert.ok(r1, `router 未注册 /home 路由`)
    assert.ok(r2, `router 未注册 /books/:index（原 main 改名）`)
    assert.ok(r3, `router 未注册指向 pages/books/setting.vue 的 setting 路由`)
})

test('引用：原 /main 路径的 router.push 全改为 /books（不允许残留 /main）', () => {
    // 检查 sidebar + vocabulary + 新 books/setting + books.vue；同时抓单引号/双引号/反引号
    const sourcesToCheck = [sidebarSrc, vocabVueSrc]
    const settingVuePath = path.join(pagesDir, 'books', 'setting.vue')
    const booksVuePath = path.join(pagesDir, 'books', 'books.vue')
    if (fs.existsSync(settingVuePath)) sourcesToCheck.push(fs.readFileSync(settingVuePath, 'utf8'))
    if (fs.existsSync(booksVuePath)) sourcesToCheck.push(fs.readFileSync(booksVuePath, 'utf8'))
    const bad = []
    const regex = /router\.(push|replace)\(\s*(['"`])(\/main[^'"`]*?)\1\s*\)?/g
    let m
    sourcesToCheck.forEach(src => {
        while ((m = regex.exec(src)) !== null) bad.push(m[3])
    })
    assert.deepEqual(bad, [], `发现残留旧路径 /main 引用：${JSON.stringify(bad)}`)
})

test('home.vue 包含"生词本"与"我的书籍"两个功能入口，并含正确跳转路径 /vocabulary /books', () => {
    if (!fileExists('home/home.vue')) { assert.fail('home/home.vue 不存在'); return }
    const homeSrc = fs.readFileSync(path.join(pagesDir, 'home', 'home.vue'), 'utf8')
    assert.ok(/生词本/.test(homeSrc), `home.vue 未显示「生词本」功能入口`)
    assert.ok(/我的书籍|书籍|books/i.test(homeSrc), `home.vue 未显示「我的书籍」功能入口`)
    assert.ok(/\/vocabulary/.test(homeSrc), `home.vue 未发现跳转 /vocabulary 的链接`)
    assert.ok(/\/books/.test(homeSrc), `home.vue 未发现跳转 /books 的链接`)
})

// -------------------- 用户前序需求：books 页生词本按钮从左移到右侧 --------------------
test('books 页面 TopBar 生词本按钮从 top-toolbar-left 移除（左区只留返回）', () => {
    const leftMatch = topBarSrc.match(/<div\s+class="top-toolbar-left"[\s\S]*?<\/div>/)
    assert.ok(leftMatch, `TopBar 找不到 top-toolbar-left 容器`)
    const leftHtml = leftMatch[0]
    const hasReading = /Reading|生词本/.test(leftHtml)
    const hasBack = /ArrowLeft|showBack|返回|go-back/.test(leftHtml)
    assert.ok(!hasReading, `TopBar 左区仍有生词本按钮（Reading/生词本），应移到右侧。左区=${leftHtml.replace(/\s+/g, ' ').slice(0, 240)}`)
    assert.ok(hasBack, `TopBar 左区应保留返回按钮（或 showBack 条件渲染 + ArrowLeft）`)
})
test('books 页面 TopBar 生词本按钮已放在 spacer 之后的右侧区域', () => {
    const parts = topBarSrc.split(/<div\s+class="top-toolbar-spacer"\s*><\/div>\s*/)
    const rightOfSpacer = parts.slice(1).join('')
    assert.ok(rightOfSpacer.length > 0, `TopBar 模板缺少 spacer 分隔`)
    const hasVocabBtn = /生词本|Reading[\s\S]{0,200}生词本|生词本[\s\S]{0,200}Reading|go-vocabulary/.test(rightOfSpacer)
    assert.ok(hasVocabBtn, `spacer 之后的右侧区未发现生词本按钮。右区前 240=${rightOfSpacer.replace(/\s+/g, ' ').slice(0, 240)}`)
})

// -------------------- 用户新需求：返回样式=蓝底实心+白ArrowLeft+白字"返回X"；返回动作=router.back（非固定路径） --------------------

test('统一返回逻辑：books.vue 的返回 handler 必须使用 router.back() 并在历史栈空时 fallback 到 /home（不能只有固定 push /home）', () => {
    const booksSrc = fs.readFileSync(path.join(pagesDir, 'books', 'books.vue'), 'utf8')
    const hasBack = /router\.back\s*\(\s*\)/.test(booksSrc)
    const hasFallback = /router\.(push|replace)\(\s*['"`]\/home['"`]\s*\)/.test(booksSrc)
    assert.ok(hasBack && hasFallback, `books.vue 返回逻辑必须 router.back + fallback /home。当前 routerBack=${hasBack} fallbackHome=${hasFallback}`)
    const showBackProp = /show-back|showBack/.test(booksSrc)
    assert.ok(showBackProp, `books.vue TopBar 应启用 show-back/showBack prop 渲染返回按钮`)
})

test('统一返回逻辑：vocabulary.vue 的 goBack 使用 router.back() 且有 fallback，不得固定 /home', () => {
    const vocSrc = fs.readFileSync(path.join(pagesDir, 'vocabulary', 'vocabulary.vue'), 'utf8')
    const goBackMatch = vocSrc.match(/function\s+goBack\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/)
    assert.ok(goBackMatch, `vocabulary.vue 没有 goBack 函数`)
    const body = goBackMatch[1]
    const hasBack = /router\.back\s*\(\s*\)/.test(body)
    const hasFixedHome = /router\.(push|replace)\(\s*['"`]\/home['"`]\s*\)/.test(body)
    const hasBooks = /\/books\//.test(body)
    // 允许 fallback /home 存在但不能只固定 push /home —— 必须有 router.back() 作为优先
    assert.ok(hasBack, `vocabulary.goBack 必须使用 router.back() 而不是固定路径。当前函数体=${body.replace(/\s+/g, ' ').slice(0, 200)}`)
    assert.ok(!hasBooks, `vocabulary.goBack 不能再出现 /books/ 固定跳转`)
})

test('统一返回样式：vocabulary 返回按钮为蓝底实心 type=primary + <el-icon>ArrowLeft + 白字"返回X"（参考 detail.vue 截图样式）', () => {
    const vocSrc = fs.readFileSync(path.join(pagesDir, 'vocabulary', 'vocabulary.vue'), 'utf8')
    const header = vocSrc.match(/<header\b[\s\S]*?<\/header>/) || [null, '']
    const h = header[0] || ''
    const backBtn = h.match(/<el-button\b([^>]*)\s*>[\s\S]*?<\/el-button>/)
    assert.ok(backBtn, `header 找不到按钮`)
    const attrs = backBtn[1] || ''
    const isPrimary = /type\s*=\s*['"`]primary['"`]/.test(attrs)
    const hasElIcon = /<el-icon[^>]*>[\s\S]*?ArrowLeft[\s\S]*?<\/el-icon>/.test(backBtn[0])
    const hasText = /返回/.test(backBtn[0])
    // 不能是 text 模式了（用户截图是实心）
    const isNotText = !/\btext\b/.test(attrs)
    assert.ok(isPrimary && isNotText, `vocabulary 返回按钮必须是 type=primary 蓝底实心，不能是 text。当前 attrs=${attrs.slice(0, 200)}`)
    assert.ok(hasElIcon, `vocabulary 返回按钮必须包 <el-icon>ArrowLeft</el-icon>（截图样式）`)
    assert.ok(hasText, `vocabulary 返回按钮必须含"返回"文字`)
})

test('统一返回样式：TopBar 内返回按钮为蓝底实心 type=primary + <el-icon>ArrowLeft，支持 backLabel 可传入（不再是 text 灰字）', () => {
    const leftMatch = topBarSrc.match(/<div\s+class="top-toolbar-left"[\s\S]*?<\/div>/)
    assert.ok(leftMatch, `TopBar 没有 left 区`)
    const left = leftMatch[0] || ''
    const backBtn = left.match(/<el-button\b([^>]*)\s*>([\s\S]*?)<\/el-button>/)
    assert.ok(backBtn, `TopBar left 没有返回按钮`)
    const attrs = backBtn[1] || ''
    const inner = backBtn[2] || ''
    const isPrimary = /type\s*=\s*['"`]primary['"`]/.test(attrs)
    const hasElIcon = /<el-icon[^>]*>[\s\S]*?ArrowLeft[\s\S]*?<\/el-icon>/.test(inner) || /<el-icon[\s\S]*?ArrowLeft/.test(inner)
    const hasBackLabel = /\{\{\s*backLabel\s*\}\}/.test(inner) || /返回/.test(inner)
    const isNotText = !/\btext\b/.test(attrs)
    // props: backLabel String 要存在；emits 中 'go-back' 要存在（取代老的 'go-home' 太不灵活）
    const props = topBarSrc.match(/defineProps\(\s*\{([\s\S]*?)\}\s*\)/)
    const hasBackLabelProp = props && /backLabel|back-label/.test(props[1])
    const hasShowBackProp = props && /showBack|show-back/.test(props[1])
    const emits = topBarSrc.match(/defineEmits\(\s*\[([\s\S]*?)\]\s*\)/)
    const hasGoBackEmit = emits && /'go-back'|"go-back"|`go-back`/.test(emits[1])
    assert.ok(isPrimary && isNotText, `TopBar 返回按钮必须 type=primary 蓝底实心（非 text）。attrs=${attrs.slice(0, 200)}`)
    assert.ok(hasElIcon, `TopBar 返回按钮必须包 <el-icon>ArrowLeft（截图样式）`)
    assert.ok(hasBackLabel, `TopBar 返回按钮要显示 backLabel 或至少含"返回"文字`)
    assert.ok(hasBackLabelProp, `TopBar 必须新增 backLabel prop 让调用方可传入"返回首页"/"返回X"`)
    assert.ok(hasShowBackProp, `TopBar 必须保留/新增 showBack prop（控制是否渲染返回按钮）`)
    assert.ok(hasGoBackEmit, `TopBar 必须 emit 'go-back'（取代老的 go-home 语义）`)
})

test('books.vue 模板：TopBar 上传 backLabel（如"返回首页"）+ 绑定 @go-back（而不是 @go-home 固定语义）', () => {
    const booksSrc = fs.readFileSync(path.join(pagesDir, 'books', 'books.vue'), 'utf8')
    const hasLabel = /back-label|backLabel/.test(booksSrc)
    const hasEvent = /@go-back|v-on:go-back/.test(booksSrc)
    assert.ok(hasLabel, `books.vue 未给 TopBar 传 back-label/backLabel（用于显示"返回首页"之类）`)
    assert.ok(hasEvent, `books.vue 未给 TopBar 绑定 @go-back 事件`)
})

test('次级页面也统一：books/setting.vue、vocabulary/test.vue、vocabulary/settings.vue、vocabulary/detail.vue 全部用 router.back() + fallback（不要固定 push）', () => {
    const files = [
        path.join(pagesDir, 'books', 'setting.vue'),
        path.join(pagesDir, 'vocabulary', 'test.vue'),
        path.join(pagesDir, 'vocabulary', 'settings.vue'),
        path.join(pagesDir, 'vocabulary', 'detail.vue'),
    ]
    const bad = []
    for (const f of files) {
        const src = fs.readFileSync(f, 'utf8')
        const fn = src.match(/function\s+goBack\s*\([^)]*\)\s*\{([\s\S]*?)\n\}|const\s+goBack\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\}/)
        if (!fn) { bad.push(`${path.basename(path.dirname(f))}/${path.basename(f)}: 没有 goBack 函数`); continue }
        const body = (fn[1] || fn[2] || '')
        const hasBack = /router\.back\s*\(\s*\)/.test(body)
        if (!hasBack) bad.push(`${path.basename(path.dirname(f))}/${path.basename(f)}: goBack 内没有 router.back()（仍为固定 push/replace）。体=${body.replace(/\s+/g, ' ').slice(0, 120)}`)
    }
    assert.deepEqual(bad, [], `4 个次级页面返回逻辑未统一为 router.back()：${JSON.stringify(bad)}`)
})

// ---------- 汇总打印 ----------
console.log('\n========== vocab TDD 结果 ==========')
cases.forEach(c => {
    console.log(`${c.ok ? '✅' : '❌'}  ${c.name}${c.ok ? '' : `\n      ↳ ${c.err}`}`)
})
console.log(`\n总计: ${passed + failed}  通过率: ${passed}/${passed + failed}`)
process.exit(failed === 0 ? 0 : 1)
