export default class AuthService {
  static async saveUser(user) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      console.warn('Could not save user to localStorage');
    }
  }

  static async getUser() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  static async clearUser() {
    try {
      localStorage.removeItem('user');
    } catch {
      console.warn('Could not save user to localStorage');
    }
  }
}
