export class IVocabularyRepository {
  async getBooks() { throw new Error('Not implemented'); }
  async getBook(id) { throw new Error('Not implemented'); }
  async saveBook(book) { throw new Error('Not implemented'); }
  async deleteBook(id) { throw new Error('Not implemented'); }
  async getWordsByBook(bookId) { throw new Error('Not implemented'); }
  async saveWord(word) { throw new Error('Not implemented'); }
  async deleteWord(word) { throw new Error('Not implemented'); }
  async getTagsByBook(bookId) { throw new Error('Not implemented'); }
  async saveTag(tag) { throw new Error('Not implemented'); }
  async deleteTag(id) { throw new Error('Not implemented'); }
  async getActiveBookId() { throw new Error('Not implemented'); }
  async setActiveBookId(id) { throw new Error('Not implemented'); }
  async getDefaultBookId() { throw new Error('Not implemented'); }
  async setDefaultBookId(id) { throw new Error('Not implemented'); }
  async getStatsVisible() { throw new Error('Not implemented'); }
  async setStatsVisible(visible) { throw new Error('Not implemented'); }
}