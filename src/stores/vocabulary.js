import { reactive } from 'vue'

const VOCABULARY_STORAGE_KEY = 'bilingual-reader-vocabulary'
const VOCABULARY_TAGS_STORAGE_KEY = 'bilingual-reader-vocabulary-tags'
const VOCABULARY_BOOKS_STORAGE_KEY = 'bilingual-reader-vocabulary-books'
const VOCABULARY_ACTIVE_BOOK_KEY = 'bilingual-reader-active-vocabulary-book'
const VOCABULARY_DEFAULT_BOOK_KEY = 'bilingual-reader-default-vocabulary-book'
const VOCABULARY_STATS_VISIBLE_KEY = 'bilingual-reader-vocabulary-stats-visible'

export const VOCABULARY_LEVELS = [
  { value: 'unknown', label: '不认识' },
  { value: 'learning', label: '已了解' },
  { value: 'mastered', label: '已掌握' },
  { value: 'familiar', label: '已熟记' }
]

let vocabularyStoreInstance = null

function generateBookId() {
  return 'book_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function normalizeWord(word) {
  return String(word || '').trim().toLowerCase()
}

function normalizePhonetic(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.startsWith('/') ? text : `/${text}/`
}

function generateTagId() {
  return 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function normalizeTagName(name) {
  return String(name || '').trim()
}

function normalizeTag(tag) {
  const name = normalizeTagName(tag?.name)
  if (!name) return null
  const now = Date.now()
  return {
    id: String(tag?.id || generateTagId()),
    name,
    createdAt: Number(tag?.createdAt) || now
  }
}

function normalizeBookName(name) {
  return String(name || '').trim()
}

function normalizeTagIds(tagIds) {
  return Array.isArray(tagIds)
    ? [...new Set(tagIds.map(id => String(id || '').trim()).filter(Boolean))]
    : []
}

function normalizeMemoryParts(parts) {
  if (Array.isArray(parts)) {
    return parts.map(part => String(part || '').trim()).filter(Boolean)
  }
  return String(parts || '')
    .split(/[.\s/|,，、;；]+/)
    .map(part => part.trim())
    .filter(Boolean)
}

function normalizeEntry(entry) {
  const word = normalizeWord(entry?.word)
  if (!word) return null
  const level = VOCABULARY_LEVELS.some(item => item.value === entry?.level)
    ? entry.level
    : 'unknown'
  const now = Date.now()
  return {
    word,
    phonetic: normalizePhonetic(entry?.phonetic),
    meaning: String(entry?.meaning || '').trim(),
    tagIds: normalizeTagIds(entry?.tagIds),
    memoryParts: normalizeMemoryParts(entry?.memoryParts),
    level,
    testTotalCount: Math.max(0, Number(entry?.testTotalCount) || 0),
    testCorrectCount: Math.max(0, Number(entry?.testCorrectCount) || 0),
    createdAt: Number(entry?.createdAt) || now,
    updatedAt: Number(entry?.updatedAt) || now
  }
}

function sortByAlphabet(entries) {
  return [...entries].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
}

function normalizeBook(book, fallbackName = '默认生词本') {
  const now = Date.now()
  const name = normalizeBookName(book?.name) || fallbackName
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
  }
}

