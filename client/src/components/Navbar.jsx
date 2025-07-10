import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { theme, themes, changeTheme } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`${theme.secondary} ${theme.text} shadow-lg fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-opacity-95`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className={`w-8 h-8 ${theme.primary} rounded-lg flex items-center justify-center`}>
              <span className="text-white font-bold">Z</span>
            </div>
            <span className="text-xl font-bold">ZepShare</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? `${theme.primary} text-white`
                    : `${theme.textSecondary} ${theme.hover}`
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Theme Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowThemeSelector(!showThemeSelector)}
                className={`p-2 rounded-md ${theme.hover} transition-colors duration-200`}
              >
                <Palette className="h-5 w-5" />
              </button>
              
              {showThemeSelector && (
                <div className={`absolute right-0 mt-2 w-48 ${theme.card} border rounded-md shadow-lg py-1 z-50`}>
                  {Object.entries(themes).map(([key, themeOption]) => (
                    <button
                      key={key}
                      onClick={() => {
                        changeTheme(key);
                        setShowThemeSelector(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${theme.textSecondary} ${theme.hover} transition-colors duration-200`}
                    >
                      {themeOption.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-md ${theme.hover} transition-colors duration-200`}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className={`md:hidden ${theme.secondary} border-t ${theme.card}`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? `${theme.primary} text-white`
                    : `${theme.textSecondary} ${theme.hover}`
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Theme Switcher */}
            <div className="px-3 py-2">
              <p className={`text-sm font-medium ${theme.textSecondary} mb-2`}>Themes</p>
              <div className="space-y-1">
                {Object.entries(themes).map(([key, themeOption]) => (
                  <button
                    key={key}
                    onClick={() => {
                      changeTheme(key);
                      setIsOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm ${theme.textSecondary} ${theme.hover} transition-colors duration-200`}
                  >
                    {themeOption.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;