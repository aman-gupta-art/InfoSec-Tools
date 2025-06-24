import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  updateUserTheme: (userId: number, theme: ThemeType) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Get from localStorage
    const savedTheme = localStorage.getItem('theme') as ThemeType | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Or set based on system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    }
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
  };

  // Update user theme preference in database
  const updateUserTheme = async (userId: number, newTheme: ThemeType) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('/api/auth/update-theme', {
          theme: newTheme
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, updateUserTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 