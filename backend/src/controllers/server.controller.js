const db = require('../models');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Server = db.servers;
const ActivityLog = db.activityLogs;
const Op = db.Sequelize.Op;

// Seed database with mock servers
exports.seedServers = async (req, res) => {
  try {
    console.log("Seeding database with sample servers...");
    // Check if servers already exist
    const count = await Server.count();
    
    if (count > 0) {
      console.log(`Database already has ${count} servers, skipping seed operation`);
      return res.status(200).send({
        message: `Database already has ${count} servers. Seed operation skipped.`,
        serverCount: count
      });
    }

    // Mock data for seeding
    const mockServers = [
      {
        ip: '192.168.1.10',
        hostname: 'app-server-01',
        operatingSystem: 'Ubuntu 20.04 LTS',
        serverRole: 'Application Server',
        serverType: 'Virtual Machine',
        applicationName: 'CRM System',
        applicationSPOC: 'John Smith',
        applicationOwner: 'Sales Department',
        platform: 'VMware',
        location: 'US East',
        manufacturer: 'Dell',
        ram: '32GB',
        cpu: 'Intel Xeon 8-core',
        status: 'live'
      },
      {
        ip: '192.168.1.11',
        hostname: 'db-server-01',
        operatingSystem: 'Red Hat Enterprise Linux 8',
        serverRole: 'Database Server',
        serverType: 'Physical',
        applicationName: 'Customer Database',
        applicationSPOC: 'Jane Doe',
        applicationOwner: 'IT Department',
        platform: 'Bare Metal',
        location: 'US West',
        manufacturer: 'HP',
        ram: '64GB',
        cpu: 'AMD EPYC 16-core',
        status: 'live'
      },
      {
        ip: '192.168.1.12',
        hostname: 'web-server-01',
        operatingSystem: 'Windows Server 2019',
        serverRole: 'Web Server',
        serverType: 'Virtual Machine',
        applicationName: 'Corporate Website',
        applicationSPOC: 'Alex Johnson',
        applicationOwner: 'Marketing Department',
        platform: 'Hyper-V',
        location: 'EU Central',
        manufacturer: 'Cisco',
        ram: '16GB',
        cpu: 'Intel Xeon 4-core',
        status: 'shutdown'
      },
      {
        ip: '192.168.1.13',
        hostname: 'mail-server-01',
        operatingSystem: 'Ubuntu 22.04 LTS',
        serverRole: 'Mail Server',
        serverType: 'Virtual Machine',
        applicationName: 'Corporate Email',
        applicationSPOC: 'Maria Garcia',
        applicationOwner: 'IT Department',
        platform: 'AWS EC2',
        location: 'US East',
        manufacturer: 'Amazon',
        ram: '8GB',
        cpu: 'Intel Xeon 2-core',
        status: 'live'
      },
      {
        ip: '192.168.1.14',
        hostname: 'test-server-01',
        operatingSystem: 'CentOS 7',
        serverRole: 'Test Server',
        serverType: 'Virtual Machine',
        applicationName: 'QA Testing',
        applicationSPOC: 'Robert Lee',
        applicationOwner: 'QA Department',
        platform: 'VMware',
        location: 'US West',
        manufacturer: 'Dell',
        ram: '16GB',
        cpu: 'Intel Xeon 4-core',
        status: 'new'
      }
    ];

    console.log(`Creating ${mockServers.length} sample servers...`);
    // Insert all servers at once
    const createdServers = await Server.bulkCreate(mockServers);

    // Log activity
    if (req.userId) {
      await ActivityLog.create({
        userId: req.userId,
        action: 'SEED',
        description: `Seeded database with ${createdServers.length} servers`,
        entityType: 'server',
        ipAddress: req.ip
      });
    }

    console.log(`Successfully seeded database with ${createdServers.length} servers`);
    res.send({
      message: `Successfully seeded database with ${createdServers.length} servers`,
      servers: createdServers
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).send({
      message: error.message || "Some error occurred while seeding the database."
    });
  }
};

// Create and Save a new Server
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.ip || !req.body.hostname || !req.body.operatingSystem) {
      return res.status(400).send({
        message: "IP, hostname, and operating system are required fields!"
      });
    }

    // Create a Server
    const server = await Server.create({
      ip: req.body.ip,
      hostname: req.body.hostname,
      operatingSystem: req.body.operatingSystem,
      serverRole: req.body.serverRole,
      serverType: req.body.serverType,
      applicationName: req.body.applicationName,
      applicationSPOC: req.body.applicationSPOC,
      applicationOwner: req.body.applicationOwner,
      platform: req.body.platform,
      location: req.body.location,
      manufacturer: req.body.manufacturer,
      ram: req.body.ram,
      cpu: req.body.cpu,
      status: req.body.status || 'new'
    });

    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'CREATE',
      description: `Created server: ${server.hostname} (${server.ip})`,
      entityType: 'server',
      entityId: server.id,
      ipAddress: req.ip
    });

    res.send(server);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while creating the Server."
    });
  }
};

