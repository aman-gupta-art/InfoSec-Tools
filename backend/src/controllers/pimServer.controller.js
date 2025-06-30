const db = require("../models");
const PimServer = db.pimServers;
const { Op } = require("sequelize");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// Create and Save a new PIM Server
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.serverIp || !req.body.serverUsername || !req.body.hostname) {
      return res.status(400).send({
        message: "Server IP, Server Username, and Hostname are required fields!"
      });
    }

    // Create a PIM Server
    const pimServer = {
      serverIp: req.body.serverIp,
      serverUsername: req.body.serverUsername,
      hostname: req.body.hostname,
      applicationName: req.body.applicationName || null,
      group: req.body.group || null,
      connectionType: req.body.connectionType || null
    };

    // Save PIM Server in the database
    const data = await PimServer.create(pimServer);
    
    // Create an activity log
    await db.activityLogs.create({
      action: "create",
      entityType: "pimServer",
      entityId: data.id,
      details: `Created PIM Server: ${data.hostname} (${data.serverIp})`,
      userId: req.userId
    });
    
    res.send(data);
  } catch (err) {
    console.error("Error creating PIM server:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while creating the PIM Server."
    });
  }
};

// Retrieve all PIM Servers from the database with pagination and filtering
exports.findAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order || "desc";
    const includeAll = req.query.includeAll === "true";
    
    // Offset for pagination
    const offset = includeAll ? 0 : (page - 1) * size;
    
    // Limit for pagination (no limit if includeAll is true)
    const limit = includeAll ? null : size;
    
    // Filter conditions
    const whereClause = {};
    
    // Search in multiple fields if search parameter is provided
    if (search) {
      whereClause[Op.or] = [
        { serverIp: { [Op.like]: `%${search}%` } },
        { serverUsername: { [Op.like]: `%${search}%` } },
        { hostname: { [Op.like]: `%${search}%` } },
        { applicationName: { [Op.like]: `%${search}%` } },
        { group: { [Op.like]: `%${search}%` } },
        { connectionType: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Add specific filter conditions if provided
    if (req.query.applicationName) {
      whereClause.applicationName = req.query.applicationName;
    }
    
    if (req.query.group) {
      whereClause.group = req.query.group;
    }
    
    if (req.query.connectionType) {
      whereClause.connectionType = req.query.connectionType;
    }
    
    // Query the database
    const { count, rows } = await PimServer.findAndCountAll({
      where: whereClause,
      order: [[sortBy, order]],
      offset,
      limit
    });
    
    // Calculate total pages
    const totalPages = limit ? Math.ceil(count / size) : 1;
    
    // Prepare response
    const response = {
      totalItems: count,
      pimServers: rows,
      currentPage: page,
      totalPages
    };
    
    res.send(response);
  } catch (err) {
    console.error("Error retrieving PIM servers:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving PIM servers."
    });
  }
};

// Find a single PIM Server with an id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const pimServer = await PimServer.findByPk(id);
    
    if (!pimServer) {
      return res.status(404).send({
        message: `PIM Server with id ${id} not found.`
      });
    }
    
    res.send(pimServer);
  } catch (err) {
    console.error(`Error retrieving PIM server with id ${req.params.id}:`, err);
    res.status(500).send({
      message: err.message || `Error retrieving PIM Server with id ${req.params.id}`
    });
  }
};

// Update a PIM Server by the id in the request
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if required fields are provided
    if (!req.body.serverIp || !req.body.serverUsername || !req.body.hostname) {
      return res.status(400).send({
        message: "Server IP, Server Username, and Hostname are required fields!"
      });
    }
    
    const pimServer = await PimServer.findByPk(id);
    
    if (!pimServer) {
      return res.status(404).send({
        message: `Cannot update PIM Server with id=${id}. PIM Server not found!`
      });
    }
    
    // Update PIM Server
    await pimServer.update({
      serverIp: req.body.serverIp,
      serverUsername: req.body.serverUsername,
      hostname: req.body.hostname,
      applicationName: req.body.applicationName || null,
      group: req.body.group || null,
      connectionType: req.body.connectionType || null
    });
    
    // Create an activity log
    await db.activityLogs.create({
      action: "update",
      entityType: "pimServer",
      entityId: id,
      details: `Updated PIM Server: ${pimServer.hostname} (${pimServer.serverIp})`,
      userId: req.userId
    });
    
    res.send({
      message: "PIM Server was updated successfully."
    });
  } catch (err) {
    console.error(`Error updating PIM server with id ${req.params.id}:`, err);
    res.status(500).send({
      message: err.message || `Error updating PIM Server with id=${req.params.id}`
    });
  }
};

