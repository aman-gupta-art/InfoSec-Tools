'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create tracker_headers table
    await queryInterface.createTable('tracker_headers', {
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
        },
        onDelete: 'CASCADE'
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
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create tracker_rows table
    await queryInterface.createTable('tracker_rows', {
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
        },
        onDelete: 'CASCADE'
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '{}'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('tracker_headers', ['trackerId']);
    await queryInterface.addIndex('tracker_rows', ['trackerId']);
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('tracker_rows');
    await queryInterface.dropTable('tracker_headers');
  }
}; 