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

// PIM Server related API calls
export const pimServerApi = {
  // Get all PIM servers with pagination and filters
  getPimServers: async (params) => {
    return api.get('/pim-servers', { params });
  },
  
  // Get a single PIM server by ID
  getPimServer: async (id) => {
    return api.get(`/pim-servers/${id}`);
  },
  
  // Create a new PIM server
  createPimServer: async (pimServerData) => {
    return api.post('/pim-servers', pimServerData);
  },
  
  // Update an existing PIM server
  updatePimServer: async (id, pimServerData) => {
    return api.put(`/pim-servers/${id}`, pimServerData);
  },
  
  // Delete a PIM server
  deletePimServer: async (id) => {
    return api.delete(`/pim-servers/${id}`);
  },
  
  // Import PIM servers from Excel file
  importPimServers: async (formData) => {
    return api.post('/pim-servers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Get import template
  getImportTemplate: async () => {
    return api.get('/pim-servers/import-template', {
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  },
  
  // Export PIM servers to Excel
  exportPimServers: async (params) => {
    return api.get('/pim-servers/export', {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  },
  
  // Get distinct values for filters
  getFilterOptions: async (fields) => {
    return api.get('/pim-servers/filter-options', {
      params: { fields }
    });
  },
  
  // Clear all PIM servers (admin only)
  clearAllPimServers: async () => {
    return api.delete('/pim-servers/clear-all');
  }
};

// PIM User related API calls
export const pimUserApi = {
  // Get all PIM users with pagination and filters
  getPimUsers: async (params) => {
    return api.get('/pim-users', { params });
  },
  
  // Get a single PIM user by ID
  getPimUser: async (id) => {
    return api.get(`/pim-users/${id}`);
  },
  
  // Create a new PIM user
  createPimUser: async (pimUserData) => {
    return api.post('/pim-users', pimUserData);
  },
  
  // Update an existing PIM user
  updatePimUser: async (id, pimUserData) => {
    return api.put(`/pim-users/${id}`, pimUserData);
  },
  
  // Delete a PIM user
  deletePimUser: async (id) => {
    return api.delete(`/pim-users/${id}`);
  },
  
  // Import PIM users from Excel file
  importPimUsers: async (formData) => {
    return api.post('/pim-users/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Get import template
  getImportTemplate: async () => {
    try {
      return api.get('/pim-users/template', {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
    } catch (error) {
      console.error('API call error in getImportTemplate:', error);
      throw error;
    }
  },
  
  // Export PIM users to Excel
  exportPimUsers: async (params) => {
    return api.get('/pim-users/export', {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  },
  
  // Get distinct values for filters
  getFilterOptions: async (fields) => {
    return api.get('/pim-users/filter-options', {
      params: { fields }
    });
  },
  
  // Clear all PIM users (admin only)
  clearAllPimUsers: async () => {
    return api.delete('/pim-users/clear-all');
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