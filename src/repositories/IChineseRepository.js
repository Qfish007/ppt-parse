// 中文生词本仓储接口（独立于 vocabulary）
export class IChineseRepository {
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
  async getVisibleColumns() { throw new Error('Not implemented'); }
  async setVisibleColumns(columns) { throw new Error('Not implemented'); }
  // 多标签筛选关系：'and'（同时满足全部）/ 'or'（满足任一）
  async getTagFilterRelation() { throw new Error('Not implemented'); }
  async setTagFilterRelation(relation) { throw new Error('Not implemented'); }
  // 百度汉语抓取结果缓存
  async getHanyuCache(word) { throw new Error('Not implemented'); }
  async setHanyuCache(cache) { throw new Error('Not implemented'); }
  async clearHanyuCache() { throw new Error('Not implemented'); }
}
