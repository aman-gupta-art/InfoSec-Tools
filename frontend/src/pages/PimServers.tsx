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
import { pimServerApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

interface PimServer {
  id: number;
  serverIp: string;
  serverUsername: string;
  hostname: string;
  applicationName?: string;
  group?: string;
  connectionType?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  totalItems: number;
  pimServers: PimServer[];
  totalPages: number;
  currentPage: number;
}

interface SortConfig {
  key: keyof PimServer;
  direction: 'asc' | 'desc';
}

const PimServers: React.FC = () => {
  const { isAdmin } = useAuth();
  const [allPimServers, setAllPimServers] = useState<PimServer[]>([]); // Used for filter options
  const [displayedPimServers, setDisplayedPimServers] = useState<PimServer[]>([]); // Used for table display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serverIp', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploadSuccess, setFileUploadSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    applicationName: '',
    group: '',
    connectionType: ''
  });
  // Add state for filter options with proper initialization
  const [filterOptions, setFilterOptions] = useState({
    applicationNames: [] as string[],
    groups: [] as string[],
    connectionTypes: [] as string[]
  });

  // Add a local state for the search input value
  const [searchInputValue, setSearchInputValue] = useState('');

  // Add a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  // First, add a state for the edit modal and selected server
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPimServer, setSelectedPimServer] = useState<PimServer | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPimServerData, setNewPimServerData] = useState<Partial<PimServer>>({
    serverIp: '',
    serverUsername: '',
    hostname: '',
    applicationName: '',
    group: '',
    connectionType: ''
  });

  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);

  // Add this with other refs at the top of the component
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper function to check if a field is a valid PimServer field
  const isValidPimServerField = (field: string): field is keyof PimServer => {
    return [
      'id', 'serverIp', 'serverUsername', 'hostname', 'applicationName', 
      'group', 'connectionType', 'createdAt', 'updatedAt'
    ].includes(field);
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      console.log('Fetching filter options...');
      
      // Use the dedicated API endpoint for filter options
      const response = await pimServerApi.getFilterOptions([
        'applicationName', 'group', 'connectionType'
      ]);
      
      console.log('Filter options API response:', response);
      
      // Check if we have data in the expected format
      if (response.data && response.data.distinctValues) {
        console.log('Distinct values received:', response.data.distinctValues);
        
        // Merge received values with defaults
        const mergedOptions = {
          applicationNames: Array.isArray(response.data.distinctValues.applicationNames) 
            ? response.data.distinctValues.applicationNames.filter((val): val is string => Boolean(val)) 
            : [],
          groups: Array.isArray(response.data.distinctValues.groups) 
            ? response.data.distinctValues.groups.filter((val): val is string => Boolean(val)) 
            : [],
          connectionTypes: Array.isArray(response.data.distinctValues.connectionTypes) 
            ? response.data.distinctValues.connectionTypes.filter((val): val is string => Boolean(val)) 
            : []
        };
        
        console.log('Setting filter options:', mergedOptions);
        setFilterOptions(mergedOptions);
      } else {
        console.log('No distinct values in response, falling back to all servers method');
        // Fallback to fetching all servers and extracting options
        await fetchAllPimServers();
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      // Fallback to fetching all servers
      fetchAllPimServers();
    }
  };

  // Fetch all PIM servers for filter options
  const fetchAllPimServers = async () => {
    try {
      console.log('Fetching all PIM servers for filter options...');
      
      // Use a separate API call to get all servers without pagination
      const response = await pimServerApi.getPimServers({ size: 1000, includeAll: true });
      console.log('All PIM servers response:', response);
      
      // Store all servers for filter options
      setAllPimServers(response.data.pimServers);
      
      // Update filter options based on all servers
      const options = getFilterOptions();
      console.log('Generated filter options from all servers:', options);
      setFilterOptions(options);
    } catch (err) {
      console.error('Error fetching all PIM servers for filters:', err);
      
      // Set default empty values if everything fails
      setFilterOptions({
        applicationNames: [],
        groups: [],
        connectionTypes: []
      });
    }
  };

  // Get filter options based on currently selected filters
  const getFilterOptions = () => {
    // Get unique values for each filter directly from allPimServers
    const applicationNames = [...new Set(
      allPimServers
        .map(server => server.applicationName)
        .filter((val): val is string => Boolean(val))
    )].sort();
    
    const groups = [...new Set(
      allPimServers
        .map(server => server.group)
        .filter((val): val is string => Boolean(val))
    )].sort();
    
    const connectionTypes = [...new Set(
      allPimServers
        .map(server => server.connectionType)
        .filter((val): val is string => Boolean(val))
    )].sort();
    
    // Return the filter options
    return {
      applicationNames,
      groups,
      connectionTypes
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
      [field]: value === 'All' ? '' : value
    }));
    setCurrentPage(1); // Reset to first page when filters change
    focusSearchInput();
  };

  // Modify the sort handler to use the helper function
  const handleSort = (key: keyof PimServer) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    focusSearchInput();
  };

  // Get sort icon
  const getSortIcon = (columnName: keyof PimServer) => {
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
      applicationName: '',
      group: '',
      connectionType: ''
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

  // Handle items per page change
  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    
    // Update state
    setItemsPerPage(newSize);
    setCurrentPage(1); // Reset to first page when changing items per page
    
    // Force a fetch with the new parameters by calling fetchPimServers
    fetchPimServers();
  };

  // Download Import Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await pimServerApi.getImportTemplate();
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'pim_servers_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading template:', err);
      setFileUploadError('Failed to download template. Please try again.');
      setTimeout(() => setFileUploadError(null), 5000);
    }
  };

  // Export PIM Servers
  const handleExport = async () => {
    try {
      // Build export parameters based on current filters
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filters.applicationName) params.applicationName = filters.applicationName;
      if (filters.group) params.group = filters.group;
      if (filters.connectionType) params.connectionType = filters.connectionType;
      
      const response = await pimServerApi.exportPimServers(params);
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'pim_servers_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFileUploadSuccess('PIM Servers exported successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error exporting PIM servers:', err);
      setFileUploadError('Failed to export PIM servers. Please try again.');
      setTimeout(() => setFileUploadError(null), 5000);
    }
  };

  // Import PIM Servers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      
      const response = await pimServerApi.importPimServers(formData);
      
      setFileUploadSuccess(`Import successful: ${response.data.success} servers added, ${response.data.failed} failed.`);
      
      // Refresh PIM Server list
      fetchPimServers();
      
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setFileUploadError(err.response?.data?.message || 'Failed to import PIM servers. Please try again.');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Handle input changes for the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPimServerData(prev => ({ ...prev, [name]: value }));
  };

  // Handle add PIM Server form submission
  const handleAddPimServer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Send to backend
      await pimServerApi.createPimServer(newPimServerData);
      
      // Refresh the PIM server list
      fetchPimServers();
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewPimServerData({
        serverIp: '',
        serverUsername: '',
        hostname: '',
        applicationName: '',
        group: '',
        connectionType: ''
      });
      
      // Show success message
      setFileUploadSuccess('PIM Server added successfully');
      setTimeout(() => setFileUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding PIM server:', err);
      setFileUploadError('Failed to add PIM server. Please try again.');
      setTimeout(() => setFileUploadError(null), 5000);
    }
  };

  // Handle clear all PIM Servers
  const handleClearAllPimServers = async () => {
    try {
      setLoading(true);
      await pimServerApi.clearAllPimServers();
      setFileUploadSuccess('All PIM Servers have been cleared successfully');
      setShowClearAllConfirmation(false);
      fetchPimServers(); // Refresh the PIM server list (should be empty now)
    } catch (err) {
      console.error('Error clearing PIM Servers:', err);
      setFileUploadError('Failed to clear PIM Servers. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setFileUploadSuccess(null), 3000);
    }
  };

  // Edit PIM Server
  const handleEditPimServer = (pimServer: PimServer) => {
    setSelectedPimServer(pimServer);
    setShowEditModal(true);
  };

  // Delete PIM Server confirmation
  const handleDeleteConfirmation = (pimServer: PimServer) => {
    setSelectedPimServer(pimServer);
    setShowDeleteConfirmation(true);
  };

  // Delete PIM Server
  const handleDeletePimServer = async () => {
    if (!selectedPimServer) return;
    
    try {
      setLoading(true);
      await pimServerApi.deletePimServer(selectedPimServer.id);
      
      // Show success message
      setFileUploadSuccess(`PIM Server ${selectedPimServer.hostname} deleted successfully`);
      
      // Refresh the PIM server list
      fetchPimServers();
      
      // Close modal
      setShowDeleteConfirmation(false);
      setSelectedPimServer(null);
    } catch (error) {
      console.error('Error deleting PIM server:', error);
      setFileUploadError('Failed to delete PIM server. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setFileUploadSuccess(null), 3000);
    }
  };

  // Update PIM Server
  const handleUpdatePimServer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPimServer) return;
    
    try {
      setLoading(true);
      
      // Send to backend
      await pimServerApi.updatePimServer(selectedPimServer.id, selectedPimServer);
      
      // Refresh the PIM server list
      fetchPimServers();
      
      // Close modal and reset form
      setShowEditModal(false);
      setSelectedPimServer(null);
      
      // Show success message
      setFileUploadSuccess('PIM Server updated successfully');
    } catch (error: any) {
      console.error('Error updating PIM server:', error);
      
      // Display more detailed error message if available
      if (error.response && error.response.data && error.response.data.message) {
        setFileUploadError(`Failed to update PIM server: ${error.response.data.message}`);
      } else {
        setFileUploadError('Failed to update PIM server. Please try again.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => setFileUploadSuccess(null), 3000);
    }
  };

  // Reset form function
  const resetForm = () => {
    setNewPimServerData({
      serverIp: '',
      serverUsername: '',
      hostname: '',
      applicationName: '',
      group: '',
      connectionType: ''
    });
  };

  useEffect(() => {
    // Initial fetch of all filter options
    fetchFilterOptions();
    
    // Initial fetch of paginated data is handled by the other useEffect that depends on fetchPimServers
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
    
    if (sortByParam && isValidPimServerField(sortByParam)) {
      setSortConfig({
        key: sortByParam as keyof PimServer,
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

  // Define fetchPimServers with proper dependencies
  const fetchPimServers = useCallback(async () => {
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
      const response = await pimServerApi.getPimServers(params);
      
      // Update state with response data
      setDisplayedPimServers(response.data.pimServers);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching PIM Servers:', error);
      setError('Failed to load PIM Server data. Please try again later.');
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

  // Effect to fetch PIM servers when parameters change
  useEffect(() => {
    fetchPimServers();
  }, [fetchPimServers]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">PIM Servers</h1>
      
      {/* Search and filter controls */}
      <div className="mb-6 card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search input */}
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                ref={searchInputRef}
                placeholder="Search PIM servers..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application Name</label>
            <select 
              className="form-input"
              value={filters.applicationName}
              onChange={(e) => handleFilterChange('applicationName', e.target.value)}
            >
              <option value="">All Applications</option>
              {filterOptions.applicationNames && filterOptions.applicationNames.length > 0 ? (
                filterOptions.applicationNames.map((app) => (
                  <option key={app} value={app}>{app}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group</label>
            <select 
              className="form-input"
              value={filters.group}
              onChange={(e) => handleFilterChange('group', e.target.value)}
            >
              <option value="">All Groups</option>
              {filterOptions.groups && filterOptions.groups.length > 0 ? (
                filterOptions.groups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Connection Type</label>
            <select 
              className="form-input"
              value={filters.connectionType}
              onChange={(e) => handleFilterChange('connectionType', e.target.value)}
            >
              <option value="">All Connection Types</option>
              {filterOptions.connectionTypes && filterOptions.connectionTypes.length > 0 ? (
                filterOptions.connectionTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
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
      
      {/* PIM Servers table */}
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
                  onClick={() => handleSort('serverIp')}
                >
                  <div className="flex items-center justify-between">
                    <span>Server IP</span>
                    {getSortIcon('serverIp')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('serverUsername')}
                >
                  <div className="flex items-center justify-between">
                    <span>Server Username</span>
                    {getSortIcon('serverUsername')}
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('group')}
                >
                  <div className="flex items-center justify-between">
                    <span>Group</span>
                    {getSortIcon('group')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('connectionType')}
                >
                  <div className="flex items-center justify-between">
                    <span>Connection Type</span>
                    {getSortIcon('connectionType')}
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
              {displayedPimServers.length > 0 ? (
                displayedPimServers.map((server) => (
                  <tr key={server.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{server.hostname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.serverIp}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.serverUsername}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.applicationName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.group}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{server.connectionType}</td>
                    {isAdmin() && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditPimServer(server)}
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
                  <td colSpan={isAdmin() ? 7 : 6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                    No PIM servers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
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

      {/* Add/Edit PIM Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="card inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {selectedPimServer ? 'Edit PIM Server' : 'Add New PIM Server'}
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-150"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedPimServer(null);
                      resetForm();
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="mt-6" onSubmit={handleAddPimServer}>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Server IP */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Server IP <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="serverIp"
                        className="form-input w-full"
                        value={newPimServerData.serverIp}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Server Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Server Username <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="serverUsername"
                        className="form-input w-full"
                        value={newPimServerData.serverUsername}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Hostname */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hostname <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="hostname"
                        className="form-input w-full"
                        value={newPimServerData.hostname}
                        onChange={handleInputChange}
                        required
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
                        value={newPimServerData.applicationName}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Group */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Group
                      </label>
                      <input
                        type="text"
                        name="group"
                        className="form-input w-full"
                        value={newPimServerData.group}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Connection Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Connection Type
                      </label>
                      <input
                        type="text"
                        name="connectionType"
                        className="form-input w-full"
                        value={newPimServerData.connectionType}
                        onChange={handleInputChange}
                      />
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
                        setSelectedPimServer(null);
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
                      {selectedPimServer ? 'Update Server' : 'Add Server'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit PIM Server Modal */}
      {showEditModal && selectedPimServer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="px-4 pt-5 pb-4 sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Edit PIM Server
                  </h3>
                  <div className="mt-4">
                    <form onSubmit={handleUpdatePimServer} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Server IP
                        </label>
                        <input
                          type="text"
                          name="serverIp"
                          value={selectedPimServer.serverIp}
                          onChange={(e) => setSelectedPimServer({...selectedPimServer, serverIp: e.target.value})}
                          className="form-input mt-1 block w-full"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Server Username
                        </label>
                        <input
                          type="text"
                          name="serverUsername"
                          value={selectedPimServer.serverUsername}
                          onChange={(e) => setSelectedPimServer({...selectedPimServer, serverUsername: e.target.value})}
                          className="form-input mt-1 block w-full"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Hostname
                        </label>
                        <input
                          type="text"
                          name="hostname"
                          value={selectedPimServer.hostname}
                          onChange={(e) => setSelectedPimServer({...selectedPimServer, hostname: e.target.value})}
                          className="form-input mt-1 block w-full"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Application Name
                        </label>
                        <input
                          type="text"
                          name="applicationName"
                          value={selectedPimServer.applicationName || ''}
                          onChange={(e) => setSelectedPimServer({...selectedPimServer, applicationName: e.target.value})}
                          className="form-input mt-1 block w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Group
                        </label>
                        <input
                          type="text"
                          name="group"
                          value={selectedPimServer.group || ''}
                          onChange={(e) => setSelectedPimServer({...selectedPimServer, group: e.target.value})}
                          className="form-input mt-1 block w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Connection Type
                        </label>
                        <input
                          type="text"
                          name="connectionType"
                          value={selectedPimServer.connectionType || ''}
                          onChange={(e) => setSelectedPimServer({...selectedPimServer, connectionType: e.target.value})}
                          className="form-input mt-1 block w-full"
                        />
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

      {/* Delete PIM Server Confirmation Modal */}
      {showDeleteConfirmation && selectedPimServer && (
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
                      Delete PIM Server
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete the PIM Server <span className="font-semibold">{selectedPimServer.hostname}</span>? This action cannot be undone.
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
                  onClick={handleDeletePimServer}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All PIM Servers Confirmation Modal */}
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
                      Clear All PIM Servers
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to clear all PIM servers? This action cannot be undone.
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
                  onClick={handleClearAllPimServers}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PimServers; 