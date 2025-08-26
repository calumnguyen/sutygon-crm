export const detectDeviceType = (): string => {
  if (typeof window === 'undefined') return 'Desktop';

  const userAgent = navigator.userAgent;
  const userAgentLower = userAgent.toLowerCase();

  console.log('User Agent:', userAgent);

  // iOS Devices
  if (/iphone/i.test(userAgent)) {
    if (/iphone 16/i.test(userAgent)) return 'iPhone 16';
    if (/iphone 15/i.test(userAgent)) return 'iPhone 15';
    if (/iphone 14/i.test(userAgent)) return 'iPhone 14';
    if (/iphone 13/i.test(userAgent)) return 'iPhone 13';
    if (/iphone 12/i.test(userAgent)) return 'iPhone 12';
    if (/iphone 11/i.test(userAgent)) return 'iPhone 11';
    return 'iPhone';
  }

  if (/ipad/i.test(userAgent)) {
    if (/ipad pro/i.test(userAgent)) return 'iPad Pro';
    if (/ipad air/i.test(userAgent)) return 'iPad Air';
    if (/ipad mini/i.test(userAgent)) return 'iPad Mini';
    return 'iPad';
  }

  // Android Devices
  if (/android/i.test(userAgent)) {
    if (/samsung/i.test(userAgent)) {
      if (/galaxy s24/i.test(userAgent)) return 'Samsung Galaxy S24';
      if (/galaxy s23/i.test(userAgent)) return 'Samsung Galaxy S23';
      if (/galaxy s22/i.test(userAgent)) return 'Samsung Galaxy S22';
      if (/galaxy tab/i.test(userAgent)) return 'Samsung Galaxy Tab';
      return 'Samsung Galaxy';
    }
    if (/pixel/i.test(userAgent)) {
      if (/pixel 8/i.test(userAgent)) return 'Google Pixel 8';
      if (/pixel 7/i.test(userAgent)) return 'Google Pixel 7';
      return 'Google Pixel';
    }
    if (/oneplus/i.test(userAgent)) return 'OnePlus';
    if (/xiaomi/i.test(userAgent)) return 'Xiaomi';
    return 'Android Device';
  }

  // Desktop/Laptop Detection - Check Mac first
  if (/macintosh|mac os x/i.test(userAgent)) {
    console.log('Mac detected, checking specific model...');
    // Check for specific Mac models in the user agent
    if (/macbook pro/i.test(userAgentLower)) {
      console.log('MacBook Pro detected');
      return 'MacBook Pro';
    }
    if (/macbook air/i.test(userAgentLower)) {
      console.log('MacBook Air detected');
      return 'MacBook Air';
    }
    if (/imac/i.test(userAgentLower)) {
      console.log('iMac detected');
      return 'iMac';
    }
    if (/mac mini/i.test(userAgentLower)) {
      console.log('Mac Mini detected');
      return 'Mac Mini';
    }
    if (/mac pro/i.test(userAgentLower)) {
      console.log('Mac Pro detected');
      return 'Mac Pro';
    }

    // If it's a Mac but no specific model, try to detect based on screen size
    if (typeof window !== 'undefined') {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      console.log(`Screen size: ${screenWidth}x${screenHeight}`);

      // MacBook Pro typically has higher resolution
      if (screenWidth >= 1440 || screenHeight >= 900) {
        console.log('Detected as MacBook Pro based on screen size');
        return 'MacBook Pro';
      } else {
        console.log('Detected as MacBook Air based on screen size');
        return 'MacBook Air';
      }
    }

    console.log('Generic Mac detected');
    return 'Mac';
  }

  if (/windows/i.test(userAgent)) {
    if (/surface/i.test(userAgent)) {
      if (/surface pro/i.test(userAgent)) return 'Surface Pro';
      if (/surface laptop/i.test(userAgent)) return 'Surface Laptop';
      return 'Surface';
    }
    return 'Windows PC';
  }

  if (/linux/i.test(userAgent)) return 'Linux PC';

  // Mobile detection fallback
  if (/mobile|phone|blackberry|opera mini|iemobile/i.test(userAgentLower)) {
    return 'Mobile Device';
  }

  return 'Desktop';
};

export const getLocationFromIP = async (): Promise<string> => {
  const providers = [
    'https://ipapi.co/json/',
    'https://ipinfo.io/json',
    'https://api.ipify.org?format=json',
    'https://api.myip.com',
  ];

  for (const provider of providers) {
    try {
      console.log(`Trying location provider: ${provider}`);
      const response = await fetch(provider, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`Provider ${provider} failed with status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`Provider ${provider} response:`, data);

      // Handle different provider formats
      let location = '';

      if (provider.includes('ipapi.co')) {
        if (data.city && data.country_name) {
          location = `${data.city}, ${data.country_name}`;
        } else if (data.country_name) {
          location = data.country_name;
        }
      } else if (provider.includes('ipinfo.io')) {
        if (data.city && data.country) {
          location = `${data.city}, ${data.country}`;
        } else if (data.country) {
          location = data.country;
        }
      } else if (provider.includes('myip.com')) {
        if (data.city && data.country) {
          location = `${data.city}, ${data.country}`;
        } else if (data.country) {
          location = data.country;
        }
      }

      if (location) {
        console.log(`Successfully got location from ${provider}: ${location}`);
        return location;
      }
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      continue;
    }
  }

  console.error('All location providers failed');
  return 'Unknown Location';
};

export const getBrowserInfo = (): string => {
  if (typeof window === 'undefined') return 'Unknown Browser';

  const userAgent = navigator.userAgent;
  console.log('Browser detection - User Agent:', userAgent);

  // Check for Edge first (Edge includes Chrome in user agent)
  if (userAgent.includes('Edg/')) {
    console.log('Microsoft Edge detected');
    return 'Microsoft Edge';
  }

  // Check for other browsers
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg/')) {
    console.log('Chrome detected');
    return 'Chrome';
  }

  if (userAgent.includes('Firefox')) {
    console.log('Firefox detected');
    return 'Firefox';
  }

  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    console.log('Safari detected');
    return 'Safari';
  }

  if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    console.log('Opera detected');
    return 'Opera';
  }

  if (userAgent.includes('Brave')) {
    console.log('Brave detected');
    return 'Brave';
  }

  console.log('Unknown browser detected');
  return 'Unknown Browser';
};
