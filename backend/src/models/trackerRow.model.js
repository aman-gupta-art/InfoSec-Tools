module.exports = (sequelize, Sequelize) => {
  const TrackerRow = sequelize.define("tracker_rows", {
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
    data: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {}
    }
  });

  TrackerRow.associate = (models) => {
    TrackerRow.belongsTo(models.socTracker, {
      foreignKey: 'trackerId',
      as: 'tracker',
      onDelete: 'CASCADE'
    });
  };

  return TrackerRow;
}; 