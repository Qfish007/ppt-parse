export const VOICE_PROVIDERS = {
    YOUDAO: 'youdao',
    BAIDU: 'baidu',
    BROWSER: 'browser',
    ICIBA: 'iciba'
};

export const VOCABULARY_LEVELS = [
    { value: 'unknown', label: '不认识' },
    { value: 'learning', label: '已了解' },
    { value: 'mastered', label: '已掌握' },
    { value: 'familiar', label: '已熟记' }
];

export const PROJECT_TYPES = {
    DEFAULT: 'default',
    IMAGE: 'image',
    TRANSLATE_EN: 'translate-en',
    TRANSLATE_ZH: 'translate-zh'
};

export const STORAGE_KEYS = {
    RATE: 'bilingual-reader-rate',
    PROVIDER: 'bilingual-reader-voice-provider',
    BODY_FONT_SIZE: 'bilingual-reader-body-font-size',
    WORD_TRANSLATIONS: 'bilingual-reader-word-translations',
    WORD_PHONETICS: 'bilingual-reader-word-phonetics',
    BOOK_EDITS: 'bilingual-reader-edits',
    PROJECTS: 'bilingual-reader-projects',
    ACTIVE_PROJECT: 'bilingual-reader-active-project',
    VOCABULARY: 'bilingual-reader-vocabulary',
    VOCABULARY_TAGS: 'bilingual-reader-vocabulary-tags',
    VOCABULARY_BOOKS: 'bilingual-reader-vocabulary-books',
    VOCABULARY_ACTIVE_BOOK: 'bilingual-reader-active-vocabulary-book',
    VOCABULARY_DEFAULT_BOOK: 'bilingual-reader-default-vocabulary-book',
    VOCABULARY_STATS_VISIBLE: 'bilingual-reader-vocabulary-stats-visible'
};

export const ROUTE_NAMES = {
    HOME: 'Home',
    HOME_SETTING: 'HomeSetting',
    BOOKS: 'Books',
    BOOKS_SETTING: 'BooksSetting',
    VOCABULARY: 'Vocabulary',
    VOCABULARY_SETTINGS: 'VocabularySettings',
    VOCABULARY_TEST: 'VocabularyTest',
    VOCABULARY_DETAIL: 'VocabularyDetail'
};

export const ROUTE_PATHS = {
    HOME: '/home',
    HOME_SETTING: '/home/setting',
    BOOKS: '/books/:index',
    BOOKS_SETTING: '/books/setting',
    VOCABULARY: '/vocabulary',
    VOCABULARY_SETTINGS: '/vocabulary/settings',
    VOCABULARY_TEST: '/vocabulary/test',
    VOCABULARY_DETAIL: '/vocabulary/:word'
};