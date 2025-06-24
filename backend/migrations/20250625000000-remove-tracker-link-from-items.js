'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove trackerLink field from all items (where parentId is not null)
    await queryInterface.sequelize.query(`
      UPDATE soc_trackers 
      SET "trackerLink" = NULL 
      WHERE "parentId" IS NOT NULL
    `);
    
    // For items, we'll keep name but set it to description if it's empty
    await queryInterface.sequelize.query(`
      UPDATE soc_trackers 
      SET "name" = COALESCE("description", 'Item') 
      WHERE "parentId" IS NOT NULL AND ("name" IS NULL OR "name" = '')
    `);
  },

  async down(queryInterface, Sequelize) {
    // No need for down migration as we're just nullifying values
  }
}; 