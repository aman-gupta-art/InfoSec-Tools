import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Log API responses for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response for ${response.config.url}:`, response);
    return response;
  },
  (error) => {
    console.error(`API Error for ${error.config?.url || 'unknown endpoint'}:`, error);
    return Promise.reject(error);
  }
);

// Server related API calls
export const serverApi = {
  // Get all servers with pagination and filters
  getServers: async (params) => {
    console.log('Getting servers with params:', params);
    return api.get('/servers', { params });
  },
  
  // Get a single server by ID
  getServer: async (id) => {
    return api.get(`/servers/${id}`);
  },
  
  // Create a new server
  createServer: async (serverData) => {
    return api.post('/servers', serverData);
  },
  
  // Update an existing server
  updateServer: async (id, serverData) => {
    return api.put(`/servers/${id}`, serverData);
  },
  
  // Delete a server
  deleteServer: async (id) => {
    return api.delete(`/servers/${id}`);
  },
  
  // Import servers from Excel file
  importServers: async (formData) => {
    return api.post('/servers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Get import template
  getImportTemplate: async () => {
    return api.get('/servers/import-template', {
      responseType: 'blob',
    });
  },
  
  // Export servers to Excel
  exportServers: async (params) => {
    return api.get('/servers/export', {
      params,
      responseType: 'blob',
    });
  },
  
  // Get dashboard statistics
  getDashboardStats: async () => {
    return api.get('/servers/dashboard-stats');
  },
  
  // Get distinct values for filters
  getFilterOptions: async (fields) => {
    console.log('Getting filter options for fields:', fields);
    return api.get('/servers/filter-options', {
      params: { fields: fields }
    });
  },
  
  // Clear all servers (admin only)
  clearAllServers: async () => {
    return api.delete('/servers/clear-all');
  }
};

// User related API calls
export const userApi = {
  // Get all users with pagination, sorting, and search
  getUsers: async (params) => {
    return api.get('/users', { params });
  },
  
  // Get a single user by ID
  getUser: async (id) => {
    return api.get(`/users/${id}`);
  },
  
  // Create a new user
  createUser: async (userData) => {
    return api.post('/auth/register', userData);
  },
  
  // Update an existing user
  updateUser: async (id, userData) => {
    return api.put(`/users/${id}`, userData);
  },
  
  // Delete a user
  deleteUser: async (id) => {
    return api.delete(`/users/${id}`);
  }
};

// Auth related API calls
export const authApi = {
  // Login
  login: async (credentials) => {
    return api.post('/auth/login', credentials);
  },
  
  // Register
  register: async (userData) => {
    return api.post('/auth/register', userData);
  },
  
  // Get current user profile
  getProfile: async () => {
    return api.get('/auth/profile');
  },
  
  // Update user profile
  updateProfile: async (profileData) => {
    return api.put('/auth/profile', profileData);
  },
  
  // Change password
  changePassword: async (passwordData) => {
    return api.put('/auth/change-password', passwordData);
  }
};

// Activity log related API calls
export const activityLogApi = {
  // Get all logs with pagination and filters
  getLogs: async (params) => {
    return api.get('/activity-logs', { params });
  },
  
  // Get log statistics
  getLogStats: async () => {
    return api.get('/activity-logs/stats');
  },
  
  // Export logs to Excel
  exportLogs: async (params) => {
    return api.get('/activity-logs/export', {
      params,
      responseType: 'blob',
    });
  },
  
  // Clear all logs (admin only)
  clearAllLogs: async () => {
    return api.delete('/activity-logs/clear-all');
  }
};

export default api; 