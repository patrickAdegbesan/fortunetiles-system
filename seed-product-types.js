const { ProductType } = require('./backend/models');

const productTypesWithAttributes = [
  {
    name: 'Basin Mixers',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['finish', 'type', 'spout_height', 'handle_type'],
      optionalFields: ['installation_type', 'flow_rate', 'brand']
    }
  },
  {
    name: 'Water Cisterns / WC',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['capacity', 'flush_type', 'material', 'installation_type'],
      optionalFields: ['color', 'brand', 'warranty', 'water_efficiency_rating', 'dimensions', 'weight', 'special_features']
    }
  },
  {
    name: 'Luxury Baths',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'dimensions', 'style', 'capacity'],
      optionalFields: ['color', 'brand', 'warranty', 'special_features', 'installation_type']
    }
  },
  {
    name: 'Tiles',
    unitOfMeasure: 'sqm',
    attributes: {
      requiredFields: ['material', 'size', 'finish', 'color'],
      optionalFields: ['brand', 'thickness', 'slip_resistance', 'water_absorption', 'frost_resistance']
    }
  },
  {
    name: 'Marble',
    unitOfMeasure: 'sqm',
    attributes: {
      requiredFields: ['type', 'finish', 'thickness', 'color'],
      optionalFields: ['origin', 'grade', 'veining_pattern', 'edge_treatment']
    }
  }
];

async function seedProductTypes() {
  try {
    console.log('Starting product types seeding...');
    
    for (const typeData of productTypesWithAttributes) {
      const [productType, created] = await ProductType.findOrCreate({
        where: { name: typeData.name },
        defaults: typeData
      });
      
      if (!created) {
        // Update existing product type with attributes
        await productType.update({
          attributes: typeData.attributes,
          unitOfMeasure: typeData.unitOfMeasure
        });
        console.log(`Updated ${typeData.name} with attributes`);
      } else {
        console.log(`Created ${typeData.name} with attributes`);
      }
    }
    
    console.log('Product types seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding product types:', error);
    process.exit(1);
  }
}

seedProductTypes();
