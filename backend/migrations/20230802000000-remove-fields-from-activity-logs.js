'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if columns exist before trying to remove them
    const columns = await queryInterface.describeTable('activity_logs');
    
    if (columns.entityType) {
      await queryInterface.removeColumn('activity_logs', 'entityType');
      console.log('Removed entityType column from activity_logs table');
    }
    
    if (columns.entityId) {
      await queryInterface.removeColumn('activity_logs', 'entityId');
      console.log('Removed entityId column from activity_logs table');
    }
    
    if (columns.ipAddress) {
      await queryInterface.removeColumn('activity_logs', 'ipAddress');
      console.log('Removed ipAddress column from activity_logs table');
    }
  },

  async down (queryInterface, Sequelize) {
    // Add the columns back if they don't exist
    const columns = await queryInterface.describeTable('activity_logs');
    
    if (!columns.entityType) {
      await queryInterface.addColumn('activity_logs', 'entityType', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('Added entityType column to activity_logs table');
    }
    
    if (!columns.entityId) {
      await queryInterface.addColumn('activity_logs', 'entityId', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
      console.log('Added entityId column to activity_logs table');
    }
    
    if (!columns.ipAddress) {
      await queryInterface.addColumn('activity_logs', 'ipAddress', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('Added ipAddress column to activity_logs table');
    }
  }
}; 