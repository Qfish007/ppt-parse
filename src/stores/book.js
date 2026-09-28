/**
 * 单词翻译/查词 Store（原 book store 的子集，已剥离书籍朗读相关功能）
 * 仅保留 vocabulary 模块依赖的：词义/音标查词、翻译、缓存读写
 */
import { reactive } from 'vue';
import { wordCacheRepository } from '../repositories/index.js';

let bookStoreInstance = null;

const WORD_FALLBACK_MEANING = '释义待补充，可以继续点喇叭听发音。';

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

export function useBookStore() {
  if (bookStoreInstance) return bookStoreInstance;

  const dictionary = reactive({ ...defaultDictionary });
  const phonetics = reactive({ side: '/saɪd/' });

  const store = reactive({
    dictionary,
    phonetics,
    WORD_FALLBACK_MEANING,

    async loadWordCache() {
      try {
        const translations = await wordCacheRepository.getAllTranslations();
        translations.forEach(item => {
          if (typeof item.meaning === 'string' && item.meaning.trim()) {
            dictionary[item.word] = item.meaning.trim();
          }
        });

        const phoneticList = await wordCacheRepository.getAllPhonetics();
        phoneticList.forEach(item => {
          if (typeof item.phonetic === 'string' && item.phonetic.trim()) {
            phonetics[item.word] = item.phonetic.trim();
          }
        });
      } catch {
        console.warn('Failed to load word cache from SQLite');
      }
    },

    lookupWord(word) {
      const key = String(word || '').toLowerCase();
      return dictionary[key] || WORD_FALLBACK_MEANING;
    },

    lookupWordPhonetic(word) {
      const key = String(word || '').toLowerCase();
      return phonetics[key] || '';
    },

    async saveWordMeaning(word, meaning, phonetic = '') {
      const key = String(word || '').toLowerCase().trim();
      const value = String(meaning || '').trim();
      if (!key || !value) return;

      dictionary[key] = value;
      const phoneticValue = String(phonetic || '').trim();
      if (phoneticValue) phonetics[key] = phoneticValue;

      await wordCacheRepository.saveTranslation(key, value, phoneticValue);
    },

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
        }
      }

      const { translateWithIciba } = await import('../api/voice/iciba.js');
      const { md5 } = await import('../api/voice/youdao.js');
      const [translation] = await translateWithIciba([value], 'en', 'zh', md5);
      return String(translation || '').trim();
    }
  });

  // 单例首次构造时异步加载缓存（不阻塞 UI）
  store.loadWordCache();

  bookStoreInstance = store;
  return store;
}
