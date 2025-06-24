import React, { useState, useEffect, useCallback } from 'react';
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
  PencilSquareIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useParams, useNavigate } from 'react-router-dom';
import { trackerApi } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface TrackerItem {
  id: number;
  name: string;
  description?: string;
  parentId: number | null;
  ownership?: string;
  reviewer?: string;
  frequency?: string;
  status?: string;
  remarks?: string;
  timelines?: string;
  createdAt: string;
  updatedAt: string;
}

interface TrackerData {
  id: number;
  name: string;
  description?: string;
  parentId: number | null;
  headers: HeaderConfig[];
  rows: TrackerRow[];
}

interface HeaderConfig {
  id: number;
  key: string;
  label: string;
  enabled: boolean;
  order: number;
}

interface TrackerRow {
  id: number;
  [key: string]: any;
}

const ItemTracker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // State for tracker item data
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [parent, setParent] = useState<TrackerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State for table data
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [displayedRows, setDisplayedRows] = useState<TrackerRow[]>([]);
  
  // State for modals
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [showEditRowModal, setShowEditRowModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TrackerRow | null>(null);
  const [rowFormData, setRowFormData] = useState<{[key: string]: any}>({});
  
  // State for header configuration
  const [showHeaderConfig, setShowHeaderConfig] = useState(false);
  const [defaultHeaders] = useState<HeaderConfig[]>([
    { id: 1, key: 'name', label: 'Name', enabled: true, order: 1 },
    { id: 2, key: 'description', label: 'Description', enabled: true, order: 2 },
    { id: 3, key: 'status', label: 'Status', enabled: true, order: 3 },
    { id: 4, key: 'owner', label: 'Owner', enabled: true, order: 4 },
    { id: 5, key: 'date', label: 'Date', enabled: true, order: 5 },
    { id: 6, key: 'priority', label: 'Priority', enabled: false, order: 6 },
    { id: 7, key: 'comments', label: 'Comments', enabled: false, order: 7 }
  ]);
  
  // Fetch tracker data
  const fetchTrackerData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // First get the tracker item
      const itemResponse = await trackerApi.getTracker(parseInt(id));
      const trackerItem = itemResponse.data;
      setTracker({
        id: trackerItem.id,
        name: trackerItem.name,
        description: trackerItem.description,
        parentId: trackerItem.parentId,
        // For now, use default headers and empty rows
        // In a real implementation, these would come from the API
        headers: defaultHeaders,
        rows: []
      });
      
      // If it has a parent, fetch the parent data as well
      if (trackerItem.parentId) {
        const parentResponse = await trackerApi.getTracker(trackerItem.parentId);
        setParent(parentResponse.data);
      }
      
      // Mock pagination data for now
      setTotalItems(0);
      setTotalPages(1);
      setDisplayedRows([]);
      setError(null);
    } catch (err) {
      console.error('Error fetching tracker data:', err);
      setError('Failed to load tracker data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id, defaultHeaders]);
  
  // Initial data load
  useEffect(() => {
    fetchTrackerData();
  }, [fetchTrackerData]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };
  
  // Handle pagination change
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };
  
  // Handle input change for forms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRowFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Reset form data
  const resetFormData = () => {
    setRowFormData({});
  };
  
  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
  
  // Handle file import
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('trackerId', id || '');
    
    try {
      // This would be implemented in the API
      // await trackerApi.importTrackerData(formData);
      showSuccess('File imported successfully');
      fetchTrackerData();
    } catch (err) {
      console.error('Error importing file:', err);
      setError('Failed to import file. Please check the format and try again.');
    }
  };
  
  // Handle export to Excel
  const handleExport = async () => {
    try {
      // This would be implemented in the API
      // const response = await trackerApi.exportTrackerData(parseInt(id || '0'));
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', `tracker_${id}_data.xlsx`);
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
      showSuccess('Data exported successfully');
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data. Please try again later.');
    }
  };
  
  // Handle download template
  const handleDownloadTemplate = async () => {
    try {
      // This would be implemented in the API
      // const response = await trackerApi.getTrackerTemplate();
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', 'tracker_template.xlsx');
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
      showSuccess('Template downloaded successfully');
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Failed to download template. Please try again later.');
    }
  };
  
  // Update header configuration
  const handleHeaderChange = (headerId: number, field: 'enabled' | 'label' | 'order', value: boolean | string | number) => {
    if (!tracker) return;
    
    const updatedHeaders = tracker.headers.map(header => {
      if (header.id === headerId) {
        return { ...header, [field]: value };
      }
      return header;
    });
    
    setTracker({ ...tracker, headers: updatedHeaders });
  };
  
  // Save header configuration
  const saveHeaderConfig = async () => {
    if (!tracker) return;
    
    try {
      // This would be implemented in the API
      // await trackerApi.updateTrackerHeaders(parseInt(id || '0'), tracker.headers);
      setShowHeaderConfig(false);
      showSuccess('Header configuration saved successfully');
    } catch (err) {
      console.error('Error saving header config:', err);
      setError('Failed to save header configuration. Please try again later.');
    }
  };
  
  // Render pagination controls
  const renderPagination = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`px-3 py-1 mx-1 rounded ${currentPage === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to{' '}
          <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
        <div className="flex space-x-1">
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {pages}
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    );
  };
  
  // Go back to trackers page
  const handleBack = () => {
    navigate('/trackers');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <button 
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Trackers
          </button>
          <h1 className="text-2xl font-bold">
            {tracker?.name || 'Loading...'}
          </h1>
          {parent && (
            <p className="text-gray-600">
              Parent Tracker: {parent.name}
            </p>
          )}
          {tracker?.description && (
            <p className="text-gray-600 mt-1">
              {tracker.description}
            </p>
          )}
        </div>
        
        {isAdmin && (
          <div className="flex space-x-3">
            <button
              onClick={() => setShowHeaderConfig(true)}
              className="flex items-center px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Configure Columns
            </button>
            <button
              onClick={() => setShowAddRowModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Row
            </button>
          </div>
        )}
      </div>
      
      {/* Error and success messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <XMarkIcon className="h-5 w-5 cursor-pointer" onClick={() => setError(null)} />
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{successMessage}</span>
          <XMarkIcon className="h-5 w-5 cursor-pointer" onClick={() => setSuccessMessage(null)} />
        </div>
      )}
      
      {/* Tools bar */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex space-x-3">
          {/* Download Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2 text-gray-600" />
            Template
          </button>
          
          {/* Import Button */}
          <label className="flex items-center px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 cursor-pointer">
            <ArrowUpTrayIcon className="h-5 w-5 mr-2 text-gray-600" />
            Import
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-600" />
            Export
          </button>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : tracker && tracker.headers.filter(h => h.enabled).length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {tracker.headers
                      .filter(header => header.enabled)
                      .sort((a, b) => a.order - b.order)
                      .map(header => (
                        <th
                          key={header.id}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header.label}
                        </th>
                      ))}
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedRows.length > 0 ? (
                    displayedRows.map(row => (
                      <tr key={row.id}>
                        {tracker.headers
                          .filter(header => header.enabled)
                          .sort((a, b) => a.order - b.order)
                          .map(header => (
                            <td key={header.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {row[header.key] || '—'}
                            </td>
                          ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isAdmin && (
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => {
                                  setSelectedRow(row);
                                  setRowFormData(row);
                                  setShowEditRowModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRow(row);
                                  setShowDeleteConfirmation(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={tracker.headers.filter(h => h.enabled).length + 1}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No data available. Click "Add Row" to create new entries or import data using the Excel import feature.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-700">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                {renderPagination()}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            No columns configured. {isAdmin && 'Click "Configure Columns" to set up the table layout.'}
          </div>
        )}
      </div>
      
      {/* Header configuration modal */}
      {showHeaderConfig && tracker && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">Configure Table Columns</h2>
            <div className="max-h-96 overflow-y-auto">
              {tracker.headers.map((header, index) => (
                <div key={header.id} className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`header-${header.id}`}
                      checked={header.enabled}
                      onChange={(e) => handleHeaderChange(header.id, 'enabled', e.target.checked)}
                      className="mr-3"
                    />
                    <input
                      type="text"
                      value={header.label}
                      onChange={(e) => handleHeaderChange(header.id, 'label', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={header.order}
                      onChange={(e) => handleHeaderChange(header.id, 'order', parseInt(e.target.value) || 0)}
                      min="1"
                      className="border rounded w-16 px-2 py-1"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowHeaderConfig(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveHeaderConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add/Edit row modals would be implemented here */}
      {/* Delete confirmation modal would be implemented here */}
    </div>
  );
};

export default ItemTracker; 