import React from "react";
import { Link } from "react-router-dom";

export default function Homepage() {
  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <header className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
          {/* Card */}
          <div className="rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-6 sm:p-10 md:p-14">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Left: text */}
              <div>
                <h1 className="font-extrabold tracking-tight leading-tight text-white text-4xl sm:text-5xl md:text-6xl">
                  Secure. Smart. <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    HireSafe.
                  </span>
                </h1>

                <p className="mt-6 text-gray-300 text-base sm:text-lg leading-relaxed max-w-prose">
                  AI-powered interview platform with real-time anomaly
                  detection, live coding environment, and secure video
                  conferencing for fair and transparent technical interviews.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/interview"
                    className="px-6 py-3 rounded-xl font-semibold text-white shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                  >
                    <i className="fa-solid fa-code"></i>
                    <span>Start Interview</span>
                  </Link>

                  <Link
                    to="/meeting"
                    className="px-6 py-3 rounded-xl font-semibold text-gray-200 border border-gray-500 hover:border-blue-400 hover:shadow-[0_0_0_6px_rgba(59,130,246,0.25)] transition-all duration-200 flex items-center space-x-2"
                  >
                    <i className="fa-solid fa-video"></i>
                    <span>Join Meeting</span>
                  </Link>
                </div>

                {/* Features List */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm">
                      <i className="fa-solid fa-check text-white"></i>
                    </div>
                    <span className="text-gray-300">AI Anomaly Detection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm">
                      <i className="fa-solid fa-check text-white"></i>
                    </div>
                    <span className="text-gray-300">Live Code Editor</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm">
                      <i className="fa-solid fa-check text-white"></i>
                    </div>
                    <span className="text-gray-300">HD Video Calls</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm">
                      <i className="fa-solid fa-check text-white"></i>
                    </div>
                    <span className="text-gray-300">Real-time Chat</span>
                  </div>
                </div>
              </div>

              {/* Right: image - CORRECT PUBLIC FOLDER REFERENCE */}
              <div className="relative h-[280px] sm:h-[340px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl">
                <img
                  src="/interview.png"
                  alt="Interview illustration"
                  className="absolute inset-0 object-cover"
                />
                {/* subtle glow overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(60%_35%_at_60%_0%,rgba(124,77,255,0.18),transparent_60%)]" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose HireSafe?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Our platform ensures fair, secure, and comprehensive technical
              interviews
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-200">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                <i className="fa-solid fa-robot text-white"></i>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                AI-Powered Detection
              </h3>
              <p className="text-gray-400">
                Advanced facial recognition and behavior analysis to detect
                anomalies and ensure interview integrity.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-200">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                <i className="fa-solid fa-laptop-code text-white"></i>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Live Coding Environment
              </h3>
              <p className="text-gray-400">
                Real-time collaborative code editor with syntax highlighting and
                instant execution.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-green-500/50 transition-all duration-200">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                <i className="fa-solid fa-shield-halved text-white"></i>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Secure & Private
              </h3>
              <p className="text-gray-400">
                End-to-end encryption and secure data handling to protect
                sensitive interview data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Interviews?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of companies using HireSafe for fair, secure, and
              efficient technical interviews.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/meeting"
                className="px-8 py-4 rounded-xl font-semibold text-white shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                Get Started Free
              </Link>
              <Link
                to="/dashboard"
                className="px-8 py-4 rounded-xl font-semibold text-gray-200 border border-gray-500 hover:border-blue-400 hover:shadow-[0_0_0_6px_rgba(59,130,246,0.25)] transition-all duration-200"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
