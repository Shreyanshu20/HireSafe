import axios from "axios";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ActivityService, { ACTIVITY_TYPES } from '../services/activityService';

export const AuthContext = createContext();

const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:9000",
  withCredentials: true,
});

// Add request interceptor to include token in headers for mobile
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers['x-auth-token'] = token;
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token storage
client.interceptors.response.use(
  (response) => {
    // Store token if provided in response
    if (response.data?.token) {
      localStorage.setItem('userToken', response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState({ username: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const router = useNavigate();

  // Check if user is logged in on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await client.get('/user/profile');
      if (response.status === 200) {
        setUserData({
          username: response.data.username,
          email: response.data.email,
        });
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log("User not authenticated");
      setIsAuthenticated(false);
      setUserData({ username: "", email: "" });
      localStorage.removeItem('userToken');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      let request = await client.post("/auth/register", {
        username,
        email,
        password,
      });

      if (request.status === 201) {
        // Store token if provided
        if (request.data.token) {
          localStorage.setItem('userToken', request.data.token);
        }
        toast.success("Registration successful! Please log in.");
        router("/login");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      let request = await client.post("/auth/login", {
        email,
        password,
      });

      if (request.status === 200) {
        // Store token if provided
        if (request.data.token) {
          localStorage.setItem('userToken', request.data.token);
        }
        
        toast.success("Login successful!");
        const username = request.data.user?.username || "";
        setUserData({ username, email });
        setIsAuthenticated(true);
        
        // Log login activity
        try {
          await ActivityService.logActivity(
            ACTIVITY_TYPES.LOGIN, 
            'User logged in successfully',
            { login_method: 'password' }
          );
        } catch (error) {
          console.error('Failed to log login activity:', error);
        }
        
        router("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      // Log logout activity before clearing data
      try {
        await ActivityService.logActivity(
          ACTIVITY_TYPES.LOGOUT, 
          'User logged out'
        );
      } catch (error) {
        console.error('Failed to log logout activity:', error);
      }
      
      let request = await client.get("/auth/logout");

      if (request.status === 200) {
        toast.success("Logout successful!");
        setUserData({ username: "", email: "" });
        setIsAuthenticated(false);
        localStorage.removeItem('userToken');
        router("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Clear local state even if server request fails
      setUserData({ username: "", email: "" });
      setIsAuthenticated(false);
      localStorage.removeItem('userToken');
      router("/");
    }
  };

  const isLoggedIn = () => {
    return isAuthenticated && userData && userData.email;
  };

  const data = {
    userData,
    setUserData,
    handleRegister,
    handleLogin,
    handleLogout,
    isLoggedIn,
    isAuthenticated,
    isLoading,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
