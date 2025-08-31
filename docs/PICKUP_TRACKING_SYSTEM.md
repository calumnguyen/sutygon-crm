# Pickup Tracking System Documentation

## Overview

The pickup tracking system allows customers to pick up their order items individually rather than all at once. Each order item can be tracked for pickup status, return status, and the employees who processed these actions.

## Database Schema

### Order Items Table Extensions

The `order_items` table has been extended with the following fields:

#### Pickup Tracking Fields

- `pickup_status` (VARCHAR(20), NOT NULL, DEFAULT 'pending')
  - Tracks the pickup status of the item
  - Possible values: 'pending', 'picked_up', 'cancelled'
- `picked_up_at` (TIMESTAMP, NULLABLE)
  - Records the exact date and time when the item was picked up
- `picked_up_by_user_id` (INTEGER, NULLABLE)
  - Foreign key reference to the `users` table
  - Records which employee processed the pickup

#### Return Tracking Fields (Future Use)

- `return_status` (VARCHAR(20), NOT NULL, DEFAULT 'pending')
  - Tracks the return status of the item
  - Possible values: 'pending', 'returned', 'overdue'
- `returned_at` (TIMESTAMP, NULLABLE)
  - Records the exact date and time when the item was returned
- `returned_by_user_id` (INTEGER, NULLABLE)
  - Foreign key reference to the `users` table
  - Records which employee processed the return

### Database Constraints and Indexes

#### Foreign Key Constraints

```sql
-- Links pickup processor to users table
order_items_picked_up_by_user_id_fkey
FOREIGN KEY (picked_up_by_user_id) REFERENCES users(id)

-- Links return processor to users table
order_items_returned_by_user_id_fkey
FOREIGN KEY (returned_by_user_id) REFERENCES users(id)
```

#### Performance Indexes

```sql
-- Pickup tracking indexes
idx_order_items_pickup_status ON order_items(pickup_status)
idx_order_items_picked_up_at ON order_items(picked_up_at)
idx_order_items_picked_up_by_user_id ON order_items(picked_up_by_user_id)

-- Return tracking indexes
idx_order_items_return_status ON order_items(return_status)
idx_order_items_returned_at ON order_items(returned_at)
idx_order_items_returned_by_user_id ON order_items(returned_by_user_id)
```

## Status Values

### Pickup Status

- `pending` - Item is ready for pickup but not yet picked up
- `picked_up` - Item has been successfully picked up by customer
- `cancelled` - Pickup was cancelled (item no longer available)

### Return Status

- `pending` - Item is out with customer, not yet returned
- `returned` - Item has been successfully returned
- `overdue` - Item is past its expected return date

## Business Logic

### Pickup Process

1. Customer places an order with multiple items
2. All items start with `pickup_status = 'pending'`
3. Customer can pick up items individually
4. When an item is picked up:
   - `pickup_status` is set to `'picked_up'`
   - `picked_up_at` is set to current timestamp
   - `picked_up_by_user_id` is set to the processing employee's ID

### Return Process (Future Implementation)

1. When an item is returned:
   - `return_status` is set to `'returned'`
   - `returned_at` is set to current timestamp
   - `returned_by_user_id` is set to the processing employee's ID

## API Endpoints (To Be Implemented)

### Pickup Management

```
POST /api/orders/{orderId}/items/{itemId}/pickup
- Mark an item as picked up
- Body: { "employeeId": number }

GET /api/orders/{orderId}/pickup-status
- Get pickup status for all items in an order

PUT /api/orders/{orderId}/items/{itemId}/pickup-status
- Update pickup status of a specific item
```

### Return Management (Future)

```
POST /api/orders/{orderId}/items/{itemId}/return
- Mark an item as returned
- Body: { "employeeId": number }

GET /api/orders/{orderId}/return-status
- Get return status for all items in an order
```

## Database Queries

### Common Queries

#### Get all pending pickups for an order

