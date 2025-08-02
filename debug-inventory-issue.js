// Debug script to check inventory calculation
const testInventoryCalculation = async () => {
  try {
    console.log('=== Testing Inventory Calculation ===');
    
    // Test the inventory search API with date range
    const dateFrom = '2025-01-07T17:00:00.000Z';
    const dateTo = '2025-01-10T17:00:00.000Z';
    
    const url = `/api/inventory/search?q=&page=1&limit=100&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response:', data);
    
    // Find the specific item
    const targetItem = data.items.find(item => item.name === 'Áo dài kim cương');
    if (targetItem) {
      console.log('Found target item:', targetItem);
      const sizeS = targetItem.sizes.find(s => s.title === 's');
      if (sizeS) {
        console.log('Size S details:', sizeS);
      }
    }
    
    // Also check all orders and order items
    const ordersResponse = await fetch('/api/orders');
    const ordersData = await ordersResponse.json();
    console.log('All orders:', ordersData);
    
  } catch (error) {
    console.error('Error testing inventory:', error);
  }
};

// Run the test
testInventoryCalculation(); 