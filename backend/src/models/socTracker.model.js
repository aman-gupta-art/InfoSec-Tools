module.exports = (sequelize, Sequelize) => {
  const SOCTracker = sequelize.define("soc_trackers", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true
    },
    parentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'soc_trackers',
        key: 'id'
      }
    },
    trackerLink: {
      type: Sequelize.STRING,
      allowNull: true
    },
    ownership: {
      type: Sequelize.STRING,
      allowNull: true
    },
    reviewer: {
      type: Sequelize.STRING,
      allowNull: true
    },
    frequency: {
      type: Sequelize.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.STRING,
      allowNull: true
    },
    remarks: {
      type: Sequelize.STRING,
      allowNull: true
    },
    timelines: {
      type: Sequelize.STRING,
      allowNull: true
    }
  });

  // Define self-referencing association for parent-child relationship
  SOCTracker.associate = (models) => {
    SOCTracker.hasMany(SOCTracker, {
      as: 'items',
      foreignKey: 'parentId'
    });
    SOCTracker.belongsTo(SOCTracker, {
      as: 'parent',
      foreignKey: 'parentId'
    });
  };

  return SOCTracker;
}; 