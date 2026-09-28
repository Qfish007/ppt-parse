import { IProjectsRepository } from '../IProjectsRepository.js'
import { ensureReady, query, queryOne, run } from '../../db/sqlite.js'

export class SqliteProjectsRepository extends IProjectsRepository {
  async getProjects() {
    await ensureReady()
    const rows = query('SELECT id, sort_index, name, type, createdAt FROM projects ORDER BY sort_index', [])
    return rows.map(row => ({ ...row, index: row.sort_index }))
  }

  async getProject(id) {
    await ensureReady()
    const row = queryOne('SELECT id, sort_index, name, type, createdAt FROM projects WHERE id = ?', [id])
    return row ? { ...row, index: row.sort_index } : null
  }

  async saveProject(project) {
    await ensureReady()
    run('INSERT OR REPLACE INTO projects (id, sort_index, name, type, createdAt) VALUES (?, ?, ?, ?, ?)', [
      String(project.id || ''),
      Number(project.index) || 0,
      String(project.name || ''),
      String(project.type || ''),
      Number(project.createdAt) || Date.now()
    ])
    return project
  }

  async deleteProject(id) {
    await ensureReady()
    run('DELETE FROM projects WHERE id = ?', [id])
  }

  async getActiveProjectId() {
    await ensureReady()
    const row = queryOne("SELECT value FROM settings WHERE key = 'activeProject'", [])
    return row ? row.value : undefined
  }

  async setActiveProjectId(id) {
    await ensureReady()
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('activeProject', ?)", [String(id)])
  }
}