// Retrieve all Servers with pagination and filtering
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, search, ip, hostname, operatingSystem, status,
      applicationName, applicationOwner, location, platform, sort = 'updatedAt', order = 'DESC' } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // Build the filter conditions
    let condition = {};
    
    if (search) {
      condition = {
        [Op.or]: [
          { ip: { [Op.iLike]: `%${search}%` } },
          { hostname: { [Op.iLike]: `%${search}%` } },
          { operatingSystem: { [Op.iLike]: `%${search}%` } },
          { applicationName: { [Op.iLike]: `%${search}%` } },
          { applicationOwner: { [Op.iLike]: `%${search}%` } },
          { location: { [Op.iLike]: `%${search}%` } }
        ]
      };
    } else {
      // Apply individual filters if search is not provided
      if (ip) condition.ip = { [Op.iLike]: `%${ip}%` };
      if (hostname) condition.hostname = { [Op.iLike]: `%${hostname}%` };
      if (operatingSystem) condition.operatingSystem = { [Op.iLike]: `%${operatingSystem}%` };
      if (applicationName) condition.applicationName = { [Op.iLike]: `%${applicationName}%` };
      if (applicationOwner) condition.applicationOwner = { [Op.iLike]: `%${applicationOwner}%` };
      if (location) condition.location = { [Op.iLike]: `%${location}%` };
      if (platform) condition.platform = { [Op.iLike]: `%${platform}%` };
      if (status) condition.status = status;
    }

    // Determine the order direction
    const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Validate sort field exists in model and handle special cases
    let sortField = 'updatedAt'; // Default sort field
    
    // List of valid sort fields
    const validFields = [
      'id', 'hostname', 'ip', 'operatingSystem', 'serverRole', 'serverType', 
      'applicationName', 'applicationSPOC', 'applicationOwner', 'platform', 
      'location', 'manufacturer', 'ram', 'cpu', 'status', 'createdAt', 'updatedAt'
    ];
    
    // Check if the requested sort field is valid
    if (validFields.includes(sort)) {
      sortField = sort;
    }
    
    console.log(`Sorting by ${sortField} in ${orderDirection} order`);

    // Find servers with pagination and sorting
    const { count, rows } = await Server.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: [[sortField, orderDirection]]
    });

    res.send({
      totalItems: count,
      servers: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      sort: sortField,
      order: orderDirection.toLowerCase()
    });
  } catch (error) {
    console.error('Error in findAll:', error);
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving servers."
    });
  }
};

// Find a single Server with an id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    const server = await Server.findByPk(id);
    
    if (!server) {
      return res.status(404).send({
        message: `Server with id ${id} not found.`
      });
    }
    
    res.send(server);
  } catch (error) {
    res.status(500).send({
      message: "Error retrieving Server with id=" + req.params.id
    });
  }
};

// Update a Server by the id
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get the server before update to log changes
    const serverBeforeUpdate = await Server.findByPk(id);
    
    if (!serverBeforeUpdate) {
      return res.status(404).send({
        message: `Server with id=${id} not found.`
      });
    }
    
    // Create a sanitized copy of req.body without id, createdAt, and updatedAt
    const sanitizedData = { ...req.body };
    delete sanitizedData.id;
    delete sanitizedData.createdAt;
    delete sanitizedData.updatedAt;
    
    // Validate status field if present
    if (sanitizedData.status && !['live', 'shutdown', 'new'].includes(sanitizedData.status)) {
      return res.status(400).send({
        message: "Invalid status value. Must be one of: 'live', 'shutdown', 'new'"
      });
    }
    
    const [num] = await Server.update(sanitizedData, {
      where: { id }
    });
    
    if (num === 1) {
      // Get the updated server to compare changes
      const updatedServer = await Server.findByPk(id);
      
      // Determine what fields were changed
      const changedFields = [];
      Object.keys(sanitizedData).forEach(key => {
        // Skip ipAddress field as it's just a different name for ip in the frontend
        if (key === 'ipAddress') return;
        
        if (serverBeforeUpdate[key] !== sanitizedData[key]) {
          changedFields.push(`${key}: "${serverBeforeUpdate[key] || 'empty'}" -> "${sanitizedData[key] || 'empty'}"`);
        }
      });
      
      // Format the changes in a more readable way
      const changesDescription = changedFields.length > 0 
        ? `\nChanged fields:\n${changedFields.join('\n')}`
        : 'No fields were changed';
      
      // Log activity with detailed changes
      await ActivityLog.create({
        userId: req.userId,
        action: 'UPDATE',
        description: `Updated server: ${serverBeforeUpdate.hostname} (${serverBeforeUpdate.ip})`,
        entityType: 'server',
        entityId: id,
        ipAddress: req.ip
      });
      
      res.send({
        message: "Server was updated successfully."
      });
    } else {
      res.send({
        message: `Cannot update Server with id=${id}. Maybe Server was not found or req.body is empty!`
      });
    }
  } catch (error) {
    console.error('Error in server update:', error);
    res.status(500).send({
      message: "Error updating Server with id=" + req.params.id,
      error: error.message
    });
  }
};

