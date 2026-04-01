const axios = require('axios');

class UserService {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
  }

  /**
   * Fetch multiple users by their IDs from the Auth Service
   * @param {number[]} ids Array of user IDs
   * @returns {Promise<Object>} Map of ID to user object
   */
  async getUsersBulk(ids) {
    if (!ids || ids.length === 0) return {};
    
    try {
      const uniqueIds = [...new Set(ids)];
      const response = await axios.post(`${this.baseURL}/api/auth/users/bulk`, {
        ids: uniqueIds
      });
      
      const usersMap = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(user => {
          usersMap[user.id] = user;
        });
      }
      return usersMap;
    } catch (error) {
      console.error('❌ Error fetching users in bulk:', error.message);
      return {};
    }
  }

  /**
   * Fetch a single user by ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  async getUserById(id) {
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching user ${id}:`, error.message);
      return null;
    }
  }
}

module.exports = new UserService();
