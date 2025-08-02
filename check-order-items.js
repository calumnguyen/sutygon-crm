// Check order items in database
const { db } = require('./src/lib/db');
const { orderItems, orders } = require('./src/lib/db/schema');

async function checkOrderItems() {
  try {
    console.log('=== Checking Order Items ===');
    
    // Get all order items
    const allOrderItems = await db.select().from(orderItems);
    console.log('Total order items:', allOrderItems.length);
    
    // Check how many have inventoryItemId
    const withInventory = allOrderItems.filter(item => item.inventoryItemId !== null);
    const customItems = allOrderItems.filter(item => item.inventoryItemId === null);
    
    console.log('Order items with inventoryItemId:', withInventory.length);
    console.log('Custom order items:', customItems.length);
    
    if (withInventory.length > 0) {
      console.log('Sample items with inventory:', withInventory.slice(0, 3));
    }
    
    if (customItems.length > 0) {
      console.log('Sample custom items:', customItems.slice(0, 3));
    }
    
    // Check orders
    const allOrders = await db.select().from(orders);
    console.log('Total orders:', allOrders.length);
    
    if (allOrders.length > 0) {
      console.log('Sample orders:', allOrders.slice(0, 3).map(o => ({
        id: o.id,
        orderDate: o.orderDate,
        expectedReturnDate: o.expectedReturnDate,
        status: o.status
      })));
    }
    
  } catch (error) {
    console.error('Error checking order items:', error);
  }
}

checkOrderItems(); 