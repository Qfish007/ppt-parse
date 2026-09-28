import { ISettingsRepository } from '../ISettingsRepository.js'
import { ensureReady, query, queryOne, run } from '../../db/sqlite.js'

export class SqliteSettingsRepository extends ISettingsRepository {
  async get(key) {
    await ensureReady()
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key])
    return row ? row.value : undefined
  }

  async set(key, value) {
    await ensureReady()
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)])
    return value
  }

  async getAll() {
    await ensureReady()
    const rows = query('SELECT key, value FROM settings', [])
    return rows.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {})
  }

  async delete(key) {
    await ensureReady()
    run('DELETE FROM settings WHERE key = ?', [key])
  }
}
