# Vercel Logging Guide

This guide ensures all logs are properly captured by Vercel's logging system.

## **How Vercel Logging Works**

Vercel automatically captures:

- `console.log()` - Info level logs
- `console.warn()` - Warning level logs
- `console.error()` - Error level logs
- `console.info()` - Info level logs

## **Log Levels in Vercel**

### **Error Level (console.error)**

- Critical errors
- Authentication failures
- Database connection issues
- High severity issues

### **Warning Level (console.warn)**

- Non-critical warnings
- Performance issues
- Deprecated features
- Medium severity issues

### **Info Level (console.log)**

- General information
- Success messages
- Performance metrics
- Low severity issues

## **Log Format for Vercel**

### **Structured Logging**

```javascript
// ✅ Good - Structured logging
console.log(`[${requestId}] ✅ Operation completed`, {
  userId: 123,
  duration: 150,
  timestamp: new Date().toISOString(),
  operation: 'session_validation',
});

// ❌ Bad - Unstructured logging
console.log('Operation completed for user 123');
```

### **Request ID Correlation**

```javascript
// ✅ Good - Request ID for correlation
const requestId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log(`[${requestId}] 🔐 Session validation started`);

// ❌ Bad - No request ID
console.log('Session validation started');
```

## **Vercel Logger Usage**

### **Creating a Logger**

```javascript
import { createLogger } from '@/lib/utils/vercelLogger';

const requestId = `operation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const logger = createLogger(requestId);
```

### **Logging Different Operations**

```javascript
// Info logging
logger.info('Operation started', { userId: 123 });

// Success logging
logger.success('Operation completed', { userId: 123, duration: 150 });

// Warning logging
logger.warn('Operation slow', { duration: 2000 });

// Error logging
logger.error('Operation failed', error, { userId: 123 });

// Performance logging
logger.performance('Operation completed', 150, { userId: 123 });

// Specialized logging
logger.auth('Authentication check');
logger.db('Database query');
logger.session('Session validation');
logger.connection('Connection check');
logger.inventory('Inventory operation');
```

## **Viewing Logs in Vercel**

### **Method 1: Vercel Dashboard**

1. Go to your project in Vercel Dashboard
2. Click on **Functions**
3. Click on the specific function (e.g., `/api/auth/validate-session`)
4. View the **Logs** section

### **Method 2: Vercel CLI**

```bash
# View logs for a specific deployment
vercel logs DEPLOYMENT_URL

# View logs as JSON
vercel logs DEPLOYMENT_URL --json

# Filter logs with JQ
vercel logs DEPLOYMENT_URL --json | jq 'select(.level == "error")'
```

### **Method 3: Real-time Logs**

```bash
# Follow logs in real-time (5 minutes max)
vercel logs DEPLOYMENT_URL
```

## **Log Examples**

### **Session Validation Logs**

```
[session-validate-1234567890-abc123] 🔐 Session validation started
[session-validate-1234567890-abc123] 📋 Request data received { hasSessionToken: true, tokenLength: 64 }
[session-validate-1234567890-abc123] 🔍 Validating session token
[session-validate-1234567890-abc123] ✅ Session validation successful { userId: 14, userName: "Kim Anh", userRole: "user" }
[session-validate-1234567890-abc123] ⚡ Session validation completed (150ms) { userId: 14, duration: 150 }
```

### **Error Logs**

```
[session-validate-1234567890-abc123] ❌ Session validation failed { error: "Database connection failed", duration: 5000 }
[session-validate-1234567890-abc123] ❌ HIGH ERROR - session_validation { severity: "high", operation: "session_validation" }
```

### **Performance Logs**

```
[session-validate-1234567890-abc123] ⏱️ SLOW OPERATION: Session validation completed (2000ms) { duration: 2000 }
[session-validate-1234567890-abc123] 🐌 SLOW OPERATION: Session validation completed (8000ms) { duration: 8000 }
```

## **Searching and Filtering Logs**

### **Search by Request ID**

```bash
# Find all logs for a specific request
vercel logs DEPLOYMENT_URL --json | jq 'select(.message | contains("session-validate-1234567890-abc123"))'
```

### **Search by Error Level**

```bash
# Find all error logs
vercel logs DEPLOYMENT_URL --json | jq 'select(.level == "error")'
```

### **Search by Operation**

```bash
# Find all session validation logs
vercel logs DEPLOYMENT_URL --json | jq 'select(.message | contains("session_validation"))'
```

### **Search by Time**

```bash
# Find logs from specific time period
vercel logs DEPLOYMENT_URL --json | jq 'select(.timestamp | contains("2025-08-11T17:"))'
```

## **Log Retention**

- **Vercel Logs**: Retained for 30 days
- **Function Logs**: Available for all deployments
- **Real-time Logs**: Available for 5 minutes after deployment

## **Best Practices**

### **1. Always Use Request IDs**

```javascript
// ✅ Good
const requestId = `operation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log(`[${requestId}] Operation started`);

// ❌ Bad
console.log('Operation started');
```

### **2. Use Structured Logging**

```javascript
// ✅ Good
console.log(`[${requestId}] ✅ Success`, {
  userId: 123,
  operation: 'login',
  duration: 150,
  timestamp: new Date().toISOString(),
});

// ❌ Bad
console.log('User 123 logged in successfully');
```

### **3. Use Appropriate Log Levels**

```javascript
// ✅ Good
console.error(`[${requestId}] ❌ Critical error`, error);
console.warn(`[${requestId}] ⚠️ Warning message`);
console.log(`[${requestId}] ℹ️ Info message`);

// ❌ Bad
console.log('Critical error occurred');
```

### **4. Include Context**

```javascript
// ✅ Good
logger.error('Database connection failed', error, {
  userId: 123,
  operation: 'session_validation',
  endpoint: '/api/auth/validate-session',
  timestamp: new Date().toISOString(),
});

// ❌ Bad
console.error('Error occurred');
```

### **5. Performance Tracking**

```javascript
// ✅ Good
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;
logger.performance('Operation completed', duration, { userId: 123 });

// ❌ Bad
console.log('Operation completed');
```

## **Troubleshooting**

### **Logs Not Showing**

1. Check if you're using `console.log`, `console.error`, `console.warn`
2. Ensure logs are in server-side code (API routes, server components)
3. Check Vercel deployment status
4. Verify function is being called

### **Logs Too Verbose**

1. Use appropriate log levels
2. Filter logs by severity
3. Use request IDs to focus on specific operations

### **Performance Issues**

1. Monitor slow operations (>1000ms)
2. Track database query performance
3. Monitor connection pool usage

## **Monitoring Setup**

### **Error Alerts**

```bash
# Set up webhook for errors
vercel webhook add --url https://hooks.slack.com/services/YOUR/WEBHOOK --events function-error
```

### **Performance Alerts**

```bash
# Monitor slow functions
vercel logs DEPLOYMENT_URL --json | jq 'select(.message | contains("SLOW OPERATION"))'
```

### **Custom Monitoring**

```javascript
// Log to external service
if (process.env.NODE_ENV === 'production') {
  // Send to monitoring service
  await sendToMonitoringService(logData);
}
```

This ensures all your logs are properly captured and visible in Vercel's logging system!
