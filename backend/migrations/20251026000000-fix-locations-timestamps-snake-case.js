'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // This migration has already been handled by previous migrations
    // No-op migration to maintain migration history
    console.log('✅ Locations timestamps already in snake_case format');
  },

  async down(queryInterface, Sequelize) {
    // No-op
  }
};
