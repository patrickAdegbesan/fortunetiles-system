require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Create sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'fortunetiles',
  process.env.DB_USER || 'postgres', 
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('🔧 Adding missing columns to products table...');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if columns exist and add them if they don't
    const tableDescription = await queryInterface.describeTable('products');
    
    if (!tableDescription.category) {
      await queryInterface.addColumn('products', 'category', {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: 'General'
      });
      console.log('✅ Added category column');
    } else {
      console.log('⚠️  Category column already exists');
    }

    if (!tableDescription.imageUrl) {
      await queryInterface.addColumn('products', 'imageUrl', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
      console.log('✅ Added imageUrl column');
    } else {
      console.log('⚠️  ImageUrl column already exists');
    }

    if (!tableDescription.description) {
      await queryInterface.addColumn('products', 'description', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('✅ Added description column');
    } else {
      console.log('⚠️  Description column already exists');
    }

    if (!tableDescription.isActive) {
      await queryInterface.addColumn('products', 'isActive', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      console.log('✅ Added isActive column');
    } else {
      console.log('⚠️  IsActive column already exists');
    }

    if (!tableDescription.deletedAt) {
      await queryInterface.addColumn('products', 'deletedAt', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('✅ Added deletedAt column');
    } else {
      console.log('⚠️  DeletedAt column already exists');
    }

    // Update existing records with default values
    await sequelize.query(`
      UPDATE products 
      SET category = 'General' 
      WHERE category IS NULL;
    `);

    await sequelize.query(`
      UPDATE products 
      SET "isActive" = true 
      WHERE "isActive" IS NULL;
    `);

    console.log('✅ Updated existing records with default values');
    console.log('🎉 Database schema fix completed successfully!');

  } catch (error) {
    console.error('❌ Database schema fix failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('✅ Schema fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Schema fix failed:', error);
    process.exit(1);
  });
