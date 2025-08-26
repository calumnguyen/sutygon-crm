import Pusher from 'pusher-js';

interface LatencyData {
  ping: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdated: string;
  userId: string;
  timestamp: number;
}

class LatencyTracker {
  private latencyData: Map<string, LatencyData> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private onLatencyUpdate: ((userId: string, data: LatencyData) => void) | null = null;
  private currentUserId: string | null = null;

  constructor() {
    // Don't auto-initialize, wait for setCurrentUser
  }

  public setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  public startTrackingUser(userId: string) {
    if (this.pingIntervals.has(userId)) {
      return; // Already tracking
    }

    // Send initial ping immediately
    this.measureServerLatency(userId);

    const interval = setInterval(() => {
      this.measureServerLatency(userId);
    }, 30000); // Measure every 30 seconds instead of 5

    this.pingIntervals.set(userId, interval);
  }

  public stopTrackingUser(userId: string) {
    const interval = this.pingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(userId);
      this.latencyData.delete(userId);
    }
  }

  public stopAllTracking() {
    this.pingIntervals.forEach((interval) => clearInterval(interval));
    this.pingIntervals.clear();
    this.latencyData.clear();
  }

  private async measureServerLatency(userId: string) {
    const startTime = Date.now();

    try {
      // Use a lighter endpoint for latency measurement
      const response = await fetch('/api/pusher/user-presence', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      const ping = endTime - startTime;

      if (response.ok) {
        const connectionQuality = this.getConnectionQuality(ping);

        const latencyData: LatencyData = {
          ping,
          connectionQuality,
          lastUpdated: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          userId,
          timestamp: endTime,
        };

        this.latencyData.set(userId, latencyData);

        if (this.onLatencyUpdate) {
          this.onLatencyUpdate(userId, latencyData);
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }

  private getConnectionQuality(ping: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (ping < 30) return 'excellent';
    if (ping < 60) return 'good';
    if (ping < 100) return 'fair';
    return 'poor';
  }

  public getLatencyData(userId: string): LatencyData | null {
    return this.latencyData.get(userId) || null;
  }

  public getAllLatencyData(): Map<string, LatencyData> {
    return new Map(this.latencyData);
  }

  public onUpdate(callback: (userId: string, data: LatencyData) => void) {
    this.onLatencyUpdate = callback;
  }

  public disconnect() {
    this.stopAllTracking();
  }
}

// Create a singleton instance
const latencyTracker = new LatencyTracker();

export default latencyTracker;
