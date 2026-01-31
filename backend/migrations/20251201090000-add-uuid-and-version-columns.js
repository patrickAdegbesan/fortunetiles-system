'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure pgcrypto for gen_random_uuid()
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    }

    const addCols = async (table) => {
      const dialect = queryInterface.sequelize.getDialect();
      const uuidDefault = dialect === 'postgres' ? Sequelize.literal('gen_random_uuid()') : null;
      await queryInterface.addColumn(table, 'uuid', {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: uuidDefault || Sequelize.fn('uuid_generate_v4') || Sequelize.literal("(lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))))"),
      });
      await queryInterface.addColumn(table, 'version', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
      await queryInterface.addIndex(table, ['uuid'], { unique: true, name: `${table}_uuid_unique_idx` });
      await queryInterface.addIndex(table, ['version'], { name: `${table}_version_idx` });
    };

    await addCols('products');
    await addCols('inventory');
    await addCols('sales');
    await addCols('sale_items');
    await addCols('returns');
    await addCols('inventory_logs');
    await addCols('locations');
  },

  async down(queryInterface, Sequelize) {
    const dropCols = async (table) => {
      await queryInterface.removeIndex(table, `${table}_uuid_unique_idx`).catch(()=>{});
      await queryInterface.removeIndex(table, `${table}_version_idx`).catch(()=>{});
      await queryInterface.removeColumn(table, 'uuid').catch(()=>{});
      await queryInterface.removeColumn(table, 'version').catch(()=>{});
    };

    await dropCols('products');
    await dropCols('inventory');
    await dropCols('sales');
    await dropCols('sale_items');
    await dropCols('returns');
    await dropCols('inventory_logs');
    await dropCols('locations');
  }
};
