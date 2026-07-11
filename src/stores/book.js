/**
 * 书籍数据 Store
 * 使用 Vue3 reactive 模拟 Pinia，管理书籍、词典和编辑状态
 */
import { reactive } from 'vue';

/** localStorage 存储键 - 单词翻译缓存 */
const WORD_TRANSLATION_CACHE_KEY = 'bilingual-reader-word-translations';
/** localStorage 存储键 - 单词音标缓存 */
const WORD_PHONETIC_CACHE_KEY = 'bilingual-reader-word-phonetics';
/** localStorage 存储键 - 书籍编辑数据 */
const BOOK_EDITS_KEY = 'bilingual-reader-edits';
let bookStoreInstance = null;

/** 默认释义 */
const WORD_FALLBACK_MEANING = '释义待补充，可以继续点喇叭听发音。';

/** 示例书籍数据 */
const sampleBook = {
  title: '示例内容',
  pages: [
    {
      page: 1,
      image: '',
      lines: [
        { en: 'Good morning, everyone.', zh: '大家早上好。' },
        { en: "Let's read and listen together.", zh: '我们一起读、一起听。' }
      ]
    },
    {
      page: 2,
      image: '',
      lines: [
        { en: 'Point to a word to hear it.', zh: '点击一个单词来听它的读音。' },
        { en: 'Use the page button to read everything on this page.', zh: '使用本页朗读按钮朗读整页内容。' }
      ]
    }
  ]
};

/** 内置词典 */
const defaultDictionary = {
  a: '一个；一件',
  about: '关于；大约',
  ago: '以前',
  ancient: '古代的',
  another: '另一个',
  any: '任何的；一些',
  axe: '斧头',
  before: '在……以前',
  bit: '一点；少量',
  boxes: '盒子；箱子',
  buy: '买',
  conversations: '谈话；对话',
  created: '创造；产生',
  did: '助动词，用于过去时疑问句',
  do: '做；助动词',
  earliest: '最早的',
  everywhere: '到处；处处',
  exchanged: '交换',
  exciting: '令人兴奋的；有趣的',
  explore: '探索',
  familiar: '熟悉的',
  for: '为了；给；换取',
  how: '怎样；如何',
  in: '在……里面',
  is: '是',
  it: '它',
  know: '知道；了解',
  let: '让',
  like: '像；喜欢',
  lives: '生活',
  long: '长的；长久地',
  look: '看起来；样子',
  money: '钱；货币',
  much: '许多；大量',
  our: '我们的',
  parents: '父母',
  people: '人们',
  probably: '可能；大概',
  really: '真正地；确实',
  same: '相同的',
  shops: '商店',
  the: '这个；那个',
  there: '那里；有',
  thing: '东西；事情',
  things: '东西；物品',
  this: '这个',
  times: '时代；时期；次数',
  to: '向；到；用于动词不定式',
  together: '一起',
  use: '使用',
  was: '是（am/is 的过去式）',
  "wasn't": '不是；没有（was not）',
  wallets: '钱包',
  want: '想要',
  went: '去；进行（go 的过去式）',
  we: '我们',
  "we're": '我们是；我们正在',
  what: '什么',
  with: '和；带有',
  world: '世界'
};

/**
 * 判断一行文本是否看起来像标题
 * @param {string} text
 * @returns {boolean}
 */
function lineLooksLikeHeading(text) {
  const value = String(text || '').trim();
  return value.length <= 34 && !/[.!?。！？]$/.test(value);
}

/**
 * 书籍 store
 * @returns {Object} 响应式书籍对象
 */
