module.exports = (sequelize, Sequelize) => {
  const ActivityLog = sequelize.define("activity_logs", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.STRING,
      allowNull: false
    },
    timestamp: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  });

  return ActivityLog;
}; 