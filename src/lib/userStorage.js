// lib/userStorage.js
// User-scoped localStorage utilities to prevent data leakage between users

/**
 * Get the current user's email from localStorage
 * @returns {string|null} The user's email or null if not authenticated
 */
const getCurrentUserEmail = () => {
  return localStorage.getItem('auth_email');
};

/**
 * Create a user-scoped key for localStorage
 * @param {string} key - The base key
 * @param {string|null} email - User email (defaults to current user)
 * @returns {string} The namespaced key
 */
const createUserKey = (key, email = null) => {
  const userEmail = email || getCurrentUserEmail();
  if (!userEmail) {
    throw new Error('No authenticated user found');
  }
  return `user:${userEmail}:${key}`;
};

/**
 * User-scoped localStorage operations
 */
export const userStorage = {
  /**
   * Get an item from localStorage for the current user
   * @param {string} key - The storage key
   * @param {string|null} defaultValue - Default value if not found
   * @returns {string|null} The stored value or defaultValue
   */
  getItem(key, defaultValue = null) {
    try {
      const userKey = createUserKey(key);
      return localStorage.getItem(userKey) || defaultValue;
    } catch (error) {
      console.warn('Error getting user storage item:', error);
      return defaultValue;
    }
  },

  /**
   * Set an item in localStorage for the current user
   * @param {string} key - The storage key
   * @param {string} value - The value to store
   */
  setItem(key, value) {
    try {
      const userKey = createUserKey(key);
      localStorage.setItem(userKey, value);
    } catch (error) {
      console.warn('Error setting user storage item:', error);
    }
  },

  /**
   * Remove an item from localStorage for the current user
   * @param {string} key - The storage key
   */
  removeItem(key) {
    try {
      const userKey = createUserKey(key);
      localStorage.removeItem(userKey);
    } catch (error) {
      console.warn('Error removing user storage item:', error);
    }
  },

  /**
   * Get a JSON object from localStorage for the current user
   * @param {string} key - The storage key
   * @param {any} defaultValue - Default value if not found or parse fails
   * @returns {any} The parsed object or defaultValue
   */
  getJSON(key, defaultValue = null) {
    try {
      const value = this.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.warn('Error parsing JSON from user storage:', error);
      return defaultValue;
    }
  },

  /**
   * Set a JSON object in localStorage for the current user
   * @param {string} key - The storage key
   * @param {any} value - The value to store (will be JSON.stringify'd)
   */
  setJSON(key, value) {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error setting JSON to user storage:', error);
    }
  },

  /**
   * Clear all data for the current user
   * Useful when user logs out or wants to reset their data
   */
  clearUserData() {
    try {
      const userEmail = getCurrentUserEmail();
      if (!userEmail) return;
      
      const prefix = `user:${userEmail}:`;
      const keysToRemove = [];
      
      // Find all keys that belong to this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all user-specific keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Error clearing user data:', error);
    }
  },

  /**
   * Get the current user's email
   * @returns {string|null} The user's email or null if not authenticated
   */
  getCurrentUser() {
    return getCurrentUserEmail();
  },

  /**
   * Check if there's an authenticated user
   * @returns {boolean} True if user is authenticated
   */
  hasUser() {
    return !!getCurrentUserEmail();
  }
};
