import { reactive } from 'vue'

const VOCABULARY_STORAGE_KEY = 'bilingual-reader-vocabulary'

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
    },

    save() {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(this.words))
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

    importWords(entries) {
      const list = Array.isArray(entries) ? entries : []
      let count = 0
      list.forEach(entry => {
        if (this.addWord(entry)) count += 1
      })
      return count
    }
  })

  store.load()
  vocabularyStoreInstance = store
  return store
}
