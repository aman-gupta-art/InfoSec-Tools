const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.DB,
  dbConfig.USER,
  dbConfig.PASSWORD,
  {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: dbConfig.dialect,
    pool: dbConfig.pool,
    logging: false
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.users = require('./user.model')(sequelize, Sequelize);
db.servers = require('./server.model')(sequelize, Sequelize);
db.activityLogs = require('./activityLog.model')(sequelize, Sequelize);

// Define relationships
db.users.hasMany(db.activityLogs);
db.activityLogs.belongsTo(db.users);

module.exports = db; 