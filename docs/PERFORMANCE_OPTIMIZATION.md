# CRM Performance Optimization Guide

## Overview
This guide outlines the performance optimizations implemented to handle 100+ customers and orders daily efficiently.

## Database Optimizations

### 🚀 Indexes Added

#### Users Table
- `users_employee_key_idx` - Employee key lookups (authentication)
- `users_status_idx` - Status filtering (active/inactive)
- `users_created_at_idx` - Creation date sorting

#### Customers Table
- `customers_phone_idx` - **CRITICAL** Phone number lookups (most frequent)
- `customers_company_idx` - Company filtering
- `customers_created_at_idx` - Creation date sorting
- `customers_active_orders_idx` - Dashboard statistics

#### Orders Table (Most Critical)
- `orders_customer_id_idx` - **CRITICAL** Customer order lookups
- `orders_order_date_idx` - Date range filtering
- `orders_expected_return_date_idx` - Overdue order detection
- `orders_status_idx` - **CRITICAL** Status filtering (Processing, Completed)
- `orders_payment_status_idx` - **CRITICAL** Payment status filtering
- `orders_customer_status_idx` - **COMPOSITE** Customer + status queries
- `orders_customer_payment_status_idx` - **COMPOSITE** Customer + payment status
- `orders_created_at_idx` - Recent orders sorting
- `orders_document_status_idx` - Document tracking

#### Order Items & Notes
- `order_items_order_id_idx` - Order details lookup
- `order_notes_order_id_idx` - Order notes lookup
- Additional indexes for inventory and item relationships

### 📊 Query Optimizations

#### Pagination & Limits
```typescript
// Before: Load all customers (slow with 1000+ customers)
const customers = await db.select().from(customers);

// After: Paginated with limits (fast)
const customers = await getAllCustomers({
  limit: 50,
  offset: 0,
  orderBy: 'createdAt',
  orderDirection: 'desc'
});
```

#### Filtered Queries
```typescript
// Optimized order queries with multiple filters
const orders = await getOrders({
  customerId: 123,
  status: ['Processing', 'Completed'],
  paymentStatus: ['Unpaid', 'Partially Paid'],
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31'),
  limit: 50
});
```

#### Specialized Queries
- `getTodaysOrders()` - Fast today's orders lookup
- `getOverdueOrders()` - Fast overdue detection
- `getOrdersByCustomer()` - Customer-specific orders

## Performance Monitoring

### 🔍 Real-time Monitoring
```typescript
import { monitorDatabaseQuery, getPerformanceRecommendations } from '@/lib/utils/performance';

// Automatic query monitoring
const customers = await monitorDatabaseQuery(
  'getAllCustomers',
  () => db.select().from(customers),
  (result) => result.length
);

// Get performance insights
const recommendations = getPerformanceRecommendations();
```

### 📈 Performance Metrics
- Query duration tracking
- Slow query detection (>1s)
- Success rate monitoring
- Record count tracking
- Performance recommendations

## Best Practices

### ✅ Query Guidelines

1. **Always use pagination** for large datasets
   ```typescript
   // Good
   getAllCustomers({ limit: 50, offset: 0 })
   
   // Bad
   getAllCustomers() // loads all records
   ```

2. **Use specific filters** to leverage indexes
   ```typescript
   // Good - uses customer_id index
   getOrders({ customerId: 123 })
   
   // Bad - full table scan
   getOrders().filter(o => o.customerId === 123)
   ```

3. **Limit result sets** even for internal queries
   ```typescript
   // Good
   getTodaysOrders() // limited to 100 records
   
   // Bad
   getOrders({ dateFrom: today }) // unlimited
   ```

### 🚫 Anti-patterns to Avoid

1. **N+1 Queries**
   ```typescript
   // Bad
   for (const order of orders) {
     const customer = await getCustomerById(order.customerId);
   }
   
   // Good - use joins or batch queries
   const ordersWithCustomers = await getOrdersWithCustomers();
   ```

2. **Client-side filtering of large datasets**
   ```typescript
   // Bad
   const allCustomers = await getAllCustomers();
   const filtered = allCustomers.filter(c => c.company === 'ABC');
   
   // Good
   const filtered = await searchCustomers('ABC', { searchBy: 'company' });
   ```

3. **Missing WHERE clauses**
   ```typescript
   // Bad
   SELECT * FROM orders ORDER BY created_at DESC;
   
   // Good
   SELECT * FROM orders WHERE status = 'Processing' ORDER BY created_at DESC LIMIT 50;
   ```

## Encryption Performance

### 🔐 Searchable vs Non-searchable Fields

#### Deterministic Encryption (Searchable)
- **Phone numbers** - Uses deterministic IV for exact matching
- Fast lookup with `customers_phone_idx`

#### Non-deterministic Encryption (Secure)
- **Names, addresses, notes** - Random IV for maximum security
- Requires client-side filtering (performance trade-off)

### 💡 Search Strategy
```typescript
// Phone search - fast (uses index)
const customer = await getCustomerByPhone('0123456789');

// Name search - slower (client-side filtering)
const customers = await searchCustomers('John', { 
  searchBy: 'name',
  limit: 10 
});
```

## Database Migration

### 🛠️ Apply Performance Indexes
```bash
# Generate migration
npm run db:generate

# Apply to database
npm run db:push
```

### 📋 Migration File
The performance indexes are in `drizzle/0007_dashing_tigra.sql`:
- 28+ indexes covering all critical query patterns
- Composite indexes for common filter combinations
- B-tree indexes optimized for PostgreSQL

## Monitoring Dashboard

### 📊 Performance Metrics
```typescript
import { performanceMonitor } from '@/lib/utils/performance';

// Get last 5 minutes of stats
const stats = performanceMonitor.getStats(300000);

console.log(`Total queries: ${stats.totalQueries}`);
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Average duration: ${stats.averageDuration}ms`);
console.log(`Slow queries: ${stats.slowQueries}`);
```

## Expected Performance

### 🎯 Target Metrics (100+ customers/orders daily)

| Operation | Target Time | Index Used |
|-----------|-------------|------------|
| Customer phone lookup | <50ms | `customers_phone_idx` |
| Customer list (50 records) | <100ms | `customers_created_at_idx` |
| Order list by customer | <100ms | `orders_customer_id_idx` |
| Order status filtering | <150ms | `orders_status_idx` |
| Today's orders | <200ms | `orders_created_at_idx` |
| Order creation | <300ms | Multiple indexes |

### 🔥 High-volume Scenarios
- **1000+ customers**: Pagination keeps queries fast
- **100+ daily orders**: Indexes prevent table scans
- **Complex filtering**: Composite indexes optimize multi-condition queries
- **Real-time updates**: Efficient single-record operations

## Troubleshooting

### 🐌 Slow Query Investigation
1. Check performance monitor logs
2. Review query execution plans
3. Verify indexes are being used
4. Consider query optimization

### 🚨 Performance Alerts
- Queries >1s are automatically logged
- Monitor success rates <95%
- Track average query duration trends
- Get automated recommendations

## Future Optimizations

### 🔮 Advanced Techniques
1. **Read replicas** for reporting queries
2. **Connection pooling** optimization
3. **Query result caching** for static data
4. **Search indexes** for encrypted text fields
5. **Materialized views** for complex aggregations

This comprehensive optimization ensures the CRM system can efficiently handle high-volume daily operations while maintaining data security through encryption. 