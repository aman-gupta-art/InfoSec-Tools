import React, { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowDownTrayIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import { activityLogApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.tsx';

interface ActivityLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  description: string;
  ipAddress: string;
  createdAt: string;
}

const AuditLogs: React.FC = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionFilter, setActionFilter] = useState('');
  const [allActions, setAllActions] = useState<string[]>([]);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Define fetchLogs with useCallback
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await activityLogApi.getLogs({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        action: actionFilter
      });
      
      // Expect an API response with { logs: [], totalItems: number, totalPages: number, currentPage: number }
      const logsData = Array.isArray(response.data.logs) ? response.data.logs : [];
      const total = response.data.totalItems || 0; // Use totalItems from API response
      const pages = response.data.totalPages || Math.ceil(total / itemsPerPage);
      
      setLogs(logsData);
      setTotalLogs(total);
      setTotalPages(pages);
      
      // Extract all unique actions for the dropdown
      if (logsData.length > 0) {
        const actions = [...new Set(logsData.map(log => log.action))];
        setAllActions(prevActions => {
          // Combine previous actions with new ones to maintain the dropdown state
          const combinedActions = [...new Set([...prevActions, ...actions])] as string[];
          return combinedActions;
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs. Please try again later.');
      setLogs([]);
      setTotalLogs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, actionFilter]);

  // Fetch logs on component mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle action filter change
  const handleActionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle export logs
  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      const response = await activityLogApi.exportLogs({
        search: searchTerm,
        action: actionFilter
      });
      
      // Create a blob from the response
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs_export.xlsx');
      
      // Append to the document, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage('Logs exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error exporting logs:', err);
      setError('Failed to export logs. Please try again later.');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle clear all logs
  const handleClearLogs = async () => {
    try {
      setClearLoading(true);
      
      await activityLogApi.clearAllLogs();
      
      // Refresh logs
      fetchLogs();
      
      setSuccessMessage('All logs cleared successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowClearConfirmation(false);
    } catch (err) {
      console.error('Error clearing logs:', err);
      setError('Failed to clear logs. Please try again later.');
    } finally {
      setClearLoading(false);
    }
  };

  // Format date and time
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  // Change page handler
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value));
    setCurrentPage(1);
  };

  if (loading && !exportLoading && !clearLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Audit Logs</h1>
      
      {/* Success message */}
      {successMessage && (
        <div className="p-3 bg-success-100 dark:bg-success-900/30 border border-success-200 text-success-700 dark:text-success-300 rounded mb-4" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="p-3 bg-danger-100 dark:bg-danger-900/30 border border-danger-200 text-danger-700 dark:text-danger-300 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Search and filter controls */}
      <div className="mb-6 card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search input */}
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {/* Action Filter */}
          <div className="w-full md:w-1/4">
            <select 
              className="form-input"
              value={actionFilter}
              onChange={handleActionFilterChange}
            >
              <option value="">All Actions</option>
              {allActions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
          
          {/* Export and Clear buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="btn-primary"
            >
              {exportLoading ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              )}
              Export
            </button>
            
            {isAdmin() && (
              <button
                onClick={() => setShowClearConfirmation(true)}
                className="btn-danger"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Clear Logs
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Logs table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer w-32">
                  <div className="flex items-center justify-between">
                    <span>Timestamp</span>
                    <div className="h-4 w-4 ml-1 invisible"></div>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer w-28">
                  <div className="flex items-center justify-between">
                    <span>User</span>
                    <div className="h-4 w-4 ml-1 invisible"></div>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer w-28">
                  <div className="flex items-center justify-between">
                    <span>Action</span>
                    <div className="h-4 w-4 ml-1 invisible"></div>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Details</span>
                    <div className="h-4 w-4 ml-1 invisible"></div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`status-badge ${
                        log.action === 'CREATE' ? 'status-badge-success' : 
                        log.action === 'DELETE' ? 'status-badge-danger' : 
                        log.action === 'UPDATE' ? 'status-badge-warning' : 
                        'status-badge-info'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-300 break-all">{log.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                    {loading ? 'Loading logs...' : 'No logs found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {totalLogs > 0 ? (
                  <>
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalLogs)}
                    </span>{' '}
                    of <span className="font-medium">{totalLogs}</span> results
                  </>
                ) : (
                  'No results found'
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show</span>
              <select
                className="form-input py-1 px-2 w-16"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
              
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px ml-4" aria-label="Pagination">
                <button
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        onClick={() => paginate(pageToShow)}
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
                  onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      
      {/* Clear Logs Confirmation Modal */}
      {showClearConfirmation && (
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
                      Clear All Logs
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to clear all activity logs? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="btn-danger ml-3"
                  onClick={handleClearLogs}
                  disabled={clearLoading}
                >
                  {clearLoading ? (
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : null}
                  Clear All
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowClearConfirmation(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs; 