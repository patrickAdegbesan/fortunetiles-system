const { Category, sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    const categories = await Category.findAll({
      attributes: ['id', 'name'],
      order: [['id', 'ASC']]
    });
    
    console.log('\n📋 Available Categories:');
    console.log('========================');
    categories.forEach(category => {
      console.log(`ID: ${category.id} | Name: ${category.name}`);
    });
    
    console.log(`\n📊 Total categories: ${categories.length}`);
    
    if (categories.length === 0) {
      console.log('\n⚠️  No categories found. You may need to seed the database first.');
    } else {
      console.log('\n💡 You can test category deletion with any of the categories above.');
      console.log('Use the category ID in your API calls: DELETE /api/categories/{ID}');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
})();