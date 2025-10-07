/**
 * Fortune Tiles Inventory Management System
 * Comprehensive Historical Data Seeding Script
 * 
 * Generates 3+ years of realistic business data (Jan 2022 - Aug 2025)
 * 
 * Features:
 * - 3 Locations with different characteristics
 * - 8 Users with different roles and responsibilities
 * - 15+ Products across multiple categories
 * - 2,000+ Sales transactions with realistic patterns
 * - Inventory movements with audit trails
 * - Returns processing (3% of sales)
 * - Seasonal variations and business growth
 */

const { sequelize } = require('./config/database');
const {
  Location,
  User,
  ProductType,
  Product,
  Inventory,
  Sale,
  SaleItem,
  Return,
  ReturnItem,
  InventoryLog,
  UserActivity
} = require('./models');

// Configuration
const CONFIG = {
  START_DATE: new Date('2022-01-01'),
  END_DATE: new Date('2025-08-31'),
  TOTAL_SALES_TARGET: 2000,
  RETURN_RATE: 0.03, // 3% of sales have returns
  DISCOUNT_RATE: 0.15, // 15% of sales have discounts
  BREAKAGE_RATE: 0.025 // 2.5% monthly breakage/damage
};

// Nigerian names and phone number generators
const NIGERIAN_NAMES = {
  firstNames: [
    'Adebayo', 'Chioma', 'Emeka', 'Fatima', 'Ibrahim', 'Kemi', 'Olumide', 'Blessing',
    'Chinedu', 'Aisha', 'Babatunde', 'Grace', 'Ahmed', 'Folake', 'Tunde', 'Ngozi',
    'Usman', 'Adunni', 'Segun', 'Aminat', 'Damilola', 'Funmi', 'Yakubu', 'Oluwatosin',
    'Abdullahi', 'Bukola', 'Chukwuma', 'Hauwa', 'Kayode', 'Maryam', 'Rotimi', 'Zainab',
    'Adeolu', 'Comfort', 'Ifeanyi', 'Laraba', 'Mustapha', 'Omolara', 'Suleiman', 'Temilola'
  ],
  lastNames: [
    'Adebayo', 'Okafor', 'Ibrahim', 'Williams', 'Johnson', 'Abubakar', 'Ogun', 'Bello',
    'Okoro', 'Aliyu', 'Adamu', 'Okonkwo', 'Mohammed', 'Eze', 'Yusuf', 'Nwosu',
    'Musa', 'Ogbonna', 'Garba', 'Chukwu', 'Sani', 'Obi', 'Lawal', 'Onyeka',
    'Umar', 'Okeke', 'Hassan', 'Nnaji', 'Salisu', 'Okafor', 'Ahmad', 'Ugwu'
  ]
};

// Utility Functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNigerianPhone() {
  const prefixes = ['0803', '0806', '0813', '0816', '0903', '0906', '0701', '0708', '0802', '0809'];
  const prefix = randomChoice(prefixes);
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return prefix + number;
}