// Delete a Server with the specified id
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const server = await Server.findByPk(id);
    
    if (!server) {
      return res.status(404).send({
        message: `Server with id ${id} not found.`
      });
    }
    
    // Gather server details for the log before deletion
    const serverDetails = {
      hostname: server.hostname,
      ip: server.ip
    };
    
    await server.destroy();
    
    // Log activity with detailed information
    await ActivityLog.create({
      userId: req.userId,
      action: 'DELETE',
      description: `Deleted server: ${serverDetails.hostname} (${serverDetails.ip})`,
      entityType: 'server',
      entityId: id,
      ipAddress: req.ip
    });
    
    res.send({
      message: "Server was deleted successfully!"
    });
  } catch (error) {
    res.status(500).send({
      message: "Could not delete Server with id=" + req.params.id
    });
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

exports.upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Import servers from Excel file
exports.importServers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        message: "Please upload an Excel file!"
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse dates properly when reading from Excel
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
      cellDates: true
    });

    if (data.length === 0) {
      return res.status(400).send({
        message: "Excel file is empty or has no valid data!"
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each row and create server
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.ip || !row.hostname || !row.operatingSystem) {
          results.failed++;
          results.errors.push({
            row: JSON.stringify(row),
            error: "Missing required fields (IP, hostname, or operatingSystem)"
          });
          continue;
        }

        // Handle any date fields to ensure they're valid
        // For server model, we don't have explicit date fields other than createdAt/updatedAt
        // which are handled automatically by Sequelize

        // Create server with validated data
        const server = await Server.create({
          ip: row.ip,
          hostname: row.hostname,
          operatingSystem: row.operatingSystem,
          serverRole: row.serverRole || null,
          serverType: row.serverType || null,
          applicationName: row.applicationName || null,
          applicationSPOC: row.applicationSPOC || null,
          applicationOwner: row.applicationOwner || null,
          platform: row.platform || null,
          location: row.location || null,
          manufacturer: row.manufacturer || null,
          ram: row.ram || null,
          cpu: row.cpu || null,
          status: row.status ? row.status.toLowerCase() : 'new'
        });

        results.success++;
      } catch (err) {
        console.error("Error importing row:", err);
        results.failed++;
        results.errors.push({
          row: JSON.stringify(row),
          error: err.message
        });
      }
    }

    // Log activity - single summary log for all imported servers
    await ActivityLog.create({
      userId: req.userId,
      action: 'IMPORT',
      description: `Imported servers: ${results.success} successful, ${results.failed} failed`,
      entityType: 'server',
      ipAddress: req.ip
    });

    // Delete the file after processing
    fs.unlinkSync(req.file.path);

    res.send(results);
  } catch (error) {
    console.error("Server import error:", error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).send({
      message: "Error importing servers: " + error.message
    });
  }
};

