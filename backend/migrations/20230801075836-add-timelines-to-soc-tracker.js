'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add timelines column to soc_trackers table
    await queryInterface.addColumn('soc_trackers', 'timelines', {
      type: Sequelize.STRING,
      allowNull: true
    });
    console.log('Added timelines column to soc_trackers table');
  },

  async down (queryInterface, Sequelize) {
    // Remove timelines column from soc_trackers table
    await queryInterface.removeColumn('soc_trackers', 'timelines');
    console.log('Removed timelines column from soc_trackers table');
  }
}; 