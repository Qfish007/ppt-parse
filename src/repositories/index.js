import { SqliteSettingsRepository } from './adapters/SqliteSettingsRepository.js';
import { SqliteVocabularyRepository } from './adapters/SqliteVocabularyRepository.js';
import { SqliteWordCacheRepository } from './adapters/SqliteWordCacheRepository.js';
import { SqliteProjectsRepository } from './adapters/SqliteProjectsRepository.js';
import { SqliteBookEditsRepository } from './adapters/SqliteBookEditsRepository.js';
import { SqliteChineseRepository } from './adapters/SqliteChineseRepository.js';

export const settingsRepository = new SqliteSettingsRepository();
export const vocabularyRepository = new SqliteVocabularyRepository();
export const wordCacheRepository = new SqliteWordCacheRepository();
export const projectsRepository = new SqliteProjectsRepository();
export const bookEditsRepository = new SqliteBookEditsRepository();
export const chineseRepository = new SqliteChineseRepository();