// Get template Excel file for server import
exports.getImportTemplate = (req, res) => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Define template headers
    const headers = [
      'ip', 'hostname', 'operatingSystem', 'serverRole', 'serverType', 
      'applicationName', 'applicationSPOC', 'applicationOwner', 'platform',
      'location', 'manufacturer', 'ram', 'cpu', 'status'
    ];
    
    // Sample data
    const sampleData = [
      {
        ip: '192.168.1.100',
        hostname: 'srv-app01',
        operatingSystem: 'Windows Server 2019',
        serverRole: 'Application Server',
        serverType: 'Virtual',
        applicationName: 'CRM',
        applicationSPOC: 'John Doe',
        applicationOwner: 'Sales Department',
        platform: 'VMware',
        location: 'NYC Datacenter',
        manufacturer: 'Dell',
        ram: '16GB',
        cpu: '4 vCPU',
        status: 'live'
      }
    ];
    
    // Create worksheet with headers and sample data
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Add comments with instructions - using proper XLSX.js API
    ws['!cols'] = [
      { width: 15 }, // ip
      { width: 15 }, // hostname
      { width: 20 }, // operatingSystem
      { width: 15 }, // serverRole
      { width: 15 }, // serverType
      { width: 20 }, // applicationName
      { width: 20 }, // applicationSPOC
      { width: 20 }, // applicationOwner
      { width: 15 }, // platform
      { width: 15 }, // location
      { width: 15 }, // manufacturer
      { width: 10 }, // ram
      { width: 10 }, // cpu
      { width: 10 }  // status
    ];
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Server Template');
    
    // Don't try to add comments to cells as this is causing the error
    // We'll add a note in the first row instead
    const commentRow = [];
    for (let i = 0; i < headers.length; i++) {
      commentRow[i] = '';
    }
    commentRow[headers.length - 1] = 'Status must be one of: live, shutdown, new (lowercase only)';
    
    // Add at the end of the sheet
    XLSX.utils.sheet_add_json(ws, [commentRow], {skipHeader: true, origin: -1});
    
    // Set the response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=server_import_template.xlsx');
    
    // Write the workbook to the response
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  } catch (error) {
    console.error("Template generation error:", error);
    res.status(500).send({
      message: "Error generating template: " + error.message
    });
  }
};

// Export servers to Excel
exports.exportServers = async (req, res) => {
  try {
    // Get filter parameters
    const { search, ip, hostname, operatingSystem, status,
      applicationName, applicationOwner, location, platform } = req.query;
    
    // Build the filter conditions
    let condition = {};
    
    if (search) {
      condition = {
        [Op.or]: [
          { ip: { [Op.iLike]: `%${search}%` } },
          { hostname: { [Op.iLike]: `%${search}%` } },
          { operatingSystem: { [Op.iLike]: `%${search}%` } },
          { applicationName: { [Op.iLike]: `%${search}%` } },
          { applicationOwner: { [Op.iLike]: `%${search}%` } },
          { location: { [Op.iLike]: `%${search}%` } }
        ]
      };
    } else {
      if (ip) condition.ip = { [Op.iLike]: `%${ip}%` };
      if (hostname) condition.hostname = { [Op.iLike]: `%${hostname}%` };
      if (operatingSystem) condition.operatingSystem = { [Op.iLike]: `%${operatingSystem}%` };
      if (applicationName) condition.applicationName = { [Op.iLike]: `%${applicationName}%` };
      if (applicationOwner) condition.applicationOwner = { [Op.iLike]: `%${applicationOwner}%` };
      if (location) condition.location = { [Op.iLike]: `%${location}%` };
      if (platform) condition.platform = { [Op.iLike]: `%${platform}%` };
      if (status) condition.status = status;
    }

    // Get all servers matching the condition
    const servers = await Server.findAll({
      where: condition,
      order: [['updatedAt', 'DESC']]
    });

    // Create a workbook
    const wb = XLSX.utils.book_new();
    
    // Convert servers to worksheet
    const ws = XLSX.utils.json_to_sheet(servers.map(server => ({
      id: server.id,
      ip: server.ip,
      hostname: server.hostname,
      operatingSystem: server.operatingSystem,
      serverRole: server.serverRole,
      serverType: server.serverType,
      applicationName: server.applicationName,
      applicationSPOC: server.applicationSPOC,
      applicationOwner: server.applicationOwner,
      platform: server.platform,
      location: server.location,
      manufacturer: server.manufacturer,
      ram: server.ram,
      cpu: server.cpu,
      status: server.status,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt
    })));
    
    // Set column widths
    ws['!cols'] = [
      { width: 5 },   // id
      { width: 15 },  // ip
      { width: 20 },  // hostname
      { width: 20 },  // operatingSystem
      { width: 15 },  // serverRole
      { width: 15 },  // serverType
      { width: 20 },  // applicationName
      { width: 20 },  // applicationSPOC
      { width: 20 },  // applicationOwner
      { width: 15 },  // platform
      { width: 15 },  // location
      { width: 15 },  // manufacturer
      { width: 10 },  // ram
      { width: 10 },  // cpu
      { width: 10 },  // status
      { width: 20 },  // createdAt
      { width: 20 }   // updatedAt
    ];
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Servers');
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'EXPORT',
      description: `Exported ${servers.length} servers`,
      entityType: 'server',
      ipAddress: req.ip
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=servers_export.xlsx');
    
    // Generate buffer and send
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  } catch (error) {
    res.status(500).send({
      message: "Error exporting servers: " + error.message
    });
  }
};

