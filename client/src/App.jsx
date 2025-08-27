import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomePage from "./components/Homepage.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Layout from "./Layout.jsx";
import Meetings from "./components/Meetings/Meetings.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import NotFound from "./NotFound.jsx";
import DashBoard from "./components/DashBoard/Dashboard.jsx";
import Interview from "./components/Interview/Interviews.jsx";

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName={() =>
          "relative flex items-center p-4 min-h-16 rounded-xl overflow-hidden cursor-pointer " +
          "backdrop-blur-lg border border-white/20 shadow-2xl text-white font-medium " +
          "transition-all duration-200"
        }
        bodyClassName={() => "text-sm font-medium text-white flex items-center flex-1"}
        progressClassName="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"
        icon={({ type }) => {
          switch (type) {
            case "success":
              return <i className="fa-solid fa-circle-check text-green-400 text-xl mr-3"></i>;
            case "error":
              return <i className="fa-solid fa-circle-xmark text-red-400 text-xl mr-3"></i>;
            case "warning":
              return <i className="fa-solid fa-triangle-exclamation text-yellow-400 text-xl mr-3"></i>;
            case "info":
              return <i className="fa-solid fa-circle-info text-blue-400 text-xl mr-3"></i>;
            default:
              return <i className="fa-solid fa-bell text-gray-400 text-xl mr-3"></i>;
          }
        }}
        closeButton={({ closeToast }) => (
          <button
            onClick={closeToast}
            className="ml-3 p-2 rounded-lg transition-colors duration-200 text-gray-300 hover:text-white hover:bg-white/10 flex-shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        )}
      />
      
      <Routes>
        {/* Routes WITH navbar/footer */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage />} />
          
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashBoard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Routes WITHOUT navbar/footer (Full Screen) */}
        <Route
          path="meeting"
          element={
            <ProtectedRoute>
              <Meetings />
            </ProtectedRoute>
          }
        />

        {/* ✅ Interview routes use separate interview endpoints */}
        <Route
          path="interview"
          element={
            <ProtectedRoute>
              <Interview />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
