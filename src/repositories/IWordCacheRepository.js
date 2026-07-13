export class IWordCacheRepository {
  async getTranslation(word) { throw new Error('Not implemented'); }
  async saveTranslation(word, meaning, phonetic = '') { throw new Error('Not implemented'); }
  async getAllTranslations() { throw new Error('Not implemented'); }
  async getPhonetic(word) { throw new Error('Not implemented'); }
  async savePhonetic(word, phonetic) { throw new Error('Not implemented'); }
  async getAllPhonetics() { throw new Error('Not implemented'); }
}