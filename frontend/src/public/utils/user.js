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
   * Logs in the user by saving their data to localStorage.
   * @param {Object} user - The user data to save.
   */
  static async login(user) {
    
    try {
    const mockUsers = [
      { username: 'testuser', password: 'password123' },
      { username: 'johndoe', password: 'qwerty' },
    ];
    
    const foundUser = mockUsers.find(
      u => u.username === user.username && u.password === user.password
    );

      if (foundUser !== undefined) {
        localStorage.setItem('user', JSON.stringify(foundUser));
      } else {
        throw new Error('User not registered');
      }
    } catch(e) {
      throw new Error(e.message);
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
