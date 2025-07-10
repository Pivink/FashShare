import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const themes = {
  gojo: {
    name: 'Gojo',
    primary: 'bg-blue-600',
    secondary: 'bg-black',
    accent: 'bg-cyan-400',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    background: 'bg-gradient-to-br from-blue-900 via-black to-blue-800',
    card: 'bg-gray-900 border-blue-500',
    hover: 'hover:bg-blue-700'
  },
  purple: {
    name: 'Purple',
    primary: 'bg-purple-600',
    secondary: 'bg-indigo-600',
    accent: 'bg-pink-500',
    text: 'text-white',
    textSecondary: 'text-purple-200',
    background: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-800',
    card: 'bg-purple-900 border-purple-500',
    hover: 'hover:bg-purple-700'
  },
  green: {
    name: 'Green',
    primary: 'bg-green-600',
    secondary: 'bg-emerald-600',
    accent: 'bg-lime-500',
    text: 'text-white',
    textSecondary: 'text-green-200',
    background: 'bg-gradient-to-br from-green-900 via-emerald-900 to-teal-800',
    card: 'bg-green-900 border-green-500',
    hover: 'hover:bg-green-700'
  },
  orange: {
    name: 'Orange',
    primary: 'bg-orange-600',
    secondary: 'bg-red-600',
    accent: 'bg-yellow-500',
    text: 'text-white',
    textSecondary: 'text-orange-200',
    background: 'bg-gradient-to-br from-orange-900 via-red-900 to-yellow-800',
    card: 'bg-orange-900 border-orange-500',
    hover: 'hover:bg-orange-700'
  },
  dark: {
    name: 'Dark',
    primary: 'bg-gray-700',
    secondary: 'bg-gray-800',
    accent: 'bg-gray-500',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    background: 'bg-gradient-to-br from-gray-900 via-black to-gray-800',
    card: 'bg-gray-800 border-gray-600',
    hover: 'hover:bg-gray-600'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('gojo');

  useEffect(() => {
    const savedTheme = localStorage.getItem('zepshare-theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('zepshare-theme', themeName);
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes,
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};