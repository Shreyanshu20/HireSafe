import axios from "axios";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

// Create axios instance with credentials
const client = axios.create({
  baseURL: server_url,
  withCredentials: true,
});

// Add request interceptor to include token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers['x-auth-token'] = token;
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

class ActivityService {
  async logActivity(activityType, description, metadata = {}) {
    try {
      const response = await client.post('/user/log-activity', {
        activity_type: activityType,
        description,
        metadata
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error.message };
    }
  }

  async getActivities(page = 1, limit = 20, activityType = null, includeStats = false) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        stats: includeStats.toString()
      });
      
      if (activityType) {
        params.append('activity_type', activityType);
      }

      const response = await client.get(`/user/activities?${params}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return { 
        success: false, 
        error: error.message,
        data: {
          activities: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          stats: {
            totalActivities: 0,
            activityBreakdown: []
          }
        }
      };
    }
  }
}

export const ACTIVITY_TYPES = {
  LOGIN: 'LOGIN',
  MEETING: 'MEETING',
  INTERVIEW: 'INTERVIEW',
  PROFILE_UPDATE: 'PROFILE_UPDATE'
};

export default new ActivityService();