interface ErrorNotification {
  timestamp: string;
  requestId: string;
  error: string;
  stack?: string;
  context: {
    user?: {
      id?: number;
      name?: string;
      role?: string;
    };
    operation: string;
    endpoint?: string;
    requestData?: Record<string, unknown>;
  };
  environment: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorMonitor {
  private webhookUrl?: string;
  private isEnabled: boolean = true;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || process.env.ERROR_WEBHOOK_URL;
    this.isEnabled = process.env.NODE_ENV === 'production' || !!this.webhookUrl;
  }

  async logError(
    requestId: string,
    error: Error | string,
    context: {
      user?: { id?: number; name?: string; role?: string };
      operation: string;
      endpoint?: string;
      requestData?: Record<string, unknown>;
    },
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    const errorNotification: ErrorNotification = {
      timestamp: new Date().toISOString(),
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      environment: process.env.NODE_ENV || 'development',
      severity,
    };

    // Always log to console for Vercel to capture
    const logMessage = `[${requestId}] ❌ ${severity.toUpperCase()} ERROR - ${context.operation}`;
    const logData: Record<string, unknown> = {
      ...errorNotification,
      // Ensure this shows up in Vercel logs
      vercelLogLevel: severity === 'critical' || severity === 'high' ? 'error' : 'warn',
      timestamp: new Date().toISOString(),
    };

    // Use appropriate console method for Vercel logging
    if (severity === 'critical' || severity === 'high') {
      console.error(logMessage, logData);
    } else if (severity === 'medium') {
      console.warn(logMessage, logData);
    } else {
      console.log(logMessage, logData);
    }

    // Send notification if enabled
    if (this.isEnabled && this.webhookUrl) {
      await this.sendNotification(errorNotification);
    }
  }

  private async sendNotification(notification: ErrorNotification) {
    try {
      const response = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text:
            `🚨 **Error Alert** - ${notification.severity.toUpperCase()}\n\n` +
            `**Request ID:** ${notification.requestId}\n` +
            `**Operation:** ${notification.context.operation}\n` +
            `**Error:** ${notification.error}\n` +
            `**Environment:** ${notification.environment}\n` +
            `**Timestamp:** ${notification.timestamp}\n\n` +
            `**User:** ${notification.context.user?.name || 'Unknown'} (${notification.context.user?.role || 'Unknown'})\n` +
            `**Endpoint:** ${notification.context.endpoint || 'N/A'}\n\n` +
            `**Stack Trace:**\n\`\`\`\n${notification.stack || 'No stack trace'}\n\`\`\``,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send error notification:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Convenience methods for different error types
  async logDatabaseError(
    requestId: string,
    error: Error,
    context: { operation: string; endpoint?: string; user?: Record<string, unknown> }
  ) {
    await this.logError(requestId, error, context, 'high');
  }

  async logAuthenticationError(
    requestId: string,
    error: Error,
    context: { operation: string; endpoint?: string; user?: Record<string, unknown> }
  ) {
    await this.logError(requestId, error, context, 'critical');
  }

  async logInventoryError(
    requestId: string,
    error: Error,
    context: {
      operation: string;
      endpoint?: string;
      user?: Record<string, unknown>;
      requestData?: Record<string, unknown>;
    }
  ) {
    await this.logError(requestId, error, context, 'medium');
  }

  async logConnectionError(
    requestId: string,
    error: Error,
    context: { operation: string; endpoint?: string; user?: Record<string, unknown> }
  ) {
    await this.logError(requestId, error, context, 'high');
  }
}

// Create singleton instance
export const errorMonitor = new ErrorMonitor();

// Type definitions for convenience functions
interface ErrorContext {
  operation: string;
  endpoint?: string;
  user?: Record<string, unknown>;
  requestData?: Record<string, unknown>;
}

// Export convenience functions
export const logDatabaseError = (requestId: string, error: Error, context: ErrorContext) =>
  errorMonitor.logDatabaseError(requestId, error, context);

export const logAuthenticationError = (requestId: string, error: Error, context: ErrorContext) =>
  errorMonitor.logAuthenticationError(requestId, error, context);

export const logInventoryError = (requestId: string, error: Error, context: ErrorContext) =>
  errorMonitor.logInventoryError(requestId, error, context);

export const logConnectionError = (requestId: string, error: Error, context: ErrorContext) =>
  errorMonitor.logConnectionError(requestId, error, context);
