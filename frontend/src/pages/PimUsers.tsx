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
import { pimUserApi } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

interface PimUser {
  id: number;
  psid: string;
  fullName: string;
  mobileNo?: string;
  email?: string;
  reportingManager?: string;
  hod?: string;
  department?: string;
  dateOfCreation: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  totalItems: number;
  pimUsers: PimUser[];
  totalPages: number;
  currentPage: number;
}

interface SortConfig {
  key: keyof PimUser;
  direction: 'asc' | 'desc';
}

const PimUsers: React.FC = () => {
  const { isAdmin } = useAuth();
  const [allPimUsers, setAllPimUsers] = useState<PimUser[]>([]); // Used for filter options
  const [displayedPimUsers, setDisplayedPimUsers] = useState<PimUser[]>([]); // Used for table display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'psid', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploadSuccess, setFileUploadSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    reportingManager: '',
    hod: ''
  });
  // Add state for filter options with proper initialization
  const [filterOptions, setFilterOptions] = useState({
    departments: [] as string[],
    reportingManagers: [] as string[],
    hods: [] as string[]
  });

  // Add a local state for the search input value
  const [searchInputValue, setSearchInputValue] = useState('');

  // Add a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  // First, add a state for the edit modal and selected user
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPimUser, setSelectedPimUser] = useState<PimUser | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPimUserData, setNewPimUserData] = useState<Partial<PimUser>>({
    psid: '',
    fullName: '',
    mobileNo: '',
    email: '',
    reportingManager: '',
    hod: '',
    department: '',
    dateOfCreation: new Date().toISOString().split('T')[0]
  });

  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);

  // Add this with other refs at the top of the component
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initial fetch of all filter options
    fetchFilterOptions();
    
    // Initial fetch of paginated data is handled by the other useEffect that depends on fetchPimUsers
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
    
    if (sortByParam && isValidPimUserField(sortByParam)) {
      setSortConfig({
        key: sortByParam as keyof PimUser,
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

  // Define fetchPimUsers with proper dependencies
  const fetchPimUsers = useCallback(async () => {
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
      const response = await pimUserApi.getPimUsers(params);
      
      // Update state with response data
      setDisplayedPimUsers(response.data.pimUsers);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching PIM users:', error);
      setError('Failed to load PIM user data. Please try again later.');
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

  // Effect to fetch PIM users when parameters change
  useEffect(() => {
    fetchPimUsers();
  }, [fetchPimUsers]);

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      console.log('Fetching filter options...');
      
      // Use the dedicated API endpoint for filter options
      const response = await pimUserApi.getFilterOptions([
        'department', 'reportingManager', 'hod'
      ]);
      
      console.log('Filter options API response:', response);
      
      // Check if we have data in the expected format
      if (response.data && response.data.distinctValues) {
        console.log('Distinct values received:', response.data.distinctValues);
        
        // Merge received values with defaults
        const mergedOptions = {
          departments: Array.isArray(response.data.distinctValues.departments) 
            ? response.data.distinctValues.departments.filter(Boolean) 
            : [],
          reportingManagers: Array.isArray(response.data.distinctValues.reportingManagers) 
            ? response.data.distinctValues.reportingManagers.filter(Boolean) 
            : [],
          hods: Array.isArray(response.data.distinctValues.hods) 
            ? response.data.distinctValues.hods.filter(Boolean) 
            : []
        };
        
        console.log('Setting filter options:', mergedOptions);
        setFilterOptions(mergedOptions);
      } else {
        console.log('No distinct values in response, falling back to all PIM users method');
        // Fallback to fetching all PIM users and extracting options
        await fetchAllPimUsers();
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      // Fallback to fetching all PIM users
      fetchAllPimUsers();
    }
  };

  // Fetch all PIM users for filter options
  const fetchAllPimUsers = async () => {
    try {
      console.log('Fetching all PIM users for filter options...');
      
      // Use a separate API call to get all PIM users without pagination
      const response = await pimUserApi.getPimUsers({ size: 1000, includeAll: true });
      console.log('All PIM users response:', response);
      
      // Store all PIM users for filter options
      setAllPimUsers(response.data.pimUsers);
      
      // Update filter options based on all PIM users
      const options = getFilterOptions();
      console.log('Generated filter options from all PIM users:', options);
      setFilterOptions(options);
    } catch (err) {
      console.error('Error fetching all PIM users for filters:', err);
      
      // Set default empty values if everything fails
      setFilterOptions({
        departments: [],
        reportingManagers: [],
        hods: []
      });
    }
  };

  // Get filter options based on currently selected filters
  const getFilterOptions = () => {
    // Get unique values for each filter directly from allPimUsers
    const departments = [...new Set(
      allPimUsers
        .map(user => user.department)
        .filter((value): value is string => Boolean(value))
    )].sort();
    
    const reportingManagers = [...new Set(
      allPimUsers
        .map(user => user.reportingManager)
        .filter((value): value is string => Boolean(value))
    )].sort();
    
    const hods = [...new Set(
      allPimUsers
        .map(user => user.hod)
        .filter((value): value is string => Boolean(value))
    )].sort();
    
    // Return the filter options
    return {
      departments,
      reportingManagers,
      hods
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

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    focusSearchInput();
  };

  // Handle filter change
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === 'All' ? undefined : value
    }));
    setCurrentPage(1); // Reset to first page when filters change
    focusSearchInput();
  };

  // Handle sorting
  const handleSort = (key: keyof PimUser) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    focusSearchInput();
  };

  // Get sort icon
  const getSortIcon = (columnName: keyof PimUser) => {
    if (sortConfig.key !== columnName) {
      // Return an empty div with the same height as the icons to maintain consistent layout
      return <div className="h-4 w-4 ml-1 invisible"></div>;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUpIcon className="h-4 w-4 ml-1" /> : 
      <ChevronDownIcon className="h-4 w-4 ml-1" />;
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      department: '',
      reportingManager: '',
      hod: ''
    });
    setSearchTerm('');
    setSearchInputValue('');
    setCurrentPage(1);
    focusSearchInput();
  };

  // Handle search change
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
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  // Check if a field name is valid for sorting
  const isValidPimUserField = (field: string): field is keyof PimUser => {
    return ['id', 'psid', 'fullName', 'mobileNo', 'email', 'reportingManager', 'hod', 'department', 'dateOfCreation', 'createdAt', 'updatedAt'].includes(field);
  };

  // Handle import file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      setFileUploadError(null);
      setFileUploadSuccess(null);
      
      // Call API to import data from Excel
      const response = await pimUserApi.importPimUsers(formData);
      
      // Show success message
      setFileUploadSuccess(`Import successful: ${response.data.success} PIM users added, ${response.data.failed} failed.`);
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
      // Refresh the data
      fetchPimUsers();
      fetchFilterOptions();
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      let errorMessage = 'Failed to import PIM users. Please try again later.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `Failed to import PIM users: ${error.response.data.message}`;
      }
      
      setFileUploadError(errorMessage);
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true);
      setFileUploadError(null);
      setFileUploadSuccess(null);

      // Create params object for API call
      const params: {[key: string]: any} = {};
      
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

      // Get the export file
      const response = await pimUserApi.exportPimUsers(params);
      
      // Create a blob from the response
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      
      // Create a link and trigger a download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pim-users-export.xlsx';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setFileUploadSuccess('PIM users exported successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      setFileUploadError('Failed to export PIM users. Please try again later.');
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Handle download template
  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setFileUploadError(null);
      setFileUploadSuccess(null);
      
      console.log('Requesting template download...');
      
      // Get the template file
      const response = await pimUserApi.getImportTemplate();
      
      console.log('Template download response received:', response.status, response.headers);
      
      // Create a blob from the response
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Create a link and trigger a download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pim-users-template.xlsx';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setFileUploadSuccess('Template downloaded successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error downloading template:', error);
      
      let errorMessage = 'Failed to download template. Please try again later.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `Failed to download template: ${error.response.data.message}`;
      }
      
      setFileUploadError(errorMessage);
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit PIM user
  const handleEditPimUser = (pimUser: PimUser) => {
    setSelectedPimUser(pimUser);
    setShowEditModal(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirmation = (pimUser: PimUser) => {
    setSelectedPimUser(pimUser);
    setShowDeleteConfirmation(true);
  };
  
  // Handle delete PIM user
  const handleDeletePimUser = async () => {
    if (!selectedPimUser) return;
    
    try {
      setLoading(true);
      
      // Call API to delete the PIM user
      await pimUserApi.deletePimUser(selectedPimUser.id);
      
      // Close the confirmation modal
      setShowDeleteConfirmation(false);
      
      // Reset selected PIM user
      setSelectedPimUser(null);
      
      // Show success message
      setFileUploadSuccess('PIM user deleted successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
      // Refresh the data
      fetchPimUsers();
      fetchFilterOptions();
      
    } catch (error) {
      console.error('Error deleting PIM user:', error);
      setFileUploadError('Failed to delete PIM user. Please try again later.');
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle update PIM user
  const handleUpdatePimUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPimUser) return;
    
    try {
      setLoading(true);
      
      // Call API to update the PIM user
      await pimUserApi.updatePimUser(selectedPimUser.id, selectedPimUser);
      
      // Close the edit modal
      setShowEditModal(false);
      
      // Reset selected PIM user
      setSelectedPimUser(null);
      
      // Show success message
      setFileUploadSuccess('PIM user updated successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
      // Refresh the data
      fetchPimUsers();
      fetchFilterOptions();
      
    } catch (error) {
      console.error('Error updating PIM user:', error);
      setFileUploadError('Failed to update PIM user. Please try again later.');
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle add PIM user
  const handleAddPimUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Call API to create a new PIM user
      await pimUserApi.createPimUser(newPimUserData);
      
      // Close the add modal
      setShowAddModal(false);
      
      // Reset form
      resetForm();
      
      // Show success message
      setFileUploadSuccess('PIM user added successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
      // Refresh the data
      fetchPimUsers();
      fetchFilterOptions();
      
    } catch (error) {
      console.error('Error adding PIM user:', error);
      setFileUploadError('Failed to add PIM user. Please try again later.');
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle clear all PIM users
  const handleClearAllPimUsers = async () => {
    try {
      setLoading(true);
      
      // Call API to clear all PIM users
      await pimUserApi.clearAllPimUsers();
      
      // Close the confirmation modal
      setShowClearAllConfirmation(false);
      
      // Show success message
      setFileUploadSuccess('All PIM users cleared successfully!');
      setTimeout(() => setFileUploadSuccess(null), 3000);
      
      // Refresh the data
      fetchPimUsers();
      fetchFilterOptions();
      
    } catch (error) {
      console.error('Error clearing PIM users:', error);
      setFileUploadError('Failed to clear all PIM users. Please try again later.');
      setTimeout(() => setFileUploadError(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setNewPimUserData({
      psid: '',
      fullName: '',
      mobileNo: '',
      email: '',
      reportingManager: '',
      hod: '',
      department: '',
      dateOfCreation: new Date().toISOString().split('T')[0]
    });
  };
  
  // Handle input change for forms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (selectedPimUser) {
      // For edit form
      setSelectedPimUser({
        ...selectedPimUser,
        [name]: value
      });
    } else {
      // For add form
      setNewPimUserData({
        ...newPimUserData,
        [name]: value
      });
    }
  };

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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">PIM Users</h1>
      
      {/* Search and filter controls */}
      <div className="mb-6 card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search input */}
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                ref={searchInputRef}
                placeholder="Search PIM users..."
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
            {/* Add PIM User button - Admin Only */}
            {isAdmin() && (
              <button 
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add PIM User
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
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </button>
                
                <button 
                  className="btn-primary"
                  onClick={handleDownloadTemplate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      Template
                    </>
                  )}
                </button>

                {/* Clear All PIM Users button - Admin Only */}
                <button 
                  className="btn-danger"
                  onClick={() => setShowClearAllConfirmation(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Clear All
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <select 
              className="form-input"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {filterOptions.departments && filterOptions.departments.length > 0 ? (
                filterOptions.departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reporting Manager</label>
            <select 
              className="form-input"
              value={filters.reportingManager}
              onChange={(e) => handleFilterChange('reportingManager', e.target.value)}
            >
              <option value="">All Reporting Managers</option>
              {filterOptions.reportingManagers && filterOptions.reportingManagers.length > 0 ? (
                filterOptions.reportingManagers.map((manager) => (
                  <option key={manager} value={manager}>{manager}</option>
                ))
              ) : (
                <option value="" disabled>No options available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HOD</label>
            <select 
              className="form-input"
              value={filters.hod}
              onChange={(e) => handleFilterChange('hod', e.target.value)}
            >
              <option value="">All HODs</option>
              {filterOptions.hods && filterOptions.hods.length > 0 ? (
                filterOptions.hods.map((hod) => (
                  <option key={hod} value={hod}>{hod}</option>
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
      
      {/* PIM User table */}
      <div className="table-container rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('psid')}
                >
                  <div className="flex items-center justify-between">
                    <span>PSID</span>
                    {getSortIcon('psid')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[150px]"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center justify-between">
                    <span>Full Name</span>
                    {getSortIcon('fullName')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('mobileNo')}
                >
                  <div className="flex items-center justify-between">
                    <span>Mobile No</span>
                    {getSortIcon('mobileNo')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[150px]"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center justify-between">
                    <span>Email</span>
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[140px]"
                  onClick={() => handleSort('reportingManager')}
                >
                  <div className="flex items-center justify-between">
                    <span>Reporting Manager</span>
                    {getSortIcon('reportingManager')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[100px]"
                  onClick={() => handleSort('hod')}
                >
                  <div className="flex items-center justify-between">
                    <span>HOD</span>
                    {getSortIcon('hod')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[120px]"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center justify-between">
                    <span>Department</span>
                    {getSortIcon('department')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer min-w-[140px]"
                  onClick={() => handleSort('dateOfCreation')}
                >
                  <div className="flex items-center justify-between">
                    <span>Date of Creation</span>
                    {getSortIcon('dateOfCreation')}
                  </div>
                </th>
                {isAdmin() && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayedPimUsers.length > 0 ? (
                displayedPimUsers.map((pimUser) => (
                  <tr key={pimUser.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {pimUser.psid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.mobileNo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.reportingManager || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.hod || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {pimUser.dateOfCreation ? new Date(pimUser.dateOfCreation).toLocaleDateString() : '-'}
                    </td>
                    {isAdmin() && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditPimUser(pimUser)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirmation(pimUser)}
                            className="text-danger-600 hover:text-danger-900 dark:text-danger-400 dark:hover:text-danger-300"
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
                  <td colSpan={isAdmin() ? 9 : 8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No PIM users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls - Inside table container */}
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
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
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
      
      {/* Modals */}
      
      {/* Add PIM User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="card inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Add New PIM User
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-150"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleAddPimUser} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PSID *</label>
                      <input
                        type="text"
                        name="psid"
                        value={newPimUserData.psid || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={newPimUserData.fullName || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile No</label>
                      <input
                        type="text"
                        name="mobileNo"
                        value={newPimUserData.mobileNo || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={newPimUserData.email || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reporting Manager</label>
                      <input
                        type="text"
                        name="reportingManager"
                        value={newPimUserData.reportingManager || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HOD</label>
                      <input
                        type="text"
                        name="hod"
                        value={newPimUserData.hod || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                      <input
                        type="text"
                        name="department"
                        value={newPimUserData.department || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Creation</label>
                      <input
                        type="date"
                        name="dateOfCreation"
                        value={newPimUserData.dateOfCreation?.toString().split('T')[0] || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-ghost px-4 py-2"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2"
                    >
                      Add PIM User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit PIM User Modal */}
      {showEditModal && selectedPimUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="card inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Edit PIM User
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-150"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedPimUser(null);
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleUpdatePimUser} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PSID *</label>
                      <input
                        type="text"
                        name="psid"
                        value={selectedPimUser.psid || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, psid: e.target.value})}
                        className="form-input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={selectedPimUser.fullName || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, fullName: e.target.value})}
                        className="form-input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile No</label>
                      <input
                        type="text"
                        name="mobileNo"
                        value={selectedPimUser.mobileNo || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, mobileNo: e.target.value})}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={selectedPimUser.email || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, email: e.target.value})}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reporting Manager</label>
                      <input
                        type="text"
                        name="reportingManager"
                        value={selectedPimUser.reportingManager || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, reportingManager: e.target.value})}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HOD</label>
                      <input
                        type="text"
                        name="hod"
                        value={selectedPimUser.hod || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, hod: e.target.value})}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                      <input
                        type="text"
                        name="department"
                        value={selectedPimUser.department || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, department: e.target.value})}
                        className="form-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Creation</label>
                      <input
                        type="date"
                        name="dateOfCreation"
                        value={selectedPimUser.dateOfCreation?.toString().split('T')[0] || ''}
                        onChange={(e) => setSelectedPimUser({...selectedPimUser, dateOfCreation: e.target.value})}
                        className="form-input w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-ghost px-4 py-2"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedPimUser(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2"
                    >
                      Update PIM User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && selectedPimUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md z-10">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the PIM user "{selectedPimUser.fullName}" with PSID "{selectedPimUser.psid}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end mt-6 gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setSelectedPimUser(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeletePimUser}
              >
                Delete
              </button>
            </div>
            
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => {
                setShowDeleteConfirmation(false);
                setSelectedPimUser(null);
              }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Clear All Confirmation Modal */}
      {showClearAllConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
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
                      Clear All PIM Users
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete all PIM users? This action cannot be undone.
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
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger px-4 py-2"
                  onClick={handleClearAllPimUsers}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 mr-2 inline-block animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    'Clear All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PimUsers; 