import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { trackerApi } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

// Define tracker data interfaces
interface TrackerItem {
  id: number;
  name?: string;
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
  items?: TrackerItem[];
}

interface TrackerResponse {
  totalItems: number;
  trackers: TrackerItem[];
  totalPages: number;
  currentPage: number;
}

const Trackers: React.FC = () => {
  const { isAdmin } = useAuth();
  const [trackers, setTrackers] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedTrackers, setExpandedTrackers] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<TrackerItem | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    ownership: '',
    reviewer: '',
    frequency: '',
    status: '',
    remarks: '',
    timelines: '',
    name: ''
  });

  // Fetch trackers from API
  const fetchTrackers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await trackerApi.getTrackers({
        page: currentPage,
        size: itemsPerPage,
        search: searchTerm
      });
      
      const data: TrackerResponse = response.data;
      setTrackers(data.trackers);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
      setError(null);
    } catch (err) {
      console.error('Error fetching trackers:', err);
      setError('Failed to load tracker data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  // Fetch trackers on component mount and when parameters change
  useEffect(() => {
    fetchTrackers();
  }, [fetchTrackers]);

  // Toggle tracker expansion
  const toggleExpand = (trackerId: number) => {
    setExpandedTrackers(prev => {
      if (prev.includes(trackerId)) {
        return prev.filter(id => id !== trackerId);
      } else {
        return [...prev, trackerId];
      }
    });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  // Handle input change for forms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      description: '',
      ownership: '',
      reviewer: '',
      frequency: '',
      status: '',
      remarks: '',
      timelines: '',
      name: ''
    });
  };

  // Handle add tracker form submit
  const handleAddTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only send the name for parent trackers
      await trackerApi.createTracker({ name: formData.name });
      setShowAddModal(false);
      resetFormData();
      showSuccess('Tracker created successfully');
      fetchTrackers();
    } catch (err) {
      console.error('Error creating tracker:', err);
      setError('Failed to create tracker. Please try again.');
    }
  };

  // Handle edit tracker form submit
  const handleEditTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker) return;
    
    try {
      await trackerApi.updateTracker(selectedTracker.id, formData);
      setShowEditModal(false);
      resetFormData();
      setSelectedTracker(null);
      showSuccess('Tracker updated successfully');
      fetchTrackers();
    } catch (err) {
      console.error('Error updating tracker:', err);
      setError('Failed to update tracker. Please try again.');
    }
  };

  // Handle add item form submit
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParentId === null) return;
    
    try {
      // Send the data to the API
      await trackerApi.createTracker({
        ...formData,
        parentId: selectedParentId
      });
      
      setShowAddItemModal(false);
      resetFormData();
      setSelectedParentId(null);
      showSuccess('Item added successfully');
      fetchTrackers();
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
    }
  };

  // Handle delete tracker
  const handleDeleteTracker = async (id: number) => {
    try {
      await trackerApi.deleteTracker(id);
      showSuccess('Tracker deleted successfully');
      fetchTrackers();
      // Clear selection after deletion
      setSelectedTracker(null);
    } catch (err) {
      console.error('Error deleting tracker:', err);
      setError('Failed to delete tracker. Please try again.');
    }
  };

  // Function to open the edit modal with selected tracker data
  const openEditModal = (tracker: TrackerItem) => {
    setSelectedTracker(tracker);
    setFormData({
      description: tracker.description || '',
      ownership: tracker.ownership || '',
      reviewer: tracker.reviewer || '',
      frequency: tracker.frequency || '',
      status: tracker.status || '',
      remarks: tracker.remarks || '',
      timelines: tracker.timelines || '',
      name: tracker.name || ''
    });
    setShowEditModal(true);
  };

  // Open add item modal for a parent tracker
  const openAddItemModal = (parentId: number) => {
    setSelectedParentId(parentId);
    resetFormData();
    setShowAddItemModal(true);
  };

  // Show success message temporarily
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Clear error message
  const clearError = () => {
    setError(null);
  };

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-between items-center mt-4 px-2">
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span> of{' '}
            <span className="font-medium">{totalItems}</span> trackers
          </span>
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Calculate page numbers to show (centered around current page)
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-3 py-1 rounded-md ${
                  pageNum === currentPage
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-700 dark:text-gray-300 mr-2">
            Show:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="form-select text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>
    );
  };

  if (loading && trackers.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Trackers</h1>
      
      {/* Success/Error messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-800/30 border border-green-400 text-green-700 dark:text-green-400 rounded">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-800/30 border border-red-400 text-red-700 dark:text-red-400 rounded relative">
          {error}
          <button
            onClick={clearError}
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Search and Actions */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search input */}
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search trackers..."
                className="form-input pl-10 w-full"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {/* Action buttons */}
          {isAdmin() && (
            <div className="flex">
              <button 
                className="btn-primary"
                onClick={() => {
                  resetFormData();
                  setShowAddModal(true);
                }}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Tracker
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Trackers List */}
      {trackers.length > 0 ? (
        <div className="space-y-4">
          {trackers.map(tracker => (
            <div key={tracker.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Tracker header */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => toggleExpand(tracker.id)}
              >
                <div className="flex items-center space-x-3">
                  {expandedTrackers.includes(tracker.id) ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{tracker.name || 'Untitled Tracker'}</h3>
                </div>
                
                <div className="flex space-x-2">
                  {isAdmin() && (
                    <>
                      <button 
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddItemModal(tracker.id);
                        }}
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                      <button 
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(tracker);
                        }}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button 
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirmation(true);
                          setSelectedTracker(tracker);
                        }}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Tracker items (expanded) */}
              {expandedTrackers.includes(tracker.id) && (
                <div className="px-4 pb-4">
                  {tracker.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{tracker.description}</p>
                  )}
                  
                  {tracker.items && tracker.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Frequency</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ownership</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reviewer</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timelines</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Remarks</th>
                            {isAdmin() && (
                              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {tracker.items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-300">{item.description}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.frequency}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.ownership}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.reviewer}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.timelines}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.status}</td>
                              <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-300">{item.remarks}</td>
                              {isAdmin() && (
                                <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                                    onClick={() => openEditModal(item)}
                                  >
                                    <PencilSquareIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                    onClick={() => {
                                      setSelectedTracker(item);
                                      setShowDeleteConfirmation(true);
                                    }}
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No items in this tracker</p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Pagination */}
          {renderPagination()}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-8 text-center rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No trackers matching your search criteria' : 'No trackers found'}
          </p>
          {isAdmin() && (
            <button
              className="mt-4 btn-primary"
              onClick={() => {
                resetFormData();
                setShowAddModal(true);
              }}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Tracker
            </button>
          )}
        </div>
      )}
      
      {/* Add Tracker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">Add New Tracker</h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setShowAddModal(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddTracker} className="p-4">
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input w-full dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Tracker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Tracker Modal */}
      {showEditModal && selectedTracker && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Edit {selectedTracker.parentId ? 'Item' : 'Tracker'}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setShowEditModal(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditTracker} className="p-4">
              <div className="mb-4">
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  id="editDescription"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea w-full dark:bg-gray-700 dark:text-white"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="editOwnership" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ownership</label>
                  <input
                    type="text"
                    id="editOwnership"
                    name="ownership"
                    value={formData.ownership}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="editReviewer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reviewer</label>
                  <input
                    type="text"
                    id="editReviewer"
                    name="reviewer"
                    value={formData.reviewer}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="editFrequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                  <input
                    type="text"
                    id="editFrequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                    placeholder="Daily, Weekly, Monthly..."
                  />
                </div>
                
                <div>
                  <label htmlFor="editTimelines" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timelines</label>
                  <input
                    type="text"
                    id="editTimelines"
                    name="timelines"
                    value={formData.timelines}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <input
                  type="text"
                  id="editStatus"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-input w-full dark:bg-gray-700 dark:text-white"
                  placeholder="Active, Pending..."
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="editRemarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  id="editRemarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="form-textarea w-full dark:bg-gray-700 dark:text-white"
                  rows={2}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add Item Modal */}
      {showAddItemModal && selectedParentId !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">Add New Item</h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setShowAddItemModal(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-4">
              <div className="mb-4">
                <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  id="itemDescription"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea w-full dark:bg-gray-700 dark:text-white"
                  rows={3}
                  required
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="itemOwnership" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ownership</label>
                  <input
                    type="text"
                    id="itemOwnership"
                    name="ownership"
                    value={formData.ownership}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="itemReviewer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reviewer</label>
                  <input
                    type="text"
                    id="itemReviewer"
                    name="reviewer"
                    value={formData.reviewer}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="itemFrequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                  <input
                    type="text"
                    id="itemFrequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                    placeholder="Daily, Weekly, Monthly..."
                  />
                </div>
                
                <div>
                  <label htmlFor="itemTimelines" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timelines</label>
                  <input
                    type="text"
                    id="itemTimelines"
                    name="timelines"
                    value={formData.timelines || ''}
                    onChange={handleInputChange}
                    className="form-input w-full dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="itemStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <input
                  type="text"
                  id="itemStatus"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-input w-full dark:bg-gray-700 dark:text-white"
                  placeholder="Active, Pending..."
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="itemRemarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  id="itemRemarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="form-textarea w-full dark:bg-gray-700 dark:text-white"
                  rows={2}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddItemModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && selectedTracker && (
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
                      Delete {selectedTracker.parentId ? 'Item' : 'Tracker'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete <span className="font-semibold">{selectedTracker.name || 'Untitled Tracker'}</span>? This action cannot be undone.
                      </p>
                      {!selectedTracker.parentId && selectedTracker.items && selectedTracker.items.length > 0 && (
                        <p className="mt-2 text-sm text-danger-600 dark:text-danger-400">
                          This will also delete all {selectedTracker.items.length} items inside this tracker.
                        </p>
                      )}
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
                  onClick={() => {
                    handleDeleteTracker(selectedTracker.id);
                    setShowDeleteConfirmation(false);
                  }}
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

export default Trackers; 