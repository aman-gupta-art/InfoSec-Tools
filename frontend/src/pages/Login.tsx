import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-700">
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            className="rounded-full bg-gray-100 dark:bg-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">InfoSec Tools</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="p-3 bg-danger-100 dark:bg-danger-900/30 border border-danger-200 text-danger-700 dark:text-danger-300 rounded">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="btn-primary w-full flex justify-center"
              disabled={loading}
            >
              {loading ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : null}
              Sign in
            </button>
          </div>
          
          <div className="text-sm text-center text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="font-medium mb-1">Default credentials:</p>
            <p className="mb-1"><span className="font-semibold">Admin:</span> admin / admin123</p>
            <p><span className="font-semibold">User:</span> user / user123</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 