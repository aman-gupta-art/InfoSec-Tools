module.exports = (sequelize, Sequelize) => {
  const Server = sequelize.define("servers", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ip: {
      type: Sequelize.STRING,
      allowNull: false
    },
    hostname: {
      type: Sequelize.STRING,
      allowNull: false
    },
    operatingSystem: {
      type: Sequelize.STRING,
      allowNull: false
    },
    serverRole: {
      type: Sequelize.STRING,
      allowNull: true
    },
    serverType: {
      type: Sequelize.STRING,
      allowNull: true
    },
    applicationName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    applicationSPOC: {
      type: Sequelize.STRING,
      allowNull: true
    },
    applicationOwner: {
      type: Sequelize.STRING,
      allowNull: true
    },
    platform: {
      type: Sequelize.STRING,
      allowNull: true
    },
    location: {
      type: Sequelize.STRING,
      allowNull: true
    },
    manufacturer: {
      type: Sequelize.STRING,
      allowNull: true
    },
    ram: {
      type: Sequelize.STRING,
      allowNull: true
    },
    cpu: {
      type: Sequelize.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('live', 'shutdown', 'new'),
      defaultValue: 'new'
    }
  });

  return Server;
}; 