module.exports = (sequelize, Sequelize) => {
  const PimUser = sequelize.define("pimUser", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    psid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    fullName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    mobileNo: {
      type: Sequelize.STRING,
      allowNull: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true
    },
    reportingManager: {
      type: Sequelize.STRING,
      allowNull: true
    },
    hod: {
      type: Sequelize.STRING,
      allowNull: true
    },
    department: {
      type: Sequelize.STRING,
      allowNull: true
    },
    dateOfCreation: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  });

  return PimUser;
}; 