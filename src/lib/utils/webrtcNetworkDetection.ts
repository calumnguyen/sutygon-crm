interface RTCStatsReportExtended extends RTCStatsReport {
  state?: string;
  currentRoundTripTime?: number;
  address?: string;
  bytesReceived?: number;
  bytesSent?: number;
}

interface NetworkInfo {
  type: 'WiFi' | 'Cellular' | 'Ethernet' | 'Unknown';
  latency: number;
  bandwidth: number;
  localIPs: string[];
  publicIPs: string[];
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  method: 'webrtc' | 'fallback' | 'cached';
}

class WebRTCNetworkDetector {
  private pc: RTCPeerConnection | null = null;
  private isDetecting = false;
  private lastDetectionTime = 0;
  private readonly DETECTION_COOLDOWN = 5000; // 5 seconds between detections
  private static globalDetectionInProgress = false;
  private static globalLastDetectionTime = 0;
  private static cachedResult: NetworkInfo | null = null;
  private static cacheExpiry = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  async detectNetwork(): Promise<NetworkInfo> {
    const now = Date.now();

    // Check cache first
    if (WebRTCNetworkDetector.cachedResult && now < WebRTCNetworkDetector.cacheExpiry) {
      console.log('📦 Using cached network detection result');
      return { ...WebRTCNetworkDetector.cachedResult };
    }

    // Global check to prevent multiple instances from detecting simultaneously
    if (WebRTCNetworkDetector.globalDetectionInProgress) {
      console.log('🔄 Global network detection already in progress, using cached result');
      return this.getCachedResult();
    }

    // Check if we're already detecting in this instance
    if (this.isDetecting) {
      throw new Error('Network detection already in progress');
    }

    // Check if we're in cooldown period
    if (now - WebRTCNetworkDetector.globalLastDetectionTime < this.DETECTION_COOLDOWN) {
      console.log('⏳ Network detection in cooldown, using cached result');
      return this.getCachedResult();
    }

    this.isDetecting = true;
    WebRTCNetworkDetector.globalDetectionInProgress = true;
    this.lastDetectionTime = now;
    WebRTCNetworkDetector.globalLastDetectionTime = now;

    try {
      console.log('🔍 Starting WebRTC network detection...');

      // Create peer connection with STUN servers
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });

      // Create data channel to trigger connection
      this.pc.createDataChannel('network-test', {
        ordered: true,
      });

