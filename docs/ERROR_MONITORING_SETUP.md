# Error Monitoring and Notification Setup

This guide shows you how to set up error notifications for your Vercel deployment.

## **Method 1: Vercel Dashboard Notifications (Recommended)**

### **Email Notifications**

1. Go to your **Vercel Dashboard**
2. Click on your **profile icon** (top right)
3. Go to **Settings** → **Notifications**
4. Enable notifications for:
   - ✅ **Function Errors**
   - ✅ **Deployment Failures**
   - ✅ **Performance Issues**

### **Slack Integration**

1. In **Settings** → **Integrations**
2. Click **Add Integration**
3. Select **Slack**
4. Choose your workspace and channel
5. Configure what to notify about:
   - ✅ Function errors
   - ✅ Deployment status
   - ✅ Performance alerts

## **Method 2: Custom Webhook Notifications**

### **1. Create a Slack Webhook**

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or use existing one
3. Go to **Incoming Webhooks**
4. Click **Add New Webhook to Workspace**
5. Choose a channel (e.g., #alerts)
6. Copy the webhook URL

### **2. Set Environment Variable**

Add this to your `.env` file:

```bash
ERROR_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

### **3. Deploy to Vercel**

```bash
# Add the environment variable to Vercel
vercel env add ERROR_WEBHOOK_URL

# Deploy
vercel --prod
```

## **Method 3: Vercel CLI Alerts**

### **View Logs in Real-time**

```bash
# Follow logs in real-time
vercel logs --follow

# View logs for specific function
vercel logs --function=/api/inventory

# View logs for recent time period
vercel logs --since=1h
```

### **Set Up Webhook Alerts**

```bash
# Add webhook for function errors
vercel webhook add --url https://your-webhook-url.com/vercel-alerts --events function-error

# Add webhook for deployment failures
vercel webhook add --url https://your-webhook-url.com/vercel-alerts --events deployment-failed
```

## **Method 4: Third-party Monitoring Services**

### **Sentry Integration**

1. Create account at [sentry.io](https://sentry.io)
2. Add Sentry to your project:
   ```bash
   npm install @sentry/nextjs
   ```
3. Configure in `next.config.mjs`:

   ```javascript
   const { withSentryConfig } = require('@sentry/nextjs');

   module.exports = withSentryConfig({
     // your existing config
   });
   ```

### **LogRocket Integration**

1. Create account at [logrocket.com](https://logrocket.com)
2. Add LogRocket to your project:
   ```bash
   npm install logrocket
   ```
3. Initialize in your app:
   ```javascript
   import LogRocket from 'logrocket';
   LogRocket.init('your-app-id');
   ```

## **Error Severity Levels**

The error monitoring system categorizes errors by severity:

- **🔴 Critical**: Authentication failures, security issues
- **🟠 High**: Database connection errors, API failures
- **🟡 Medium**: Inventory operation errors, validation failures
- **🟢 Low**: Non-critical warnings, info messages

## **Example Error Notifications**

### **Slack Notification Format**

```
🚨 **Error Alert** - HIGH

**Request ID:** inv-1234567890-abc123
**Operation:** inventory_item_creation
**Error:** Failed query: select "tags"."name" from "inventory_tags"...
**Environment:** production
**Timestamp:** 2025-08-11T17:00:00.000Z

**User:** Kim Anh (user)
**Endpoint:** /api/inventory

**Stack Trace:**
```

Error: Failed query: select "tags"."name" from "inventory_tags"...
at buildItemDocument (/var/task/.next/server/chunks/9273.js:8:36467)

````

### **Email Notification Format**
- **Subject**: `[ERROR] High severity error in production`
- **Body**: Similar to Slack format with full error details

## **Monitoring Best Practices**

### **1. Set Up Different Channels**
- **#alerts-critical**: Critical and high severity errors
- **#alerts-general**: Medium and low severity errors
- **#deployments**: Deployment status updates

### **2. Configure Alert Thresholds**
- **Immediate**: Critical errors
- **5 minutes**: High severity errors
- **15 minutes**: Medium severity errors
- **1 hour**: Low severity errors

### **3. Set Up Escalation**
- **Primary**: On-call engineer
- **Secondary**: Team lead
- **Tertiary**: Project manager

### **4. Regular Review**
- **Daily**: Check error trends
- **Weekly**: Review error patterns
- **Monthly**: Update monitoring rules

## **Troubleshooting**

### **Webhook Not Working**
1. Check webhook URL is correct
2. Verify Slack app permissions
3. Test webhook manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test message"}' \
     https://hooks.slack.com/services/YOUR/WEBHOOK/URL
````

### **Too Many Notifications**

1. Adjust severity thresholds
2. Filter by specific error types
3. Set up notification schedules

### **Missing Notifications**

1. Check Vercel function logs
2. Verify environment variables
3. Test error monitoring manually

## **Cost Considerations**

- **Vercel Logs**: Free tier includes 100GB/month
- **Slack Webhooks**: Free for basic usage
- **Sentry**: Free tier includes 5,000 errors/month
- **LogRocket**: Free tier includes 1,000 sessions/month

Choose the monitoring solution that fits your budget and needs!
