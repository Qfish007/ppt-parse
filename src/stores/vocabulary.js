import { reactive } from 'vue';
import { STORAGE_KEYS, VOCABULARY_LEVELS } from '../types/index.js';
import { vocabularyRepository } from '../repositories/index.js';

let vocabularyStoreInstance = null;

function generateBookId() {
  return 'book_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function normalizeWord(word) {
  return String(word || '').trim().toLowerCase();
}

function normalizePhonetic(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.startsWith('/') ? text : `/${text}/`;
}

function generateTagId() {
  return 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function normalizeTagName(name) {
  return String(name || '').trim();
}

function normalizeTag(tag) {
  const name = normalizeTagName(tag?.name);
  if (!name) return null;
  const now = Date.now();
  return {
    id: String(tag?.id || generateTagId()),
    name,
    createdAt: Number(tag?.createdAt) || now
  };
}

function normalizeBookName(name) {
  return String(name || '').trim();
}

function normalizeTagIds(tagIds) {
  return Array.isArray(tagIds)
    ? [...new Set(tagIds.map(id => String(id || '').trim()).filter(Boolean))]
    : [];
}

function normalizeMemoryParts(parts) {
  if (Array.isArray(parts)) {
    return parts.map(part => String(part || '').trim()).filter(Boolean);
  }
  return String(parts || '')
    .split(/[.\s/|,，、;；]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeEntry(entry) {
  const word = normalizeWord(entry?.word);
  if (!word) return null;
  const level = VOCABULARY_LEVELS.some(item => item.value === entry?.level)
    ? entry.level
    : 'unknown';
  const now = Date.now();
  return {
    word,
    phonetic: normalizePhonetic(entry?.phonetic),
    meaning: String(entry?.meaning || '').trim(),
    tagIds: normalizeTagIds(entry?.tagIds),
    memoryParts: normalizeMemoryParts(entry?.memoryParts),
    level,
    note: String(entry?.note || '').trim(),
    testTotalCount: Math.max(0, Number(entry?.testTotalCount) || 0),
    testCorrectCount: Math.max(0, Number(entry?.testCorrectCount) || 0),
    createdAt: Number(entry?.createdAt) || now,
    updatedAt: Number(entry?.updatedAt) || now
  };
}

function sortByAlphabet(entries) {
  return [...entries].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
}

function normalizeBook(book, fallbackName = '默认生词本') {
  const now = Date.now();
  const name = normalizeBookName(book?.name) || fallbackName;
  return {
    id: String(book?.id || generateBookId()),
    name,
    words: Array.isArray(book?.words)
      ? sortByAlphabet(book.words.map(normalizeEntry).filter(Boolean))
      : [],
    tags: Array.isArray(book?.tags)
      ? book.tags.map(normalizeTag).filter(Boolean)
      : [],
    createdAt: Number(book?.createdAt) || now,
    updatedAt: Number(book?.updatedAt) || now
  };
}

export function useVocabularyStore(options) {
  const lazy = !!(options && options.lazy);
  if (vocabularyStoreInstance) {
    if (!lazy && !vocabularyStoreInstance._loaded) {
      vocabularyStoreInstance.ensureLoaded();
    }
    return vocabularyStoreInstance;
  }

  const store = reactive({
    books: [],
    activeBookId: '',
    defaultBookId: '',
    statsVisible: true,
    words: [],
    tags: [],
    visibleColumns: {
      pronunciation: true,
      memory: true,
      tags: true,
      level: true,
      note: false
    },
    _loaded: false,

    async load() {
      if (this._loaded) return;

      this.books = [];
      let savedBooks = [];
      try {
        savedBooks = await vocabularyRepository.getBooks();
      } catch {
        savedBooks = [];
      }

      if (savedBooks.length === 0) {
        try {
          const legacyWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOCABULARY) || '[]');
          const legacyTags = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOCABULARY_TAGS) || '[]');
          if (legacyWords.length > 0 || legacyTags.length > 0) {
            const defaultBook = normalizeBook({
              id: 'default',
              name: '默认生词本',
              words: legacyWords,
              tags: legacyTags
            });
            await vocabularyRepository.saveBook(defaultBook);
            savedBooks = [defaultBook];
          }
        } catch {
        }
      }

      if (savedBooks.length === 0) {
        const defaultBook = normalizeBook({
          id: 'default',
          name: '默认生词本',
          words: [],
          tags: []
        });
        await vocabularyRepository.saveBook(defaultBook);
        savedBooks = [defaultBook];
      }

      this.books = savedBooks.map((book, index) =>
        normalizeBook(book, index === 0 ? '默认生词本' : `生词本 ${index + 1}`)
      ).filter(Boolean);

      const savedActiveBookId = await vocabularyRepository.getActiveBookId();
      const savedDefaultBookId = await vocabularyRepository.getDefaultBookId();
      this.defaultBookId = this.books.some(book => book.id === savedDefaultBookId)
        ? savedDefaultBookId
        : this.books[0].id;
      this.activeBookId = this.books.some(book => book.id === savedActiveBookId)
        ? savedActiveBookId
        : this.defaultBookId;
      this.statsVisible = await vocabularyRepository.getStatsVisible();
      this.visibleColumns = await vocabularyRepository.getVisibleColumns();
      this.syncActiveBook();
      this._loaded = true;
    },

    async ensureLoaded() {
      if (this._loaded) return;
      await this.load();
    },

    async save() {
      for (const book of this.books) {
        await vocabularyRepository.saveBook(book);
      }
      await vocabularyRepository.setActiveBookId(this.activeBookId);
      await vocabularyRepository.setDefaultBookId(this.defaultBookId);
      await vocabularyRepository.setStatsVisible(this.statsVisible);
      await vocabularyRepository.setVisibleColumns(this.visibleColumns);
    },

    syncActiveBook() {
      const activeBook = this.getActiveBook();
      this.words = activeBook?.words || [];
      this.tags = activeBook?.tags || [];
    },

    getActiveBook() {
      return this.books.find(book => book.id === this.activeBookId) || this.books[0] || null;
    },

    getDefaultBook() {
      return this.books.find(book => book.id === this.defaultBookId) || this.books[0] || null;
    },

    getBook(bookId) {
      return this.books.find(book => book.id === bookId) || null;
    },

    getTargetBook(target = 'active') {
      if (target === 'default') return this.getDefaultBook();
      const book = this.getBook(target);
      return book || this.getActiveBook();
    },

    async addBook(name) {
      const normalizedName = normalizeBookName(name);
      if (!normalizedName) return null;
      const existing = this.books.find(book => book.name === normalizedName);
      if (existing) return existing;
      const book = normalizeBook({ name: normalizedName });
      this.books.push(book);
      if (!this.activeBookId) this.activeBookId = book.id;
      if (!this.defaultBookId) this.defaultBookId = book.id;
      this.syncActiveBook();
      await this.save();
      return book;
    },

    async renameBook(bookId, name) {
      const book = this.getBook(bookId);
      const normalizedName = normalizeBookName(name);
      if (!book || !normalizedName) return null;
      const duplicate = this.books.find(item => item.id !== book.id && item.name === normalizedName);
      if (duplicate) return null;
      book.name = normalizedName;
      book.updatedAt = Date.now();
      await this.save();
      return book;
    },

    async removeBook(bookId) {
      const id = String(bookId || '');
      if (!id) return false;
      const idx = this.books.findIndex(b => b.id === id);
      if (idx < 0) return false;
      if (this.books.length <= 1) return false;

      this.books.splice(idx, 1);
      await vocabularyRepository.deleteBook(id);

      const firstId = this.books[0].id;
      if (!this.books.some(b => b.id === this.activeBookId)) {
        this.activeBookId = firstId;
      }
      if (!this.books.some(b => b.id === this.defaultBookId)) {
        this.defaultBookId = firstId;
      }

      this.syncActiveBook();
      await this.save();
      return true;
    },

    async setActiveBook(bookId) {
      if (!this.getBook(bookId)) return false;
      this.activeBookId = bookId;
      this.syncActiveBook();
      await this.save();
      return true;
    },

    async setDefaultBook(bookId) {
      if (!this.getBook(bookId)) return false;
      this.defaultBookId = bookId;
      await this.save();
      return true;
    },

    async setStatsVisible(visible) {
      this.statsVisible = Boolean(visible);
      await this.save();
    },

    async setVisibleColumns(columns) {
      this.visibleColumns = {
        pronunciation: Boolean(columns?.pronunciation) !== false,
        memory: Boolean(columns?.memory) !== false,
        tags: Boolean(columns?.tags) !== false,
        level: Boolean(columns?.level) !== false,
        note: Boolean(columns?.note) !== false
      };
      await this.save();
    },

    async addWord(entry, target = 'active') {
      const normalized = normalizeEntry(entry);
      if (!normalized) return null;
      const book = this.getTargetBook(target);
      if (!book) return null;

      const index = book.words.findIndex(item => item.word === normalized.word);
      if (index >= 0) {
        book.words[index] = {
          ...book.words[index],
          phonetic: normalized.phonetic || book.words[index].phonetic,
          meaning: normalized.meaning || book.words[index].meaning,
          tagIds: normalized.tagIds.length ? normalized.tagIds : (book.words[index].tagIds || []),
          memoryParts: normalized.memoryParts.length ? normalized.memoryParts : (book.words[index].memoryParts || []),
          updatedAt: Date.now()
        };
      } else {
        book.words.push(normalized);
      }
      book.words = sortByAlphabet(book.words);
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
      return book.words.find(item => item.word === normalized.word) || null;
    },

    async removeWord(word) {
      const book = this.getActiveBook();
      if (!book) return;
      const key = normalizeWord(word);
      book.words = book.words.filter(item => item.word !== key);
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
    },

    async updateLevel(word, level, target = 'active') {
      const book = this.getTargetBook(target);
      if (!book) return;
      const key = normalizeWord(word);
      const entry = book.words.find(item => item.word === key);
      if (!entry || !VOCABULARY_LEVELS.some(item => item.value === level)) return;
      entry.level = level;
      entry.updatedAt = Date.now();
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
    },

    async recordTestResult(word, isCorrect, target = 'default') {
      const book = this.getTargetBook(target);
      if (!book) return null;
      const key = normalizeWord(word);
      const entry = book.words.find(item => item.word === key);
      if (!entry) return null;
      entry.testTotalCount = Math.max(0, Number(entry.testTotalCount) || 0) + 1;
      entry.testCorrectCount = Math.max(0, Number(entry.testCorrectCount) || 0) + (isCorrect ? 1 : 0);
      entry.level = isCorrect ? 'mastered' : 'unknown';
      entry.updatedAt = Date.now();
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
      return entry;
    },

    async updateWord(word, updates = {}) {
      const book = this.getActiveBook();
      if (!book) return null;
      const key = normalizeWord(word);
      const entry = book.words.find(item => item.word === key);
      if (!entry) return null;
      if (typeof updates.phonetic === 'string') entry.phonetic = normalizePhonetic(updates.phonetic);
      if (typeof updates.meaning === 'string') entry.meaning = updates.meaning.trim();
      if (typeof updates.note === 'string') entry.note = updates.note.trim();
      if (VOCABULARY_LEVELS.some(item => item.value === updates.level)) entry.level = updates.level;
      if (Array.isArray(updates.tagIds)) {
        const allowed = new Set(book.tags.map(tag => tag.id));
        entry.tagIds = normalizeTagIds(updates.tagIds).filter(id => allowed.has(id));
      }
      if (Array.isArray(updates.memoryParts) || typeof updates.memoryParts === 'string') {
        entry.memoryParts = normalizeMemoryParts(updates.memoryParts);
      }
      entry.updatedAt = Date.now();
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
      return entry;
    },

    async addTag(name) {
      const book = this.getActiveBook();
      if (!book) return null;
      const normalizedName = normalizeTagName(name);
      if (!normalizedName) return null;
      const existing = book.tags.find(tag => tag.name === normalizedName);
      if (existing) return existing;
      const tag = normalizeTag({ name: normalizedName });
      book.tags.push(tag);
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
      return tag;
    },

    async removeTag(id) {
      const book = this.getActiveBook();
      if (!book) return;
      const key = String(id || '');
      book.tags = book.tags.filter(tag => tag.id !== key);
      book.words = book.words.map(word => ({
        ...word,
        tagIds: normalizeTagIds(word.tagIds).filter(tagId => tagId !== key)
      }));
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
    },

    async updateWordTags(word, tagIds) {
      const book = this.getActiveBook();
      if (!book) return;
      const key = normalizeWord(word);
      const allowed = new Set(book.tags.map(tag => tag.id));
      const entry = book.words.find(item => item.word === key);
      if (!entry) return;
      entry.tagIds = normalizeTagIds(tagIds).filter(id => allowed.has(id));
      entry.updatedAt = Date.now();
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
    },

    async batchUpdateWords(words, updates = {}) {
      const book = this.getActiveBook();
      if (!book) return;
      const now = Date.now();
      const allowedTags = new Set(book.tags.map(tag => tag.id));
      for (const word of words) {
        const key = normalizeWord(word);
        const entry = book.words.find(item => item.word === key);
        if (!entry) continue;
        if (typeof updates.phonetic === 'string') entry.phonetic = normalizePhonetic(updates.phonetic);
        if (typeof updates.meaning === 'string') entry.meaning = updates.meaning.trim();
        if (typeof updates.note === 'string') entry.note = updates.note.trim();
        if (VOCABULARY_LEVELS.some(item => item.value === updates.level)) entry.level = updates.level;
        if (Array.isArray(updates.tagIds)) {
          entry.tagIds = normalizeTagIds(updates.tagIds).filter(id => allowedTags.has(id));
        }
        if (Array.isArray(updates.memoryParts) || typeof updates.memoryParts === 'string') {
          entry.memoryParts = normalizeMemoryParts(updates.memoryParts);
        }
        entry.updatedAt = now;
      }
      book.updatedAt = now;
      this.syncActiveBook();
      await this.save();
    },

    async batchRemoveWords(words) {
      const book = this.getActiveBook();
      if (!book) return;
      const keys = new Set(words.map(word => normalizeWord(word)));
      book.words = book.words.filter(item => !keys.has(item.word));
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
    },

    async importWords(entries, target = 'active') {
      const list = Array.isArray(entries) ? entries : [];
      const book = this.getTargetBook(target);
      if (!book) return 0;

      let count = 0;
      const seen = new Set(book.words.map(w => w.word));
      for (const entry of list) {
        const normalized = normalizeEntry(entry);
        if (!normalized) continue;
        if (seen.has(normalized.word)) continue;

        seen.add(normalized.word);
        book.words.push(normalized);
        count++;
      }

      book.words = sortByAlphabet(book.words);
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();

      return count;
    },

    async importTags(tags) {
      const book = this.getActiveBook();
      if (!book) return 0;
      const list = Array.isArray(tags) ? tags : [];
      let count = 0;
      list.forEach(tag => {
        const normalized = normalizeTag(tag);
        if (!normalized) return;
        const existing = book.tags.find(item => item.id === normalized.id || item.name === normalized.name);
        if (!existing) {
          book.tags.push(normalized);
          count += 1;
        }
      });
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
      return count;
    }
  });

  if (!lazy) store.load();
  vocabularyStoreInstance = store;
  return store;
}