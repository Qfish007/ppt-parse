# 存储方案改造：sqlite-wasm + OPFS

## Context

项目当前用 Dexie/IndexedDB 存储所有数据。用户目标：
1. **持久化**：清除网页缓存后数据库内容仍在（OPFS 不随"清除缓存"被清）。
2. **Tauri 迁移铺路**：后期用 Tauri 改造 mac/win/网页，SQLite 的 SQL schema 和 query 可直接迁移到原生 SQLite，比 IndexedDB 迁移成本低。
3. **精简缓存字段**：vocabulary 只缓存 word/meaning/tags/level/测试次数（+用户输入的 memoryParts/note）；chinese 只缓存 word/meaning/pinyin/tags/level/测试次数（+note）。详情内容（phonetic、百度汉语释义/组词/例句等）改为实时加载、不落本地。
4. **chinese 增加测试次数功能**：列表显示测试次数列、手动设置入口、错误次数筛选（参照 vocabulary）。

## 技术选型：sql.js + 手动 OPFS 持久化

- **包**：`sql.js`（SQLite 编译为 wasm，纯前端，无 service worker 依赖）。
- **持久化**：DB 文件以 `Uint8Array` 形式存入 OPFS（`navigator.storage.getDirectory()`），初始化时读入、写入后 debounce 落盘。
- **优势**：无需 service worker / COOP/COEP 头 / cross-origin isolation，Vite 配置零改动；小数据量（数百~数千词条，<1MB）下 export+write 耗时可忽略。
- **Tauri 迁移**：只需把 `src/db/sqlite.js` 的 init/persist 换成原生 SQLite 后端，SQL 语句和 repository 逻辑不变。

## 存储分层

| 层 | 介质 | 内容 | 清缓存后 |
|---|---|---|---|
| 持久层 | OPFS (sqlite) | vocabulary/chinese 核心词库、books、tags、settings、projects、bookEdits | **保留** |
| 会话层 | 内存 Map | wordTranslations/wordPhonetics 翻译缓存、百度汉语详情 | 丢失（重新走 API） |

