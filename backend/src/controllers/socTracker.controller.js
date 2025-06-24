const db = require('../models');
const SOCTracker = db.socTracker;
const TrackerHeader = db.trackerHeader;
const TrackerRow = db.trackerRow;
const ActivityLog = db.activityLogs;
const Op = db.Sequelize.Op;
const Excel = require('exceljs');

// Get all trackers with pagination (only parent trackers)
exports.findAll = async (req, res) => {
  try {
    // Extract pagination parameters
    const { page = 1, size = 10, search = '' } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // Build search condition
    let condition = { 
      parentId: null // Only get parent trackers
    };
    
    if (search) {
      condition = {
        ...condition,
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { ownership: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }
    
    // Query with pagination
    const { count, rows } = await SOCTracker.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: [['id', 'ASC']],
      include: [{
        model: SOCTracker,
        as: 'items'
      }]
    });
    
    // Send response with pagination info
    res.status(200).send({
      totalItems: count,
      trackers: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving trackers."
    });
  }
};

// Get tracker items by parent ID
exports.getItemsByParent = async (req, res) => {
  try {
    const parentId = req.params.parentId;
    
    const items = await SOCTracker.findAll({
      where: { parentId },
      order: [['id', 'ASC']]
    });
    
    res.status(200).send(items);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving tracker items."
    });
  }
};

// Create a new tracker or tracker item
exports.create = async (req, res) => {
  try {
    // Prepare the data based on whether it's a parent tracker or an item
    let data = req.body;
    
    // If it's an item (has parentId), use description as name if name is not provided
    if (data.parentId) {
      // For items, ensure name is set (use description if name is not provided)
      if (!data.name) {
        data.name = data.description || 'Item';
      }
      // For items, trackerLink should be null
      data.trackerLink = null;
    }
    
    const newItem = await SOCTracker.create(data);
    
    // Determine if it's a parent tracker or an item
    const itemType = req.body.parentId ? "tracker item" : "tracker";
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'CREATE',
      description: `Created new ${itemType}: "${newItem.name}"`,
      entityType: 'tracker',
      entityId: newItem.id,
      ipAddress: req.ip
    });
    
    res.status(201).send(newItem);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while creating the tracker."
    });
  }
};

// Find a single tracker by id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const tracker = await SOCTracker.findByPk(id, {
      include: [{
        model: SOCTracker,
        as: 'items'
      }]
    });
    
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${id} not found.`
      });
    }
    
    res.status(200).send(tracker);
  } catch (error) {
    res.status(500).send({
      message: "Error retrieving tracker with id=" + req.params.id
    });
  }
};

// Update a tracker
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Find the tracker to determine if it's a parent or item
    const tracker = await SOCTracker.findByPk(id);
    
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${id} not found.`
      });
    }
    
    let data = req.body;
    
    // If it's an item, ensure name is set and trackerLink is null
    if (tracker.parentId) {
      // For items, ensure name is set
      if (!data.name) {
        data.name = data.description || 'Item';
      }
      // For items, trackerLink should be null
      data.trackerLink = null;
    }
    
    const [num] = await SOCTracker.update(data, {
      where: { id }
    });
    
    if (num === 1) {
      // Get updated tracker for logging
      const updatedTracker = await SOCTracker.findByPk(id);
      const itemType = updatedTracker.parentId ? "tracker item" : "tracker";
      
      // Log activity
      await ActivityLog.create({
        userId: req.userId,
        action: 'UPDATE',
        description: `Updated ${itemType}: "${updatedTracker.name}"`,
        entityType: 'tracker',
        entityId: id,
        ipAddress: req.ip
      });
      
      res.send({
        message: "Tracker was updated successfully."
      });
    } else {
      res.send({
        message: `Cannot update tracker with id=${id}. Tracker not found!`
      });
    }
  } catch (error) {
    res.status(500).send({
      message: "Error updating tracker with id=" + req.params.id
    });
  }
};

// Delete a tracker
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Find the tracker before deletion for the log
    const trackerToDelete = await SOCTracker.findByPk(id);
    
    if (!trackerToDelete) {
      return res.status(404).send({
        message: `Tracker with id=${id} not found.`
      });
    }
    
    // If it's a parent tracker, also delete all child items
    if (!trackerToDelete.parentId) {
      await SOCTracker.destroy({
        where: { parentId: id }
      });
    }
    
    await trackerToDelete.destroy();
    
    // Log activity
    const itemType = trackerToDelete.parentId ? "tracker item" : "tracker";
    await ActivityLog.create({
      userId: req.userId,
      action: 'DELETE',
      description: `Deleted ${itemType}: "${trackerToDelete.name}"`,
      entityType: 'tracker',
      entityId: id,
      ipAddress: req.ip
    });
    
    res.send({
      message: "Tracker was deleted successfully!"
    });
  } catch (error) {
    res.status(500).send({
      message: "Could not delete tracker with id=" + req.params.id
    });
  }
};

