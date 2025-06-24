module.exports = (sequelize, Sequelize) => {
  const TrackerHeader = sequelize.define("tracker_headers", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    trackerId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'soc_trackers',
        key: 'id'
      }
    },
    key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    label: {
      type: Sequelize.STRING,
      allowNull: false
    },
    enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 1
    }
  });

  TrackerHeader.associate = (models) => {
    TrackerHeader.belongsTo(models.socTracker, {
      foreignKey: 'trackerId',
      as: 'tracker',
      onDelete: 'CASCADE'
    });
  };

  return TrackerHeader;
}; 