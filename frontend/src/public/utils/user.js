export default class AuthService {
  /**
   * Registers a new user via the backend API.
   * @param {Object} user - The user data to register.
   */
  static async register(user) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Cache user data in localStorage for quick access
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logs in the user via the backend API.
   * @param {Object} credentials - The login credentials (username, password).
   */
  static async login(credentials) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Cache user data in localStorage for quick access
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the current user from the backend.
   * Falls back to localStorage cache if needed.
   * @returns {Object|null} The user data or null if not found.
   */
  static async getUser() {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        // Try to get from localStorage cache
        const cachedUser = localStorage.getItem('user');
        return cachedUser ? JSON.parse(cachedUser) : null;
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        // Update localStorage cache
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }

      return null;
    } catch (error) {
      console.error('Get user error:', error);
      // Fallback to localStorage
      const cachedUser = localStorage.getItem('user');
      return cachedUser ? JSON.parse(cachedUser) : null;
    }
  }

  /**
   * Logs out the user via the backend API.
   */
  static async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear localStorage
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear localStorage anyway
      localStorage.removeItem('user');
    }
  }

  /**
   * Updates user profile via the backend API.
   * @param {Object} updatedData - The data to update.
   */
  static async updateUser(updatedData) {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }

      // Update localStorage cache
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data.user;
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Could not update user: ' + error.message);
    }
  }
}
