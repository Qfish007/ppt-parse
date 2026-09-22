import { IChineseRepository } from '../IChineseRepository.js';
import { db } from '../../db/database.js';

// 中文生词本仓储实现，独立于 vocabularyBooks/vocabularyWords/vocabularyTags
// 复用 settings 表存配置项（按 key 前缀 chineseXxx 隔离），不复用 vocabulary 的 settings 键
export class DexieChineseRepository extends IChineseRepository {
  async getBooks() {
    const books = await db.chineseBooks.toArray();
    for (const book of books) {
      book.words = await db.chineseWords.where('bookId').equals(book.id).toArray();
      book.tags = await db.chineseTags.where('bookId').equals(book.id).toArray();
    }
    return books;
  }

  async getBook(id) {
    const book = await db.chineseBooks.get(id);
    if (!book) return null;
    book.words = await db.chineseWords.where('bookId').equals(id).toArray();
    book.tags = await db.chineseTags.where('bookId').equals(id).toArray();
    return book;
  }

  async saveBook(book) {
    const { words = [], tags = [], ...bookData } = book;
    await db.transaction('rw', db.chineseBooks, db.chineseWords, db.chineseTags, async () => {
      await db.chineseBooks.put({
        id: bookData.id,
        name: bookData.name,
        createdAt: bookData.createdAt,
        updatedAt: bookData.updatedAt
      });
      await db.chineseWords.where('bookId').equals(book.id).delete();
      for (const word of words) {
        await db.chineseWords.put({
          word: word.word,
          pinyin: word.pinyin,
          audio: word.audio,
          meaning: word.meaning,
          cihui: word.cihui,
          liju: word.liju,
          idiomStory: word.idiomStory,
          synonyms: word.synonyms,
          antonyms: word.antonyms,
          sameMeaningDiffForm: word.sameMeaningDiffForm,
          chuchu: word.chuchu,
          yinzhen: word.yinzhen,
          tagIds: [...(word.tagIds || [])],
          level: word.level,
          note: word.note || '',
          testTotalCount: word.testTotalCount,
          testCorrectCount: word.testCorrectCount,
          createdAt: word.createdAt,
          updatedAt: word.updatedAt,
          bookId: book.id
        });
      }
      await db.chineseTags.where('bookId').equals(book.id).delete();
      for (const tag of tags) {
        await db.chineseTags.put({ ...tag, bookId: book.id });
      }
    });
    return book;
  }

  async deleteBook(id) {
    await db.transaction('rw', db.chineseBooks, db.chineseWords, db.chineseTags, async () => {
      await db.chineseWords.where('bookId').equals(id).delete();
      await db.chineseTags.where('bookId').equals(id).delete();
      await db.chineseBooks.delete(id);
    });
  }

  async getWordsByBook(bookId) {
    return await db.chineseWords.where('bookId').equals(bookId).toArray();
  }

  async saveWord(word) {
    await db.chineseWords.put(word);
    return word;
  }

  async deleteWord(word) {
    await db.chineseWords.delete(word);
  }

  async getTagsByBook(bookId) {
    return await db.chineseTags.where('bookId').equals(bookId).toArray();
  }

  async saveTag(tag) {
    await db.chineseTags.put(tag);
    return tag;
  }

  async deleteTag(id) {
    await db.chineseTags.delete(id);
  }

  async getActiveBookId() {
    const result = await db.settings.get('chineseActiveBook');
    return result?.value;
  }

  async setActiveBookId(id) {
    await db.settings.put({ key: 'chineseActiveBook', value: id });
  }

  async getDefaultBookId() {
    const result = await db.settings.get('chineseDefaultBook');
    return result?.value;
  }

  async setDefaultBookId(id) {
    await db.settings.put({ key: 'chineseDefaultBook', value: id });
  }

  async getStatsVisible() {
    const result = await db.settings.get('chineseStatsVisible');
    return result?.value !== 'false';
  }

  async setStatsVisible(visible) {
    await db.settings.put({ key: 'chineseStatsVisible', value: String(visible) });
  }

  async getVisibleColumns() {
    const result = await db.settings.get('chineseVisibleColumns');
    if (result?.value) {
      try {
        return JSON.parse(result.value);
      } catch {
        // ignore
      }
    }
    return {
      pinyin: true,
      tags: true,
      level: true,
      note: false
    };
  }

  async setVisibleColumns(columns) {
    await db.settings.put({ key: 'chineseVisibleColumns', value: JSON.stringify(columns) });
  }

  async getTagFilterRelation() {
    const result = await db.settings.get('chineseTagFilterRelation');
    return result?.value === 'or' ? 'or' : 'and';
  }

  async setTagFilterRelation(relation) {
    const value = relation === 'or' ? 'or' : 'and';
    await db.settings.put({ key: 'chineseTagFilterRelation', value });
  }

  // 百度汉语抓取结果缓存层（避免重复 puppeteer 渲染）
  async getHanyuCache(word) {
    return await db.chineseHanyuCache.get(word);
  }

  async setHanyuCache(cache) {
    const now = Date.now();
    await db.chineseHanyuCache.put({
      word: cache.word,
      pinyin: cache.pinyin || '',
      audio: cache.audio || '',
      meaning: cache.meaning || '',
      cihui: cache.cihui || '',
      liju: cache.liju || '',
      idiomStory: cache.idiomStory || '',
      synonyms: cache.synonyms || '',
      antonyms: cache.antonyms || '',
      sameMeaningDiffForm: cache.sameMeaningDiffForm || '',
      chuchu: cache.chuchu || '',
      yinzhen: cache.yinzhen || '',
      updatedAt: now
    });
  }

  async clearHanyuCache() {
    await db.chineseHanyuCache.clear();
  }
}
