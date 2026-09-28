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

export const STORAGE_KEYS = {
    RATE: 'bilingual-reader-rate',
    PROVIDER: 'bilingual-reader-voice-provider',
    BODY_FONT_SIZE: 'bilingual-reader-body-font-size',
    WORD_TRANSLATIONS: 'bilingual-reader-word-translations',
    WORD_PHONETICS: 'bilingual-reader-word-phonetics',
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