// Get tracker table data
exports.getTableData = async (req, res) => {
  try {
    const trackerId = req.params.id;
    const { page = 1, size = 10, search = '' } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // First, check if the tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Get the headers
    const headers = await TrackerHeader.findAll({
      where: { trackerId },
      order: [['order', 'ASC']]
    });
    
    // Build search condition
    let condition = { trackerId };
    
    // If search term is provided, we'll need to search in the JSON data field
    // This is complex in SQL and might need to be handled differently depending on the DB
    
    // Query rows with pagination
    const { count, rows } = await TrackerRow.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: [['id', 'DESC']]
    });
    
    // Send response with both headers and rows
    res.status(200).send({
      totalItems: count,
      rows,
      headers,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving tracker table data."
    });
  }
};

// Update tracker headers
exports.updateHeaders = async (req, res) => {
  try {
    const trackerId = req.params.id;
    const { headers } = req.body;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Get current headers
    const existingHeaders = await TrackerHeader.findAll({
      where: { trackerId }
    });
    
    // Map of existing headers by ID for fast lookup
    const existingHeadersMap = {};
    existingHeaders.forEach(header => {
      existingHeadersMap[header.id] = header;
    });
    
    // Process each header in the request
    for (const header of headers) {
      if (header.id && existingHeadersMap[header.id]) {
        // Update existing header
        await TrackerHeader.update({
          key: header.key,
          label: header.label,
          enabled: header.enabled,
          order: header.order
        }, {
          where: { id: header.id, trackerId }
        });
      } else if (!header.id) {
        // Create new header
        await TrackerHeader.create({
          trackerId,
          key: header.key,
          label: header.label,
          enabled: header.enabled,
          order: header.order
        });
      }
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'UPDATE',
      description: `Updated headers for tracker "${tracker.name}"`,
      entityType: 'tracker_header',
      entityId: trackerId,
      ipAddress: req.ip
    });
    
    res.status(200).send({
      message: "Headers updated successfully."
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while updating headers."
    });
  }
};

// Create table row
exports.createTableRow = async (req, res) => {
  try {
    const trackerId = req.params.id;
    const rowData = req.body;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Create the row
    const newRow = await TrackerRow.create({
      trackerId,
      data: rowData
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'CREATE',
      description: `Created new row in tracker "${tracker.name}"`,
      entityType: 'tracker_row',
      entityId: newRow.id,
      ipAddress: req.ip
    });
    
    res.status(201).send(newRow);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while creating the row."
    });
  }
};

// Update table row
exports.updateTableRow = async (req, res) => {
  try {
    const trackerId = req.params.id;
    const rowId = req.params.rowId;
    const rowData = req.body;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Check if row exists and belongs to this tracker
    const row = await TrackerRow.findOne({
      where: { id: rowId, trackerId }
    });
    
    if (!row) {
      return res.status(404).send({
        message: `Row with id=${rowId} not found or does not belong to this tracker.`
      });
    }
    
    // Update the row
    await TrackerRow.update({
      data: rowData
    }, {
      where: { id: rowId, trackerId }
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'UPDATE',
      description: `Updated row in tracker "${tracker.name}"`,
      entityType: 'tracker_row',
      entityId: rowId,
      ipAddress: req.ip
    });
    
    res.status(200).send({
      message: "Row updated successfully."
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while updating the row."
    });
  }
};

// Delete table row
exports.deleteTableRow = async (req, res) => {
  try {
    const trackerId = req.params.id;
    const rowId = req.params.rowId;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Check if row exists and belongs to this tracker
    const row = await TrackerRow.findOne({
      where: { id: rowId, trackerId }
    });
    
    if (!row) {
      return res.status(404).send({
        message: `Row with id=${rowId} not found or does not belong to this tracker.`
      });
    }
    
    // Delete the row
    await TrackerRow.destroy({
      where: { id: rowId, trackerId }
    });
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'DELETE',
      description: `Deleted row from tracker "${tracker.name}"`,
      entityType: 'tracker_row',
      entityId: rowId,
      ipAddress: req.ip
    });
    
    res.status(200).send({
      message: "Row deleted successfully."
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while deleting the row."
    });
  }
};