- `chineseHanyuCache` 表删除（已无调用，详情仅存组件 `remoteDetail` 内存）。
- `wordTranslations`/`wordPhonetics` 不再落库，改为内存 LRU 会话缓存。

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS vocabulary_books (
  id TEXT PRIMARY KEY, name TEXT, createdAt INTEGER, updatedAt INTEGER
);
CREATE TABLE IF NOT EXISTS vocabulary_words (
  word TEXT PRIMARY KEY, bookId TEXT, meaning TEXT DEFAULT '',
  tagIds TEXT DEFAULT '[]', memoryParts TEXT DEFAULT '[]',
  level TEXT DEFAULT 'unknown', note TEXT DEFAULT '',
  testTotalCount INTEGER DEFAULT 0, testCorrectCount INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_vw_book ON vocabulary_words(bookId);
CREATE TABLE IF NOT EXISTS vocabulary_tags (
  id TEXT, bookId TEXT, name TEXT, createdAt INTEGER, PRIMARY KEY (id, bookId)
);

CREATE TABLE IF NOT EXISTS chinese_books (
  id TEXT PRIMARY KEY, name TEXT, createdAt INTEGER, updatedAt INTEGER
);
CREATE TABLE IF NOT EXISTS chinese_words (
  word TEXT PRIMARY KEY, bookId TEXT, meaning TEXT DEFAULT '', pinyin TEXT DEFAULT '',
  tagIds TEXT DEFAULT '[]', level TEXT DEFAULT 'unknown', note TEXT DEFAULT '',
  testTotalCount INTEGER DEFAULT 0, testCorrectCount INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cw_book ON chinese_words(bookId);
CREATE TABLE IF NOT EXISTS chinese_tags (
  id TEXT, bookId TEXT, name TEXT, createdAt INTEGER, PRIMARY KEY (id, bookId)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, index INTEGER, name TEXT, type TEXT, createdAt INTEGER
);
CREATE TABLE IF NOT EXISTS book_edits (
  title TEXT PRIMARY KEY, pages TEXT, updatedAt INTEGER
);
```

- 主键 `word`（与 Dexie 当前行为一致）；`id` 字段不入库（normalizeEntry 加载时重新生成，与现状一致）。
- `tagIds`/`memoryParts`/`pages` 序列化为 JSON 字符串存储。
- **vocabulary_words 不含 phonetic**；**chinese_words 不含 audio/cihui/liju/idiomStory/synonyms/antonyms/sameMeaningDiffForm/chuchu/yinzhen**。

## 实施步骤

### 第一阶段：SQLite 存储层（不改变业务行为，全字段平迁）

#### 1.1 安装依赖
- `npm i sql.js`，并把 `sql.js/dist/sql-wasm.wasm` 拷贝到 `public/`（或用 Vite `?url` 引入）。

#### 1.2 新建 `src/db/sqlite.js` — SQLite+OPFS 核心封装
- `initSqlite()`：从 OPFS 读取 `app.sqlite`（不存在则空库），执行建表 SQL，返回 `{ db, persist }`。
- `query(sql, params)` → 返回对象数组（基于 `db.exec` 结果映射列名）。
- `run(sql, params)` → 执行写操作并调用 `persist()`（debounce 300ms）。
- `persist()`：`db.export()` → 写入 OPFS `app.sqlite`。
- 暴露单例 `sqlite`（init 完成前所有调用排队）。

#### 1.3 新建 6 个 Sqlite 仓储适配器
保持与现有 Interface 完全一致的 API，store 层零改动：
- `src/repositories/adapters/SqliteSettingsRepository.js`（对照 [DexieSettingsRepository.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/repositories/adapters/DexieSettingsRepository.js)）
- `src/repositories/adapters/SqliteVocabularyRepository.js`（对照 [DexieVocabularyRepository.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/repositories/adapters/DexieVocabularyRepository.js)）：saveBook 时显式列字段（无 phonetic），tagIds/memoryParts 序列化为 JSON
- `src/repositories/adapters/SqliteChineseRepository.js`（对照 [DexieChineseRepository.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/repositories/adapters/DexieChineseRepository.js)）：saveBook 无 audio/cihui/liju 等字段；删除 getHanyuCache/setHanyuCache/clearHanyuCache（改为 store 内返回 null/空操作，后续再清理）
- `src/repositories/adapters/SqliteWordCacheRepository.js`：内存 Map LRU 实现（不落库），getTranslation/saveTranslation 仅存内存
- `src/repositories/adapters/SqliteProjectsRepository.js`（对照 [DexieProjectsRepository.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/repositories/adapters/DexieProjectsRepository.js)）
- `src/repositories/adapters/SqliteBookEditsRepository.js`（对照 [DexieBookEditsRepository.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/repositories/adapters/DexieBookEditsRepository.js)）：pages 序列化

#### 1.4 切换 `src/repositories/index.js`
- 把 6 个 Dexie 实例替换为 Sqlite 实例。
- 保留旧 Dexie 文件不删（供迁移读取）。

#### 1.5 新建 `src/db/migration.js` — Dexie→SQLite 一次性迁移
- `migrateFromDexie()`：若 sqlite settings 无 `migrated` 标记，则用旧 `src/db/database.js` 的 Dexie 实例读取全部表数据，逐表 INSERT OR REPLACE 进 sqlite，最后写 `migrated=1`。
- 在 `src/main.js`（或 store.load 首次调用前）await 迁移完成。
- 迁移时 vocabulary_words 丢弃 phonetic；chinese_words 丢弃 audio/cihui 等字段（天然不插入即可）。

### 第二阶段：精简缓存字段

#### 2.1 vocabulary store/列表/详情
- [src/stores/vocabulary.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/stores/vocabulary.js) `normalizeEntry`：**删除 phonetic 字段**（不再 normalize/存储）；addWord/updateWord 中 phonetic 相关分支删除。
- [src/pages/vocabulary/vocabulary.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/vocabulary.vue)：删除"发音"列（表头 L111、行单元格、gridTemplateColumns 中 pronunciation 分支、listMinWidth 计算）；visibleColumns.pronunciation 不再出现。
- [src/pages/vocabulary/setting.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/setting.vue)：删除"发音"开关行；setVisibleColumns 去掉 pronunciation。
- [src/pages/vocabulary/detail.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/detail.vue) L401-414 `refreshMeaning`：
  - 新增 `remotePhonetic = ref('')` 组件内存变量。
  - API 返回的 phonetic 写入 `remotePhonetic.value`（不入库），**不再**调 updateWord 传 phonetic。
  - meaning 仍 updateWord 落库（meaning 属于缓存字段）。
  - 详情页音标显示优先取 `remotePhonetic.value || entry.phonetic`（兼容旧数据残留）。

#### 2.2 chinese store/列表/详情
- [src/stores/chinese.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/stores/chinese.js) `normalizeEntry`：删除 audio/cihui/liju/idiomStory/synonyms/antonyms/sameMeaningDiffForm/chuchu/yinzhen 字段。保留 word/pinyin/meaning/tagIds/level/note/testTotalCount/testCorrectCount。
  - **meaning(中文)保留入库**——用户明确列为缓存字段；cihui/liju 等才是实时加载的详情内容。
- [src/pages/chinese/detail.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/chinese/detail.vue)：无需改动（remoteDetail 已是内存机制，view computed 合并展示）。只是 store 不再携带这些字段，详情页从 remoteDetail 取。
- 删除 store 中 `getHanyuCache/setHanyuCache/clearHanyuCache` 调用链（Sqlite 仓储已返回空）。

### 第三阶段：chinese 测试次数功能

#### 3.1 store 层
- [src/stores/chinese.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/stores/chinese.js)：
  - `visibleColumns` 默认加 `testStats: false`，`setVisibleColumns` 加 testStats 字段。
  - 新增方法 `async setTestCount(word, correct, wrong)`：找到词条，设置 `testCorrectCount=correct`、`testTotalCount=correct+wrong`（正确次数包括错误次数=总数=正确+错误），落库。

#### 3.2 仓储层
- `SqliteChineseRepository` 的 visibleColumns 默认值同步加 testStats。

#### 3.3 列表页 [src/pages/chinese/chinese.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/chinese/chinese.vue)
参照 vocabulary.vue 的实现方式：
- **表头**（L87-99）：在"掌握水平"后加 `<span v-if="chineseStore.visibleColumns.testStats" class="cn-teststats-head">测试次数</span>`。
- **行单元格**（L120-164 区间）：加 `<div v-if="chineseStore.visibleColumns.testStats" class="cn-teststats">正确{{testCorrectCount}}次/错误{{wrong}}次</div>`，计算 wrong = total - correct。
- **gridTemplateColumns**（L390-399）：加 testStats 分支 `if(visibleColumns.testStats) cols.push('110px')`。
- **骨架行**：同步加一个骨架格。
- **筛选区**（L75-84 之前）：加"错误次数"范围筛选（wrongCountMin/wrongCountMax el-input-number），与 [vocabulary.vue L94-101](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/vocabulary.vue) 完全一致的结构。
- **filteredWords**（L364-388）：加 wrongCount 计算和 min/max 过滤逻辑（抄 vocabulary.vue L384-402）。
- **操作区**（L161-163）：现有"设置"按钮旁加"测试"按钮 → 打开手动设置测试次数弹窗。
- 新增 `testDialog = reactive({ visible, word, correct, wrong })`，el-dialog 含正确/错误两个 el-input-number，提交调 `chineseStore.setTestCount(word, correct, wrong)`。
- **updateRouteQuery**：加 wrongCountMin/wrongCountMax 持久化到 query。
- **初始化**：wrongCountMin/wrongCountMax 从 router query 读取。

#### 3.4 设置页 [src/pages/chinese/setting.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/chinese/setting.vue)
- 在"备注"开关后（L38 后）加"测试次数"开关行，`:model-value="chineseStore.visibleColumns.testStats"`。

## 关键文件清单

**新建：**
- `src/db/sqlite.js` — SQLite+OPFS 封装
- `src/db/migration.js` — Dexie→SQLite 迁移
- `src/repositories/adapters/SqliteSettingsRepository.js`
- `src/repositories/adapters/SqliteVocabularyRepository.js`
- `src/repositories/adapters/SqliteChineseRepository.js`
- `src/repositories/adapters/SqliteWordCacheRepository.js`
- `src/repositories/adapters/SqliteProjectsRepository.js`
- `src/repositories/adapters/SqliteBookEditsRepository.js`

**修改：**
- [src/repositories/index.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/repositories/index.js) — 切换适配器
- [src/stores/vocabulary.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/stores/vocabulary.js) — normalizeEntry 删 phonetic
- [src/stores/chinese.js](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/stores/chinese.js) — normalizeEntry 删详情字段；加 testStats/ setTestCount
- [src/pages/vocabulary/vocabulary.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/vocabulary.vue) — 删发音列
- [src/pages/vocabulary/setting.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/setting.vue) — 删发音开关
- [src/pages/vocabulary/detail.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/detail.vue) — phonetic 改 remotePhonetic
- [src/pages/chinese/chinese.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/chinese/chinese.vue) — 加测试次数列/筛选/手动设置弹窗
- [src/pages/chinese/setting.vue](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/chinese/setting.vue) — 加测试次数开关
- [package.json](file:///Users/lc/Desktop/AI/Demo/ppt-prase/package.json) — 加 sql.js
- `src/main.js` — 启动时 await 迁移

**保留不动（供迁移读取）：**
- `src/db/database.js`、`src/repositories/adapters/Dexie*.js`

## 复用的现有模式
- **Repository 接口**：`IVocabularyRepository`/`IChineseRepository`/`ISettingsRepository` 等——Sqlite 适配器实现相同接口，store 层零改动。
- **wrongCount 过滤逻辑**：[vocabulary.vue L384-402](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/vocabulary.vue) 的 `wrongCount = total - correct` + min/max 过滤——chinese 直接复用此模式。
- **testStats 列渲染**：[vocabulary.vue L179-183](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/vocabulary/vocabulary.vue)——chinese 镜像。
- **remoteDetail 内存机制**：[chinese/detail.vue L208-215](file:///Users/lc/Desktop/AI/Demo/ppt-prase/src/pages/chinese/detail.vue)——vocabulary 的 remotePhonetic 参照此模式。
- **tagIds JSON 序列化**：现有 store 的 `normalizeTagIds` 返回数组，Sqlite 仓储层 `JSON.stringify`/`JSON.parse`。

## 验证

1. **迁移验证**：启动应用 → 控制台无报错 → 词汇本/中文生词本数据完整（词数一致）→ OPFS 中 `app.sqlite` 文件存在（DevTools > Application > Storage > OPFS）。
2. **清缓存验证**：DevTools > Clear storage > 仅勾"Cache"（不勾"Site data"）→ 刷新 → 词库数据仍在。
3. **vocabulary 详情**：点单词进详情 → 点刷新 → 音标显示（来自 API，不入库）→ 返回列表 → 无"发音"列。
4. **chinese 测试次数**：列表开"测试次数"列（设置页）→ 列显示正确/错误次数 → 点"测试"按钮设值 → 筛选错误次数范围生效 → 刷新后值仍在。
5. **chinese 详情**：点中文词进详情 → 点播放/刷新 → 释义/组词/例句从百度汉语加载（仅内存）→ 刷新页面后详情消失、列表核心字段保留。
6. `npm run build` 通过。
7. 浏览器端到端：各导入/导出格式、标签筛选、打印、英文测试页功能不回归。
