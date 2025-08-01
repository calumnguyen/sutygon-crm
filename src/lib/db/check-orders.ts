import { db } from './index';
import { orders } from './schema';

async function checkOrders() {
  try {
    console.log('Checking all orders in database...');
    
    const allOrders = await db.select().from(orders);
    
    console.log(`Found ${allOrders.length} orders:`);
    allOrders.forEach(order => {
      console.log(`- Order ID: ${order.id}, Status: ${order.status}, Customer ID: ${order.customerId}`);
    });
    
    if (allOrders.length === 0) {
      console.log('No orders found in database!');
    }
    
  } catch (error) {
    console.error('Error checking orders:', error);
  }
}

checkOrders(); 