import React, { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  const { isLoggedIn, handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to check if current route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Handle logout with navigation
  const handleLogoutClick = () => {
    handleLogout();
    navigate("/");
  };

  // Menu items configuration based on PrimeReact concept
  const getMenuItems = () => {
    const baseItems = [
      {
        label: "Home",
        icon: "🏠",
        path: "/",
        component: Link,
      },
      {
        label: "Meetings",
        icon: "📹",
        path: "/meeting",
        component: Link,
      },
      {
        label: "Interviews",
        icon: "💼",
        path: "/interview",
        component: Link,
      },
    ];

    // Add dashboard if logged in
    if (isLoggedIn()) {
      baseItems.splice(1, 0, {
        label: "Dashboard",
        icon: "📊",
        path: "/dashboard",
        component: Link,
      });
    }

    return baseItems;
  };

  const authItems = () => {
    if (isLoggedIn()) {
      return [
        {
          label: "Logout",
          icon: "🚪",
          action: handleLogoutClick,
          className: "logout-btn",
        },
      ];
    } else {
      return [
        {
          label: "Login",
          icon: "🔑",
          path: "/login",
          component: Link,
        },
        {
          label: "Register",
          icon: "📝",
          path: "/register",
          component: Link,
          className: "register-btn",
        },
      ];
    }
  };

  const menuItems = getMenuItems();
  const authMenuItems = authItems();

  return (
    <nav className="shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-xl px-4 py-2 rounded-lg transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
                <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  HireSafe
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {menuItems.map((item, index) => {
                const ItemComponent = item.component;
                return (
                  <ItemComponent
                    key={index}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      isActive(item.path)
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </ItemComponent>
                );
              })}
            </div>
          </div>

          {/* Desktop Auth Items */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-3">
              {authMenuItems.map((item, index) => {
                if (item.action) {
                  return (
                    <button
                      key={index}
                      onClick={item.action}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                        item.className === "logout-btn"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                } else {
                  const ItemComponent = item.component;
                  return (
                    <ItemComponent
                      key={index}
                      to={item.path}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                        item.className === "register-btn"
                          ? isActive(item.path)
                            ? "bg-purple-600 text-white"
                            : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                          : isActive(item.path)
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </ItemComponent>
                  );
                }
              })}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              onClick={() => {
                const mobileMenu = document.getElementById("mobile-menu");
                mobileMenu.classList.toggle("hidden");
              }}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden hidden" id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
          {/* Mobile Menu Items */}
          {menuItems.map((item, index) => {
            const ItemComponent = item.component;
            return (
              <ItemComponent
                key={index}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                  isActive(item.path)
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
                onClick={() => {
                  document
                    .getElementById("mobile-menu")
                    .classList.add("hidden");
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </ItemComponent>
            );
          })}

          {/* Mobile Auth Items */}
          <div className="border-t border-gray-700 pt-3 mt-3 space-y-2">
            {authMenuItems.map((item, index) => {
              if (item.action) {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      document
                        .getElementById("mobile-menu")
                        .classList.add("hidden");
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              } else {
                const ItemComponent = item.component;
                return (
                  <ItemComponent
                    key={index}
                    to={item.path}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                      item.className === "register-btn"
                        ? isActive(item.path)
                          ? "bg-purple-600 text-white"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                        : isActive(item.path)
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                    onClick={() => {
                      document
                        .getElementById("mobile-menu")
                        .classList.add("hidden");
                    }}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </ItemComponent>
                );
              }
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}



export default Navbar;
