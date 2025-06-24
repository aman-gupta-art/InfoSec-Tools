const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.users;

const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).send({
      message: 'No token provided!'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'infosec_tools_secret_key');
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).send({
      message: 'Unauthorized!'
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).send({
        message: 'User not found!'
      });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).send({
        message: 'Require Admin Role!'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).send({
      message: 'Unable to validate user role!'
    });
  }
};

const authMiddleware = {
  verifyToken,
  isAdmin
};

module.exports = authMiddleware; 