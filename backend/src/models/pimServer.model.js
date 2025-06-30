module.exports = (sequelize, Sequelize) => {
  const PimServer = sequelize.define("pim_server", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    serverIp: {
      type: Sequelize.STRING,
      allowNull: false
    },
    serverUsername: {
      type: Sequelize.STRING,
      allowNull: false
    },
    hostname: {
      type: Sequelize.STRING,
      allowNull: false
    },
    applicationName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    group: {
      type: Sequelize.STRING,
      allowNull: true
    },
    connectionType: {
      type: Sequelize.STRING,
      allowNull: true
    }
  });

  return PimServer;
}; 