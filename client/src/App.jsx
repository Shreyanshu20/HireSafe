import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomePage from "./components/Homepage.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Layout from "./Layout.jsx";
import Meetings from "./components/Meetings.jsx";

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
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />

          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage />} />

          <Route path="meeting" element={<Meetings />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
