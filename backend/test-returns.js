const fetch = require('node-fetch');

async function testReturnsAPI() {
  const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZ29ydHVuZXRpbGVzLmNvbSIsInJvbGUiOiJvd25lciIsImxvY2F0aW9uSWQiOjEsImlhdCI6MTc1NzkzMTcxOCwiZXhwIjoxNzU4MDE4MTE4fQ.ZdsVYkzSZiUb3W_IykMI4ELeW-BwyOWFLwd38ZdDpCA';
  
  const testReturn = {
    saleId: '36',
    type: 'REFUND',
    reason: 'Test return',
    items: [
      {
        saleItemId: 52,
        productId: 15,
        quantity: '1.00',
        unitPrice: '29999.99'
      }
    ]
  };

  try {
    console.log('Testing returns API...');
    console.log('Test data:', JSON.stringify(testReturn, null, 2));
    
    const response = await fetch('http://localhost:5000/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify(testReturn)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testReturnsAPI();
