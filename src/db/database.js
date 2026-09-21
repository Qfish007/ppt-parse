import { Dexie } from 'dexie';

export const DB_NAME = 'bilingual-reader-db';
export const DB_VERSION = 1;

export class ReaderDatabase extends Dexie {
    constructor() {
        super(DB_NAME);

        this.version(DB_VERSION).stores({
            settings: '&key, value',
            vocabularyBooks: 'id, name, createdAt, updatedAt',
            vocabularyWords: 'word, bookId, level, createdAt, updatedAt',
            vocabularyTags: 'id, bookId, name, createdAt',
            wordTranslations: '&word, meaning, phonetic, updatedAt',
            wordPhonetics: '&word, phonetic, updatedAt',
            bookEdits: '&title, pages, updatedAt',
            projects: 'id, index, name, type, createdAt',
            activeProject: '&key, value',
            // 中文生词本（完全独立于 vocabulary，复用 settings 表存配置）
            chineseBooks: 'id, name, createdAt, updatedAt',
            chineseWords: 'word, bookId, level, createdAt, updatedAt',
            chineseTags: 'id, bookId, name, createdAt',
            chineseHanyuCache: '&word, pinyin, audio, updatedAt, meaning, cihui, liju, idiomStory, synonyms, antonyms, sameMeaningDiffForm, chuchu, yinzhen'
        });
    }
}

export const db = new ReaderDatabase();