// Get server dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Total number of servers
    const totalServers = await Server.count();
    
    // Count by status
    const liveServers = await Server.count({ where: { status: 'live' } });
    const shutdownServers = await Server.count({ where: { status: 'shutdown' } });
    const newServers = await Server.count({ where: { status: 'new' } });
    
    // Group by application owner
    const applicationOwnerStats = await Server.findAll({
      attributes: ['applicationOwner', [db.sequelize.fn('COUNT', 'id'), 'count']],
      where: { applicationOwner: { [Op.not]: null } },
      group: ['applicationOwner'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      raw: true
    });
    
    // Group by location
    const locationStats = await Server.findAll({
      attributes: ['location', [db.sequelize.fn('COUNT', 'id'), 'count']],
      where: { location: { [Op.not]: null } },
      group: ['location'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      raw: true
    });
    
    // Group by application name
    const applicationNameStats = await Server.findAll({
      attributes: ['applicationName', [db.sequelize.fn('COUNT', 'id'), 'count']],
      where: { applicationName: { [Op.not]: null } },
      group: ['applicationName'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      raw: true
    });
    
    // Group by operating system
    const operatingSystemStats = await Server.findAll({
      attributes: ['operatingSystem', [db.sequelize.fn('COUNT', 'id'), 'count']],
      group: ['operatingSystem'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      raw: true
    });
    
    res.send({
      totalServers,
      statusCounts: {
        live: liveServers,
        shutdown: shutdownServers,
        new: newServers
      },
      applicationOwnerStats,
      locationStats,
      applicationNameStats,
      operatingSystemStats
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Error retrieving dashboard statistics."
    });
  }
};

// Clear all servers (admin only)
exports.clearAll = async (req, res) => {
  try {
    // Count servers before deletion for reporting
    const count = await Server.count();
    
    // Delete all servers
    await Server.destroy({ where: {}, truncate: true });
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'CLEAR_ALL',
      description: `Cleared all servers (${count} records)`,
      entityType: 'server',
      ipAddress: req.ip
    });
    
    res.send({
      message: `Successfully cleared ${count} servers from the database`,
      count
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while clearing servers."
    });
  }
};

// Get distinct values for filters
exports.getDistinctValues = async (req, res) => {
  try {
    console.log('Getting distinct values for filters');
    const { fields } = req.query;
    
    // Default fields if not specified
    const fieldsToQuery = fields ? 
      Array.isArray(fields) ? fields : fields.split(',') : 
      ['operatingSystem', 'location', 'applicationOwner', 'status'];
    
    console.log('Fields to query:', fieldsToQuery);
    
    const distinctValues = {};
    
    // Query each field for distinct values - modified to include all values
    for (const field of fieldsToQuery) {
      // Ensure the field exists in the model
      if (Server.rawAttributes[field]) {
        try {
          const results = await Server.findAll({
            attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col(field)), field]],
            order: [[field, 'ASC']]
          });
          
          // Extract values from results and filter out null/undefined, but keep empty strings
          distinctValues[field + 's'] = results
            .map(item => item[field])
            .filter(value => value !== null && value !== undefined)
            .sort();
            
          console.log(`Found ${distinctValues[field + 's'].length} distinct values for ${field}`);
        } catch (fieldError) {
          console.error(`Error getting distinct values for field ${field}:`, fieldError);
          distinctValues[field + 's'] = [];
        }
      } else {
        console.warn(`Field ${field} does not exist in Server model`);
        distinctValues[field + 's'] = [];
      }
    }
    
    // Add standard statuses if status was requested
    if (fieldsToQuery.includes('status')) {
      const standardStatuses = ['live', 'shutdown', 'new'];
      const existingStatuses = distinctValues.statuses || [];
      distinctValues.statuses = [...new Set([...standardStatuses, ...existingStatuses])];
    }
    
    // If no servers exist yet, provide some default options
    if (Object.values(distinctValues).every(arr => arr.length === 0)) {
      // Check if we have any servers at all
      const count = await Server.count();
      
      if (count === 0) {
        console.log('No servers found, adding sample values for filters');
        distinctValues.operatingSystems = ['Windows Server', 'Linux', 'Ubuntu'];
        distinctValues.locations = ['US East', 'US West', 'EU Central'];
        distinctValues.applicationOwners = ['IT Department', 'Sales Department', 'Marketing Department'];
        distinctValues.statuses = ['live', 'shutdown', 'new'];
      }
    }
    
    console.log('Returning distinct values:', distinctValues);
    
    res.send({
      distinctValues
    });
  } catch (error) {
    console.error('Error in getDistinctValues:', error);
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving distinct values."
    });
  }
};