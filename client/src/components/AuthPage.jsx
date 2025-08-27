import React, { useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function AuthPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const location = useLocation();

  const [formState, setFormState] = useState(
    location.pathname.includes("register") ? "register" : "login"
  );

  const { handleRegister, handleLogin } = useContext(AuthContext);

  useEffect(() => {
    if (location.pathname.includes("register")) {
      setFormState("register");
    } else if (location.pathname.includes("login")) {
      setFormState("login");
    }
  }, [location.pathname]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (formState === "register") {
        await handleRegister(username, email, password);
        setFormState("login");
        setEmail("");
        setPassword("");
      }
      if (formState === "login") {
        await handleLogin(email, password);
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      toast.error("Authentication failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md p-6 md:p-8 rounded-xl backdrop-blur-lg bg-black/30 
                      border border-gray-700 shadow-2xl transform transition-all duration-300
                      hover:shadow-cyan-500/10">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 
                         transition-all duration-300">
            {formState === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm md:text-base text-gray-400">
            {formState === "login"
              ? "Enter your credentials to access your account"
              : "Join us! Create your account today"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4 md:space-y-6">
          {formState === "register" && (
            <div className="transition-all duration-300">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 md:py-3 rounded-lg bg-black/40 border border-gray-600 
                          text-white focus:border-cyan-400 focus:ring-cyan-400 focus:outline-none 
                          transition-all duration-300 text-sm md:text-base"
                placeholder="Enter your username"
                required
              />
            </div>
          )}

          <div className="transition-all duration-300">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 md:py-3 rounded-lg bg-black/40 border border-gray-600 
                        text-white focus:border-cyan-400 focus:ring-cyan-400 focus:outline-none 
                        transition-all duration-300 text-sm md:text-base"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="transition-all duration-300">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 md:py-3 rounded-lg bg-black/40 border border-gray-600 
                        text-white focus:border-cyan-400 focus:ring-cyan-400 focus:outline-none 
                        transition-all duration-300 text-sm md:text-base"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 md:py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 
                      hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg 
                      transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                      text-sm md:text-base mt-4"
          >
            {formState === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Toggle between Login/Register */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm md:text-base">
            {formState === "login" 
              ? "Don't have an account? " 
              : "Already have an account? "}
            <button
              onClick={() => setFormState(formState === "login" ? "register" : "login")}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {formState === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

