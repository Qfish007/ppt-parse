import { ISettingsRepository } from '../ISettingsRepository.js';
import { db } from '../../db/database.js';

export class DexieSettingsRepository extends ISettingsRepository {
  async get(key) {
    const result = await db.settings.get(key);
    return result?.value;
  }

  async set(key, value) {
    await db.settings.put({ key, value });
    return value;
  }

  async getAll() {
    const results = await db.settings.toArray();
    return results.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  async delete(key) {
    await db.settings.delete(key);
  }
}