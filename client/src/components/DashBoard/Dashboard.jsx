import React from "react";
import { useAuth } from "../../context/AuthContext";
import ActivityLog from "./ActivityLog";

function DashBoard() {
  const { userData } = useAuth();

  return (
    <div className="min-h-screen bg-black/95 p-3 sm:p-4 md:p-6 lg:p-8 relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Dashboard Header */}
      <div className="max-w-7xl mx-auto mb-6 sm:mb-8 md:mb-12 relative">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl 
                      border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500 group">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            {/* User Icon Container */}
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-xl sm:rounded-2xl 
                          bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center 
                          transform group-hover:scale-110 transition-all duration-300
                          shadow-lg shadow-cyan-500/20">
              <i className="fa-solid fa-user text-xl sm:text-2xl md:text-3xl text-white"></i>
            </div>

            {/* Welcome Text Container */}
            <div className="space-y-1 sm:space-y-2 md:space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Welcome back, {userData?.name || 'User'}
              </h1>
              <p className="text-gray-400 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                <i className="fa-solid fa-clock text-cyan-400"></i>
                Here's your latest activity
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto relative">
        <div className="rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border border-gray-700/50
                      hover:border-gray-600/50 transition-all duration-500 shadow-lg
                      hover:shadow-cyan-500/5">
          <ActivityLog />
        </div>
      </div>
    </div>
  );
}

export default DashBoard;
