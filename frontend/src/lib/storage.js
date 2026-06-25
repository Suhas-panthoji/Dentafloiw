// Safe localStorage wrapper that falls back to in-memory storage in restricted environments (e.g. iframes)
let memoryStorage = {};

const isStorageAvailable = () => {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

export const safeStorage = {
  getItem: (key) => {
    if (storageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return memoryStorage[key] || null;
      }
    }
    return memoryStorage[key] || null;
  },
  setItem: (key, value) => {
    if (storageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    memoryStorage[key] = String(value);
  },
  removeItem: (key) => {
    if (storageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    delete memoryStorage[key];
  },
  clear: () => {
    if (storageAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    memoryStorage = {};
  }
};
