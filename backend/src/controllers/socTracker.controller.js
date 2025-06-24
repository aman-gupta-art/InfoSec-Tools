const db = require('../models');
const SOCTracker = db.socTracker;
const ActivityLog = db.activityLogs;
const Op = db.Sequelize.Op;

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
    const newItem = await SOCTracker.create(req.body);
    
    // Determine if it's a parent tracker or an item
    const itemType = req.body.parentId ? "tracker item" : "tracker";
    
    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'CREATE',
      description: `Created new ${itemType}: "${req.body.name}"`,
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
    
    const [num] = await SOCTracker.update(req.body, {
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