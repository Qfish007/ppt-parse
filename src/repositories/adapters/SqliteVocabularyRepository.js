import { IVocabularyRepository } from '../IVocabularyRepository.js'
import { ensureReady, query, queryOne, run } from '../../db/sqlite.js'

export class SqliteVocabularyRepository extends IVocabularyRepository {
  async getBooks() {
    await ensureReady()
    const books = query('SELECT id, name, createdAt, updatedAt FROM vocabulary_books ORDER BY createdAt', [])
    for (const book of books) {
      book.words = query('SELECT word, meaning, tagIds, memoryParts, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt, bookId FROM vocabulary_words WHERE bookId = ?', [book.id])
        .map(decodeWord)
      book.tags = query('SELECT id, bookId, name, createdAt FROM vocabulary_tags WHERE bookId = ?', [book.id])
    }
    return books
  }

  async getBook(id) {
    await ensureReady()
    const book = queryOne('SELECT id, name, createdAt, updatedAt FROM vocabulary_books WHERE id = ?', [id])
    if (!book) return null
    book.words = query('SELECT word, meaning, tagIds, memoryParts, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt, bookId FROM vocabulary_words WHERE bookId = ?', [id])
      .map(decodeWord)
    book.tags = query('SELECT id, bookId, name, createdAt FROM vocabulary_tags WHERE bookId = ?', [id])
    return book
  }

  async saveBook(book) {
    await ensureReady()
    const { words = [], tags = [], ...bookData } = book
    run('INSERT OR REPLACE INTO vocabulary_books (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [
      bookData.id, bookData.name,
      Number(bookData.createdAt) || Date.now(),
      Number(bookData.updatedAt) || Date.now()
    ])
    run('DELETE FROM vocabulary_words WHERE bookId = ?', [book.id])
    for (const word of words) {
      run(`INSERT OR REPLACE INTO vocabulary_words
        (word, bookId, meaning, tagIds, memoryParts, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        word.word, book.id,
        String(word.meaning || ''),
        JSON.stringify([...(word.tagIds || [])]),
        JSON.stringify([...(word.memoryParts || [])]),
        word.level || 'unknown',
        String(word.note || ''),
        Number(word.testTotalCount) || 0,
        Number(word.testCorrectCount) || 0,
        Number(word.createdAt) || Date.now(),
        Number(word.updatedAt) || Date.now()
      ])
    }
    run('DELETE FROM vocabulary_tags WHERE bookId = ?', [book.id])
    for (const tag of tags) {
      run('INSERT OR REPLACE INTO vocabulary_tags (id, bookId, name, createdAt) VALUES (?, ?, ?, ?)', [
        tag.id, book.id, tag.name, Number(tag.createdAt) || Date.now()
      ])
    }
    return book
  }

  async deleteBook(id) {
    await ensureReady()
    run('DELETE FROM vocabulary_words WHERE bookId = ?', [id])
    run('DELETE FROM vocabulary_tags WHERE bookId = ?', [id])
    run('DELETE FROM vocabulary_books WHERE id = ?', [id])
  }

  async getWordsByBook(bookId) {
    await ensureReady()
    return query('SELECT word, meaning, tagIds, memoryParts, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt, bookId FROM vocabulary_words WHERE bookId = ?', [bookId])
      .map(decodeWord)
  }

  async saveWord(word) {
    await ensureReady()
    run(`INSERT OR REPLACE INTO vocabulary_words
      (word, bookId, meaning, tagIds, memoryParts, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      word.word, word.bookId,
      String(word.meaning || ''),
      JSON.stringify([...(word.tagIds || [])]),
      JSON.stringify([...(word.memoryParts || [])]),
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
    run('DELETE FROM vocabulary_words WHERE word = ?', [word])
  }

  async getTagsByBook(bookId) {
    await ensureReady()
    return query('SELECT id, bookId, name, createdAt FROM vocabulary_tags WHERE bookId = ?', [bookId])
  }

  async saveTag(tag) {
    await ensureReady()
    run('INSERT OR REPLACE INTO vocabulary_tags (id, bookId, name, createdAt) VALUES (?, ?, ?, ?)', [
      tag.id, tag.bookId, tag.name, Number(tag.createdAt) || Date.now()
    ])
    return tag
  }

  async deleteTag(id) {
    await ensureReady()
    run('DELETE FROM vocabulary_tags WHERE id = ?', [id])
  }

  async getActiveBookId() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'vocabularyActiveBook'", [])
    return row ? row.value : undefined
  }

  async setActiveBookId(id) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('vocabularyActiveBook', ?)", [String(id)])
  }

  async getDefaultBookId() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'vocabularyDefaultBook'", [])
    return row ? row.value : undefined
  }

  async setDefaultBookId(id) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('vocabularyDefaultBook', ?)", [String(id)])
  }

  async getStatsVisible() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'vocabularyStatsVisible'", [])
    return row?.value !== 'false'
  }

  async setStatsVisible(visible) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('vocabularyStatsVisible', ?)", [String(visible)])
  }

  async getVisibleColumns() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'vocabularyVisibleColumns'", [])
    if (row?.value) {
      try { return JSON.parse(row.value) } catch { /* ignore */ }
    }
    return { memory: true, tags: true, level: true, note: false, testStats: false }
  }

  async setVisibleColumns(columns) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('vocabularyVisibleColumns', ?)", [JSON.stringify(columns)])
  }

  async getTagFilterRelation() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'vocabularyTagFilterRelation'", [])
    return row?.value === 'or' ? 'or' : 'and'
  }

  async setTagFilterRelation(relation) {
    await ensureReady()
    const value = relation === 'or' ? 'or' : 'and'
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('vocabularyTagFilterRelation', ?)", [value])
  }
}

function decodeWord(row) {
  if (!row) return row
  try { row.tagIds = row.tagIds ? JSON.parse(row.tagIds) : [] } catch { row.tagIds = [] }
  try { row.memoryParts = row.memoryParts ? JSON.parse(row.memoryParts) : [] } catch { row.memoryParts = [] }
  return row
}
