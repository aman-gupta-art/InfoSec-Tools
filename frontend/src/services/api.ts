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

// Server related API calls
export const serverApi = {
  // Get all servers with pagination and filters
  getServers: async (params?: any) => {
    return api.get('/servers', { params });
  },
  
  // Get a single server by ID
  getServer: async (id: number) => {
    return api.get(`/servers/${id}`);
  },
  
  // Create a new server
  createServer: async (serverData: any) => {
    return api.post('/servers', serverData);
  },
  
  // Update an existing server
  updateServer: async (id: number, serverData: any) => {
    return api.put(`/servers/${id}`, serverData);
  },
  
  // Delete a server
  deleteServer: async (id: number) => {
    return api.delete(`/servers/${id}`);
  },
  
  // Import servers from Excel file
  importServers: async (formData: FormData) => {
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
  exportServers: async (params?: any) => {
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
  getFilterOptions: async (fields?: string[]) => {
    return api.get('/servers/filter-options', {
      params: { fields }
    });
  },
  
  // Clear all servers (admin only)
  clearAllServers: async () => {
    return api.delete('/servers/clear-all');
  }
};

// PIM User related API calls
export const pimUserApi = {
  // Get all PIM users with pagination and filters
  getPimUsers: async (params?: any) => {
    return api.get('/pim-users', { params });
  },
  
  // Get a single PIM user by ID
  getPimUser: async (id: number) => {
    return api.get(`/pim-users/${id}`);
  },
  
  // Create a new PIM user
  createPimUser: async (pimUserData: any) => {
    return api.post('/pim-users', pimUserData);
  },
  
  // Update an existing PIM user
  updatePimUser: async (id: number, pimUserData: any) => {
    return api.put(`/pim-users/${id}`, pimUserData);
  },
  
  // Delete a PIM user
  deletePimUser: async (id: number) => {
    return api.delete(`/pim-users/${id}`);
  },
  
  // Import PIM users from Excel file
  importPimUsers: async (formData: FormData) => {
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
  exportPimUsers: async (params?: any) => {
    return api.get('/pim-users/export', {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  },
  
  // Get distinct values for filters
  getFilterOptions: async (fields?: string[]) => {
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
  getUsers: async (params?: any) => {
    return api.get('/users', { params });
  },
  
  // Get a single user by ID
  getUser: async (id: number) => {
    return api.get(`/users/${id}`);
  },
  
  // Create a new user
  createUser: async (userData: any) => {
    return api.post('/auth/register', userData);
  },
  
  // Update an existing user
  updateUser: async (id: number, userData: any) => {
    return api.put(`/users/${id}`, userData);
  },
  
  // Delete a user
  deleteUser: async (id: number) => {
    return api.delete(`/users/${id}`);
  }
};

// Auth related API calls
export const authApi = {
  // Login
  login: async (credentials: { username: string; password: string }) => {
    return api.post('/auth/login', credentials);
  },
  
  // Register
  register: async (userData: any) => {
    return api.post('/auth/register', userData);
  },
  
  // Get current user profile
  getProfile: async () => {
    return api.get('/auth/profile');
  },
  
  // Update user profile
  updateProfile: async (profileData: any) => {
    return api.put('/auth/profile', profileData);
  },
  
  // Change password
  changePassword: async (passwordData: { oldPassword: string; newPassword: string }) => {
    return api.put('/auth/change-password', passwordData);
  }
};

// Activity log related API calls
export const activityLogApi = {
  // Get all logs with pagination and filters
  getLogs: async (params?: any) => {
    return api.get('/activity-logs', { params });
  },
  
  // Get log statistics
  getLogStats: async () => {
    return api.get('/activity-logs/stats');
  },
  
  // Export logs to Excel
  exportLogs: async (params?: any) => {
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
