const { ProductType } = require('./models');

async function seedAttributes() {
  try {
    console.log('Starting attribute seeding...');
    
    // Basin Mixers
    await ProductType.update({
      attributes: {
        requiredFields: ['finish', 'type', 'spout_height', 'handle_type'],
        optionalFields: ['installation_type', 'flow_rate', 'brand']
      }
    }, {
      where: { name: 'Basin Mixers' }
    });
    console.log('Updated Basin Mixers');
    
    // Water Cisterns / WC
    await ProductType.update({
      attributes: {
        requiredFields: ['capacity', 'flush_type', 'material', 'installation_type'],
        optionalFields: ['color', 'brand', 'warranty', 'water_efficiency_rating', 'dimensions', 'weight', 'special_features']
      }
    }, {
      where: { name: 'Water Cisterns / WC' }
    });
    console.log('Updated Water Cisterns / WC');
    
    // Luxury Baths
    await ProductType.update({
      attributes: {
        requiredFields: ['material', 'dimensions', 'style', 'capacity'],
        optionalFields: ['color', 'brand', 'warranty', 'special_features', 'installation_type']
      }
    }, {
      where: { name: 'Luxury Baths' }
    });
    console.log('Updated Luxury Baths');
    
    // Tiles
    await ProductType.update({
      attributes: {
        requiredFields: ['material', 'size', 'finish', 'color'],
        optionalFields: ['brand', 'thickness', 'slip_resistance', 'water_absorption', 'frost_resistance']
      }
    }, {
      where: { name: 'Tiles' }
    });
    console.log('Updated Tiles');
    
    // Marble
    await ProductType.update({
      attributes: {
        requiredFields: ['type', 'finish', 'thickness', 'color'],
        optionalFields: ['origin', 'grade', 'veining_pattern', 'edge_treatment']
      }
    }, {
      where: { name: 'Marble' }
    });
    console.log('Updated Marble');
    
    console.log('All product types updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating product types:', error);
    process.exit(1);
  }
}

seedAttributes();
