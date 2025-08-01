# Database Index Maintenance Guide

## Overview
The performance optimization system is designed to be **automatically maintainable** and **easily extensible**. Here's how it works:

## 🔄 Automatic Index Management

### **Declarative Schema Approach**
Indexes are defined directly in the schema using Drizzle's declarative syntax:

```typescript
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 255 }).notNull().unique(),
  company: varchar('company', { length: 255 }),
  // NEW FIELD - just add it here
  customerType: varchar('customer_type', { length: 50 }),
}, (table) => {
  return {
    // Existing indexes
    phoneIdx: index('customers_phone_idx').on(table.phone),
    companyIdx: index('customers_company_idx').on(table.company),
    createdAtIdx: index('customers_created_at_idx').on(table.createdAt),
    
    // NEW INDEX - just add it here
    customerTypeIdx: index('customers_customer_type_idx').on(table.customerType),
  };
});
```

### **Automatic Migration Generation**
When you add new fields or indexes:

1. **Add field + index** to schema
2. **Run**: `npm run db:generate`
3. **Apply**: `npm run db:push`

✅ **That's it!** Drizzle automatically:
- Detects schema changes
- Generates migration SQL
- Creates/drops indexes as needed

## 📝 Adding New Fields & Indexes

### **Example 1: Adding Customer Rating**

```typescript
// 1. Add to schema
export const customers = pgTable('customers', {
  // ... existing fields ...
  customerRating: integer('customer_rating').default(0),
  lastOrderDate: timestamp('last_order_date'),
}, (table) => {
  return {
    // ... existing indexes ...
    
    // 2. Add new indexes for filtering/sorting
    ratingIdx: index('customers_rating_idx').on(table.customerRating),
    lastOrderIdx: index('customers_last_order_idx').on(table.lastOrderDate),
    
    // 3. Composite index for complex queries
    ratingDateIdx: index('customers_rating_date_idx').on(table.customerRating, table.lastOrderDate),
  };
});
```

```bash
# 4. Generate & apply
npm run db:generate
npm run db:push
```

### **Example 2: Adding Order Priority**

```typescript
export const orders = pgTable('orders', {
  // ... existing fields ...
  priority: varchar('priority', { length: 20 }).default('normal'), // high, normal, low
  urgentFlag: boolean('urgent_flag').default(false),
}, (table) => {
  return {
    // ... existing indexes ...
    
    // New indexes for priority filtering
    priorityIdx: index('orders_priority_idx').on(table.priority),
    urgentIdx: index('orders_urgent_idx').on(table.urgentFlag),
    
    // Composite for priority + status queries
    priorityStatusIdx: index('orders_priority_status_idx').on(table.priority, table.status),
  };
});
```

## 🚀 Extending Query Functions

### **Automatic Query Extension**
Once indexes are added, extend the query functions:

```typescript
// In src/lib/actions/customers.ts
export async function getAllCustomers(options?: {
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'createdAt' | 'activeOrdersCount' | 'customerRating'; // Add new field
  orderDirection?: 'asc' | 'desc';
  customerType?: string; // Add filtering
  minRating?: number;    // Add filtering
}) {
  const { 
    limit = 50, 
    offset = 0, 
    orderBy = 'createdAt', 
    orderDirection = 'desc',
    customerType,
    minRating
  } = options || {};

  const conditions = [];
  
  // Add new filter conditions
  if (customerType) {
    conditions.push(eq(customers.customerType, customerType));
  }
  
  if (minRating) {
    conditions.push(gte(customers.customerRating, minRating));
  }

  // The existing query structure handles everything else automatically
  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  
  const dbCustomers = await db
    .select()
    .from(customers)
    .where(whereCondition)
    .orderBy(orderFunc(orderColumn))
    .limit(limit)
    .offset(offset);
    
  return dbCustomers.map(customer => decryptCustomerData(customer));
}
```

## 📊 Index Strategy Guidelines

### **When to Add Indexes**