// Import table data from Excel
exports.importTableData = async (req, res) => {
  try {
    const trackerId = req.params.id;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    if (!req.file) {
      return res.status(400).send({
        message: "Please upload an Excel file."
      });
    }
    
    // Parse Excel file
    const workbook = new Excel.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    
    // Get headers from first row
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        headers.push({
          key: cell.value.toString().toLowerCase().replace(/\s+/g, '_'),
          label: cell.value.toString()
        });
      }
    });
    
    // Process data rows
    const importedRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          if (colNumber <= headers.length) {
            rowData[headers[colNumber - 1].key] = cell.value;
          }
        });
        importedRows.push(rowData);
      }
    });
    
    // Save rows to database
    for (const rowData of importedRows) {
      await TrackerRow.create({
        trackerId,
        data: rowData
      });
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'IMPORT',
      description: `Imported ${importedRows.length} rows to tracker "${tracker.name}"`,
      entityType: 'tracker',
      entityId: trackerId,
      ipAddress: req.ip
    });
    
    res.status(200).send({
      message: `${importedRows.length} rows imported successfully.`
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while importing data."
    });
  }
};

// Export table data to Excel
exports.exportTableData = async (req, res) => {
  try {
    const trackerId = req.params.id;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Get headers
    const headers = await TrackerHeader.findAll({
      where: { trackerId, enabled: true },
      order: [['order', 'ASC']]
    });
    
    // Get all rows (no pagination for export)
    const rows = await TrackerRow.findAll({
      where: { trackerId },
      order: [['id', 'DESC']]
    });
    
    // Create a workbook
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Tracker Data');
    
    // Add headers to worksheet
    const headerRow = headers.map(h => h.label);
    worksheet.addRow(headerRow);
    
    // Add data rows
    rows.forEach(row => {
      const rowData = row.data;
      const excelRow = headers.map(header => rowData[header.key] || '');
      worksheet.addRow(excelRow);
    });
    
    // Format header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Set column widths
    headers.forEach((header, index) => {
      worksheet.getColumn(index + 1).width = 15;
    });
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'EXPORT',
      description: `Exported ${rows.length} rows from tracker "${tracker.name}"`,
      entityType: 'tracker',
      entityId: trackerId,
      ipAddress: req.ip
    });
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tracker_${trackerId}_${Date.now()}.xlsx`);
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while exporting data."
    });
  }
};

// Get table import template
exports.getTableTemplate = async (req, res) => {
  try {
    const trackerId = req.params.id;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Get headers
    const headers = await TrackerHeader.findAll({
      where: { trackerId, enabled: true },
      order: [['order', 'ASC']]
    });
    
    // If no headers exist yet, use default headers
    const templateHeaders = headers.length > 0 ? headers : [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'date', label: 'Date' }
    ];
    
    // Create a workbook
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    
    // Add headers to worksheet
    const headerRow = templateHeaders.map(h => h.label);
    worksheet.addRow(headerRow);
    
    // Add a sample row
    const sampleRow = templateHeaders.map(header => {
      switch (header.key) {
        case 'name':
          return 'Sample Name';
        case 'description':
          return 'Sample Description';
        case 'status':
          return 'Open';
        case 'owner':
          return 'John Doe';
        case 'date':
          return new Date().toLocaleDateString();
        default:
          return `Sample ${header.label}`;
      }
    });
    worksheet.addRow(sampleRow);
    
    // Format header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Set column widths
    templateHeaders.forEach((header, index) => {
      worksheet.getColumn(index + 1).width = 15;
    });
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tracker_template_${trackerId}.xlsx`);
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while generating the template."
    });
  }
};

// Initialize headers for a tracker if they don't exist
exports.initializeHeaders = async (req, res) => {
  try {
    const trackerId = req.params.id;
    
    // Check if tracker exists
    const tracker = await SOCTracker.findByPk(trackerId);
    if (!tracker) {
      return res.status(404).send({
        message: `Tracker with id=${trackerId} not found.`
      });
    }
    
    // Check if headers already exist
    const existingHeadersCount = await TrackerHeader.count({
      where: { trackerId }
    });
    
    if (existingHeadersCount > 0) {
      return res.status(200).send({
        message: "Headers already initialized for this tracker."
      });
    }
    
    // Default headers
    const defaultHeaders = [
      { key: 'name', label: 'Name', enabled: true, order: 1 },
      { key: 'description', label: 'Description', enabled: true, order: 2 },
      { key: 'status', label: 'Status', enabled: true, order: 3 },
      { key: 'owner', label: 'Owner', enabled: true, order: 4 },
      { key: 'date', label: 'Date', enabled: true, order: 5 },
      { key: 'priority', label: 'Priority', enabled: false, order: 6 },
      { key: 'comments', label: 'Comments', enabled: false, order: 7 }
    ];
    
    // Create headers
    for (const header of defaultHeaders) {
      await TrackerHeader.create({
        trackerId,
        key: header.key,
        label: header.label,
        enabled: header.enabled,
        order: header.order
      });
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'CREATE',
      description: `Initialized headers for tracker "${tracker.name}"`,
      entityType: 'tracker_header',
      entityId: trackerId,
      ipAddress: req.ip
    });
    
    res.status(201).send({
      message: "Headers initialized successfully."
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while initializing headers."
    });
  }
}; 