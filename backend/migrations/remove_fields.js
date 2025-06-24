/**
 * Migration script to remove entityType, entityId, and ipAddress fields from activity_logs table
 * Run with: node migrations/remove_fields.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'infosec_tools',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || 'pass@12323', // Using the password from previous session
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: console.log
  }
);

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Check if columns exist before trying to remove them
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND column_name IN ('entityType', 'entityId', 'ipAddress')
    `);

    const columns = results.map(r => r.column_name);
    console.log('Found columns to remove:', columns);

    if (columns.length > 0) {
      // Build the ALTER TABLE statement dynamically
      const dropColumns = columns.map(col => `DROP COLUMN IF EXISTS "${col}"`).join(', ');
      const query = `ALTER TABLE activity_logs ${dropColumns};`;
      
      console.log('Running query:', query);
      await sequelize.query(query);
      console.log('Successfully removed columns:', columns);
    } else {
      console.log('No columns to remove');
    }

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the migration
runMigration(); 