#### ✅ **Always Index These**
```typescript
// 1. Foreign keys (automatic performance boost)
customerId: integer('customer_id').references(() => customers.id),
// Auto-index: orders_customer_id_idx

// 2. Status/enum fields (filtering)
status: varchar('status', { length: 50 }),
// Add: orders_status_idx

// 3. Date fields (sorting/filtering)
createdAt: timestamp('created_at'),
// Add: orders_created_at_idx

// 4. Boolean flags (filtering)
isUrgent: boolean('is_urgent'),
// Add: orders_urgent_idx
```

#### ✅ **Consider Composite Indexes For**
```typescript
// Common query patterns
// "Get orders by customer with specific status"
customerStatusIdx: index('orders_customer_status_idx').on(table.customerId, table.status),

// "Get customers by type and rating"
typeRatingIdx: index('customers_type_rating_idx').on(table.customerType, table.customerRating),
```

#### ❌ **Don't Index These**
```typescript
// 1. Large text fields (notes, descriptions)
notes: text('notes'), // No index needed

// 2. Frequently updated fields with many unique values
lastUpdatedBy: text('last_updated_by'), // Too many unique values

// 3. Fields you never filter/sort by
internalNotes: text('internal_notes'), // Never queried
```

## 🔧 Migration Management

### **Safe Migration Process**
```bash
# 1. Always generate first (doesn't touch database)
npm run db:generate

# 2. Review the generated SQL file
cat drizzle/0008_new_migration.sql

# 3. Apply when ready
npm run db:push
```

### **Index Creation is Non-blocking**
```sql
-- Drizzle automatically uses CONCURRENT for index creation
CREATE INDEX CONCURRENTLY "customers_rating_idx" ON "customers" ("customer_rating");
```

✅ **No downtime** - indexes are created in background
✅ **No table locks** - application keeps running

## 📈 Performance Monitoring Integration

### **Automatic Monitoring Extension**
New queries automatically get monitored:

```typescript
// Performance monitoring works automatically
const customers = await monitorDatabaseQuery(
  'getCustomersByRating',
  () => getAllCustomers({ minRating: 4, customerType: 'premium' }),
  (result) => result.length
);

// Automatic slow query detection
// Automatic performance recommendations
```

## 🔄 Real-world Update Scenarios

### **Scenario 1: Adding Customer Segmentation**
```typescript
// 1. Schema update
segment: varchar('segment', { length: 30 }), // vip, standard, basic
segmentScore: integer('segment_score'),

// 2. Index addition
segmentIdx: index('customers_segment_idx').on(table.segment),
segmentScoreIdx: index('customers_segment_score_idx').on(table.segmentScore),

// 3. Query extension (automatic)
getAllCustomers({ segment: 'vip', minSegmentScore: 80 })
```

### **Scenario 2: Adding Order Tracking**
```typescript
// 1. Schema update
trackingNumber: varchar('tracking_number', { length: 100 }),
carrierType: varchar('carrier_type', { length: 50 }),
estimatedDelivery: timestamp('estimated_delivery'),

// 2. Index addition
trackingIdx: index('orders_tracking_idx').on(table.trackingNumber),
carrierIdx: index('orders_carrier_idx').on(table.carrierType),
deliveryIdx: index('orders_delivery_idx').on(table.estimatedDelivery),

// 3. Query extension (automatic)
getOrders({ carrierType: 'express', deliveryBefore: tomorrow })
```

## ✅ **Key Benefits**

1. **Zero-effort maintenance** - Drizzle handles everything
2. **Automatic migration generation** - No manual SQL writing
3. **Non-blocking index creation** - No downtime
4. **Performance monitoring integration** - Automatic query tracking
5. **Type-safe schema evolution** - TypeScript catches errors
6. **Rollback capability** - Easy to revert changes

## 🎯 **Best Practices Summary**

1. **Always add indexes** when adding filterable/sortable fields
2. **Use composite indexes** for common multi-field queries
3. **Test locally first** with `db:generate` before `db:push`
4. **Monitor performance** after adding new fields
5. **Keep index names descriptive** for easy maintenance

The system is designed to grow with your needs - adding new fields and optimizations is as simple as updating the schema and running two commands! 🚀 