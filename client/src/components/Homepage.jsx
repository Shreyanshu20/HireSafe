import React from "react";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <>
      <h1>HomePage</h1>
      <Link to="/login">Login</Link>
      <br />
      <Link to="/register">Register</Link>
      <br />
      <Link to="/meeting">Meetings</Link>
      <br />
    </>
  );
}

export default HomePage;
