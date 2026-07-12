import { reactive } from 'vue';
import { STORAGE_KEYS } from '../types/index.js';

let projectsStoreInstance = null;

/** 默认项目：《新标准小学衔接读本》，索引固定为001，不可删除 */
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

/**
 * 生成唯一ID
 */
function generateId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 获取下一个可用的索引号（三位数字字符串）
 */
function getNextIndex(projects) {
  const indexes = projects
    .map(p => parseInt(p.index, 10))
    .filter(n => !isNaN(n));
  const maxIndex = indexes.length > 0 ? Math.max(...indexes) : 0;
  return String(maxIndex + 1).padStart(3, '0');
}

/**
 * 项目 store
 */
export function useProjectsStore() {
  if (projectsStoreInstance) return projectsStoreInstance;

  const store = reactive({
    /** 项目列表 */
    projects: [],
    /** 当前选中的项目ID */
    activeProjectId: null,
    /** 是否正在解析 */
    isParsing: false,
    /** 解析进度 */
    parseProgress: { current: 0, total: 0, message: '' },

    /**
     * 加载项目列表（含旧数据迁移）
     */
    loadProjects() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || 'null');
        if (Array.isArray(saved) && saved.length > 0) {
          // 迁移旧数据：确保每个项目都有 index 和 deletable 字段
          this.projects = saved.map((p, idx) => ({
            ...p,
            index: p.index || (idx === 0 ? '001' : String(idx + 1).padStart(3, '0')),
            deletable: p.id === 'default-book' ? false : (p.deletable !== false)
          }));
          this.saveProjects();
        } else {
          this.projects = [...defaultProjects];
          this.saveProjects();
        }
      } catch {
        this.projects = [...defaultProjects];
        this.saveProjects();
      }
      // 确保默认书籍始终在第一位
      if (!this.projects.find(p => p.id === 'default-book')) {
        this.projects.unshift({ ...defaultProjects[0] });
        this.saveProjects();
      }
      this.activeProjectId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT) || defaultProjects[0].id;
    },

    /**
     * 保存项目列表到 localStorage
     */
    saveProjects() {
      try {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
      } catch {
        // localStorage may be unavailable
      }
    },

    /**
     * 设置当前活跃项目
     */
    setActiveProject(id) {
      this.activeProjectId = id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, id);
    },

    /**
     * 获取当前活跃项目
     */
    getActiveProject() {
      return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0] || null;
    },

    /**
     * 添加新项目
     */
    addProject(projectData) {
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
      this.saveProjects();
      return project;
    },

    /**
     * 更新项目
     */
    updateProject(id, updates) {
      const index = this.projects.findIndex(p => p.id === id);
      if (index === -1) return null;
      this.projects[index] = { ...this.projects[index], ...updates };
      this.saveProjects();
      return this.projects[index];
    },

    /**
     * 删除项目
     */
    removeProject(id) {
      const project = this.projects.find(p => p.id === id);
      if (!project || project.deletable === false) return false;

      const index = this.projects.findIndex(p => p.id === id);
      if (index === -1) return false;

      this.projects.splice(index, 1);
      if (this.activeProjectId === id) {
        this.activeProjectId = this.projects[0]?.id || null;
        if (this.activeProjectId) {
          localStorage.setItem(ACTIVE_PROJECT_KEY, this.activeProjectId);
        } else {
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
        }
      }
      this.saveProjects();
      return true;
    },

    /**
     * 设置解析状态
     */
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
