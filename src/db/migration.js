import { STORAGE_KEYS } from '../types/index.js';
import { settingsRepository, vocabularyRepository, wordCacheRepository, projectsRepository, bookEditsRepository } from '../repositories/index.js';

const MIGRATION_KEY = 'bilingual-reader-migration-done';

export async function migrateFromLocalStorage() {
  const migrated = localStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') return;

  try {
    await migrateSettings();
    await migrateVocabulary();
    await migrateWordCache();
    await migrateProjects();
    await migrateBookEdits();

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Migration from localStorage to Dexie.js completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function migrateSettings() {
  const keys = [
    { local: STORAGE_KEYS.RATE, dexie: STORAGE_KEYS.RATE },
    { local: STORAGE_KEYS.PROVIDER, dexie: STORAGE_KEYS.PROVIDER },
    { local: STORAGE_KEYS.BODY_FONT_SIZE, dexie: STORAGE_KEYS.BODY_FONT_SIZE }
  ];

  for (const { local, dexie } of keys) {
    const value = localStorage.getItem(local);
    if (value !== null) {
      await settingsRepository.set(dexie, value);
    }
  }
}

async function migrateVocabulary() {
  try {
    const savedBooks = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOCABULARY_BOOKS) || '[]');
    if (Array.isArray(savedBooks) && savedBooks.length > 0) {
      for (const book of savedBooks) {
        await vocabularyRepository.saveBook(book);
      }
    } else {
      const legacyWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOCABULARY) || '[]');
      const legacyTags = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOCABULARY_TAGS) || '[]');
      if (legacyWords.length > 0 || legacyTags.length > 0) {
        const defaultBook = {
          id: 'default',
          name: '默认生词本',
          words: legacyWords,
          tags: legacyTags,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await vocabularyRepository.saveBook(defaultBook);
      }
    }

    const activeBookId = localStorage.getItem(STORAGE_KEYS.VOCABULARY_ACTIVE_BOOK);
    if (activeBookId) {
      await vocabularyRepository.setActiveBookId(activeBookId);
    }

    const defaultBookId = localStorage.getItem(STORAGE_KEYS.VOCABULARY_DEFAULT_BOOK);
    if (defaultBookId) {
      await vocabularyRepository.setDefaultBookId(defaultBookId);
    }

    const statsVisible = localStorage.getItem(STORAGE_KEYS.VOCABULARY_STATS_VISIBLE);
    if (statsVisible !== null) {
      await vocabularyRepository.setStatsVisible(statsVisible !== 'false');
    }
  } catch {
    console.warn('Vocabulary migration skipped due to parse error');
  }
}

async function migrateWordCache() {
  try {
    const savedTranslations = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORD_TRANSLATIONS) || '{}');
    for (const [word, data] of Object.entries(savedTranslations)) {
      if (typeof data === 'string') {
        await wordCacheRepository.saveTranslation(word, data);
      } else if (data && typeof data === 'object') {
        await wordCacheRepository.saveTranslation(word, data.meaning || '', data.phonetic || '');
      }
    }

    const savedPhonetics = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORD_PHONETICS) || '{}');
    for (const [word, phonetic] of Object.entries(savedPhonetics)) {
      if (typeof phonetic === 'string') {
        await wordCacheRepository.savePhonetic(word, phonetic);
      }
    }
  } catch {
    console.warn('Word cache migration skipped due to parse error');
  }
}

async function migrateProjects() {
  try {
    const savedProjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || 'null');
    if (Array.isArray(savedProjects) && savedProjects.length > 0) {
      for (const project of savedProjects) {
        await projectsRepository.saveProject(project);
      }
    }

    const activeProject = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT);
    if (activeProject) {
      await projectsRepository.setActiveProjectId(activeProject);
    }
  } catch {
    console.warn('Projects migration skipped due to parse error');
  }
}

async function migrateBookEdits() {
  try {
    const savedEdits = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOK_EDITS) || 'null');
    if (savedEdits && savedEdits.title) {
      await bookEditsRepository.saveEdits(savedEdits);
    }
  } catch {
    console.warn('Book edits migration skipped due to parse error');
  }
}