function generateNigerianName() {
  const firstName = randomChoice(NIGERIAN_NAMES.firstNames);
  const lastName = randomChoice(NIGERIAN_NAMES.lastNames);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatNumber(value, decimals = 2) {
  return Math.round(parseFloat(value) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function getRandomDateBetween(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function getBusinessDayWeight(date) {
  const dayOfWeek = date.getDay();
  // Higher weight for weekdays, lower for weekends
  if (dayOfWeek === 0) return 0.3; // Sunday
  if (dayOfWeek === 6) return 0.5; // Saturday
  return 1.0; // Monday-Friday
}

function getSeasonalWeight(date) {
  const month = date.getMonth();
  // Construction peak season: Nov-May (dry season)
  if (month >= 10 || month <= 4) return 1.2;
  // Rainy season: Jun-Oct (lower construction)
  return 0.8;
}

function getGrowthMultiplier(date, startDate) {
  const monthsSinceStart = (date.getFullYear() - startDate.getFullYear()) * 12 + 
                          (date.getMonth() - startDate.getMonth());
  // Gradual growth: 2% per month for first year, then 1% per month
  if (monthsSinceStart <= 12) {
    return 1 + (monthsSinceStart * 0.02);
  }
  return 1.24 + ((monthsSinceStart - 12) * 0.01);
}

// Data Definitions
const LOCATIONS_DATA = [
  {
    name: 'Main Warehouse',
    address: 'Plot 45, Industrial Estate, Ikeja, Lagos State',
    type: 'warehouse',
    salesMultiplier: 0.4 // Lower direct sales, more distribution
  },
  {
    name: 'Lagos Showroom', 
    address: '123 Adeola Odeku Street, Victoria Island, Lagos',
    type: 'showroom',
    salesMultiplier: 1.5 // Higher sales, premium location
  },
  {
    name: 'Ikeja Branch',
    address: '67 Allen Avenue, Ikeja, Lagos State',
    type: 'branch',
    salesMultiplier: 1.0 // Standard sales volume
  }
];

function createUsersData(locations) {
  return [
    {
      firstName: 'Patrick', lastName: 'Adegbesan', email: 'patrick@fortunetiles.com',
      role: 'owner', password: 'password123', locationId: null
    },
    {
      firstName: 'Adebayo', lastName: 'Williams', email: 'adebayo@fortunetiles.com',
      role: 'manager', password: 'password123', locationId: locations[0].id // Main Warehouse
    },
    {
      firstName: 'Chioma', lastName: 'Okafor', email: 'chioma@fortunetiles.com',
      role: 'manager', password: 'password123', locationId: locations[1].id // Lagos Showroom
    },
    {
      firstName: 'Emeka', lastName: 'Nwosu', email: 'emeka@fortunetiles.com',
      role: 'staff', password: 'password123', locationId: locations[0].id
    },
    {
      firstName: 'Fatima', lastName: 'Bello', email: 'fatima@fortunetiles.com',
      role: 'staff', password: 'password123', locationId: locations[1].id
    },
    {
      firstName: 'Ibrahim', lastName: 'Musa', email: 'ibrahim@fortunetiles.com',
      role: 'staff', password: 'password123', locationId: locations[2].id // Ikeja Branch
    },
    {
      firstName: 'Kemi', lastName: 'Johnson', email: 'kemi@fortunetiles.com',
      role: 'staff', password: 'password123', locationId: locations[1].id
    },
    {
      firstName: 'Olumide', lastName: 'Ogbonna', email: 'olumide@fortunetiles.com',
      role: 'staff', password: 'password123', locationId: locations[2].id
    }
  ];
}

const PRODUCT_TYPES_DATA = [
  {
    name: 'Floor Tiles',
    unitOfMeasure: 'sqm',
    attributes: {
      requiredFields: ['material', 'size', 'finish', 'color'],
      optionalFields: ['brand', 'thickness', 'slip_resistance', 'water_absorption']
    }
  },
  {
    name: 'Wall Tiles', 
    unitOfMeasure: 'sqm',
    attributes: {
      requiredFields: ['material', 'size', 'finish', 'color'],
      optionalFields: ['brand', 'thickness', 'installation_type']
    }
  },
  {
    name: 'Basins',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'style', 'size', 'color'],
      optionalFields: ['brand', 'installation_type', 'tap_holes']
    }
  },
  {
    name: 'Baths',
    unitOfMeasure: 'pcs', 
    attributes: {
      requiredFields: ['material', 'style', 'dimensions', 'capacity'],
      optionalFields: ['brand', 'color', 'special_features']
    }
  },
  {
    name: 'Showers',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['type', 'material', 'size', 'finish'],
      optionalFields: ['brand', 'pressure_rating', 'special_features']
    }
  },
  {
    name: 'Mixers',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['type', 'finish', 'handle_type'],
      optionalFields: ['brand', 'flow_rate', 'pressure_rating']
    }
  },
  {
    name: 'Cisterns',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['capacity', 'flush_type', 'material'],
      optionalFields: ['brand', 'water_efficiency', 'installation_type']
    }
  }
];

