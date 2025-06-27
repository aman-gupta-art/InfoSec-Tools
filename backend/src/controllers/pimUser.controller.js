const db = require('../models');
const PimUser = db.pimUsers;
const { Op } = require('sequelize');
const XLSX = require('xlsx');

// Create and Save a new PIM User
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.psid || !req.body.fullName) {
      return res.status(400).send({
        message: "PSID and Full Name cannot be empty!"
      });
    }

    // Create a PIM User object
    const pimUser = {
      psid: req.body.psid,
      fullName: req.body.fullName,
      mobileNo: req.body.mobileNo,
      email: req.body.email,
      reportingManager: req.body.reportingManager,
      hod: req.body.hod,
      department: req.body.department,
      dateOfCreation: req.body.dateOfCreation || new Date()
    };

    // Save PIM User in the database
    const data = await PimUser.create(pimUser);
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the PIM User."
    });
  }
};

// Retrieve all PIM Users with pagination, sorting, and filtering
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      search = '',
      sortBy = 'psid',
      order = 'asc',
      department,
      reportingManager,
      hod,
      includeAll
    } = req.query;
    
    // Calculate pagination parameters
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // Create search condition
    const condition = search
      ? {
          [Op.or]: [
            { psid: { [Op.like]: `%${search}%` } },
            { fullName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { department: { [Op.like]: `%${search}%` } }
          ]
        }
      : {};
    
    // Add filter conditions if provided
    if (department) {
      condition.department = department;
    }
    
    if (reportingManager) {
      condition.reportingManager = reportingManager;
    }
    
    if (hod) {
      condition.hod = hod;
    }
    
    // Create options object for query
    const options = {
      where: condition,
      order: [[sortBy, order.toUpperCase()]]
    };
    
    // Only add pagination if includeAll is not specified
    if (!includeAll) {
      options.limit = limit;
      options.offset = offset;
    }
    
    // Query the database
    const data = await PimUser.findAndCountAll(options);
    
    // Format the response
    const response = {
      totalItems: data.count,
      pimUsers: data.rows,
      totalPages: Math.ceil(data.count / limit),
      currentPage: parseInt(page)
    };
    
    res.send(response);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving PIM users."
    });
  }
};

// Find a single PIM User with an id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const data = await PimUser.findByPk(id);
    
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `PIM User with id ${id} not found.`
      });
    }
  } catch (err) {
    res.status(500).send({
      message: `Error retrieving PIM User with id ${req.params.id}`
    });
  }
};

// Update a PIM User by the id
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [num] = await PimUser.update(req.body, {
      where: { id: id }
    });
    
    if (num === 1) {
      res.send({
        message: "PIM User was updated successfully."
      });
    } else {
      res.status(404).send({
        message: `Cannot update PIM User with id=${id}. Maybe PIM User was not found or req.body is empty!`
      });
    }
  } catch (err) {
    res.status(500).send({
      message: `Error updating PIM User with id=${req.params.id}`
    });
  }
};

// Delete a PIM User with the specified id
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const num = await PimUser.destroy({
      where: { id: id }
    });
    
    if (num === 1) {
      res.send({
        message: "PIM User was deleted successfully!"
      });
    } else {
      res.status(404).send({
        message: `Cannot delete PIM User with id=${id}. Maybe PIM User was not found!`
      });
    }
  } catch (err) {
    res.status(500).send({
      message: `Could not delete PIM User with id=${req.params.id}`
    });
  }
};

// Delete all PIM Users from the database
exports.deleteAll = async (req, res) => {
  try {
    const nums = await PimUser.destroy({
      where: {},
      truncate: false
    });
    
    res.send({ 
      message: `${nums} PIM Users were deleted successfully!` 
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while removing all PIM Users."
    });
  }
};

// Get distinct values for filters
exports.getFilterOptions = async (req, res) => {
  try {
    const { fields } = req.query;
    
    // Parse fields array if provided as a string
    const requestedFields = fields ? 
      (typeof fields === 'string' ? [fields] : fields) : 
      ['department', 'reportingManager', 'hod'];

    // Initialize response object
    const distinctValues = {};
    
    // Query distinct values for each requested field
    await Promise.all(
      requestedFields.map(async (field) => {
        try {
          if (field === 'department') {
            const values = await PimUser.findAll({
              attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('department')), 'value']],
              where: {
                department: {
                  [Op.ne]: null
                }
              }
            });
            distinctValues.departments = values.map(item => item.getDataValue('value'));
          } else if (field === 'reportingManager') {
            const values = await PimUser.findAll({
              attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('reportingManager')), 'value']],
              where: {
                reportingManager: {
                  [Op.ne]: null
                }
              }
            });
            distinctValues.reportingManagers = values.map(item => item.getDataValue('value'));
          } else if (field === 'hod') {
            const values = await PimUser.findAll({
              attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('hod')), 'value']],
              where: {
                hod: {
                  [Op.ne]: null
                }
              }
            });
            distinctValues.hods = values.map(item => item.getDataValue('value'));
          }
        } catch (error) {
          console.error(`Error getting distinct values for ${field}:`, error);
        }
      })
    );
    
    res.send({ distinctValues });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving filter options."
    });
  }
};

