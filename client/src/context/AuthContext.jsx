import axios from "axios";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AuthContext = createContext();

const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:9000",
  withCredentials: true,
});

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
      const response = await client.get("/user/profile");
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
        toast.success("Registration successful! Please log in.");
        router("/login");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
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
        toast.success("Login successful!");
        const username = request.data.user?.username || "";
        setUserData({ username, email });
        setIsAuthenticated(true);
        router("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      let request = await client.get("/auth/logout");

      if (request.status === 200) {
        toast.success("Logout successful!");
        setUserData({ username: "", email: "" });
        setIsAuthenticated(false);
        router("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      const errorMessage =
        error.response?.data?.message || "Logout failed. Please try again.";
      toast.error(errorMessage);
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