const PRODUCTS_DATA = [
  // Floor Tiles
  { name: 'Porcelain Floor Tile 60x60cm Beige', productType: 'Floor Tiles', price: 8500, categories: ['Tiles', 'Porcelain'], supplierCode: 'PFT-6060-BG' },
  { name: 'Ceramic Floor Tile 30x30cm Grey', productType: 'Floor Tiles', price: 4200, categories: ['Tiles', 'Ceramic'], supplierCode: 'CFT-3030-GY' },
  { name: 'Marble Floor Tile 80x80cm White', productType: 'Floor Tiles', price: 15000, categories: ['Tiles', 'Marble'], supplierCode: 'MFT-8080-WH' },
  
  // Wall Tiles
  { name: 'Ceramic Wall Tile 25x40cm Blue', productType: 'Wall Tiles', price: 3800, categories: ['Tiles', 'Wall'], supplierCode: 'CWT-2540-BL' },
  { name: 'Glass Wall Tile 30x30cm Clear', productType: 'Wall Tiles', price: 6500, categories: ['Tiles', 'Glass'], supplierCode: 'GWT-3030-CL' },
  
  // Basins
  { name: 'Ceramic Basin Round 45cm White', productType: 'Basins', price: 25000, categories: ['Bathroom', 'Basins'], supplierCode: 'CB-R45-WH' },
  { name: 'Granite Basin Rectangular 60cm Black', productType: 'Basins', price: 45000, categories: ['Bathroom', 'Premium'], supplierCode: 'GB-R60-BK' },
  { name: 'Ceramic Basin Oval 50cm Ivory', productType: 'Basins', price: 28000, categories: ['Bathroom', 'Basins'], supplierCode: 'CB-O50-IV' },
  
  // Baths
  { name: 'Acrylic Bath 1.7m Standard White', productType: 'Baths', price: 85000, categories: ['Bathroom', 'Baths'], supplierCode: 'AB-170-WH' },
  { name: 'Steel Bath 1.5m Compact Blue', productType: 'Baths', price: 65000, categories: ['Bathroom', 'Baths'], supplierCode: 'SB-150-BL' },
  
  // Showers
  { name: 'Chrome Shower Set Complete', productType: 'Showers', price: 35000, categories: ['Bathroom', 'Showers'], supplierCode: 'CSS-COMP-CH' },
  { name: 'Stainless Steel Shower Head Premium', productType: 'Showers', price: 18000, categories: ['Bathroom', 'Showers'], supplierCode: 'SSH-PREM-SS' },
  
  // Mixers  
  { name: 'Basin Mixer Chrome Single Handle', productType: 'Mixers', price: 22000, categories: ['Bathroom', 'Mixers'], supplierCode: 'BM-CH-SH' },
  { name: 'Kitchen Mixer Stainless Steel', productType: 'Mixers', price: 28000, categories: ['Kitchen', 'Mixers'], supplierCode: 'KM-SS-STD' },
  
  // Cisterns
  { name: 'Dual Flush Cistern 6/3L White', productType: 'Cisterns', price: 42000, categories: ['Bathroom', 'Cisterns'], supplierCode: 'DFC-63L-WH' },
  { name: 'Single Flush Cistern 9L Ivory', productType: 'Cisterns', price: 35000, categories: ['Bathroom', 'Cisterns'], supplierCode: 'SFC-9L-IV' }
];

// Main seeding functions
async function cleanExistingData() {
  console.log('🧹 Cleaning existing data...');
  
  try {
    // Order matters due to foreign key constraints
    await InventoryLog.destroy({ where: {}, force: true });
    await ReturnItem.destroy({ where: {}, force: true });
    await Return.destroy({ where: {}, force: true });
    await SaleItem.destroy({ where: {}, force: true });
    await Sale.destroy({ where: {}, force: true });
    await Inventory.destroy({ where: {}, force: true });
    await Product.destroy({ where: {}, force: true });
    await ProductType.destroy({ where: {}, force: true });
    await UserActivity.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Location.destroy({ where: {}, force: true });
    
    console.log('✅ Existing data cleaned successfully');
  } catch (error) {
    console.error('❌ Error cleaning data:', error.message);
    throw error;
  }
}

async function seedLocations() {
  console.log('📍 Seeding locations...');
  
  const locations = [];
  for (const locationData of LOCATIONS_DATA) {
    const location = await Location.create({
      name: locationData.name,
      address: locationData.address,
      createdAt: CONFIG.START_DATE,
      updatedAt: CONFIG.START_DATE
    });
    locations.push({ ...location.toJSON(), ...locationData });
  }
  
  console.log(`✅ Created ${locations.length} locations`);
  return locations;
}

