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
            activeProject: '&key, value'
        });
    }
}

export const db = new ReaderDatabase();