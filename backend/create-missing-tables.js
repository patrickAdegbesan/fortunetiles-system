const { sequelize } = require('./config/database');

async function createMissingTables() {
  try {
    console.log('Creating missing tables...');
    
    // Create returns table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "returns" (
        "id" SERIAL PRIMARY KEY,
        "saleId" INTEGER NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
        "processedBy" INTEGER NOT NULL REFERENCES "users"("id"),
        "returnDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "returnType" VARCHAR(255) CHECK ("returnType" IN ('REFUND', 'EXCHANGE')) NOT NULL,
        "reason" TEXT,
        "status" VARCHAR(255) CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')) NOT NULL DEFAULT 'PENDING',
        "totalRefundAmount" DECIMAL(10,2),
        "refundMethod" VARCHAR(255) CHECK ("refundMethod" IN ('CASH', 'BANK_TRANSFER', 'STORE_CREDIT')),
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Returns table created successfully');

    // Create return_items table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "return_items" (
        "id" SERIAL PRIMARY KEY,
        "returnId" INTEGER NOT NULL REFERENCES "returns"("id") ON DELETE CASCADE,
        "saleItemId" INTEGER NOT NULL REFERENCES "sale_items"("id"),
        "productId" INTEGER NOT NULL REFERENCES "products"("id"),
        "locationId" INTEGER NOT NULL REFERENCES "locations"("id"),
        "quantity" DECIMAL(10,2) NOT NULL,
        "returnReason" VARCHAR(255),
        "condition" VARCHAR(255) CHECK ("condition" IN ('PERFECT', 'GOOD', 'DAMAGED')) NOT NULL DEFAULT 'PERFECT',
        "refundAmount" DECIMAL(10,2),
        "exchangeProductId" INTEGER REFERENCES "products"("id"),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Return items table created successfully');
    console.log('All missing tables created!');
    
  } catch (error) {
    console.error('Error creating tables:', error.message);
  } finally {
    await sequelize.close();
  }
}

createMissingTables();