import { ensureReady, queryOne, run } from '../../db/sqlite.js'

export class SqliteBookEditsRepository {
  async getEdits(title) {
    await ensureReady()
    const row = queryOne('SELECT title, pages, updatedAt FROM book_edits WHERE title = ?', [title])
    if (!row) return null
    try {
      row.pages = row.pages ? JSON.parse(row.pages) : null
    } catch {
      row.pages = null
    }
    return row
  }

  async saveEdits(book) {
    await ensureReady()
    const pages = book.pages !== undefined ? JSON.stringify(book.pages) : null
    run('INSERT OR REPLACE INTO book_edits (title, pages, updatedAt) VALUES (?, ?, ?)', [
      String(book.title || ''),
      pages,
      Date.now()
    ])
  }

  async deleteEdits(title) {
    await ensureReady()
    run('DELETE FROM book_edits WHERE title = ?', [title])
  }
}