// Delete a PIM Server with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const pimServer = await PimServer.findByPk(id);
    
    if (!pimServer) {
      return res.status(404).send({
        message: `Cannot delete PIM Server with id=${id}. PIM Server not found!`
      });
    }
    
    const serverInfo = `${pimServer.hostname} (${pimServer.serverIp})`;
    
    // Delete the PIM Server
    await pimServer.destroy();
    
    // Create an activity log
    await db.activityLogs.create({
      action: "delete",
      entityType: "pimServer",
      entityId: id,
      details: `Deleted PIM Server: ${serverInfo}`,
      userId: req.userId
    });
    
    res.send({
      message: "PIM Server was deleted successfully!"
    });
  } catch (err) {
    console.error(`Error deleting PIM server with id ${req.params.id}:`, err);
    res.status(500).send({
      message: err.message || `Could not delete PIM Server with id=${req.params.id}`
    });
  }
};

// Delete all PIM Servers from the database
exports.deleteAll = async (req, res) => {
  try {
    const count = await PimServer.destroy({
      where: {},
      truncate: false
    });
    
    // Create an activity log
    await db.activityLogs.create({
      action: "delete_all",
      entityType: "pimServer",
      entityId: null,
      details: `Cleared all PIM Servers (${count} servers deleted)`,
      userId: req.userId
    });
    
    res.send({
      message: `${count} PIM Servers were deleted successfully!`
    });
  } catch (err) {
    console.error("Error clearing all PIM servers:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while removing all PIM Servers."
    });
  }
};

// Get distinct values for filter dropdowns
exports.getFilterOptions = async (req, res) => {
  try {
    const distinctValues = {
      applicationNames: [],
      groups: [],
      connectionTypes: []
    };
    
    // Get distinct applicationNames
    const applicationNames = await PimServer.findAll({
      attributes: [[db.Sequelize.fn("DISTINCT", db.Sequelize.col("applicationName")), "value"]],
      where: {
        applicationName: {
          [Op.not]: null
        }
      },
      raw: true
    });
    distinctValues.applicationNames = applicationNames.map(v => v.value).filter(Boolean).sort();
    
    // Get distinct groups
    const groups = await PimServer.findAll({
      attributes: [[db.Sequelize.fn("DISTINCT", db.Sequelize.col("group")), "value"]],
      where: {
        group: {
          [Op.not]: null
        }
      },
      raw: true
    });
    distinctValues.groups = groups.map(v => v.value).filter(Boolean).sort();
    
    // Get distinct connectionTypes
    const connectionTypes = await PimServer.findAll({
      attributes: [[db.Sequelize.fn("DISTINCT", db.Sequelize.col("connectionType")), "value"]],
      where: {
        connectionType: {
          [Op.not]: null
        }
      },
      raw: true
    });
    distinctValues.connectionTypes = connectionTypes.map(v => v.value).filter(Boolean).sort();
    
    res.send({
      distinctValues
    });
  } catch (err) {
    console.error("Error getting filter options:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while getting filter options."
    });
  }
};

// Generate an Excel import template
exports.getImportTemplate = (req, res) => {
  try {
    // Create a new workbook
    const wb = xlsx.utils.book_new();
    
    // Define headers
    const headers = ["serverIp", "serverUsername", "hostname", "applicationName", "group", "connectionType"];
    
    // Create worksheet with headers only
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, "PIM Servers");
    
    // Create a temporary file to store the Excel file
    const tempFilePath = path.join(__dirname, '../../uploads', 'pim_servers_template.xlsx');
    
    // Write to file
    xlsx.writeFile(wb, tempFilePath);
    
    // Send the file as a download
    res.download(tempFilePath, 'pim_servers_import_template.xlsx', (err) => {
      // Delete the temporary file after download
      if (fs.existsSync(tempFilePath)) {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error("Error deleting temporary template file:", err);
        });
      }
      
      if (err) {
        console.error("Error sending template file:", err);
        if (!res.headersSent) {
          res.status(500).send({
            message: "Error downloading the template."
          });
        }
      }
    });
  } catch (err) {
    console.error("Error generating import template:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while generating the import template."
    });
  }
};

