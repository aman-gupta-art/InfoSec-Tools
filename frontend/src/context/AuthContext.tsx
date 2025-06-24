import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  uiTheme: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Set the token in axios default headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch user profile
          const response = await axios.get('/api/users/profile');
          setUser(response.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          // If error, clear token
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Log in user
  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password,
      });

      const { accessToken, ...userData } = response.data;
      
      // Store token
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      
      // Set user data
      setUser(userData);
      
      // Set the token in axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      return Promise.resolve();
    } catch (error) {
      console.error('Login failed:', error);
      return Promise.reject(error);
    }
  };

  // Log out user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 