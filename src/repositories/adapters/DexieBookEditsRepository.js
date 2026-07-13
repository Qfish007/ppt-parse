import { db } from '../../db/database.js';

export class DexieBookEditsRepository {
  async getEdits(title) {
    return await db.bookEdits.get(title);
  }

  async saveEdits(book) {
    await db.bookEdits.put({
      title: book.title,
      pages: book.pages,
      updatedAt: Date.now()
    });
  }

  async deleteEdits(title) {
    await db.bookEdits.delete(title);
  }
}