export function useVocabularyStore() {
  if (vocabularyStoreInstance) return vocabularyStoreInstance

  const store = reactive({
    books: [],
    activeBookId: '',
    defaultBookId: '',
    statsVisible: true,
    words: [],
    tags: [],

    load() {
      let legacyWords = []
      let legacyTags = []
      try {
        const savedBooks = JSON.parse(localStorage.getItem(VOCABULARY_BOOKS_STORAGE_KEY) || '[]')
        this.books = Array.isArray(savedBooks)
          ? savedBooks.map((book, index) => normalizeBook(book, index === 0 ? '默认生词本' : `生词本 ${index + 1}`)).filter(Boolean)
          : []
      } catch {
        localStorage.removeItem(VOCABULARY_BOOKS_STORAGE_KEY)
        this.books = []
      }

      try {
        const saved = JSON.parse(localStorage.getItem(VOCABULARY_STORAGE_KEY) || '[]')
        legacyWords = Array.isArray(saved)
          ? sortByAlphabet(saved.map(normalizeEntry).filter(Boolean))
          : []
      } catch {
        legacyWords = []
      }
      try {
        const savedTags = JSON.parse(localStorage.getItem(VOCABULARY_TAGS_STORAGE_KEY) || '[]')
        legacyTags = Array.isArray(savedTags)
          ? savedTags.map(normalizeTag).filter(Boolean)
          : []
      } catch {
        legacyTags = []
      }

      if (!this.books.length) {
        this.books = [normalizeBook({
          id: 'default',
          name: '默认生词本',
          words: legacyWords,
          tags: legacyTags
        })]
      }

      const savedActiveBookId = localStorage.getItem(VOCABULARY_ACTIVE_BOOK_KEY)
      const savedDefaultBookId = localStorage.getItem(VOCABULARY_DEFAULT_BOOK_KEY)
      this.defaultBookId = this.books.some(book => book.id === savedDefaultBookId)
        ? savedDefaultBookId
        : this.books[0].id
      this.activeBookId = this.books.some(book => book.id === savedActiveBookId)
        ? savedActiveBookId
        : this.defaultBookId
      this.statsVisible = localStorage.getItem(VOCABULARY_STATS_VISIBLE_KEY) !== 'false'
      this.syncActiveBook()
      this.save()
    },

    save() {
      localStorage.setItem(VOCABULARY_BOOKS_STORAGE_KEY, JSON.stringify(this.books))
      localStorage.setItem(VOCABULARY_ACTIVE_BOOK_KEY, this.activeBookId)
      localStorage.setItem(VOCABULARY_DEFAULT_BOOK_KEY, this.defaultBookId)
      localStorage.setItem(VOCABULARY_STATS_VISIBLE_KEY, String(this.statsVisible))
    },

    syncActiveBook() {
      const activeBook = this.getActiveBook()
      this.words = activeBook?.words || []
      this.tags = activeBook?.tags || []
    },

    getActiveBook() {
      return this.books.find(book => book.id === this.activeBookId) || this.books[0] || null
    },

    getDefaultBook() {
      return this.books.find(book => book.id === this.defaultBookId) || this.books[0] || null
    },

    getBook(bookId) {
      return this.books.find(book => book.id === bookId) || null
    },

    getTargetBook(target = 'active') {
      if (target === 'default') return this.getDefaultBook()
      const book = this.getBook(target)
      return book || this.getActiveBook()
    },

    addBook(name) {
      const normalizedName = normalizeBookName(name)
      if (!normalizedName) return null
      const existing = this.books.find(book => book.name === normalizedName)
      if (existing) return existing
      const book = normalizeBook({ name: normalizedName })
      this.books.push(book)
      if (!this.activeBookId) this.activeBookId = book.id
      if (!this.defaultBookId) this.defaultBookId = book.id
      this.syncActiveBook()
      this.save()
      return book
    },

    renameBook(bookId, name) {
      const book = this.getBook(bookId)
      const normalizedName = normalizeBookName(name)
      if (!book || !normalizedName) return null
      const duplicate = this.books.find(item => item.id !== book.id && item.name === normalizedName)
      if (duplicate) return null
      book.name = normalizedName
      book.updatedAt = Date.now()
      this.save()
      return book
    },

    setActiveBook(bookId) {
      if (!this.getBook(bookId)) return false
      this.activeBookId = bookId
      this.syncActiveBook()
      this.save()
      return true
    },

    setDefaultBook(bookId) {
      if (!this.getBook(bookId)) return false
      this.defaultBookId = bookId
      this.save()
      return true
    },

    setStatsVisible(visible) {
      this.statsVisible = Boolean(visible)
      this.save()
    },

    addWord(entry, target = 'active') {
      const normalized = normalizeEntry(entry)
      if (!normalized) return null
      const book = this.getTargetBook(target)
      if (!book) return null

      const index = book.words.findIndex(item => item.word === normalized.word)
      if (index >= 0) {
        book.words[index] = {
          ...book.words[index],
          phonetic: normalized.phonetic || book.words[index].phonetic,
          meaning: normalized.meaning || book.words[index].meaning,
          tagIds: normalized.tagIds.length ? normalized.tagIds : (book.words[index].tagIds || []),
          memoryParts: normalized.memoryParts.length ? normalized.memoryParts : (book.words[index].memoryParts || []),
          updatedAt: Date.now()
        }
      } else {
        book.words.push(normalized)
      }
      book.words = sortByAlphabet(book.words)
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
      return book.words.find(item => item.word === normalized.word) || null
    },

    removeWord(word) {
      const book = this.getActiveBook()
      if (!book) return
      const key = normalizeWord(word)
      book.words = book.words.filter(item => item.word !== key)
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
    },

    updateLevel(word, level, target = 'active') {
      const book = this.getTargetBook(target)
      if (!book) return
      const key = normalizeWord(word)
      const entry = book.words.find(item => item.word === key)
      if (!entry || !VOCABULARY_LEVELS.some(item => item.value === level)) return
      entry.level = level
      entry.updatedAt = Date.now()
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
    },

    recordTestResult(word, isCorrect, target = 'default') {
      const book = this.getTargetBook(target)
      if (!book) return null
      const key = normalizeWord(word)
      const entry = book.words.find(item => item.word === key)
      if (!entry) return null
      entry.testTotalCount = Math.max(0, Number(entry.testTotalCount) || 0) + 1
      entry.testCorrectCount = Math.max(0, Number(entry.testCorrectCount) || 0) + (isCorrect ? 1 : 0)
      entry.level = isCorrect ? 'mastered' : 'unknown'
      entry.updatedAt = Date.now()
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
      return entry
    },

    updateWord(word, updates = {}) {
      const book = this.getActiveBook()
      if (!book) return null
      const key = normalizeWord(word)
      const entry = book.words.find(item => item.word === key)
      if (!entry) return null
      if (typeof updates.phonetic === 'string') entry.phonetic = normalizePhonetic(updates.phonetic)
      if (typeof updates.meaning === 'string') entry.meaning = updates.meaning.trim()
      if (VOCABULARY_LEVELS.some(item => item.value === updates.level)) entry.level = updates.level
      if (Array.isArray(updates.tagIds)) {
        const allowed = new Set(book.tags.map(tag => tag.id))
        entry.tagIds = normalizeTagIds(updates.tagIds).filter(id => allowed.has(id))
      }
      if (Array.isArray(updates.memoryParts) || typeof updates.memoryParts === 'string') {
        entry.memoryParts = normalizeMemoryParts(updates.memoryParts)
      }
      entry.updatedAt = Date.now()
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
      return entry
    },

    addTag(name) {
      const book = this.getActiveBook()
      if (!book) return null
      const normalizedName = normalizeTagName(name)
      if (!normalizedName) return null
      const existing = book.tags.find(tag => tag.name === normalizedName)
      if (existing) return existing
      const tag = normalizeTag({ name: normalizedName })
      book.tags.push(tag)
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
      return tag
    },

    removeTag(id) {
      const book = this.getActiveBook()
      if (!book) return
      const key = String(id || '')
      book.tags = book.tags.filter(tag => tag.id !== key)
      book.words = book.words.map(word => ({
        ...word,
        tagIds: normalizeTagIds(word.tagIds).filter(tagId => tagId !== key)
      }))
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
    },

    updateWordTags(word, tagIds) {
      const book = this.getActiveBook()
      if (!book) return
      const key = normalizeWord(word)
      const allowed = new Set(book.tags.map(tag => tag.id))
      const entry = book.words.find(item => item.word === key)
      if (!entry) return
      entry.tagIds = normalizeTagIds(tagIds).filter(id => allowed.has(id))
      entry.updatedAt = Date.now()
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
    },

    importWords(entries, target = 'active') {
      const list = Array.isArray(entries) ? entries : []
      let count = 0
      list.forEach(entry => {
        if (this.addWord(entry, target)) count += 1
      })
      return count
    },

    importTags(tags) {
      const book = this.getActiveBook()
      if (!book) return 0
      const list = Array.isArray(tags) ? tags : []
      let count = 0
      list.forEach(tag => {
        const normalized = normalizeTag(tag)
        if (!normalized) return
        const existing = book.tags.find(item => item.id === normalized.id || item.name === normalized.name)
        if (!existing) {
          book.tags.push(normalized)
          count += 1
        }
      })
      book.updatedAt = Date.now()
      this.syncActiveBook()
      this.save()
      return count
    }
  })

  store.load()
  vocabularyStoreInstance = store
  return store
}
