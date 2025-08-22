import React from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";

function HomePage() {
  const { isLoggedIn, handleLogout } = useContext(AuthContext);

  return (
    <>
      <h1>HomePage</h1>

      {isLoggedIn() ? (
        <>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <br />
          <Link to="/register">Register</Link>
          <br />
        </>
      )}

      <br />

      {isLoggedIn() && (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <br />
        </>
      )}

      <Link to="/meeting">Meetings</Link>
      <br />

      <Link to="/interview">Interview</Link>
      <br />
    </>
  );
}

export default HomePage;
