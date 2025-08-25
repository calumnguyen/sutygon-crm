# Typesense Sync Setup

## Overview

This document describes the Typesense sync functionality that has been added to the store settings, including manual sync capabilities and automated daily sync via cron jobs.

## Features

### Manual Sync
- **Location**: Store Settings page (`/store-settings`)
- **Button**: "Đồng Bộ Ngay" (Sync Now)
- **Progress**: Real-time progress indication with loading spinner
- **Status**: Shows sync success/error messages
- **Stats**: Displays database vs Typesense item counts

### Automated Daily Sync
- **Schedule**: Every day at 6:00 AM Vietnam time (UTC+7)
- **Endpoint**: `/api/cron/typesense-sync`
- **Authentication**: Handled automatically by Vercel

## API Endpoints

### Manual Sync
- **POST** `/api/store-settings/typesense-sync`
  - Triggers manual sync of all inventory items
  - Returns sync status and count

- **GET** `/api/store-settings/typesense-sync`
  - Returns Typesense connection status and statistics
  - Shows database vs Typesense item counts

### Cron Job
- **GET** `/api/cron/typesense-sync`
  - Automated sync endpoint for cron jobs
  - Authentication handled automatically by Vercel

## Environment Variables

Add these to your `.env` file:

```env
# Typesense Configuration
TYPESENSE_HOST=your-typesense-host
TYPESENSE_API_KEY=your-typesense-api-key
```

## Vercel Cron Job Setup

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/typesense-sync",
      "schedule": "0 23 * * *"
    }
  ]
}
```

**Schedule Explanation**: `0 23 * * *` means:
- `0` - At minute 0
- `23` - At hour 23 (11 PM UTC)
- `*` - Every day of the month
- `*` - Every month
- `*` - Every day of the week

**Note**: Vercel cron jobs run in UTC time. Since Vietnam is UTC+7, 11 PM UTC = 6 AM Vietnam time (next day).

## Manual Setup Steps

1. **Add Environment Variables**:
   - Ensure Typesense credentials are configured in Vercel

2. **Deploy to Vercel**:
   - The cron job will be automatically set up when you deploy

3. **Verify Setup**:
   - Check the Store Settings page for the Typesense sync card
   - Test manual sync functionality
   - Monitor Vercel logs for cron job execution

## Monitoring

### Manual Sync
- Check the Store Settings page for sync status
- Look for success/error messages in the UI
- Monitor browser console for detailed logs

### Automated Sync
- Check Vercel function logs for cron job execution
- Monitor Typesense collection statistics
- Set up alerts for sync failures

## Troubleshooting

### Manual Sync Issues
1. **Typesense Connection Failed**:
   - Check `TYPESENSE_HOST` and `TYPESENSE_API_KEY`
   - Verify Typesense service is running
   - Check network connectivity

2. **Sync Errors**:
   - Check browser console for detailed error messages
   - Verify database connection
   - Check Typesense collection schema

### Cron Job Issues
1. **Cron Not Running**:
   - Check Vercel function logs
   - Ensure deployment includes `vercel.json`
   - Verify cron job is enabled in Vercel dashboard

2. **Authentication Errors**:
   - Vercel handles authentication automatically
   - Check Vercel function logs for any issues

## Security Considerations

- **Typesense API Key**: Keep secure and rotate regularly
- **Access Control**: Only admin users can trigger manual sync
- **Rate Limiting**: Consider implementing rate limits for manual sync
- **Vercel Cron Security**: Vercel automatically secures cron job requests

## Performance Notes

- **Bulk Operations**: Sync uses bulk indexing for efficiency
- **Error Handling**: Individual item failures don't stop the entire sync
- **Retry Logic**: Built-in retry mechanism for connection issues
- **Progress Tracking**: Real-time feedback for manual sync operations
