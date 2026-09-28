import { STORAGE_KEYS } from '../types/index.js';
import { settingsRepository, vocabularyRepository, wordCacheRepository, projectsRepository, bookEditsRepository } from '../repositories/index.js';
import { ensureReady, run as sqliteRun, flush as sqliteFlush } from './sqlite.js';

const MIGRATION_KEY = 'bilingual-reader-migration-done';
const DEXIE_MIGRATION_KEY = 'dexie-to-sqlite-done';

// Dexie → SQLite 一次性迁移：从旧 IndexedDB (Dexie) 读取全部数据写入 OPFS SQLite
export async function migrateFromDexie() {
  await ensureReady();
  const done = (await settingsRepository.get(DEXIE_MIGRATION_KEY)) === 'true';
  if (done) return;

  try {
    const { db } = await import('./database.js');
    await db.open();

    // settings（排除迁移标记键，避免重复）
    const oldSettings = await db.settings.toArray();
    for (const item of oldSettings) {
      if (item.key === DEXIE_MIGRATION_KEY) continue;
      sqliteRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [item.key, String(item.value ?? '')]);
    }

    // vocabulary
    const vBooks = await db.vocabularyBooks.toArray();
    for (const book of vBooks) {
      sqliteRun('INSERT OR REPLACE INTO vocabulary_books (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [
        book.id, book.name, Number(book.createdAt) || Date.now(), Number(book.updatedAt) || Date.now()
      ]);
    }
    const vWords = await db.vocabularyWords.toArray();
    for (const w of vWords) {
      sqliteRun(`INSERT OR REPLACE INTO vocabulary_words
        (word, bookId, meaning, tagIds, memoryParts, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        w.word, w.bookId, String(w.meaning || ''),
        JSON.stringify([...(w.tagIds || [])]),
        JSON.stringify([...(w.memoryParts || [])]),
        w.level || 'unknown', String(w.note || ''),
        Number(w.testTotalCount) || 0, Number(w.testCorrectCount) || 0,
        Number(w.createdAt) || Date.now(), Number(w.updatedAt) || Date.now()
      ]);
    }
    const vTags = await db.vocabularyTags.toArray();
    for (const t of vTags) {
      sqliteRun('INSERT OR REPLACE INTO vocabulary_tags (id, bookId, name, createdAt) VALUES (?, ?, ?, ?)', [
        t.id, t.bookId, t.name, Number(t.createdAt) || Date.now()
      ]);
    }

    // chinese
    const cBooks = await db.chineseBooks.toArray();
    for (const book of cBooks) {
      sqliteRun('INSERT OR REPLACE INTO chinese_books (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [
        book.id, book.name, Number(book.createdAt) || Date.now(), Number(book.updatedAt) || Date.now()
      ]);
    }
    const cWords = await db.chineseWords.toArray();
    for (const w of cWords) {
      // 迁移时丢弃 audio/cihui/liju 等详情字段（schema 中已无这些列）
      sqliteRun(`INSERT OR REPLACE INTO chinese_words
        (word, bookId, meaning, pinyin, tagIds, level, note, testTotalCount, testCorrectCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        w.word, w.bookId, String(w.meaning || ''), String(w.pinyin || ''),
        JSON.stringify([...(w.tagIds || [])]),
        w.level || 'unknown', String(w.note || ''),
        Number(w.testTotalCount) || 0, Number(w.testCorrectCount) || 0,
        Number(w.createdAt) || Date.now(), Number(w.updatedAt) || Date.now()
      ]);
    }
    const cTags = await db.chineseTags.toArray();
    for (const t of cTags) {
      sqliteRun('INSERT OR REPLACE INTO chinese_tags (id, bookId, name, createdAt) VALUES (?, ?, ?, ?)', [
        t.id, t.bookId, t.name, Number(t.createdAt) || Date.now()
      ]);
    }

    // projects
    const projects = await db.projects.toArray();
    for (const p of projects) {
      sqliteRun('INSERT OR REPLACE INTO projects (id, sort_index, name, type, createdAt) VALUES (?, ?, ?, ?, ?)', [
        p.id, Number(p.index) || 0, p.name, p.type, Number(p.createdAt) || Date.now()
      ]);
    }

    // book_edits
    const edits = await db.bookEdits.toArray();
    for (const e of edits) {
      sqliteRun('INSERT OR REPLACE INTO book_edits (title, pages, updatedAt) VALUES (?, ?, ?)', [
        e.title, e.pages !== undefined ? JSON.stringify(e.pages) : null, Number(e.updatedAt) || Date.now()
      ]);
    }

    sqliteRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'true')", [DEXIE_MIGRATION_KEY]);
    await sqliteFlush();
    console.log('Dexie → SQLite migration completed');
  } catch (error) {
    console.error('Dexie migration failed (continuing with empty DB):', error);
  }
}

export async function migrateFromLocalStorage() {
  await migrateFromDexie();

  const migrated = localStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') return;

  try {
    await migrateSettings();
    await migrateVocabulary();
    await migrateWordCache();
    await migrateProjects();
    await migrateBookEdits();

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Migration from localStorage completed');
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