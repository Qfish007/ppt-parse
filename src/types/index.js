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

// 中文生词本掌握水平（与 vocabulary 完全独立，颜色含义同项目约定）
export const CHINESE_LEVELS = [
    { value: 'unknown', label: '不认识', color: '#f56c6c' },
    { value: 'learning', label: '已了解', color: '#409eff' },
    { value: 'mastered', label: '已掌握', color: '#e6a23c' },
    { value: 'familiar', label: '已熟记', color: '#67c23a' }
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
    VOCABULARY_STATS_VISIBLE: 'bilingual-reader-vocabulary-stats-visible',
    TEST_ENABLE_MARK_CORRECT: 'bilingual-reader-test-enable-mark-correct',
    TEST_SHOW_PRONUNCIATION: 'bilingual-reader-test-show-pronunciation',
    // 中文生词本（独立 storage keys）
    CHINESE: 'bilingual-reader-chinese',
    CHINESE_TAGS: 'bilingual-reader-chinese-tags',
    CHINESE_BOOKS: 'bilingual-reader-chinese-books',
    CHINESE_ACTIVE_BOOK: 'bilingual-reader-active-chinese-book',
    CHINESE_DEFAULT_BOOK: 'bilingual-reader-default-chinese-book',
    CHINESE_STATS_VISIBLE: 'bilingual-reader-chinese-stats-visible',
    CHINESE_VISIBLE_COLUMNS: 'bilingual-reader-chinese-visible-columns'
};

export const ROUTE_NAMES = {
    HOME: 'Home',
    HOME_SETTING: 'HomeSetting',
    BOOKS: 'Books',
    BOOKS_SETTING: 'BooksSetting',
    VOCABULARY: 'Vocabulary',
    VOCABULARY_SETTINGS: 'VocabularySettings',
    VOCABULARY_TEST: 'VocabularyTest',
    VOCABULARY_DETAIL: 'VocabularyDetail',
    CHINESE: 'Chinese',
    CHINESE_SETTINGS: 'ChineseSettings',
    CHINESE_PRINT: 'ChinesePrint',
    CHINESE_DETAIL: 'ChineseDetail'
};

export const ROUTE_PATHS = {
    HOME: '/home',
    HOME_SETTING: '/home/setting',
    BOOKS: '/books/:index',
    BOOKS_SETTING: '/books/setting',
    VOCABULARY: '/vocabulary',
    VOCABULARY_SETTINGS: '/vocabulary/settings',
    VOCABULARY_TEST: '/vocabulary/test',
    VOCABULARY_DETAIL: '/vocabulary/:word',
    CHINESE: '/chinese',
    CHINESE_SETTINGS: '/chinese/settings',
    CHINESE_PRINT: '/chinese/print',
    CHINESE_DETAIL: '/chinese/:word'
};