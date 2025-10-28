export default class AuthService {
  /**
   * Saves the user data to localStorage.
   * @param {Object} user - The user data to save.
   */
  static async register(user) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      console.warn('Could not save user to localStorage');
    }
  }

  /**
   * Retrieves the user data from localStorage.
   * @returns {Object|null} The user data or null if not found.
   */
  static async getUser() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clears the user data from localStorage.
   */
  static async logout() {
    try {
      localStorage.removeItem('user');
    } catch {
      console.warn('Could not save user to localStorage');
    }
  }
}
