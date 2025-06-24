const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const User = db.users;
const ActivityLog = db.activityLogs;

// Register new user (admin only)
exports.register = async (req, res) => {
  try {
    // Check if username exists
    const existingUser = await User.findOne({
      where: {
        username: req.body.username
      }
    });

    if (existingUser) {
      return res.status(400).send({ message: "Username is already in use!" });
    }

    // Create new user
    const user = await User.create({
      username: req.body.username,
      password: bcrypt.hashSync(req.body.password, 8),
      role: req.body.role || 'readonly',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      uiTheme: req.body.uiTheme || 'light'
    });

    // Create a detailed description for audit log
    const detailedDescription = `Created new user "${user.username}" | Full Name: "${user.firstName || ''} ${user.lastName || ''}" Role: "${user.role}"`;

    // Log activity with detailed information
    await ActivityLog.create({
      userId: req.userId,
      action: 'CREATE',
      description: detailedDescription,
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip
    });

    res.send({ message: "User was registered successfully!" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// User login
exports.login = async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        username: req.body.username
      }
    });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!"
      });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'infosec_tools_secret_key',
      {
        expiresIn: process.env.JWT_EXPIRATION || 86400 // 24 hours
      }
    );

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: 'LOGIN',
      description: `User login: ${user.username}`,
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip
    });

    // Return user info and token
    res.status(200).send({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      uiTheme: user.uiTheme,
      accessToken: token
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Check if old password is correct
    const passwordIsValid = bcrypt.compareSync(
      req.body.oldPassword,
      user.password
    );

    if (!passwordIsValid) {
      return res.status(401).send({ message: "Current password is incorrect!" });
    }

    // Update password
    user.password = bcrypt.hashSync(req.body.newPassword, 8);
    await user.save();

    // Log activity
    await ActivityLog.create({
      userId: req.userId,
      action: 'PASSWORD_CHANGE',
      description: `Password changed for user: ${user.username}`,
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip
    });

    res.send({ message: "Password changed successfully!" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Update user theme preference
exports.updateTheme = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    user.uiTheme = req.body.theme;
    await user.save();

    res.send({ 
      message: "Theme preference updated!",
      theme: user.uiTheme
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
}; 