import { reactive } from 'vue';
import { projectsRepository } from '../repositories/index.js';

let projectsStoreInstance = null;

const defaultProjects = [
  {
    id: 'default-book',
    index: '001',
    name: '《新标准小学衔接读本》',
    type: 'default',
    createdAt: Date.now(),
    source: 'built-in',
    pageCount: 97,
    deletable: false
  }
];

function generateId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getNextIndex(projects) {
  const indexes = projects
    .map(p => parseInt(p.index, 10))
    .filter(n => !isNaN(n));
  const maxIndex = indexes.length > 0 ? Math.max(...indexes) : 0;
  return String(maxIndex + 1).padStart(3, '0');
}

export function useProjectsStore() {
  if (projectsStoreInstance) return projectsStoreInstance;

  const store = reactive({
    projects: [],
    activeProjectId: null,
    isParsing: false,
    parseProgress: { current: 0, total: 0, message: '' },
    _loaded: false,

    async loadProjects() {
      if (this._loaded) return;

      let savedProjects = [];
      try {
        savedProjects = await projectsRepository.getProjects();
      } catch {
        savedProjects = [];
      }

      if (savedProjects.length > 0) {
        this.projects = savedProjects.map((p, idx) => ({
          ...p,
          index: p.index || (idx === 0 ? '001' : String(idx + 1).padStart(3, '0')),
          deletable: p.id === 'default-book' ? false : (p.deletable !== false)
        }));
        await this.saveProjects();
      } else {
        this.projects = [...defaultProjects];
        await this.saveProjects();
      }

      if (!this.projects.find(p => p.id === 'default-book')) {
        this.projects.unshift({ ...defaultProjects[0] });
        await this.saveProjects();
      }

      const savedActiveProject = await projectsRepository.getActiveProjectId();
      this.activeProjectId = savedActiveProject || defaultProjects[0].id;
      this._loaded = true;
    },

    async saveProjects() {
      try {
        for (const project of this.projects) {
          await projectsRepository.saveProject(project);
        }
      } catch {
      }
    },

    async setActiveProject(id) {
      this.activeProjectId = id;
      await projectsRepository.setActiveProjectId(id);
    },

    getActiveProject() {
      return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0] || null;
    },

    async addProject(projectData) {
      const index = getNextIndex(this.projects);
      const project = {
        id: generateId(),
        index,
        name: projectData.name || '未命名项目',
        type: projectData.type || 'image',
        createdAt: Date.now(),
        source: projectData.source || 'user',
        pageCount: projectData.pageCount || 0,
        files: projectData.files || [],
        parsedData: projectData.parsedData || null,
        status: projectData.status || 'empty',
        deletable: true
      };
      this.projects.push(project);
      await this.saveProjects();
      return project;
    },

    async updateProject(id, updates) {
      const index = this.projects.findIndex(p => p.id === id);
      if (index === -1) return null;
      this.projects[index] = { ...this.projects[index], ...updates };
      await this.saveProjects();
      return this.projects[index];
    },

    async removeProject(id) {
      const project = this.projects.find(p => p.id === id);
      if (!project || project.deletable === false) return false;

      const index = this.projects.findIndex(p => p.id === id);
      if (index === -1) return false;

      this.projects.splice(index, 1);
      await projectsRepository.deleteProject(id);

      if (this.activeProjectId === id) {
        this.activeProjectId = this.projects[0]?.id || null;
        if (this.activeProjectId) {
          await projectsRepository.setActiveProjectId(this.activeProjectId);
        }
      }
      await this.saveProjects();
      return true;
    },

    setParsingState(isParsing, progress = null) {
      this.isParsing = isParsing;
      if (progress) {
        this.parseProgress = { ...this.parseProgress, ...progress };
      }
    }
  });

  store.loadProjects();
  projectsStoreInstance = store;
  return store;
}