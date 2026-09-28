import { SqliteSettingsRepository } from './adapters/SqliteSettingsRepository.js';
import { SqliteVocabularyRepository } from './adapters/SqliteVocabularyRepository.js';
import { SqliteWordCacheRepository } from './adapters/SqliteWordCacheRepository.js';
import { SqliteChineseRepository } from './adapters/SqliteChineseRepository.js';

export const settingsRepository = new SqliteSettingsRepository();
export const vocabularyRepository = new SqliteVocabularyRepository();
export const wordCacheRepository = new SqliteWordCacheRepository();
export const chineseRepository = new SqliteChineseRepository();
