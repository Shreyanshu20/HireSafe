import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function Layout() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your authentication logic here
  };

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Prismatic Aurora Burst - Multi-layered Gradient Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
            radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
            radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
            radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
            #000000
          `,
        }}
      />

      {/* Content Layer - Above Background */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>

      {/* Login Form Overlay */}
      <div className="flex items-center justify-center min-h-[calc(100vh-160px)]">
        <div className="w-full max-w-md p-8 mx-4 rounded-2xl backdrop-blur-md bg-black/30 border border-gray-700/50 shadow-xl">
          {/* Decorative elements that match the background theme */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 blur-xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl" />
          </div>

          {/* Form Content */}
          <div className="relative">
            <h2 className="text-3xl font-bold text-white text-center mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {isLogin ? "Sign in to continue" : "Sign up to get started"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-600 
                text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 
                focus:outline-none transition duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-600 
                text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 
                focus:outline-none transition duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 
              hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg 
              transition duration-200 transform hover:scale-[1.02]"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
