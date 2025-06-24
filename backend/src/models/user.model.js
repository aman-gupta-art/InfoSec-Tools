module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("users", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    role: {
      type: Sequelize.ENUM('admin', 'readonly'),
      defaultValue: 'readonly',
      allowNull: false
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    uiTheme: {
      type: Sequelize.ENUM('light', 'dark'),
      defaultValue: 'light'
    },
    lastLogin: {
      type: Sequelize.DATE
    }
  });

  return User;
}; 