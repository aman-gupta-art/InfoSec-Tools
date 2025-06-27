import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { serverApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

interface Server {
  id: number;
  hostname: string;
  ipAddress?: string; // Backend uses ip
  ip?: string;        // Add for compatibility with backend
  operatingSystem: string;
  serverRole: string;
  serverType: string;
  applicationName: string;
  applicationSPOC: string;
  applicationOwner: string;
  platform: string;
  location: string;
  manufacturer: string;
  ram: string;
  cpu: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ApiResponse {
  totalItems: number;
  servers: Server[];
  totalPages: number;
  currentPage: number;
}

interface SortConfig {
  key: keyof Server;
  direction: 'asc' | 'desc';
}

const ServerInventory: React.FC = () => {
  const { isAdmin } = useAuth();
  const [allServers, setAllServers] = useState<Server[]>([]); // Used for filter options
  const [displayedServers, setDisplayedServers] = useState<Server[]>([]); // Used for table display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'hostname', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploadSuccess, setFileUploadSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    operatingSystem: '',
    location: '',
    applicationOwner: '',
    status: ''
  });
  // Add state for filter options with proper initialization
  const [filterOptions, setFilterOptions] = useState({
    operatingSystems: [] as string[],
    locations: [] as string[],
    applicationOwners: [] as string[],
    statuses: ['live', 'shutdown', 'new'] as string[],
    serverRoles: [] as string[],
    serverTypes: [] as string[],
    platforms: [] as string[],
    manufacturers: [] as string[]
  });

  // Add a local state for the search input value
  const [searchInputValue, setSearchInputValue] = useState('');

  // Add a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  // First, add a state for the edit modal and selected server
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerData, setNewServerData] = useState<Partial<Server>>({
    hostname: '',
    ipAddress: '',
    operatingSystem: '',
    serverRole: '',
    serverType: '',
    applicationName: '',
    applicationSPOC: '',
    applicationOwner: '',
    platform: '',
    location: '',
    manufacturer: '',
    ram: '',
    cpu: '',
    status: 'new'
  });

  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);

  // Add this with other refs at the top of the component
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initial fetch of all filter options
    fetchFilterOptions();
    
    // Initial fetch of paginated data is handled by the other useEffect that depends on fetchServers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize the search input value from URL params and focus it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Get search parameter
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      setSearchInputValue(searchParam);
    }
    
    // Get sort parameters
    const sortByParam = params.get('sortBy');
    const orderParam = params.get('order') as 'asc' | 'desc' | null;
    
    if (sortByParam && isValidServerField(sortByParam)) {
      setSortConfig({
        key: sortByParam as keyof Server,
        direction: orderParam === 'asc' || orderParam === 'desc' ? orderParam : 'asc'
      });
    }
    
    // Get page parameter
    const pageParam = params.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
    
    // Focus the search input after component mounts or page refreshes
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      
      // Place cursor at the end of the text
      const length = searchInputRef.current.value.length;
      searchInputRef.current.setSelectionRange(length, length);
    }
  }, []);

  // Define fetchServers with proper dependencies
  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      // Create params object for API call
      const params: {[key: string]: any} = {
        page: currentPage,
        size: itemsPerPage,
        sortBy: sortConfig.key,
        order: sortConfig.direction
      };
      
      // Add search term if present
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'All') {
          params[key] = value;
        }
      });
      
      // Make the API call
      const response = await serverApi.getServers(params);
      
      // Update state with response data
      const servers = response.data.servers.map((server: any) => ({
        ...server,
        ipAddress: server.ip || server.ipAddress
      }));
      setDisplayedServers(servers); // Now this only updates the displayed servers
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching servers:', error);
      setError('Failed to load server data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortConfig.key, sortConfig.direction, searchTerm, filters]);

  // Effect to update URL when parameters change
  useEffect(() => {
    // Update URL with current parameters
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page', currentPage.toString());
    params.append('size', itemsPerPage.toString());
    
    // Add sorting - use sortBy and order to match backend API
    params.append('sortBy', sortConfig.key);
    params.append('order', sortConfig.direction);
    
    // Add search term if present
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        params.append(key, value);
      }
    });
    
    // Update URL without causing page refresh
    navigate(`?${params.toString()}`, { replace: true });
  }, [currentPage, itemsPerPage, sortConfig.key, sortConfig.direction, filters, searchTerm, navigate]);

  // Effect to fetch servers when parameters change
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Fetch all filter options
  const fetchFilterOptions = async () => {
    try {
      console.log('Fetching filter options...');
      
      // Use the dedicated API endpoint for filter options
      const response = await serverApi.getFilterOptions([
        'operatingSystem', 'location', 'applicationOwner', 'status'
      ]);
      
      console.log('Filter options API response:', response);
      
      // Check if we have data in the expected format
      if (response.data && response.data.distinctValues) {
        console.log('Distinct values received:', response.data.distinctValues);
        
        // Create default empty arrays for all options
        const defaultOptions = {
          operatingSystems: [],
          locations: [],
          applicationOwners: [],
          statuses: ['live', 'shutdown', 'new'], // Always include standard statuses
          serverRoles: [],
          serverTypes: [],
          platforms: [],
          manufacturers: []
        };
        
        // Merge received values with defaults
        const mergedOptions = {
          ...defaultOptions,
          operatingSystems: Array.isArray(response.data.distinctValues.operatingSystems) 
            ? response.data.distinctValues.operatingSystems.filter(Boolean) 
            : [],
          locations: Array.isArray(response.data.distinctValues.locations) 
            ? response.data.distinctValues.locations.filter(Boolean) 
            : [],
          applicationOwners: Array.isArray(response.data.distinctValues.applicationOwners) 
            ? response.data.distinctValues.applicationOwners.filter(Boolean) 
            : [],
          statuses: Array.isArray(response.data.distinctValues.statuses) 
            ? [...new Set([...defaultOptions.statuses, ...response.data.distinctValues.statuses.filter(Boolean)])] 
            : defaultOptions.statuses
        };
        
        console.log('Setting filter options:', mergedOptions);
        setFilterOptions(mergedOptions);
      } else {
        console.log('No distinct values in response, falling back to all servers method');
        // Fallback to fetching all servers and extracting options
        await fetchAllServers();
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      // Fallback to fetching all servers
      fetchAllServers();
    }
  };

  // Fetch all servers for filter options
  const fetchAllServers = async () => {
    try {
      console.log('Fetching all servers for filter options...');
      
      // Use a separate API call to get all servers without pagination
      const response = await serverApi.getServers({ size: 1000, includeAll: true });
      console.log('All servers response:', response);
      
      const mappedServers = response.data.servers.map((server: any) => ({
        ...server,
        ipAddress: server.ip || server.ipAddress
      }));
      
      // Store all servers for filter options
      setAllServers(mappedServers);
      
      // Update filter options based on all servers
      const options = getFilterOptions();
      console.log('Generated filter options from all servers:', options);
      setFilterOptions(options);
    } catch (err) {
      console.error('Error fetching all servers for filters:', err);
      
      // Set default empty values if everything fails
      setFilterOptions({
        operatingSystems: [],
        locations: [],
        applicationOwners: [],
        statuses: ['live', 'shutdown', 'new'],
        serverRoles: [],
        serverTypes: [],
        platforms: [],
        manufacturers: []
      });
    }
  };

  // Debug function to check API calls
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const logApiCall = (action: string, params: any) => {
    console.log(`${action} with params:`, params);
  };

  // Get filter options based on currently selected filters - improved for all dropdowns
  const getFilterOptions = () => {
    // Get unique values for each filter directly from allServers
    // This ensures we always show all possible options regardless of other filters
    const operatingSystems = [...new Set(
      allServers
        .map(server => server.operatingSystem)
        .filter(Boolean)
    )].sort();
    
    const locations = [...new Set(
      allServers
        .map(server => server.location)
        .filter(Boolean)
    )].sort();
    
    const applicationOwners = [...new Set(
      allServers
        .map(server => server.applicationOwner)
        .filter(Boolean)
    )].sort();

    const serverRoles = [...new Set(
      allServers
        .map(server => server.serverRole)
        .filter(Boolean)
    )].sort();

    const serverTypes = [...new Set(
      allServers
        .map(server => server.serverType)
        .filter(Boolean)
    )].sort();

    const platforms = [...new Set(
      allServers
        .map(server => server.platform)
        .filter(Boolean)
    )].sort();

    const manufacturers = [...new Set(
      allServers
        .map(server => server.manufacturer)
        .filter(Boolean)
    )].sort();
    
    // For statuses, always include the standard statuses
    const availableStatuses = [...new Set(
      allServers
        .map(server => server.status)
        .filter(Boolean)
    )];

    // Ensure all possible statuses are included even if not in filtered servers
    const statuses = ['live', 'shutdown', 'new'].concat(
      availableStatuses.filter(status => !['live', 'shutdown', 'new'].includes(status))
    );
    
    // Return the filter options instead of setting state directly
    return {
      operatingSystems,
      locations,
      applicationOwners,
      statuses,
      serverRoles,
      serverTypes,
      platforms,
      manufacturers
    };
  };

  // Helper function to focus the search input
  const focusSearchInput = () => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        const length = searchInputRef.current.value.length;
        searchInputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  };

  // Modify the page change handler to use the helper function
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    focusSearchInput();
  };

  // Modify the filter change handler to use the helper function
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === 'All' ? undefined : value
    }));
    setCurrentPage(1); // Reset to first page when filters change
    focusSearchInput();
  };

  // Modify the sort handler to use the helper function
  const handleSort = (key: keyof Server) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    focusSearchInput();
  };

  // Get sort icon
  const getSortIcon = (columnName: keyof Server) => {
    if (sortConfig.key !== columnName) {
      // Return an empty div with the same height as the icons to maintain consistent layout
      return <div className="h-4 w-4 ml-1 invisible"></div>;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUpIcon className="h-4 w-4 ml-1" /> : 
      <ChevronDownIcon className="h-4 w-4 ml-1" />;
  };

  // Also focus search input after reset filters
  const resetFilters = () => {
    setFilters({
      operatingSystem: '',
      location: '',
      applicationOwner: '',
      status: ''
    });
    setSearchTerm('');
    setSearchInputValue('');
    setCurrentPage(1);
    focusSearchInput();
  };

  // Modified handleSearchChange to not use setQueryParams
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set a new timeout to update the search term after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
  };

  // Add this to component to clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle items per page change
  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    
    // Update state
    setItemsPerPage(newSize);
    setCurrentPage(1); // Reset to first page when changing items per page
    
    // Update query params
    // Using setItemsPerPage instead
    setItemsPerPage(newSize);
    setCurrentPage(1);
    
    // Create params object for API call
    const params: {[key: string]: any} = {
      page: 1,
      size: newSize,
      sortBy: sortConfig.key,
      order: sortConfig.direction
    };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        params[key] = value;
      }
    });
    
    // Force a fetch with the new parameters by calling fetchServers
    fetchServers();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await serverApi.getImportTemplate();
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'server_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading template:', err);
      setFileUploadError('Failed to download template. Please try again.');
      setTimeout(() => setFileUploadError(null), 5000);
    }
  };

  const handleExport = async () => {
    try {
      // Build export parameters based on current filters
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filters.operatingSystem) params.operatingSystem = filters.operatingSystem;
      if (filters.location) params.location = filters.location;
      if (filters.applicationOwner) params.applicationOwner = filters.applicationOwner;
      if (filters.status) params.status = filters.status;
      
      const response = await serverApi.exportServers(params);
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'servers_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFileUploadSuccess('Servers exported successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error exporting servers:', err);
      setFileUploadError('Failed to export servers. Please try again.');
      setTimeout(() => setFileUploadError(null), 5000);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      
      const response = await serverApi.importServers(formData);
      
      setFileUploadSuccess(`Import successful: ${response.data.success} servers added, ${response.data.failed} failed.`);
      
      // Refresh server list
      fetchServers();
      
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setFileUploadError(err.response?.data?.message || 'Failed to import servers. Please try again.');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // New function to handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewServerData(prev => ({ ...prev, [name]: value }));
  };

  // New function to handle server creation
  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Format data for backend
      const serverData = {
        ...newServerData,
        ip: newServerData.ipAddress // Map ipAddress to ip for backend
      };
      
      // Send to backend
      await serverApi.createServer(serverData);
      
      // Refresh the server list
      fetchServers();
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewServerData({
        hostname: '',
        ipAddress: '',
        operatingSystem: '',
        serverRole: '',
        serverType: '',
        applicationName: '',
        applicationSPOC: '',
        applicationOwner: '',
        platform: '',
        location: '',
        manufacturer: '',
        ram: '',
        cpu: '',
        status: 'new'
      });
      
      // Show success message
      setFileUploadSuccess('Server added successfully');
      setTimeout(() => setFileUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding server:', err);
      setFileUploadError('Failed to add server. Please try again.');
      setTimeout(() => setFileUploadError(null), 5000);
    }
  };

  const handleClearAllServers = async () => {
    try {
      setLoading(true);
      await serverApi.clearAllServers();
      setFileUploadSuccess('All servers have been cleared successfully');
      setShowClearAllConfirmation(false);
      fetchServers(); // Refresh the server list (should be empty now)
    } catch (err) {
      console.error('Error clearing servers:', err);
      setFileUploadError('Failed to clear servers. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setFileUploadSuccess(null), 3000);
    }
  };

  // Helper function to check if a field is valid for a Server
  const isValidServerField = (field: string): field is keyof Server => {
    return [
      'id', 'hostname', 'ip', 'ipAddress', 'operatingSystem', 'serverRole', 
      'serverType', 'applicationName', 'applicationSPOC', 'applicationOwner',
      'location', 'manufacturer', 'ram', 'cpu', 'status', 'createdAt', 'updatedAt',
      'platform'
    ].includes(field);
  };

  // Add a function to handle server edit
  const handleEditServer = (server: Server) => {
    setSelectedServer(server);
    setShowEditModal(true);
  };

  // Add a function to handle server delete confirmation
  const handleDeleteConfirmation = (server: Server) => {
    setSelectedServer(server);
    setShowDeleteConfirmation(true);
  };

  // Add a function to handle server deletion
  const handleDeleteServer = async () => {
    if (!selectedServer) return;
    
    try {
      setLoading(true);
      await serverApi.deleteServer(selectedServer.id);
      
      // Show success message
      setFileUploadSuccess(`Server ${selectedServer.hostname} deleted successfully`);
      
      // Refresh the server list
      fetchServers();
      
      // Close modal
      setShowDeleteConfirmation(false);
      setSelectedServer(null);
    } catch (error) {
      console.error('Error deleting server:', error);
      setFileUploadError('Failed to delete server. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setFileUploadSuccess(null), 3000);
    }
  };

  // Add a function to handle server update
  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedServer) return;
    
    try {
      setLoading(true);
      
      // Create a copy of server data
      const serverData = { ...selectedServer };
      
      // Use ipAddress value for ip and remove ipAddress to avoid duplication
      if (serverData.ipAddress) {
        serverData.ip = serverData.ipAddress;
        delete serverData.ipAddress;
      }
      
      // Validate status field
      if (serverData.status && !['live', 'shutdown', 'new'].includes(serverData.status.toLowerCase())) {
        setFileUploadError('Invalid status value. Must be one of: live, shutdown, new');
        setLoading(false);
        return;
      }
      
      // Send to backend
      await serverApi.updateServer(selectedServer.id, serverData);
      
      // Refresh the server list
      fetchServers();
      
      // Close modal and reset form
      setShowEditModal(false);
      setSelectedServer(null);
      
      // Show success message
      setFileUploadSuccess('Server updated successfully');
    } catch (error: any) {
      console.error('Error updating server:', error);
      
      // Display more detailed error message if available
      if (error.response && error.response.data && error.response.data.message) {
        setFileUploadError(`Failed to update server: ${error.response.data.message}`);
        if (error.response.data.error) {
          console.error('Detailed error:', error.response.data.error);
        }
      } else {
        setFileUploadError('Failed to update server. Please try again.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => setFileUploadSuccess(null), 3000);
    }
  };

  // New function to reset the form
  const resetForm = () => {
    setNewServerData({
      hostname: '',
      ipAddress: '',
      operatingSystem: '',
      serverRole: '',
      serverType: '',
      applicationName: '',
      applicationSPOC: '',
      applicationOwner: '',
      platform: '',
      location: '',
      manufacturer: '',
      ram: '',
      cpu: '',
      status: 'new'
    });
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Server Inventory</h1>
      
      {/* Search and filter controls */}
      <div className="mb-6 card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search input */}
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                ref={searchInputRef}
                placeholder="Search servers..."
                className="form-input pl-10"
                value={searchInputValue}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === 'Enter' && focusSearchInput()}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Add Server button - Admin Only */}
            {isAdmin() && (
              <button 
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Server
              </button>
            )}
            
            {/* Import/Export buttons - Admin Only */}
            {isAdmin() && (
              <div className="flex flex-wrap gap-2">
                <label className="btn-primary cursor-pointer">
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Import
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
                </label>
                
                <button 
                  className="btn-primary"
                  onClick={handleExport}
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
                
                <button 
                  className="btn-primary"
                  onClick={handleDownloadTemplate}
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Template
                </button>

                {/* Clear All Servers button - Admin Only */}
                <button 
                  className="btn-danger"
                  onClick={() => setShowClearAllConfirmation(true)}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operating System</label>
            <select 
              className="form-input"
              value={filters.operatingSystem}
              onChange={(e) => handleFilterChange('operatingSystem', e.target.value)}
            >
              <option value="">All Operating Systems</option>
              {filterOptions.operatingSystems && filterOptions.operatingSystems.length > 0 ? (
                filterOptions.operatingSystems.map((os) => (
                  <option key={os} value={os}>{os}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <select 
              className="form-input"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="">All Locations</option>
              {filterOptions.locations && filterOptions.locations.length > 0 ? (
                filterOptions.locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application Owner</label>
            <select 
              className="form-input"
              value={filters.applicationOwner}
              onChange={(e) => handleFilterChange('applicationOwner', e.target.value)}
            >
              <option value="">All Application Owners</option>
              {filterOptions.applicationOwners && filterOptions.applicationOwners.length > 0 ? (
                filterOptions.applicationOwners.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select 
              className="form-input"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {filterOptions.statuses && filterOptions.statuses.length > 0 ? (
                filterOptions.statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
        </div>
        
        {/* Reset filters button */}
        <div className="mt-4 flex justify-end">
          <button 
            className="btn-ghost"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>

        {/* Upload status messages */}
        {fileUploadError && (
          <div className="mt-4 p-3 bg-danger-100 dark:bg-danger-900/30 border border-danger-200 text-danger-700 dark:text-danger-300 rounded">
            {fileUploadError}
          </div>
        )}
        
        {fileUploadSuccess && (
          <div className="mt-4 p-3 bg-success-100 dark:bg-success-900/30 border border-success-200 text-success-700 dark:text-success-300 rounded">
            {fileUploadSuccess}
          </div>
        )}
      </div>
      
      {/* Server table */}
      <div className="table-container rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('hostname')}
                >
                  <div className="flex items-center justify-between">
                    <span>Hostname</span>
                    {getSortIcon('hostname')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('ip')}
                >
                  <div className="flex items-center justify-between">
                    <span>IP Address</span>
                    {getSortIcon('ip')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('operatingSystem')}
                >
                  <div className="flex items-center justify-between">
                    <span>OS</span>
                    {getSortIcon('operatingSystem')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('serverRole')}
                >
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    {getSortIcon('serverRole')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('serverType')}
                >
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    {getSortIcon('serverType')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('applicationName')}
                >
                  <div className="flex items-center justify-between">
                    <span>Application</span>
                    {getSortIcon('applicationName')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('applicationSPOC')}
                >
                  <div className="flex items-center justify-between">
                    <span>App SPOC</span>
                    {getSortIcon('applicationSPOC')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('applicationOwner')}
                >
                  <div className="flex items-center justify-between">
                    <span>App Owner</span>
                    {getSortIcon('applicationOwner')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    {getSortIcon('location')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('manufacturer')}
                >
                  <div className="flex items-center justify-between">
                    <span>Manufacturer</span>
                    {getSortIcon('manufacturer')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[80px]"
                  onClick={() => handleSort('ram')}
                >
                  <div className="flex items-center justify-between">
                    <span>RAM</span>
                    {getSortIcon('ram')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[80px]"
                  onClick={() => handleSort('cpu')}
                >
                  <div className="flex items-center justify-between">
                    <span>CPU</span>
                    {getSortIcon('cpu')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                {isAdmin() && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Actions</span>
                      <div className="h-4 w-4 ml-1 invisible"></div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayedServers.length > 0 ? (
                displayedServers.map((server) => (
                  <tr key={server.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{server.hostname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.ipAddress || server.ip}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.operatingSystem}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.serverRole}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.serverType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.applicationName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.applicationSPOC}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.applicationOwner}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.manufacturer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.ram}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.cpu}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`status-badge ${
                        server.status === 'live' ? 'status-badge-success' : 
                        server.status === 'shutdown' ? 'status-badge-danger' : 
                        'status-badge-info'}`}
                      >
                        {server.status}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditServer(server)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirmation(server)}
                            className="text-danger-600 hover:text-danger-900 dark:text-danger-400 dark:hover:text-danger-300 transition-colors duration-200"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin() ? 14 : 13} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                    No servers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls - Updated to match AuditLogs */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {totalItems > 0 ? (
                  <>
                    Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalItems)}
                    </span>{' '}
                    of <span className="font-medium">{totalItems}</span> results
                  </>
                ) : (
                  'No results found'
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Show</span>
                <select
                  className="form-input py-1 px-2 w-16 rounded-md"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
              </div>
              <nav className="relative z-0 inline-flex rounded-lg shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Previous</span>
                  &larr;
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  const pageToShow = currentPage <= 3 
                    ? idx + 1 
                    : currentPage >= totalPages - 2 
                      ? totalPages - 4 + idx 
                      : currentPage - 2 + idx;
                  
                  if (pageToShow > 0 && pageToShow <= totalPages) {
                    return (
                      <button
                        key={pageToShow}
                        onClick={() => handlePageChange(pageToShow)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          currentPage === pageToShow
                            ? 'bg-primary-600 text-white z-10 border-primary-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageToShow}
                      </button>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Next</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="card inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {selectedServer ? 'Edit Server' : 'Add New Server'}
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-150"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedServer(null);
                      resetForm();
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="mt-6" onSubmit={handleAddServer}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Hostname */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hostname <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="hostname"
                        className="form-input w-full"
                        value={newServerData.hostname}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* IP Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        IP Address <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="ipAddress"
                        className="form-input w-full"
                        value={newServerData.ipAddress}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Operating System */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Operating System <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="operatingSystem"
                        className="form-input w-full"
                        value={newServerData.operatingSystem}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Server Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Server Role
                      </label>
                      <input
                        type="text"
                        name="serverRole"
                        className="form-input w-full"
                        value={newServerData.serverRole}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Server Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Server Type
                      </label>
                      <input
                        type="text"
                        name="serverType"
                        className="form-input w-full"
                        value={newServerData.serverType}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Application Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Application Name
                      </label>
                      <input
                        type="text"
                        name="applicationName"
                        className="form-input w-full"
                        value={newServerData.applicationName}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Application SPOC */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Application SPOC
                      </label>
                      <input
                        type="text"
                        name="applicationSPOC"
                        className="form-input w-full"
                        value={newServerData.applicationSPOC}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Application Owner */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Application Owner
                      </label>
                      <input
                        type="text"
                        name="applicationOwner"
                        className="form-input w-full"
                        value={newServerData.applicationOwner}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Platform */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Platform
                      </label>
                      <input
                        type="text"
                        name="platform"
                        className="form-input w-full"
                        value={newServerData.platform}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="location"
                        className="form-input w-full"
                        value={newServerData.location}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Manufacturer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        name="manufacturer"
                        className="form-input w-full"
                        value={newServerData.manufacturer}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* RAM */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        RAM
                      </label>
                      <input
                        type="text"
                        name="ram"
                        className="form-input w-full"
                        value={newServerData.ram}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* CPU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CPU
                      </label>
                      <input
                        type="text"
                        name="cpu"
                        className="form-input w-full"
                        value={newServerData.cpu}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status <span className="text-danger-500">*</span>
                      </label>
                      <select
                        name="status"
                        className="form-input w-full"
                        value={newServerData.status}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="live">Live</option>
                        <option value="shutdown">Shutdown</option>
                        <option value="new">New</option>
                      </select>
                    </div>
                  </div>
                  
                  {fileUploadError && (
                    <div className="mt-4 p-3 bg-danger-100 dark:bg-danger-900/30 border border-danger-200 text-danger-700 dark:text-danger-300 rounded">
                      {fileUploadError}
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-ghost px-4 py-2"
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedServer(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : null}
                      {selectedServer ? 'Update Server' : 'Add Server'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Servers Confirmation Modal */}
      {showClearAllConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="card inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                      Clear All Servers
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to clear all servers? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="btn-ghost px-4 py-2"
                  onClick={() => setShowClearAllConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger px-4 py-2"
                  onClick={handleClearAllServers}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedServer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="px-4 pt-5 pb-4 sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Edit Server
                  </h3>
                  <div className="mt-4">
                    <form onSubmit={handleUpdateServer} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Hostname
                          </label>
                          <input
                            type="text"
                            name="hostname"
                            value={selectedServer.hostname}
                            onChange={(e) => setSelectedServer({...selectedServer, hostname: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            IP Address
                          </label>
                          <input
                            type="text"
                            name="ipAddress"
                            value={selectedServer.ipAddress || selectedServer.ip || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, ipAddress: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Operating System
                          </label>
                          <input
                            type="text"
                            name="operatingSystem"
                            value={selectedServer.operatingSystem}
                            onChange={(e) => setSelectedServer({...selectedServer, operatingSystem: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status
                          </label>
                          <select
                            name="status"
                            value={selectedServer.status && selectedServer.status.toLowerCase()}
                            onChange={(e) => setSelectedServer({...selectedServer, status: e.target.value.toLowerCase()})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            required
                          >
                            <option value="live">Live</option>
                            <option value="shutdown">Shutdown</option>
                            <option value="new">New</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Server Role
                          </label>
                          <input
                            type="text"
                            name="serverRole"
                            value={selectedServer.serverRole || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, serverRole: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Server Type
                          </label>
                          <input
                            type="text"
                            name="serverType"
                            value={selectedServer.serverType || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, serverType: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Application Name
                          </label>
                          <input
                            type="text"
                            name="applicationName"
                            value={selectedServer.applicationName || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, applicationName: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Application Owner
                          </label>
                          <input
                            type="text"
                            name="applicationOwner"
                            value={selectedServer.applicationOwner || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, applicationOwner: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Location
                          </label>
                          <input
                            type="text"
                            name="location"
                            value={selectedServer.location || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, location: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Manufacturer
                          </label>
                          <input
                            type="text"
                            name="manufacturer"
                            value={selectedServer.manufacturer || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, manufacturer: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            RAM
                          </label>
                          <input
                            type="text"
                            name="ram"
                            value={selectedServer.ram || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, ram: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            CPU
                          </label>
                          <input
                            type="text"
                            name="cpu"
                            value={selectedServer.cpu || ''}
                            onChange={(e) => setSelectedServer({...selectedServer, cpu: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-5 sm:mt-4 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          className="btn-ghost px-4 py-2"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary px-4 py-2"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Server Confirmation Modal */}
      {showDeleteConfirmation && selectedServer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="card inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                      Delete Server
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete <span className="font-semibold">{selectedServer.hostname}</span>? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="btn-ghost px-4 py-2"
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger px-4 py-2"
                  onClick={handleDeleteServer}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerInventory; 