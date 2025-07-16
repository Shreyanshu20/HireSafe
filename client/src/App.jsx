import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import HomePage from "./components/Homepage.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Layout from "./Layout.jsx";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />

          <Route path="auth" element={<AuthPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
