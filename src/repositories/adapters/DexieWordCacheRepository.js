import { IWordCacheRepository } from '../IWordCacheRepository.js';
import { db } from '../../db/database.js';

export class DexieWordCacheRepository extends IWordCacheRepository {
  async getTranslation(word) {
    const result = await db.wordTranslations.get(word.toLowerCase());
    return result;
  }

  async saveTranslation(word, meaning, phonetic = '') {
    const key = word.toLowerCase();
    await db.wordTranslations.put({
      word: key,
      meaning,
      phonetic,
      updatedAt: Date.now()
    });
    if (phonetic) {
      await db.wordPhonetics.put({
        word: key,
        phonetic,
        updatedAt: Date.now()
      });
    }
  }

  async getAllTranslations() {
    return await db.wordTranslations.toArray();
  }

  async getPhonetic(word) {
    const result = await db.wordPhonetics.get(word.toLowerCase());
    return result?.phonetic || '';
  }

  async savePhonetic(word, phonetic) {
    const key = word.toLowerCase();
    await db.wordPhonetics.put({
      word: key,
      phonetic,
      updatedAt: Date.now()
    });
  }

  async getAllPhonetics() {
    return await db.wordPhonetics.toArray();
  }
}