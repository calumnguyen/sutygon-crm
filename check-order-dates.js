// Check order dates for existing order
const { db } = require('./src/lib/db/index.ts');
const { orders, orderItems } = require('./src/lib/db/schema.ts');

async function checkOrderDates() {
  try {
    console.log('Checking order dates...');
    
    const allOrders = await db.select().from(orders);
    console.log('\nAll orders:');
    allOrders.forEach(order => {
      console.log(`Order ${order.id}: ${order.orderDate} to ${order.expectedReturnDate}`);
    });
    
    // Check the specific order that has the item
    const order65 = allOrders.find(o => o.id === 65);
    if (order65) {
      console.log('\nOrder 65 details:', order65);
    }
    
    // Check order items
    const allOrderItems = await db.select().from(orderItems);
    console.log('\nOrder items with inventory:');
    allOrderItems.filter(item => item.inventoryItemId !== null).forEach(item => {
      console.log(`Order item ${item.id} (Order ${item.orderId}): inventoryItemId=${item.inventoryItemId}, quantity=${item.quantity}`);
    });
    
    // Test the overlap calculation
    const fromDate = new Date('2025-07-28T17:00:00.000Z');
    const toDate = new Date('2025-08-01T17:00:00.000Z');
    
    console.log('\nTesting overlap with date range:', fromDate, 'to', toDate);
    
    allOrders.forEach(order => {
      const orderStart = new Date(order.orderDate);
      const orderEnd = new Date(order.expectedReturnDate);
      const startsBeforeEnd = orderStart <= toDate;
      const endsAfterStart = orderEnd >= fromDate;
      const overlaps = startsBeforeEnd && endsAfterStart;
      
      console.log(`Order ${order.id}: ${orderStart} to ${orderEnd} - overlaps: ${overlaps}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.disconnect();
    process.exit(0);
  }
}

checkOrderDates(); 