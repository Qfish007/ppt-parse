import { IVocabularyRepository } from '../IVocabularyRepository.js';
import { db } from '../../db/database.js';

export class DexieVocabularyRepository extends IVocabularyRepository {
  async getBooks() {
    const books = await db.vocabularyBooks.toArray();
    for (const book of books) {
      book.words = await db.vocabularyWords.where('bookId').equals(book.id).toArray();
      book.tags = await db.vocabularyTags.where('bookId').equals(book.id).toArray();
    }
    return books;
  }

  async getBook(id) {
    const book = await db.vocabularyBooks.get(id);
    if (!book) return null;
    book.words = await db.vocabularyWords.where('bookId').equals(id).toArray();
    book.tags = await db.vocabularyTags.where('bookId').equals(id).toArray();
    return book;
  }

  async saveBook(book) {
    const { words = [], tags = [], ...bookData } = book;
    await db.transaction('rw', db.vocabularyBooks, db.vocabularyWords, db.vocabularyTags, async () => {
      await db.vocabularyBooks.put({
        id: bookData.id,
        name: bookData.name,
        createdAt: bookData.createdAt,
        updatedAt: bookData.updatedAt
      });
      const existingWords = await db.vocabularyWords.where('bookId').equals(book.id).toArray();
      for (const word of existingWords) {
        await db.vocabularyWords.delete(word.word);
      }
      for (const word of words) {
        await db.vocabularyWords.put({
          word: word.word,
          phonetic: word.phonetic,
          meaning: word.meaning,
          tagIds: [...(word.tagIds || [])],
          memoryParts: [...(word.memoryParts || [])],
          level: word.level,
          note: word.note || '',
          testTotalCount: word.testTotalCount,
          testCorrectCount: word.testCorrectCount,
          createdAt: word.createdAt,
          updatedAt: word.updatedAt,
          bookId: book.id
        });
      }
      const existingTags = await db.vocabularyTags.where('bookId').equals(book.id).toArray();
      for (const tag of existingTags) {
        await db.vocabularyTags.delete(tag.id);
      }
      for (const tag of tags) {
        await db.vocabularyTags.put({ ...tag, bookId: book.id });
      }
    });
    return book;
  }

  async deleteBook(id) {
    await db.transaction('rw', db.vocabularyBooks, db.vocabularyWords, db.vocabularyTags, async () => {
      await db.vocabularyWords.where('bookId').equals(id).delete();
      await db.vocabularyTags.where('bookId').equals(id).delete();
      await db.vocabularyBooks.delete(id);
    });
  }

  async getWordsByBook(bookId) {
    return await db.vocabularyWords.where('bookId').equals(bookId).toArray();
  }

  async saveWord(word) {
    await db.vocabularyWords.put(word);
    return word;
  }

  async deleteWord(word) {
    await db.vocabularyWords.delete(word);
  }

  async getTagsByBook(bookId) {
    return await db.vocabularyTags.where('bookId').equals(bookId).toArray();
  }

  async saveTag(tag) {
    await db.vocabularyTags.put(tag);
    return tag;
  }

  async deleteTag(id) {
    await db.vocabularyTags.delete(id);
  }

  async getActiveBookId() {
    const result = await db.settings.get('vocabularyActiveBook');
    return result?.value;
  }

  async setActiveBookId(id) {
    await db.settings.put({ key: 'vocabularyActiveBook', value: id });
  }

  async getDefaultBookId() {
    const result = await db.settings.get('vocabularyDefaultBook');
    return result?.value;
  }

  async setDefaultBookId(id) {
    await db.settings.put({ key: 'vocabularyDefaultBook', value: id });
  }

  async getStatsVisible() {
    const result = await db.settings.get('vocabularyStatsVisible');
    return result?.value !== 'false';
  }

  async setStatsVisible(visible) {
    await db.settings.put({ key: 'vocabularyStatsVisible', value: String(visible) });
  }

  async getVisibleColumns() {
    const result = await db.settings.get('vocabularyVisibleColumns');
    if (result?.value) {
      try {
        return JSON.parse(result.value);
      } catch {
        // ignore
      }
    }
    return {
      pronunciation: true,
      memory: true,
      tags: true,
      level: true,
      note: false
    };
  }

  async setVisibleColumns(columns) {
    await db.settings.put({ key: 'vocabularyVisibleColumns', value: JSON.stringify(columns) });
  }
}