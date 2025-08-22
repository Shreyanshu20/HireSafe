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

class InterviewService {
  async createInterview(interviewCode, config = {}) {
    try {
      const response = await client.post('/interview/create', {
        meeting_code: interviewCode,
        interview_config: config
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create interview:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async joinInterview(interviewCode) {
    try {
      const response = await client.post('/interview/join', {
        meeting_code: interviewCode
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to join interview:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async verifyInterview(interviewCode) {
    try {
      const response = await client.get(`/interview/verify/${interviewCode}`);
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to verify interview:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async endInterviewSession(sessionId, malpracticeCount = 0) {
    try {
      const response = await client.post('/interview/end-session', {
        sessionId,
        malpracticeCount
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to end interview session:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async logMalpracticeDetection(interviewCode, type, confidence, metadata = {}) {
    try {
      const response = await client.post('/user/log-activity', {
        activity_type: 'MALPRACTICE_DETECTION',
        description: `Malpractice detected: ${type}`,
        metadata: {
          interview_code: interviewCode,
          malpractice_type: type,
          confidence_score: confidence,
          ...metadata
        }
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to log malpractice:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
}

export default new InterviewService();