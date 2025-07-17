import React, { useContext, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

function AuthPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();

  const [formState, setFormState] = useState(
    window.location.pathname.includes("register") ? "register" : "login"
  );

  const { handleRegister, handleLogin } = useContext(AuthContext);

  let handleAuth = async () => {
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
    <>
      <h1>Authentication</h1>

      <button onClick={() => setFormState("login")}>Login</button>
      <button onClick={() => setFormState("register")}>Register</button>
      <br />

      <form action="">
        {formState === "register" ? (
          <input
            type="text"
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />
        ) : (
          ""
        )}
        <br />
        <input
          type="email"
          placeholder="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
      </form>
      <button onClick={handleAuth}>
        {formState === "register" ? "Register" : "Login"}
      </button>
    </>
  );
}

export default AuthPage;
