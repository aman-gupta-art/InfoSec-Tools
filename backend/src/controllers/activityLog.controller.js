const db = require('../models');
const ActivityLog = db.activityLogs;
const User = db.users;
const Op = db.Sequelize.Op;
const XLSX = require('xlsx');

// Get paginated activity logs with filtering options
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      userId, 
      action,
      entityType,
      startDate,
      endDate
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // Build filter conditions
    let condition = {};
    
    if (userId) condition.userId = userId;
    if (action) condition.action = { [Op.iLike]: `%${action}%` };
    if (entityType) condition.entityType = entityType;
    
    // Date range filter
    if (startDate || endDate) {
      condition.timestamp = {};
      
      if (startDate) {
        condition.timestamp[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        // Add one day to include the entire end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        condition.timestamp[Op.lt] = nextDay;
      }
    }
    
    // Find activity logs with pagination and include user data
    const { count, rows } = await ActivityLog.findAndCountAll({
      where: condition,
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        }
      ],
      limit,
      offset,
      order: [['timestamp', 'DESC']]
    });
    
    // Transform the data to include username directly in the log objects
    const transformedLogs = rows.map(log => {
      const plainLog = log.get({ plain: true });
      return {
        ...plainLog,
        username: plainLog.user ? plainLog.user.username : 'System',
        user: undefined // Remove the nested user object
      };
    });
    
    res.send({
      totalItems: count,
      logs: transformedLogs,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving activity logs."
    });
  }
};

// Get log entry by ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const log = await ActivityLog.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        }
      ]
    });
    
    if (!log) {
      return res.status(404).send({
        message: `Activity log with id ${id} not found.`
      });
    }
    
    res.send(log);
  } catch (error) {
    res.status(500).send({
      message: "Error retrieving activity log with id=" + req.params.id
    });
  }
};

// Get activity statistics for dashboard (counts by action type, recent activity)
exports.getStatistics = async (req, res) => {
  try {
    // Get counts by action type
    const actionCounts = await ActivityLog.findAll({
      attributes: ['action', [db.sequelize.fn('COUNT', 'id'), 'count']],
      group: ['action'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      raw: true
    });
    
    // Get recent activity (last 10 actions)
    const recentActivity = await ActivityLog.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: 10
    });
    
    // Get activity count by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityByDay = await ActivityLog.findAll({
      attributes: [
        [db.sequelize.fn('date_trunc', 'day', db.sequelize.col('timestamp')), 'day'],
        [db.sequelize.fn('COUNT', 'id'), 'count']
      ],
      where: {
        timestamp: {
          [Op.gte]: thirtyDaysAgo
        }
      },
      group: [db.sequelize.fn('date_trunc', 'day', db.sequelize.col('timestamp'))],
      order: [[db.sequelize.fn('date_trunc', 'day', db.sequelize.col('timestamp')), 'ASC']],
      raw: true
    });
    
    res.send({
      actionCounts,
      recentActivity,
      activityByDay
    });
  } catch (error) {
    res.status(500).send({
      message: "Error retrieving activity statistics: " + error.message
    });
  }
};

// Export logs to Excel
exports.exportLogs = async (req, res) => {
  try {
    const { 
      userId, 
      action,
      entityType,
      startDate,
      endDate
    } = req.query;
    
    // Build filter conditions
    let condition = {};
    
    if (userId) condition.userId = userId;
    if (action) condition.action = { [Op.iLike]: `%${action}%` };
    
    // Date range filter
    if (startDate || endDate) {
      condition.timestamp = {};
      
      if (startDate) {
        condition.timestamp[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        // Add one day to include the entire end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        condition.timestamp[Op.lt] = nextDay;
      }
    }
    
    // Get all logs matching the condition
    const logs = await ActivityLog.findAll({
      where: condition,
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        }
      ],
      order: [['timestamp', 'DESC']]
    });
    
    // Transform logs for Excel export
    const exportData = logs.map(log => {
      const plainLog = log.get({ plain: true });
      return {
        ID: plainLog.id,
        Timestamp: new Date(plainLog.timestamp || plainLog.createdAt).toLocaleString(),
        User: plainLog.user ? plainLog.user.username : 'System',
        Action: plainLog.action,
        Details: plainLog.description
      };
    });
    
    // Create a workbook
    const wb = XLSX.utils.book_new();
    
    // Convert logs to worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { width: 8 },   // ID
      { width: 20 },  // Timestamp
      { width: 15 },  // User
      { width: 15 },  // Action
      { width: 50 }   // Details
    ];
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'EXPORT',
      description: `Exported ${logs.length} audit logs`
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs_export.xlsx');
    
    // Generate buffer and send
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  } catch (error) {
    res.status(500).send({
      message: "Error exporting logs: " + error.message
    });
  }
};

// Clear all logs (admin only)
exports.clearAll = async (req, res) => {
  try {
    // Count logs before deletion for reporting
    const count = await ActivityLog.count();
    
    if (count === 0) {
      return res.status(400).send({
        message: "No logs to clear."
      });
    }
    
    // Create a record of the clearing action before deleting
    const clearLog = {
      userId: req.userId,
      action: 'CLEAR_LOGS',
      description: `Cleared ${count} audit logs`
    };
    
    // Delete all logs except the current action
    await ActivityLog.destroy({ where: {}, truncate: true });
    
    // Add the clearing log after truncation
    await ActivityLog.create(clearLog);
    
    res.send({
      message: `Successfully cleared ${count} audit logs`,
      count
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while clearing logs."
    });
  }
}; 