import { reactive } from 'vue'

const VOCABULARY_STORAGE_KEY = 'bilingual-reader-vocabulary'
const VOCABULARY_TAGS_STORAGE_KEY = 'bilingual-reader-vocabulary-tags'

export const VOCABULARY_LEVELS = [
  { value: 'unknown', label: '不认识' },
  { value: 'learning', label: '已了解' },
  { value: 'mastered', label: '已掌握' },
  { value: 'familiar', label: '已熟记' }
]

let vocabularyStoreInstance = null

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

function normalizeTagIds(tagIds) {
  return Array.isArray(tagIds)
    ? [...new Set(tagIds.map(id => String(id || '').trim()).filter(Boolean))]
    : []
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
    level,
    createdAt: Number(entry?.createdAt) || now,
    updatedAt: Number(entry?.updatedAt) || now
  }
}

function sortByAlphabet(entries) {
  return [...entries].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
}

export function useVocabularyStore() {
  if (vocabularyStoreInstance) return vocabularyStoreInstance

  const store = reactive({
    words: [],
    tags: [],

    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(VOCABULARY_STORAGE_KEY) || '[]')
        this.words = Array.isArray(saved)
          ? sortByAlphabet(saved.map(normalizeEntry).filter(Boolean))
          : []
      } catch {
        localStorage.removeItem(VOCABULARY_STORAGE_KEY)
        this.words = []
      }
      try {
        const savedTags = JSON.parse(localStorage.getItem(VOCABULARY_TAGS_STORAGE_KEY) || '[]')
        this.tags = Array.isArray(savedTags)
          ? savedTags.map(normalizeTag).filter(Boolean)
          : []
      } catch {
        localStorage.removeItem(VOCABULARY_TAGS_STORAGE_KEY)
        this.tags = []
      }
    },

    save() {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(this.words))
      localStorage.setItem(VOCABULARY_TAGS_STORAGE_KEY, JSON.stringify(this.tags))
    },

    addWord(entry) {
      const normalized = normalizeEntry(entry)
      if (!normalized) return null

      const index = this.words.findIndex(item => item.word === normalized.word)
      if (index >= 0) {
        this.words[index] = {
          ...this.words[index],
          phonetic: normalized.phonetic || this.words[index].phonetic,
          meaning: normalized.meaning || this.words[index].meaning,
          tagIds: normalized.tagIds.length ? normalized.tagIds : (this.words[index].tagIds || []),
          updatedAt: Date.now()
        }
      } else {
        this.words.push(normalized)
      }
      this.words = sortByAlphabet(this.words)
      this.save()
      return this.words.find(item => item.word === normalized.word) || null
    },

    removeWord(word) {
      const key = normalizeWord(word)
      this.words = this.words.filter(item => item.word !== key)
      this.save()
    },

    updateLevel(word, level) {
      const key = normalizeWord(word)
      const entry = this.words.find(item => item.word === key)
      if (!entry || !VOCABULARY_LEVELS.some(item => item.value === level)) return
      entry.level = level
      entry.updatedAt = Date.now()
      this.save()
    },

    updateWord(word, updates = {}) {
      const key = normalizeWord(word)
      const entry = this.words.find(item => item.word === key)
      if (!entry) return null
      if (typeof updates.phonetic === 'string') entry.phonetic = normalizePhonetic(updates.phonetic)
      if (typeof updates.meaning === 'string') entry.meaning = updates.meaning.trim()
      if (VOCABULARY_LEVELS.some(item => item.value === updates.level)) entry.level = updates.level
      if (Array.isArray(updates.tagIds)) {
        const allowed = new Set(this.tags.map(tag => tag.id))
        entry.tagIds = normalizeTagIds(updates.tagIds).filter(id => allowed.has(id))
      }
      entry.updatedAt = Date.now()
      this.save()
      return entry
    },

    addTag(name) {
      const normalizedName = normalizeTagName(name)
      if (!normalizedName) return null
      const existing = this.tags.find(tag => tag.name === normalizedName)
      if (existing) return existing
      const tag = normalizeTag({ name: normalizedName })
      this.tags.push(tag)
      this.save()
      return tag
    },

    removeTag(id) {
      const key = String(id || '')
      this.tags = this.tags.filter(tag => tag.id !== key)
      this.words = this.words.map(word => ({
        ...word,
        tagIds: normalizeTagIds(word.tagIds).filter(tagId => tagId !== key)
      }))
      this.save()
    },

    updateWordTags(word, tagIds) {
      const key = normalizeWord(word)
      const allowed = new Set(this.tags.map(tag => tag.id))
      const entry = this.words.find(item => item.word === key)
      if (!entry) return
      entry.tagIds = normalizeTagIds(tagIds).filter(id => allowed.has(id))
      entry.updatedAt = Date.now()
      this.save()
    },

    importWords(entries) {
      const list = Array.isArray(entries) ? entries : []
      let count = 0
      list.forEach(entry => {
        if (this.addWord(entry)) count += 1
      })
      return count
    },

    importTags(tags) {
      const list = Array.isArray(tags) ? tags : []
      let count = 0
      list.forEach(tag => {
        const normalized = normalizeTag(tag)
        if (!normalized) return
        const existing = this.tags.find(item => item.id === normalized.id || item.name === normalized.name)
        if (!existing) {
          this.tags.push(normalized)
          count += 1
        }
      })
      this.save()
      return count
    }
  })

  store.load()
  vocabularyStoreInstance = store
  return store
}
