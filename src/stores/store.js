import { reactive } from 'vue';

export function createStore(initializer) {
  let instance = null;
  return function useStore() {
    if (instance) return instance;
    instance = reactive(initializer());
    return instance;
  };
}

export function createSingletonStore(initializer) {
  let instance = null;
  return function useStore(options) {
    if (instance) return instance;
    instance = reactive(initializer(options));
    return instance;
  };
}

export function createLocalStorageStore(keys, initializer) {
  let instance = null;
  return function useStore() {
    if (instance) return instance;

    const loadFromStorage = () => {
      const data = {};
      for (const [key, defaultValue] of Object.entries(keys)) {
        try {
          const saved = localStorage.getItem(key);
          data[key] = saved !== null ? JSON.parse(saved) : defaultValue;
        } catch {
          data[key] = defaultValue;
        }
      }
      return data;
    };

    const storageData = loadFromStorage();
    const store = reactive(initializer(storageData));

    store._save = function () {
      for (const [key] of Object.entries(keys)) {
        try {
          localStorage.setItem(key, JSON.stringify(this[key]));
        } catch {
          // localStorage may be unavailable
        }
      }
    };

    instance = store;
    return instance;
  };
}