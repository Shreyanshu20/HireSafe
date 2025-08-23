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
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
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
