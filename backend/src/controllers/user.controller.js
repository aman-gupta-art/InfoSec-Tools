const db = require('../models');
const bcrypt = require('bcryptjs');
const User = db.users;
const ActivityLog = db.activityLogs;
const Op = db.Sequelize.Op;

// Get all users with pagination, sorting, and search (admin only)
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      search = '', 
      sortBy = 'username', 
      sortOrder = 'asc' 
    } = req.query;
    
    // Parse pagination parameters
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // Build search condition
    let condition = {};
    if (search) {
      condition = {
        [Op.or]: [
          { username: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { role: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }
    
    // Validate sort field
    const validSortFields = ['id', 'username', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'username';
    
    // Validate sort order
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    // Find users with pagination, search, and sorting
    const { count, rows } = await User.findAndCountAll({
      where: condition,
      attributes: { exclude: ['password'] },
      order: [[orderBy, order]],
      limit,
      offset
    });
    
    res.status(200).send({
      totalItems: count,
      users: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      sortBy: orderBy,
      sortOrder: order.toLowerCase()
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving users."
    });
  }
};

// Get user by ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).send({
        message: `User with id ${id} not found.`
      });
    }
    
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({
      message: "Error retrieving User with id=" + req.params.id
    });
  }
};

// Update user details
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get the user before update to compare changes
    const userBeforeUpdate = await User.findByPk(id);
    
    if (!userBeforeUpdate) {
      return res.status(404).send({
        message: `User with id ${id} not found.`
      });
    }
    
    // Create update data object without password initially
    const { password, ...otherData } = req.body;
    let updateData = { ...otherData };
    
    // Handle password update separately if provided
    if (password) {
      updateData.password = bcrypt.hashSync(password, 8);
    }
    
    try {
      // Perform the update
      const [num] = await User.update(updateData, {
        where: { id }
      });
      
      if (num === 1) {
        // Get the updated user to compare changes
        const updatedUser = await User.findByPk(id);
        
        // Determine what fields were changed
        const changedFields = [];
        
        // Compare fields excluding password
        Object.keys(otherData).forEach(key => {
          // Convert to string for consistent comparison
          const oldValue = String(userBeforeUpdate[key] || '');
          const newValue = String(otherData[key] || '');
          
          if (oldValue !== newValue) {
            // For role changes, make it very clear what changed
            if (key === 'role') {
              changedFields.push(`Role: "${oldValue}" -> "${newValue}"`);
            } else {
              changedFields.push(`${key}: "${oldValue}" -> "${newValue}"`);
            }
          }
        });
        
        // Add note about password if it was changed
        if (password) {
          changedFields.push('Password was updated');
        }
        
        // Format the changes in a more readable way
        const changesDescription = changedFields.length > 0 
          ? `Changed fields for user "${userBeforeUpdate.username}" | ${changedFields.join(' ')}`
          : `No fields were changed for user "${userBeforeUpdate.username}"`;
        
        // Log activity with detailed changes
        await ActivityLog.create({
          userId: req.userId,
          action: 'UPDATE',
          description: changesDescription
        });
        
        res.status(200).send({
          message: "User was updated successfully."
        });
      } else {
        res.status(404).send({
          message: `Cannot update User with id=${id}. Maybe User was not found!`
        });
      }
    } catch (updateError) {
      console.error('Error during update operation:', updateError);
      res.status(500).send({
        message: `Error updating User with id=${id}`
      });
    }
  } catch (error) {
    console.error('Error in update process:', error);
    res.status(500).send({
      message: `Error updating User with id=${id}`
    });
  }
};

// Delete user
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if user exists
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).send({
        message: `User with id ${id} not found.`
      });
    }
    
    // Don't allow deleting yourself
    if (parseInt(id) === parseInt(req.userId)) {
      return res.status(400).send({
        message: "You cannot delete your own account."
      });
    }
    
    // Gather user details for the log before deletion
    const userDetails = {
      id: user.id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      createdAt: user.createdAt
    };
    
    // Delete the user
    await user.destroy();
    
    // Create a detailed description
    const detailedDescription = `Deleted user "${userDetails.username}" | Full Name: "${userDetails.firstName} ${userDetails.lastName}" Role: "${userDetails.role}" Account created: "${new Date(userDetails.createdAt).toLocaleString()}"`;
    
    // Log activity with detailed information - removed entityType, entityId, and ipAddress
    await ActivityLog.create({
      userId: req.userId,
      action: 'DELETE',
      description: detailedDescription
    });
    
    res.send({
      message: "User was deleted successfully!"
    });
  } catch (error) {
    res.status(500).send({
      message: "Could not delete User with id=" + req.params.id
    });
  }
};

// Reset user password (admin only)
exports.resetPassword = async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!req.body.newPassword) {
      return res.status(400).send({
        message: "New password is required!"
      });
    }
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).send({
        message: `User with id ${id} not found.`
      });
    }
    
    // Update password
    user.password = bcrypt.hashSync(req.body.newPassword, 8);
    await user.save();
    
    // Create a detailed description for audit log
    const detailedDescription = `Password reset for user "${user.username}" | Action performed by admin user ID: "${req.userId}" Timestamp: "${new Date().toLocaleString()}"`;
    
    // Log activity with detailed information - removed entityType, entityId, and ipAddress
    await ActivityLog.create({
      userId: req.userId,
      action: 'RESET_PASSWORD',
      description: detailedDescription
    });
    
    res.send({
      message: "Password was reset successfully!"
    });
  } catch (error) {
    res.status(500).send({
      message: "Error resetting password for user with id=" + req.params.id
    });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).send({
        message: "User not found."
      });
    }
    
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({
      message: error.message
    });
  }
}; 