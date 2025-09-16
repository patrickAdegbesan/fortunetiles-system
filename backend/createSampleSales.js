const { sequelize } = require('./config/database');
const { User, Product, Sale, SaleItem, Location } = require('./models');

async function createSampleSales() {
  try {
    console.log('Creating sample sales data...');

    // Get existing user (admin user should exist)
    const adminUser = await User.findOne({ where: { email: 'admin@fortunetiles.com' } });
    if (!adminUser) {
      console.log('Admin user not found. Creating one...');
      const newAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@fortunetiles.com',
        password: 'admin123',
        role: 'owner'
      });
      console.log('Admin user created');
    }

    const cashier = adminUser || await User.findOne();
    
    // Get a location
    const location = await Location.findOne();
    if (!location) {
      console.log('No location found. Creating default location...');
      const newLocation = await Location.create({
        name: 'Main Store',
        address: 'Main Store Location'
      });
    }
    
    const storeLocation = location || await Location.findOne();

    // Get some products
    const products = await Product.findAll({ limit: 5 });
    if (products.length === 0) {
      console.log('No products found. Run quickSeed first.');
      return;
    }

    // Create sample sales
    const salesData = [
      {
        customerName: 'John Doe',
        customerPhone: '+234-801-234-5678',
        totalAmount: 15000.00,
        paymentMethod: 'cash',
        userId: cashier.id,
        locationId: storeLocation.id
      },
      {
        customerName: 'Jane Smith',
        customerPhone: '+234-802-345-6789',
        totalAmount: 28500.00,
        paymentMethod: 'card',
        userId: cashier.id,
        locationId: storeLocation.id
      },
      {
        customerName: 'Mike Johnson',
        customerPhone: '+234-803-456-7890',
        totalAmount: 42300.00,
        paymentMethod: 'bank_transfer',
        userId: cashier.id,
        locationId: storeLocation.id
      },
      {
        customerName: 'Walk-in Customer', // Required field, can't be null
        customerPhone: null,
        totalAmount: 7500.00,
        paymentMethod: 'cash',
        userId: cashier.id,
        locationId: storeLocation.id
      },
      {
        customerName: 'Sarah Wilson',
        customerPhone: '+234-804-567-8901',
        totalAmount: 31200.00,
        paymentMethod: 'card',
        userId: cashier.id,
        locationId: storeLocation.id
      }
    ];

    console.log(`Creating ${salesData.length} sample sales...`);

    for (let i = 0; i < salesData.length; i++) {
      const saleData = salesData[i];
      
      // Create the sale with a random date within last 30 days
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - randomDaysAgo);
      
      const sale = await Sale.create({
        ...saleData,
        createdAt: saleDate,
        updatedAt: saleDate
      });

      // Create sale items for each sale
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per sale
      const selectedProducts = products.slice(0, numItems);
      
      let calculatedTotal = 0;
      
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 sqm
        const unitPrice = parseFloat(product.price) || 2500; // Use product price or default
        const totalPrice = quantity * unitPrice;
        calculatedTotal += totalPrice;

        await SaleItem.create({
          saleId: sale.id,
          productId: product.id,
          quantity: quantity,
          unit: 'sqm', // Required field
          unitPrice: unitPrice,
          lineTotal: totalPrice // Use lineTotal instead of totalPrice
        });
      }

      // Update sale with calculated total if needed
      if (Math.abs(sale.totalAmount - calculatedTotal) > 100) {
        await sale.update({ totalAmount: calculatedTotal });
      }

      console.log(`Created sale #${sale.id} for ${sale.customerName || 'Walk-in'} - ₦${sale.totalAmount.toLocaleString()}`);
    }

    console.log('\n=== SAMPLE SALES CREATED ===');
    const totalSales = await Sale.count();
    console.log(`Total sales in database: ${totalSales}`);

  } catch (error) {
    console.error('Error creating sample sales:', error);
  }
}

createSampleSales().then(() => {
  console.log('Sample sales creation completed');
  process.exit(0);
}).catch(error => {
  console.error('Sample sales creation failed:', error);
  process.exit(1);
});