// Import PIM Users from Excel
exports.import = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "Please upload an Excel file!" });
    }
    
    console.log('Processing PIM user import file...');
    
    // Read the Excel file with proper date handling
    const workbook = XLSX.read(req.file.buffer, { 
      type: 'buffer',
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    // Validate data
    if (!data || data.length === 0) {
      return res.status(400).send({
        message: "Excel file is empty or invalid!"
      });
    }
    
    console.log(`Found ${data.length} PIM user records to import`);
    
    // Map Excel data to PIM User model
    const pimUsers = data.map(row => {
      // Process dateOfCreation field properly
      let dateOfCreation = null;
      
      if (row['Date of Creation'] || row.dateOfCreation) {
        const dateValue = row['Date of Creation'] || row.dateOfCreation;
        
        // Handle different date formats
        if (dateValue instanceof Date) {
          // If it's already a JavaScript Date object (from XLSX parser)
          dateOfCreation = dateValue;
        } else if (typeof dateValue === 'number') {
          // If it's an Excel serial number
          dateOfCreation = XLSX.SSF.parse_date_code(dateValue);
        } else if (typeof dateValue === 'string') {
          // If it's a string, try to parse it
          const parsedDate = new Date(dateValue);
          dateOfCreation = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        } else {
          // Default to current date if format is unrecognized
          dateOfCreation = new Date();
        }
      } else {
        // Default to current date if missing
        dateOfCreation = new Date();
      }
      
      return {
        psid: row.PSID || row.psid,
        fullName: row['Full Name'] || row.fullName,
        mobileNo: row['Mobile No'] || row.mobileNo,
        email: row.Email || row.email,
        reportingManager: row['Reporting Manager'] || row.reportingManager,
        hod: row.HOD || row.hod,
        department: row.Department || row.department,
        dateOfCreation: dateOfCreation
      };
    });
    
    // Validate required fields
    const invalidRows = pimUsers.filter(user => !user.psid || !user.fullName);
    if (invalidRows.length > 0) {
      return res.status(400).send({
        message: "Some rows are missing required fields (PSID or Full Name)."
      });
    }
    
    // Save to database
    const result = await PimUser.bulkCreate(pimUsers);
    
    console.log(`Successfully imported ${result.length} PIM users`);
    
    res.send({
      message: `${result.length} PIM Users were successfully imported.`
    });
  } catch (err) {
    console.error('Error importing PIM users:', err);
    res.status(500).send({
      message: err.message || "Some error occurred while importing PIM Users."
    });
  }
};

// Export PIM Users to Excel
exports.export = async (req, res) => {
  try {
    // Extract filter parameters from request query
    const { 
      search = '',
      department,
      reportingManager,
      hod,
    } = req.query;
    
    // Create search condition
    const condition = search
      ? {
          [Op.or]: [
            { psid: { [Op.like]: `%${search}%` } },
            { fullName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { department: { [Op.like]: `%${search}%` } }
          ]
        }
      : {};
    
    // Add filter conditions if provided
    if (department) {
      condition.department = department;
    }
    
    if (reportingManager) {
      condition.reportingManager = reportingManager;
    }
    
    if (hod) {
      condition.hod = hod;
    }
    
    // Fetch PIM Users based on filters
    const pimUsers = await PimUser.findAll({
      where: condition,
      order: [['psid', 'ASC']]
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(
      pimUsers.map(user => {
        const userObj = user.toJSON();
        return {
          'PSID': userObj.psid,
          'Full Name': userObj.fullName,
          'Mobile No': userObj.mobileNo,
          'Email': userObj.email,
          'Reporting Manager': userObj.reportingManager,
          'HOD': userObj.hod,
          'Department': userObj.department,
          'Date of Creation': userObj.dateOfCreation ? new Date(userObj.dateOfCreation).toLocaleDateString() : ''
        };
      })
    );
    
    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PIM Users");
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers and send file
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=pim-users-export.xlsx',
    });
    
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while exporting PIM Users."
    });
  }
};

// Export empty template for PIM User import
exports.getImportTemplate = (req, res) => {
  try {
    console.log('Generating PIM User template...');
    
    // Create sample data
    const sampleData = [
      {
        'PSID': 'PS001',
        'Full Name': 'John Doe',
        'Mobile No': '1234567890',
        'Email': 'john.doe@example.com',
        'Reporting Manager': 'Jane Smith',
        'HOD': 'Robert Johnson',
        'Department': 'IT',
        'Date of Creation': new Date().toLocaleDateString()
      }
    ];
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PIM Users Template");
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers and send file
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=pim-users-template.xlsx',
      'Content-Length': excelBuffer.length
    });
    
    console.log('Template generated successfully, sending response...');
    
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).send({
      message: err.message || "Some error occurred while generating the template."
    });
  }
}; 