import { Dexie } from 'dexie';

export const DB_NAME = 'bilingual-reader-db';
export const DB_VERSION = 2;

export class ReaderDatabase extends Dexie {
    constructor() {
        super(DB_NAME);

        // v1：原始 schema（含已废弃的 bookEdits/projects/activeProject）
        this.version(1).stores({
            settings: '&key, value',
            vocabularyBooks: 'id, name, createdAt, updatedAt',
            vocabularyWords: 'word, bookId, level, createdAt, updatedAt',
            vocabularyTags: 'id, bookId, name, createdAt',
            wordTranslations: '&word, meaning, phonetic, updatedAt',
            wordPhonetics: '&word, phonetic, updatedAt',
            bookEdits: '&title, pages, updatedAt',
            projects: 'id, index, name, type, createdAt',
            activeProject: '&key, value',
            chineseBooks: 'id, name, createdAt, updatedAt',
            chineseWords: 'word, bookId, level, createdAt, updatedAt',
            chineseTags: 'id, bookId, name, createdAt',
            chineseHanyuCache: '&word, pinyin, audio, updatedAt, meaning, cihui, liju, idiomStory, synonyms, antonyms, sameMeaningDiffForm, chuchu, yinzhen'
        });

        // v2：删除 books 功能相关表（书籍已下线）
        this.version(2).stores({
            settings: '&key, value',
            vocabularyBooks: 'id, name, createdAt, updatedAt',
            vocabularyWords: 'word, bookId, level, createdAt, updatedAt',
            vocabularyTags: 'id, bookId, name, createdAt',
            wordTranslations: '&word, meaning, phonetic, updatedAt',
            wordPhonetics: '&word, phonetic, updatedAt',
            chineseBooks: 'id, name, createdAt, updatedAt',
            chineseWords: 'word, bookId, level, createdAt, updatedAt',
            chineseTags: 'id, bookId, name, createdAt',
            chineseHanyuCache: '&word, pinyin, audio, updatedAt, meaning, cihui, liju, idiomStory, synonyms, antonyms, sameMeaningDiffForm, chuchu, yinzhen',
            bookEdits: null,
            projects: null,
            activeProject: null
        });
    }
}

export const db = new ReaderDatabase();