      // Set up event listeners
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🌐 ICE candidate found:', event.candidate.type);
        }
      };

      this.pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed:', this.pc?.connectionState);
      };

      // Create offer to start connection process
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Try to wait for connection, but don't fail if it times out
      try {
        await this.waitForConnection();
        console.log('✅ WebRTC connection established successfully');
      } catch (connectionError) {
        console.warn(
          '⚠️ WebRTC connection failed, but continuing with available data:',
          connectionError
        );
        // Continue with whatever data we have
      }

      // Analyze network statistics (even if connection failed, we might have some data)
      const networkInfo = await this.analyzeNetworkStats();

      // Only cache if we got meaningful data
      if (networkInfo.type !== 'Unknown' || networkInfo.latency > 0 || networkInfo.bandwidth > 0) {
        WebRTCNetworkDetector.cachedResult = { ...networkInfo };
        WebRTCNetworkDetector.cacheExpiry = now + this.CACHE_DURATION;
        console.log('✅ WebRTC network detection completed with data:', networkInfo);
      } else {
        console.log('⚠️ WebRTC detection completed but no meaningful data, using fallback');
        return this.getFallbackNetworkInfo();
      }

      return networkInfo;
    } catch (error) {
      console.error('❌ WebRTC network detection failed:', error);
      return this.getFallbackNetworkInfo();
    } finally {
      this.cleanup();
      this.isDetecting = false;
      WebRTCNetworkDetector.globalDetectionInProgress = false;
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 8000); // Reduced timeout to 8 seconds

      const checkConnection = () => {
        if (!this.pc) {
          clearTimeout(timeout);
          reject(new Error('No peer connection available'));
          return;
        }

        const state = this.pc.connectionState;
        console.log('🔗 Checking connection state:', state);

        if (state === 'connected') {
          clearTimeout(timeout);
          resolve();
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          clearTimeout(timeout);
          reject(new Error(`Connection failed: ${state}`));
        } else if (state === 'connecting' || state === 'new') {
          // Still connecting, wait a bit more
          setTimeout(checkConnection, 500);
        } else {
          // Unknown state, wait a bit more
          setTimeout(checkConnection, 500);
        }
      };

      // Start checking immediately
      checkConnection();
    });
  }

  private async analyzeNetworkStats(): Promise<NetworkInfo> {
    if (!this.pc) {
      throw new Error('No peer connection available');
    }

    const stats = await this.pc.getStats();
    const networkInfo: NetworkInfo = {
      type: 'Unknown',
      latency: 0,
      bandwidth: 0,
      localIPs: [],
      publicIPs: [],
      connectionQuality: 'fair',
      method: 'webrtc',
    };

    console.log('📊 Analyzing WebRTC statistics...');

    let hasAnyData = false;

    stats.forEach((report) => {
      console.log('📈 Report type:', report.type, report);

      if (report.type === 'candidate-pair') {
        const candidatePair = report as RTCStatsReportExtended;
        if (candidatePair.state === 'succeeded' && candidatePair.currentRoundTripTime) {
          networkInfo.latency = candidatePair.currentRoundTripTime * 1000; // Convert to ms
          console.log('⏱️ RTT detected:', networkInfo.latency, 'ms');
          hasAnyData = true;
        }
      }

      if (report.type === 'local-candidate') {
        const localCandidate = report as RTCStatsReportExtended;
        if (localCandidate.address) {
          networkInfo.localIPs.push(localCandidate.address);
          console.log('🏠 Local IP:', localCandidate.address);
          hasAnyData = true;
        }
      }

      if (report.type === 'remote-candidate') {
        const remoteCandidate = report as RTCStatsReportExtended;
        if (remoteCandidate.address) {
          networkInfo.publicIPs.push(remoteCandidate.address);
          console.log('🌍 Public IP:', remoteCandidate.address);
          hasAnyData = true;
        }
      }

      if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
        const rtpStats = report as RTCStatsReportExtended;
        if (rtpStats.bytesReceived || rtpStats.bytesSent) {
          networkInfo.bandwidth = this.estimateBandwidth(rtpStats);
          hasAnyData = true;
        }
      }
    });

    // If we have any data, try to classify network type
    if (hasAnyData) {
      networkInfo.type = this.classifyNetworkType(networkInfo);
      networkInfo.connectionQuality = this.getConnectionQuality(networkInfo.latency);
    } else {
      console.log('⚠️ No meaningful WebRTC data available');
    }

    return networkInfo;
  }

  private classifyNetworkType(
    networkInfo: NetworkInfo
  ): 'WiFi' | 'Cellular' | 'Ethernet' | 'Unknown' {
    // WiFi indicators
    const hasPrivateIP = networkInfo.localIPs.some(
      (ip) =>
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.')
    );

    // Low latency suggests WiFi or Ethernet
    const hasLowLatency = networkInfo.latency < 50;

    // High bandwidth suggests WiFi or Ethernet
    const hasHighBandwidth = networkInfo.bandwidth > 10; // Mbps

    if (hasPrivateIP && hasLowLatency) {
      return 'WiFi';
    }

    if (hasPrivateIP && hasHighBandwidth) {
      return 'Ethernet';
    }

    // Cellular indicators
    const hasHighLatency = networkInfo.latency > 100;
    const hasLowBandwidth = networkInfo.bandwidth < 5;

    if (hasHighLatency || hasLowBandwidth) {
      return 'Cellular';
    }

    return 'Unknown';
  }

  private estimateBandwidth(report: RTCStatsReportExtended): number {
    // Simple bandwidth estimation based on RTP statistics
    if (report.bytesReceived && typeof report.bytesReceived === 'number') {
      // Estimate based on received bytes over time
      return Math.round(report.bytesReceived / 1024 / 1024); // Convert to MB
    }
    return 0;
  }

  private getConnectionQuality(latency: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (latency < 30) return 'excellent';
    if (latency < 60) return 'good';
    if (latency < 100) return 'fair';
    return 'poor';
  }

  private getFallbackNetworkInfo(): NetworkInfo {
    console.log('🔄 Using fallback network detection');

    // Type guard for network connection
    const getNetworkConnection = () => {
      const nav = navigator as Navigator & {
        connection?: { type?: string; downlink?: number; rtt?: number };
        mozConnection?: { type?: string; downlink?: number; rtt?: number };
        webkitConnection?: { type?: string; downlink?: number; rtt?: number };
      };

      return nav.connection || nav.mozConnection || nav.webkitConnection;
    };

    const connection = getNetworkConnection();

    if (connection) {
      const type = connection.type || 'unknown';
      const downlink = connection.downlink || 0;

      let networkType: 'WiFi' | 'Cellular' | 'Ethernet' | 'Unknown' = 'Unknown';

      if (type === 'wifi') {
        networkType = 'WiFi';
      } else if (type === 'cellular') {
        networkType = 'Cellular';
      } else if (type === 'ethernet') {
        networkType = 'Ethernet';
      }

      return {
        type: networkType,
        latency: connection.rtt || 0,
        bandwidth: downlink,
        localIPs: [],
        publicIPs: [],
        connectionQuality: this.getConnectionQuality(connection.rtt || 0),
        method: 'fallback',
      };
    }

    // Final fallback
    return {
      type: 'Unknown',
      latency: 0,
      bandwidth: 0,
      localIPs: [],
      publicIPs: [],
      connectionQuality: 'fair',
      method: 'fallback',
    };
  }

  private getCachedResult(): NetworkInfo {
    // Return a basic cached result during cooldown
    return {
      type: 'Unknown',
      latency: 0,
      bandwidth: 0,
      localIPs: [],
      publicIPs: [],
      connectionQuality: 'fair',
      method: 'cached',
    };
  }

  private cleanup(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }

  // Public method to get network type string for display
  getNetworkTypeString(networkInfo: NetworkInfo): string {
    switch (networkInfo.type) {
      case 'WiFi':
        if (networkInfo.bandwidth > 50) return 'WiFi (Fast)';
        if (networkInfo.bandwidth > 20) return 'WiFi (Good)';
        return 'WiFi (Normal)';

      case 'Cellular':
        if (networkInfo.bandwidth > 10) return '5G';
        if (networkInfo.bandwidth > 5) return '4G';
        return '3G';

      case 'Ethernet':
        return 'Ethernet';

      default:
        return 'Unknown';
    }
  }
}

// Create singleton instance
const webrtcNetworkDetector = new WebRTCNetworkDetector();

export default webrtcNetworkDetector;
export type { NetworkInfo };
