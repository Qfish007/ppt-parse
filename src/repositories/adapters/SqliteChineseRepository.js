import { IChineseRepository } from '../IChineseRepository.js'
import { ensureReady, query, queryOne, run } from '../../db/sqlite.js'

export class SqliteChineseRepository extends IChineseRepository {
  async getBooks() {
    await ensureReady()
    const books = query('SELECT id, name, createdAt, updatedAt FROM chinese_books ORDER BY createdAt', [])
    for (const book of books) {
      book.words = query('SELECT word, meaning, pinyin, tagIds, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt, bookId FROM chinese_words WHERE bookId = ?', [book.id])
        .map(decodeWord)
      book.tags = query('SELECT id, bookId, name, createdAt FROM chinese_tags WHERE bookId = ?', [book.id])
    }
    return books
  }

  async getBook(id) {
    await ensureReady()
    const book = queryOne('SELECT id, name, createdAt, updatedAt FROM chinese_books WHERE id = ?', [id])
    if (!book) return null
    book.words = query('SELECT word, meaning, pinyin, tagIds, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt, bookId FROM chinese_words WHERE bookId = ?', [id])
      .map(decodeWord)
    book.tags = query('SELECT id, bookId, name, createdAt FROM chinese_tags WHERE bookId = ?', [id])
    return book
  }

  async saveBook(book) {
    await ensureReady()
    const { words = [], tags = [], ...bookData } = book
    run('INSERT OR REPLACE INTO chinese_books (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [
      bookData.id, bookData.name,
      Number(bookData.createdAt) || Date.now(),
      Number(bookData.updatedAt) || Date.now()
    ])
    run('DELETE FROM chinese_words WHERE bookId = ?', [book.id])
    for (const word of words) {
      run(`INSERT OR REPLACE INTO chinese_words
        (word, bookId, meaning, pinyin, tagIds, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        word.word, book.id,
        String(word.meaning || ''),
        String(word.pinyin || ''),
        JSON.stringify([...(word.tagIds || [])]),
        word.level || 'unknown',
        String(word.note || ''),
        Number(word.testTotalCount) || 0,
        Number(word.testCorrectCount) || 0,
        Number(word.createdAt) || Date.now(),
        Number(word.updatedAt) || Date.now()
      ])
    }
    run('DELETE FROM chinese_tags WHERE bookId = ?', [book.id])
    for (const tag of tags) {
      run('INSERT OR REPLACE INTO chinese_tags (id, bookId, name, createdAt) VALUES (?, ?, ?, ?)', [
        tag.id, book.id, tag.name, Number(tag.createdAt) || Date.now()
      ])
    }
    return book
  }

  async deleteBook(id) {
    await ensureReady()
    run('DELETE FROM chinese_words WHERE bookId = ?', [id])
    run('DELETE FROM chinese_tags WHERE bookId = ?', [id])
    run('DELETE FROM chinese_books WHERE id = ?', [id])
  }

  async getWordsByBook(bookId) {
    await ensureReady()
    return query('SELECT word, meaning, pinyin, tagIds, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt, bookId FROM chinese_words WHERE bookId = ?', [bookId])
      .map(decodeWord)
  }

  async saveWord(word) {
    await ensureReady()
    run(`INSERT OR REPLACE INTO chinese_words
      (word, bookId, meaning, pinyin, tagIds, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      word.word, word.bookId,
      String(word.meaning || ''),
      String(word.pinyin || ''),
      JSON.stringify([...(word.tagIds || [])]),
      word.level || 'unknown',
      String(word.note || ''),
      Number(word.testTotalCount) || 0,
      Number(word.testCorrectCount) || 0,
      Number(word.createdAt) || Date.now(),
      Number(word.updatedAt) || Date.now()
    ])
    return word
  }

  async deleteWord(word) {
    await ensureReady()
    run('DELETE FROM chinese_words WHERE word = ?', [word])
  }

  async getTagsByBook(bookId) {
    await ensureReady()
    return query('SELECT id, bookId, name, createdAt FROM chinese_tags WHERE bookId = ?', [bookId])
  }

  async saveTag(tag) {
    await ensureReady()
    run('INSERT OR REPLACE INTO chinese_tags (id, bookId, name, createdAt) VALUES (?, ?, ?, ?)', [
      tag.id, tag.bookId, tag.name, Number(tag.createdAt) || Date.now()
    ])
    return tag
  }

  async deleteTag(id) {
    await ensureReady()
    run('DELETE FROM chinese_tags WHERE id = ?', [id])
  }

  async getActiveBookId() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'chineseActiveBook'", [])
    return row ? row.value : undefined
  }

  async setActiveBookId(id) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('chineseActiveBook', ?)", [String(id)])
  }

  async getDefaultBookId() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'chineseDefaultBook'", [])
    return row ? row.value : undefined
  }

  async setDefaultBookId(id) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('chineseDefaultBook', ?)", [String(id)])
  }

  async getStatsVisible() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'chineseStatsVisible'", [])
    return row?.value !== 'false'
  }

  async setStatsVisible(visible) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('chineseStatsVisible', ?)", [String(visible)])
  }

  async getVisibleColumns() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'chineseVisibleColumns'", [])
    if (row?.value) {
      try { return JSON.parse(row.value) } catch { /* ignore */ }
    }
    return { pinyin: true, tags: true, level: true, note: false, testStats: false }
  }

  async setVisibleColumns(columns) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('chineseVisibleColumns', ?)", [JSON.stringify(columns)])
  }

  async getTagFilterRelation() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'chineseTagFilterRelation'", [])
    return row?.value === 'or' ? 'or' : 'and'
  }

  async setTagFilterRelation(relation) {
    await ensureReady()
    const value = relation === 'or' ? 'or' : 'and'
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('chineseTagFilterRelation', ?)", [value])
  }

  // 详情缓存层不再落库（仅内存），保留接口返回空
  async getHanyuCache(_word) { return null }
  async setHanyuCache(_cache) { /* no-op */ }
  async clearHanyuCache() { /* no-op */ }
}

function decodeWord(row) {
  if (!row) return row
  try { row.tagIds = row.tagIds ? JSON.parse(row.tagIds) : [] } catch { row.tagIds = [] }
  return row
}
