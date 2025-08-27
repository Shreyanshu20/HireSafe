import React, { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  const { isLoggedIn, handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogoutClick = () => {
    handleLogout();
    navigate("/");
    setMobileOpen(false);
  };

  const getMenuItems = () => {
    const baseItems = [
      { label: "Home", icon: "fa-solid fa-house", path: "/", component: Link },
      { label: "Meetings", icon: "fa-solid fa-video", path: "/meeting", component: Link },
      { label: "Interviews", icon: "fa-solid fa-briefcase", path: "/interview", component: Link },
    ];
    if (isLoggedIn()) {
      baseItems.splice(1, 0, {
        label: "Dashboard",
        icon: "fa-solid fa-chart-column",
        path: "/dashboard",
        component: Link,
      });
    }
    return baseItems;
  };

  const authItems = () =>
    isLoggedIn()
      ? [{ label: "Logout", icon: "fa-solid fa-right-from-bracket", action: handleLogoutClick, className: "logout-btn" }]
      : [
          { label: "Login", icon: "fa-solid fa-right-to-bracket", path: "/login", component: Link },
          { label: "Register", icon: "fa-solid fa-user-plus", path: "/register", component: Link, className: "register-btn" },
        ];

  const menuItems = getMenuItems();
  const authMenuItems = authItems();

  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
              
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {menuItems.map((item, i) => {
                const Item = item.component;
                return (
                  <Item
                    key={i}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      isActive(item.path) ? "bg-blue-600 text-white" : "text-gray-200 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <i className={`${item.icon} text-base`}></i>
                    <span>{item.label}</span>
                  </Item>
                );
              })}
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-3">
              {authMenuItems.map((item, i) =>
                item.action ? (
                  <button
                    key={i}
                    onClick={item.action}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      item.className === "logout-btn"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "text-gray-200 hover:bg-slate-800 hover:text-white border border-slate-600"
                    }`}
                  >
                    <i className={`${item.icon}`}></i>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <item.component
                    key={i}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      item.className === "register-btn"
                        ? isActive(item.path)
                          ? "bg-purple-600 text-white"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                        : isActive(item.path)
                        ? "bg-blue-600 text-white"
                        : "text-gray-200 hover:bg-slate-800 hover:text-white border border-slate-600"
                    }`}
                  >
                    <i className={`${item.icon}`}></i>
                    <span>{item.label}</span>
                  </item.component>
                )
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden">
            <button
              className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white"
              onClick={() => setMobileOpen((s) => !s)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div id="mobile-menu" className={`${mobileOpen ? "" : "hidden"} md:hidden`}>
        <div className="px-2 pt-2 pb-3 sm:px-3 bg-slate-900/95 border-t border-white/10">
          {menuItems.map((item, i) => {
            const Item = item.component;
            return (
              <Item
                key={i}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                  isActive(item.path) ? "bg-blue-600 text-white" : "text-gray-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span>{item.label}</span>
              </Item>
            );
          })}

          <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
            {authMenuItems.map((item, i) =>
              item.action ? (
                <button
                  key={i}
                  onClick={handleLogoutClick}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors duration-200 flex items-center space-x-3"
                >
                  <i className={`${item.icon} text-lg`}></i>
                  <span>{item.label}</span>
                </button>
              ) : (
                <item.component
                  key={i}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                    item.className === "register-btn"
                      ? isActive(item.path)
                        ? "bg-purple-600 text-white"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                      : isActive(item.path)
                      ? "bg-blue-600 text-white"
                      : "text-gray-200 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <i className={`${item.icon} text-lg`}></i>
                  <span>{item.label}</span>
                </item.component>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