// Export PIM Servers to Excel
exports.exportToExcel = async (req, res) => {
  try {
    // Prepare filter conditions similar to findAll
    const search = req.query.search || "";
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { serverIp: { [Op.like]: `%${search}%` } },
        { serverUsername: { [Op.like]: `%${search}%` } },
        { hostname: { [Op.like]: `%${search}%` } },
        { applicationName: { [Op.like]: `%${search}%` } },
        { group: { [Op.like]: `%${search}%` } },
        { connectionType: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (req.query.applicationName) {
      whereClause.applicationName = req.query.applicationName;
    }
    
    if (req.query.group) {
      whereClause.group = req.query.group;
    }
    
    if (req.query.connectionType) {
      whereClause.connectionType = req.query.connectionType;
    }
    
    // Get all PIM Servers matching the criteria
    const pimServers = await PimServer.findAll({
      where: whereClause,
      order: [["hostname", "ASC"]]
    });
    
    // Create a new workbook
    const wb = xlsx.utils.book_new();
    
    // Define headers
    const headers = ["Server IP", "Server Username", "Hostname", "Application Name", "Group", "Connection Type", "Created At", "Updated At"];
    
    // Prepare data for the worksheet
    const data = [headers];
    
    pimServers.forEach(server => {
      data.push([
        server.serverIp,
        server.serverUsername,
        server.hostname,
        server.applicationName || "",
        server.group || "",
        server.connectionType || "",
        new Date(server.createdAt).toLocaleString(),
        new Date(server.updatedAt).toLocaleString()
      ]);
    });
    
    // Create worksheet with data
    const ws = xlsx.utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, "PIM Servers");
    
    // Create a temporary file to store the Excel file
    const tempFilePath = path.join(__dirname, '../../uploads', 'pim_servers_export.xlsx');
    
    // Write to file
    xlsx.writeFile(wb, tempFilePath);
    
    // Create an activity log
    await db.activityLogs.create({
      action: "export",
      entityType: "pimServer",
      entityId: null,
      details: `Exported PIM Servers to Excel (${pimServers.length} servers)`,
      userId: req.userId
    });
    
    // Send the file as a download
    res.download(tempFilePath, `pim_servers_export_${new Date().toISOString().slice(0, 10)}.xlsx`, (err) => {
      // Delete the temporary file after download
      if (fs.existsSync(tempFilePath)) {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error("Error deleting temporary export file:", err);
        });
      }
      
      if (err) {
        console.error("Error sending export file:", err);
        if (!res.headersSent) {
          res.status(500).send({
            message: "Error downloading the export file."
          });
        }
      }
    });
  } catch (err) {
    console.error("Error exporting PIM servers to Excel:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while exporting PIM servers to Excel."
    });
  }
};

// Import PIM Servers from Excel
exports.importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        message: "Please upload an Excel file!"
      });
    }
    
    // Read the uploaded file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Track successful and failed imports
    const imported = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Process each row
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.serverIp || !row.serverUsername || !row.hostname) {
          imported.failed++;
          imported.errors.push(`Row ${imported.success + imported.failed}: Missing required fields (serverIp, serverUsername, hostname)`);
          continue;
        }
        
        // Create the PIM Server
        await PimServer.create({
          serverIp: row.serverIp,
          serverUsername: row.serverUsername,
          hostname: row.hostname,
          applicationName: row.applicationName || null,
          group: row.group || null,
          connectionType: row.connectionType || null
        });
        
        imported.success++;
      } catch (error) {
        imported.failed++;
        imported.errors.push(`Row ${imported.success + imported.failed}: ${error.message}`);
      }
    }
    
    // Create an activity log
    await db.activityLogs.create({
      action: "import",
      entityType: "pimServer",
      entityId: null,
      details: `Imported PIM Servers from Excel (${imported.success} successful, ${imported.failed} failed)`,
      userId: req.userId
    });
    
    res.send({
      message: `Processed ${data.length} rows. Successfully imported ${imported.success} PIM servers. Failed: ${imported.failed}.`,
      success: imported.success,
      failed: imported.failed,
      errors: imported.errors
    });
  } catch (err) {
    console.error("Error importing PIM servers from Excel:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while importing PIM servers from Excel.",
      error: err
    });
  }
}; 