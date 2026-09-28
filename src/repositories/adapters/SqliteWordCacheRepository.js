import { IWordCacheRepository } from '../IWordCacheRepository.js'

// 纯内存会话缓存，不落库（详情内容不做本地存储）
const translationMap = new Map()
const phoneticMap = new Map()
const MAX_CACHE = 500

function evict(map) {
  if (map.size <= MAX_CACHE) return
  const firstKey = map.keys().next().value
  map.delete(firstKey)
}

export class SqliteWordCacheRepository extends IWordCacheRepository {
  async getTranslation(word) {
    return translationMap.get(String(word || '').toLowerCase()) || null
  }

  async saveTranslation(word, meaning, phonetic = '') {
    const key = String(word || '').toLowerCase()
    if (!key) return
    evict(translationMap)
    translationMap.set(key, { word: key, meaning, phonetic, updatedAt: Date.now() })
    if (phonetic) {
      evict(phoneticMap)
      phoneticMap.set(key, { word: key, phonetic, updatedAt: Date.now() })
    }
  }

  async getAllTranslations() {
    return Array.from(translationMap.values())
  }

  async getPhonetic(word) {
    const key = String(word || '').toLowerCase()
    return phoneticMap.get(key)?.phonetic || ''
  }

  async savePhonetic(word, phonetic) {
    const key = String(word || '').toLowerCase()
    if (!key) return
    evict(phoneticMap)
    phoneticMap.set(key, { word: key, phonetic, updatedAt: Date.now() })
  }

  async getAllPhonetics() {
    return Array.from(phoneticMap.values())
  }
}
