// Test script for user and category deletion
// Run with: node test-deletion.js

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// You'll need a valid JWT token for authentication
// Get this by logging in through the frontend or API
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your actual token

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testUserDeletion() {
  console.log('🔄 Testing User Deletion...');
  
  try {
    // List users first
    const usersResponse = await axios.get(`${API_BASE}/users`, { headers });
    console.log('📋 Available users:', usersResponse.data.users.length);
    
    if (usersResponse.data.users.length > 1) {
      // Pick a non-admin user to delete (avoid ID 30 which is the owner)
      const testUser = usersResponse.data.users.find(u => u.role !== 'owner' && u.id !== 30);
      
      if (testUser) {
        console.log(`🎯 Attempting to delete user: ${testUser.firstName} ${testUser.lastName} (ID: ${testUser.id})`);
        
        // Delete the user with hard delete
        const deleteResponse = await axios.delete(`${API_BASE}/users/${testUser.id}?hardDelete=true`, { headers });
        console.log('✅ Delete response:', deleteResponse.data.message);
        
        // Verify deletion by trying to fetch the user again
        try {
          await axios.get(`${API_BASE}/users/${testUser.id}`, { headers });
          console.log('❌ ERROR: User still exists after deletion!');
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.log('✅ SUCCESS: User properly deleted from database');
          } else {
            console.log('⚠️  Unexpected error checking user:', error.message);
          }
        }
      } else {
        console.log('⚠️  No suitable test user found (avoiding admin deletion)');
      }
    } else {
      console.log('⚠️  Not enough users to test deletion safely');
    }
  } catch (error) {
    console.error('❌ User deletion test failed:', error.response?.data?.message || error.message);
  }
}

async function testCategoryDeletion() {
  console.log('\n🔄 Testing Category Deletion...');
  
  try {
    // List categories first
    const categoriesResponse = await axios.get(`${API_BASE}/categories`);
    console.log('📋 Available categories:', categoriesResponse.data.categories.length);
    
    if (categoriesResponse.data.categories.length > 1) {
      // Pick a non-essential category to delete (avoid 'General')
      const testCategory = categoriesResponse.data.categories.find(c => c.name !== 'General');
      
      if (testCategory) {
        console.log(`🎯 Attempting to delete category: ${testCategory.name} (ID: ${testCategory.id})`);
        
        // Delete the category
        const deleteResponse = await axios.delete(`${API_BASE}/categories`, {
          headers,
          data: { 
            categoryName: testCategory.name,
            reassignTo: 'General' 
          }
        });
        console.log('✅ Delete response:', deleteResponse.data.message);
        
        // Verify deletion by listing categories again
        const updatedCategoriesResponse = await axios.get(`${API_BASE}/categories`);
        const categoryStillExists = updatedCategoriesResponse.data.categories.some(c => c.id === testCategory.id);
        
        if (categoryStillExists) {
          console.log('❌ ERROR: Category still exists after deletion!');
        } else {
          console.log('✅ SUCCESS: Category properly deleted from database');
        }
      } else {
        console.log('⚠️  No suitable test category found');
      }
    } else {
      console.log('⚠️  Not enough categories to test deletion safely');
    }
  } catch (error) {
    console.error('❌ Category deletion test failed:', error.response?.data?.message || error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Deletion Tests');
  console.log('==========================');
  console.log('⚠️  Make sure to replace AUTH_TOKEN with your actual JWT token!');
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('❌ Please update the AUTH_TOKEN in this script first!');
    console.log('💡 You can get a token by:');
    console.log('   1. Logging into the frontend');
    console.log('   2. Opening browser dev tools > Application > Local Storage');
    console.log('   3. Copy the "token" value');
    return;
  }
  
  await testUserDeletion();
  await testCategoryDeletion();
  
  console.log('\n🎉 Tests completed! Check results above.');
  console.log('💡 After running these tests, refresh your browser to verify');
  console.log('   that deleted items do not reappear (this was the original bug).');
}

runTests().catch(console.error);