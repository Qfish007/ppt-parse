import { DexieSettingsRepository } from './adapters/DexieSettingsRepository.js';
import { DexieVocabularyRepository } from './adapters/DexieVocabularyRepository.js';
import { DexieWordCacheRepository } from './adapters/DexieWordCacheRepository.js';
import { DexieProjectsRepository } from './adapters/DexieProjectsRepository.js';
import { DexieBookEditsRepository } from './adapters/DexieBookEditsRepository.js';

export const settingsRepository = new DexieSettingsRepository();
export const vocabularyRepository = new DexieVocabularyRepository();
export const wordCacheRepository = new DexieWordCacheRepository();
export const projectsRepository = new DexieProjectsRepository();
export const bookEditsRepository = new DexieBookEditsRepository();