async function seedUsers(locations) {
  console.log('👥 Seeding users...');
  
  const usersData = createUsersData(locations);
  const users = [];
  for (const userData of usersData) {
    const user = await User.create({
      ...userData,
      isActive: true,
      createdAt: CONFIG.START_DATE,
      updatedAt: CONFIG.START_DATE
    });
    users.push(user);
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedProductTypes() {
  console.log('📦 Seeding product types...');
  
  const productTypes = [];
  for (const typeData of PRODUCT_TYPES_DATA) {
    const productType = await ProductType.create({
      ...typeData,
      isActive: true,
      createdAt: CONFIG.START_DATE,
      updatedAt: CONFIG.START_DATE
    });
    productTypes.push(productType);
  }
  
  console.log(`✅ Created ${productTypes.length} product types`);
  return productTypes;
}

async function seedProducts(productTypes) {
  console.log('🛍️ Seeding products...');
  
  const products = [];
  for (const productData of PRODUCTS_DATA) {
    const productType = productTypes.find(pt => pt.name === productData.productType);
    if (!productType) {
      console.warn(`⚠️ Product type '${productData.productType}' not found for product '${productData.name}'`);
      continue;
    }
    
    const product = await Product.create({
      name: productData.name,
      productTypeId: productType.id,
      price: productData.price,
      categories: productData.categories,
      unitOfMeasure: productType.unitOfMeasure,
      supplierCode: productData.supplierCode,
      attributes: {
        material: randomChoice(['Ceramic', 'Porcelain', 'Granite', 'Steel', 'Acrylic']),
        color: randomChoice(['White', 'Black', 'Grey', 'Beige', 'Blue', 'Ivory']),
        brand: randomChoice(['Fortune Premium', 'Classic Series', 'Luxury Line', 'Standard Plus'])
      },
      description: `High-quality ${productData.name.toLowerCase()} suitable for residential and commercial use`,
      isActive: true,
      createdAt: CONFIG.START_DATE,
      updatedAt: CONFIG.START_DATE
    });
    
    products.push(product);
  }
  
  console.log(`✅ Created ${products.length} products`);
  return products;
}

async function seedInitialInventory(products, locations, users) {
  console.log('📊 Seeding initial inventory...');
  
  const managerUser = users.find(u => u.role === 'manager');
  let inventoryCount = 0;
  let logCount = 0;
  
  for (const location of locations) {
    for (const product of products) {
      // Generate realistic initial stock based on product type and location
      let baseStock;
      if (product.unitOfMeasure === 'sqm') {
        baseStock = randomFloat(100, 800); // Tiles in square meters
      } else {
        baseStock = randomFloat(10, 150); // Pieces for bathroom items
      }
      
      // Adjust for location type
      const locationMultiplier = location.type === 'warehouse' ? 2.5 : 
                               location.type === 'showroom' ? 0.7 : 1.0;
      const initialStock = Math.round(baseStock * locationMultiplier * 100) / 100;
      
      const inventory = await Inventory.create({
        productId: product.id,
        locationId: location.id,
        quantitySqm: initialStock,
        updatedAt: CONFIG.START_DATE
      });
      
      // Create inventory log for initial stock
      await InventoryLog.create({
        productId: product.id,
        locationId: location.id,
        changeType: 'initial',
        changeAmount: initialStock,
        previousQuantity: 0,
        newQuantity: initialStock,
        notes: 'Initial stock setup',
        userId: managerUser.id,
        createdAt: CONFIG.START_DATE
      });
      
      inventoryCount++;
      logCount++;
    }
  }
  
  console.log(`✅ Created ${inventoryCount} inventory records and ${logCount} inventory logs`);
}

async function generateSalesData(products, locations, users) {
  console.log('💰 Generating sales data...');
  
  const staffUsers = users.filter(u => u.role === 'staff' || u.role === 'manager');
  const sales = [];
  const saleItems = [];
  const returns = [];
  const returnItems = [];
  const inventoryLogs = [];
  
  let currentDate = new Date(CONFIG.START_DATE);
  let salesGenerated = 0;
  let monthlyTarget = CONFIG.TOTAL_SALES_TARGET / 42; // 42 months approximately
  
  while (currentDate <= CONFIG.END_DATE && salesGenerated < CONFIG.TOTAL_SALES_TARGET) {
    // Calculate sales for this month
    const growthMultiplier = getGrowthMultiplier(currentDate, CONFIG.START_DATE);
    const monthlySalesTarget = Math.round(monthlyTarget * growthMultiplier);
    
    for (let i = 0; i < monthlySalesTarget && salesGenerated < CONFIG.TOTAL_SALES_TARGET; i++) {
      // Generate random sale date within the month
      const saleDate = getRandomDateBetween(
        currentDate,
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      );
      
      // Apply business day and seasonal weights
      const dayWeight = getBusinessDayWeight(saleDate);
      const seasonalWeight = getSeasonalWeight(saleDate);
      
      if (Math.random() > dayWeight * seasonalWeight * 0.7) {
        continue; // Skip this sale based on probability
      }
      
      // Select location with weighted probability
      const location = randomChoice(locations);
      const locationStaff = staffUsers.filter(u => 
        u.locationId === location.id || u.role === 'manager' || u.role === 'owner'
      );
      
      if (locationStaff.length === 0) continue;
      
      const cashier = randomChoice(locationStaff);
      const customer = generateNigerianName();
      
      // Determine customer type and sale characteristics
      const customerTypes = ['retail', 'contractor', 'wholesale'];
      const customerType = randomChoice(customerTypes);
      
      let itemCount, discountChance, avgOrderValue;
      switch (customerType) {
        case 'wholesale':
          itemCount = randomInt(3, 8);
          discountChance = 0.4;
          avgOrderValue = randomFloat(200000, 800000);
          break;
        case 'contractor':
          itemCount = randomInt(2, 5);
          discountChance = 0.2;
          avgOrderValue = randomFloat(100000, 400000);
          break;
        default: // retail
          itemCount = randomInt(1, 3);
          discountChance = 0.1;
          avgOrderValue = randomFloat(50000, 200000);
      }
      
      // Generate sale items
      const selectedProducts = [];
      const saleItemsForThisSale = [];
      let subtotalAmount = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const product = randomChoice(products);
        
        // Avoid duplicate products in same sale
        if (selectedProducts.includes(product.id)) continue;
        selectedProducts.push(product.id);
        
        // Check inventory availability
        const inventory = await Inventory.findOne({
          where: { productId: product.id, locationId: location.id }
        });
        
        if (!inventory || parseFloat(inventory.quantitySqm) <= 0) continue;
        
        // Generate realistic quantity based on product type
        const availableStock = parseFloat(inventory.quantitySqm);
        let quantity;
        if (product.unitOfMeasure === 'sqm') {
          quantity = randomFloat(5, Math.min(50, availableStock));
        } else {
          quantity = randomFloat(1, Math.min(10, availableStock));
        }
        
        quantity = formatNumber(quantity);
        
        // Apply small price variation (±5%)
        const unitPrice = formatNumber(product.price * randomFloat(0.95, 1.05));
        const lineTotal = formatNumber(quantity * unitPrice);
        
        saleItemsForThisSale.push({
          productId: product.id,
          quantity: quantity,
          unit: product.unitOfMeasure,
          unitPrice: unitPrice,
          lineTotal: lineTotal
        });
        
        subtotalAmount += lineTotal;
      }
      
      if (saleItemsForThisSale.length === 0) continue;
      
      subtotalAmount = formatNumber(subtotalAmount);
      
      // Apply discount
      let discountType = null;
      let discountValue = 0;
      let totalAmount = subtotalAmount;
      
      if (Math.random() < discountChance) {
        discountType = randomChoice(['percentage', 'amount']);
        if (discountType === 'percentage') {
          discountValue = randomFloat(5, 20);
          totalAmount = subtotalAmount * (1 - discountValue / 100);
        } else {
          discountValue = randomFloat(5000, Math.min(50000, subtotalAmount * 0.3));
          totalAmount = subtotalAmount - discountValue;
        }
      }
      
      totalAmount = formatNumber(totalAmount);
      
      // Create sale record
      const sale = await Sale.create({
        customerName: customer.fullName,
        customerPhone: generateNigerianPhone(),
        totalAmount: totalAmount,
        subtotalAmount: subtotalAmount,
        discountType: discountType,
        discountValue: discountValue,
        locationId: location.id,
        userId: cashier.id,
        paymentMethod: randomChoice(['cash', 'bank_transfer', 'pos', 'card']),
        createdAt: saleDate
      });
      
      sales.push(sale);
      
      // Create sale items and update inventory
      for (const itemData of saleItemsForThisSale) {
        const saleItem = await SaleItem.create({
          saleId: sale.id,
          ...itemData
        });
        saleItems.push(saleItem);
        
        // Update inventory
        const inventory = await Inventory.findOne({
          where: { productId: itemData.productId, locationId: location.id }
        });
        
        const previousQuantity = parseFloat(inventory.quantitySqm);
        const newQuantity = formatNumber(Math.max(0, previousQuantity - itemData.quantity));
        
        await inventory.update({ quantitySqm: newQuantity });
        
        // Create inventory log
        await InventoryLog.create({
          productId: itemData.productId,
          locationId: location.id,
          changeType: 'sale',
          changeAmount: -itemData.quantity,
          previousQuantity: previousQuantity,
          newQuantity: newQuantity,
          notes: `Sale #${sale.id}`,
          userId: cashier.id,
          createdAt: saleDate
        });
      }
      
      salesGenerated++;
      
      // Generate returns (3% chance)
      if (Math.random() < CONFIG.RETURN_RATE) {
        await generateReturn(sale, saleItems.filter(si => si.saleId === sale.id), location, users);
      }
    }
    
    // Move to next month
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
  
  console.log(`✅ Generated ${salesGenerated} sales with ${saleItems.length} items`);
  return { sales, saleItems };
}

async function generateReturn(sale, saleItems, location, users) {
  const managerUser = users.find(u => u.role === 'manager' || u.role === 'owner');
  
  // Return happens 1-30 days after sale
  const returnDate = addDays(sale.createdAt, randomInt(1, 30));
  
  const returnRecord = await Return.create({
    saleId: sale.id,
    processedBy: managerUser.id,
    returnDate: returnDate,
    returnType: randomChoice(['REFUND', 'EXCHANGE']),
    reason: randomChoice([
      'Defective product',
      'Wrong color/size',
      'Customer changed mind',
      'Damaged during transport',
      'Quality issues'
    ]),
    status: 'COMPLETED',
    refundMethod: randomChoice(['CASH', 'BANK_TRANSFER', 'STORE_CREDIT']),
    createdAt: returnDate,
    updatedAt: returnDate
  });
  
  // Return 1-2 items from the sale
  const itemsToReturn = saleItems.slice(0, randomInt(1, Math.min(2, saleItems.length)));
  let totalRefund = 0;
  
  for (const saleItem of itemsToReturn) {
    // Return partial or full quantity
    const returnQuantity = randomFloat(0.5, 1.0) * saleItem.quantity;
    const refundAmount = returnQuantity * saleItem.unitPrice;
    
    await ReturnItem.create({
      returnId: returnRecord.id,
      saleItemId: saleItem.id,
      productId: saleItem.productId,
      locationId: location.id,
      quantity: Math.round(returnQuantity * 100) / 100,
      returnReason: returnRecord.reason,
      condition: randomChoice(['PERFECT', 'GOOD', 'DAMAGED']),
      refundAmount: Math.round(refundAmount * 100) / 100,
      createdAt: returnDate,
      updatedAt: returnDate
    });
    
    totalRefund += refundAmount;
    
    // Update inventory (add back to stock if condition is good)
    const condition = Math.random() > 0.2 ? 'GOOD' : 'DAMAGED';
    if (condition === 'GOOD') {
      const inventory = await Inventory.findOne({
        where: { productId: saleItem.productId, locationId: location.id }
      });
      
      const previousQuantity = parseFloat(inventory.quantitySqm);
      const newQuantity = formatNumber(previousQuantity + returnQuantity);
      
      await inventory.update({ quantitySqm: newQuantity });
      
      // Create inventory log
      await InventoryLog.create({
        productId: saleItem.productId,
        locationId: location.id,
        changeType: 'adjusted',
        changeAmount: returnQuantity,
        previousQuantity: previousQuantity,
        newQuantity: newQuantity,
        notes: `Return from sale #${sale.id}`,
        userId: managerUser.id,
        createdAt: returnDate
      });
    }
  }
  
  await returnRecord.update({ totalRefundAmount: Math.round(totalRefund * 100) / 100 });
}

async function generateInventoryMovements(products, locations, users) {
  console.log('📦 Generating inventory movements...');
  
  const managerUsers = users.filter(u => u.role === 'manager' || u.role === 'owner');
  let movementCount = 0;
  
  let currentDate = new Date(CONFIG.START_DATE);
  
  while (currentDate <= CONFIG.END_DATE) {
    // Monthly inventory operations
    
    // 1. Stock receipts (2-3 times per month)
    for (let i = 0; i < randomInt(2, 3); i++) {
      const receiptDate = getRandomDateBetween(
        currentDate,
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      );
      
      const location = randomChoice(locations);
      const manager = randomChoice(managerUsers);
      
      // Receive 3-8 different products
      const productsToReceive = [];
      for (let j = 0; j < randomInt(3, 8); j++) {
        const product = randomChoice(products);
        if (!productsToReceive.includes(product.id)) {
          productsToReceive.push(product.id);
        }
      }
      
      for (const productId of productsToReceive) {
        const product = products.find(p => p.id === productId);
        const inventory = await Inventory.findOne({
          where: { productId: productId, locationId: location.id }
        });
        
        if (!inventory) continue;
        
        // Generate realistic receipt quantity
        let receiptQuantity;
        if (product.unitOfMeasure === 'sqm') {
          receiptQuantity = randomFloat(50, 300);
        } else {
          receiptQuantity = randomFloat(10, 80);
        }
        
        receiptQuantity = formatNumber(receiptQuantity);
        
        const previousQuantity = parseFloat(inventory.quantitySqm);
        const newQuantity = formatNumber(previousQuantity + receiptQuantity);
        
        await inventory.update({ quantitySqm: newQuantity });
        
        await InventoryLog.create({
          productId: productId,
          locationId: location.id,
          changeType: 'received',
          changeAmount: receiptQuantity,
          previousQuantity: previousQuantity,
          newQuantity: newQuantity,
          notes: `Stock receipt - supplier delivery`,
          userId: manager.id,
          createdAt: receiptDate
        });
        
        movementCount++;
      }
    }
    
    // 2. Breakages and damages (monthly)
    const damageDate = getRandomDateBetween(
      currentDate,
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    );
    
    for (const location of locations) {
      // 2-4 products affected by breakage/damage per location per month
      const productsAffected = [];
      for (let i = 0; i < randomInt(2, 4); i++) {
        const product = randomChoice(products);
        if (!productsAffected.includes(product.id)) {
          productsAffected.push(product.id);
        }
      }
      
      for (const productId of productsAffected) {
        const inventory = await Inventory.findOne({
          where: { productId: productId, locationId: location.id }
        });
        
        if (!inventory || inventory.quantitySqm <= 0) continue;
        
        // Calculate breakage (0.5-3% of current stock)
        const previousQuantity = parseFloat(inventory.quantitySqm);
        const breakageQuantity = previousQuantity * randomFloat(0.005, 0.03);
        const roundedBreakage = formatNumber(breakageQuantity);
        
        if (roundedBreakage < 0.01) continue;
        
        const newQuantity = formatNumber(Math.max(0, previousQuantity - roundedBreakage));
        
        await inventory.update({ quantitySqm: newQuantity });
        
        const manager = randomChoice(managerUsers);
        await InventoryLog.create({
          productId: productId,
          locationId: location.id,
          changeType: 'broken',
          changeAmount: -roundedBreakage,
          previousQuantity: previousQuantity,
          newQuantity: newQuantity,
          notes: randomChoice([
            'Breakage during handling',
            'Damaged in storage',
            'Quality control rejection',
            'Transport damage'
          ]),
          userId: manager.id,
          createdAt: damageDate
        });
        
        movementCount++;
      }
    }
    
    // Move to next month
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
  
  console.log(`✅ Generated ${movementCount} inventory movements`);
}

async function generateSummaryReport() {
  console.log('\n📈 SEEDING SUMMARY REPORT');
  console.log('========================\n');
  
  // Count records
  const locationCount = await Location.count();
  const userCount = await User.count();
  const productTypeCount = await ProductType.count();
  const productCount = await Product.count();
  const saleCount = await Sale.count();
  const saleItemCount = await SaleItem.count();
  const returnCount = await Return.count();
  const inventoryLogCount = await InventoryLog.count();
  
  console.log(`📍 Locations: ${locationCount}`);
  console.log(`👥 Users: ${userCount}`);
  console.log(`📦 Product Types: ${productTypeCount}`);
  console.log(`🛍️ Products: ${productCount}`);
  console.log(`💰 Sales: ${saleCount}`);
  console.log(`📝 Sale Items: ${saleItemCount}`);
  console.log(`↩️ Returns: ${returnCount}`);
  console.log(`📊 Inventory Logs: ${inventoryLogCount}`);
  
  // Sales analytics
  const totalRevenue = await Sale.sum('totalAmount');
  const avgSaleValue = totalRevenue / saleCount;
  
  console.log(`\n💹 FINANCIAL SUMMARY`);
  console.log(`Total Revenue: ₦${totalRevenue.toLocaleString('en-NG')}`);
  console.log(`Average Sale Value: ₦${Math.round(avgSaleValue).toLocaleString('en-NG')}`);
  
  // Monthly breakdown
  const monthlySales = await Sale.findAll({
    attributes: [
      [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'month'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
    ],
    group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']]
  });
  
  console.log(`\n📅 MONTHLY TRENDS (First & Last 6 months)`);
  monthlySales.slice(0, 6).forEach(month => {
    const date = new Date(month.dataValues.month);
    const monthName = date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long' });
    console.log(`${monthName}: ${month.dataValues.count} sales, ₦${parseFloat(month.dataValues.revenue).toLocaleString('en-NG')}`);
  });
  
  if (monthlySales.length > 12) {
    console.log(`...`);
    monthlySales.slice(-6).forEach(month => {
      const date = new Date(month.dataValues.month);
      const monthName = date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long' });
      console.log(`${monthName}: ${month.dataValues.count} sales, ₦${parseFloat(month.dataValues.revenue).toLocaleString('en-NG')}`);
    });
  }
  
  // Inventory status
  const totalInventoryValue = await sequelize.query(`
    SELECT SUM(i."quantitySqm" * p.price) as total_value
    FROM inventory i
    JOIN products p ON i."productId" = p.id
  `, { type: sequelize.QueryTypes.SELECT });
  
  const lowStockItems = await sequelize.query(`
    SELECT COUNT(*) as count
    FROM inventory i
    WHERE i."quantitySqm" < 10
  `, { type: sequelize.QueryTypes.SELECT });
  
  console.log(`\n📦 INVENTORY STATUS`);
  console.log(`Total Inventory Value: ₦${parseFloat(totalInventoryValue[0].total_value).toLocaleString('en-NG')}`);
  console.log(`Low Stock Items: ${lowStockItems[0].count}`);
  
  console.log(`\n✅ Data seeding completed successfully!`);
  console.log(`\n🎯 NEXT STEPS:`);
  console.log(`• Start your backend server: npm start`);
  console.log(`• Access the dashboard to view analytics`);
  console.log(`• Test all system features with realistic data`);
  console.log(`• Generate reports to see business trends\n`);
}

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting Fortune Tiles Historical Data Seeding...\n');
    console.log(`📅 Generating data from ${CONFIG.START_DATE.toDateString()} to ${CONFIG.END_DATE.toDateString()}`);
    console.log(`🎯 Target: ${CONFIG.TOTAL_SALES_TARGET} sales transactions\n`);
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Execute seeding in proper order
    await cleanExistingData();
    
    const locations = await seedLocations();
    const users = await seedUsers(locations);
    const productTypes = await seedProductTypes();
    const products = await seedProducts(productTypes);
    
    await seedInitialInventory(products, locations, users);
    await generateInventoryMovements(products, locations, users);
    await generateSalesData(products, locations, users);
    
    await generateSummaryReport();
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Seeding process completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  main,
  CONFIG,
  cleanExistingData,
  seedLocations,
  seedUsers,
  seedProductTypes,
  seedProducts,
  seedInitialInventory,
  generateSalesData,
  generateInventoryMovements
};