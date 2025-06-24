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
db.socTracker = require('./socTracker.model')(sequelize, Sequelize);
db.trackerHeader = require('./trackerHeader.model')(sequelize, Sequelize);
db.trackerRow = require('./trackerRow.model')(sequelize, Sequelize);

// Define relationships
db.users.hasMany(db.activityLogs);
db.activityLogs.belongsTo(db.users);

// Initialize socTracker associations
if (db.socTracker.associate) {
  db.socTracker.associate(db);
}

// Initialize trackerHeader associations
if (db.trackerHeader.associate) {
  db.trackerHeader.associate(db);
}

// Initialize trackerRow associations
if (db.trackerRow.associate) {
  db.trackerRow.associate(db);
}

module.exports = db; 