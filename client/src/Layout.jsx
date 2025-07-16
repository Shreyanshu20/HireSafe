import React from "react";
import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div>
      <h2>Navbar</h2>
      <Outlet />
      <h2>Footer</h2>
    </div>
  );
}

export default Layout;
