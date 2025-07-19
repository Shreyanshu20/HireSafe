import axios from "axios";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AuthContext = createContext();

const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:9000",
});

export const AuthProvider = ({ children }) => {
  // Initialize with empty object instead of undefined context
  const [userData, setUserData] = useState({ username: "", email: "" });

  const router = useNavigate();

  const handleRegister = async (username, email, password) => {
    try {
      let request = await client.post(
        "/auth/register",
        {
          username,
          email,
          password,
        },
        { withCredentials: true }
      );

      if (request.status === 201) {
        toast.success("Registration successful! Please log in.");
        setUserData({ username, email });

        router("/login");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      toast.error("Registration failed. Please try again.");
    }
  };

  const handleLogin = async (email, password) => {
    try {
      let request = await client.post(
        "/auth/login",
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      if (request.status === 200) {
        toast.success("Login successful!");
        // Get username from response if available
        const username = request.data.user?.username || "";
        setUserData({ username, email });

        router("/");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      let request = await client.get("/auth/logout", { withCredentials: true });

      if (request.status === 200) {
        toast.success("Logout successful!");
        setUserData({ username: "", email: "" });
        router("/");
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  const isLoggedIn = () => {
    return userData && userData.email;
  };

  const data = {
    userData,
    setUserData,
    handleRegister,
    handleLogin,
    handleLogout,
    isLoggedIn,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