export function useBookStore() {
  if (bookStoreInstance) return bookStoreInstance;

  // 加载 localStorage 中的词典缓存
  const dictionary = reactive({ ...defaultDictionary });
  const phonetics = reactive({ side: '/saɪd/' });
  try {
    const savedWordTranslations = JSON.parse(localStorage.getItem(WORD_TRANSLATION_CACHE_KEY) || '{}');
    Object.entries(savedWordTranslations).forEach(([word, meaning]) => {
      if (typeof meaning === 'string' && meaning.trim()) dictionary[word] = meaning.trim();
      if (meaning && typeof meaning === 'object') {
        if (typeof meaning.meaning === 'string' && meaning.meaning.trim()) dictionary[word] = meaning.meaning.trim();
        if (typeof meaning.phonetic === 'string' && meaning.phonetic.trim()) phonetics[word] = meaning.phonetic.trim();
      }
    });
  } catch {
    localStorage.removeItem(WORD_TRANSLATION_CACHE_KEY);
  }
  try {
    const savedWordPhonetics = JSON.parse(localStorage.getItem(WORD_PHONETIC_CACHE_KEY) || '{}');
    Object.entries(savedWordPhonetics).forEach(([word, phonetic]) => {
      if (typeof phonetic === 'string' && phonetic.trim()) phonetics[word] = phonetic.trim();
    });
  } catch {
    localStorage.removeItem(WORD_PHONETIC_CACHE_KEY);
  }

  const store = reactive({
    /** 书籍数据 */
    book: null,
    /** 当前页码索引 */
    currentIndex: 0,
    /** 词典 */
    dictionary,
    /** 音标缓存 */
    phonetics,
    /** 单词翻译缓存 localStorage 键 */
    WORD_TRANSLATION_CACHE_KEY,
    /** 默认释义 */
    WORD_FALLBACK_MEANING,

    /**
     * 加载书籍
     * 默认书籍从 /parse/ocr/demo001/content.json 加载
     */
    async loadBook() {
      // 先尝试从 localStorage 恢复编辑
      this.loadEdits();
      // 从新的文件路径加载默认书籍
      try {
        const response = await fetch('/parse/ocr/demo001/content.json');
        if (response.ok) {
          const data = await response.json();
          if (data?.pages?.length) {
            this.book = this.normalizeBook(data);
            this.loadEdits();
            return;
          }
        }
      } catch {
        // fall through to fallback
      }
      // 回退到原来的方式
      try {
        const mod = await import('../data/content.generated.js');
        if (mod?.default && mod.default.pages?.length) {
          this.book = this.normalizeBook(mod.default);
          this.loadEdits();
          return;
        }
      } catch {
        // fall through to sample
      }
      this.book = this.normalizeBook(sampleBook);
    },

    /**
     * 标准化书籍数据
     * @param {Object} raw - 原始书籍数据
     * @returns {Object} 标准化后的书籍
     */
    normalizeBook(raw) {
      const pages = Array.isArray(raw.pages) ? raw.pages : [];
      return {
        title: String(raw.title || '未命名内容'),
        pages: pages.map((page, index) => ({
          page: Number(page.page || index + 1),
          image: typeof page.image === 'string' ? page.image : '',
          lines: Array.isArray(page.lines)
            ? page.lines.map((line) => ({
                en: String(line.en || '').trim(),
                zh: String(line.zh || '').trim(),
                breakAfter: Boolean(line.breakAfter)
              })).filter((line) => line.en || line.zh)
            : []
        })).filter((page) => page.lines.length || page.image)
      };
    },

    /**
     * 查词典
     * @param {string} word
     * @returns {string} 释义
     */
    lookupWord(word) {
      const key = String(word || '').toLowerCase();
      return dictionary[key] || WORD_FALLBACK_MEANING;
    },

    /**
     * 查单词音标
     * @param {string} word
     * @returns {string}
     */
    lookupWordPhonetic(word) {
      const key = String(word || '').toLowerCase();
      return phonetics[key] || '';
    },

    /**
     * 保存单词释义到 localStorage 和内存词典
     * @param {string} word
     * @param {string} meaning
     */
    saveWordMeaning(word, meaning, phonetic = '') {
      const key = String(word || '').toLowerCase().trim();
      const value = String(meaning || '').trim();
      if (!key || !value) return;

      dictionary[key] = value;
      const phoneticValue = String(phonetic || '').trim();
      if (phoneticValue) phonetics[key] = phoneticValue;
      try {
        const saved = JSON.parse(localStorage.getItem(WORD_TRANSLATION_CACHE_KEY) || '{}');
        saved[key] = value;
        localStorage.setItem(WORD_TRANSLATION_CACHE_KEY, JSON.stringify(saved));
        if (phoneticValue) {
          const savedPhonetics = JSON.parse(localStorage.getItem(WORD_PHONETIC_CACHE_KEY) || '{}');
          savedPhonetics[key] = phoneticValue;
          localStorage.setItem(WORD_PHONETIC_CACHE_KEY, JSON.stringify(savedPhonetics));
        }
      } catch {
        // localStorage may be unavailable
      }
    },

    /**
     * 保存编辑到 localStorage
     */
    saveEdits() {
      try {
        localStorage.setItem(BOOK_EDITS_KEY, JSON.stringify(this.book));
      } catch {
        // Local storage may be unavailable in some browser privacy modes.
      }
    },

    /**
     * 从 localStorage 加载编辑
     */
    loadEdits() {
      try {
        const saved = JSON.parse(localStorage.getItem(BOOK_EDITS_KEY) || 'null');
        if (saved?.title === this.book.title && Array.isArray(saved.pages) && saved.pages.length === this.book.pages.length) {
          this.book = this.normalizeBook(saved);
        }
      } catch {
        localStorage.removeItem(BOOK_EDITS_KEY);
      }
    },

    /**
     * 文本分词
     * @param {string} text
     * @returns {string[]} 词元数组
     */
    tokenize(text) {
      return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]/g) || [];
    },

    /**
     * 行分组 - 将行按逻辑合并为段落块
     * @param {Array<{en: string, zh: string}>} lines
     * @returns {Array<{en: string, zh: string, sourceLines: Array}>}
     */
    groupLines(lines) {
      const groups = [];
      let current = [];

      function pushCurrent() {
        if (!current.length) return;
        groups.push({
          en: current.map((line) => line.en).filter(Boolean).join(' '),
          zh: current.map((line) => line.zh).filter(Boolean).join('\n'),
          sourceLines: current
        });
        current = [];
      }

      lines.forEach((line, index) => {
        const text = line.en.trim();
        if (!text && !line.zh) return;

        if (current.length && lineLooksLikeHeading(text)) {
          pushCurrent();
        }

        current.push(line);

        const joined = current.map((item) => item.en).join(' ');
        const endOfThought = /[.!?。！？]"?$/.test(text);
        const next = lines[index + 1]?.en || '';
        const nextLooksNew = lineLooksLikeHeading(next);

        if (line.zh || current.length >= 5 || (endOfThought && joined.length > 120) || (endOfThought && nextLooksNew)) {
          pushCurrent();
        } else if (line.breakAfter) {
          pushCurrent();
        }
      });

      pushCurrent();
      return groups;
    },

    /**
     * 翻译单词到中文
     * 优先使用有道本地翻译，回退到 iciba
     * @param {string} word - 要翻译的单词
     * @param {string} [voiceMode='youdao'] - 发音模式
     * @returns {Promise<string>} 翻译结果
     */
    async translateWordToChinese(word, voiceMode = 'youdao') {
      const value = String(word || '').trim();
      if (!value) return '';

      if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        try {
          const response = await fetch(`/youdao/translate?word=${encodeURIComponent(value)}`);
          if (response.ok) {
            const data = await response.json();
            const meaning = data?.data?.meaning;
            if (meaning) {
              return {
                meaning: String(meaning).trim(),
                phonetic: String(data?.data?.phonetic || '').trim()
              };
            }
          }
        } catch {
          // fall through to iciba
        }
      }

      // 动态导入避免循环依赖
      const { translateWithIciba } = await import('../api/voice/iciba.js');
      const { md5 } = await import('../api/voice/youdao.js');
      const [translation] = await translateWithIciba([value], 'en', 'zh', md5);
      return String(translation || '').trim();
    }
  });

  bookStoreInstance = store;
  return store;
}
