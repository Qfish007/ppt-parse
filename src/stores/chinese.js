import { reactive } from 'vue';
import { STORAGE_KEYS, CHINESE_LEVELS } from '../types/index.js';
import { chineseRepository } from '../repositories/index.js';

let chineseStoreInstance = null;

function generateBookId() {
  return 'cnbook_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function generateWordId() {
  return 'cnword_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function generateTagId() {
  return 'cntag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// 中文不区分大小写；trim 空白；不去 toLowerCase
function normalizeWord(word) {
  return String(word || '').trim();
}

function normalizePinyin(value) {
  return String(value || '').trim();
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

function isValidLevel(level) {
  return CHINESE_LEVELS.some(item => item.value === level);
}

function normalizeEntry(entry) {
  const word = normalizeWord(entry?.word);
  if (!word) return null;
  const level = isValidLevel(entry?.level) ? entry.level : 'unknown';
  const now = Date.now();
  return {
    id: String(entry?.id || generateWordId()),
    word,
    pinyin: normalizePinyin(entry?.pinyin),
    audio: String(entry?.audio || '').trim(),
    meaning: String(entry?.meaning || '').trim(),
    cihui: String(entry?.cihui || '').trim(),
    liju: String(entry?.liju || '').trim(),
    idiomStory: String(entry?.idiomStory || '').trim(),
    synonyms: String(entry?.synonyms || '').trim(),
    antonyms: String(entry?.antonyms || '').trim(),
    sameMeaningDiffForm: String(entry?.sameMeaningDiffForm || '').trim(),
    chuchu: String(entry?.chuchu || '').trim(),
    yinzhen: String(entry?.yinzhen || '').trim(),
    tagIds: normalizeTagIds(entry?.tagIds),
    level,
    note: String(entry?.note || '').trim(),
    // 测试次数保留字段但无修改入口（用户要求去掉测试功能）
    testTotalCount: Math.max(0, Number(entry?.testTotalCount) || 0),
    testCorrectCount: Math.max(0, Number(entry?.testCorrectCount) || 0),
    createdAt: Number(entry?.createdAt) || now,
    updatedAt: Number(entry?.updatedAt) || now
  };
}

// 中文按拼音字母排序；拼音相同时按创建时间
function sortByPinyin(entries) {
  return [...entries].sort((a, b) => {
    const pa = a.pinyin || '';
    const pb = b.pinyin || '';
    if (pa && pb) return pa.localeCompare(pb, 'zh');
    if (pa) return -1;
    if (pb) return 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function sortTags(tags) {
  return [...tags].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    const numA = parseInt(nameA.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(nameB.match(/\d+/)?.[0] || '0', 10);
    if (numA !== numB) return numA - numB;
    return nameA.localeCompare(nameB, 'zh');
  });
}

function normalizeBook(book, fallbackName = '默认中文生词本') {
  const now = Date.now();
  const name = normalizeBookName(book?.name) || fallbackName;
  return {
    id: String(book?.id || generateBookId()),
    name,
    words: Array.isArray(book?.words)
      ? sortByPinyin(book.words.map(normalizeEntry).filter(Boolean))
      : [],
    tags: Array.isArray(book?.tags)
      ? sortTags(book.tags.map(normalizeTag).filter(Boolean))
      : [],
    createdAt: Number(book?.createdAt) || now,
    updatedAt: Number(book?.updatedAt) || now
  };
}

export function useChineseStore(options) {
  const lazy = !!(options && options.lazy);
  if (chineseStoreInstance) {
    if (!lazy && !chineseStoreInstance._loaded) {
      chineseStoreInstance.ensureLoaded();
    }
    return chineseStoreInstance;
  }

  const store = reactive({
    books: [],
    activeBookId: '',
    defaultBookId: '',
    statsVisible: true,
    words: [],
    tags: [],
    visibleColumns: {
      pinyin: true,
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
        savedBooks = await chineseRepository.getBooks();
      } catch {
        savedBooks = [];
      }

      if (savedBooks.length === 0) {
        try {
          const legacyWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHINESE) || '[]');
          const legacyTags = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHINESE_TAGS) || '[]');
          if (legacyWords.length > 0 || legacyTags.length > 0) {
            const defaultBook = normalizeBook({
              id: 'default',
              name: '默认中文生词本',
              words: legacyWords,
              tags: legacyTags
            });
            await chineseRepository.saveBook(defaultBook);
            savedBooks = [defaultBook];
          }
        } catch {
          // ignore legacy parse errors
        }
      }

      if (savedBooks.length === 0) {
        const defaultBook = normalizeBook({
          id: 'default',
          name: '默认中文生词本',
          words: [],
          tags: []
        });
        await chineseRepository.saveBook(defaultBook);
        savedBooks = [defaultBook];
      }

      this.books = savedBooks.map((book, index) =>
        normalizeBook(book, index === 0 ? '默认中文生词本' : `中文生词本 ${index + 1}`)
      ).filter(Boolean);

      const savedActiveBookId = await chineseRepository.getActiveBookId();
      const savedDefaultBookId = await chineseRepository.getDefaultBookId();
      this.defaultBookId = this.books.some(book => book.id === savedDefaultBookId)
        ? savedDefaultBookId
        : this.books[0].id;
      this.activeBookId = this.books.some(book => book.id === savedActiveBookId)
        ? savedActiveBookId
        : this.defaultBookId;
      this.statsVisible = await chineseRepository.getStatsVisible();
      this.visibleColumns = await chineseRepository.getVisibleColumns();
      this.syncActiveBook();
      this._loaded = true;
    },

    async ensureLoaded() {
      if (this._loaded) return;
      await this.load();
    },

    async save() {
      for (const book of this.books) {
        await chineseRepository.saveBook(book);
      }
      await chineseRepository.setActiveBookId(this.activeBookId);
      await chineseRepository.setDefaultBookId(this.defaultBookId);
      await chineseRepository.setStatsVisible(this.statsVisible);
      await chineseRepository.setVisibleColumns(this.visibleColumns);
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
      await chineseRepository.deleteBook(id);

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
        pinyin: Boolean(columns?.pinyin) !== false,
        tags: Boolean(columns?.tags) !== false,
        level: Boolean(columns?.level) !== false,
        note: Boolean(columns?.note) === true
      };
      await this.save();
    },

    async addWord(entry, target = 'active') {
      const normalized = normalizeEntry(entry);
      if (!normalized) return null;
      const book = this.getTargetBook(target);
      if (!book) return null;

      const existingId = entry?.id ? String(entry.id) : null;
      let index = existingId ? book.words.findIndex(item => item.id === existingId) : -1;
      if (index === -1) {
        index = book.words.findIndex(item => item.word === normalized.word);
      }

      if (index >= 0) {
        const existing = book.words[index];
        book.words[index] = {
          ...existing,
          ...normalized,
          id: existing.id,
          pinyin: normalized.pinyin || existing.pinyin,
          audio: normalized.audio || existing.audio,
          meaning: normalized.meaning || existing.meaning,
          cihui: normalized.cihui || existing.cihui,
          liju: normalized.liju || existing.liju,
          idiomStory: normalized.idiomStory || existing.idiomStory,
          synonyms: normalized.synonyms || existing.synonyms,
          antonyms: normalized.antonyms || existing.antonyms,
          sameMeaningDiffForm: normalized.sameMeaningDiffForm || existing.sameMeaningDiffForm,
          chuchu: normalized.chuchu || existing.chuchu,
          yinzhen: normalized.yinzhen || existing.yinzhen,
          tagIds: normalized.tagIds.length ? normalized.tagIds : (existing.tagIds || []),
          testTotalCount: existing.testTotalCount || 0,
          testCorrectCount: existing.testCorrectCount || 0,
          createdAt: existing.createdAt,
          updatedAt: Date.now()
        };
      } else {
        book.words.push(normalized);
      }
      book.words = sortByPinyin(book.words);
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
      if (!entry || !isValidLevel(level)) return;
      entry.level = level;
      entry.updatedAt = Date.now();
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
    },

    async updateWord(word, updates = {}) {
      const book = this.getActiveBook();
      if (!book) return null;
      const key = normalizeWord(word);
      let entry = book.words.find(item => item.word === key);
      if (!entry && typeof word === 'string' && word.startsWith('cnword_')) {
        entry = book.words.find(item => item.id === word);
      }
      if (!entry) return null;
      if (typeof updates.word === 'string') entry.word = normalizeWord(updates.word);
      if (typeof updates.pinyin === 'string') entry.pinyin = normalizePinyin(updates.pinyin);
      if (typeof updates.audio === 'string') entry.audio = updates.audio.trim();
      if (typeof updates.meaning === 'string') entry.meaning = updates.meaning.trim();
      if (typeof updates.cihui === 'string') entry.cihui = updates.cihui.trim();
      if (typeof updates.liju === 'string') entry.liju = updates.liju.trim();
      if (typeof updates.idiomStory === 'string') entry.idiomStory = updates.idiomStory.trim();
      if (typeof updates.synonyms === 'string') entry.synonyms = updates.synonyms.trim();
      if (typeof updates.antonyms === 'string') entry.antonyms = updates.antonyms.trim();
      if (typeof updates.sameMeaningDiffForm === 'string') entry.sameMeaningDiffForm = updates.sameMeaningDiffForm.trim();
      if (typeof updates.chuchu === 'string') entry.chuchu = updates.chuchu.trim();
      if (typeof updates.yinzhen === 'string') entry.yinzhen = updates.yinzhen.trim();
      if (typeof updates.note === 'string') entry.note = updates.note.trim();
      if (isValidLevel(updates.level)) entry.level = updates.level;
      if (Array.isArray(updates.tagIds)) {
        const allowed = new Set(book.tags.map(tag => tag.id));
        entry.tagIds = normalizeTagIds(updates.tagIds).filter(id => allowed.has(id));
      }
      entry.updatedAt = Date.now();
      book.updatedAt = Date.now();
      book.words = sortByPinyin(book.words);
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
      book.tags = sortTags(book.tags);
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
        if (typeof updates.pinyin === 'string') entry.pinyin = normalizePinyin(updates.pinyin);
        if (typeof updates.meaning === 'string') entry.meaning = updates.meaning.trim();
        if (typeof updates.note === 'string') entry.note = updates.note.trim();
        if (isValidLevel(updates.level)) entry.level = updates.level;
        if (Array.isArray(updates.tagIds)) {
          entry.tagIds = normalizeTagIds(updates.tagIds).filter(id => allowedTags.has(id));
        }
        entry.updatedAt = now;
      }
      book.updatedAt = now;
      book.words = sortByPinyin(book.words);
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

    async importWords(entries, target = 'active', tagIdMap = new Map()) {
      const list = Array.isArray(entries) ? entries : [];
      const book = this.getTargetBook(target);
      if (!book) return 0;

      let count = 0;
      const seen = new Set(book.words.map(w => w.word));
      for (const entry of list) {
        const normalized = normalizeEntry(entry);
        if (!normalized) continue;
        if (seen.has(normalized.word)) continue;

        if (tagIdMap.size > 0) {
          normalized.tagIds = normalized.tagIds.map(id => tagIdMap.get(id) || id);
        }

        seen.add(normalized.word);
        book.words.push(normalized);
        count++;
      }

      book.words = sortByPinyin(book.words);
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();

      return count;
    },

    // 本地拼音库批量补拼音：只更新拼音字段，单次落库（供格式1录入/导入后调用）
    async batchFillPinyin(items) {
      const book = this.getActiveBook();
      if (!book) return 0;
      const pinyinMap = new Map();
      for (const item of (Array.isArray(items) ? items : [])) {
        const word = normalizeWord(item?.word);
        const pinyin = normalizePinyin(item?.pinyin);
        if (word && pinyin) pinyinMap.set(word, pinyin);
      }
      if (!pinyinMap.size) return 0;

      let changed = 0;
      const now = Date.now();
      for (const entry of book.words) {
        const pinyin = pinyinMap.get(entry.word);
        if (pinyin && pinyin !== entry.pinyin) {
          entry.pinyin = pinyin;
          entry.updatedAt = now;
          changed += 1;
        }
      }
      if (changed > 0) {
        book.updatedAt = now;
        book.words = sortByPinyin(book.words);
        this.syncActiveBook();
        await this.save();
      }
      return changed;
    },

    async importTags(tags) {
      const book = this.getActiveBook();
      if (!book) return { count: 0, tagIdMap: new Map() };
      const list = Array.isArray(tags) ? tags : [];
      let count = 0;
      const tagIdMap = new Map();
      list.forEach(tag => {
        const normalized = normalizeTag(tag);
        if (!normalized) return;
        const existing = book.tags.find(item => item.id === normalized.id || item.name === normalized.name);
        if (existing) {
          tagIdMap.set(normalized.id, existing.id);
        } else {
          book.tags.push(normalized);
          tagIdMap.set(normalized.id, normalized.id);
          count += 1;
        }
      });
      book.tags = sortTags(book.tags);
      book.updatedAt = Date.now();
      this.syncActiveBook();
      await this.save();
      return { count, tagIdMap };
    },

    // 百度汉语缓存层（避免重复 puppeteer 抓取）
    async getHanyuCache(word) {
      return await chineseRepository.getHanyuCache(normalizeWord(word));
    },

    async setHanyuCache(cache) {
      await chineseRepository.setHanyuCache({ ...cache, word: normalizeWord(cache?.word) });
    },

    async clearHanyuCache() {
      await chineseRepository.clearHanyuCache();
    }
  });

  if (!lazy) store.load();
  chineseStoreInstance = store;
  return store;
}
