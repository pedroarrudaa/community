import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeSwitcher.css';

const ThemeSwitcher = () => {
  const [darkMode, setDarkMode] = useState(() => {
    // Check if user has previously set a preference
    const savedTheme = localStorage.getItem('theme');
    
    // Check system preference if no saved theme
    if (!savedTheme) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    return savedTheme === 'dark';
  });

  useEffect(() => {
    // Apply theme when component mounts or theme changes
    if (darkMode) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <button 
      className={`theme-switcher ${darkMode ? 'dark' : 'light'} icon-only`} 
      onClick={toggleTheme}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="theme-switcher-icon-container">
        <Sun size={18} className="theme-switcher-icon sun" />
        <Moon size={18} className="theme-switcher-icon moon" />
      </div>
    </button>
  );
};

export default ThemeSwitcher; 