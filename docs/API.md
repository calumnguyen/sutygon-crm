# Sutygon CRM API Documentation

## Overview

This document outlines the server actions and API endpoints available in the Sutygon CRM application. All endpoints are implemented using Next.js Server Actions for type safety and efficient server-side processing.

## User Management

### Get Users

```typescript
async function getUsers(): Promise<User[]>;
```

Retrieves all users from the database.

**Response:**

```typescript
type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};
```

### Create User

```typescript
async function createUser(userData: CreateUserInput): Promise<User>;
```

Creates a new user in the database.

**Input:**

```typescript
type CreateUserInput = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};
```

**Response:** Returns the created user object.

### Update User

```typescript
async function updateUser(id: string, userData: UpdateUserInput): Promise<User>;
```

Updates an existing user in the database.

**Input:**

```typescript
type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
};
```

**Response:** Returns the updated user object.

### Delete User

```typescript
async function deleteUser(id: string): Promise<void>;
```

Deletes a user from the database.

**Input:** User ID to delete.

**Response:** No content on success.

## Types

### UserRole

```typescript
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
```

### UserStatus

```typescript
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```

## Error Handling

All server actions implement consistent error handling:

```typescript
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error('Operation failed');
}
```

### Error Types

- `DrizzleQueryError`: Database query errors
- `NeonDbError`: Database connection errors
- `ValidationError`: Input validation errors

## Authentication

All endpoints require authentication. The current user's session is managed through Next.js authentication.

### Session Management

```typescript
type Session = {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- 100 requests per minute per IP
- 1000 requests per hour per user

## Caching

Responses are cached where appropriate:

- User list: 5 minutes
- User details: 1 minute
- Role-based permissions: 1 hour

## Security

### Input Validation

All inputs are validated using Zod schemas:

```typescript
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  status: z.enum(['active', 'inactive']),
});
```

### Authorization

Role-based access control is implemented:

- Admins can perform all operations
- Users can only view and update their own data

## Examples

### Creating a User

```typescript
const newUser = await createUser({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  status: 'active',
});
```

### Updating a User

```typescript
const updatedUser = await updateUser(userId, {
  name: 'John Smith',
  status: 'inactive',
});
```

### Deleting a User

```typescript
await deleteUser(userId);
```

## Best Practices

1. Always handle errors appropriately
2. Validate input data
3. Check user permissions
4. Use proper types
5. Implement proper logging
6. Cache responses when possible
7. Rate limit requests
8. Monitor performance

## Monitoring

API endpoints are monitored for:

- Response times
- Error rates
- Usage patterns
- Security incidents

## Future Improvements

1. Implement API versioning
2. Add more comprehensive logging
3. Implement request tracing
4. Add more caching strategies
5. Implement rate limiting per endpoint
6. Add more comprehensive error handling
7. Implement request validation middleware
8. Add API documentation generation
