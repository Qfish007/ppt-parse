import { IProjectsRepository } from '../IProjectsRepository.js';
import { db } from '../../db/database.js';

export class DexieProjectsRepository extends IProjectsRepository {
  async getProjects() {
    return await db.projects.toArray();
  }

  async getProject(id) {
    return await db.projects.get(id);
  }

  async saveProject(project) {
    await db.projects.put(project);
    return project;
  }

  async deleteProject(id) {
    await db.projects.delete(id);
  }

  async getActiveProjectId() {
    const result = await db.settings.get('activeProject');
    return result?.value;
  }

  async setActiveProjectId(id) {
    await db.settings.put({ key: 'activeProject', value: id });
  }
}