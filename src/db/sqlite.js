import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const DB_FILE_NAME = 'app.sqlite'
const PERSIST_DEBOUNCE_MS = 300

const SCHEMA_SQL = `
DROP INDEX IF EXISTS idx_vw_book;
DROP INDEX IF EXISTS idx_cw_book;

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
CREATE TABLE IF NOT EXISTS chinese_tags (
  id TEXT, bookId TEXT, name TEXT, createdAt INTEGER, PRIMARY KEY (id, bookId)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, sort_index INTEGER, name TEXT, type TEXT, createdAt INTEGER
);
CREATE TABLE IF NOT EXISTS book_edits (
  title TEXT PRIMARY KEY, pages TEXT, updatedAt INTEGER
);
`

let SQL = null
let db = null
let fileHandle = null
let readyPromise = null
let persistTimer = null

async function getOpfsRoot() {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    return null
  }
  return navigator.storage.getDirectory()
}

async function loadDbFile() {
  const root = await getOpfsRoot()
  if (!root) return null
  try {
    fileHandle = await root.getFileHandle(DB_FILE_NAME, { create: true })
    const file = await fileHandle.getFile()
    const buffer = await file.arrayBuffer()
    return buffer.byteLength > 0 ? new Uint8Array(buffer) : null
  } catch {
    return null
  }
}

async function initSqlite() {
  if (SQL) return
  SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
}

async function persistNow() {
  if (!db || !fileHandle) return
  try {
    const data = db.export()
    const writable = await fileHandle.createWritable()
    await writable.write(data)
    await writable.close()
  } catch (err) {
    console.error('SQLite persist failed:', err)
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistNow, PERSIST_DEBOUNCE_MS)
}

export async function ensureReady() {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    await initSqlite()
    const fileData = await loadDbFile()
    db = fileData ? new SQL.Database(fileData) : new SQL.Database()
    // 逐条执行 schema 语句，单条失败不阻塞其他语句
    const stmts = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean)
    for (const stmt of stmts) {
      try {
        db.run(stmt + ';')
      } catch (err) {
        console.warn('[sqlite] 语句失败（已跳过）:', stmt.slice(0, 60), err.message)
      }
    }
    if (!fileData) await persistNow()
  })()
  return readyPromise
}

export function query(sql, params = []) {
  if (!db) throw new Error('SQLite not initialized. Call ensureReady() first.')
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const rows = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    return rows
  } finally {
    stmt.free()
  }
}

export function queryOne(sql, params = []) {
  const rows = query(sql, params)
  return rows.length > 0 ? rows[0] : null
}

export function run(sql, params = []) {
  if (!db) throw new Error('SQLite not initialized. Call ensureReady() first.')
  db.run(sql, params)
  schedulePersist()
}

export async function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  await persistNow()
}

export function rawDb() {
  return db
}

export async function importDb(data) {
  // 确保 OPFS fileHandle 已就绪，并关闭旧实例
  await ensureReady()
  try {
    if (db) db.close()
  } catch (err) {
    console.warn('[sqlite] 关闭旧数据库失败（已忽略）:', err.message)
  }
  db = new SQL.Database(new Uint8Array(data))
  // 逐条执行 schema 语句，确保导入的库结构与当前一致
  const stmts = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of stmts) {
    try {
      db.run(stmt + ';')
    } catch (err) {
      console.warn('[sqlite] 语句失败（已跳过）:', stmt.slice(0, 60), err.message)
    }
  }
  await persistNow()
}

export async function clearDb() {
  // 确保已初始化（拿到 fileHandle）再清理
  await ensureReady()
  try {
    if (db) db.close()
  } catch (err) {
    console.warn('[sqlite] 关闭数据库失败（已忽略）:', err.message)
  }
  db = null
  fileHandle = null
  // 删除 OPFS 中的数据库文件
  const root = await getOpfsRoot()
  if (root) {
    try {
      await root.removeEntry(DB_FILE_NAME)
    } catch (err) {
      // 文件不存在或其他错误，忽略即可
    }
  }
  // 重置 readyPromise，下次 ensureReady() 会重建空库
  readyPromise = null
}