```sql
SELECT oi.*, u.name as employee_name
FROM order_items oi
LEFT JOIN users u ON oi.picked_up_by_user_id = u.id
WHERE oi.order_id = ? AND oi.pickup_status = 'pending'
ORDER BY oi.created_at;
```

#### Get pickup history for an order

```sql
SELECT oi.*, u.name as picked_up_by_name
FROM order_items oi
LEFT JOIN users u ON oi.picked_up_by_user_id = u.id
WHERE oi.order_id = ?
ORDER BY oi.picked_up_at DESC;
```

#### Get items picked up by a specific employee

```sql
SELECT oi.*, o.order_date, c.name as customer_name
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oi.picked_up_by_user_id = ?
ORDER BY oi.picked_up_at DESC;
```

#### Get overdue returns (future use)

```sql
SELECT oi.*, o.expected_return_date, c.name as customer_name
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oi.return_status = 'pending'
  AND o.expected_return_date < NOW()
ORDER BY o.expected_return_date;
```

## UI Components (To Be Implemented)

### Order Item Pickup Status

- Visual indicators for pickup status (pending, picked up, cancelled)
- Employee name who processed the pickup
- Pickup timestamp
- Action buttons for employees to mark items as picked up

### Pickup Management Dashboard

- List of orders with pending pickups
- Filter by date range, customer, or employee
- Bulk pickup operations
- Pickup history and reports

## Migration History

### Initial Implementation

- **Date**: [Current Date]
- **SQL Command**: Added pickup and return tracking fields to `order_items` table
- **Files Modified**:
  - Database schema extended
  - Foreign key constraints added
  - Performance indexes created

## Future Enhancements

### Planned Features

1. **Return Tracking**: Full implementation of return status tracking
2. **Pickup Notifications**: Email/SMS notifications for pending pickups
3. **Pickup Scheduling**: Allow customers to schedule pickup times
4. **Pickup Reports**: Analytics on pickup patterns and employee performance
5. **Partial Payment**: Handle partial payments for partial pickups

### Technical Improvements

1. **API Rate Limiting**: Implement rate limiting for pickup operations
2. **Audit Trail**: Complete audit trail for all pickup/return actions
3. **Data Validation**: Enhanced validation for pickup status transitions
4. **Performance Optimization**: Query optimization for large datasets

## Security Considerations

### Access Control

- Only authorized employees can mark items as picked up
- Employee ID must be validated against active users
- Audit trail for all pickup operations

### Data Integrity

- Foreign key constraints prevent orphaned records
- Status transitions should be validated (e.g., can't mark as picked up if already picked up)
- Timestamp validation to prevent future dates

## Testing

### Unit Tests

- Pickup status transitions
- Employee validation
- Timestamp handling
- Foreign key constraints

### Integration Tests

- API endpoint functionality
- Database transaction handling
- Error handling and edge cases

### Manual Testing Scenarios

1. Customer picks up all items at once
2. Customer picks up items individually over multiple visits
3. Employee marks wrong item as picked up (error handling)
4. System handles concurrent pickup operations
5. Pickup operations with invalid employee IDs

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**: Ensure employee ID exists in users table
2. **Status Inconsistencies**: Validate status transitions
3. **Timestamp Issues**: Handle timezone considerations
4. **Performance**: Monitor query performance with large datasets

### Debug Queries

```sql
-- Check for orphaned pickup records
SELECT oi.* FROM order_items oi
LEFT JOIN users u ON oi.picked_up_by_user_id = u.id
WHERE oi.picked_up_by_user_id IS NOT NULL AND u.id IS NULL;

-- Check for invalid status values
SELECT DISTINCT pickup_status FROM order_items
WHERE pickup_status NOT IN ('pending', 'picked_up', 'cancelled');
```

## Related Documentation

- [Order Management System](./ORDER_TRACKING_SYSTEM.md)
- [User Management](./API.md)
- [Database Schema](./ARCHITECTURE.md)
